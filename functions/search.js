export async function onRequest({ request, env }) {
  const origin = request.headers.get("Origin") || "";
  const allowed = [
    "https://noviny.metrostav.cz",
    "https://www.noviny.metrostav.cz",
  ];

  const allowOrigin = allowed.includes(origin) ? origin : allowed[0];

  // Preflight (CORS)
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(allowOrigin),
    });
  }

  if (request.method !== "GET") {
    return json({ ok: false, error: "Method not allowed" }, 405, allowOrigin);
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10", 10), 50);

  if (!q) return json({ q: "", results: [] }, 200, allowOrigin);

  // FTS dotaz: prefixové vyhledávání po slovech
  const ftsQuery = q
    .split(/\s+/)
    .filter(Boolean)
    .map(t => `${escapeFtsToken(t)}*`)
    .join(" ");

  const stmt = env.DB.prepare(`
    SELECT a.id,
           a.url,
           a.title,
           a.published_at,
           a.section,
           snippet(articles_fts, 1, '<mark>', '</mark>', '…', 12) AS snippet
    FROM articles_fts
    JOIN articles a ON a.id = articles_fts.rowid
    WHERE articles_fts MATCH ?
    ORDER BY bm25(articles_fts) ASC
    LIMIT ?;
  `);

  const { results } = await stmt.bind(ftsQuery, limit).all();
  return json({ q, results }, 200, allowOrigin);
}

function corsHeaders(allowOrigin) {
  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    "cache-control": "no-store",
  };
}

function json(obj, status = 200, allowOrigin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(allowOrigin),
    },
  });
}

function escapeFtsToken(t) {
  return t
    .replace(/["'`]/g, "")
    .replace(/[^\p{L}\p{N}_-]/gu, "");
}
