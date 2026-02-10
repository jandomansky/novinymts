export async function onRequestGet({ env, request }) {
  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 50);

    if (!q) return Response.json({ ok: true, q: "", results: [] });

    const sql = `
      SELECT
        p.rowid AS id,
        p.title AS title,
        p.url   AS url,
        p.date  AS date,
        snippet(pages_fts, 0, '<mark>', '</mark>', '…', 12) AS snippet
      FROM pages_fts
      JOIN pages p ON p.rowid = pages_fts.rowid
      WHERE pages_fts MATCH ?
      LIMIT ?;
    `;

    const { results } = await env.DB.prepare(sql).bind(q, limit).all();
    return Response.json({ ok: true, q, results });
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
