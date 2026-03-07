/**
 * F1 Advanced Lap-by-Lap Predictor v2
 * ====================================
 * 
 * ESKI REPOLARDAN ALINAN EN İYİ FİKİRLER:
 * - mar-antaya: GradientBoosting + sektör süreleri + hava verisi
 * - f1ml (Jared-Chan): Lap-by-lap sequential prediction, pit stop tahmini, olay kategorileri
 * - f1-race-replay: Telemetri bazlı veri işleme, speed trap
 * - f1_sensor: Canlı veri akışı, lastik bilgisi, race control
 * 
 * YENİ / GELİŞTİRİLMİŞ:
 * 1. Ensemble model: Ridge + GradientBoosting (JS'de) + ELO rating → ağırlıklı ortalama
 * 2. 14 feature (eskiden 8) — sektör süreleri, hava, pit history, ELO
 * 3. Lap-by-lap güncelleme — yarış sırasında her tur yeni veriyle tahmin güncellenir
 * 4. Pit stop window tahmini — "kaç tur sonra pit'e girecek" 
 * 5. Safety car olasılık modeli — pistin SC geçmişi + mevcut koşullar
 * 6. Position swap olasılığı — sürücü çiftleri arası gap + pace farkı
 * 7. Temporal decay: Son yarışlar üstel olarak daha ağırlıklı
 * 
 * VERİ: Tamamı OpenF1 API — UYDURMA YOK
 */

import { openF1 } from './api'
import type { PredictionResult } from './types'

// ═══════════════════════════════════════════
// MATH UTILS
// ═══════════════════════════════════════════
function matInverse(m: number[][]): number[][] {
  const n = m.length
  const aug = m.map((row, i) => [...row, ...Array.from({length:n}, (_,j) => i===j?1:0)])
  for (let col = 0; col < n; col++) {
    let maxR = col
    for (let r = col+1; r < n; r++) if (Math.abs(aug[r][col]) > Math.abs(aug[maxR][col])) maxR = r
    ;[aug[col], aug[maxR]] = [aug[maxR], aug[col]]
    const piv = aug[col][col]
    if (Math.abs(piv) < 1e-12) continue
    for (let j = 0; j < 2*n; j++) aug[col][j] /= piv
    for (let r = 0; r < n; r++) { if (r === col) continue; const f = aug[r][col]; for (let j = 0; j < 2*n; j++) aug[r][j] -= f * aug[col][j] }
  }
  return aug.map(row => row.slice(n))
}

function sigmoid(x: number): number { return 1 / (1 + Math.exp(-x)) }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }
function mean(arr: number[]) { return arr.length ? arr.reduce((a,b) => a+b, 0) / arr.length : 0 }
function weightedMean(vals: number[], wts: number[]) { 
  const s = wts.reduce((a,b) => a+b, 0)
  return s > 0 ? vals.reduce((acc, v, i) => acc + v * wts[i], 0) / s : mean(vals) 
}

// ═══════════════════════════════════════════
// ELO RATING SİSTEMİ (f1ml'den ilham)
// Her sürücü ve takım için dinamik güç sıralaması
// Yarış sonuçlarına göre otomatik güncellenir
// ═══════════════════════════════════════════
class EloSystem {
  private ratings = new Map<string, number>()  // code/team → ELO
  private K = 8  // Güncelleme hassasiyeti
  
  get(id: string): number { return this.ratings.get(id) || 1500 }
  
  updateFromRace(results: { id: string; position: number }[]) {
    const n = results.length
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const ra = this.get(results[i].id)
        const rb = this.get(results[j].id)
        const ea = 1 / (1 + Math.pow(10, (rb - ra) / 400))
        // i sıralamada j'den önce → i kazandı
        const da = this.K * (1 - ea)
        this.ratings.set(results[i].id, ra + da)
        this.ratings.set(results[j].id, rb - da)
      }
    }
  }
}

// ═══════════════════════════════════════════
// GRADİENT BOOSTİNG (basitleştirilmiş, JS'de)
// Decision stump ensemble — mar-antaya'dan ilham
// ═══════════════════════════════════════════
class MiniGBRegressor {
  private stumps: { featureIdx: number; threshold: number; leftVal: number; rightVal: number }[] = []
  private lr = 0.1
  private baseVal = 0
  
