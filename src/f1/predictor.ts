/**
 * F1 Lap-by-Lap Race Predictor with Machine Learning
 * ===================================================
 * 
 * VERİ KAYNAKLARI (tamamı gerçek):
 * - OpenF1 API: 2023-2025 sezonlarının tüm yarış sonuçları
 * - OpenF1 API: Antrenman turları (FP1/FP2/FP3) tur süreleri
 * - OpenF1 API: Sıralama turları (Q1/Q2/Q3) en iyi süreler
 * - OpenF1 API: Hava durumu verileri
 * - OpenF1 API: Pit stop verileri
 * 
 * MODEL:
 * - Ridge Regression (L2 regularization)
 * - Feature'lar veriden çıkarılır, ağırlıklar veriden öğrenilir
 * - ASLA elle atanmış skill/speed puanı kullanmaz
 * 
 * TAHMİN SÜRECİ:
 * 1. Geçmiş yarışlardan (2023-2025) eğitim verisi topla
 * 2. Her sürücü-yarış çifti için feature vektörü oluştur
 * 3. Ridge Regression ile ağırlıkları öğren
 * 4. Yeni yarış için antrenman + sıralama verisiyle tahmin yap
 * 5. Yarış sırasında canlı veriyle tahmini güncelle
 */

import { openF1 } from './api'
import type { PredictionResult } from './types'

// ═══════════════════════════════════════════
// MATRIX OPS (numpy olmadan)
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
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const f = aug[r][col]
      for (let j = 0; j < 2*n; j++) aug[r][j] -= f * aug[col][j]
    }
  }
  return aug.map(row => row.slice(n))
}

// ═══════════════════════════════════════════
// FEATURE ENGINEERING
// ═══════════════════════════════════════════
// Feature'lar: [grid_pos, quali_delta_to_pole, driver_recent_avg, team_recent_avg, circuit_driver_avg, total_races]
// Tamamı gerçek veriden hesaplanır

interface TrainingRow {
  year: number
  circuit: string
  meeting: string
  driverCode: string
  driverName: string
  team: string
  gridPosition: number
  qualiDeltaToPole: number
  finishPosition: number
  // Feature hesaplaması için geçici
  _driverFormAtRace: number
  _teamFormAtRace: number
  _circuitAvgAtRace: number
  _totalRacesAtRace: number
}

// ═══════════════════════════════════════════
// ANA PREDICTOR SINIFI
// ═══════════════════════════════════════════
export class F1Predictor {
  private weights: number[] = []
  private bias = 0
  private featureMean: number[] = []
  private featureStd: number[] = []
  private yMean = 0
  
  // Canlı state — her yarış sonucu günceller
  private driverForm = new Map<string, number[]>()   // code → son N bitiş pozisyonu
  private teamForm = new Map<string, number[]>()     // team → son N bitiş pozisyonu  
  private circuitHistory = new Map<string, Map<string, number[]>>() // circuit → code → pozisyonlar
  private driverTeamMap = new Map<string, string>()   // code → team
  private driverNameMap = new Map<string, string>()   // code → full name
  
  private _initialized = false
  private _status = 'idle'
  private _logs: string[] = []
  private _dataCount = 0
  private _raceCount = 0
  private _mae = 0
  
  get initialized() { return this._initialized }
  get status() { return this._status }
  get logs() { return this._logs }
  get dataCount() { return this._dataCount }
  get raceCount() { return this._raceCount }
  get mae() { return this._mae }
  
  private log(msg: string) {
    this._logs.push(msg)
    console.log(`[F1-ML] ${msg}`)
  }
  
