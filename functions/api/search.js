export async function onRequestGet({ env, request }) {
  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 50);

    if (!env.DB) {
      return Response.json(
        { ok: false, error: "env.DB missing (D1 binding není nastavený pro Pages Functions)" },
        { status: 500 }
      );
    }

    if (!q) return Response.json({ ok: true, results: [] });

    // FTS prefix po slovech (bezpečně)
    const fts = q
      .split(/\s+/)
      .filter(Boolean)
      .map(t => t.replaceAll('"', '""') + "*")
      .join(" ");

    const { results } = await env.DB
      .prepare(`
        SELECT
          p.title as title,
          p.url   as url,
          snippet(pages_fts, 1, '<mark>', '</mark>', '…', 12) as snippet
        FROM pages_fts
        JOIN pages p ON p.id = pages_fts.rowid
        WHERE pages_fts MATCH ?
        LIMIT ?
      `)
      .bind(fts, limit)
      .all();

    return Response.json({ ok: true, results: results || [] });
  } catch (e) {
    return Response.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
