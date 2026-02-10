export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 50);

  if (!q) return Response.json({ q: "", results: [] });

  // prefixové vyhledávání pro každé slovo
  const tokens = q.split(/\s+/).filter(Boolean).slice(0, 8);
  const ftsQuery = tokens.map(t => `${t.replace(/["']/g, "")}*`).join(" ");

  const stmt = env.DB.prepare(`
    SELECT
      p.url as url,
      p.title as title,
      p.published_at as published_at,
      p.snippet as snippet,
      bm25(pages_fts) as score
    FROM pages_fts
    JOIN pages p ON p.url = pages_fts.url
    WHERE pages_fts MATCH ?
    ORDER BY score
    LIMIT ?
  `).bind(ftsQuery, limit);

  const { results } = await stmt.all();

  return Response.json({
    q,
    ftsQuery,
    results: (results || []).map(r => ({
      url: r.url,
      title: r.title,
      published_at: r.published_at,
      snippet: r.snippet,
      score: r.score
    }))
  });
}
