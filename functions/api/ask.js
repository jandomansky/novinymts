// functions/api/ask.js
const MODEL = "@cf/meta/llama-3.1-8b-instruct"; // můžeš změnit
const DEFAULT_LIMIT = 20;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function pickText(aiOut) {
  // Workers AI může vracet různé tvary podle modelu
  if (!aiOut) return "";
  if (typeof aiOut === "string") return aiOut;

  // časté tvary
  if (typeof aiOut.response === "string") return aiOut.response;
  if (typeof aiOut.result === "string") return aiOut.result;

  // někdy je to { result: { response: "..." } } apod.
  if (aiOut.result && typeof aiOut.result.response === "string") return aiOut.result.response;

  // fallback: zkus najít string kdekoliv
  try {
    return JSON.stringify(aiOut);
  } catch {
    return String(aiOut);
  }
}

function extractJsonObject(text) {
  // očekáváme "čistý JSON", ale kdyby model ukecal něco navíc, vytáhneme první {...}
  const s = String(text || "").trim();
  if (!s) return null;
  if (s.startsWith("{") && s.endsWith("}")) return s;

  const i = s.indexOf("{");
  const j = s.lastIndexOf("}");
  if (i >= 0 && j > i) return s.slice(i, j + 1);
  return null;
}

function clampLimit(x) {
  const n = parseInt(String(x ?? ""), 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(n, 50);
}

export async function onRequestOptions() {
  // pokud to budeš volat z jiné domény, můžeš přidat CORS
  return new Response(null, { status: 204 });
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.AI || typeof env.AI.run !== "function") {
      return json({ ok: false, error: "Workers AI binding 'AI' chybí." }, 500);
    }

    const ct = request.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      return json({ ok: false, error: "Pošli application/json." }, 400);
    }

    const body = await request.json().catch(() => ({}));
    const prompt = String(body.prompt || "").trim();
    const limit = clampLimit(body.limit);

    if (!prompt) return json({ ok: false, error: "Chybí 'prompt'." }, 400);

    // Instrukce: vygeneruj FTS5 MATCH dotaz (bez SQL), max pár termů, OR, prefixy *
    const system = `
Jsi převodník přirozeného jazyka na dotaz pro SQLite FTS5 (MATCH).
Vrať VÝHRADNĚ čistý JSON (bez komentářů a bez markdownu).
Dotaz musí být bezpečný řetězec pro MATCH (žádné SQL, žádné uvozovky navíc, žádné ;).
Používej OR mezi synonymy, u víceslovných frází použij dvojité uvozovky.
Kde dává smysl, použij prefixové vyhledávání pomocí * (např. tunel*).
Omez se na 5–10 nejdůležitějších termů.
`;

    const user = `
Prompt: "${prompt}"
Vrať JSON ve tvaru:
{
  "query": "<FTS5 MATCH query string>",
  "why": "<stručně 1 věta, co to hledá>",
  "tags": ["<max 5 klíčových slov>"]
}
`;

    const aiOut = await env.AI.run(MODEL, {
      messages: [
        { role: "system", content: system.trim() },
        { role: "user", content: user.trim() },
      ],
      max_tokens: 220,
    });

    const txt = pickText(aiOut);
    const objText = extractJsonObject(txt);
    if (!objText) {
      return json({ ok: false, error: "AI nevrátila JSON.", raw: txt }, 500);
    }

    let parsed;
    try {
      parsed = JSON.parse(objText);
    } catch (e) {
      return json({ ok: false, error: "Neplatný JSON od AI.", raw: objText }, 500);
    }

    const q = String(parsed.query || "").trim();
    if (!q) return json({ ok: false, error: "AI vrátila prázdný dotaz.", raw: parsed }, 500);

    // zavolej existující /api/search
    const url = new URL(request.url);
    url.pathname = "/api/search";
    url.search = "";
    url.searchParams.set("q", q);
    url.searchParams.set("limit", String(limit));

    const res = await fetch(url.toString(), { headers: { accept: "application/json" } });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return json(
        { ok: false, error: `Search HTTP ${res.status}`, ai: parsed, search: data },
        500
      );
    }

    return json({
      ok: true,
      prompt,
      ai: { query: q, why: parsed.why || "", tags: parsed.tags || [] },
      results: data?.results || [],
    });
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
}
