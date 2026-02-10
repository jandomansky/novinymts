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
        p.snippet AS perex,
        p.content AS content
      FROM pages_fts
      JOIN pages p ON p.rowid = pages_fts.rowid
      WHERE pages_fts MATCH ?
      LIMIT ?;
    `;

    const { results } = await env.DB.prepare(sql).bind(q, limit).all();

    const stripHtml = (s) =>
      String(s || "")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const out = (results || []).map(r => {
      const base = stripHtml(r.perex) || stripHtml(r.content);
      const perex300 = base ? (base.length > 300 ? base.slice(0, 300) + "…" : base) : "";
      return {
        id: r.id,
        title: r.title,
        url: r.url,
        snippet: perex300,   // <- UI už používá r.snippet
      };
    });

    return Response.json({ ok: true, q, results: out });
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
