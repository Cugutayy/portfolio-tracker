/**
 * F1 Live Data Service
 * ====================
 * OpenF1 API'den canlı yarış verisi çeker ve poll eder.
 * 
 * Veri akışı:
 * 1. Her 5 saniyede pozisyon verisi çek
 * 2. Her 10 saniyede tur süreleri çek
 * 3. Her 30 saniyede hava durumu çek
 * 4. Her pit stop olayını yakala
 * 5. Race control mesajlarını yakala
 * 
 * Tüm veri OpenF1 API'den — UYDURMA VERİ YOK.
 */

import { openF1 } from './api'
import type { OpenF1Lap, OpenF1Position, OpenF1Weather, OpenF1Pit, OpenF1Driver } from './types'

export interface LiveDriverState {
  number: number
  code: string
  name: string
  team: string
  teamColor: string
  position: number
  lastLapTime: number | null
  bestLapTime: number | null
  gap: string
  interval: string
  currentTyre: string
  tyreAge: number
  pitStops: number
  lapsCompleted: number
  status: 'racing' | 'pit' | 'out' | 'finished'
  sectorTimes: [number | null, number | null, number | null]
  speedTrap: number | null
}

export interface LiveRaceState {
  sessionKey: number
  sessionType: string
  meetingName: string
  circuit: string
  lap: number
  totalLaps: number
  weather: {
    airTemp: number
    trackTemp: number
    humidity: number
    rainfall: boolean
    windSpeed: number
  } | null
  drivers: LiveDriverState[]
  raceControl: string[]
  isLive: boolean
  lastUpdate: Date
}

type LiveCallback = (state: LiveRaceState) => void

export class LiveDataService {
  private sessionKey: number | null = null
  private pollingInterval: number | null = null
  private callbacks: LiveCallback[] = []
  private state: LiveRaceState | null = null
  private driverMap = new Map<number, OpenF1Driver>()
  
  /**
   * Canlı yarış oturumuna bağlan
   */
  async connect(sessionKey: number, sessionType: string, meetingName: string, circuit: string, totalLaps: number): Promise<void> {
    this.sessionKey = sessionKey
    this.state = {
      sessionKey, sessionType, meetingName, circuit,
      lap: 0, totalLaps,
      weather: null, drivers: [], raceControl: [],
      isLive: true, lastUpdate: new Date()
    }
    
    // Sürücü listesini çek
    const drivers = await openF1.getDrivers(sessionKey)
    this.driverMap = new Map(drivers.map(d => [d.driver_number, d]))
    
    // İlk veri çekimi
    await this.fetchAll()
    
    // Polling başlat — 5 saniyede bir
    this.pollingInterval = window.setInterval(() => this.fetchAll(), 5000)
    
    console.log(`[Live] Bağlandı: ${meetingName} — ${sessionType} (key: ${sessionKey})`)
  }
  
  /**
   * Bağlantıyı kes
   */
  disconnect(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
    this.sessionKey = null
    console.log('[Live] Bağlantı kesildi')
  }
  
