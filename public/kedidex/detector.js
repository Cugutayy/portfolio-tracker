/* KediDex — cihaz-üstü gerçek kedi tanıma + canlılık (anti-hile) kontrolü
   COCO-SSD ile 'cat' sınıfını arar. Hileyi zorlaştırmak için:
   - tanıma yalnızca CANLI kamera akışından yapılır (dosya yükleme yolu yok)
   - kedinin birkaç kare boyunca SÜREKLİ görünmesi gerekir
   - kutu konumunda doğal mikro-hareket (canlılık) aranır; kıpırtısız bir
     basılı fotoğraf/ekran görüntüsü 'canlı' sayılmaz
*/
window.KD = window.KD || {};
KD.detector = (function () {
  let model = null, loading = null;

  async function load() {
    if (model) return model;
    if (!loading) loading = cocoSsd.load({ base: 'lite_mobilenet_v2' });
    model = await loading;
    return model;
  }

  // canlılık takipçisi
  function makeTracker(opts = {}) {
    const minScore = opts.minScore ?? 0.5;
    const needFrames = opts.needFrames ?? 10;   // sürekli görünme
    const win = opts.window ?? 14;              // hareket penceresi
    const motionMin = opts.motionMin ?? 2.2;    // min ortalama oynama (px)
    const energyMin = opts.energyMin ?? 1.4;    // min bölge doku değişimi (anti-donuk-foto)
    let hits = 0;
    const centers = [];

    // bölge-hareket enerjisi (kare-arası gri ton farkı) — donuk ekran görüntüsünü eler
    const ecv = (typeof document !== 'undefined') ? document.createElement('canvas') : null;
    if (ecv) { ecv.width = 32; ecv.height = 24; }
    const ectx = ecv ? ecv.getContext('2d', { willReadFrequently: true }) : null;
    let prevGray = null;

    function regionEnergy(video, b) {
      if (!ectx || !video) return 0;
      try {
        const [x, y, w, h] = b;
        ectx.drawImage(video, Math.max(0, x), Math.max(0, y), Math.max(1, w), Math.max(1, h), 0, 0, 32, 24);
        const d = ectx.getImageData(0, 0, 32, 24).data;
        const gray = new Float32Array(32 * 24);
        for (let i = 0, j = 0; i < d.length; i += 4, j++) gray[j] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        let energy = 0;
        if (prevGray) { for (let j = 0; j < gray.length; j++) energy += Math.abs(gray[j] - prevGray[j]); energy /= gray.length; }
        prevGray = gray;
        return energy;
      } catch (e) { return 0; }
    }

    function push(predictions, video) {
      const cats = predictions
        .filter(p => p.class === 'cat' && p.score >= minScore)
        .sort((a, b) => b.score - a.score);

      if (!cats.length) {
        hits = Math.max(0, hits - 2);
        centers.length = 0;
        prevGray = null;
        return { state: 'searching', box: null, score: 0, progress: hits / needFrames };
      }

      const b = cats[0].bbox; // [x,y,w,h]
      const cx = b[0] + b[2] / 2, cy = b[1] + b[3] / 2;
      centers.push([cx, cy]);
      if (centers.length > win) centers.shift();
      hits = Math.min(needFrames + 4, hits + 1);

      // 1) kutu merkezi hareketi
      let motion = 0;
      for (let i = 1; i < centers.length; i++) {
        motion += Math.hypot(centers[i][0] - centers[i - 1][0], centers[i][1] - centers[i - 1][1]);
      }
      motion = centers.length > 1 ? motion / (centers.length - 1) : 0;

      // 2) bölge doku enerjisi (canlılık)
      const energy = regionEnergy(video, b);

      const sustained = hits >= needFrames;
      // canlı: kutu oynuyor VEYA bölge dokusu değişiyor (ikisi de ~0 ise donuk foto)
      const live = (motion >= motionMin || energy >= energyMin)
        && centers.length >= Math.min(win, needFrames);

      let state = 'found';
      if (sustained && live) state = 'ready';

      return { state, box: b, score: cats[0].score, motion, energy, live, progress: Math.min(1, hits / needFrames) };
    }
    function reset() { hits = 0; centers.length = 0; prevGray = null; }
    return { push, reset, regionEnergy };
  }

  async function detect(video) {
    const m = await load();
    return m.detect(video);
  }

  return { load, detect, makeTracker };
})();
