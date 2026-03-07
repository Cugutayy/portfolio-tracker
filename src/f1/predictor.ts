/**
 * F1 Race Predictor — ML-Lite Tahmin Motoru
 * ==========================================
 * Tarayıcıda çalışan ağırlıklı skor tabanlı tahmin sistemi.
 * 
 * Feature'lar:
 * 1. Kvalifikasyon performansı (en güncel veri)
 * 2. Son 5 yarıştaki form (rolling average)
 * 3. Takım gücü (constructors sıralaması)
 * 4. Pist uyumu (aynı pistteki geçmiş performans)
 * 5. Hava durumu adaptasyonu
 * 6. Grid pozisyonu → bitiş pozisyonu istatistiksel dönüşüm
 * 
 * Backtesting: Geçmiş yarışlarda modelin doğruluğunu ölçer.
 */

import { openF1 } from './api'
import { DRIVERS, TEAMS } from './data'
import type {
  PredictionResult, BacktestResult, ModelMetrics,
  OpenF1Session, OpenF1Lap, OpenF1Driver, Driver
} from './types'

// ═══════════════════════════════════════════
// FEATURE EXTRACTION
// ═══════════════════════════════════════════

interface DriverFeatures {
  driverCode: string
  driverName: string
  team: string
  teamColor: string
  gridPosition: number
  qualiBestLap: number        // saniye (0 = veri yok)
  qualiDeltaToPole: number    // pole'a fark (saniye)
  recentForm: number          // son 5 yarışın ort. bitiş pozisyonu (düşük = iyi)
  seasonPoints: number
  teamSeasonPoints: number
  driverSkill: number         // statik veri (0-100)
  teamCarSpeed: number        // statik veri (0-100)
  circuitHistoryAvg: number   // bu pistteki geçmiş ort. bitiş (0 = veri yok)
  wetSkill: number
  isWet: boolean
  reliability: number
}

/**
 * Bir sürücü için tüm feature'ları çıkar
 */
function extractFeatures(
  driverCode: string,
  qualiData: Map<string, { bestLap: number; position: number }>,
  historicalForm: Map<string, number[]>,   // son yarış pozisyonları
  seasonPoints: Map<string, number>,
  teamPoints: Map<string, number>,
  circuitHistory: Map<string, number[]>,
  isWet: boolean
): DriverFeatures | null {
  const driver = DRIVERS.find(d => d.code === driverCode)
  if (!driver) return null
  
  const team = TEAMS[driver.team]
  if (!team) return null
  
  const quali = qualiData.get(driverCode)
  const poleLap = Math.min(...Array.from(qualiData.values()).map(q => q.bestLap).filter(t => t > 0))
  
  const form = historicalForm.get(driverCode) || []
  const recentForm = form.length > 0 ? form.reduce((a, b) => a + b, 0) / form.length : 11
  
  const circuitHist = circuitHistory.get(driverCode) || []
  const circuitAvg = circuitHist.length > 0 ? circuitHist.reduce((a, b) => a + b, 0) / circuitHist.length : 0
  
  return {
    driverCode,
    driverName: driver.name,
    team: driver.team,
    teamColor: driver.teamColor,
    gridPosition: quali?.position || 15,
    qualiBestLap: quali?.bestLap || 0,
    qualiDeltaToPole: quali && poleLap > 0 && quali.bestLap > 0 ? quali.bestLap - poleLap : 2.0,
    recentForm,
    seasonPoints: seasonPoints.get(driverCode) || 0,
    teamSeasonPoints: teamPoints.get(driver.team) || 0,
    driverSkill: driver.skill,
    teamCarSpeed: team.carSpeed,
    circuitHistoryAvg: circuitAvg,
    wetSkill: driver.wetSkill,
    isWet,
    reliability: team.reliability,
  }
}

// ═══════════════════════════════════════════
// SCORING MODEL
// ═══════════════════════════════════════════

/**
 * Ağırlıklı skor hesapla — her feature'ın etkisi
 * Düşük skor = daha iyi tahmin edilen bitiş pozisyonu
 */
