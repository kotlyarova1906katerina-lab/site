/* Общие ссылки сайта: менять здесь */
window.SITE = {
  vkChannel: "https://vk.ru/im/channels/-236449170",
  vk: "https://vk.ru/katerina_kotlyarova",
  max: "https://web.max.ru/-76877916155998",
  tiktok: "https://www.tiktok.com/@ekaterinakotlyarova",
  telegram: "https://t.me/ek_kotlyarova",
  instagram: "https://www.instagram.com/katekotlyarovaauthor",
  litnet: "https://litnet.com/ru/ekaterina-kotlyarova-u3917137",
  preorder: "", /* ссылка на предзаказ — вставить, когда откроется */
  /* База для счётчика «Жду книгу» (Supabase, проект oskolki). Ключ publishable — открытый, так и задумано. */
  supabase: { url: "https://svnhmstqcoshhmbscepq.supabase.co", key: "sb_publishable_q7KJgapG_K-yLw3EBZS4mg_QG_D59a-" }
};
window.vkEmbed = clip => {
  const m = clip.match(/^clip(-?\d+)_(\d+)$/);
  return `https://vk.com/video_ext.php?oid=${m[1]}&id=${m[2]}&hd=2`;
};
window.vkLink = clip => `https://vk.ru/${clip}`;

/* Плеер серии: сначала показываем обложку целиком (своя у серии — covers/N.jpg, иначе общая covers/serial.jpg),
   по нажатию запускаем видео ВК. */
window.renderEpisode = (box, e, base = "") => {
  const frame = auto => `<iframe src="${vkEmbed(e.clip)}${auto ? "&autoplay=1" : ""}" title="Серия ${e.n}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock" allowfullscreen></iframe>`;
  const cover = e.cover || "covers/serial.jpg";
  box.innerHTML = `<button class="poster" aria-label="Смотреть серию ${e.n}">
      <img src="${base}${cover}" alt="Обложка серии ${e.n}" loading="lazy">
      <span class="poster-play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg></span>
    </button>`;
  box.querySelector(".poster").onclick = () => { box.innerHTML = frame(true); };
};
