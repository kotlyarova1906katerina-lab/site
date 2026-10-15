/* Аккаунт читательницы: вход по имени и паролю, прогресс игры, раскрасок и книг сохраняется в базе Supabase.
   Подключается в <head> каждой страницы. Таблицы и функции базы — tools/supabase_accounts.sql. */
(function () {
  const SB_URL = "https://svnhmstqcoshhmbscepq.supabase.co";
  const SB_KEY = "sb_publishable_q7KJgapG_K-yLw3EBZS4mg_QG_D59a-";
  const SYNC = /^(oskolki-|pos-|reader-settings$)/;              // что сохраняем в аккаунт
  const TKEY = "acct-token", NKEY = "acct-name", TSKEY = "acct-ts";
  const ROOT = ((document.currentScript && document.currentScript.src) || "").replace(/assets\/account\.js.*$/, "");
  { const v = document.createElement("script"); v.src = ROOT + "assets/visit.js?v=20261015b"; v.defer = true; document.head.appendChild(v); }   // счётчик посещений

  let ls; try { ls = window.localStorage; ls.setItem("acct-probe", "1"); ls.removeItem("acct-probe"); } catch (e) { return; }
  const rawSet = Storage.prototype.setItem, rawDel = Storage.prototype.removeItem;
  const readJ = (k, d) => { try { return JSON.parse(ls.getItem(k)) || d; } catch (e) { return d; } };
  let token = ls.getItem(TKEY), name = ls.getItem(NKEY);
  let ts = readJ(TSKEY, null);
  if (!ts) {                                                        // прогресс, сохранённый до аккаунта, считаем старым
    ts = {}; for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (SYNC.test(k)) ts[k] = 1; }
    rawSet.call(ls, TSKEY, JSON.stringify(ts));
  }
  const dirty = new Set();
  let pushT;
  function touch(k) {
    ts[k] = Date.now(); rawSet.call(ls, TSKEY, JSON.stringify(ts)); dirty.add(k);
    if (token) { clearTimeout(pushT); pushT = setTimeout(push, 2500); }
  }
  // отмечаем только настоящие изменения: страницы часто пересохраняют то же самое при загрузке
  Storage.prototype.setItem = function (k, v) {
    const track = this === ls && SYNC.test(k), old = track ? this.getItem(k) : null;
    rawSet.call(this, k, v); if (track && old !== String(v)) touch(k);
  };
  Storage.prototype.removeItem = function (k) {
    const track = this === ls && SYNC.test(k), old = track ? this.getItem(k) : null;
    rawDel.call(this, k); if (track && old !== null) touch(k);
  };

  async function rpc(fn, body, keepalive) {
    const r = await fetch(SB_URL + "/rest/v1/rpc/" + fn, { method: "POST", keepalive: !!keepalive,
      headers: { apikey: SB_KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) { let t = ""; try { const j = await r.json(); t = j.message || j.msg || j.hint || j.code || ""; } catch (e) {} throw new Error(r.status + (t ? ": " + t : "")); }
    return r.json();
  }
  function patchOf(keys) {
    const p = {}; keys.forEach(k => { p[k] = { v: ls.getItem(k), t: ts[k] || Date.now() }; }); return p;
  }
  async function push(keepalive) {
    if (!token || !dirty.size) return;
    const keys = [...dirty]; dirty.clear();
    try {
      const r = await rpc("acc_save", { p_token: token, p_patch: patchOf(keys) }, keepalive);
      if (r && r.error === "auth") signedOut();
    } catch (e) { keys.forEach(k => dirty.add(k)); }
  }
  addEventListener("pagehide", () => push(true));
  document.addEventListener("visibilitychange", () => { if (document.hidden) push(true); });

  /* забрать прогресс из аккаунта. Сразу после входа главный — аккаунт; дальше по каждому ключу побеждает более новая запись */
  async function pull(afterLogin) {
    if (!token) return;
    let r; try { r = await rpc("acc_load", { p_token: token }); } catch (e) { return; }
    if (r.error === "auth") return signedOut();
    const data = r.data || {}; let changed = false;
    Object.entries(data).forEach(([k, e]) => {
      if (!SYNC.test(k) || !e || typeof e !== "object") return;
      if (afterLogin || (ts[k] || 0) < e.t) {
        if (ls.getItem(k) !== e.v) { if (e.v == null) rawDel.call(ls, k); else rawSet.call(ls, k, e.v); changed = true; }
        ts[k] = e.t;
      }
    });
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (SYNC.test(k) && (!data[k] || (ts[k] || 0) > data[k].t)) { if (!ts[k] || ts[k] === 1) ts[k] = Date.now(); dirty.add(k); }
    }
    rawSet.call(ls, TSKEY, JSON.stringify(ts));
    await push();
    if (changed) {
      const last = +sessionStorage.getItem("acct-reload") || 0;
      if (Date.now() - last > 15000) { sessionStorage.setItem("acct-reload", Date.now()); location.reload(); return; }
    }
    if (afterLogin) toast(changed ? "Прогресс загружен" : "Прогресс сохраняется в аккаунте");
  }
  function signedIn(r) {
    token = r.token; name = r.name; rawSet.call(ls, TKEY, token); rawSet.call(ls, NKEY, name);
    renderBtn(); pull(true);
  }
  function signedOut() { token = null; name = null; rawDel.call(ls, TKEY); rawDel.call(ls, NKEY); renderBtn(); }
  if (token) pull(false);

  /* ---------- интерфейс ---------- */
  const css = `
  .acct-btn{appearance:none;display:inline-flex;align-items:center;gap:6px;flex:none;font:600 13px var(--body,system-ui,sans-serif);color:#f7e2ad;background:rgba(233,194,122,.12);border:1px solid rgba(233,194,122,.45);border-radius:999px;padding:7px 12px;cursor:pointer;white-space:nowrap;max-width:46vw}
  .acct-btn span{overflow:hidden;text-overflow:ellipsis}
  .acct-btn svg{width:16px;height:16px;flex:none}
  .acct-btn.in{color:#9be3b0;background:rgba(92,194,122,.14);border-color:rgba(92,194,122,.45)}
  @media (min-width:641px){.top .nav{flex-wrap:nowrap}.top .nav a{padding:6px 8px}.top .nav a:first-child .lbl{display:none}}
  @media (min-width:641px) and (max-width:1000px){.top .nav a .lbl{display:none}.top .nav a{padding:7px 9px}}
  @media (max-width:640px){.top .wrap,.top .top-in{position:relative}.acct-btn{position:absolute;top:8px;right:16px;padding:6px 9px}.acct-btn span{display:none}}
  .acct-modal{position:fixed;inset:0;z-index:200;display:grid;place-items:center;padding:16px;background:rgba(5,8,12,.72);backdrop-filter:blur(4px)}
  .acct-modal[hidden]{display:none}
  .acct-sheet{width:100%;max-width:400px;max-height:calc(100dvh - 32px);overflow-y:auto;background:#141b25;color:#e8eef4;border:1px solid rgba(233,194,122,.4);border-radius:22px;padding:22px 20px;display:flex;flex-direction:column;gap:12px;font:15px/1.5 var(--body,system-ui,sans-serif);position:relative}
  .acct-sheet h3{margin:0;font:400 24px var(--display,Georgia,serif);color:#f7e2ad}
  .acct-sheet p{margin:0;color:#93a3b4;font-size:14px}
  .acct-sheet label{display:flex;flex-direction:column;gap:5px;font-size:13px;color:#93a3b4}
  .acct-sheet input{font:500 16px var(--body,system-ui,sans-serif);padding:12px 13px;border-radius:12px;border:1px solid rgba(185,211,230,.16);background:#0d1219;color:#e8eef4;width:100%;box-sizing:border-box}
  .acct-sheet input:focus{outline:2px solid #e9c27a;outline-offset:1px}
  .acct-tabs{display:flex;border:1px solid rgba(185,211,230,.16);border-radius:999px;overflow:hidden}
  .acct-tabs button{flex:1;appearance:none;border:0;background:transparent;color:#93a3b4;font:600 14px var(--body,system-ui,sans-serif);padding:9px;cursor:pointer}
  .acct-tabs button[aria-pressed="true"]{background:rgba(92,194,122,.16);color:#9be3b0}
  .acct-go{appearance:none;border:0;border-radius:14px;padding:14px;font:600 16px var(--body,system-ui,sans-serif);cursor:pointer;background:linear-gradient(180deg,#f3d58f,#d9a54c);color:#2a1a05}
  .acct-go:disabled{opacity:.6;cursor:default}
  .acct-ghost{appearance:none;border:1px solid rgba(185,211,230,.16);border-radius:14px;padding:12px;font:600 15px var(--body,system-ui,sans-serif);cursor:pointer;background:transparent;color:#e8eef4}
  .acct-link{appearance:none;border:0;background:none;color:#93a3b4;font:14px var(--body,system-ui,sans-serif);text-decoration:underline;cursor:pointer;padding:2px;align-self:center}
  .acct-err{color:#f08a7a;font-size:14px;min-height:1.2em}
  .acct-sheet label.acct-ok{flex-direction:row;align-items:flex-start;gap:10px;font-size:13px;line-height:1.45;cursor:pointer}
  .acct-sheet label.acct-ok input{width:20px;height:20px;flex:none;margin:1px 0 0;accent-color:#5cc27a}
  .acct-sheet label.acct-ok a{color:#b9d3e6}
  .acct-code{font:600 26px/1.2 ui-monospace,Menlo,monospace;letter-spacing:.12em;text-align:center;color:#f7e2ad;background:#0d1219;border:1px dashed rgba(233,194,122,.5);border-radius:14px;padding:14px}
  .acct-x{position:absolute;top:10px;right:12px;appearance:none;border:0;background:none;color:#93a3b4;font-size:22px;cursor:pointer;line-height:1}
  .acct-toast{position:fixed;left:50%;bottom:calc(22px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:210;background:rgba(10,14,20,.92);border:1px solid rgba(92,194,122,.5);color:#9be3b0;padding:10px 16px;border-radius:999px;font:600 14px var(--body,system-ui,sans-serif);opacity:0;transition:opacity .3s;pointer-events:none}
  .acct-toast.on{opacity:1}`;
  const ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.8 4-5.6 7.5-5.6s6.3 1.8 7.5 5.6"/></svg>`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let btn, modal, sheet, toastEl, toastT;

  function toast(t) {
    if (!toastEl) return;
    toastEl.textContent = t; toastEl.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("on"), 2600);
  }
  function renderBtn() {
    if (!btn) return;
    btn.classList.toggle("in", !!token);
    btn.innerHTML = ICON + `<span>${token ? esc(name || "Аккаунт") : "Войти"}</span>`;
    btn.setAttribute("aria-label", token ? "Аккаунт: " + (name || "") : "Войти или зарегистрироваться");
  }
  const close = () => { modal.hidden = true; };
  function open(view) { modal.hidden = false; (view || (token ? viewMe : viewAuth))(); }

  const ERR = { bad_login: "Имя: от 3 до 20 букв или цифр, можно _ . -", short_password: "Пароль — минимум 6 символов", taken: "Это имя уже занято, выбери другое",
    wrong: "Неверное имя, пароль или код", locked: "Слишком много попыток. Попробуй через 15 минут", too_many: "Слишком много регистраций с этого адреса. Попробуй позже" };

  function viewAuth(tab) {
    tab = tab || "login";
    const reg = tab === "reg";
    sheet.innerHTML = `<button class="acct-x" aria-label="Закрыть">×</button>
      <h3>${reg ? "Регистрация" : "Вход"}</h3>
      <p>Игра, кристаллы, наряды, раскраски и место в книгах сохранятся, и их можно продолжить с любого телефона или компьютера.</p>
      <div class="acct-tabs"><button data-t="login" aria-pressed="${!reg}">Вход</button><button data-t="reg" aria-pressed="${reg}">Регистрация</button></div>
      <label>Имя<input id="aLogin" autocomplete="username" maxlength="20" autocapitalize="off" spellcheck="false"></label>
      <label>Пароль<input id="aPass" type="password" autocomplete="${reg ? "new-password" : "current-password"}"></label>
      ${reg ? `<label>Пароль ещё раз<input id="aPass2" type="password" autocomplete="new-password"></label><p>Почта не нужна. После регистрации дам код восстановления — сохрани его, без него забытый пароль не вернуть.</p>
      <label class="acct-ok"><input type="checkbox" id="aAgree"><span>Я принимаю <a href="${ROOT}privacy/" target="_blank" rel="noopener">политику конфиденциальности</a> и согласна на хранение данных аккаунта</span></label>` : ""}
      <div class="acct-err" id="aErr"></div>
      <button class="acct-go" id="aGo">${reg ? "Зарегистрироваться" : "Войти"}</button>
      ${reg ? "" : `<button class="acct-link" id="aForgot">Забыла пароль</button>`}`;
    sheet.querySelector(".acct-x").onclick = close;
    sheet.querySelectorAll(".acct-tabs button").forEach(b => b.onclick = () => viewAuth(b.dataset.t));
    if (!reg) sheet.querySelector("#aForgot").onclick = viewReset;
    const go = sheet.querySelector("#aGo"), err = sheet.querySelector("#aErr");
    const submit = async () => {
      const L = sheet.querySelector("#aLogin").value.trim(), P = sheet.querySelector("#aPass").value;
      if (reg && P !== sheet.querySelector("#aPass2").value) { err.textContent = "Пароли не совпадают"; return; }
      if (reg && !sheet.querySelector("#aAgree").checked) { err.textContent = "Отметь согласие с политикой конфиденциальности"; return; }
      go.disabled = true; err.textContent = "";
      try {
        const r = await rpc(reg ? "acc_register" : "acc_login", { p_login: L, p_password: P });
        if (r.error) { err.textContent = ERR[r.error] || "Не получилось, попробуй ещё раз"; go.disabled = false; return; }
        if (reg) viewCode(r, true); else { close(); signedIn(r); }
      } catch (e) { err.textContent = "Нет связи с сервером. Попробуй позже." + (e && e.message ? " (" + e.message + ")" : ""); go.disabled = false; }
    };
    go.onclick = submit;
    sheet.querySelectorAll("input").forEach(i => i.addEventListener("keydown", e => { if (e.key === "Enter") submit(); }));
    setTimeout(() => sheet.querySelector("#aLogin").focus(), 30);
  }
  function viewCode(r, first) {
    sheet.innerHTML = `<h3>${first ? "Готово!" : "Новый код"}</h3>
      <p>${first ? "Ты зарегистрирована как <b style='color:#e8eef4'>" + esc(r.name) + "</b>. " : ""}Это код восстановления пароля. Сохрани его: сделай скриншот или запиши. Больше он не покажется.</p>
      <div class="acct-code">${esc(r.recovery)}</div>
      <button class="acct-ghost" id="aCopy">Скопировать код</button>
      <button class="acct-go" id="aOk">Я сохранила код</button>`;
    sheet.querySelector("#aCopy").onclick = async () => { try { await navigator.clipboard.writeText(r.recovery); toast("Код скопирован"); } catch (e) {} };
    sheet.querySelector("#aOk").onclick = () => { close(); signedIn(r); };
  }
  function viewReset() {
    sheet.innerHTML = `<button class="acct-x" aria-label="Закрыть">×</button><h3>Новый пароль</h3>
      <p>Введи имя, код восстановления, который получила при регистрации, и новый пароль.</p>
      <label>Имя<input id="rLogin" autocomplete="username" autocapitalize="off" spellcheck="false"></label>
      <label>Код восстановления<input id="rCode" placeholder="XXXX-XXXX" autocapitalize="characters" spellcheck="false"></label>
      <label>Новый пароль<input id="rPass" type="password" autocomplete="new-password"></label>
      <div class="acct-err" id="rErr"></div>
      <button class="acct-go" id="rGo">Сменить пароль</button>
      <button class="acct-link" id="rBack">Назад ко входу</button>`;
    sheet.querySelector(".acct-x").onclick = close;
    sheet.querySelector("#rBack").onclick = () => viewAuth("login");
    const go = sheet.querySelector("#rGo"), err = sheet.querySelector("#rErr");
    go.onclick = async () => {
      go.disabled = true; err.textContent = "";
      try {
        const r = await rpc("acc_reset", { p_login: sheet.querySelector("#rLogin").value.trim(), p_code: sheet.querySelector("#rCode").value.trim(), p_password: sheet.querySelector("#rPass").value });
        if (r.error) { err.textContent = ERR[r.error] || "Не получилось"; go.disabled = false; return; }
        viewCode(r, false);
      } catch (e) { err.textContent = "Нет связи с сервером. Попробуй позже." + (e && e.message ? " (" + e.message + ")" : ""); go.disabled = false; }
    };
  }
  function viewMe() {
    sheet.innerHTML = `<button class="acct-x" aria-label="Закрыть">×</button><h3>${esc(name || "Аккаунт")}</h3>
      <p>Ты вошла в аккаунт. Прогресс игры, кристаллы, наряды, раскраски и место в книгах сохраняются автоматически. Чтобы продолжить на другом устройстве, войди там с тем же именем и паролем.</p>
      <button class="acct-ghost" id="mSync">Синхронизировать сейчас</button>
      <button class="acct-ghost" id="mOut">Выйти из аккаунта</button>`;
    sheet.querySelector(".acct-x").onclick = close;
    sheet.querySelector("#mSync").onclick = async () => { close(); await pull(true); };
    sheet.querySelector("#mOut").onclick = async () => { await push(); try { await rpc("acc_logout", { p_token: token }); } catch (e) {} signedOut(); close(); toast("Ты вышла из аккаунта"); };
  }

  function mount() {
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    const host = document.querySelector(".top .wrap, .top .top-in");
    btn = document.createElement("button"); btn.type = "button"; btn.className = "acct-btn"; btn.onclick = () => open();
    if (host) host.appendChild(btn);
    renderBtn();
    modal = document.createElement("div"); modal.className = "acct-modal"; modal.hidden = true;
    modal.innerHTML = `<div class="acct-sheet" role="dialog" aria-modal="true"></div>`;
    sheet = modal.firstChild; document.body.appendChild(modal);
    modal.addEventListener("click", e => { if (e.target === modal) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !modal.hidden) close(); });
    toastEl = document.createElement("div"); toastEl.className = "acct-toast"; document.body.appendChild(toastEl);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();

  window.ACCOUNT = { open: () => open(), get name() { return token ? name : null; } };
})();
