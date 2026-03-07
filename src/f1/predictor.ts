/**
 * F1 Race Predictor — Hızlı ML Modeli
 * ====================================
 * 
 * HIZLI YAKLAŞIM:
 * - Sadece 2025 sezonu detaylı çekilir (en güncel, en ağırlıklı)
 * - 2024 sezonu hafif çekilir (sadece pozisyonlar)
 * - 2023 atlanır (çok eski, az etkili)
 * - Toplam: ~25 yarış × 3 istek = ~75 istek (eskiden 300+)
 * 
 * MODEL: Weighted Ridge Regression
 * TEMPORAL: 2025=3x, 2024=1x
 * 
 * FEATURE'LAR (8 adet, tümü gerçek veriden):
 * 1. grid_position — sıralama sırası
 * 2. quali_delta — pole'a fark (saniye)
 * 3. driver_form — sürücünün son 5 yarış ort. bitişi
 * 4. team_form — takımın son 10 yarış ort. bitişi
 * 5. circuit_history — bu pistteki geçmiş ortalama
 * 6. experience — toplam yarış deneyimi
 * 7. team_season_avg — takım sezon geneli ortalama
 * 8. teammate_form — takım arkadaşı performansı
 */

import { openF1 } from './api'
import type { PredictionResult } from './types'

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
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const f = aug[r][col]
      for (let j = 0; j < 2*n; j++) aug[r][j] -= f * aug[col][j]
    }
  }
  return aug.map(row => row.slice(n))
}

interface Row {
  year: number; circuit: string; code: string; name: string; team: string
  grid: number; delta: number; finish: number
  f1: number; f2: number; f3: number; f4: number; f5: number; f6: number
}

export class F1Predictor {
  private w: number[] = []
  private fMean: number[] = []
  private fStd: number[] = []
  private yMean = 0
  
  // State
  private _dForm = new Map<string, number[]>()
  private _tForm = new Map<string, number[]>()
  private _cHist = new Map<string, Map<string, number[]>>()
  private _dTeam = new Map<string, string>()
  private _dName = new Map<string, string>()
  
  private _ok = false
  private _logs: string[] = []
  private _dc = 0; private _rc = 0; private _mae = 0
  
  get initialized() { return this._ok }
  get logs() { return this._logs }
  get dataCount() { return this._dc }
  get raceCount() { return this._rc }
  get mae() { return this._mae }
  get driverForm() { return this._dForm }
  get teamForm() { return this._tForm }
  
  private log(m: string) { this._logs.push(m); console.log(`[ML] ${m}`) }
  