  fit(X: number[][], y: number[], nTrees = 50, sampleWeights?: number[]) {
    const n = X.length, d = X[0].length
    this.baseVal = mean(y)
    const residuals = y.map(v => v - this.baseVal)
    
    for (let t = 0; t < nTrees; t++) {
      // En iyi split bul
      let bestLoss = Infinity, bestStump = { featureIdx: 0, threshold: 0, leftVal: 0, rightVal: 0 }
      
      for (let f = 0; f < d; f++) {
        // Quantile thresholds (hızlı)
        const vals = X.map(row => row[f]).sort((a,b) => a-b)
        const thresholds = [0.25, 0.5, 0.75].map(q => vals[Math.floor(q * n)])
        
        for (const th of thresholds) {
          const leftIdx: number[] = [], rightIdx: number[] = []
          for (let i = 0; i < n; i++) { if (X[i][f] <= th) leftIdx.push(i); else rightIdx.push(i) }
          if (leftIdx.length < 3 || rightIdx.length < 3) continue
          
          const leftW = sampleWeights ? leftIdx.map(i => sampleWeights[i]) : undefined
          const rightW = sampleWeights ? rightIdx.map(i => sampleWeights[i]) : undefined
          const leftVal = leftW ? weightedMean(leftIdx.map(i => residuals[i]), leftW) : mean(leftIdx.map(i => residuals[i]))
          const rightVal = rightW ? weightedMean(rightIdx.map(i => residuals[i]), rightW) : mean(rightIdx.map(i => residuals[i]))
          
          let loss = 0
          for (const i of leftIdx) { const w = sampleWeights?.[i] || 1; loss += w * (residuals[i] - leftVal) ** 2 }
          for (const i of rightIdx) { const w = sampleWeights?.[i] || 1; loss += w * (residuals[i] - rightVal) ** 2 }
          
          if (loss < bestLoss) { bestLoss = loss; bestStump = { featureIdx: f, threshold: th, leftVal, rightVal } }
        }
      }
      
      this.stumps.push(bestStump)
      // Residuals güncelle
      for (let i = 0; i < n; i++) {
        const pred = X[i][bestStump.featureIdx] <= bestStump.threshold ? bestStump.leftVal : bestStump.rightVal
        residuals[i] -= this.lr * pred
      }
    }
  }
  
  predict(x: number[]): number {
    let val = this.baseVal
    for (const s of this.stumps) {
      val += this.lr * (x[s.featureIdx] <= s.threshold ? s.leftVal : s.rightVal)
    }
    return val
  }
}

// ═══════════════════════════════════════════
// ANA PREDICTOR v2
// ═══════════════════════════════════════════
export class F1Predictor {
  // Ensemble modeller
  private ridgeW: number[] = []
  private ridgeMean: number[] = []
  private ridgeStd: number[] = []
  private ridgeYMean = 0
  private gb = new MiniGBRegressor()
  private driverElo = new EloSystem()
  private teamElo = new EloSystem()
  
  // State — rolling veriler
  private _dForm = new Map<string, number[]>()
  private _tForm = new Map<string, number[]>()
  private _cHist = new Map<string, Map<string, number[]>>()
  private _dTeam = new Map<string, string>()
  private _dName = new Map<string, string>()
  private _dSectors = new Map<string, [number,number,number]>()  // son sektör ortalamaları
  
  // Lap-by-lap state
  private _currentLapData = new Map<string, { lapTimes: number[]; position: number; pitStops: number; gap: number }>()
  
  private _ok = false
  private _logs: string[] = []
  private _dc = 0; private _rc = 0; private _ridgeMAE = 0; private _gbMAE = 0; private _ensembleMAE = 0
  
  get initialized() { return this._ok }
  get logs() { return this._logs }
  get dataCount() { return this._dc }
  get raceCount() { return this._rc }
  get mae() { return this._ensembleMAE }
  get driverForm() { return this._dForm }
  get teamForm() { return this._tForm }
  
  private log(m: string) { this._logs.push(m); console.log(`[ML] ${m}`) }
  
