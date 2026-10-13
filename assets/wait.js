/* «Жду книгу»: отметки читательниц (Supabase), картина из осколков и банка с сердечками.
   Отметиться можно только из аккаунта сайта (assets/account.js); в базе одна строка на аккаунт — tools/supabase_preorder.sql. */
(function () {
  const SB = window.SITE && window.SITE.supabase;
  const STEP = 200;                       // осколков в первой картине; дальше 400, 600…
  const IMG = "assets/zhdu-bg.jpg";
  const $ = id => document.getElementById(id);
  const stage = $("waitStage"); if (!stage) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- база (Supabase): те же аккаунты, что и для игры ---------- */
  async function rpc(fn, body) {
    const r = await fetch(SB.url.replace(/\/$/, "") + "/rest/v1/rpc/" + fn, { method: "POST", headers: { apikey: SB.key, "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
    let j = null; try { j = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error((j && (j.message || j.hint || j.code)) || ("ошибка " + r.status));
    return j;
  }
  const acctToken = () => { try { return localStorage.getItem("acct-token"); } catch (e) { return null; } };
  const getCount = async () => +(await rpc("preorder_count"));

  /* ---------- картина из осколков ---------- */
  const cv = $("waitGlass"), cx = cv.getContext("2d");
  let img = null, blurred = null, cells = [], order = [], goal = STEP, count = 0, shown = 0, W = 0, Hh = 0, flying = null;
  function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

  function buildCells(n) {
    const r = rng(n * 7919), aspect = W / Hh;
    const rows = Math.max(1, Math.round(Math.sqrt(n / aspect))), cols = Math.ceil(n / rows);
    const cw = W / cols, ch = Hh / rows, pts = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (pts.length >= n) break;
      pts.push({ x: (x + 0.12 + r() * 0.76) * cw, y: (y + 0.12 + r() * 0.76) * ch, gx: x, gy: y });
    }
    const grid = {}; pts.forEach((p, i) => grid[p.gx + "," + p.gy] = i);
    cells = pts.map((p, i) => {
      let poly = [[0, 0], [W, 0], [W, Hh], [0, Hh]];
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const j = grid[(p.gx + dx) + "," + (p.gy + dy)]; if (j == null || j === i) continue;
        const q = pts[j], mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2, nx = q.x - p.x, ny = q.y - p.y;
        const out = [];
        for (let k = 0; k < poly.length; k++) {
          const a = poly[k], b = poly[(k + 1) % poly.length];
          const da = (a[0] - mx) * nx + (a[1] - my) * ny, db = (b[0] - mx) * nx + (b[1] - my) * ny;
          if (da <= 0) out.push(a);
          if ((da < 0) !== (db < 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
        }
        poly = out; if (!poly.length) break;
      }
      return { poly, cx: p.x, cy: p.y };
    });
    order = cells.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  }

  function makeBlur() {
    if (!img || !img.naturalWidth || !W) return;
    const s = 6, sw = Math.max(1, Math.round(W / s)), sh = Math.max(1, Math.round(Hh / s));
    const small = document.createElement("canvas"); small.width = sw; small.height = sh;
    const c = small.getContext("2d");
    // фон: та же картинка, растянутая на всю сцену и сильно размытая
    const tiny = document.createElement("canvas"); tiny.width = Math.max(1, Math.round(sw / 4)); tiny.height = Math.max(1, Math.round(sh / 4));
    const t = tiny.getContext("2d"), kb = Math.max(tiny.width / img.width, tiny.height / img.height);
    t.drawImage(img, (tiny.width - img.width * kb) / 2, (tiny.height - img.height * kb) * 0.3, img.width * kb, img.height * kb);
    c.drawImage(tiny, 0, 0, sw, sh);
    // ребята: на широком экране целиком по высоте справа, на узком — по ширине
    const wide = W > Hh * 1.05;
    const k = wide ? Math.max(sh / img.height * 1.08, sw * 0.5 / img.width) : Math.max(sw / img.width, sh / img.height);
    const iw = img.width * k, ih = img.height * k;
    const x = wide ? sw - iw - sw * 0.02 : (sw - iw) / 2, y = (sh - ih) * (wide ? 0.45 : 0.4);
    const layer = document.createElement("canvas"); layer.width = sw; layer.height = sh;
    const l = layer.getContext("2d"); l.drawImage(img, x, y, iw, ih);
    if (wide) {   // мягкий левый край, чтобы картинка перетекала в фон
      l.globalCompositeOperation = "destination-in";
      const g = l.createLinearGradient(x, 0, x + iw * 0.35, 0); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,1)");
      l.fillStyle = g; l.fillRect(0, 0, sw, sh);
    }
    c.drawImage(layer, 0, 0);
    blurred = document.createElement("canvas"); blurred.width = W; blurred.height = Hh;
    const b = blurred.getContext("2d"); b.imageSmoothingQuality = "high"; b.drawImage(small, 0, 0, W, Hh);
  }

  function path(poly, ox = 0, oy = 0, sc = 1, cxp = 0, cyp = 0) {
    cx.beginPath();
    poly.forEach(([x, y], k) => { const X = cxp + (x - cxp) * sc + ox, Y = cyp + (y - cyp) * sc + oy; k ? cx.lineTo(X, Y) : cx.moveTo(X, Y); });
    cx.closePath();
  }
  function draw() {
    cx.setTransform(devicePixelRatio || 1, 0, 0, devicePixelRatio || 1, 0, 0);
    cx.fillStyle = "#070a0f"; cx.fillRect(0, 0, W, Hh);
    const filled = Math.min(shown, cells.length);
    for (let k = 0; k < cells.length; k++) {
      const c = cells[order[k]];
      if (k < filled && !(flying && flying.k === k)) {
        cx.save(); path(c.poly); cx.clip();
        if (blurred) cx.drawImage(blurred, 0, 0); else { cx.fillStyle = "#26303c"; cx.fill(); }
        const g = cx.createLinearGradient(c.cx - 30, c.cy - 30, c.cx + 30, c.cy + 30);
        g.addColorStop(0, "rgba(255,255,255,.10)"); g.addColorStop(.5, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(185,211,230,.06)");
        cx.fillStyle = g; cx.fill(); cx.restore();
        path(c.poly); cx.strokeStyle = "rgba(235,244,250,.28)"; cx.lineWidth = .8; cx.stroke();
      } else {
        if (blurred) { cx.save(); path(c.poly); cx.clip(); cx.globalAlpha = .14; cx.drawImage(blurred, 0, 0); cx.restore(); }   // призрак картины за пустым стеклом
        path(c.poly); cx.fillStyle = "rgba(185,211,230,.025)"; cx.fill();
        cx.strokeStyle = "rgba(185,211,230,.10)"; cx.lineWidth = .6; cx.stroke();
      }
    }
    if (flying) {
      const c = cells[order[flying.k]], t = flying.t, e = 1 - Math.pow(1 - t, 3);
      const oy = (1 - e) * Hh * 0.6, sc = 0.4 + 0.6 * e;
      cx.save(); cx.globalAlpha = Math.min(1, t * 2); path(c.poly, 0, oy, sc, c.cx, c.cy); cx.clip();
      if (blurred) cx.drawImage(blurred, 0, 0); cx.restore();
      path(c.poly, 0, oy, sc, c.cx, c.cy); cx.strokeStyle = `rgba(255,220,230,${.9 - .6 * e})`; cx.lineWidth = 1.6; cx.stroke();
    }
  }
  function resize() {
    const r = stage.getBoundingClientRect(); W = Math.round(r.width); Hh = Math.round(r.height);
    const d = devicePixelRatio || 1; cv.width = W * d; cv.height = Hh * d;
    buildCells(goal); makeBlur(); draw();
  }
  function animateFill(from, to) {
    if (reduce || to - from <= 0) { shown = to; draw(); return; }
    const t0 = performance.now(), dur = Math.min(1800, 300 + (to - from) * 12);
    (function f(now) { const p = Math.min(1, (now - t0) / dur); shown = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 2))); draw(); if (p < 1) requestAnimationFrame(f); })(t0);
  }
  function flyIn(k, done) {
    if (reduce) { shown = k + 1; draw(); done && done(); return; }
    shown = k + 1; flying = { k, t: 0 }; const t0 = performance.now();
    (function f(now) { flying.t = Math.min(1, (now - t0) / 900); draw(); if (flying.t < 1) requestAnimationFrame(f); else { flying = null; draw(); done && done(); } })(t0);
  }

  /* ---------- банка с сердечками ---------- */
  const HEART = "M0 3.2C-1.6-.6-6-.6-6 3c0 2.6 3.2 4.8 6 7.4C2.8 7.8 6 5.6 6 3c0-3.6-4.4-3.6-6 .2z";
  const SLOTS = (() => {
    const s = [], r = rng(42);
    for (let row = 0; row < 8; row++) {
      const y = 214 - row * 17, half = y > 204 ? 42 : y > 192 ? 50 : 56;   // у дна банка скруглена — там ряд уже
      const xs = []; for (let x = 100 - half; x <= 100 + half; x += 18.5) xs.push(x + (row % 2 ? 9 : 0));
      xs.filter(x => x <= 100 + half).sort((a, b) => Math.abs(a - 100) - Math.abs(b - 100)).forEach(x =>
        s.push({ x: x + (r() - .5) * 3, y: y + (r() - .5) * 3, rot: (r() - .5) * 50, c: ["#f08aa9", "#e0896a", "#d9534f", "#f6b7cb", "#ec7aa0"][Math.floor(r() * 5)], s: 1.45 + r() * .3 }));
    }
    return s;
  })();
  function jarSvg(n, isNew) {
    const hearts = SLOTS.slice(0, n).map((h, i) => `<g transform="translate(${h.x.toFixed(1)} ${h.y.toFixed(1)}) rotate(${h.rot.toFixed(0)}) scale(${h.s.toFixed(2)})"><path class="jar-heart${isNew && i === n - 1 ? " new" : ""}" d="${HEART}" fill="${h.c}"/></g>`).join("");
    return `<svg viewBox="0 0 200 250" role="img" aria-label="Банка с сердечками">
      <defs><clipPath id="jarIn"><path d="M64 52h72c0 8 30 14 30 40v108c0 18-13 30-31 30H65c-18 0-31-12-31-30V92c0-26 30-32 30-40z"/></clipPath>
      <linearGradient id="jarGlass" x1="0" x2="1"><stop offset="0" stop-color="#cfe3f0" stop-opacity=".22"/><stop offset=".5" stop-color="#cfe3f0" stop-opacity=".06"/><stop offset="1" stop-color="#cfe3f0" stop-opacity=".18"/></linearGradient></defs>
      <path d="M64 52h72c0 8 30 14 30 40v108c0 18-13 30-31 30H65c-18 0-31-12-31-30V92c0-26 30-32 30-40z" fill="rgba(10,14,20,.55)"/>
      <g clip-path="url(#jarIn)">${hearts}</g>
      <path d="M64 52h72c0 8 30 14 30 40v108c0 18-13 30-31 30H65c-18 0-31-12-31-30V92c0-26 30-32 30-40z" fill="url(#jarGlass)" stroke="rgba(225,238,247,.75)" stroke-width="2.4"/>
      <path d="M46 104c0-12 6-20 14-24M44 120v70" stroke="rgba(255,255,255,.55)" stroke-width="4" stroke-linecap="round" fill="none"/>
      <rect x="58" y="34" width="84" height="20" rx="6" fill="#e0896a"/><rect x="58" y="34" width="84" height="6" rx="3" fill="#f0a98a"/>
      <path d="M100 44c-14-14-30-2-18 6 6 4 18-6 18-6zm0 0c14-14 30-2 18 6-6 4-18-6-18-6z" fill="#f6b7cb" stroke="#ec7aa0" stroke-width="1.5"/>
      <path d="M100 44l-8 16M100 44l8 16" stroke="#ec7aa0" stroke-width="3" stroke-linecap="round"/>
    </svg>`;
  }
  const word = n => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? "человек ждёт" : m >= 2 && m <= 4 && (h < 12 || h > 14) ? "человека ждут" : "человек ждут"; };
  function renderJar(isNew) {
    const tier = goal / STEP, f = count / goal;
    const n = count === 0 ? 0 : Math.max(Math.min(count, 3), Math.round(f * SLOTS.length));
    $("waitJar").style.setProperty("--jarw", Math.min(280, 170 + (tier - 1) * 24) + "px");
    $("waitJarSvg").innerHTML = jarSvg(n, isNew);
    $("waitCount").textContent = count.toLocaleString("ru-RU");
    $("waitCountSub").textContent = word(count);
    if ($("waitTier")) $("waitTier").innerHTML = `Картина из <b>${goal}</b> осколков: собрано <b>${count}</b>. Ещё <b>${goal - count}</b> — и она станет больше.`;
    $("waitBar").style.width = (100 * f).toFixed(1) + "%";
  }
  function setCount(n, isNew) {
    const newGoal = STEP * (Math.floor(n / STEP) + 1), prev = shown;
    count = n;
    if (newGoal !== goal) { goal = newGoal; buildCells(goal); shown = isNew ? n - 1 : 0; }
    renderJar(isNew);
    if (isNew) flyIn(n - 1); else animateFill(Math.min(prev, n), n);
  }

  /* ---------- кнопка ---------- */
  const btn = $("waitBtn"), note = $("waitNote");
  const say = (t, err) => { note.textContent = t || ""; note.className = "wait-note" + (err ? " err" : ""); };
  const DONE = "Следи за новостями здесь и в социальных сетях, чтобы не пропустить предзаказ.";
  function markVoted() {
    btn.disabled = true;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.2 0 3.6 1.2 4.3 2.4.7-1.2 2.1-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg>Твоё сердечко в банке`;
  }
  let busy = false;
  async function doVote() {
    const t = acctToken(); if (!t || busy) return; busy = true;
    try { sessionStorage.removeItem("wait-pending"); } catch (e) {}
    say("Кладу твоё сердечко в банку…");
    try {
      const r = await rpc("preorder_wait", { p_token: t });
      if (r && r.error === "auth") { say("Войди в аккаунт ещё раз — сессия устарела.", true); busy = false; return; }
      markVoted();
      setCount(+r.count, !!r.added); say(DONE);
    } catch (e) { say("Не получилось сохранить отметку. Попробуй позже. (" + e.message + ")", true); }
    busy = false;
  }
  let watch;
  btn.onclick = () => {
    if (!SB) return say("Счётчик скоро заработает.", true);
    if (acctToken()) return doVote();
    try { sessionStorage.setItem("wait-pending", "1"); } catch (e) {}
    say("Отметиться можно из аккаунта: войди или зарегистрируйся — это минута, почта не нужна.");
    if (window.ACCOUNT) window.ACCOUNT.open();
    clearInterval(watch);
    watch = setInterval(() => { if (acctToken()) { clearInterval(watch); doVote(); } }, 800);
    setTimeout(() => clearInterval(watch), 10 * 60 * 1000);
  };

  /* ---------- старт ---------- */
  new ResizeObserver(() => { const r = stage.getBoundingClientRect(); if (Math.round(r.width) !== W || Math.round(r.height) !== Hh) resize(); }).observe(stage);
  img = new Image(); img.onload = () => { makeBlur(); draw(); }; img.src = IMG;
  resize(); renderJar(false);
  if (!SB) { say("Счётчик скоро заработает."); return; }
  getCount().then(n => setCount(n, false)).catch(() => say("Счётчик скоро заработает."));
  const t0 = acctToken();
  if (t0) {
    let pending = false; try { pending = sessionStorage.getItem("wait-pending") === "1"; } catch (e) {}
    if (pending) setTimeout(doVote, 600);
    else rpc("preorder_me", { p_token: t0 }).then(r => { if (r && r.voted) { markVoted(); say(DONE); } }).catch(() => {});
  }
})();
