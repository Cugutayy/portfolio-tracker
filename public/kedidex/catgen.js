/* KediDex — prosedürel kedi üretici (isim, nadirlik, istatistik, SVG çizim) */
window.KD = window.KD || {};
KD.catgen = (function () {
  const OUT = '#2b2118';

  // ---- deterministik PRNG ----
  function hash(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ---- nadirlik ----
  const RARITIES = [
    { key: 'common',   name: 'Yaygın',    weight: 55, color: '#9a9488', stat: [22, 55] },
    { key: 'uncommon', name: 'Sıradışı',  weight: 25, color: '#5aa86a', stat: [38, 68] },
    { key: 'rare',     name: 'Nadir',     weight: 13, color: '#4a86c5', stat: [52, 80] },
    { key: 'epic',     name: 'Efsanevi',  weight: 6,  color: '#9a5cc6', stat: [66, 92] },
    { key: 'myth',     name: 'Mitik',     weight: 1,  color: '#e0a83b', stat: [82, 100] }
  ];
  function rollRarity(rng, luck = 0) {
    // luck (0..1) nadir çıkma şansını artırır
    const total = RARITIES.reduce((s, r) => s + r.weight, 0);
    let x = rng() * total * (1 - luck * 0.45);
    for (const r of RARITIES) { if (x < r.weight) return r; x -= r.weight; }
    return RARITIES[0];
  }
  function rarityByKey(k) { return RARITIES.find(r => r.key === k) || RARITIES[0]; }

  // ---- isimler ----
  const NAMES = ['Pamuk', 'Tekir', 'Boncuk', 'Zeytin', 'Duman', 'Şanslı', 'Minnoş', 'Kömür',
    'Karamel', 'Maviş', 'Sarman', 'Fındık', 'Badem', 'Paşa', 'Lokum', 'Reis', 'Mırnav', 'Tarçın',
    'Küllü', 'Pofuduk', 'Şeker', 'Çakıl', 'Limon', 'Vişne', 'Kestane', 'Bulut', 'Yumoş', 'Çetin',
    'Maya', 'Sütlaç', 'Nazlı', 'Hızır', 'Poyraz', 'Zümrüt', 'Yakut', 'Bonibon', 'Mırmır', 'Çıtır',
    'Gofret', 'Peynir', 'Zıpzıp', 'Bıdık', 'Pıtırcık', 'Şıpşak', 'Tombiş', 'Sütlü', 'Gübüş', 'Maraş'];
  const TITLES = {
    common:   ['Mahalle Sakini', 'Apartman Görevlisi', 'Bakkal Müdavimi', 'Çöp Konteyneri Kâşifi', 'Köşe Bekçisi'],
    uncommon: ['Mahalle Kabadayısı', 'Çay Ocağı Müdürü', 'Çatı Akrobatı', 'Fırın Müdavimi', 'Park Bekçisi'],
    rare:     ['Sokağın Reisi', 'Pazar Esnafı', 'Balıkçı Dostu', 'Meydan Lordu', 'Sahil Gezgini'],
    epic:     ['Çarşı Hayaleti', 'Boğaz Prensi', 'Tarihi Çeşme Bekçisi', 'Vapur Yolcusu', 'Ay Işığı Avcısı'],
    myth:     ['Kayıp Sultan', 'Yedi Tepe Hükümdarı', 'Altın Pati', 'Dokuz Canlı Bilge', 'Çınar Ağacı Ruhu']
  };

  // ---- tüy paletleri ----
  const COATS = [
    { n: 'Pamuk',  body: '#f1e7d2', belly: '#fff9ec', stripe: '#ddccac' },
    { n: 'Sarman', body: '#e8a44c', belly: '#f6d9a8', stripe: '#c9802f' },
    { n: 'Tekir',  body: '#a08d6f', belly: '#d8cdb5', stripe: '#6f6450' },
    { n: 'Duman',  body: '#9aa3a8', belly: '#cfd6d9', stripe: '#6c757b' },
    { n: 'Kömür',  body: '#544f47', belly: '#726c62', stripe: '#363229' },
    { n: 'Karamel',body: '#c98a55', belly: '#ecd1ad', stripe: '#9c6536' }
  ];
  const EYES = ['#5aa86a', '#e0a83b', '#4a86c5', '#7bc47f', '#b06ad0', '#3f9c8c'];
  const PATTERNS = ['duz', 'tekir', 'benekli', 'smokin'];
  const STATKEYS = [
    { k: 'guc',     n: 'Güç' },
    { k: 'ceviklik',n: 'Çeviklik' },
    { k: 'cazibe',  n: 'Cazibe' },
    { k: 'gizem',   n: 'Gizem' }
  ];

  // ---- renk yardımcıları (fotoğraftan tüy rengi) ----
  function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }
  function rgbToHex(r, g, b) { return '#' + [r, g, b].map(x => clamp(x).toString(16).padStart(2, '0')).join(''); }
  function mix(c, t, amt) { return { r: c.r + (t - c.r) * amt, g: c.g + (t - c.g) * amt, b: c.b + (t - c.b) * amt }; }
  function nearestCoatName(r, g, b) {
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const ginger = r > g + 25 && g > b;       // turuncu/sarı baskın
    if (lum < 70) return 'Kömür';             // koyu
    if (lum > 200 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25) return 'Pamuk'; // açık/krem
    if (ginger && lum > 120) return 'Sarman';  // turuncu
    if (ginger) return 'Karamel';
    if (Math.abs(r - g) < 18 && Math.abs(g - b) < 18) return 'Duman'; // gri
    return 'Tekir';
  }
  // gerçek fotoğraf renginden tutarlı bir tüy paleti üret
  function coatFromColor(rgb) {
    const base = { r: clamp(rgb.r), g: clamp(rgb.g), b: clamp(rgb.b) };
    const belly = mix(base, 255, 0.45);
    const stripe = mix(base, 0, 0.4);
    return {
      n: nearestCoatName(base.r, base.g, base.b),
      body: rgbToHex(base.r, base.g, base.b),
      belly: rgbToHex(belly.r, belly.g, belly.b),
      stripe: rgbToHex(stripe.r, stripe.g, stripe.b),
      fromPhoto: true
    };
  }

  // ---- Türk ırkları (bölgesel nadirler) ----
  const BREEDS = {
    van:    { name: 'Van Kedisi',    titles: ['Van Gölü Yüzücüsü', 'Çifte Gözlü Bilge', 'Gölün Beyaz Hayaleti'] },
    angora: { name: 'Ankara Kedisi', titles: ['Başkent Soylusu', 'Angora Prensi', 'Sarayın Beyaz Tüyü'] }
  };
  // konuma göre ırk şansı (Van ve Ankara çevresinde artar)
  function rollBreed(rng, lat, lng) {
    const dist = (a, b) => (lat != null && lng != null) ? Math.hypot(lat - a, lng - b) : 99;
    let vanCh = 0.025, angCh = 0.025;          // her yerde küçük taban şans
    if (dist(38.5, 43.4) < 1.6) vanCh = 0.45;  // Van (~150km)
    if (dist(39.93, 32.85) < 1.6) angCh = 0.45; // Ankara
    const x = rng();
    if (x < vanCh) return 'van';
    if (x < vanCh + angCh) return 'angora';
    return null;
  }
  function breedLook(breed, seed) {
    const rng = mulberry32((seed >>> 1) ^ 0x9e37);
    if (breed === 'van') {
      const patch = rng() < 0.5 ? '#e8a44c' : '#544f47'; // turuncu ya da siyah kulak/kuyruk
      return { coat: { n: 'Van', body: '#f7f3ea', belly: '#fffdf8', stripe: '#e6dcc8' },
        eye: '#4a86c5', eye2: '#e0a83b', pattern: 'duz', blush: true, breed: 'van', patch };
    }
    return { coat: { n: 'Angora', body: '#fbf8f1', belly: '#ffffff', stripe: '#ece5d6' },
      eye: '#5aa6c8', eye2: '#5aa6c8', pattern: 'duz', blush: true, breed: 'angora', fluffy: true };
  }

  // seed'den görünüm üret (deterministik, kalıcı)
  function getLook(seed, rarityKey) {
    const rng = mulberry32(seed >>> 0);
    const coat = COATS[Math.floor(rng() * COATS.length)];
    const eye = EYES[Math.floor(rng() * EYES.length)];
    let pattern = PATTERNS[Math.floor(rng() * PATTERNS.length)];
    const heterochromia = (rarityKey === 'epic' || rarityKey === 'myth') && rng() < 0.5;
    const eye2 = heterochromia ? EYES[Math.floor(rng() * EYES.length)] : eye;
    return { coat, eye, eye2, pattern, blush: rng() < 0.6 };
  }

  // ana üretim: yeni kedi nesnesi
  function create({ quality = 0.6, rarityKey = null, lat = null, lng = null, photoColor = null, breed = null } = {}) {
    const seed = (Math.floor(Math.random() * 1e9) ^ Date.now()) >>> 0;
    const rng = mulberry32(seed);
    let rarity = rarityKey ? rarityByKey(rarityKey) : rollRarity(rng, quality * 0.5);

    // bölgesel Türk ırkı (konuma göre) — geldiyse yüksek nadirlik
    const theBreed = breed || (!rarityKey ? rollBreed(rng, lat, lng) : null);
    if (theBreed) rarity = rarityByKey(rng() < 0.3 ? 'myth' : 'epic');

    const name = NAMES[Math.floor(rng() * NAMES.length)];
    let title;
    if (theBreed) { const t = BREEDS[theBreed].titles; title = t[Math.floor(rng() * t.length)]; }
    else { const tl = TITLES[rarity.key]; title = tl[Math.floor(rng() * tl.length)]; }

    const [lo, hi] = rarity.stat;
    const stats = {};
    STATKEYS.forEach(s => { stats[s.k] = Math.round(lo + rng() * (hi - lo)); });
    const buffKey = STATKEYS[Math.floor(rng() * STATKEYS.length)].k;
    stats[buffKey] = Math.min(100, Math.round(stats[buffKey] + quality * 12));

    let look;
    if (theBreed) look = breedLook(theBreed, seed);
    else {
      look = getLook(seed, rarity.key);
      if (photoColor && Number.isFinite(photoColor.r)) look.coat = coatFromColor(photoColor);
    }

    const cat = {
      id: 'cat_' + seed.toString(36) + '_' + Date.now().toString(36),
      seed,
      name,
      title,
      rarity: rarity.key,
      rarityName: rarity.name,
      rarityColor: rarity.color,
      breed: theBreed || null,
      breedName: theBreed ? BREEDS[theBreed].name : null,
      coat: look.coat.n,
      look,
      level: 1,
      stats,
      quality: Math.round(quality * 100),
      caughtAt: Date.now(),
      lat, lng,
      story: theBreed ? breedStory(rng, name, theBreed) : makeStory(rng, name, rarity.key)
    };
    return cat;
  }

  function makeStory(rng, name, rk) {
    const places = ['Kadıköy Moda', 'Beyoğlu Cihangir', 'İzmir Alsancak', 'Ankara Tunalı',
      'Bursa Nilüfer', 'Eskişehir Porsuk kenarı', 'Antalya Kaleiçi', 'Üsküdar sahili',
      'Karşıyaka çarşısı', 'Beşiktaş çarşısı', 'Eminönü', 'bir mahalle arası'];
    const habits = ['simit kırıntılarına bayılır', 'çay bahçesinde masaların altında dolaşır',
      'balıkçıdan istavrit kapmaya çalışır', 'her akşam aynı duvarda güneşlenir',
      'kahvehanenin önünde oturup geçenleri izler', 'vapurda yolcuların kucağına kurulur',
      'bakkalın kasasında uyuklar', 'kutuların içinde saklanmayı sever',
      'pazarcının tezgâhından pay bekler', 'yağmurda saçağın altına sığınır'];
    const p = places[Math.floor(rng() * places.length)];
    const h = habits[Math.floor(rng() * habits.length)];
    const flair = rk === 'myth' ? ' Onu gören şanslı sayılır, derler.' :
                  rk === 'epic' ? ' Mahallenin esnafı efsanesini anlatır.' :
                  rk === 'rare' ? ' Sokağın delikanlısıdır.' : '';
    return `${name}, ${p} civarında yaşar ve ${h}.${flair}`;
  }

  function breedStory(rng, name, breed) {
    if (breed === 'van') {
      const h = ['Van Gölü kıyısında suya girmekten korkmaz', 'iki ayrı göz rengiyle herkesi büyüler',
        'eski bir taş evin damında yaşar'][Math.floor(rng() * 3)];
      return `${name} bir Van kedisi — ${h}. Bu nadir cinsi gören şanslı sayılır.`;
    }
    const h = ['Başkentin eski konaklarında dolaşır', 'bembeyaz uzun tüyleriyle bir prens gibi gezer',
      'kar yağınca kayboluveren bir hayalet gibidir'][Math.floor(rng() * 3)];
    return `${name} soylu bir Ankara kedisi — ${h}. Türkiye'nin en kıymetli cinslerinden.`;
  }

  // ---- SVG çizim ----
  function catSVG(cat, size = 200) {
    const look = cat.look || getLook(cat.seed, cat.rarity);
    const c = look.coat;
    const clip = 'bodyclip_' + cat.seed;
    let pattern = '';
    if (look.pattern === 'tekir') {
      pattern = `
        <path d="M70 70 q30 -14 60 0" /><path d="M64 92 q36 -16 72 0" />
        <path d="M58 116 q42 -16 84 0" /><path d="M62 140 q38 -14 76 0" />`
        .replace(/<path/g, `<path fill="none" stroke="${c.stripe}" stroke-width="8" stroke-linecap="round"`);
    } else if (look.pattern === 'benekli') {
      pattern = [[78, 96], [120, 104], [96, 134], [64, 120], [134, 130]]
        .map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="8" ry="7" fill="${c.stripe}"/>`).join('');
    } else if (look.pattern === 'smokin') {
      pattern = `<path d="M100 96 q26 6 26 50 q0 30 -26 36 q-26 -6 -26 -36 q0 -44 26 -50 Z" fill="${c.belly}"/>`;
    }

    const accessory = renderAccessory(cat.rarity);
    const earTail = look.patch || c.body;   // Van: renkli kulak/kuyruk
    const fluff = look.fluffy ? `
      <g fill="${c.body}" stroke="${OUT}" stroke-width="3" stroke-linejoin="round">
        <path d="M30 108 l-15 -7 l11 17 Z"/><path d="M28 140 l-16 5 l14 12 Z"/>
        <path d="M170 108 l15 -7 l-11 17 Z"/><path d="M172 140 l16 5 l-14 12 Z"/>
        <path d="M72 188 l-7 15 l16 -4 Z"/><path d="M128 188 l7 15 l-16 -4 Z"/>
      </g>` : '';
    const blush = look.blush
      ? `<ellipse cx="66" cy="128" rx="11" ry="7" fill="#e67a7a" opacity=".35"/>
         <ellipse cx="134" cy="128" rx="11" ry="7" fill="#e67a7a" opacity=".35"/>` : '';

    return `
<svg viewBox="0 0 200 210" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs><clipPath id="${clip}">
    <path d="M30,124 C30,72 66,52 100,52 C134,52 170,72 170,124 C170,176 142,190 100,190 C58,190 30,176 30,124 Z"/>
  </clipPath></defs>
  <ellipse cx="100" cy="196" rx="58" ry="11" fill="rgba(43,33,24,.12)"/>
  <!-- kuyruk -->
  <path d="M150 162 C198 154 196 96 166 84" fill="none" stroke="${OUT}" stroke-width="24" stroke-linecap="round"/>
  <path d="M150 162 C198 154 196 96 166 84" fill="none" stroke="${earTail}" stroke-width="14" stroke-linecap="round"/>
  <!-- kulaklar -->
  <path d="M50 80 L40 20 L98 56 Z" fill="${earTail}" stroke="${OUT}" stroke-width="7" stroke-linejoin="round"/>
  <path d="M150 80 L160 20 L102 56 Z" fill="${earTail}" stroke="${OUT}" stroke-width="7" stroke-linejoin="round"/>
  <path d="M56 70 L51 36 L84 56 Z" fill="#e89ba0"/>
  <path d="M144 70 L149 36 L116 56 Z" fill="#e89ba0"/>
  ${fluff}
  <!-- gövde/kafa -->
  <path d="M30,124 C30,72 66,52 100,52 C134,52 170,72 170,124 C170,176 142,190 100,190 C58,190 30,176 30,124 Z"
        fill="${c.body}" stroke="${OUT}" stroke-width="7"/>
  <g clip-path="url(#${clip})">${pattern}</g>
  ${blush}
  <!-- gözler -->
  <ellipse cx="74" cy="116" rx="15" ry="18" fill="#fff" stroke="${OUT}" stroke-width="4"/>
  <ellipse cx="126" cy="116" rx="15" ry="18" fill="#fff" stroke="${OUT}" stroke-width="4"/>
  <ellipse cx="74" cy="117" rx="8" ry="12" fill="${look.eye}"/>
  <ellipse cx="126" cy="117" rx="8" ry="12" fill="${look.eye2}"/>
  <ellipse cx="74" cy="118" rx="3.4" ry="9" fill="#1c160f"/>
  <ellipse cx="126" cy="118" rx="3.4" ry="9" fill="#1c160f"/>
  <circle cx="70" cy="110" r="3" fill="#fff"/><circle cx="122" cy="110" r="3" fill="#fff"/>
  <!-- burun + ağız -->
  <path d="M93 140 L107 140 L100 149 Z" fill="#d98a8a" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M100 149 q-10 12 -20 4 M100 149 q10 12 20 4" fill="none" stroke="${OUT}" stroke-width="3.5" stroke-linecap="round"/>
  <!-- bıyıklar -->
  <g stroke="${OUT}" stroke-width="2.4" stroke-linecap="round" opacity=".8">
    <path d="M60 138 L26 130"/><path d="M60 146 L24 148"/><path d="M60 154 L28 164"/>
    <path d="M140 138 L174 130"/><path d="M140 146 L176 148"/><path d="M140 154 L172 164"/>
  </g>
  ${accessory}
</svg>`;
  }

  function renderAccessory(rk) {
    if (rk === 'rare') {
      return `<path d="M76 170 q24 16 48 0 l-8 22 q-16 8 -32 0 Z" fill="#c0392b" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>`;
    }
    if (rk === 'epic') {
      return `<path d="M70 44 L82 22 L100 40 L118 22 L130 44 Z" fill="#f2b134" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>
              <circle cx="100" cy="32" r="3.5" fill="#c0392b" stroke="${OUT}" stroke-width="2"/>`;
    }
    if (rk === 'myth') {
      return `<g>
        <path d="M64 40 L80 14 L100 36 L120 14 L136 40 Z" fill="#ffd54a" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>
        <circle cx="80" cy="20" r="3.5" fill="#e85d75" stroke="${OUT}" stroke-width="2"/>
        <circle cx="100" cy="30" r="4" fill="#5aa86a" stroke="${OUT}" stroke-width="2"/>
        <circle cx="120" cy="20" r="3.5" fill="#4a86c5" stroke="${OUT}" stroke-width="2"/>
        <g fill="#ffd54a" stroke="${OUT}" stroke-width="1.5">
          <path d="M30 60 l4 8 8 4 -8 4 -4 8 -4 -8 -8 -4 8 -4 Z"/>
          <path d="M168 70 l3 6 6 3 -6 3 -3 6 -3 -6 -6 -3 6 -3 Z"/>
        </g></g>`;
    }
    return '';
  }

  return {
    create, catSVG, getLook, RARITIES, rarityByKey, STATKEYS, rollRarity, hash, mulberry32,
    coatNames: COATS.map(c => c.n)
  };
})();