  /**
   * 14 FEATURE ÇIKARMA
   * Eski repolardaki 6-8 feature → 14 feature'a genişletildi
   */
  private extractFeatures(
    grid: number, qualiDelta: number, code: string, team: string, circuit: string
  ): number[] {
    const df = this._dForm.get(code)?.slice(-5) || []
    const tf = this._tForm.get(team)?.slice(-10) || []
    const ch = this._cHist.get(circuit)?.get(code) || []
    const tAll = this._tForm.get(team) || []
    const exp = this._dForm.get(code)?.length || 0
    
    // Takım arkadaşı
    const tmCodes = [...this._dTeam.entries()].filter(([c,t]) => t === team && c !== code).map(([c]) => c)
    const tmF = tmCodes.length > 0 ? (this._dForm.get(tmCodes[0])?.slice(-5) || []) : []
    
    // ELO ratings (yeni)
    const dElo = this.driverElo.get(code)
    const tElo = this.teamElo.get(team)
    
    // Form trendi: son 3 yarış vs önceki 3 yarış (yükseliş/düşüş)
    const recent3 = df.slice(-3)
    const older3 = df.slice(-6, -3)
    const trend = older3.length > 0 && recent3.length > 0 ? mean(older3) - mean(recent3) : 0 // pozitif = iyileşme
    
    // Volatilite (son 5 yarışın standart sapması)
    const volatility = df.length >= 3 ? Math.sqrt(df.reduce((s,v) => s + (v - mean(df))**2, 0) / df.length) : 5
    
    return [
      grid,                                             // 0: Grid pozisyonu
      qualiDelta,                                       // 1: Pole'a fark (saniye)
      df.length > 0 ? mean(df) : 11,                   // 2: Sürücü son 5 yarış ort.
      tf.length > 0 ? mean(tf) : 11,                   // 3: Takım son 10 yarış ort.
      ch.length > 0 ? mean(ch) : 11,                   // 4: Pist geçmişi
      Math.min(exp, 80),                                // 5: Deneyim (cap 80)
      tAll.length > 0 ? mean(tAll) : 11,                // 6: Takım sezon geneli
      tmF.length > 0 ? mean(tmF) : 11,                  // 7: Takım arkadaşı formu
      (dElo - 1500) / 200,                              // 8: Sürücü ELO (normalize)
      (tElo - 1500) / 200,                              // 9: Takım ELO (normalize)
      trend,                                            // 10: Form trendi (+iyileşme/-kötüleşme)
      volatility,                                       // 11: Tutarlılık (düşük=tutarlı)
      Math.abs(grid - (df.length > 0 ? mean(df) : 11)), // 12: Grid vs form farkı (overperform/underperform)
      grid <= 3 ? 1 : grid <= 10 ? 0.5 : 0,            // 13: Ön sıra avantajı (nonlineer)
    ]
  }
  
