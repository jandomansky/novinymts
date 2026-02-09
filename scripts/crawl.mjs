import { load } from "cheerio";

const BASE = "https://noviny.metrostav.cz";
const API  = process.env.INGEST_API || "https://novinymts.pages.dev/api/admin/upsert";
const TOKEN = process.env.ADMIN_TOKEN;

if (!TOKEN) {
  console.error("Missing ADMIN_TOKEN in env.");
  process.exit(1);
}

// sem dej startovní URL (můžeš přidat další)
const seeds = [
  "https://noviny.metrostav.cz/02-2026/kratce-aktualne",
  "https://noviny.metrostav.cz/metrostav-01-2007/strana-2",
  "https://noviny.metrostav.cz/metrostav-05-2018/strana-3",
];

const seen = new Set();
const queue = [...seeds];
let imported = 0;

function norm(u) {
  try {
    const url = new URL(u, BASE);
    url.hash = "";
    // volitelně: zahoď tracking parametry
    ["utm_source","utm_medium","utm_campaign","utm_term","utm_content"].forEach(p => url.searchParams.delete(p));
    return url.toString();
  } catch { return null; }
}

function guessMetaFromUrl(urlStr) {
  // /02-2026/... nebo /metrostav-05-2018/strana-3
  const u = new URL(urlStr);
  const parts = u.pathname.split("/").filter(Boolean);
  const section = parts[0] || null;

  // hrubý odhad "published_at": vezmeme měsíc-rok z první části cesty
  // 02-2026 => 2026-02-01
  const m1 = /^(\d{2})-(\d{4})$/.exec(parts[0] || "");
  if (m1) return { section, published_at: `${m1[2]}-${m1[1]}-01` };

  // metrostav-05-2018 => 2018-05-01
  const m2 = /^metrostav-(\d{2})-(\d{4})$/.exec(parts[0] || "");
  if (m2) return { section, published_at: `${m2[2]}-${m2[1]}-01` };

  return { section, published_at: null };
}

function extract($) {
  // Titulek
  const title =
    $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("title").text().trim() ||
    "Bez názvu";

  // Pokus o hlavní obsah: article/main, případně největší textový blok
  let body =
    $("article").text().trim() ||
    $("main").text().trim();

  if (!body || body.length < 200) {
    // fallback: najdi nejdelší blok textu z div/section
    let best = "";
    $("div, section").each((_, el) => {
      const t = $(el).text().replace(/\s+/g, " ").trim();
      if (t.length > best.length) best = t;
    });
    body = best;
  }

  // očista: zkrať whitespace
  body = body.replace(/\s+/g, " ").trim();

  return { title, body };
}

async function ingest(item) {
  const r = await fetch(API, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${TOKEN}`,
    },
    body: JSON.stringify(item),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`Ingest failed ${r.status}: ${txt.slice(0, 300)}`);
  }
}

async function crawlOne(url) {
  const r = await fetch(url, { headers: { "user-agent": "novinymts-crawler/1.0" } });
  if (!r.ok) throw new Error(`Fetch failed ${r.status} ${url}`);
  const html = await r.text();
  const $ = load(html);

  const { title, body } = extract($);
  // minimalní ochrana: neimportuj extrémně krátké / prázdné
  if (body.length < 200) return;

  const meta = guessMetaFromUrl(url);
  await ingest({ url, title, body, ...meta });
  imported++;

  // nasbírej další interní odkazy
  $("a[href]").each((_, a) => {
    const href = $(a).attr("href");
    const nu = norm(href);
    if (!nu) return;
    if (!nu.startsWith(BASE)) return;

    // nechceme media soubory
    if (/\.(pdf|jpg|jpeg|png|webp|zip)$/i.test(nu)) return;

    if (!seen.has(nu)) {
      queue.push(nu);
    }
  });
}

async function main() {
  console.log(`Seeds: ${seeds.length}`);
  while (queue.length) {
    const url = norm(queue.shift());
    if (!url) continue;
    if (seen.has(url)) continue;
    seen.add(url);

    try {
      await crawlOne(url);
      if (seen.size % 20 === 0) {
        console.log(`Seen: ${seen.size}, Imported: ${imported}, Queue: ${queue.length}`);
      }
      // jemné zpomalení, ať web netrápíme
      await new Promise(res => setTimeout(res, 250));
    } catch (e) {
      console.warn(`Skip: ${url} -> ${e.message}`);
    }

    // pojistka proti nekonečnu při prvním běhu (uprav si podle chuti)
    if (seen.size >= 500) break;
  }

  console.log(`DONE. Seen=${seen.size} Imported=${imported}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
