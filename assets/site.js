/* Общие ссылки сайта: менять здесь */
window.SITE = {
  vkChannel: "https://vk.ru/im/channels/-236449170",
  vk: "https://vk.ru/katerina_kotlyarova",
  max: "https://web.max.ru/-76877916155998",
  tiktok: "https://www.tiktok.com/@ekaterinakotlyarova",
  telegram: "https://t.me/ek_kotlyarova",
  instagram: "https://www.instagram.com/katekotlyarovaauthor",
  preorder: "" /* ссылка на предзаказ — вставить, когда откроется */
};
window.vkEmbed = clip => {
  const m = clip.match(/^clip(-?\d+)_(\d+)$/);
  return `https://vk.com/video_ext.php?oid=${m[1]}&id=${m[2]}&hd=2`;
};
window.vkLink = clip => `https://vk.ru/${clip}`;
