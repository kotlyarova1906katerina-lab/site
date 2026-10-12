/* Читалка книг. Настройки книги — window.BOOK, текст — window.BOOK_TEXT (из chapters.js).
   BOOK = { key, title, litnet, fragment: true|false, total: число глав на Литнет, sequel: {title, url}, mark: "skate"|"pen"|... } */
(function () {
  /* текст книги хранится зашифрованным (tools/protect_book.py) и собирается только здесь, на экране */
  function fnv(str) { let h = 0x811c9dc5; for (const b of new TextEncoder().encode(str)) { h ^= b; h = Math.imul(h, 16777619) >>> 0; } return h || 0x9E3779B9; }
  function unlock(b64, seed) {
    const bin = atob(b64), n = bin.length, out = new Uint8Array(n); let x = fnv(seed);
    for (let i = 0; i < n; i++) { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; out[i] = bin.charCodeAt(i) ^ (x & 255); }
    return new TextDecoder().decode(out);
  }
  const E = window.BOOK_ENC;
  const CH = window.BOOK_TEXT || (E ? E.m.map((m, i) => Object.assign({}, m, { p: JSON.parse(unlock(E.c[i], E.k + ":" + i)) })) : []);
  const B = window.BOOK;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* значки у названия главы — свой у каждой книги */
  const MARKS = {
    skate: `<path d="M14 4h13c2 0 3 1.2 3 3v13c0 2 1.4 3 3.2 3.4l12 2.4c5 1 8.8 4.4 8.8 8.2V37H14c-2.4 0-4-1.6-4-4V8c0-2.2 1.6-4 4-4z" fill="#e8eef4" stroke="#9aa7b4" stroke-width="1"/><path d="M10 30h46v4c0 1.7-1.3 3-3 3H14c-2.4 0-4-1.6-4-4z" fill="#c9d4df"/><path d="M30 9h-6M30 13.5h-6M30 18h-6M34 22l-4 1.5" stroke="#e0896a" stroke-width="2" stroke-linecap="round"/><path d="M15 37v4M50 37v4" stroke="#93a3b4" stroke-width="2.4" stroke-linecap="round"/><path d="M6 42.5h46c4 0 6.5-1.6 7-4.2.2-1-.6-1.6-1.5-1.1-.6.4-1 .9-1.5 1.2" fill="none" stroke="#8fb3cc" stroke-width="2.6" stroke-linecap="round"/>`,
    pen: `<path d="M44 4 60 20 30 42 18 46 22 34z" fill="#e8eef4" stroke="#9aa7b4" stroke-width="1.2"/><path d="M44 4 60 20 54 26 38 10z" fill="#e0896a"/><path d="M22 34 30 42" stroke="#9aa7b4" stroke-width="1.2"/><circle cx="26" cy="38" r="2.2" fill="#141414"/><path d="M6 46c6-2 9 1 14 0" stroke="#e0896a" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    glasses: `<circle cx="18" cy="26" r="11" fill="#dbeaf5" fill-opacity=".5" stroke="#e0896a" stroke-width="3.2"/><circle cx="46" cy="26" r="11" fill="#dbeaf5" fill-opacity=".5" stroke="#e0896a" stroke-width="3.2"/><path d="M29 24c2-2 4-2 6 0" stroke="#e0896a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M7 23 2 18M57 23l5-5" stroke="#e0896a" stroke-width="3" stroke-linecap="round"/><path d="M12 22c2-3 5-4 8-4M40 22c2-3 5-4 8-4" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>`,
    glove: `<path d="M16 22c0-10 8-16 18-16 9 0 16 6 16 15v9c0 6-4 10-10 10H24c-5 0-8-4-8-8z" fill="#d9534f"/><path d="M16 26c-5 0-8 3-8 7s3 6 8 6" fill="#c0433f"/><rect x="20" y="40" width="26" height="8" rx="3" fill="#e8eef4" stroke="#9aa7b4"/><path d="M24 14c3-3 8-4 12-3" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".6"/>`,
    books: `<rect x="8" y="34" width="48" height="10" rx="2" fill="#e0896a"/><rect x="12" y="24" width="42" height="10" rx="2" fill="#8fb3cc"/><rect x="10" y="14" width="40" height="10" rx="2" fill="#e8eef4" stroke="#9aa7b4"/><path d="M14 39h36M17 29h32M15 19h30" stroke="#fff" stroke-width="1.4" opacity=".7"/><path d="M44 4c4 0 6 3 6 6-3 1-6-1-6-6z" fill="#7bc47f"/>`,
    slipper: `<path d="M8 38c0-6 6-10 14-10h8c6 0 10-6 14-12 3-4 9-4 12 0 3 4 2 9-2 13L42 40c-3 3-7 4-11 4H12c-2.4 0-4-2-4-6z" fill="#dbeaf5" fill-opacity=".85" stroke="#8fb3cc" stroke-width="1.6"/><path d="M48 30l2 14" stroke="#8fb3cc" stroke-width="3" stroke-linecap="round"/><path d="M16 34c4-2 9-2 13-1M44 18c2-2 5-2 7 0" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M54 6l1.4 3 3 1.4-3 1.4L54 15l-1.4-3.2-3-1.4 3-1.4z" fill="#e0896a"/>`,
    heart: `<path d="M32 46 12 27C6 21 7 12 14 9c5-2 10 0 13 4l3 4-4 6 7 5-3 7z" fill="#d9534f"/><path d="M34 15c3-4 9-7 15-5 7 3 8 12 2 18L35 44l3-9-6-6 5-6z" fill="#e0896a"/>`
  };
  const mark = (w, h) => `<svg class="mark" width="${w}" height="${h}" viewBox="0 0 64 48" aria-hidden="true">${MARKS[B.mark] || MARKS.books}</svg>`;

  /* настройки */
  const FONTS = { pt: '"PT Serif", Georgia, serif', lora: 'Lora, Georgia, serif', sans: '"PT Sans", "Golos Text", system-ui, sans-serif' };
  const SET = Object.assign({ theme: "light", font: "pt", size: 18, mode: "paged" }, store.get("reader-settings", {}));
  const R = $("reader");

  R.innerHTML = `
    <div class="r-tools">
      <select id="rToc" aria-label="Содержание"></select>
      <button class="r-btn" id="rAa" aria-expanded="false" aria-controls="rPanel" title="Настройки чтения">Aa</button>
      <button class="r-btn" id="rFs" title="На весь экран" aria-label="На весь экран"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path id="rFsIco" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>
    </div>
    <div class="r-panel" id="rPanel" hidden>
      <div class="r-row"><span class="lbl">Фон</span><div class="seg" id="sTheme"><button data-v="light"><span class="sw" style="background:#fff"></span>Белый</button><button data-v="dark"><span class="sw" style="background:#000"></span>Чёрный</button></div></div>
      <div class="r-row"><span class="lbl">Шрифт</span><div class="seg" id="sFont"><button data-v="pt" style="font-family:'PT Serif',serif">PT Serif</button><button data-v="lora" style="font-family:Lora,serif">Lora</button><button data-v="sans" style="font-family:'PT Sans',sans-serif">PT Sans</button></div></div>
      <div class="r-row"><span class="lbl">Размер</span><div class="seg" id="sSize"><button data-v="-1" aria-label="Мельче">A−</button><span class="size-val" id="sSizeVal"></span><button data-v="1" aria-label="Крупнее">A+</button></div></div>
      <div class="r-row"><span class="lbl">Чтение</span><div class="seg" id="sMode"><button data-v="paged">По страницам</button><button data-v="scroll">Лентой</button></div></div>
    </div>
    <div class="flowpane" id="rPane"><div class="r-body" id="rBody"></div></div>
    <nav class="pager" id="rPager" aria-label="Страницы"></nav>
    <div class="pageinfo" id="rInfo"></div>
    <div id="rEnd"></div>`;

  const toc = $("rToc");
  const chName = c => c.label + (c.title ? ". " + c.title : "");
  toc.innerHTML = CH.map((c, k) => `<option value="${k}">${esc(chName(c))}</option>`).join("");

  function applySettings() {
    R.classList.toggle("dark", SET.theme === "dark");
    R.style.setProperty("--rfont", FONTS[SET.font] || FONTS.pt);
    R.style.setProperty("--rsize", SET.size + "px");
    $("sSizeVal").textContent = SET.size;
    [["sTheme", "theme"], ["sFont", "font"], ["sMode", "mode"]].forEach(([id, k]) =>
      $(id).querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === SET[k])));
    R.classList.toggle("paged", SET.mode === "paged");
    store.set("reader-settings", SET);
  }

  /* раскладка на страницы */
  let pages = [];
  function paginate() {
    const per = Math.round(1900 * 18 / SET.size);
    pages = [];
    CH.forEach((c, ci) => {
      let cur = { ci, first: true, from: 0, to: 0 }, len = 0;
      c.p.forEach((par, k) => {
        const budget = cur.first ? per - 350 : per;
        if (len > 0 && len + par.length > budget) { cur.to = k; pages.push(cur); cur = { ci, first: false, from: k, to: 0 }; len = 0; }
        len += par.length;
      });
      cur.to = c.p.length; pages.push(cur);
    });
  }
  const POSKEY = "pos-" + B.key;
  let pos = Object.assign({ ci: 0, par: 0 }, store.get(POSKEY, {}));
  if (!CH[pos.ci]) pos = { ci: 0, par: 0 };
  const pageOf = p => Math.max(0, pages.findIndex(pg => pg.ci === p.ci && p.par >= pg.from && p.par < pg.to));

  const head = c => `<div class="chapter-head">${mark(60, 45)}<div class="num">${esc(c.label)}</div>${c.title ? `<h2>${esc(c.title)}</h2>` : ""}${c.pov ? `<div class="pov">${esc(c.pov)}</div>` : ""}</div>`;
  const paras = (c, a, b) => `<div class="text">${c.p.slice(a, b).map(t => `<p>${esc(t)}</p>`).join("")}</div>`;
  const run = (c, right) => `<div class="run"><span class="ch">${mark(24, 18)}<span>${esc(chName(c))}</span></span><span class="pg">${right}</span></div>`;

  function endCard() {
    if (B.fragment) return `<div class="endcard">${mark(56, 42)}<h3>Хочешь узнать, что будет дальше?</h3>
      <p>Это был бесплатный фрагмент: ${CH.length} ${plural(CH.length, "глава", "главы", "глав")}. Продолжение — на Литнет${B.total ? `, там уже ${B.total} ${plural(B.total, "глава", "главы", "глав")}` : ""}.</p>
      <div class="btns"><a class="btn btn-main" href="${B.litnet}" target="_blank" rel="noopener">Продолжить чтение на Литнет</a></div></div>`;
    return `<div class="endcard">${mark(56, 42)}<h3>Конец книги</h3>
      <p>Если история тебя зацепила, поддержи её на Литнет: добавь в библиотеку и оставь комментарий. Это очень помогает книге.</p>
      <div class="btns">${B.sequel ? `<a class="btn btn-main" href="${B.sequel.url}" target="_blank" rel="noopener">Читать продолжение: «${esc(B.sequel.title)}»</a>` : ""}<a class="btn btn-ghost" href="${B.litnet}" target="_blank" rel="noopener">Книга на Литнет</a></div></div>`;
  }
  function plural(n, a, b, c) { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; }

  function pagerHtml(i, N) {
    const nums = [...new Set([0, N - 1, i - 1, i, i + 1].filter(x => x >= 0 && x < N))].sort((a, b) => a - b);
    let out = `<button data-go="${i - 1}" ${i === 0 ? "disabled" : ""} aria-label="Предыдущая страница">‹</button>`, prev = -1;
    nums.forEach(n => { if (prev >= 0 && n - prev > 1) out += `<span class="gap">…</span>`; out += `<button data-go="${n}" ${n === i ? 'aria-current="true"' : ""}>${n + 1}</button>`; prev = n; });
    return out + `<button data-go="${i + 1}" ${i === N - 1 ? "disabled" : ""} aria-label="Следующая страница">›</button>`;
  }

  function render(scroll) {
    const body = $("rBody");
    if (SET.mode === "paged") {
      const i = pageOf(pos), pg = pages[i], c = CH[pg.ci], N = pages.length;
      body.innerHTML = run(c, `${i + 1} / ${N}`) + (pg.first ? head(c) : "") + paras(c, pg.from, pg.to);
      $("rPager").innerHTML = pagerHtml(i, N); $("rPager").hidden = false;
      $("rInfo").textContent = `Страница ${i + 1} из ${N}`;
      $("rEnd").innerHTML = i === N - 1 ? endCard() : "";
      $("rPane").querySelectorAll(".tapzone").forEach(z => z.remove());
      $("rPane").insertAdjacentHTML("beforeend", `<div class="tapzone l" data-step="-1" aria-hidden="true"></div><div class="tapzone r" data-step="1" aria-hidden="true"></div>`);
      toc.value = pg.ci;
    } else {
      const c = CH[pos.ci];
      body.innerHTML = run(c, `${pos.ci + 1} / ${CH.length}`) + head(c) + paras(c, 0, c.p.length);
      $("rPane").querySelectorAll(".tapzone").forEach(z => z.remove());
      const last = pos.ci === CH.length - 1;
      $("rPager").innerHTML = `<button class="wide" data-ch="${pos.ci - 1}" ${pos.ci === 0 ? "disabled" : ""}>‹ Предыдущая глава</button>` + (last ? "" : `<button class="wide" data-ch="${pos.ci + 1}">Следующая глава ›</button>`);
      $("rPager").hidden = false;
      $("rInfo").textContent = `Глава ${pos.ci + 1} из ${CH.length}`;
      $("rEnd").innerHTML = last ? endCard() : "";
      toc.value = pos.ci;
    }
    store.set(POSKEY, pos);
    if (scroll) {
      if (R.classList.contains("fs")) R.scrollTo({ top: 0 });
      else $("read").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  function goPage(i) { i = Math.max(0, Math.min(pages.length - 1, i)); pos = { ci: pages[i].ci, par: pages[i].from }; render(true); }
  function step(d) { if (SET.mode === "paged") goPage(pageOf(pos) + d); else if (CH[pos.ci + d]) { pos = { ci: pos.ci + d, par: 0 }; render(true); } }

  /* события */
  toc.onchange = () => { pos = { ci: +toc.value, par: 0 }; render(true); };
  $("rPager").onclick = e => {
    const b = e.target.closest("button"); if (!b || b.disabled) return;
    if (b.dataset.go != null) goPage(+b.dataset.go);
    else if (b.dataset.ch != null) { pos = { ci: +b.dataset.ch, par: 0 }; render(true); }
  };
  $("rPane").addEventListener("click", e => { const z = e.target.closest(".tapzone"); if (z) step(+z.dataset.step); });
  let tx = null, ty = 0;
  $("rPane").addEventListener("touchstart", e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  $("rPane").addEventListener("touchend", e => {
    if (tx == null || SET.mode !== "paged") return;
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty; tx = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  }, { passive: true });
  document.addEventListener("keydown", e => {
    if (e.target.closest("input,textarea,select")) return;
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "Escape" && R.classList.contains("fs")) toggleFs(false);
  });
  $("rAa").onclick = () => { const p = $("rPanel"); p.hidden = !p.hidden; $("rAa").setAttribute("aria-expanded", !p.hidden); };
  const segClick = (id, fn) => $(id).addEventListener("click", e => { const b = e.target.closest("button"); if (b) fn(b.dataset.v); });
  segClick("sTheme", v => { SET.theme = v; applySettings(); });
  segClick("sFont", v => { SET.font = v; applySettings(); });
  segClick("sSize", v => { SET.size = Math.min(28, Math.max(14, SET.size + +v)); applySettings(); paginate(); render(false); });
  segClick("sMode", v => { SET.mode = v; applySettings(); render(false); });

  /* весь экран: своя раскладка на всё окно + системный полноэкранный режим, где он доступен */
  function toggleFs(on) {
    on = on == null ? !R.classList.contains("fs") : on;
    R.classList.toggle("fs", on);
    document.body.classList.toggle("reading-fs", on);
    $("rFsIco").setAttribute("d", on ? "M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" : "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5");
    $("rFs").setAttribute("aria-label", on ? "Выйти из полноэкранного режима" : "На весь экран");
    try {
      if (on && document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
      if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } catch (e) {}
    R.scrollTo({ top: 0 });
  }
  $("rFs").onclick = () => toggleFs();
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && R.classList.contains("fs")) toggleFs(false); });

  document.querySelectorAll("[data-litnet]").forEach(a => a.href = B.litnet);

  /* защита текста: без выделения, копирования, меню, печати; текст прячется, когда окно неактивно или нажата клавиша снимка экрана */
  const inForm = e => e.target.closest && e.target.closest("input,textarea,select");
  ["copy", "cut", "contextmenu", "selectstart", "dragstart"].forEach(ev => R.addEventListener(ev, e => { if (!inForm(e)) e.preventDefault(); }));
  R.insertAdjacentHTML("beforeend", `<div class="r-veil" id="rVeil" hidden><div><b>Текст скрыт</b><span>Нажми, чтобы продолжить чтение</span></div></div>`);
  const veil = $("rVeil");
  let veilT;
  function hide(ms) { R.classList.add("veiled"); veil.hidden = false; clearTimeout(veilT); if (ms) veilT = setTimeout(show, ms); }
  function show() { R.classList.remove("veiled"); veil.hidden = true; }
  veil.onclick = show;
  window.addEventListener("blur", () => hide());
  window.addEventListener("focus", () => setTimeout(show, 250));
  document.addEventListener("visibilitychange", () => { if (document.hidden) hide(); });
  document.addEventListener("keydown", e => {
    const k = (e.key || "").toLowerCase();
    if ((e.ctrlKey || e.metaKey) && ["c", "x", "a", "s", "p", "u"].includes(k) && !inForm(e)) { e.preventDefault(); }
    if (e.metaKey && e.shiftKey) hide(2500);                    // снимок экрана на Mac (Cmd+Shift+3/4/5)
    if (k === "printscreen" || (e.key === "S" && e.shiftKey && e.metaKey)) hide(2500);
  });
  document.addEventListener("keyup", e => {
    if ((e.key || "").toLowerCase() === "printscreen") {          // Windows: затираем снимок в буфере обмена
      hide(2500);
      try { navigator.clipboard && navigator.clipboard.writeText("Текст книги защищён. Читай на сайте автора Екатерины Котляровой."); } catch (er) {}
    }
  });
  window.addEventListener("beforeprint", () => hide());

  applySettings(); paginate(); render(false);
})();