function calculateScore(f: DriverFeatures): number {
  // Ağırlıklar (toplam ~1.0)
  const W = {
    grid: 0.25,         // Kvalifikasyon en güçlü tek gösterge
    teamSpeed: 0.20,    // Araç performansı
    driverSkill: 0.15,  // Sürücü yeteneği
    recentForm: 0.15,   // Son performans trendi
    qualiDelta: 0.10,   // Pole'a fark (hız göstergesi)
    circuitHistory: 0.08, // Pist uyumu
    weather: 0.05,      // Yağmur avantajı
    reliability: 0.02,  // Güvenilirlik
  }
  
  // Grid: 1. = 0, 22. = 1
  const gridScore = (f.gridPosition - 1) / 21
  
  // Takım hızı: 100 = 0, 70 = 1
  const teamScore = 1 - (f.teamCarSpeed - 70) / 30
  
  // Sürücü yeteneği: 100 = 0, 60 = 1
  const skillScore = 1 - (f.driverSkill - 60) / 40
  
  // Son form: 1. = 0, 20. = 1
  const formScore = (f.recentForm - 1) / 19
  
  // Quali delta: 0s = 0, 3s = 1
  const qualiScore = Math.min(f.qualiDeltaToPole / 3, 1)
  
  // Pist uyumu: ort. 1 = 0, ort. 20 = 1 (veri yoksa nötr 0.5)
  const circuitScore = f.circuitHistoryAvg > 0 ? (f.circuitHistoryAvg - 1) / 19 : 0.5
  
  // Yağmur: wetSkill yüksekse avantaj
  const weatherScore = f.isWet ? 1 - (f.wetSkill - 60) / 40 : 0.5
  
  // Güvenilirlik
  const reliabilityScore = 1 - (f.reliability - 70) / 30
  
  const totalScore = 
    W.grid * gridScore +
    W.teamSpeed * teamScore +
    W.driverSkill * skillScore +
    W.recentForm * formScore +
    W.qualiDelta * qualiScore +
    W.circuitHistory * circuitScore +
    W.weather * weatherScore +
    W.reliability * reliabilityScore
  
  return totalScore
}

/**
 * Skorlardan olasılık hesapla (softmax benzeri)
 */
function scoresToProbabilities(scores: { code: string; score: number }[]): Map<string, { winProb: number; podiumProb: number }> {
  const result = new Map()
  
  // Sıralama bazlı olasılık (üstel dağılım)
  const sorted = [...scores].sort((a, b) => a.score - b.score)
  const n = sorted.length
  
  // Win probability — softmax
  const temps = sorted.map((_, i) => Math.exp(-(i * 1.5)))
  const tempSum = temps.reduce((a, b) => a + b, 0)
  
  sorted.forEach((s, i) => {
    const winProb = temps[i] / tempSum
    // Podium: ilk 3'e girme olasılığı (kümülatif)
    const podiumProb = Math.min(1, winProb * 3 + (i < 3 ? 0.3 : 0) + (i < 6 ? 0.1 : 0))
    
    result.set(s.code, { winProb, podiumProb: Math.min(podiumProb, 0.95) })
  })
  
  return result
}

// ═══════════════════════════════════════════
// MAIN PREDICTOR
// ═══════════════════════════════════════════

export class F1Predictor {
  private historicalForm = new Map<string, number[]>()
  private seasonPoints = new Map<string, number>()
  private teamPoints = new Map<string, number>()
  private circuitHistory = new Map<string, Map<string, number[]>>() // circuit → driver → positions
  private isInitialized = false
  private _metrics: ModelMetrics | null = null
  
