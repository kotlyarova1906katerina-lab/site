/* Звуки для страницы «Плейлист для чтения». Ничего не скачивается: дождь, город,
   ветер и камин синтезируются прямо в браузере (Web Audio) из шума.
   ZVUKI.toggle(имя) — включить/выключить слой, ZVUKI.volume(0..1). */
(function () {
  let ctx, master, unlocked = false, vol = .8;
  const L = {}; // слой: {gain, on}

  /* iOS глушит Web Audio беззвучным режимом; тихий <audio> переводит звук в режим «медиа» */
  function iosUnmute() {
    const n = 4410, b = new ArrayBuffer(44 + n * 2), v = new DataView(b);
    const s = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    s(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); s(8, "WAVEfmt "); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 44100, true); v.setUint32(28, 88200, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true); s(36, "data"); v.setUint32(40, n * 2, true);
    const a = new Audio(URL.createObjectURL(new Blob([b], { type: "audio/wav" })));
    a.loop = true; a.setAttribute("playsinline", ""); a.play().catch(() => {});
  }

  function noise(kind, sec = 6) {
    const len = ctx.sampleRate * sec, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (kind === "white") d[i] = w;
        else if (kind === "pink") {
          b0 = .99886 * b0 + w * .0555179; b1 = .99332 * b1 + w * .0750759; b2 = .969 * b2 + w * .153852;
          b3 = .8665 * b3 + w * .3104856; b4 = .55 * b4 + w * .5329522; b5 = -.7616 * b5 - w * .016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * .5362) * .11; b6 = w * .115926;
        } else { last = (last + .02 * w) / 1.02; d[i] = last * 3.5; }
      }
      // мягкая склейка конца с началом, чтобы петля не щёлкала
      const f = 2000;
      for (let i = 0; i < f; i++) { const k = i / f; d[len - f + i] = d[len - f + i] * (1 - k) + d[i] * k; }
    }
    return buf;
  }
  const loop = (buf, rate = 1, at) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = rate; s.start(at ?? ctx.currentTime + Math.random(), Math.random() * 4); return s; };
  const filt = (type, f, q = .7) => { const x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; return x; };
  const amp = v => { const g = ctx.createGain(); g.gain.value = v; return g; };
  const chain = (...n) => { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; };

  /* короткий щелчок/капля: шумовой всплеск через полосовой фильтр */
  function blip(layer, t, { f, q, peak, dur, pan = 0, type = "bandpass" }) {
    const s = ctx.createBufferSource(); s.buffer = W.short;
    const bp = filt(type, f, q), g = ctx.createGain(), p = ctx.createStereoPanner();
    p.pan.value = pan;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + .002); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    chain(s, bp, g, p, layer.gain); s.start(t, Math.random() * .5, dur + .02);
  }

  /* голосовой звук: осциллятор с кривой частоты и огибающей громкости
     f и env — массивы [время от начала, значение]; к первой точке прыжок, дальше плавно */
  function tone(dest, t, { type = "sine", f, env, filter }) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type;
    f.forEach(([dt, v], i) => i ? o.frequency.exponentialRampToValueAtTime(v, t + dt) : o.frequency.setValueAtTime(v, t + dt));
    g.gain.setValueAtTime(0, t);
    env.forEach(([dt, v]) => g.gain.linearRampToValueAtTime(v, t + dt));
    const end = Math.max(f[f.length - 1][0], env[env.length - 1][0]);
    filter ? chain(o, ...filter, g, dest) : chain(o, g, dest);
    o.start(t); o.stop(t + end + .05);
  }
  /* событие раз в min..max секунд */
  function every(l, key, t0, dt, min, max, fn) {
    l.next = l.next || {};
    if (!l.next[key]) l.next[key] = t0 + Math.random() * min;
    while (l.next[key] < t0 + dt) { fn(l.next[key]); l.next[key] += min + Math.random() * (max - min); }
  }
  const pan = (dest, v) => { const p = ctx.createStereoPanner(); p.pan.value = v; p.connect(dest); return p; };

  /* птичьи голоса: у каждой «птицы» свой вид, высота и место в кроне */
  const R = Math.random;
  function birdPhrase(dest, t, b) {
    const k = b.pitch, out = pan(dest, b.pan), v = b.vol;
    if (b.kind === "tweet") {            // воробьиное чирик-чирик
      const n = 2 + (R() * 4 | 0);
      for (let i = 0; i < n; i++) { const s = t + i * (.13 + R() * .05), f0 = (3200 + R() * 900) * k;
        tone(out, s, { f: [[0, f0], [.03, f0 * 1.35], [.07, f0 * .8]], env: [[.008, v], [.05, v * .6], [.075, 0]] }); }
    } else if (b.kind === "tit") {       // синица: «ци-фи, ци-фи»
      const n = 2 + (R() * 3 | 0);
      for (let i = 0; i < n; i++) { const s = t + i * .42;
        tone(out, s, { f: [[0, 5200 * k], [.12, 5000 * k]], env: [[.02, v], [.1, v], [.13, 0]] });
        tone(out, s + .2, { f: [[0, 3900 * k], [.15, 3750 * k]], env: [[.02, v * .9], [.12, v * .9], [.16, 0]] }); }
    } else if (b.kind === "trill") {     // трель зяблика с росчерком в конце
      const n = 8 + (R() * 10 | 0), step = .055 + R() * .02;
      for (let i = 0; i < n; i++) { const s = t + i * step, f0 = (4200 - i * 90) * k;
        tone(out, s, { f: [[0, f0], [step * .7, f0 * .75]], env: [[.005, v], [step * .6, 0]] }); }
      const e = t + n * step + .04;
      tone(out, e, { f: [[0, 2600 * k], [.08, 4800 * k], [.2, 2200 * k]], env: [[.02, v], [.16, v * .7], [.22, 0]] });
    } else {                             // плавный свист, как у иволги/дрозда
      const f0 = (1800 + R() * 900) * k, n = 2 + (R() * 3 | 0);
      let s = t;
      for (let i = 0; i < n; i++) { const d = .14 + R() * .2, f1 = f0 * (0.8 + R() * .7);
        tone(out, s, { f: [[0, f0 * (0.9 + R() * .3)], [d * .5, f1 * 1.15], [d, f1]], env: [[.03, v], [d - .04, v * .8], [d, 0]] });
        s += d + .05 + R() * .08; }
    }
  }
  const flock = n => Array.from({ length: n }, (_, i) => ({ kind: ["tweet", "tit", "trill", "whistle"][i % 4], pitch: .85 + R() * .3, pan: R() * 1.6 - .8, vol: .06 + R() * .06 }));

  const W = {};
  function build() {
    W.white = noise("white"); W.pink = noise("pink"); W.brown = noise("brown"); W.short = noise("white", 1);

    /* Дождь: ровный шелест + капли по стеклу и подоконнику */
    const rain = L.rain = { gain: amp(0) };
    chain(loop(W.white), filt("highpass", 500), filt("lowpass", 5200), amp(.11), rain.gain);
    chain(loop(W.pink, .9), filt("lowpass", 1400), amp(.42), rain.gain);
    rain.tick = (t0, dt) => {
      for (let t = t0; t < t0 + dt; t += -Math.log(Math.random()) / 22)
        blip(rain, t, { f: 2200 + Math.random() * 4500, q: 4 + Math.random() * 6, peak: .03 + Math.random() * .1, dur: .02 + Math.random() * .05, pan: Math.random() * 1.6 - .8 });
      for (let t = t0; t < t0 + dt; t += -Math.log(Math.random()) / 1.6)
        blip(rain, t, { f: 700 + Math.random() * 700, q: 6, peak: .12 + Math.random() * .12, dur: .08 + Math.random() * .08, pan: Math.random() - .5 });
    };

    /* Город: низкий гул, редкие проезжающие машины слева направо */
    const city = L.city = { gain: amp(0), next: 0 };
    chain(loop(W.brown), filt("lowpass", 260), amp(.5), city.gain);
    chain(loop(W.pink, .7), filt("bandpass", 520, .4), amp(.05), city.gain);
    city.tick = (t0, dt) => {
      if (!city.next) city.next = t0 + 2;
      while (city.next < t0 + dt) {
        const t = city.next, d = 4 + Math.random() * 4, dir = Math.random() < .5 ? 1 : -1;
        const s = loop(W.white, 1, t), bp = filt("bandpass", 300, .9), g = ctx.createGain(), p = ctx.createStereoPanner();
        bp.frequency.setValueAtTime(260, t); bp.frequency.linearRampToValueAtTime(900, t + d / 2); bp.frequency.linearRampToValueAtTime(280, t + d);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.16 + Math.random() * .1, t + d / 2); g.gain.linearRampToValueAtTime(0, t + d);
        p.pan.setValueAtTime(-.8 * dir, t); p.pan.linearRampToValueAtTime(.8 * dir, t + d);
        chain(s, bp, g, p, city.gain); s.stop(t + d + .1);
        city.next = t + 3 + Math.random() * 9;
      }
    };

    /* Осенний ветер: шум с медленно «дышащим» фильтром и громкостью */
    const wind = L.wind = { gain: amp(0) };
    const wf = filt("bandpass", 480, 1.3), wg = amp(.9);
    chain(loop(W.pink), wf, wg, wind.gain);
    const lfo = (hz, depth, target) => { const o = ctx.createOscillator(); o.frequency.value = hz; const d = amp(depth); o.connect(d).connect(target); o.start(); };
    lfo(.06, 260, wf.frequency); lfo(.11, .5, wg.gain); lfo(.023, 120, wf.frequency);
    const lf = amp(.04); chain(loop(W.white, 1.1), filt("highpass", 3000), lf, wind.gain); lfo(.09, .035, lf.gain); // шорох листьев

    /* Камин: тёплый гул пламени и потрескивание поленьев */
    const fire = L.fire = { gain: amp(0) };
    chain(loop(W.brown, .8), filt("lowpass", 180), amp(.55), fire.gain);
    fire.tick = (t0, dt) => {
      for (let t = t0; t < t0 + dt; t += -Math.log(Math.random()) / 7) {
        const n = Math.random() < .25 ? 2 + (Math.random() * 4 | 0) : 1, pan = Math.random() - .5;
        for (let k = 0; k < n; k++)
          blip(fire, t + k * (.01 + Math.random() * .03), { type: "highpass", f: 1200 + Math.random() * 2500, q: .7, peak: .1 + Math.random() * .25, dur: .004 + Math.random() * .012, pan });
      }
    };

    /* Волны: накат с нарастающим шумом, гребень и пена при откате */
    const sea = L.sea = { gain: amp(0), next: 0 };
    chain(loop(W.brown, .6), filt("lowpass", 220), amp(.28), sea.gain);
    sea.tick = (t0, dt) => {
      if (!sea.next) sea.next = t0 + .5;
      while (sea.next < t0 + dt) {
        const t = sea.next, up = 2 + Math.random() * 1.5, down = 3.5 + Math.random() * 2.5, big = .7 + Math.random() * .5;
        const p = ctx.createStereoPanner(); p.pan.value = Math.random() * .8 - .4; p.connect(sea.gain);
        const s = loop(W.pink, 1, t), lp = filt("lowpass", 300), g = ctx.createGain();
        lp.frequency.setValueAtTime(300, t); lp.frequency.linearRampToValueAtTime(2600, t + up); lp.frequency.exponentialRampToValueAtTime(350, t + up + down);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.45 * big, t + up); g.gain.exponentialRampToValueAtTime(.001, t + up + down);
        chain(s, lp, g, p); s.stop(t + up + down + .1);
        const f = loop(W.white, 1, t), hp = filt("highpass", 2500), fg = ctx.createGain(); // пена
        fg.gain.setValueAtTime(0, t); fg.gain.setValueAtTime(0, t + up * .8); fg.gain.linearRampToValueAtTime(.05 * big, t + up + .3); fg.gain.exponentialRampToValueAtTime(.001, t + up + down * .9);
        chain(f, hp, fg, p); f.stop(t + up + down + .1);
        sea.next = t + up + down * (.55 + Math.random() * .3);
      }
    };

    /* Осенняя листва: сухие листья шуршат порывами, то тише, то громче */
    const leaves = L.leaves = { gain: amp(0), g: 0, aim: .3, swap: 0 };
    const lbed = amp(.02); chain(loop(W.white, .9), filt("bandpass", 4200, .6), lbed, leaves.gain);
    leaves.tick = (t0, dt) => {
      if (t0 > leaves.swap) { leaves.aim = Math.random() ** 1.5; leaves.swap = t0 + 1.5 + Math.random() * 3; }
      leaves.g += (leaves.aim - leaves.g) * Math.min(1, dt * 1.2);
      lbed.gain.setTargetAtTime(.04 + leaves.g * .22, t0, .4);
      const rate = 6 + leaves.g * 110;
      for (let t = t0; t < t0 + dt; t += -Math.log(Math.random()) / rate)
        blip(leaves, t, { f: 2500 + Math.random() * 6000, q: 1.5 + Math.random() * 3, peak: .06 + Math.random() * (.12 + leaves.g * .3), dur: .008 + Math.random() * .03, pan: Math.random() * 1.8 - .9 });
    };

    /* Птицы в листве: несколько птиц перекликаются в кроне, листья тихо шелестят */
    const birds = L.birds = { gain: amp(0), flock: flock(5) };
    const bl = amp(.05); chain(loop(W.pink, 1.2), filt("bandpass", 3500, .5), bl, birds.gain);
    { const o = ctx.createOscillator(); o.frequency.value = .08; const d = amp(.035); o.connect(d).connect(bl.gain); o.start(); }
    birds.tick = (t0, dt) => birds.flock.forEach((b, i) => every(birds, "b" + i, t0, dt, 2.5, 9, t => birdPhrase(birds.gain, t, b)));

    /* Деревня у бабушки: ветерок, птицы, куры, кукушка, петух, корова, собака вдалеке */
    const village = L.village = { gain: amp(0), flock: flock(3).map(b => ({ ...b, vol: b.vol * .7 })) };
    chain(loop(W.pink, .8), filt("lowpass", 900), amp(.11), village.gain);
    const ir = ctx.createBuffer(2, ctx.sampleRate * 2.2, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] = (R() * 2 - 1) * Math.pow(1 - i / d.length, 3); }
    const verb = ctx.createConvolver(); verb.buffer = ir;
    const far = amp(1.3); chain(far, filt("lowpass", 2600), verb, amp(.6), village.gain); far.connect(village.gain);
    village.tick = (t0, dt) => {
      village.flock.forEach((b, i) => every(village, "b" + i, t0, dt, 4, 14, t => birdPhrase(village.gain, t, b)));
      every(village, "hens", t0, dt, 4, 11, t => {          // куры: ко-ко-ко
        const out = pan(far, R() - .5), n = 2 + (R() * 5 | 0), base = 330 + R() * 120;
        for (let i = 0; i < n; i++) { const s = t + i * (.16 + R() * .12), f0 = base * (i === n - 1 && R() < .5 ? 1.5 : 1);
          tone(out, s, { type: "sawtooth", f: [[0, f0 * 1.2], [.07, f0 * .85]], env: [[.01, .07], [.06, .03], [.09, 0]], filter: [filt("bandpass", 900, 1.5)] }); }
      });
      every(village, "cuckoo", t0, dt, 18, 40, t => {       // кукушка: ку-ку
        const out = pan(far, R() * 1.2 - .6), n = 3 + (R() * 5 | 0);
        for (let i = 0; i < n; i++) { const s = t + i * .85;
          tone(out, s, { f: [[0, 700], [.18, 680]], env: [[.04, .09], [.15, .08], [.2, 0]] });
          tone(out, s + .3, { f: [[0, 570], [.3, 550]], env: [[.04, .09], [.24, .07], [.32, 0]] }); }
      });
      every(village, "rooster", t0, dt, 30, 65, t => {      // петух: ку-ка-ре-ку-у
        const out = pan(far, R() * 1.4 - .7), v = .1;
        const syl = [[0, .13, 430, 460], [.18, .13, 500, 520], [.36, .2, 560, 600], [.62, 1.1, 640, 470]];
        syl.forEach(([o, d, a, b]) => tone(out, t + o, { type: "sawtooth", f: [[0, a], [d * .3, b * 1.05], [d, b]], env: [[.03, v], [d * .8, v * .8], [d, 0]], filter: [filt("bandpass", 1100, 2), filt("lowpass", 2800)] }));
      });
      every(village, "cow", t0, dt, 35, 80, t => {          // корова: му-у
        const out = pan(far, R() - .5), lp = filt("lowpass", 300, 2);
        lp.frequency.setValueAtTime(300, t); lp.frequency.linearRampToValueAtTime(900, t + .7); lp.frequency.linearRampToValueAtTime(380, t + 2);
        tone(out, t, { type: "sawtooth", f: [[0, 105], [.5, 140], [1.4, 125], [2, 92]], env: [[.25, .16], [1.6, .14], [2, 0]], filter: [lp] });
      });
      every(village, "dog", t0, dt, 40, 90, t => {          // собака лает вдалеке
        const out = pan(far, R() * 1.6 - .8), n = 2 + (R() * 3 | 0);
        for (let i = 0; i < n; i++) tone(out, t + i * (.35 + R() * .2), { type: "sawtooth", f: [[0, 520], [.05, 600], [.14, 360]], env: [[.01, .05], [.1, .03], [.15, 0]], filter: [filt("bandpass", 1000, 1.2), filt("lowpass", 1800)] });
      });
    };

    master = amp(vol);
    const comp = ctx.createDynamicsCompressor();
    Object.values(L).forEach(l => l.gain.connect(master));
    master.connect(comp).connect(ctx.destination);

    // планировщик событий (капли, машины, треск) с запасом 0.3 с
    let ahead = ctx.currentTime;
    setInterval(() => {
      const now = ctx.currentTime;
      if (ahead < now) ahead = now;
      const dt = now + .3 - ahead; if (dt <= 0) return;
      Object.values(L).forEach(l => l.on && l.tick && l.tick(ahead, dt));
      ahead += dt;
    }, 100);
  }

  function unlock() {
    if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); build(); }
    if (!unlocked) { iosUnmute(); unlocked = true; }
    if (ctx.state === "suspended") ctx.resume();
  }

  window.ZVUKI = {
    toggle(name, on) {
      unlock();
      const l = L[name]; l.on = on === undefined ? !l.on : on;
      l.gain.gain.setTargetAtTime(l.on ? 1 : 0, ctx.currentTime, l.on ? .6 : .35);
      return l.on;
    },
    volume(v) { vol = v; if (master) master.gain.setTargetAtTime(v, ctx.currentTime, .1); },
    isOn: name => !!(L[name] && L[name].on)
  };
})();
