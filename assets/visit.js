/* Счётчик посещений: случайный номер устройства, страница и источник уходят в базу (tools/supabase_visits.sql).
   Никаких личных данных. Подключается из assets/account.js, то есть на каждой странице.
   Заходы автора не считаются: после открытия страницы статистики на этом устройстве ставится отметка «не считать». */
(function () {
  try {
    const SB = "https://svnhmstqcoshhmbscepq.supabase.co", KEY = "sb_publishable_q7KJgapG_K-yLw3EBZS4mg_QG_D59a-";
    const off = navigator.webdriver || localStorage.getItem("visit-skip") === "1";
    if (off) { window.track = function () {}; window.__tq = []; return; }
    let id = localStorage.getItem("visitor-id");
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2))).toLowerCase();
      localStorage.setItem("visitor-id", id);
    }
    const me = document.currentScript && document.currentScript.src;
    const basePath = me ? new URL(me.replace(/assets\/visit\.js.*$/, "")).pathname : "/";
    let path = location.pathname.startsWith(basePath) ? location.pathname.slice(basePath.length) : location.pathname;
    path = path.replace(/index\.html$/, "") || "/";
    if (path.startsWith("stats")) return;
    const post = (fn, body) => fetch(SB + "/rest/v1/rpc/" + fn, { method: "POST", keepalive: true,
      headers: { apikey: KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});

    // действия на сайте: track(раздел, действие, подробность)
    window.track = (section, action, detail) => post("event_log",
      { p_visitor: id, p_section: String(section), p_action: String(action), p_detail: detail == null ? null : String(detail).slice(0, 80) });
    (window.__tq || []).forEach(a => window.track.apply(null, a)); window.__tq = [];

    // откуда пришли: метка ?utm_source=… в ссылке или сайт, с которого перешли
    const NAMES = [[/^vk$|(^|\.)(vk\.(com|ru|cc|me)|vkvideo\.ru)$/, "ВКонтакте"], [/tiktok/, "TikTok"], [/^tg$|(^|\.)(t\.me|telegram)/, "Telegram"],
      [/instagram|(^|\.)l\.instagram/, "Instagram"], [/^max$|max\.ru$/, "MAX"], [/youtube|youtu\.be/, "YouTube"], [/yandex|ya\.ru|dzen/, "Яндекс"],
      [/google/, "Google"], [/litnet/, "Литнет"], [/claude\.ai/, "Ссылка из Claude"]];
    const tag = new URLSearchParams(location.search).get("utm_source");
    let src = "";
    if (tag) src = tag;
    else if (document.referrer) {
      const host = new URL(document.referrer).hostname;
      if (host !== location.hostname) src = host;
    }
    if (src) { const hit = NAMES.find(([re]) => re.test(src.toLowerCase())); if (hit) src = hit[1]; }

    post("visit_log", { p_visitor: id, p_path: path.slice(0, 120), p_src: src.slice(0, 40) });

    // переходы с сайта: ВКонтакте, Telegram, Литнет…
    document.addEventListener("click", e => {
      const a = e.target.closest && e.target.closest("a[href]"); if (!a) return;
      let host; try { host = new URL(a.href, location.href).hostname; } catch (er) { return; }
      if (!host || host === location.hostname) return;
      const hit = NAMES.find(([re]) => re.test(host.toLowerCase()));
      window.track("link", "click", hit ? hit[1] : host);
    }, true);
  } catch (e) {}
})();
