/* Викторины по сериям. Вопросы — data/quiz.js (window.SERIAL_QUIZ).
   QUIZ.open(n) — открыть викторину серии n; QUIZ.result(n) — {best, paid} или null; QUIZ.knowPct() — «знаешь сериал на N%».
   Награда: 5 из 5 — +5 💎, 4 из 5 — +3 💎. За серию платим один раз: при улучшении 4 → 5 доплачиваем разницу. */
(function () {
  const KEY = "oskolki-quiz";
  const REWARD = s => s >= 5 ? 5 : s === 4 ? 3 : 0;
  const DATA = () => window.SERIAL_QUIZ || {};
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const save = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} };
  const listeners = [];

  const css = `.qz-ov{position:fixed;inset:0;z-index:60;display:grid;place-items:center;padding:14px;background:rgba(5,8,12,.78);backdrop-filter:blur(4px)}
.qz-box{width:min(520px,100%);max-height:100%;overflow:auto;background:linear-gradient(170deg,#1b2430,#121921);border:1px solid var(--line,#26313d);border-radius:22px;padding:20px 20px 22px;display:flex;flex-direction:column;gap:14px;color:var(--frost,#e8eef4);font-family:var(--body,system-ui)}
.qz-top{display:flex;align-items:center;gap:10px}
.qz-top .eyebrow{flex:1;margin:0}
.qz-x{appearance:none;width:38px;height:38px;border-radius:50%;border:1px solid var(--line,#26313d);background:transparent;color:inherit;font-size:20px;cursor:pointer;flex:none}
.qz-dots{display:flex;gap:6px}
.qz-dots i{flex:1;height:5px;border-radius:3px;background:rgba(185,211,230,.14)}
.qz-dots i.ok{background:#5cc27a}.qz-dots i.no{background:#e0896a}.qz-dots i.now{background:var(--gold,#e9c27a)}
.qz-q{font:400 clamp(21px,4.6vw,26px)/1.3 var(--display,Georgia);margin:4px 0 2px}
.qz-opts{display:flex;flex-direction:column;gap:9px}
.qz-opt{appearance:none;text-align:left;font:500 16px/1.35 var(--body,system-ui);color:inherit;background:rgba(185,211,230,.05);border:1px solid rgba(185,211,230,.16);border-radius:14px;padding:13px 15px;cursor:pointer;transition:border-color .15s,background .15s}
.qz-opt:hover:not([disabled]){border-color:var(--gold,#e9c27a)}
.qz-opt[disabled]{cursor:default}
.qz-opt.ok{border-color:#5cc27a;background:rgba(92,194,122,.16)}
.qz-opt.no{border-color:#e0896a;background:rgba(224,137,106,.16)}
.qz-why{margin:0;color:var(--mist,#93a3b4);font-size:15px;line-height:1.45;border-left:2px solid var(--gold,#e9c27a);padding-left:12px}
.qz-why b{color:var(--frost,#e8eef4)}
.qz-act{display:flex;gap:10px;flex-wrap:wrap}
.qz-score{font:400 54px/1 var(--display,Georgia);text-align:center;margin-top:6px}
.qz-score small{font-size:24px;color:var(--mist,#93a3b4)}
.qz-msg{text-align:center;margin:0;color:var(--mist,#93a3b4)}
.qz-gift{align-self:center;font:700 20px var(--body,system-ui);color:#e9c27a;background:rgba(233,194,122,.12);border:1px solid rgba(233,194,122,.45);border-radius:999px;padding:6px 16px}
.qz-know{text-align:center;font-size:14px;color:var(--mist,#93a3b4)}
.qz-know b{color:var(--frost,#e8eef4)}`;
  function injectCss() { if (document.getElementById("qz-css")) return; const st = document.createElement("style"); st.id = "qz-css"; st.textContent = css; document.head.appendChild(st); }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const word = n => n === 1 ? "вопрос" : n >= 2 && n <= 4 ? "вопроса" : "вопросов";

  const QUIZ = {
    has: n => !!(DATA()[n] && DATA()[n].length),
    list: () => Object.keys(DATA()).map(Number).sort((a, b) => a - b),
    result: n => load()[n] || null,
    knowPct() {
      const ns = QUIZ.list(); if (!ns.length) return 0; const s = load(); let got = 0, tot = 0;
      ns.forEach(n => { tot += DATA()[n].length; got += (s[n] && s[n].best) || 0; });
      return Math.round(100 * got / tot);
    },
    onChange(f) { listeners.push(f); },
    open
  };
  window.QUIZ = QUIZ;

  let ov = null;
  function close() { if (ov) { ov.remove(); ov = null; document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); } }
  function onKey(e) { if (e.key === "Escape") close(); }

  function open(n) {
    const Q = DATA()[n]; if (!Q) return;
    injectCss(); close();
    ov = document.createElement("div"); ov.className = "qz-ov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true");
    ov.innerHTML = `<div class="qz-box"></div>`; document.body.appendChild(ov); document.body.style.overflow = "hidden";
    ov.addEventListener("click", e => { if (e.target === ov) close(); }); document.addEventListener("keydown", onKey);
    const box = ov.querySelector(".qz-box");
    const marks = Q.map(() => ""); let i = 0, score = 0;
    window.track && track("quiz", "start", "Серия " + n);

    const head = () => `<div class="qz-top"><div class="eyebrow">Викторина · серия ${n}</div><button class="qz-x" aria-label="Закрыть">×</button></div>
      <div class="qz-dots">${marks.map((m, k) => `<i class="${m || (k === i ? "now" : "")}"></i>`).join("")}</div>`;
    const bindClose = () => box.querySelector(".qz-x").onclick = close;

    function ask() {
      const item = Q[i], opts = shuffle(item.a.map((t, k) => ({ t, ok: k === 0 })));
      box.innerHTML = head() + `<div class="qz-q">${esc(item.q)}</div><div class="qz-opts">${opts.map((o, k) => `<button class="qz-opt" data-k="${k}">${esc(o.t)}</button>`).join("")}</div>`;
      bindClose();
      box.querySelectorAll(".qz-opt").forEach(b => b.onclick = () => {
        const o = opts[+b.dataset.k]; if (o.ok) score++; marks[i] = o.ok ? "ok" : "no";
        box.querySelectorAll(".qz-opt").forEach((x, k) => { x.disabled = true; if (opts[k].ok) x.classList.add("ok"); });
        if (!o.ok) b.classList.add("no");
        box.querySelector(".qz-dots").outerHTML = `<div class="qz-dots">${marks.map((m, k) => `<i class="${m || (k === i ? "now" : "")}"></i>`).join("")}</div>`;
        const last = i === Q.length - 1;
        box.insertAdjacentHTML("beforeend", `<p class="qz-why"><b>${o.ok ? "Верно!" : "Не совсем."}</b> ${esc(item.why || "")}</p>
          <div class="qz-act"><button class="btn btn-main qz-next">${last ? "Результат" : "Дальше →"}</button></div>`);
        box.querySelector(".qz-next").onclick = () => { i++; i < Q.length ? ask() : finish(); };
        box.querySelector(".qz-next").focus({ preventScroll: true });
      });
    }

    function finish() {
      const s = load(), prev = s[n] || { best: 0, paid: 0 };
      const best = Math.max(prev.best || 0, score), owed = Math.max(0, REWARD(best) - (prev.paid || 0));
      s[n] = { best, paid: (prev.paid || 0) + owed }; save(s);
      if (owed && window.GEMS) GEMS.add(owed, "Викторина · серия " + n + " · " + score + "/" + Q.length);
      window.track && track("quiz", "finish", "Серия " + n + " · " + score + "/" + Q.length);
      listeners.forEach(f => { try { f(n); } catch (e) {} });
      const msg = score === Q.length ? "Идеально! Ты смотрела очень внимательно." : score >= Q.length - 1 ? "Почти идеально — ещё чуть-чуть!" : score >= 2 ? "Неплохо! Пересмотри серию и попробуй ещё раз." : "Кажется, пора пересмотреть серию.";
      const next = QUIZ.list().find(k => k > n);
      const gift = owed && window.GEMS ? `<div class="qz-gift">+${owed} 💎</div>` : (prev.paid && REWARD(score) ? `<p class="qz-msg">Кристаллы за эту серию уже получены.</p>` : "");
      box.innerHTML = head() + `<div class="qz-score">${score}<small> / ${Q.length}</small></div><p class="qz-msg">${msg}</p>${gift}
        ${score < 4 && !prev.paid ? `<p class="qz-msg">За 4 верных ответа — 3 💎, за все 5 — 5 💎.</p>` : ""}
        <div class="qz-know">Ты знаешь сериал на <b>${QUIZ.knowPct()}%</b></div>
        <div class="qz-act" style="justify-content:center">
          ${next ? `<button class="btn btn-main" data-go="${next}">Серия ${next} →</button>` : ""}
          <button class="btn btn-ghost" data-again>Ещё раз</button>
          <button class="btn btn-ghost" data-close>Закрыть</button>
        </div>`;
      bindClose();
      box.querySelector("[data-again]").onclick = () => open(n);
      box.querySelector("[data-close]").onclick = close;
      const g = box.querySelector("[data-go]"); if (g) g.onclick = () => { const k = +g.dataset.go; close(); if (QUIZ.onNext) QUIZ.onNext(k); else open(k); };
    }
    ask();
  }
})();