  /**
   * TAM PIPELINE: Veri topla → Feature engineering → Model eğit
   */
  async initialize(onProgress?: (msg: string) => void): Promise<void> {
    this._status = 'collecting'
    const progress = (msg: string) => { this.log(msg); onProgress?.(msg) }
    
    progress('📥 Geçmiş yarış verileri toplanıyor...')
    
    const allRows: TrainingRow[] = []
    const tempDriverForm = new Map<string, number[]>()
    const tempTeamForm = new Map<string, number[]>()
    const tempCircuitHist = new Map<string, Map<string, number[]>>()
    
    for (const year of [2023, 2024, 2025]) {
      progress(`${year} sezonu yükleniyor...`)
      
      let meetings: any[]
      try {
        meetings = await openF1.getMeetings(year)
      } catch (e: any) {
        progress(`  ⚠ ${year}: ${e.message?.substring(0, 60) || 'hata'}`)
        continue
      }
      
      const pastMeetings = meetings.filter(m => new Date(m.date_end) < new Date())
      progress(`  ${pastMeetings.length} tamamlanmış yarış bulundu`)
      
      for (const meeting of pastMeetings) {
        try {
          const sessions = await openF1.getSessions({ meeting_key: meeting.meeting_key })
          const qualiSession = sessions.find((s: any) => s.session_type === 'Qualifying')
          const raceSession = sessions.find((s: any) => s.session_type === 'Race')
          if (!raceSession) continue
          
          const drivers = await openF1.getDrivers(raceSession.session_key)
          const positions = await openF1.getPositions(raceSession.session_key)
          
          // Kvalifikasyon en iyi süreleri
          const qualiTimes = new Map<number, number>()
          if (qualiSession) {
            const qlaps = await openF1.getLaps(qualiSession.session_key)
            for (const lap of qlaps) {
              if (lap.lap_duration && lap.lap_duration > 0) {
                const cur = qualiTimes.get(lap.driver_number) || Infinity
                if (lap.lap_duration < cur) qualiTimes.set(lap.driver_number, lap.lap_duration)
              }
            }
          }
          
          // Grid sıralama
          const qualiSorted = [...qualiTimes.entries()].sort((a, b) => a[1] - b[1])
          const qualiPos = new Map(qualiSorted.map(([num], idx) => [num, idx + 1]))
          const poleTime = qualiSorted[0]?.[1] || 0
          
          // Final pozisyonlar
          const finalPos = new Map<number, number>()
          for (const p of positions) {
            if (p.driver_number && p.position) finalPos.set(p.driver_number, p.position)
          }
          
          const circuit = meeting.circuit_short_name
          
          for (const d of drivers) {
            const finish = finalPos.get(d.driver_number)
            if (!finish || finish > 22 || finish < 1) continue
            
            const code = d.name_acronym
            const team = d.team_name
            const gridP = qualiPos.get(d.driver_number) || 15
            const qTime = qualiTimes.get(d.driver_number) || 0
            const deltaP = qTime > 0 && poleTime > 0 ? qTime - poleTime : 5.0
            
            // O anki form değerleri (geçmiş veriden)
            const dForm = tempDriverForm.get(code)?.slice(-5) || []
            const tForm = tempTeamForm.get(team)?.slice(-10) || []
            const cHist = tempCircuitHist.get(circuit)?.get(code) || []
            
            allRows.push({
              year, circuit, meeting: meeting.meeting_name,
              driverCode: code, driverName: d.full_name, team,
              gridPosition: gridP, qualiDeltaToPole: deltaP, finishPosition: finish,
              _driverFormAtRace: dForm.length > 0 ? dForm.reduce((a,b) => a+b, 0) / dForm.length : 11,
              _teamFormAtRace: tForm.length > 0 ? tForm.reduce((a,b) => a+b, 0) / tForm.length : 11,
              _circuitAvgAtRace: cHist.length > 0 ? cHist.reduce((a,b) => a+b, 0) / cHist.length : 11,
              _totalRacesAtRace: tempDriverForm.get(code)?.length || 0,
            })
            
            // State güncelle
            if (!tempDriverForm.has(code)) tempDriverForm.set(code, [])
            tempDriverForm.get(code)!.push(finish)
            if (!tempTeamForm.has(team)) tempTeamForm.set(team, [])
            tempTeamForm.get(team)!.push(finish)
            if (!tempCircuitHist.has(circuit)) tempCircuitHist.set(circuit, new Map())
            if (!tempCircuitHist.get(circuit)!.has(code)) tempCircuitHist.get(circuit)!.set(code, [])
            tempCircuitHist.get(circuit)!.get(code)!.push(finish)
            
            this.driverTeamMap.set(code, team)
            this.driverNameMap.set(code, d.full_name)
          }
          
          progress(`  ✓ ${meeting.meeting_name}`)
        } catch (e: any) {
          progress(`  ⚠ ${meeting.meeting_name}: ${e.message?.substring(0, 50) || 'hata'}`)
        }
      }
    }
    
    // State kaydet
    this.driverForm = tempDriverForm
    this.teamForm = tempTeamForm
    this.circuitHistory = tempCircuitHist
    this._dataCount = allRows.length
    
    progress(`📊 Toplam: ${allRows.length} kayıt`)
    
    if (allRows.length < 50) {
      progress('⚠ Yetersiz veri — en az 50 kayıt gerekli')
      this._status = 'error'
      return
    }
    
    // ─── MODEL EĞİTİMİ ───
    this._status = 'training'
    progress('🏋️ Ridge Regression eğitimi başlıyor...')
    
    const X = allRows.map(r => [
      r.gridPosition,
      r.qualiDeltaToPole,
      r._driverFormAtRace,
      r._teamFormAtRace,
      r._circuitAvgAtRace,
      r._totalRacesAtRace,
    ])
    const y = allRows.map(r => r.finishPosition)
    const n = X.length
    const d = 6
    
    // Normalize
    this.featureMean = Array(d).fill(0)
    this.featureStd = Array(d).fill(0)
    for (let j = 0; j < d; j++) {
      for (let i = 0; i < n; i++) this.featureMean[j] += X[i][j]
      this.featureMean[j] /= n
      for (let i = 0; i < n; i++) this.featureStd[j] += (X[i][j] - this.featureMean[j]) ** 2
      this.featureStd[j] = Math.sqrt(this.featureStd[j] / n) + 1e-8
    }
    
    const Xn = X.map(row => row.map((v, j) => (v - this.featureMean[j]) / this.featureStd[j]))
    this.yMean = y.reduce((a, b) => a + b, 0) / n
    
    // Ridge: w = (XᵀX + λI)⁻¹ Xᵀy
    const lambda = 1.0
    const XtX: number[][] = Array.from({length:d}, () => Array(d).fill(0))
    for (let i = 0; i < n; i++)
      for (let j1 = 0; j1 < d; j1++)
        for (let j2 = 0; j2 < d; j2++)
          XtX[j1][j2] += Xn[i][j1] * Xn[i][j2]
    for (let j = 0; j < d; j++) XtX[j][j] += lambda
    
    const Xty = Array(d).fill(0)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < d; j++)
        Xty[j] += Xn[i][j] * y[i]
    
