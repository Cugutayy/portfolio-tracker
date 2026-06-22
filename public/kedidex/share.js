/* KediDex — paylaşılabilir kart (PNG) üretimi + paylaşım */
window.KD = window.KD || {};
KD.share = (function () {
  const INK = '#2b2118', CREAM = '#f4ead3', PAPER = '#fbf5e6', SOFT = '#6c5f4c';

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  async function loadSvgImage(svg) {
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    return loadImg(url);
  }
  async function loadImg(url) {
    const img = new Image();
    img.src = url;
    if (img.decode) { try { await img.decode(); } catch (e) {} }
    else await new Promise(res => { img.onload = res; img.onerror = res; });
    return img;
  }
  function coverDraw(ctx, img, x, y, w, h) {
    const ir = img.width / img.height, r = w / h;
    let sw = img.width, sh = img.height, sx = 0, sy = 0;
    if (ir > r) { sw = img.height * r; sx = (img.width - sw) / 2; } else { sh = img.width / r; sy = (img.height - sh) / 2; }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  async function makeCardCanvas(cat, nick) {
    const W = 1080, H = 1350;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    try { await document.fonts.load('800 64px "Baloo 2"'); await document.fonts.ready; } catch (e) {}
    const F = (w, s) => `${w} ${s}px "Baloo 2", system-ui, sans-serif`;

    // zemin
    ctx.fillStyle = CREAM; ctx.fillRect(0, 0, W, H);
    // dış çerçeve
    ctx.lineJoin = 'round';
    rr(ctx, 18, 18, W - 36, H - 36, 50);
    ctx.fillStyle = PAPER; ctx.fill();
    ctx.lineWidth = 14; ctx.strokeStyle = INK; ctx.stroke();

    // başlık
    ctx.textAlign = 'center';
    ctx.fillStyle = INK;
    ctx.font = F(800, 76);
    ctx.fillText('🐾 KediDex', W / 2, 130);
    ctx.font = F(600, 30);
    ctx.fillStyle = SOFT;
    ctx.fillText('S O K A K   K E D İ S İ   A V I', W / 2, 178);

    // nadirlik rengi
    const rar = KD.catgen.rarityByKey(cat.rarity);
    const rcol = rar.color;

    // kedi paneli + (mitik) parıltı
    const px = 320, py = 215, ps = 440;
    if (cat.rarity === 'myth') {
      ctx.save(); ctx.shadowColor = rcol; ctx.shadowBlur = 60;
      rr(ctx, px, py, ps, ps, 36); ctx.fillStyle = '#fff7e2'; ctx.fill();
      ctx.restore();
    }
    rr(ctx, px, py, ps, ps, 36);
    ctx.fillStyle = CREAM; ctx.fill();
    ctx.lineWidth = 10; ctx.strokeStyle = INK; ctx.stroke();
    // nadirlik şeridi
    ctx.save(); rr(ctx, px, py, ps, 26, 12); ctx.clip();
    ctx.fillStyle = rcol; ctx.fillRect(px, py, ps, 30); ctx.restore();

    // kedi çizimi
    try {
      const img = await loadSvgImage(KD.catgen.catSVG(cat, 380));
      ctx.drawImage(img, px + 30, py + 40, ps - 60, ps - 60);
    } catch (e) {}

    // gerçek fotoğraf inseti (varsa)
    if (window.KD && KD.photos && cat.id) {
      try {
        const purl = await KD.photos.get(cat.id);
        if (purl) {
          const pimg = await loadImg(purl);
          const ix = 66, iy = 250, is = 188;
          ctx.save();
          rr(ctx, ix, iy, is, is, 18); ctx.fillStyle = '#fff'; ctx.fill();
          ctx.lineWidth = 8; ctx.strokeStyle = INK; ctx.stroke(); ctx.clip();
          coverDraw(ctx, pimg, ix, iy, is, is);
          ctx.restore();
          ctx.textAlign = 'center'; ctx.fillStyle = INK; ctx.font = F(800, 26);
          ctx.fillText('📷 Gerçek', ix + is / 2, iy + is + 32);
        }
      } catch (e) {}
    }

    // isim
    ctx.fillStyle = INK; ctx.font = F(800, 92);
    ctx.fillText(cat.name, W / 2, py + ps + 110);
    // ünvan
    ctx.fillStyle = SOFT; ctx.font = F(600, 38);
    ctx.fillText(cat.title, W / 2, py + ps + 160);

    // nadirlik rozeti + seviye
    const badgeY = py + ps + 200;
    ctx.font = F(800, 40);
    const bw = ctx.measureText(cat.rarityName).width + 70;
    const bx = W / 2 - bw / 2 - 70;
    rr(ctx, bx, badgeY, bw, 64, 32);
    ctx.fillStyle = rcol; ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillText(cat.rarityName, bx + bw / 2, badgeY + 46);
    // seviye
    rr(ctx, bx + bw + 16, badgeY, 124, 64, 32);
    ctx.fillStyle = PAPER; ctx.fill(); ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = INK; ctx.fillText('Lv.' + cat.level, bx + bw + 16 + 62, badgeY + 46);

    // istatistikler
    let sy = badgeY + 130;
    ctx.textAlign = 'left';
    KD.catgen.STATKEYS.forEach(s => {
      const v = cat.stats[s.k] || 0;
      ctx.fillStyle = INK; ctx.font = F(700, 34);
      ctx.fillText(s.n, 120, sy + 26);
      // bar
      const barX = 360, barW = 480, barH = 30;
      rr(ctx, barX, sy, barW, barH, 15);
      ctx.fillStyle = '#efe2c6'; ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
      ctx.save(); rr(ctx, barX, sy, barW, barH, 15); ctx.clip();
      ctx.fillStyle = '#e8893b'; ctx.fillRect(barX, sy, barW * v / 100, barH);
      ctx.restore();
      ctx.fillStyle = INK; ctx.font = F(800, 32); ctx.textAlign = 'left';
      ctx.fillText(String(v), barX + barW + 24, sy + 26);
      sy += 62;
    });

    // doğrulandı
    ctx.textAlign = 'center';
    if (cat.verified) {
      ctx.fillStyle = '#5aa86a'; ctx.font = F(800, 34);
      ctx.fillText('✓ Gerçek kedi — KediDex doğruladı', W / 2, sy + 24);
    }

    // alt bilgi
    ctx.fillStyle = SOFT; ctx.font = F(700, 32);
    const who = (nick && nick.trim()) ? nick.trim() : 'bir avcı';
    ctx.fillText(`Yakalayan: ${who}  •  snmez.xyz/kedidex`, W / 2, H - 70);

    return cv;
  }

  function downloadBlob(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function tweetText(cat, link) {
    const breed = cat.breed ? (cat.breed === 'van' ? ' (gerçek Van kedisi!)' : ' (gerçek Ankara kedisi!)') : '';
    return `${cat.name} adlı ${cat.rarityName} sokak kedisini${breed} KediDex'te yakaladım! 🐾😺\nSen de sokaktaki kedileri topla 👉 ${link || 'snmez.xyz/kedidex'}`;
  }

  async function shareCat(cat, nick) {
    let cv = null, blob = null;
    try {
      cv = await makeCardCanvas(cat, nick);
      blob = await new Promise(res => cv.toBlob(res, 'image/png'));
    } catch (e) { cv = null; blob = null; }

    // showcase için küçük JPEG yükle -> link X'te karta açılır
    let link = 'snmez.xyz/kedidex';
    if (cv && window.KD && KD.api && cat.id) {
      try {
        const small = document.createElement('canvas'); small.width = 600; small.height = 750;
        small.getContext('2d').drawImage(cv, 0, 0, 600, 750);
        const up = await KD.api.uploadCard(cat.id, small.toDataURL('image/jpeg', 0.82));
        if (up && up.ok) link = location.host + '/c/' + cat.id;
      } catch (e) {}
    }

    const text = tweetText(cat, link);
    const fname = `kedidex-${(cat.name || 'kedi').toLowerCase()}.png`;

    // Mobil: native paylaşım (görseli X/WhatsApp/Instagram'a ekler)
    if (blob && navigator.canShare) {
      const file = new File([blob], fname, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], text }); return { ok: true, method: 'native' }; }
        catch (e) { if (e && e.name === 'AbortError') return { ok: false, method: 'cancel' }; }
      }
    }
    // Masaüstü: kartı indir + X paylaşım penceresi
    if (blob) downloadBlob(blob, fname);
    window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text), '_blank', 'noopener');
    return { ok: true, method: 'download+intent' };
  }

  return { makeCardCanvas, shareCat };
})();
