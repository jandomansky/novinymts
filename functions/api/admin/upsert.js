export async function onRequestPost({ request, env }) {
  try {
    // --- auth ---
    const auth = request.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;

    if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    // --- parse body ---
    let data;
    try {
      data = await request.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: "Invalid JSON body" }), {
        status: 400,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    const url = String(data?.url || "").trim();
    const title = String(data?.title || "").trim();
    const body = String(data?.body || "").trim();
    const published_at = data?.published_at ? String(data.published_at) : null;
    const section = data?.section ? String(data.section) : null;

    if (!url || !title || !body) {
      return new Response(JSON.stringify({ ok: false, error: "Missing url/title/body" }), {
        status: 400,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    // --- upsert ---
    const res = await env.DB.prepare(`
      INSERT INTO articles (url, title, body, published_at, section)
      VALUES (?1, ?2, ?3, ?4, ?5)
      ON CONFLICT(url) DO UPDATE SET
        title = excluded.title,
        body = excluded.body,
        published_at = excluded.published_at,
        section = excluded.section
    `).bind(url, title, body, published_at, section).run();

    return new Response(JSON.stringify({ ok: true, changes: res.changes }), {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch (e) {
    // --- never crash with 1101 again ---
    return new Response(
      JSON.stringify({ ok: false, error: String(e), stack: e?.stack || null }),
      { status: 500, headers: { "content-type": "application/json; charset=utf-8" } }
    );
  }
}
