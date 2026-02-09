export async function onRequestGet({ env }) {
  try {
    if (!env.DB) throw new Error("env.DB missing (D1 binding not available in this deployment)");

    const tables = await env.DB
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all();

    return new Response(JSON.stringify({ ok: true, tables: tables.results }, null, 2), {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e), stack: e?.stack }, null, 2), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
}
