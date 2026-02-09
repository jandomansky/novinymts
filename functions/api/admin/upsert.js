export async function onRequestPost({ request, env }) {
  const auth = request.headers.get("authorization") || "";

  const token = auth.startsWith("Bearer ")
    ? auth.slice(7)
    : auth;

  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return new Response("Unauthorized", { status: 401 });
  }

  const item = await request.json(); // { url, title, body, published_at?, section? }
  if (!item?.url || !item?.title || !item?.body) {
    return new Response("Missing url/title/body", { status: 400 });
  }

  const stmt = env.DB.prepare(`
    INSERT INTO articles (url, title, body, published_at, section)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(url) DO UPDATE SET
      title=excluded.title,
      body=excluded.body,
      published_at=excluded.published_at,
      section=excluded.section
  `);

  await stmt.bind(
    item.url,
    item.title,
    item.body,
    item.published_at || null,
    item.section || null
  ).run();

  // triggry se postarají o FTS
  return new Response(JSON.stringify({ ok: true, url: item.url }), {
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}
