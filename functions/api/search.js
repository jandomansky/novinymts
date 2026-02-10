export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const limit = Math.min(Number(url.searchParams.get("limit") || 20), 50);

  if (!q) {
    return Response.json({ results: [] });
  }

  const { results } = await env.DB
    .prepare(`
      SELECT title, url, snippet
      FROM pages_fts
      WHERE pages_fts MATCH ?
      LIMIT ?
    `)
    .bind(q + "*", limit)
    .all();

  return Response.json({ results });
}
