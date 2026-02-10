<!doctype html>
<html lang="cs">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Vyhledávání v Novinách Metrostavu</title>
  <meta name="description" content="Externí vyhledávač pro noviny.metrostav.cz (Cloudflare Pages + D1 + FTS5)." />
  <meta name="color-scheme" content="dark light" />

  <style>
    :root{
      --bg0:#070a12;
      --bg1:#0b1220;
      --card: rgba(255,255,255,.06);
      --card2: rgba(255,255,255,.09);
      --border: rgba(255,255,255,.12);
      --text: rgba(255,255,255,.92);
      --muted: rgba(255,255,255,.70);
      --muted2: rgba(255,255,255,.55);
      --accent: #7dd3fc;
      --accent2:#a78bfa;
      --good:#34d399;
      --warn:#fbbf24;
      --bad:#fb7185;
      --shadow: 0 24px 80px rgba(0,0,0,.45);
      --radius: 18px;
      --radius2: 14px;
      --pad: 18px;
      --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      --sans: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
    }

    *{ box-sizing:border-box; }
    html,body{ height:100%; }
    body{
      margin:0;
      font-family: var(--sans);
      color: var(--text);
      background:
        radial-gradient(1200px 700px at 20% 10%, rgba(125,211,252,.15), transparent 55%),
        radial-gradient(900px 600px at 80% 0%, rgba(167,139,250,.15), transparent 55%),
        radial-gradient(900px 700px at 50% 110%, rgba(52,211,153,.10), transparent 55%),
        linear-gradient(180deg, var(--bg0), var(--bg1));
      overflow-x:hidden;
    }

    a{ color:inherit; text-decoration:none; }
    a:hover{ text-decoration:underline; }

    .wrap{
      max-width: 980px;
      margin: 0 auto;
      padding: 28px 18px 60px;
    }

    header{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:16px;
      margin-bottom: 18px;
    }

    .brand{
      display:flex;
      flex-direction:column;
      gap:8px;
      min-width: 0;
    }

    h1{
      font-size: clamp(22px, 2.4vw, 30px);
      line-height: 1.15;
      margin:0;
      letter-spacing: -0.02em;
    }

    .sub{
      color: var(--muted);
      font-size: 14px;
      line-height: 1.45;
      max-width: 62ch;
    }

    .chips{
      display:flex;
      flex-wrap:wrap;
      gap:8px;
      margin-top: 6px;
    }

    .chip{
      font-size: 12px;
      color: var(--muted);
      background: rgba(255,255,255,.06);
      border: 1px solid rgba(255,255,255,.10);
      padding: 6px 10px;
      border-radius: 999px;
      display:inline-flex;
      align-items:center;
      gap:8px;
      user-select:none;
    }

    .chip .dot{
      width:8px;height:8px;border-radius:999px;
      background: linear-gradient(90deg, var(--accent), var(--accent2));
      box-shadow: 0 0 0 3px rgba(125,211,252,.12);
    }

    .panel{
      background: linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.04));
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      padding: 16px;
    }

    .searchbar{
      display:flex;
      gap:10px;
      align-items:center;
      flex-wrap:wrap;
    }

    .inputWrap{
      flex: 1 1 420px;
      min-width: 260px;
      position:relative;
    }

    input[type="search"]{
      width:100%;
      padding: 14px 46px 14px 44px;
      font-size: 15px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.14);
      background: rgba(0,0,0,.20);
      color: var(--text);
      outline:none;
      transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
    }
    input[type="search"]::placeholder{ color: rgba(255,255,255,.45); }
    input[type="search"]:focus{
      border-color: rgba(125,211,252,.45);
      box-shadow: 0 0 0 4px rgba(125,211,252,.16);
      background: rgba(0,0,0,.28);
    }

    .icon{
      position:absolute;
      left:14px; top:50%;
      transform: translateY(-50%);
      width:18px; height:18px;
      opacity:.75;
    }

    .kbd{
      position:absolute;
      right:14px; top:50%;
      transform: translateY(-50%);
      font-family: var(--mono);
      font-size: 11px;
      color: rgba(255,255,255,.55);
      border: 1px solid rgba(255,255,255,.18);
      border-bottom-color: rgba(255,255,255,.28);
      padding: 4px 7px;
      border-radius: 8px;
      background: rgba(255,255,255,.06);
      user-select:none;
    }

    .btn{
      appearance:none;
      border: 1px solid rgba(255,255,255,.16);
      background: rgba(255,255,255,.07);
      color: var(--text);
      padding: 12px 14px;
      border-radius: 999px;
      cursor:pointer;
      font-weight: 600;
      font-size: 14px;
      display:inline-flex;
      align-items:center;
      gap:10px;
      transition: transform .05s ease, background .15s ease, border-color .15s ease;
      user-select:none;
    }
    .btn:hover{ background: rgba(255,255,255,.10); }
    .btn:active{ transform: translateY(1px); }

    .btn.primary{
      background: linear-gradient(90deg, rgba(125,211,252,.22), rgba(167,139,250,.18));
      border-color: rgba(125,211,252,.26);
    }

    .btn svg{ width:18px; height:18px; opacity:.9; }

    .controls{
      display:flex;
      gap:10px;
      align-items:center;
      flex-wrap:wrap;
      margin-top: 10px;
      color: var(--muted);
      font-size: 13px;
    }

    select{
      padding: 10px 12px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.16);
      background: rgba(0,0,0,.18);
      color: var(--text);
      outline:none;
    }

    .hint{
      margin-top: 10px;
      font-size: 13px;
      color: var(--muted);
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      flex-wrap:wrap;
    }

    .hint code{
      font-family: var(--mono);
      font-size: 12px;
      background: rgba(255,255,255,.07);
      border: 1px solid rgba(255,255,255,.12);
      padding: 3px 8px;
      border-radius: 999px;
      color: rgba(255,255,255,.78);
    }

    .statusRow{
      margin-top: 18px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      flex-wrap:wrap;
    }
    .status{
      color: var(--muted);
      font-size: 13px;
    }
    .status strong{ color: var(--text); }

    .results{
      margin-top: 14px;
      display:grid;
      gap:12px;
    }

    .card{
      padding: 14px 14px 12px;
      border-radius: var(--radius2);
      border: 1px solid rgba(255,255,255,.12);
      background: linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.04));
      box-shadow: 0 12px 40px rgba(0,0,0,.25);
      transition: transform .08s ease, border-color .15s ease, background .15s ease;
    }
    .card:hover{
      transform: translateY(-1px);
      border-color: rgba(125,211,252,.26);
      background: linear-gradient(180deg, rgba(255,255,255,.085), rgba(255,255,255,.045));
    }

    .cardTop{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:12px;
    }

    .title{
      font-size: 16px;
      font-weight: 750;
      line-height: 1.25;
      margin: 0;
      letter-spacing: -0.01em;
    }

    .meta{
      margin-top: 6px;
      display:flex;
      flex-wrap:wrap;
      gap:8px;
      color: var(--muted2);
      font-size: 12px;
      align-items:center;
    }

    .badge{
      font-family: var(--mono);
      font-size: 11px;
      color: rgba(255,255,255,.75);
      background: rgba(255,255,255,.06);
      border: 1px solid rgba(255,255,255,.10);
      border-radius: 999px;
      padding: 3px 8px;
    }

    .snippet{
      margin: 10px 0 0;
      color: rgba(255,255,255,.80);
      font-size: 14px;
      line-height: 1.5;
    }

    mark{
      background: rgba(251,191,36,.22);
      color: var(--text);
      padding: 0 2px;
      border-radius: 4px;
    }

    .skeleton{
      border-radius: var(--radius2);
      border: 1px solid rgba(255,255,255,.10);
      background: rgba(255,255,255,.05);
      padding: 14px;
      overflow:hidden;
      position:relative;
      min-height: 86px;
    }
    .skeleton:before{
      content:"";
      position:absolute;
      inset:0;
      transform: translateX(-60%);
      background: linear-gradient(90deg, transparent, rgba(255,255,255,.10), transparent);
      animation: shimmer 1.1s infinite;
    }
    @keyframes shimmer{
      0%{ transform: translateX(-60%); }
      100%{ transform: translateX(120%); }
    }

    .footer{
      margin-top: 18px;
      color: var(--muted2);
      font-size: 12px;
      display:flex;
      justify-content:space-between;
      gap:12px;
      flex-wrap:wrap;
    }

    .toast{
      position: fixed;
      left: 50%;
      bottom: 18px;
      transform: translateX(-50%);
      background: rgba(10,14,26,.85);
      border: 1px solid rgba(255,255,255,.14);
      color: rgba(255,255,255,.9);
      padding: 10px 12px;
      border-radius: 999px;
      box-shadow: 0 20px 60px rgba(0,0,0,.45);
      opacity: 0;
      pointer-events:none;
      transition: opacity .18s ease, transform .18s ease;
      font-size: 13px;
    }
    .toast.show{
      opacity: 1;
      transform: translateX(-50%) translateY(-4px);
    }

    @media (prefers-reduced-motion: reduce){
      .card, .btn, input[type="search"], .skeleton:before{ transition:none !important; animation:none !important; }
    }
  </style>
