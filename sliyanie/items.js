/* Предметы для игры «Тёплая осень» (слияние). Две одинаковые вещи одного уровня сливаются в вещь следующего уровня.
   Картинки нарисованы прямо здесь, в SVG (viewBox 0 0 100 100), поэтому ничего не нужно грузить.
   CHAINS[id].items[i] — уровень i + 1: { name, svg }. Генераторы выдают вещи первого уровня. */
(function () {
  const S = "stroke-linecap=\"round\" stroke-linejoin=\"round\"";
  const steam = (x, y) => `<g fill="none" stroke="#f4efe6" stroke-width="3.2" ${S} opacity=".75"><path d="M${x} ${y}c-5-6 5-9 0-16"/><path d="M${x + 11} ${y + 2}c-5-6 5-9 0-16"/></g>`;
  const shine = (d) => `<path d="${d}" fill="none" stroke="#fff" stroke-width="3" ${S} opacity=".45"/>`;
  const heart = (x, y, s, c = "#e0896a") => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 6C-6-1-14 3-10 10L0 19 10 10C14 3 6-1 0 6Z" fill="${c}"/>`;
  const spark = (x, y, s = 1) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0-7 1.8-1.8 7 0 1.8 1.8 0 7-1.8 1.8-7 0-1.8-1.8Z" fill="#f3d791"/>`;

  /* чашка чая на блюдце: x — сдвиг, k — масштаб */
  const teaCup = (fill = "#c8792c") => `
    <ellipse cx="50" cy="80" rx="34" ry="8" fill="#d9e2ea"/><ellipse cx="50" cy="78" rx="22" ry="4.5" fill="#b9c6d2"/>
    <path d="M76 52c10 0 12 14 0 16" fill="none" stroke="#f4efe6" stroke-width="6" ${S}/>
    <path d="M22 46h56c0 18-10 32-28 32S22 64 22 46Z" fill="#f4efe6"/>
    <ellipse cx="50" cy="46" rx="28" ry="6.5" fill="${fill}"/><ellipse cx="44" cy="45" rx="10" ry="2" fill="#fff" opacity=".25"/>
    <path d="M30 60c3 8 8 12 14 13" fill="none" stroke="#e9dcc8" stroke-width="3" ${S}/>`;
  const mug = (top) => `
    <path d="M70 44c14 0 14 22 0 22" fill="none" stroke="#c9644a" stroke-width="7" ${S}/>
    <path d="M26 38h46v34c0 8-6 12-14 12H40c-8 0-14-4-14-12Z" fill="#e0896a"/>
    <path d="M32 46v24" stroke="#fff" stroke-width="3" opacity=".35" ${S}/>
    ${heart(49, 58, .7, "#f4efe6")}
    <ellipse cx="49" cy="38" rx="23" ry="6" fill="#6b3f2a"/>${top || ""}`;
  const bow = (x, y, k, c = "#fbf3ee", line = "#e7a9b6") => `<g transform="translate(${x} ${y}) scale(${k})">
    <path d="M-3 4-14 26l8-2 4 7 6-24" fill="${c}" stroke="${line}" stroke-width="2.4" ${S}/>
    <path d="M3 4 14 26l-8-2-4 7-6-24" fill="${c}" stroke="${line}" stroke-width="2.4" ${S}/>
    <path d="M0 0C-10-14-28-12-26 0s18 10 26 0Z" fill="${c}" stroke="${line}" stroke-width="2.4" ${S}/>
    <path d="M0 0C10-14 28-12 26 0S8 10 0 0Z" fill="${c}" stroke="${line}" stroke-width="2.4" ${S}/>
    <path d="M-17-3c4-3 8-2 11 1M17-3c-4-3-8-2-11 1" fill="none" stroke="${line}" stroke-width="2" ${S} opacity=".8"/>
    <rect x="-6" y="-6" width="12" height="12" rx="4" fill="${c}" stroke="${line}" stroke-width="2.4"/></g>`;
  const beanie = (c = "#c0392b", cuff = "#a93226", y = 0) => `<g transform="translate(0 ${y})">
    <path d="M18 66C18 34 32 22 50 22s32 12 32 44Z" fill="${c}"/>
    <path d="M36 30c-6 8-9 20-9 34M50 24v40M64 30c6 8 9 20 9 34" fill="none" stroke="#000" stroke-width="2.4" opacity=".14" ${S}/>
    <path d="M30 34c4-5 9-8 15-9" fill="none" stroke="#fff" stroke-width="3" opacity=".3" ${S}/>
    <rect x="14" y="60" width="72" height="18" rx="7" fill="${cuff}"/>
    <path d="M24 63v12M32 63v12M40 63v12M48 63v12M56 63v12M64 63v12M72 63v12" stroke="#000" stroke-width="2.4" opacity=".16" ${S}/></g>`;
  const jacket = (body, dark, zip = "#c9ced6") => `
    <path d="M36 16 18 26 10 74l14 4 4-30v40h44V48l4 30 14-4-8-48-18-10Z" fill="${body}"/>
    <path d="M36 16l14 18 14-18-6-2-8 9-8-9Z" fill="${dark}"/>
    <path d="M36 16l-6 22 12 4-4 8 12 16 12-16-4-8 12-4-6-22-14 18Z" fill="${dark}" opacity=".85"/>
    <path d="M50 34v54" stroke="${zip}" stroke-width="3" ${S}/>
    <path d="M28 48v40M72 48v40" stroke="#000" stroke-width="2" opacity=".2"/>
    <path d="M20 32l-6 38" stroke="#fff" stroke-width="3" opacity=".2" ${S}/>`;

  const CHAINS = {
    tea: { title: "Чай", gen: "kitchen", items: [
      { name: "Чайный листик", svg: `<path d="M50 12C80 24 84 60 50 88 18 62 22 26 50 12Z" fill="#7fb069"/><path d="M50 22v58M50 40l-12-8M50 52l14-10M50 64l-12-8" fill="none" stroke="#4f7d3f" stroke-width="3" ${S}/>${shine("M38 30c-6 8-8 18-6 28")}` },
      { name: "Чайный пакетик", svg: `<path d="M52 12v22" stroke="#e9dcc8" stroke-width="2.4"/><rect x="60" y="8" width="24" height="18" rx="3" fill="#e0896a"/>${heart(72, 11, .45, "#fff")}<path d="M30 34h44l-4 50H34Z" fill="#e9d8b4"/><path d="M30 34h44l-6 8H36Z" fill="#d5c094"/><path d="M40 52c6 4 16 4 22 0M40 64c6 4 16 4 22 0" fill="none" stroke="#b08a52" stroke-width="2.4" ${S} opacity=".7"/><path d="M52 34v-6" stroke="#e9dcc8" stroke-width="2.4"/>` },
      { name: "Чашка чая", svg: `${teaCup()}${steam(42, 30)}` },
      { name: "Чайник", svg: `<path d="M76 46c10-6 14-14 14-20" fill="none" stroke="#7aa6cf" stroke-width="8" ${S}/><path d="M26 50c-12-4-14 22 0 18" fill="none" stroke="#7aa6cf" stroke-width="6" ${S}/><path d="M22 54c0-18 12-28 28-28s28 10 28 28-10 30-28 30S22 72 22 54Z" fill="#8fb8de"/><ellipse cx="50" cy="28" rx="18" ry="5" fill="#7aa6cf"/><circle cx="50" cy="20" r="5" fill="#e9c27a"/><ellipse cx="50" cy="84" rx="22" ry="3.5" fill="#6b8fb2"/>${heart(50, 50, .8, "#fbf3ee")}${shine("M30 50c0-8 4-14 10-17")}` },
      { name: "Чай с лимоном и печеньем", svg: `${teaCup("#d9a64c")}<circle cx="68" cy="34" r="13" fill="#f3d36b"/><circle cx="68" cy="34" r="10" fill="#f7e59a"/><path d="M68 24v20M58 34h20M61 27l14 14M75 27 61 41" stroke="#e8c74f" stroke-width="1.6"/><circle cx="24" cy="72" r="12" fill="#d29a5a"/><circle cx="20" cy="69" r="2" fill="#6b3f2a"/><circle cx="27" cy="74" r="2" fill="#6b3f2a"/><circle cx="25" cy="66" r="1.6" fill="#6b3f2a"/>${spark(84, 14, .9)}` }
    ] },
    cocoa: { title: "Какао", gen: "kitchen", items: [
      { name: "Какао-боб", svg: `<ellipse cx="50" cy="52" rx="24" ry="32" transform="rotate(-18 50 52)" fill="#8a5a3b"/><path d="M44 24c-8 18-6 40 12 58" fill="none" stroke="#5e3a24" stroke-width="3.2" ${S}/>${shine("M36 34c-4 8-4 18 0 26")}` },
      { name: "Шоколадка", svg: `<g transform="rotate(-12 50 50)"><rect x="24" y="14" width="52" height="72" rx="5" fill="#6b3f2a"/><path d="M41 14v38M59 14v38M24 27h52M24 40h52" stroke="#4e2c1c" stroke-width="2.4"/><path d="M24 52h52v34H24Z" fill="#d1495b"/><path d="M24 52l8-5 8 5 8-5 8 5 8-5 8 5 4-3v6H24Z" fill="#b83b4c"/><rect x="34" y="62" width="32" height="12" rx="3" fill="#f3d791"/></g>` },
      { name: "Кружка какао", svg: `${mug()}${steam(42, 26)}` },
      { name: "Какао с маршмеллоу", svg: mug(`<rect x="34" y="28" width="12" height="11" rx="3" fill="#fbf3ee" transform="rotate(-14 40 33)"/><rect x="48" y="30" width="12" height="11" rx="3" fill="#f7c6d0" transform="rotate(10 54 35)"/><rect x="56" y="26" width="11" height="10" rx="3" fill="#fbf3ee" transform="rotate(24 61 31)"/><rect x="40" y="21" width="11" height="10" rx="3" fill="#f7c6d0" transform="rotate(-4 45 26)"/>`) },
      { name: "Какао на двоих", svg: `<g transform="rotate(-8 30 56)"><path d="M14 36h32l-5 48H19Z" fill="#f4efe6"/><rect x="11" y="28" width="38" height="9" rx="3" fill="#6b3f2a"/><path d="M16 52h29l-1.5 14H17.5Z" fill="#e0896a"/></g><g transform="rotate(8 70 56)"><path d="M54 36h32l-5 48H59Z" fill="#f4efe6"/><rect x="51" y="28" width="38" height="9" rx="3" fill="#6b3f2a"/><path d="M56 52h29l-1.5 14H57.5Z" fill="#8fb8de"/></g>${heart(50, 10, .9, "#e0896a")}${spark(18, 14, .8)}` }
    ] },
    dog: { title: "Для Баси", gen: "kitchen", items: [
      { name: "Горсть корма", svg: `<g fill="#b0652f"><circle cx="36" cy="58" r="10"/><circle cx="58" cy="50" r="10"/><circle cx="52" cy="70" r="10"/><circle cx="70" cy="68" r="9"/></g><g fill="#d98a4e"><circle cx="33" cy="55" r="3"/><circle cx="55" cy="47" r="3"/><circle cx="49" cy="67" r="3"/><circle cx="67" cy="65" r="3"/></g><path d="M36 58h.1M58 50h.1M52 70h.1M70 68h.1" stroke="#7a4220" stroke-width="5" ${S}/>` },
      { name: "Косточка", svg: `<g transform="rotate(-30 50 50)"><rect x="26" y="42" width="48" height="16" rx="6" fill="#f4efe6"/><circle cx="24" cy="40" r="10" fill="#f4efe6"/><circle cx="24" cy="60" r="10" fill="#f4efe6"/><circle cx="76" cy="40" r="10" fill="#f4efe6"/><circle cx="76" cy="60" r="10" fill="#f4efe6"/><path d="M30 46h40" stroke="#d9cdb8" stroke-width="3" ${S}/></g>` },
      { name: "Миска с кормом", svg: `<ellipse cx="50" cy="52" rx="32" ry="10" fill="#7a4220"/><g fill="#b0652f"><circle cx="36" cy="48" r="7"/><circle cx="50" cy="44" r="7"/><circle cx="64" cy="48" r="7"/><circle cx="44" cy="52" r="6"/><circle cx="58" cy="52" r="6"/></g><path d="M16 54h68l-8 26H24Z" fill="#e0896a"/><path d="M16 54h68" stroke="#c9644a" stroke-width="5" ${S}/><path d="M24 62l3 12" stroke="#fff" stroke-width="3" opacity=".35" ${S}/><g fill="#fbf3ee" opacity=".9"><circle cx="50" cy="68" r="3.4"/><circle cx="44" cy="63" r="2"/><circle cx="48" cy="61" r="2"/><circle cx="53" cy="61" r="2"/><circle cx="57" cy="63" r="2"/></g>` },
      { name: "Пакет корма", svg: `<path d="M26 22h48l4 64H22Z" fill="#7fb069"/><path d="M26 22h48l-2 8H28Z" fill="#5f8f4c"/><path d="M30 14h40v10H30Z" fill="#5f8f4c"/><path d="M30 14l5 4 5-4 5 4 5-4 5 4 5-4 5 4 5-4" fill="none" stroke="#4f7d3f" stroke-width="2"/><circle cx="50" cy="58" r="16" fill="#fbf3ee"/><g fill="#b0652f"><ellipse cx="50" cy="63" rx="6" ry="5"/><circle cx="42" cy="55" r="3"/><circle cx="47" cy="51" r="3"/><circle cx="53" cy="51" r="3"/><circle cx="58" cy="55" r="3"/></g>${shine("M30 34l-2 40")}` },
      { name: "Бася", svg: `<path d="M26 30C14 30 12 58 22 64 26 52 30 40 34 34Z" fill="#b0652f"/><path d="M74 30c12 0 14 28 4 34-4-12-8-24-12-30Z" fill="#b0652f"/><ellipse cx="50" cy="52" rx="26" ry="28" fill="#d98a4e"/><path d="M50 30c-6 0-8 14-8 22h16c0-8-2-22-8-22Z" fill="#fff1e2" opacity=".9"/><ellipse cx="50" cy="66" rx="16" ry="12" fill="#fff1e2"/><circle cx="40" cy="50" r="4.4" fill="#2a1a10"/><circle cx="60" cy="50" r="4.4" fill="#2a1a10"/><circle cx="41.5" cy="48.5" r="1.4" fill="#fff"/><circle cx="61.5" cy="48.5" r="1.4" fill="#fff"/><ellipse cx="50" cy="60" rx="6" ry="4.4" fill="#2a1a10"/><path d="M50 64v4M44 68c3 3 9 3 12 0" fill="none" stroke="#2a1a10" stroke-width="2.4" ${S}/><path d="M47 70c0 7 6 7 6 0" fill="#e86b7a"/><path d="M30 80c10 6 30 6 40 0" fill="none" stroke="#e0896a" stroke-width="5" ${S}/>${heart(50, 80, .55, "#e9c27a")}` }
    ] },
    bow: { title: "Бантики", gen: "wardrobe", items: [
      { name: "Катушка ленты", svg: `<rect x="30" y="20" width="40" height="10" rx="4" fill="#c98e5a"/><rect x="30" y="70" width="40" height="10" rx="4" fill="#c98e5a"/><rect x="34" y="30" width="32" height="40" fill="#f7c6d0"/><path d="M34 38h32M34 46h32M34 54h32M34 62h32" stroke="#e7a9b6" stroke-width="2"/><path d="M66 60c10 2 14 10 12 20" fill="none" stroke="#f7c6d0" stroke-width="7" ${S}/>` },
      { name: "Ленточка", svg: `<path d="M18 70c10-30 26-30 32-10s22 20 32-10" fill="none" stroke="#e7a9b6" stroke-width="15" ${S}/><path d="M18 70c10-30 26-30 32-10s22 20 32-10" fill="none" stroke="#f7c6d0" stroke-width="10" ${S}/><path d="M22 62c6-14 14-18 20-12" fill="none" stroke="#fff" stroke-width="2.4" opacity=".6" ${S}/>` },
      { name: "Бантик", svg: bow(50, 46, 1.35) },
      { name: "Заколка с бантиком", svg: `<rect x="14" y="62" width="72" height="10" rx="5" fill="#e9c27a"/><path d="M20 67h60" stroke="#c8923e" stroke-width="2"/>${bow(50, 44, 1.2, "#f7c6d0", "#d98597")}` },
      { name: "Три бантика, как у Ани", svg: `<path d="M50 6c-14 20-18 60-6 90" fill="none" stroke="#4a2c22" stroke-width="16" ${S}/><path d="M48 10c-10 22-12 56-2 82" fill="none" stroke="#6b4033" stroke-width="3" opacity=".7" ${S}/>${bow(46, 22, .72)}${bow(42, 50, .72)}${bow(44, 78, .72)}${spark(80, 20)}` }
    ] },
    hat: { title: "Шапка", gen: "wardrobe", items: [
      { name: "Клубок шерсти", svg: `<path d="M74 66c10 4 14 12 10 18" fill="none" stroke="#c0392b" stroke-width="4" ${S}/><circle cx="48" cy="52" r="30" fill="#c0392b"/><path d="M24 40c16 6 32 20 38 38M30 30c18 4 34 18 42 36M40 24c14 4 26 14 32 26M22 56c12 2 22 10 28 22" fill="none" stroke="#e05a4b" stroke-width="3" ${S}/><path d="M26 64c10-14 24-26 44-30" fill="none" stroke="#962d22" stroke-width="3" ${S}/>` },
      { name: "Вязание на спицах", svg: `<path d="M14 26 86 34M16 20 84 42" stroke="#c98e5a" stroke-width="4" ${S}/><circle cx="14" cy="26" r="4" fill="#e9c27a"/><circle cx="16" cy="20" r="4" fill="#e9c27a"/><path d="M26 32h50l-4 46H30Z" fill="#c0392b"/><g fill="none" stroke="#962d22" stroke-width="2.4" ${S}><path d="M32 42l4 5 4-5 4 5 4-5 4 5 4-5 4 5 4-5 4 5 4-5"/><path d="M32 54l4 5 4-5 4 5 4-5 4 5 4-5 4 5 4-5 4 5 4-5"/><path d="M33 66l4 5 4-5 4 5 4-5 4 5 4-5 4 5 4-5 4 5"/></g>` },
      { name: "Шапка", svg: beanie() },
      { name: "Шапка с помпоном", svg: `${beanie("#c0392b", "#a93226", 6)}<circle cx="50" cy="22" r="13" fill="#fbf3ee"/><path d="M42 18l4 3M50 14v4M57 18l-3 3M44 28l3-2M56 28l-3-2" stroke="#d9cdb8" stroke-width="2" ${S}/>` },
      { name: "Шапка и шарф", svg: `<g transform="translate(14 -6) scale(.72)">${beanie()}<circle cx="50" cy="22" r="13" fill="#fbf3ee"/></g><path d="M12 66c20 8 56 8 76 0v12c-20 8-56 8-76 0Z" fill="#8fb8de"/><path d="M24 74l-6 22 12 0 4-20Z" fill="#7aa6cf"/><path d="M18 96v4M22 96v4M26 96v4M30 96v4" stroke="#7aa6cf" stroke-width="2.4"/><path d="M30 70v10M42 72v10M54 72v10M66 71v10M78 68v10" stroke="#fff" stroke-width="2.4" opacity=".35"/>${spark(82, 18)}` }
    ] },
    jacket: { title: "Куртка Артура", gen: "wardrobe", items: [
      { name: "Пуговица", svg: `<circle cx="50" cy="50" r="30" fill="#5b6470"/><circle cx="50" cy="50" r="24" fill="#6f7a87"/><circle cx="42" cy="42" r="4.4" fill="#2b2f36"/><circle cx="58" cy="42" r="4.4" fill="#2b2f36"/><circle cx="42" cy="58" r="4.4" fill="#2b2f36"/><circle cx="58" cy="58" r="4.4" fill="#2b2f36"/><path d="M42 42l16 16M58 42 42 58" stroke="#e9c27a" stroke-width="2.4"/>${shine("M30 38c2-6 6-10 12-12")}` },
      { name: "Молния", svg: `<path d="M44 10v80M56 10v80" stroke="#2b2f36" stroke-width="10"/><g stroke="#c9ced6" stroke-width="4" ${S}><path d="M44 16h6M50 22h6M44 28h6M50 34h6M44 40h6M50 46h6M44 76h6M50 82h6"/></g><path d="M44 52l6 6 6-6" fill="none" stroke="#c9ced6" stroke-width="4" ${S}/><rect x="42" y="54" width="16" height="12" rx="3" fill="#c9ced6"/><path d="M50 66v12" stroke="#c9ced6" stroke-width="5" ${S}/><circle cx="50" cy="80" r="4" fill="none" stroke="#c9ced6" stroke-width="3"/>` },
      { name: "Куртка", svg: jacket("#5b7fa6", "#476a8f", "#e9c27a") },
      { name: "Кожаная куртка", svg: jacket("#2b2f36", "#1c1f24") },
      { name: "Куртка Артура", svg: `${jacket("#2b2f36", "#1c1f24")}${heart(64, 50, .7, "#e9c27a")}${spark(84, 14)}${spark(14, 90, .7)}` }
    ] }
  };

  /* генераторы: стоят на поле, по нажатию за ⚡ выдают вещь первого уровня одной из своих цепочек */
  const GENS = {
    kitchen: { name: "Буфет", svg: `<rect x="14" y="40" width="72" height="50" rx="6" fill="#a8743f"/><rect x="20" y="46" width="28" height="38" rx="3" fill="#c98e5a"/><rect x="52" y="46" width="28" height="38" rx="3" fill="#c98e5a"/><circle cx="44" cy="66" r="2.6" fill="#e9c27a"/><circle cx="56" cy="66" r="2.6" fill="#e9c27a"/><rect x="10" y="34" width="80" height="8" rx="3" fill="#8a5a33"/><g transform="translate(26 10) scale(.36)"><path d="M22 54c0-18 12-28 28-28s28 10 28 28-10 30-28 30S22 72 22 54Z" fill="#8fb8de"/><path d="M76 46c10-6 14-14 14-20" fill="none" stroke="#7aa6cf" stroke-width="8" ${S}/><circle cx="50" cy="22" r="6" fill="#e9c27a"/></g><g transform="translate(54 14) scale(.3)"><path d="M26 38h46v34c0 8-6 12-14 12H40c-8 0-14-4-14-12Z" fill="#e0896a"/></g>` },
    wardrobe: { name: "Шкаф", svg: `<rect x="18" y="10" width="64" height="82" rx="6" fill="#8a5a33"/><rect x="23" y="16" width="26" height="70" rx="3" fill="#a8743f"/><rect x="51" y="16" width="26" height="70" rx="3" fill="#a8743f"/><circle cx="45" cy="52" r="2.6" fill="#e9c27a"/><circle cx="55" cy="52" r="2.6" fill="#e9c27a"/><rect x="22" y="92" width="8" height="4" fill="#6b4426"/><rect x="70" y="92" width="8" height="4" fill="#6b4426"/>${bow(64, 30, .38, "#f7c6d0", "#d98597")}<path d="M30 30h12M30 36h12" stroke="#c98e5a" stroke-width="2"/>` }
  };

  window.MERGE = { CHAINS, GENS, MAX: 5 };
})();
