/* Звуки для страницы «Почитай под это». Ничего не скачивается: дождь, город,
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