  /**
   * Geçmiş verilerle modeli eğit
   */
  async initialize(years: number[] = [2023, 2024, 2025]): Promise<void> {
    console.log('[Predictor] Geçmiş veriler yükleniyor...')
    
    for (const year of years) {
      try {
        const races = await openF1.getHistoricalRaceResults(year)
        
        for (const race of races) {
          const circuitName = race.meeting.circuit_short_name
          
          for (const result of race.results) {
            if (result.position > 0 && result.position <= 22) {
              // Form güncelle (son 10 yarış)
              const form = this.historicalForm.get(result.driverCode) || []
              form.push(result.position)
              if (form.length > 10) form.shift()
              this.historicalForm.set(result.driverCode, form)
              
              // Sezon puanları (sadece son yıl)
              if (year === years[years.length - 1]) {
                const pts = this.seasonPoints.get(result.driverCode) || 0
                // Basit puan hesabı: 25,18,15,12,10,8,6,4,2,1
                const pointsTable = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]
                const racePoints = result.position <= 10 ? pointsTable[result.position - 1] : 0
                this.seasonPoints.set(result.driverCode, pts + racePoints)
                
                const tPts = this.teamPoints.get(result.team) || 0
                this.teamPoints.set(result.team, tPts + racePoints)
              }
              
              // Pist geçmişi
              if (!this.circuitHistory.has(circuitName)) {
                this.circuitHistory.set(circuitName, new Map())
              }
              const circuitMap = this.circuitHistory.get(circuitName)!
              const driverHist = circuitMap.get(result.driverCode) || []
              driverHist.push(result.position)
              circuitMap.set(result.driverCode, driverHist)
            }
          }
        }
        
        console.log(`[Predictor] ${year}: ${races.length} yarış yüklendi`)
      } catch (err) {
        console.warn(`[Predictor] ${year} yüklenemedi:`, err)
      }
    }
    