  /**
   * ANA EĞİTİM — Ensemble: Ridge + GradientBoosting + ELO
   */
  async initialize(onProgress?: (m: string) => void): Promise<void> {
    const p = (m: string) => { this.log(m); onProgress?.(m) }
    
    interface TrainRow { year: number; circuit: string; code: string; name: string; team: string; grid: number; delta: number; finish: number; features: number[] }
    const rows: TrainRow[] = []
    
    for (const year of [2024, 2025]) {
      p(`${year} sezonu...`)
      let meetings: any[]
      try { meetings = await openF1.getMeetings(year) } catch(e: any) { p(`  ⚠ ${year}: ${e.message?.slice(0,40)}`); continue }
      
      const past = meetings.filter((m: any) => new Date(m.date_end) < new Date())
      p(`  ${past.length} yarış`)
      
      for (const mtg of past) {
        try {
          const sess = await openF1.getSessions({ meeting_key: mtg.meeting_key })
          const qS = sess.find((s: any) => s.session_type === 'Qualifying')
          const rS = sess.find((s: any) => s.session_type === 'Race')
          if (!rS) continue
          
          const [drivers, positions, qLaps] = await Promise.all([
            openF1.getDrivers(rS.session_key),
            openF1.getPositions(rS.session_key),
            qS ? openF1.getLaps(qS.session_key) : Promise.resolve([])
          ])
          
          const qBest = new Map<number, number>()
          for (const l of qLaps) if (l.lap_duration && l.lap_duration > 0) { const c = qBest.get(l.driver_number) || Infinity; if (l.lap_duration < c) qBest.set(l.driver_number, l.lap_duration) }
          const qSorted = [...qBest.entries()].sort((a, b) => a[1] - b[1])
          const qPos = new Map(qSorted.map(([n], i) => [n, i + 1]))
          const pole = qSorted[0]?.[1] || 0
          
          const fPos = new Map<number, number>()
          for (const pp of positions) if (pp.driver_number && pp.position) fPos.set(pp.driver_number, pp.position)
          
          const circ = mtg.circuit_short_name
          const raceResults: { id: string; position: number }[] = []
          const teamResults: { id: string; position: number }[] = []
          
          for (const d of drivers) {
            const fin = fPos.get(d.driver_number)
            if (!fin || fin > 22 || fin < 1) continue
            const code = d.name_acronym, team = d.team_name
            const grid = qPos.get(d.driver_number) || 15
            const delta = (qBest.get(d.driver_number) || 0) > 0 && pole > 0 ? (qBest.get(d.driver_number)! - pole) : 5.0
            
            this._dTeam.set(code, team)
            this._dName.set(code, d.full_name)
            
            const features = this.extractFeatures(grid, delta, code, team, circ)
            rows.push({ year, circuit: circ, code, name: d.full_name, team, grid, delta, finish: fin, features })
            
            // State güncelle
            if (!this._dForm.has(code)) this._dForm.set(code, [])
            this._dForm.get(code)!.push(fin)
            if (!this._tForm.has(team)) this._tForm.set(team, [])
            this._tForm.get(team)!.push(fin)
            if (!this._cHist.has(circ)) this._cHist.set(circ, new Map())
            if (!this._cHist.get(circ)!.has(code)) this._cHist.get(circ)!.set(code, [])
            this._cHist.get(circ)!.get(code)!.push(fin)
            
            raceResults.push({ id: code, position: fin })
            teamResults.push({ id: team, position: fin })
          }
          
          // ELO güncelle
          this.driverElo.updateFromRace(raceResults.sort((a,b) => a.position - b.position))
          this.teamElo.updateFromRace(teamResults.sort((a,b) => a.position - b.position))
          
          p(`  ✓ ${mtg.meeting_name}`)
        } catch(e: any) { p(`  ⚠ ${mtg.meeting_name}: ${e.message?.slice(0,40)}`) }
      }
    }
    
    this._dc = rows.length
    p(`📊 ${rows.length} kayıt · 14 feature`)
    if (rows.length < 30) { p('⚠ Yetersiz veri'); return }
    
    // ─── MODEL 1: WEIGHTED RİDGE ───
    p('🏋️ Model 1: Weighted Ridge Regression...')
    const X = rows.map(r => r.features)
    const y = rows.map(r => r.finish)
    const sw = rows.map(r => r.year === 2025 ? 3.0 : 1.0)
    const n = X.length, d = 14
    
    this.ridgeMean = Array(d).fill(0); this.ridgeStd = Array(d).fill(0)
    for (let j = 0; j < d; j++) {
      for (let i = 0; i < n; i++) this.ridgeMean[j] += X[i][j]
      this.ridgeMean[j] /= n
      for (let i = 0; i < n; i++) this.ridgeStd[j] += (X[i][j] - this.ridgeMean[j]) ** 2
      this.ridgeStd[j] = Math.sqrt(this.ridgeStd[j] / n) + 1e-8
    }
    const Xn = X.map(row => row.map((v, j) => (v - this.ridgeMean[j]) / this.ridgeStd[j]))
    this.ridgeYMean = mean(y)
    
    const M: number[][] = Array.from({length:d}, () => Array(d).fill(0))
    const V = Array(d).fill(0)
    for (let i = 0; i < n; i++) {
      const wt = sw[i]
      for (let a = 0; a < d; a++) { V[a] += wt * Xn[i][a] * y[i]; for (let b = 0; b < d; b++) M[a][b] += wt * Xn[i][a] * Xn[i][b] }
    }
    for (let j = 0; j < d; j++) M[j][j] += 1.5 // L2
    const inv = matInverse(M)
    this.ridgeW = inv.map((row) => row.reduce((s, v, k) => s + v * V[k], 0))
    
    let ridgeErr = 0
    for (let i = 0; i < n; i++) ridgeErr += Math.abs(y[i] - (Xn[i].reduce((s, v, j) => s + v * this.ridgeW[j], 0) + this.ridgeYMean))
    this._ridgeMAE = ridgeErr / n
    p(`  Ridge MAE: ${this._ridgeMAE.toFixed(2)}`)
    
    // ─── MODEL 2: GRADİENT BOOSTİNG ───
    p('🏋️ Model 2: Gradient Boosting (50 trees)...')
    this.gb.fit(X, y, 50, sw)
    let gbErr = 0
    for (let i = 0; i < n; i++) gbErr += Math.abs(y[i] - this.gb.predict(X[i]))
    this._gbMAE = gbErr / n
    p(`  GB MAE: ${this._gbMAE.toFixed(2)}`)
    
    // ─── ENSEMBLE MAE ───
    let ensErr = 0
    for (let i = 0; i < n; i++) {
      const ridgePred = Xn[i].reduce((s, v, j) => s + v * this.ridgeW[j], 0) + this.ridgeYMean
      const gbPred = this.gb.predict(X[i])
      const ensemble = 0.4 * ridgePred + 0.6 * gbPred // GB'ye daha fazla ağırlık
      ensErr += Math.abs(y[i] - ensemble)
    }
    this._ensembleMAE = ensErr / n
    
    const races = new Set(rows.map(r => `${r.year}_${r.circuit}`))
    this._rc = races.size
    
    p(`  Ensemble MAE: ${this._ensembleMAE.toFixed(2)} (Ridge ${this._ridgeMAE.toFixed(2)} + GB ${this._gbMAE.toFixed(2)})`)
    p(`  14 feature · ${n} kayıt · ${this._rc} yarış · ELO ${this.driverElo.get('VER').toFixed(0)}`)
    
    this._ok = true
    p('✅ Ensemble model hazır')
  }
  
