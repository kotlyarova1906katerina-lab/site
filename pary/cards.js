/* Карточки для «Найди пару». src — картинка (квадратная или 3:4, лицом по центру), title — подпись, когда пара найдена.
   Новые карточки лежат в pary/img/. Где src ведёт за пределы pary/img — временная картинка с сайта, её заменит новая карточка. */
window.PAIR_CARDS = [
  { id: "anya",   title: "Аня",                 src: "../assets/predict/anya-bg.webp" },
  { id: "artur",  title: "Артур",               src: "../assets/predict/artur-bg.webp" },
  { id: "anton",  title: "Антон",               src: "../assets/predict/anton-bg.webp" },
  { id: "lika",   title: "Лика в кафе",         src: "img/lika.webp" },
  { id: "basya",  title: "Бася в листьях",      src: "img/basya.webp" },
  { id: "wheel",  title: "На колесе обозрения", src: "img/wheel.webp" },
  { id: "tea",    title: "Чай с мёдом, лимоном и имбирём", src: "img/tea.webp" },
  { id: "rescue", title: "Артур спас Басю",     src: "img/artur-basya.webp" },
  { id: "cake",   title: "Торт для Артура",     src: "img/cake.webp" },
  { id: "hat",    title: "Аня в шапке Артура",  src: "img/hat.webp" },
  { id: "bear",   title: "Мишка из тира",       src: "img/bear.webp" },
  { id: "sveta",  title: "Света",               src: "img/sveta.webp" }
];

/* уровни: сколько пар, сколько колонок и за сколько секунд нужно успеть на три звезды */
window.PAIR_LEVELS = [
  { pairs: 6,  cols: 3, par: 30 },
  { pairs: 6,  cols: 3, par: 22 },
  { pairs: 8,  cols: 4, par: 45 },
  { pairs: 8,  cols: 4, par: 35 },
  { pairs: 10, cols: 4, par: 60 },
  { pairs: 10, cols: 4, par: 48 },
  { pairs: 12, cols: 4, par: 80 },
  { pairs: 12, cols: 4, par: 64 },
  { pairs: 12, cols: 4, par: 52 }
];