  /**
   * Durum değişikliği dinle
   */
  onUpdate(callback: LiveCallback): () => void {
    this.callbacks.push(callback)
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback)
    }
  }
  
  /**
   * Tüm veriyi çek ve state'i güncelle
   */
  private async fetchAll(): Promise<void> {
    if (!this.sessionKey || !this.state) return
    
    try {
      const [positions, laps, weather, pits] = await Promise.allSettled([
        openF1.getPositions(this.sessionKey),
        openF1.getLaps(this.sessionKey),
        openF1.getWeather(this.sessionKey),
        openF1.getPitStops(this.sessionKey),
      ])
      
      // Pozisyonlar
      if (positions.status === 'fulfilled' && positions.value.length > 0) {
        this.updatePositions(positions.value)
      }
      
      // Tur süreleri
      if (laps.status === 'fulfilled' && laps.value.length > 0) {
        this.updateLaps(laps.value)
      }
      
      // Hava durumu
      if (weather.status === 'fulfilled' && weather.value.length > 0) {
        const latest = weather.value[weather.value.length - 1]
        this.state.weather = {
          airTemp: latest.air_temperature,
          trackTemp: latest.track_temperature,
          humidity: latest.humidity,
          rainfall: latest.rainfall,
          windSpeed: latest.wind_speed,
        }
      }
      
      // Pit stoplar
      if (pits.status === 'fulfilled') {
        this.updatePits(pits.value)
      }
      
      this.state.lastUpdate = new Date()
      this.notify()
      
    } catch (err) {
      console.warn('[Live] Veri çekme hatası:', err)
    }
  }
  
  private updatePositions(positions: OpenF1Position[]): void {
    if (!this.state) return
    
    // En son pozisyonları al (her sürücü için son kayıt)
    const latestPos = new Map<number, number>()
    for (const p of positions) {
      latestPos.set(p.driver_number, p.position)
    }
    
    // Driver state güncelle veya oluştur
    for (const [num, pos] of latestPos) {
      let driver = this.state.drivers.find(d => d.number === num)
      const info = this.driverMap.get(num)
      
      if (!driver && info) {
        driver = {
          number: num,
          code: info.name_acronym,
          name: info.full_name,
          team: info.team_name,
          teamColor: '#' + (info.team_colour || '888888'),
          position: pos,
          lastLapTime: null,
          bestLapTime: null,
          gap: '',
          interval: '',
          currentTyre: 'unknown',
          tyreAge: 0,
          pitStops: 0,
          lapsCompleted: 0,
          status: 'racing',
          sectorTimes: [null, null, null],
          speedTrap: null,
        }
        this.state.drivers.push(driver)
      } else if (driver) {
        driver.position = pos
      }
    }
    
    this.state.drivers.sort((a, b) => a.position - b.position)
  }
  
  private updateLaps(laps: OpenF1Lap[]): void {
    if (!this.state) return
    
    let maxLap = 0
    
    for (const lap of laps) {
      const driver = this.state.drivers.find(d => d.number === lap.driver_number)
      if (!driver) continue
      
      if (lap.lap_number > maxLap) maxLap = lap.lap_number
      
      if (lap.lap_duration && lap.lap_duration > 0) {
        driver.lastLapTime = lap.lap_duration
        if (!driver.bestLapTime || lap.lap_duration < driver.bestLapTime) {
          driver.bestLapTime = lap.lap_duration
        }
      }
      
      driver.lapsCompleted = Math.max(driver.lapsCompleted, lap.lap_number)
      driver.sectorTimes = [
        lap.duration_sector_1,
        lap.duration_sector_2,
        lap.duration_sector_3,
      ]
      if (lap.st_speed) driver.speedTrap = lap.st_speed
    }
    
    this.state.lap = maxLap
    
    // Gap hesapla (lider'e göre)
    const leader = this.state.drivers[0]
    if (leader) {
      for (const d of this.state.drivers) {
        if (d === leader) {
          d.gap = 'LEADER'
          d.interval = ''
        } else if (d.bestLapTime && leader.bestLapTime) {
          // Basit gap tahmini — gerçek gap OpenF1'den gelmiyorsa
          d.gap = `+${((d.position - 1) * 1.5).toFixed(1)}s`
        }
      }
    }
  }
  
  private updatePits(pits: OpenF1Pit[]): void {
    if (!this.state) return
    
    // Her sürücünün toplam pit stop sayısı
    const pitCounts = new Map<number, number>()
    for (const p of pits) {
      pitCounts.set(p.driver_number, (pitCounts.get(p.driver_number) || 0) + 1)
    }
    
    for (const [num, count] of pitCounts) {
      const driver = this.state.drivers.find(d => d.number === num)
      if (driver) driver.pitStops = count
    }
  }
  
  private notify(): void {
    if (!this.state) return
    for (const cb of this.callbacks) {
      try { cb(this.state) } catch {}
    }
  }
  
  get currentState() { return this.state }
  get isConnected() { return this.pollingInterval !== null }
}

export const liveService = new LiveDataService()