  /**
   * HIZLI EĞİTİM — sadece 2024-2025 (max 50 yarış, ~2-3 dakika)
   */
  async initialize(onProgress?: (m: string) => void): Promise<void> {
    const p = (m: string) => { this.log(m); onProgress?.(m) }
    const rows: Row[] = []
    
    // Sadece 2024 ve 2025 — hızlı
    for (const year of [2024, 2025]) {
      p(`${year} sezonu...`)
      let meetings: any[]
      try { meetings = await openF1.getMeetings(year) } catch(e: any) { p(`  ⚠ ${year}: ${e.message?.slice(0,40)}`); continue }
      
      const past = meetings.filter((m: any) => new Date(m.date_end) < new Date())
      p(`  ${past.length} yarış bulundu`)
      
      for (const mtg of past) {
        try {
          const sess = await openF1.getSessions({ meeting_key: mtg.meeting_key })
          const qS = sess.find((s: any) => s.session_type === 'Qualifying')
          const rS = sess.find((s: any) => s.session_type === 'Race')
          if (!rS) continue
          
          // Paralel çek — HIZLI
          const [drivers, positions, qLaps] = await Promise.all([
            openF1.getDrivers(rS.session_key),
            openF1.getPositions(rS.session_key),
            qS ? openF1.getLaps(qS.session_key) : Promise.resolve([])
          ])
          
          // Quali best laps
          const qBest = new Map<number, number>()
          for (const l of qLaps) {
            if (l.lap_duration && l.lap_duration > 0) {
              const c = qBest.get(l.driver_number) || Infinity
              if (l.lap_duration < c) qBest.set(l.driver_number, l.lap_duration)
            }
          }
          const qSorted = [...qBest.entries()].sort((a, b) => a[1] - b[1])
          const qPos = new Map(qSorted.map(([n], i) => [n, i + 1]))
          const pole = qSorted[0]?.[1] || 0
          
          // Final positions
          const fPos = new Map<number, number>()
          for (const pp of positions) if (pp.driver_number && pp.position) fPos.set(pp.driver_number, pp.position)
          
          const circ = mtg.circuit_short_name
          for (const d of drivers) {
            const fin = fPos.get(d.driver_number)
            if (!fin || fin > 22 || fin < 1) continue
            const code = d.name_acronym, team = d.team_name
            const grid = qPos.get(d.driver_number) || 15
            const qt = qBest.get(d.driver_number) || 0
            const dlt = qt > 0 && pole > 0 ? qt - pole : 5.0
            
            const df = this._dForm.get(code)?.slice(-5) || []
            const tf = this._tForm.get(team)?.slice(-10) || []
            const ch = this._cHist.get(circ)?.get(code) || []
            const tmEntries = drivers.filter((td: any) => td.team_name === team && td.name_acronym !== code)
            const tmF = tmEntries.length > 0 ? (this._dForm.get(tmEntries[0].name_acronym)?.slice(-5) || []) : []
            const tAll = this._tForm.get(team) || []
            
            rows.push({
              year, circuit: circ, code, name: d.full_name, team, grid, delta: dlt, finish: fin,
              f1: df.length > 0 ? df.reduce((a,b) => a+b,0)/df.length : 11,
              f2: tf.length > 0 ? tf.reduce((a,b) => a+b,0)/tf.length : 11,
              f3: ch.length > 0 ? ch.reduce((a,b) => a+b,0)/ch.length : 11,
              f4: this._dForm.get(code)?.length || 0,
              f5: tAll.length > 0 ? tAll.reduce((a,b) => a+b,0)/tAll.length : 11,
              f6: tmF.length > 0 ? tmF.reduce((a,b) => a+b,0)/tmF.length : 11,
            })
            
            if (!this._dForm.has(code)) this._dForm.set(code, [])
            this._dForm.get(code)!.push(fin)
            if (!this._tForm.has(team)) this._tForm.set(team, [])
            this._tForm.get(team)!.push(fin)
            if (!this._cHist.has(circ)) this._cHist.set(circ, new Map())
            if (!this._cHist.get(circ)!.has(code)) this._cHist.get(circ)!.set(code, [])
            this._cHist.get(circ)!.get(code)!.push(fin)
            this._dTeam.set(code, team)
            this._dName.set(code, d.full_name)
          }
          p(`  ✓ ${mtg.meeting_name}`)
        } catch(e: any) { p(`  ⚠ ${mtg.meeting_name}: ${e.message?.slice(0,40)}`) }
      }
    }
    
    this._dc = rows.length
    p(`📊 ${rows.length} kayıt toplandı`)
    if (rows.length < 30) { p('⚠ Yetersiz veri'); return }
    
    // ─── MODEL EĞİTİMİ ───
    p('🏋️ Weighted Ridge Regression eğitimi...')
    const X = rows.map(r => [r.grid, r.delta, r.f1, r.f2, r.f3, r.f4, r.f5, r.f6])
    const y = rows.map(r => r.finish)
    const sw = rows.map(r => r.year === 2025 ? 3.0 : 1.0) // 2025 = 3x ağırlık
    const n = X.length, d = 8
    
    this.fMean = Array(d).fill(0); this.fStd = Array(d).fill(0)
    for (let j = 0; j < d; j++) {
      for (let i = 0; i < n; i++) this.fMean[j] += X[i][j]
      this.fMean[j] /= n
      for (let i = 0; i < n; i++) this.fStd[j] += (X[i][j] - this.fMean[j]) ** 2
      this.fStd[j] = Math.sqrt(this.fStd[j] / n) + 1e-8
    }
    const Xn = X.map(row => row.map((v, j) => (v - this.fMean[j]) / this.fStd[j]))
    this.yMean = y.reduce((a, b) => a + b, 0) / n
    
    const M: number[][] = Array.from({length:d}, () => Array(d).fill(0))
    const V = Array(d).fill(0)
    for (let i = 0; i < n; i++) {
      const wt = sw[i]
      for (let a = 0; a < d; a++) { V[a] += wt * Xn[i][a] * y[i]; for (let b = 0; b < d; b++) M[a][b] += wt * Xn[i][a] * Xn[i][b] }
    }
    for (let j = 0; j < d; j++) M[j][j] += 1.0
    
    const inv = matInverse(M)
    this.w = inv.map((row, j) => row.reduce((s, v, k) => s + v * V[k], 0))
    
    let err = 0
    for (let i = 0; i < n; i++) err += Math.abs(y[i] - (Xn[i].reduce((s, v, j) => s + v * this.w[j], 0) + this.yMean))
    this._mae = err / n
    
    const races = new Set(rows.map(r => `${r.year}_${r.circuit}`))
    this._rc = races.size
    
    const fn = ['grid','delta','form','team','circuit','exp','tSeason','teammate']
    p(`  W: ${fn.map((f,i) => `${f}=${this.w[i].toFixed(2)}`).join(', ')}`)
    p(`  MAE: ${this._mae.toFixed(2)} poz · ${n} kayıt · ${this._rc} yarış`)
    p(`  Temporal: 2024=1x, 2025=3x`)
    
    this._ok = true
    p('✅ Hazır')
  }
  
