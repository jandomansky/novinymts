export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const limitRaw = parseInt(url.searchParams.get("limit") || "10", 10);
  const limit = Math.min(Number.isFinite(limitRaw) ? limitRaw : 10, 50);

  if (!q) return json({ q: "", results: [] });

  // FTS dotaz: prefixové vyhledávání po slovech
  const ftsQuery = q
    .split(/\s+/)
    .map(t => escapeFtsToken(t))
    .filter(Boolean)
    .map(t => `${t}*`)
    .join(" ");

  // když dotaz po vyčištění nic neobsahuje, vrať prázdno (ať to nepadá na FTS syntax error)
  if (!ftsQuery) return json({ q, results: [] });

  try {
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

    const { results } = await stmt.bind(ftsQuery, Number(limit)).all();
    return json({ q, results });
  } catch (err) {
    console.error("SEARCH_ERROR", { q, ftsQuery, err: String(err) });
    return json(
      { ok: false, error: "Search failed", detail: String(err) },
      500
    );
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function escapeFtsToken(t) {
  return t
    .replace(/["'`]/g, "")
    .replace(/[^\p{L}\p{N}_-]/gu, "");
}