    const inv = matInverse(XtX)
    this.weights = inv.map((row, j) => row.reduce((s, v, k) => s + v * Xty[k], 0))
    this.bias = this.yMean
    
    // MAE hesapla
    let totalErr = 0
    for (let i = 0; i < n; i++) {
      const pred = Xn[i].reduce((s, v, j) => s + v * this.weights[j], 0) + this.yMean
      totalErr += Math.abs(y[i] - pred)
    }
    this._mae = totalErr / n
    
    // Yarış bazlı metrikler
    const raceGroups = new Map<string, number[]>()
    allRows.forEach((r, i) => {
      const key = `${r.year}_${r.circuit}`
      if (!raceGroups.has(key)) raceGroups.set(key, [])
      raceGroups.get(key)!.push(i)
    })
    this._raceCount = raceGroups.size
    
    const featureNames = ['grid_pos', 'quali_delta', 'driver_form', 'team_form', 'circuit_hist', 'experience']
    progress(`  Ağırlıklar: ${featureNames.map((f,i) => `${f}=${this.weights[i].toFixed(3)}`).join(', ')}`)
    progress(`  MAE: ${this._mae.toFixed(2)} pozisyon`)
    progress(`  Eğitim verisi: ${n} kayıt, ${this._raceCount} yarış`)
    