  async predictRace(meetingKey: number, circuitName: string): Promise<PredictionResult[]> {
    if (!this._ok) return []
    
    const sess = await openF1.getSessions({ meeting_key: meetingKey })
    const best = sess.find((s: any) => s.session_type === 'Qualifying') || sess[sess.length - 1]
    if (!best) return []
    
    const [drivers, laps] = await Promise.all([
      openF1.getDrivers(best.session_key),
      openF1.getLaps(best.session_key)
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
      const df = this._dForm.get(code)?.slice(-5) || []
      const tf = this._tForm.get(team)?.slice(-10) || []
      const ch = this._cHist.get(circuitName)?.get(code) || []
      const tAll = this._tForm.get(team) || []
      const tmCodes = [...this._dTeam.entries()].filter(([c, t]) => t === team && c !== code).map(([c]) => c)
      const tmF = tmCodes.length > 0 ? (this._dForm.get(tmCodes[0])?.slice(-5) || []) : []
      
      const feat = [grid, delta, df.length>0?df.reduce((a,b)=>a+b,0)/df.length:11, tf.length>0?tf.reduce((a,b)=>a+b,0)/tf.length:11, ch.length>0?ch.reduce((a,b)=>a+b,0)/ch.length:11, this._dForm.get(code)?.length||0, tAll.length>0?tAll.reduce((a,b)=>a+b,0)/tAll.length:11, tmF.length>0?tmF.reduce((a,b)=>a+b,0)/tmF.length:11]
      const xn = feat.map((v, j) => (v - this.fMean[j]) / this.fStd[j])
      const pred = Math.max(1, Math.min(22, xn.reduce((s, v, j) => s + v * this.w[j], 0) + this.yMean))
      
      return { code, name: d.full_name, team, color: `#${d.team_colour||'888'}`, pred, feat }
    }).sort((a: any, b: any) => a.pred - b.pred)
    
    const temps = preds.map((_: any, i: number) => Math.exp(-i * 1.2))
    const ts = temps.reduce((a: number, b: number) => a + b, 0)
    
    return preds.map((s: any, i: number) => ({
      driverCode: s.code, driverName: s.name, team: s.team, teamColor: s.color,
      predictedPosition: i + 1,
      winProbability: Math.round(temps[i] / ts * 1000) / 10,
      podiumProbability: Math.round(Math.min(0.95, temps[i] / ts * 3 + (i < 3 ? 0.25 : 0)) * 1000) / 10,
      confidence: 0.75,
      factors: {
        qualiPerformance: Math.max(0, 1 - s.feat[0] / 22),
        historicalForm: Math.max(0, 1 - s.feat[2] / 22),
        teamStrength: Math.max(0, 1 - s.feat[3] / 22),
        circuitAffinity: s.feat[4] < 11 ? Math.max(0, 1 - s.feat[4] / 22) : 0.5,
        weatherAdaptation: 0.5,
      }
    }))
  }
  
  predictFromFeatures(df: { code: string; name: string; team: string; teamColor: string; features: number[] }[]): PredictionResult[] {
    if (!this._ok) return []
    const scored = df.map(d => {
      const xn = d.features.map((v, j) => (v - this.fMean[j]) / this.fStd[j])
      return { ...d, p: Math.max(1, Math.min(22, xn.reduce((s, v, j) => s + v * this.w[j], 0) + this.yMean)) }
    }).sort((a, b) => a.p - b.p)
    const temps = scored.map((_, i) => Math.exp(-i * 1.2))
    const ts = temps.reduce((a, b) => a + b, 0)
    return scored.map((s, i) => ({
      driverCode: s.code, driverName: s.name, team: s.team, teamColor: s.teamColor,
      predictedPosition: i + 1, winProbability: Math.round(temps[i]/ts*1000)/10,
      podiumProbability: Math.round(Math.min(0.95,temps[i]/ts*3+(i<3?0.25:0))*1000)/10,
      confidence: 0.75,
      factors: { qualiPerformance: 1-s.features[0]/22, historicalForm: 1-s.features[2]/22, teamStrength: 1-s.features[3]/22, circuitAffinity: s.features[4]<11?1-s.features[4]/22:0.5, weatherAdaptation: 0.5 }
    }))
  }
}

export const predictor = new F1Predictor()
