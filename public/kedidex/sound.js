/* KediDex — ses sistemi (Web Audio, dosyasız sentez; olaya/nadirliğe göre çeşitli) */
window.KD = window.KD || {};
KD.sound = (function () {
  let ctx = null, master = null;
  let enabled = true;
  try { enabled = localStorage.getItem('kedidex.v1.muted') !== '1'; } catch (e) {}

  function ac() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, t0, dur, type, gain, glideTo) {
    const a = ac();
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'triangle';
    o.frequency.setValueAtTime(freq, t0);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function arp(freqs, t0, step, type, gain) {
    freqs.forEach((f, i) => tone(f, t0 + i * step, step * 2.2, type, gain));
  }
  function shimmer(t0, gain) {
    const a = ac();
    const buf = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 5000; f.Q.value = 2;
    const g = a.createGain(); g.gain.value = gain;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0);
  }

  // nadirlik yükseldikçe daha zengin/uzun başarı sesi
  const SCALES = {
    common: [523, 659],
    uncommon: [523, 659, 784],
    rare: [523, 659, 784, 1047],
    epic: [523, 659, 784, 1047, 1319],
    myth: [392, 523, 659, 784, 1047, 1319, 1568]
  };

  function play(name, rarity) {
    if (!enabled) return;
    try {
      const a = ac(), t = a.currentTime + 0.01;
      switch (name) {
        case 'tap': tone(720, t, 0.06, 'square', 0.10); break;
        case 'catchStart': tone(280, t, 0.22, 'sawtooth', 0.10, 720); break;
        case 'snap': tone(180, t, 0.10, 'square', 0.16, 90); shimmer(t, 0.05); break;
        case 'success': {
          const sc = SCALES[rarity] || SCALES.common;
          const big = rarity === 'myth' || rarity === 'epic';
          arp(sc, t, big ? 0.085 : 0.065, 'triangle', 0.16);
          if (big) {
            const end = t + sc.length * (big ? 0.085 : 0.065);
            shimmer(end, 0.06);
            tone(1568, end + 0.04, 0.7, 'sine', 0.09);
            if (rarity === 'myth') { tone(2093, end + 0.12, 0.8, 'sine', 0.07); }
          }
          break;
        }
        case 'levelup': arp([523, 659, 784, 1047, 1319], t, 0.08, 'square', 0.14); break;
        case 'quest': arp([784, 1047, 1319], t, 0.08, 'sine', 0.13); break;
        case 'fail': tone(330, t, 0.28, 'sawtooth', 0.10, 150); break;
      }
    } catch (e) {}
  }

  function setMuted(m) { enabled = !m; try { localStorage.setItem('kedidex.v1.muted', m ? '1' : '0'); } catch (e) {} }
  function isMuted() { return !enabled; }

  return { play, setMuted, isMuted, ac };
})();