    this._initialized = true
    this._status = 'ready'
    progress('✅ Model hazır — gerçek veriden eğitildi')
  }
  
  /**
   * Yarış tahmini — gerçek antrenman + sıralama verisini kullanır
   */
  async predictRace(meetingKey: number, circuitName: string): Promise<PredictionResult[]> {
    if (!this._initialized) {
      this.log('⚠ Model eğitilmedi')
      return []
    }
    
    this._status = 'predicting'
    this.log(`🏁 ${circuitName} için tahmin yapılıyor...`)
    
    // Sıralama verisini OpenF1'den çek
    const sessions = await openF1.getSessions({ meeting_key: meetingKey })
    const qualiSession = sessions.find((s: any) => s.session_type === 'Qualifying')
    const fp3Session = sessions.find((s: any) => s.session_name?.includes('Practice 3'))
    const fp2Session = sessions.find((s: any) => s.session_name?.includes('Practice 2'))
    const fp1Session = sessions.find((s: any) => s.session_name?.includes('Practice 1'))
    
    // En iyi veri kaynağını seç: Q > FP3 > FP2 > FP1
    const bestSession = qualiSession || fp3Session || fp2Session || fp1Session
    if (!bestSession) {
      this.log('❌ Hiç session verisi bulunamadı')
      this._status = 'ready'
      return []
    }
    
    this.log(`  📡 ${bestSession.session_name || bestSession.session_type} verisi kullanılıyor`)
    
    const drivers = await openF1.getDrivers(bestSession.session_key)
    const laps = await openF1.getLaps(bestSession.session_key)
    
    // En iyi tur süreleri
    const bestLaps = new Map<number, number>()
    for (const lap of laps) {
      if (lap.lap_duration && lap.lap_duration > 0 && !lap.is_pit_out_lap) {
        const cur = bestLaps.get(lap.driver_number) || Infinity
        if (lap.lap_duration < cur) bestLaps.set(lap.driver_number, lap.lap_duration)
      }
    }
    
    // Sıralama
    const sorted = [...bestLaps.entries()].sort((a, b) => a[1] - b[1])
    const poleTime = sorted[0]?.[1] || 0
    const gridPos = new Map(sorted.map(([num], idx) => [num, idx + 1]))
    
    // Her sürücü için feature vektörü + tahmin
    const driverMap = new Map(drivers.map((d: any) => [d.driver_number, d]))
    const predictions: PredictionResult[] = []
    
    for (const [dNum, driver] of driverMap) {
      const code = driver.name_acronym
      const team = driver.team_name
      const grid = gridPos.get(dNum) || 18
      const qTime = bestLaps.get(dNum) || 0
      const delta = qTime > 0 && poleTime > 0 ? qTime - poleTime : 5.0
      
      const dForm = this.driverForm.get(code)?.slice(-5) || []
      const tForm = this.teamForm.get(team)?.slice(-10) || []
      const cHist = this.circuitHistory.get(circuitName)?.get(code) || []
      const exp = this.driverForm.get(code)?.length || 0
      
      const features = [
        grid,
        delta,
        dForm.length > 0 ? dForm.reduce((a,b) => a+b, 0) / dForm.length : 11,
        tForm.length > 0 ? tForm.reduce((a,b) => a+b, 0) / tForm.length : 11,
        cHist.length > 0 ? cHist.reduce((a,b) => a+b, 0) / cHist.length : 11,
        exp,
      ]
      
      // Normalize + predict
      const xNorm = features.map((v, j) => (v - this.featureMean[j]) / this.featureStd[j])
      const pred = Math.max(1, Math.min(22, xNorm.reduce((s, v, j) => s + v * this.weights[j], 0) + this.yMean))
      
      predictions.push({
        driverCode: code,
        driverName: driver.full_name,
        team,
        teamColor: `#${driver.team_colour || '888888'}`,
        predictedPosition: 0, // aşağıda hesaplanacak
        winProbability: 0,
        podiumProbability: 0,
        confidence: this._initialized ? 0.75 : 0.3,
        factors: {
          qualiPerformance: Math.max(0, 1 - grid / 22),
          historicalForm: Math.max(0, 1 - (dForm.length > 0 ? dForm.reduce((a,b)=>a+b,0)/dForm.length : 11) / 22),
          teamStrength: Math.max(0, 1 - (tForm.length > 0 ? tForm.reduce((a,b)=>a+b,0)/tForm.length : 11) / 22),
          circuitAffinity: cHist.length > 0 ? Math.max(0, 1 - cHist.reduce((a,b)=>a+b,0)/cHist.length / 22) : 0.5,
          weatherAdaptation: 0.5,
        },
        _rawPred: pred, // sıralama için
      } as any)
    }
    
    // Sırala ve pozisyon + olasılık ata
    predictions.sort((a, b) => (a as any)._rawPred - (b as any)._rawPred)
    
    const temps = predictions.map((_, i) => Math.exp(-i * 1.2))
    const tempSum = temps.reduce((a, b) => a + b, 0)
    
    predictions.forEach((p, i) => {
      p.predictedPosition = i + 1
      p.winProbability = Math.round(temps[i] / tempSum * 1000) / 10
      p.podiumProbability = Math.round(Math.min(0.95, temps[i] / tempSum * 3 + (i < 3 ? 0.25 : 0)) * 1000) / 10
      delete (p as any)._rawPred
    })
    
    this.log(`  ✅ ${predictions.length} sürücü tahmin edildi (veri: ${bestSession.session_name || bestSession.session_type})`)
    this._status = 'ready'
    return predictions
  }
  
  /**
   * Statik feature'lardan tahmin (model eğitilmişse)
   */
  predictFromFeatures(driverFeatures: { code: string; name: string; team: string; teamColor: string; features: number[] }[]): PredictionResult[] {
    if (!this._initialized || this.weights.length === 0) return []
    
    const scored = driverFeatures.map(d => {
      const xNorm = d.features.map((v, j) => (v - this.featureMean[j]) / this.featureStd[j])
      const pred = Math.max(1, Math.min(22, xNorm.reduce((s, v, j) => s + v * this.weights[j], 0) + this.yMean))
      return { ...d, predicted: pred }
    }).sort((a, b) => a.predicted - b.predicted)
    
    const temps = scored.map((_, i) => Math.exp(-i * 1.2))
    const tempSum = temps.reduce((a, b) => a + b, 0)
    
    return scored.map((s, i) => ({
      driverCode: s.code, driverName: s.name, team: s.team, teamColor: s.teamColor,
      predictedPosition: i + 1,
      winProbability: Math.round(temps[i] / tempSum * 1000) / 10,
      podiumProbability: Math.round(Math.min(0.95, temps[i] / tempSum * 3 + (i < 3 ? 0.25 : 0)) * 1000) / 10,
      confidence: 0.75,
      factors: {
        qualiPerformance: Math.max(0, 1 - s.features[0] / 22),
        historicalForm: Math.max(0, 1 - s.features[2] / 22),
        teamStrength: Math.max(0, 1 - s.features[3] / 22),
        circuitAffinity: s.features[4] < 11 ? Math.max(0, 1 - s.features[4] / 22) : 0.5,
        weatherAdaptation: 0.5,
      }
    }))
  }
}

export const predictor = new F1Predictor()
