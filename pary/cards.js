/* Карточки для «Найди пару». src — картинка (квадратная или 3:4, лицом по центру), title — подпись, когда пара найдена.
   Все карточки лежат в pary/img/ (600×800). Новую карточку можно добавить в конец списка. */
window.PAIR_CARDS = [
  { id: "anya",   title: "Аня у колеса обозрения", src: "img/anya.webp" },
  { id: "artur",  title: "Артур в подъезде",    src: "img/artur.webp" },
  { id: "anton",  title: "Антон у библиотеки",  src: "img/anton.webp" },
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