</head>

<body>
  <div class="wrap">
    <header>
      <div class="brand">
        <h1>Vyhledávání v Novinách Metrostavu</h1>
        <div class="sub">
          Externí vyhledávač pro <span style="color:rgba(255,255,255,.9);font-weight:650;">noviny.metrostav.cz</span>
          (indexované do vlastní DB). Optimalizované pro rychlost a sdílení dotazů.
        </div>
        <div class="chips" aria-hidden="true">
          <span class="chip"><span class="dot"></span> rychlé</span>
          <span class="chip">FTS5</span>
          <span class="chip">Cloudflare Pages + D1</span>
        </div>
      </div>
    </header>

    <main class="panel">
      <form id="form" class="searchbar" autocomplete="off">
        <div class="inputWrap">
          <svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" stroke-width="2"/>
            <path d="M16.5 16.5 21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <input id="q" type="search" name="q" placeholder="Hledat v článcích… (např. Pelhřimov, tunel, D1)" />
          <span class="kbd" title="Zkratka">Ctrl / ⌘ K</span>
        </div>

        <button class="btn primary" type="submit" id="searchBtn" title="Vyhledat (Enter)">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" stroke-width="2"/>
            <path d="M16.5 16.5 21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Hledat
        </button>

        <button class="btn" type="button" id="copyLinkBtn" title="Zkopírovat odkaz na tento dotaz">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 9h10v12H9V9Z" stroke="currentColor" stroke-width="2"/>
            <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" stroke="currentColor" stroke-width="2"/>
          </svg>
          Sdílet
        </button>

        <div class="controls" role="group" aria-label="Nastavení vyhledávání">
          <label>
            Limit&nbsp;
            <select id="limit">
              <option value="10">10</option>
              <option value="20" selected>20</option>
              <option value="50">50</option>
            </select>
          </label>

          <label>
            Řazení&nbsp;
            <select id="sort">
              <option value="relevance" selected>Relevance</option>
              <option value="date_desc">Nejnovější</option>
              <option value="date_asc">Nejstarší</option>
            </select>
          </label>

          <label title="Hledat už při psaní (debounce)">
            <input type="checkbox" id="live" checked />
            živě
          </label>
        </div>
      </form>

      <div class="hint">
        <div>Tip: sdílej odkaz <code>/?q=něco</code> nebo použij <code>Ctrl/⌘ + K</code> pro fokus.</div>
        <div id="health" class="badge" title="Stav API">API: …</div>
      </div>

      <div class="statusRow">
        <div class="status" id="status">Zadej dotaz.</div>
        <div class="status" id="timing"></div>
      </div>

      <section class="results" id="results" aria-live="polite" aria-busy="false"></section>

      <div class="footer">
        <div>Problém s nulou výsledků může znamenat: dotaz není v DB / je potřeba reindex.</div>
        <div style="font-family:var(--mono); opacity:.9;">v1 UI</div>
      </div>
    </main>
  </div>

  <div class="toast" id="toast" role="status" aria-live="polite"></div>

  <script>
    // =========================
    // Konfigurace
    // =========================
    const API_PATH = "api/search"; // změň, pokud máš jinak
    const DEFAULT_LIMIT = 20;
    const DEBOUNCE_MS = 220;

    // =========================
    // Utils
    // =========================
    const $ = (sel) => document.querySelector(sel);

    function escapeHtml(s){
      return String(s ?? "")
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replaceAll('"',"&quot;")
        .replaceAll("'","&#039;");
    }

    function toast(msg){
      const el = $("#toast");
      el.textContent = msg;
      el.classList.add("show");
      clearTimeout(toast._t);
      toast._t = setTimeout(()=> el.classList.remove("show"), 1400);
    }

    function setQueryParam(q){
      const url = new URL(location.href);
      if (q) url.searchParams.set("q", q);
      else url.searchParams.delete("q");
      history.replaceState(null, "", url.toString());
    }

    function highlight(text, q){
      if (!text) return "";
      const terms = String(q||"")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 8)
        .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

      if (!terms.length) return escapeHtml(text);
      const re = new RegExp("(" + terms.join("|") + ")", "ig");
      return escapeHtml(text).replace(re, "<mark>$1</mark>");
    }

    // Tolerantní mapování výsledků (přizpůsob si jen tady)
    function normalizeResult(r){
      // běžná pole: title, url, link, href, date, published_at, snippet, perex, excerpt, score
      const title = r.title ?? r.name ?? r.headline ?? "Bez názvu";
      const url = r.url ?? r.link ?? r.href ?? "";
      const snippet = r.snippet ?? r.excerpt ?? r.perex ?? r.text ?? "";
      const date = r.date ?? r.published_at ?? r.publishedAt ?? r.published ?? "";
      const score = r.score ?? r.rank ?? r.bm25 ?? null;
      const source = r.source ?? r.section ?? r.category ?? "";
      return { title, url, snippet, date, score, source, raw: r };
    }

    function parseDate(d){
      if (!d) return null;
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? null : dt;
    }

    function formatDate(d){
      const dt = parseDate(d);
      if (!dt) return "";
      return dt.toLocaleDateString("cs-CZ", { year:"numeric", month:"2-digit", day:"2-digit" });
    }

    function sortResults(list, mode){
      const arr = [...list];
      if (mode === "relevance") return arr; // necháme jak vrátí FTS
      const dir = mode === "date_desc" ? -1 : 1;
      return arr.sort((a,b)=>{
        const da = parseDate(a.date)?.getTime() ?? 0;
        const db = parseDate(b.date)?.getTime() ?? 0;
        return (da - db) * dir;
      });
    }

    // =========================
    // UI state
    // =========================
    const els = {
      form: $("#form"),
      q: $("#q"),
      results: $("#results"),
      status: $("#status"),
      timing: $("#timing"),
      limit: $("#limit"),
      sort: $("#sort"),
      live: $("#live"),
      copy: $("#copyLinkBtn"),
      health: $("#health"),
    };

    let inFlight = null;
    let debounceT = null;

    function setBusy(isBusy){
      els.results.setAttribute("aria-busy", isBusy ? "true" : "false");
      $("#searchBtn").disabled = isBusy;
    }

    function renderSkeleton(n=6){
      els.results.innerHTML = Array.from({length:n}).map(()=>`<div class="skeleton"></div>`).join("");
    }

    function renderEmpty(q){
      els.results.innerHTML = "";
      els.status.innerHTML = q
        ? `Nenalezla jsem nic pro <strong>${escapeHtml(q)}</strong>. Zkus jiné slovo nebo kratší dotaz.`
        : "Zadej dotaz.";
      els.timing.textContent = "";
    }

    function renderError(msg){
      els.results.innerHTML = "";
      els.status.innerHTML = `Chyba: <strong>${escapeHtml(msg || "nepodařilo se načíst výsledky")}</strong>`;
      els.timing.textContent = "";
    }

    function renderResults(q, results, ms){
      els.status.innerHTML = results.length
        ? `Nalezeno <strong>${results.length}</strong> výsledků pro <strong>${escapeHtml(q)}</strong>`
        : `Nic pro <strong>${escapeHtml(q)}</strong>`;

      els.timing.textContent = (typeof ms === "number") ? `≈ ${ms} ms` : "";

      els.results.innerHTML = results.map(r=>{
        const title = highlight(r.title, q);
        const snippet = highlight(r.snippet, q);
        const date = formatDate(r.date);
        const metaBits = [];
        if (date) metaBits.push(`<span class="badge">${escapeHtml(date)}</span>`);
        if (r.source) metaBits.push(`<span class="badge">${escapeHtml(r.source)}</span>`);
        if (r.score != null && r.score !== "") metaBits.push(`<span class="badge">score: ${escapeHtml(r.score)}</span>`);

        const meta = metaBits.length ? `<div class="meta">${metaBits.join("")}</div>` : "";

        const safeUrl = escapeHtml(r.url || "#");

        return `
          <article class="card">
            <div class="cardTop">
              <div style="min-width:0">
                <h2 class="title">
                  ${r.url ? `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${title}</a>` : title}
                </h2>
                ${meta}
              </div>
            </div>
            ${r.snippet ? `<p class="snippet">${snippet}</p>` : ""}
          </article>
        `;
      }).join("");
    }

    async function apiHealth(){
      // Jemná “health” kontrola: lehký dotaz (nebo HEAD, pokud máš)
      try{
        const t0 = performance.now();
        const url = new URL(API_PATH, location.origin);
        url.searchParams.set("q", "a");
        url.searchParams.set("limit", "1");
        const res = await fetch(url.toString(), { headers: { "accept":"application/json" }});
        const ms = Math.round(performance.now() - t0);
        if (!res.ok) throw new Error("HTTP " + res.status);
        els.health.textContent = "API: OK · " + ms + " ms";
      }catch(e){
        els.health.textContent = "API: chyba";
      }
    }

    async function search(q, {pushUrl=true} = {}){
      q = (q || "").trim();
      const limit = Math.min(parseInt(els.limit.value || DEFAULT_LIMIT, 10) || DEFAULT_LIMIT, 50);
      const sortMode = els.sort.value || "relevance";

      if (pushUrl) setQueryParam(q);

      if (!q){
        if (inFlight) inFlight.abort();
        renderEmpty("");
        return;
      }

      if (inFlight) inFlight.abort();
      inFlight = new AbortController();

      setBusy(true);
      renderSkeleton(6);
      els.status.textContent = "Hledám…";
      els.timing.textContent = "";

      const t0 = performance.now();
      try{
        const url = new URL(API_PATH, location.origin);
        url.searchParams.set("q", q);
        url.searchParams.set("limit", String(limit));

        const res = await fetch(url.toString(), {
          signal: inFlight.signal,
          headers: { "accept":"application/json" }
        });

        const ms = Math.round(performance.now() - t0);

        if (!res.ok){
          const text = await res.text().catch(()=> "");
          throw new Error(`HTTP ${res.status}${text ? " – " + text.slice(0,120) : ""}`);
        }

        const data = await res.json();

        const rawResults = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
        const norm = rawResults.map(normalizeResult);
        const sorted = sortResults(norm, sortMode);

        if (!sorted.length){
          els.results.innerHTML = "";
          renderResults(q, [], ms);
        }else{
          renderResults(q, sorted, ms);
        }
      }catch(e){
        if (e?.name === "AbortError") return;
        renderError(e?.message || String(e));
      }finally{
        setBusy(false);
      }
    }

    function debounceSearch(){
      clearTimeout(debounceT);
      debounceT = setTimeout(()=>{
        if (els.live.checked) search(els.q.value, {pushUrl:true});
      }, DEBOUNCE_MS);
    }

    // =========================
    // Events
    // =========================
    els.form.addEventListener("submit", (e)=>{
      e.preventDefault();
      search(els.q.value, {pushUrl:true});
    });

    els.q.addEventListener("input", debounceSearch);
    els.limit.addEventListener("change", ()=> search(els.q.value, {pushUrl:true}));
    els.sort.addEventListener("change", ()=> search(els.q.value, {pushUrl:true}));

    els.copy.addEventListener("click", async ()=>{
      const url = location.href;
      try{
        await navigator.clipboard.writeText(url);
        toast("Odkaz zkopírován");
      }catch{
        // fallback
        const ta = document.createElement("textarea");
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        toast("Odkaz zkopírován");
      }
    });

    // Ctrl/⌘ + K -> focus
    window.addEventListener("keydown", (e)=>{
      const isK = (e.key || "").toLowerCase() === "k";
      if ((e.ctrlKey || e.metaKey) && isK){
        e.preventDefault();
        els.q.focus();
        els.q.select();
      }
    });

    // =========================
    // Init from URL
    // =========================
    (function init(){
      apiHealth();
      const url = new URL(location.href);
      const q = (url.searchParams.get("q") || "").trim();
      const limit = (url.searchParams.get("limit") || "").trim();
      if (limit) els.limit.value = limit;

      if (q){
        els.q.value = q;
        search(q, {pushUrl:false});
      }else{
        renderEmpty("");
      }
    })();
  </script>
</body>
</html>
