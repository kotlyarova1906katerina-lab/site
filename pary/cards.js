/* Карточки для «Найди пару». src — картинка (квадратная или 3:4, лицом по центру), title — подпись, когда пара найдена.
   Пока новых карточек нет, стоят временные картинки с сайта. Новые класть в pary/img/ и менять src. */
window.PAIR_CARDS = [
  { id: "anya",   title: "Аня",                 src: "../assets/predict/anya-bg.webp" },
  { id: "artur",  title: "Артур",               src: "../assets/predict/artur-bg.webp" },
  { id: "anton",  title: "Антон",               src: "../assets/predict/anton-bg.webp" },
  { id: "lika",   title: "Лика",                src: "../assets/predict/lika-bg.webp" },
  { id: "basya",  title: "Бася",                src: "../assets/predict/basya-bg.webp" },
  { id: "tram",   title: "Осенний трамвай",     src: "../slova/bg-wide.webp" },
  { id: "rail",   title: "У поручня",           src: "../slova/bg-tall.webp" },
  { id: "class",  title: "Новенькая в классе",  src: "../igra/img/hero-tall.webp" },
  { id: "desks",  title: "Первый урок",         src: "../igra/img/hero-wide.webp" },
  { id: "anya2",  title: "Тихая Аня",           src: "../assets/anya.jpg" },
  { id: "artur2", title: "Ледяной Артур",       src: "../assets/artur.jpg" },
  { id: "serial", title: "Осколки первой любви", src: "../covers/serial.jpg" }
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
