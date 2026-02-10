export async function onRequestGet() {
  return new Response(JSON.stringify({ ok: true, msg: "functions alive" }), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
