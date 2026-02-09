export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10", 10), 50);

  if (!q) return json({ q: "", results: [] });

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
  return json({ q, results });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function escapeFtsToken(t) {
  return t
    .replace(/["'`]/g, "")
    .replace(/[^\p{L}\p{N}_-]/gu, "");
}