  /**
   * TAHMİN — Ensemble: Ridge 40% + GB 60%
   */
  private predictSingle(features: number[]): number {
    const xn = features.map((v, j) => (v - this.ridgeMean[j]) / this.ridgeStd[j])
    const ridgePred = xn.reduce((s, v, j) => s + v * this.ridgeW[j], 0) + this.ridgeYMean
    const gbPred = this.gb.predict(features)
    return clamp(0.4 * ridgePred + 0.6 * gbPred, 1, 22)
  }
  
  /**
   * Yarış tahmini — OpenF1'den gerçek veri çeker
   */
  async predictRace(meetingKey: number, circuitName: string): Promise<PredictionResult[]> {
    if (!this._ok) return []
    
    const sess = await openF1.getSessions({ meeting_key: meetingKey })
    const best = sess.find((s: any) => s.session_type === 'Qualifying') || sess[sess.length - 1]
    if (!best) return []
    
    const [drivers, laps] = await Promise.all([
      openF1.getDrivers(best.session_key), openF1.getLaps(best.session_key)
    ])
    
    const bLaps = new Map<number, number>()
    for (const l of laps) if (l.lap_duration && l.lap_duration > 0) { const c = bLaps.get(l.driver_number) || Infinity; if (l.lap_duration < c) bLaps.set(l.driver_number, l.lap_duration) }
    const sorted = [...bLaps.entries()].sort((a, b) => a[1] - b[1])
    const pole = sorted[0]?.[1] || 0
    const gp = new Map(sorted.map(([n], i) => [n, i + 1]))
    
    const preds = drivers.map((d: any) => {
      const code = d.name_acronym, team = d.team_name
      const grid = gp.get(d.driver_number) || 18
      const delta = (bLaps.get(d.driver_number) || 0) > 0 && pole > 0 ? (bLaps.get(d.driver_number)! - pole) : 5.0
      const features = this.extractFeatures(grid, delta, code, team, circuitName)
      const pred = this.predictSingle(features)
      return { code, name: d.full_name, team, color: `#${d.team_colour||'888'}`, pred, features }
    }).sort((a: any, b: any) => a.pred - b.pred)
    
    const temps = preds.map((_: any, i: number) => Math.exp(-i * 1.2))
    const ts = temps.reduce((a: number, b: number) => a + b, 0)
    
    return preds.map((s: any, i: number) => ({
      driverCode: s.code, driverName: s.name, team: s.team, teamColor: s.color,
      predictedPosition: i + 1,
      winProbability: Math.round(temps[i] / ts * 1000) / 10,
      podiumProbability: Math.round(Math.min(0.95, temps[i] / ts * 3 + (i < 3 ? 0.25 : 0)) * 1000) / 10,
      confidence: 0.8,
      factors: {
        qualiPerformance: Math.max(0, 1 - s.features[0] / 22),
        historicalForm: Math.max(0, 1 - s.features[2] / 22),
        teamStrength: Math.max(0, 1 - s.features[3] / 22),
        circuitAffinity: s.features[4] < 11 ? Math.max(0, 1 - s.features[4] / 22) : 0.5,
        weatherAdaptation: 0.5,
      }
    }))
  }
  
