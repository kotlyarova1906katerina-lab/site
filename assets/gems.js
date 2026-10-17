/* Общие кристаллы 💎 для всех игр сайта. Лежат в том же кошельке, что и в игре с выборами (localStorage oskolki-wallet),
   поэтому кристаллы оттуда не теряются и сохраняются в аккаунт.
   GEMS.get() — сколько есть, GEMS.add(n, why) — начислить, GEMS.spend(n) — потратить (false, если не хватает),
   GEMS.daily() — состояние ежедневного подарка, GEMS.claimDaily() — забрать его (один на все игры). */
(function () {
  const KEY = 'oskolki-wallet';
  const DAILY = [5, 5, 7, 7, 10, 10, 20];          // день 1…7 подряд, потом заново (как в игре с выборами)
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const load = () => {
    let w = null; try { w = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    return Object.assign({ id: uid(), gems: 0, streak: 0, last: '', codes: [], bought: {}, invited: 0, ref: null, regd: false, myCode: '' }, w || {});
  };
  const save = w => { try { localStorage.setItem(KEY, JSON.stringify(w)); } catch (e) {} };
  const mskDay = (t = Date.now()) => new Date(t + 3 * 36e5).toISOString().slice(0, 10);
  const dayBefore = d => mskDay(Date.parse(d + 'T00:00:00Z') - 3 * 36e5 - 1);
  const listeners = [];
  const changed = w => listeners.forEach(f => { try { f(w.gems); } catch (e) {} });

  window.GEMS = {
    DAILY,
    get: () => load().gems,
    add(n, why) {
      if (!(n > 0)) return; const w = load(); w.gems += n; save(w); changed(w);
      window.track && track('gems', 'earn', (why || 'без причины') + ' · +' + n);
    },
    spend(n) { const w = load(); if (w.gems < n) return false; w.gems -= n; save(w); changed(w); return true; },
    onChange(f) { listeners.push(f); },
    daily() {
      const w = load(), today = mskDay(), took = w.last === today, cont = w.last === dayBefore(today);
      const day = took ? w.streak : cont ? w.streak % 7 + 1 : 1;
      return { took, day, gift: DAILY[day - 1], tomorrow: DAILY[day % 7] };
    },
    claimDaily() {
      const d = this.daily(); if (d.took) return 0;
      const w = load(); w.streak = d.day; w.last = mskDay(); w.gems += d.gift; save(w); changed(w);
      window.track && track('gems', 'daily', 'День ' + d.day);
      return d.gift;
    },
    mskDay
  };
  /* окно ежедневного подарка — одно на все игры. Показывается, если сегодня подарок ещё не забран. */
  const css = `.gm-ov{position:fixed;inset:0;z-index:70;display:grid;place-items:center;padding:16px;background:rgba(5,8,12,.72);backdrop-filter:blur(4px)}
.gm-box{width:min(420px,100%);background:linear-gradient(165deg,#1f2733,#151d27);border:1px solid rgba(233,194,122,.45);border-radius:22px;padding:26px 22px;text-align:center;display:flex;flex-direction:column;gap:12px;color:var(--frost,#e8eef4);font-family:var(--body,system-ui)}
.gm-box h2{margin:0;font:400 28px var(--display,Georgia)}
.gm-box .gm-big{font:700 40px var(--body,system-ui);color:#e9c27a}
.gm-box p{margin:0;color:var(--mist,#93a3b4)}
.gm-days{display:flex;justify-content:center;gap:6px;flex-wrap:wrap}
.gm-days span{width:40px;height:46px;border-radius:10px;border:1px solid rgba(185,211,230,.16);display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:11px;color:var(--mist,#93a3b4)}
.gm-days span b{font-size:14px;color:var(--frost,#e8eef4)}
.gm-days span.on{border-color:#e9c27a;background:rgba(233,194,122,.15)}
.gm-days span.on b{color:#e9c27a}
.gm-days span.now{box-shadow:0 0 0 2px #e9c27a}
.gm-chip{display:inline-flex;align-items:center;gap:6px;font:700 20px var(--body,system-ui);font-variant-numeric:tabular-nums;color:var(--frost,#e8eef4);background:rgba(21,29,39,.78);border:1px solid rgba(233,194,122,.45);border-radius:999px;padding:6px 14px;backdrop-filter:blur(6px);cursor:pointer}
.gm-chip.bump{animation:gmbump .6s}
@keyframes gmbump{40%{transform:scale(1.18)}}
@media (prefers-reduced-motion:reduce){.gm-chip.bump{animation:none}}`;
  function injectCss() { if (document.getElementById('gm-css')) return; const st = document.createElement('style'); st.id = 'gm-css'; st.textContent = css; document.head.appendChild(st); }
  function overlay(html) {
    injectCss();
    const ov = document.createElement('div'); ov.className = 'gm-ov';
    ov.innerHTML = `<div class="gm-box" role="dialog" aria-modal="true">${html}</div>`;
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov); return ov;
  }
  const days = (d, done) => DAILY.map((g, i) => `<span class="${i + 1 < d.day || (done && i + 1 === d.day) ? 'on' : ''}${i + 1 === d.day ? ' now' : ''}"><b>+${g}</b>${i + 1} д.</span>`).join('');
  GEMS.offerDaily = function () {
    const d = GEMS.daily(); if (d.took) return;
    const ov = overlay(`<h2>Подарок дня</h2><div class="gm-big">+${d.gift} 💎</div>
      <p>${d.day > 1 ? `Ты заходишь ${d.day}-й день подряд. ` : ''}Кристаллы общие для всех игр: копи их в «Найди пару» и «Чья это фраза?», трать на подсказки и особые выборы.</p>
      <div class="gm-days">${days(d, false)}</div>
      <button class="btn btn-main" type="button">Забрать +${d.gift} 💎</button>`);
    const b = ov.querySelector('button'); b.focus();
    b.onclick = () => { GEMS.claimDaily(); ov.remove(); };
  };
  GEMS.info = function (extra) {
    const d = GEMS.daily();
    const ov = overlay(`<h2>Кристаллы</h2><div class="gm-big">${GEMS.get()} 💎</div>
      <p>Кристаллы общие для всех игр сайта. Их дарят каждый день, за быстрые уровни в «Найди пару» и за 9–10 верных ответов в «Чья это фраза?».${extra ? ' ' + extra : ''}</p>
      <div class="gm-days">${days(d, d.took)}</div>
      <p>${d.took ? `Завтра: +${d.tomorrow} 💎. Не пропускай день — иначе серия начнётся заново.` : `Сегодняшний подарок: +${d.gift} 💎.`}</p>
      <button class="btn btn-main" type="button">${d.took ? 'Понятно' : `Забрать +${d.gift} 💎`}</button>`);
    ov.querySelector('button').onclick = () => { if (!d.took) GEMS.claimDaily(); ov.remove(); };
  };
  /* значок с числом кристаллов: GEMS.chip(элемент) */
  GEMS.chip = function (el, extra) {
    injectCss(); el.classList.add('gm-chip'); el.type = 'button';
    const draw = () => { el.textContent = '💎 ' + GEMS.get(); el.setAttribute('aria-label', 'Кристаллы: ' + GEMS.get()); };
    draw(); GEMS.onChange(() => { draw(); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); });
    el.onclick = () => GEMS.info(extra);
  };
  /* кошелёк поменяли на другой вкладке */
  window.addEventListener('storage', e => { if (e.key === KEY) changed(load()); });
})();
