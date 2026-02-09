export async function onRequestGet({ env }) {
  return new Response(
    JSON.stringify({
      ok: true,
      hasAdminToken: !!env.ADMIN_TOKEN,
      tokenLen: env.ADMIN_TOKEN ? env.ADMIN_TOKEN.length : 0,
    }),
    { headers: { "content-type": "application/json; charset=utf-8" } }
  );
}