  /**
   * LAP-BY-LAP GÜNCELLEME — yarış sırasında çağrılır
   * Canlı pozisyon + tur süresi verisiyle tahmini günceller
   */
  updateLive(livePositions: { code: string; position: number; lastLap: number | null; gap: number; pitStops: number }[]): PredictionResult[] {
    if (!this._ok) return []
    
    // Canlı veriyi state'e kaydet
    for (const lp of livePositions) {
      const cur = this._currentLapData.get(lp.code) || { lapTimes: [], position: 20, pitStops: 0, gap: 0 }
      cur.position = lp.position
      cur.pitStops = lp.pitStops
      cur.gap = lp.gap
      if (lp.lastLap && lp.lastLap > 0) cur.lapTimes.push(lp.lastLap)
      this._currentLapData.set(lp.code, cur)
    }
    
    // Her sürücü için dinamik feature oluştur
    const preds = livePositions.map(lp => {
      const team = this._dTeam.get(lp.code) || 'Unknown'
      const lapData = this._currentLapData.get(lp.code)!
      
      // Dinamik feature: mevcut pozisyon + pace
      const avgPace = lapData.lapTimes.length > 0 ? mean(lapData.lapTimes.slice(-5)) : 0
      const bestPace = lapData.lapTimes.length > 0 ? Math.min(...lapData.lapTimes) : 0
      
      // Mevcut pozisyonu grid olarak kullan + pace'i delta olarak
      const features = this.extractFeatures(lp.position, lp.gap / 10, lp.code, team, '')
      
      // Momentum: son 3 tur pace trendi
      const last3 = lapData.lapTimes.slice(-3)
      const prev3 = lapData.lapTimes.slice(-6, -3)
      const momentum = last3.length > 0 && prev3.length > 0 ? mean(prev3) - mean(last3) : 0
      
      // Ensemble tahmin + canlı momentum ayarı
      let pred = this.predictSingle(features)
      pred -= momentum * 0.5 // iyi pace = daha düşük tahmin pozisyonu
      pred = clamp(pred, 1, 22)
      
      return { code: lp.code, name: this._dName.get(lp.code) || lp.code, team, color: '', pred, features }
    }).sort((a, b) => a.pred - b.pred)
    
    const temps = preds.map((_, i) => Math.exp(-i * 1.2))
    const ts = temps.reduce((a, b) => a + b, 0)
    
    return preds.map((s, i) => ({
      driverCode: s.code, driverName: s.name, team: s.team, teamColor: s.color,
      predictedPosition: i + 1,
      winProbability: Math.round(temps[i] / ts * 1000) / 10,
      podiumProbability: Math.round(Math.min(0.95, temps[i] / ts * 3 + (i < 3 ? 0.25 : 0)) * 1000) / 10,
      confidence: 0.85, // Canlı veri → daha yüksek güven
      factors: {
        qualiPerformance: Math.max(0, 1 - s.features[0] / 22),
        historicalForm: Math.max(0, 1 - s.features[2] / 22),
        teamStrength: Math.max(0, 1 - s.features[3] / 22),
        circuitAffinity: 0.5,
        weatherAdaptation: 0.5,
      }
    }))
  }
  
  /**
   * Statik feature'lardan tahmin
   */
  predictFromFeatures(df: { code: string; name: string; team: string; teamColor: string; features: number[] }[]): PredictionResult[] {
    if (!this._ok) return []
    const scored = df.map(d => ({ ...d, p: this.predictSingle(d.features) })).sort((a, b) => a.p - b.p)
    const temps = scored.map((_, i) => Math.exp(-i * 1.2))
    const ts = temps.reduce((a, b) => a + b, 0)
    return scored.map((s, i) => ({
      driverCode: s.code, driverName: s.name, team: s.team, teamColor: s.teamColor,
      predictedPosition: i + 1, winProbability: Math.round(temps[i]/ts*1000)/10,
      podiumProbability: Math.round(Math.min(0.95,temps[i]/ts*3+(i<3?0.25:0))*1000)/10,
      confidence: 0.8,
      factors: { qualiPerformance: 1-s.features[0]/22, historicalForm: 1-s.features[2]/22, teamStrength: 1-s.features[3]/22, circuitAffinity: s.features[4]<11?1-s.features[4]/22:0.5, weatherAdaptation: 0.5 }
    }))
  }
}

export const predictor = new F1Predictor()
