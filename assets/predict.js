/* Предсказание дня: карточка-осколок, которая раз в сутки (по Москве) открывает новое предсказание от героев.
   Тексты — data/predictions.js. Собранные осколки и дни лежат в localStorage под ключом oskolki-predict,
   поэтому сохраняются в аккаунт читательницы. Блок рисуется в <div id="predict" data-base="../"></div>. */
(function () {
  const box = document.getElementById("predict");
  if (!box || !window.PREDICTIONS) return;
  const base = box.dataset.base || "";
  const LIST = window.PREDICTIONS, N = LIST.length, KEY = "oskolki-predict";
  const WHO = {
    anya:  { name: "Аня", gen: "Ани", img: "test/img/anya.jpg",  c: "var(--rose)" },
    artur: { name: "Артур", gen: "Артура", img: "test/img/artur.jpg", c: "var(--glass)" },
    anton: { name: "Антон", gen: "Антона", img: "test/img/anton.jpg", c: "var(--gold)" },
    lika:  { name: "Лика", gen: "Лики", img: "test/img/lika.jpg",  c: "var(--violet)" },
    basya: { name: "Бася", gen: "Баси", img: "", c: "var(--ember)" }
  };
  const BASYA = `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" fill="#2a1d16"/><circle cx="32" cy="36" r="20" fill="#d98a4e"/>
    <path d="M14 20c-6 4-6 20 2 24 4-7 5-17-2-24zM50 20c6 4 6 20-2 24-4-7-5-17 2-24z" fill="#b0652f"/>
    <ellipse cx="32" cy="45" rx="11" ry="8" fill="#fff1e2"/><circle cx="32" cy="41" r="3.4" fill="#2a1a10"/>
    <circle cx="24" cy="32" r="2.6" fill="#2a1a10"/><circle cx="40" cy="32" r="2.6" fill="#2a1a10"/><circle cx="36" cy="22" r="3" fill="#fff1e2" opacity=".85"/></svg>`;

  /* день по Москве; карточка №1 выпала 15 октября 2026 */
  const DAY = 864e5, START = Date.UTC(2026, 9, 15) / DAY;
  const mskNow = () => Date.now() + 3 * 3600e3;
  const today = Math.floor(mskNow() / DAY);
  const idx = ((today - START) % N + N) % N;
  const iso = d => new Date(d * DAY).toISOString().slice(0, 10);
  const p = LIST[idx], who = WHO[p.who] || WHO.anya;

  const load = () => { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && Array.isArray(s.got)) return s; } catch (e) {} return { got: [], days: [] }; };
  const save = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} };
  let st = load();
  const openedToday = () => st.days.includes(iso(today));
  const streak = () => { let k = 0; while (st.days.includes(iso(today - k))) k++; return k; };
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c; };
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const dateRu = new Date(today * DAY).toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" });
  const ava = w => w.img ? `<img src="${base}${w.img}" alt="" loading="lazy" width="56" height="56">` : BASYA;

  box.classList.add("pd");
  box.innerHTML = `
    <div class="pd-stage">
      <div class="pd-head">
        <div class="eyebrow">Предсказание дня · ${dateRu}</div>
        <h2>Осколок на сегодня</h2>
        <p class="muted pd-lead">Каждый день один из героев оставляет тебе предсказание. Открой свой осколок и собери всю коллекцию.</p>
      </div>
      <button class="pd-card" type="button" aria-label="Открыть предсказание дня">
        <span class="pd-inner">
          <span class="pd-face pd-front">
            <svg class="pd-shard" viewBox="0 0 120 150" aria-hidden="true">
              <defs><linearGradient id="pdg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3cf"/><stop offset=".45" stop-color="#e3b65f"/><stop offset="1" stop-color="#c8923e"/></linearGradient></defs>
              <polygon points="58,4 112,46 92,146 14,122 6,40" fill="rgba(226,178,90,.12)" stroke="url(#pdg)" stroke-width="2"/>
              <path d="M58 4 52 70 14 122M52 70 112 46M52 70 92 146M52 70 6 40" fill="none" stroke="rgba(244,214,140,.45)" stroke-width="1.2"/>
            </svg>
            <span class="pd-q">?</span>
            <span class="pd-tap">Нажми, чтобы открыть</span>
          </span>
          <span class="pd-face pd-back" style="--who:${who.c}">
            <span class="pd-who"><span class="pd-ava">${ava(who)}</span><span><b>${who.name}</b><small>предсказывает</small></span></span>
            <span class="pd-text">${esc(p.t)}</span>
            <span class="pd-num">Осколок № ${idx + 1}</span>
          </span>
        </span>
      </button>
      <div class="pd-side">
        <div class="pd-after" hidden>
          <div class="pd-stats"><span><b class="pd-got"></b><small class="pd-got-l"></small></span><span><b class="pd-streak"></b><small class="pd-streak-l"></small></span></div>
          <div class="pd-next muted"></div>
          <div class="btns"><button class="btn btn-ghost pd-share" type="button">Поделиться</button></div>
          <details class="pd-coll"><summary>Мои осколки</summary><ol></ol></details>
        </div>
      </div>
    </div>`;

  const $ = s => box.querySelector(s);
  const card = $(".pd-card");

  function renderAfter() {
    $(".pd-after").hidden = false;
    const got = st.got.length, s = streak();
    $(".pd-got").textContent = got + " из " + N;
    $(".pd-got-l").textContent = plural(got, "осколок собран", "осколка собрано", "осколков собрано");
    $(".pd-streak").textContent = s;
    $(".pd-streak-l").textContent = plural(s, "день подряд", "дня подряд", "дней подряд");
    const ol = $(".pd-coll ol");
    ol.innerHTML = st.got.slice().sort((a, b) => a - b).map(i => {
      const q = LIST[i], w = WHO[q && q.who]; if (!q || !w) return "";
      return `<li style="--who:${w.c}"><span class="pd-ava sm">${ava(w)}</span><span><b>${w.name}, № ${i + 1}</b>${esc(q.t)}</span></li>`;
    }).join("");
    tick();
  }
  function tick() {
    const left = (today + 1) * DAY - mskNow();
    if (left <= 0) { $(".pd-next").textContent = "Новый осколок уже ждёт — обнови страницу."; return; }
    const h = Math.floor(left / 3600e3), m = Math.floor(left % 3600e3 / 6e4), s = Math.floor(left % 6e4 / 1e3);
    $(".pd-next").textContent = `Следующий осколок через ${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  function open(anim) {
    card.classList.add("open"); if (!anim) card.classList.add("still");
    card.setAttribute("aria-label", "Предсказание дня от героя " + who.name);
    card.setAttribute("aria-disabled", "true");
    renderAfter();
  }

  if (openedToday()) open(false);
  card.addEventListener("click", () => {
    if (card.classList.contains("open")) return;
    st = load();
    if (!st.got.includes(idx)) st.got.push(idx);
    if (!st.days.includes(iso(today))) st.days.push(iso(today));
    st.days = st.days.slice(-120);
    save(st);
    window.track && track("predict", "open", "№ " + (idx + 1) + " · " + who.name);
    open(true);
  });
  setInterval(() => { if (!$(".pd-after").hidden) tick(); }, 1000);

  $(".pd-share").addEventListener("click", async () => {
    const url = new URL(base || "./", location.href).href.split("#")[0];
    const text = `Моё предсказание дня от ${who.gen} из «Осколков первой любви»: «${p.t}»`;
    window.track && track("predict", "share", who.name);
    try {
      if (navigator.share) { await navigator.share({ text, url }); return; }
      await navigator.clipboard.writeText(text + "\n" + url);
      const b = $(".pd-share"); b.textContent = "Скопировано"; setTimeout(() => b.textContent = "Поделиться", 2000);
    } catch (e) {}
  });
})();