    this.isInitialized = true
    console.log(`[Predictor] Hazır — ${this.historicalForm.size} sürücü, ${this.circuitHistory.size} pist`)
  }
  
  /**
   * Bir yarış için tahmin üret
   */
  async predict(
    meetingKey: number,
    circuitName: string,
    isWet: boolean = false
  ): Promise<PredictionResult[]> {
    if (!this.isInitialized) {
      console.warn('[Predictor] Model henüz eğitilmedi, statik verilerle tahmin yapılıyor')
    }
    
    // Kvalifikasyon verisini çek
    const sessions = await openF1.getSessions({ meeting_key: meetingKey })
    const qualiSession = sessions.find(s => s.session_type === 'Qualifying')
    
    const qualiData = new Map<string, { bestLap: number; position: number }>()
    
    if (qualiSession) {
      const laps = await openF1.getLaps(qualiSession.session_key)
      const drivers = await openF1.getDrivers(qualiSession.session_key)
      
      // Her sürücünün en iyi kvalifikasyon turunu bul
      const driverMap = new Map(drivers.map(d => [d.driver_number, d]))
      const bestLaps = new Map<number, number>()
      
      for (const lap of laps) {
        if (lap.lap_duration && lap.lap_duration > 0) {
          const current = bestLaps.get(lap.driver_number) || Infinity
          if (lap.lap_duration < current) {
            bestLaps.set(lap.driver_number, lap.lap_duration)
          }
        }
      }
      
      // Sıralama oluştur
      const sorted = [...bestLaps.entries()].sort((a, b) => a[1] - b[1])
      sorted.forEach(([num, time], idx) => {
        const driver = driverMap.get(num)
        if (driver) {
          qualiData.set(driver.name_acronym, { bestLap: time, position: idx + 1 })
        }
      })
    }
    
    // Kvalifikasyon verisi yoksa statik verilerle grid oluştur
    if (qualiData.size === 0) {
      DRIVERS.forEach((d, i) => {
        const team = TEAMS[d.team]
        const simQualPerf = d.skill * 0.5 + (team?.carSpeed || 80) * 0.5
        qualiData.set(d.code, { bestLap: 0, position: i + 1 })
      })
      // Performansa göre sırala
      const entries = [...qualiData.entries()].map(([code, data]) => {
        const driver = DRIVERS.find(d => d.code === code)!
        const team = TEAMS[driver.team]
        return { code, perf: driver.skill * 0.5 + (team?.carSpeed || 80) * 0.5, data }
      }).sort((a, b) => b.perf - a.perf)
      
      qualiData.clear()
      entries.forEach((e, i) => qualiData.set(e.code, { ...e.data, position: i + 1 }))
    }
    
    // Pist geçmişi
    const circuitHist = this.circuitHistory.get(circuitName) || new Map()
    
    // Feature extraction + scoring
    const scores: { code: string; score: number; features: DriverFeatures }[] = []
    
    for (const [code] of qualiData) {
      const features = extractFeatures(
        code, qualiData, this.historicalForm,
        this.seasonPoints, this.teamPoints, circuitHist, isWet
      )
      if (features) {
        scores.push({ code, score: calculateScore(features), features })
      }
    }
    
    // Sırala ve olasılık hesapla
    scores.sort((a, b) => a.score - b.score)
    const probs = scoresToProbabilities(scores)
    
    return scores.map((s, i) => {
      const prob = probs.get(s.code)!
      return {
        driverCode: s.code,
        driverName: s.features.driverName,
        team: s.features.team,
        teamColor: s.features.teamColor,
        predictedPosition: i + 1,
        winProbability: Math.round(prob.winProb * 1000) / 10, // %
        podiumProbability: Math.round(prob.podiumProb * 1000) / 10,
        confidence: this.isInitialized ? 0.7 : 0.4, // veri varsa güven artar
        factors: {
          qualiPerformance: 1 - s.features.gridPosition / 22,
          historicalForm: 1 - s.features.recentForm / 22,
          teamStrength: s.features.teamCarSpeed / 100,
          circuitAffinity: s.features.circuitHistoryAvg > 0 ? 1 - s.features.circuitHistoryAvg / 22 : 0.5,
          weatherAdaptation: s.features.isWet ? s.features.wetSkill / 100 : 0.5,
        }
      }
    })
  }
  
  /**
   * Geçmiş yarışlarda modelin doğruluğunu test et
   */
  async backtest(year: number = 2025): Promise<ModelMetrics> {
    console.log(`[Predictor] Backtesting ${year}...`)
    
    const races = await openF1.getHistoricalRaceResults(year)
    const backtestResults: BacktestResult[] = []
    
    for (const race of races) {
      try {
        // Bu yarış için tahmin yap (o ana kadarki veriyle)
        const predictions = await this.predict(
          race.meeting.meeting_key,
          race.meeting.circuit_short_name,
          false
        )
        
        const actualResults = race.results.map(r => ({
          driverCode: r.driverCode,
          position: r.position
        }))
        
        // Doğruluk hesapla
        let top3Correct = 0
        let top10Correct = 0
        let totalError = 0
        let count = 0
        
        for (const pred of predictions) {
          const actual = actualResults.find(a => a.driverCode === pred.driverCode)
          if (actual && actual.position <= 22) {
            const error = Math.abs(pred.predictedPosition - actual.position)
            totalError += error
            count++
            
            if (pred.predictedPosition <= 3 && actual.position <= 3) top3Correct++
            if (pred.predictedPosition <= 10 && actual.position <= 10) top10Correct++
          }
        }
        
        const winnerPred = predictions[0]?.driverCode
        const winnerActual = actualResults.find(a => a.position === 1)?.driverCode
        
        backtestResults.push({
          race: race.meeting.meeting_name,
          year,
          round: 0,
          predictions,
          actualResults,
          accuracy: {
            top3Accuracy: top3Correct / 3 * 100,
            top10Accuracy: top10Correct / 10 * 100,
            winnerCorrect: winnerPred === winnerActual,
            avgPositionError: count > 0 ? totalError / count : 99,
          }
        })
      } catch (err) {
        console.warn(`[Backtest] ${race.meeting.meeting_name} atlandı:`, err)
      }
    }
    
    // Genel metrikler
    const totalRaces = backtestResults.length
    const winnerCorrectCount = backtestResults.filter(b => b.accuracy.winnerCorrect).length
    const avgTop3 = backtestResults.reduce((a, b) => a + b.accuracy.top3Accuracy, 0) / Math.max(totalRaces, 1)
    const avgTop10 = backtestResults.reduce((a, b) => a + b.accuracy.top10Accuracy, 0) / Math.max(totalRaces, 1)
    const avgError = backtestResults.reduce((a, b) => a + b.accuracy.avgPositionError, 0) / Math.max(totalRaces, 1)
    
    this._metrics = {
      totalRaces,
      winnerAccuracy: totalRaces > 0 ? (winnerCorrectCount / totalRaces) * 100 : 0,
      podiumAccuracy: avgTop3,
      top10Accuracy: avgTop10,
      avgPositionError: avgError,
      backtestResults,
    }
    
    console.log(`[Backtest] ${totalRaces} yarış — Kazanan doğruluk: ${this._metrics.winnerAccuracy.toFixed(1)}%, Ort. hata: ${avgError.toFixed(1)} pozisyon`)
    
    return this._metrics
  }
  
  get metrics() { return this._metrics }
  get initialized() { return this.isInitialized }
}

// Singleton
export const predictor = new F1Predictor()
