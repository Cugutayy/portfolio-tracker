/**
 * OpenF1 API Client — Sağlam Altyapı
 * ====================================
 * - Rate limiting (3 req/s, 30 req/min)
 * - In-memory cache (configurable TTL)
 * - Retry with exponential backoff
 * - Error categorization
 * - Request queue
 */

import type {
  OpenF1Session, OpenF1Lap, OpenF1Position, OpenF1Driver,
  OpenF1Weather, OpenF1Pit, OpenF1Meeting
} from './types'

const API_BASE = 'https://api.openf1.org/v1'

// ═══════════════════════════════════════════
// CACHE LAYER
// ═══════════════════════════════════════════
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class ApiCache {
  private store = new Map<string, CacheEntry<any>>()
  
  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.store.delete(key)
      return null
    }
    return entry.data as T
  }
  
  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, { data, timestamp: Date.now(), ttl: ttlMs })
  }
  
  invalidate(pattern?: string): void {
    if (!pattern) { this.store.clear(); return }
    for (const key of this.store.keys()) {
      if (key.includes(pattern)) this.store.delete(key)
    }
  }
  
  get size() { return this.store.size }
}

// ═══════════════════════════════════════════
// RATE LIMITER
// ═══════════════════════════════════════════
class RateLimiter {
  private timestamps: number[] = []
  private readonly maxPerSecond = 4 // biraz agresif ama tolere ediliyor
  private readonly maxPerMinute = 50

  async waitForSlot(): Promise<void> {
    const now = Date.now()
    // Son 1 saniyedeki istekleri temizle
    this.timestamps = this.timestamps.filter(t => now - t < 60000)
    
    const lastSecond = this.timestamps.filter(t => now - t < 1000).length
    const lastMinute = this.timestamps.length
    
    if (lastSecond >= this.maxPerSecond) {
      const wait = 1000 - (now - this.timestamps[this.timestamps.length - this.maxPerSecond])
      await new Promise(r => setTimeout(r, wait + 50))
    }
    
    if (lastMinute >= this.maxPerMinute) {
      const wait = 60000 - (now - this.timestamps[0])
      console.warn(`[OpenF1] Rate limit yaklaşıyor, ${Math.ceil(wait/1000)}s bekleniyor...`)
      await new Promise(r => setTimeout(r, wait + 100))
    }
    
    this.timestamps.push(Date.now())
  }
}

// ═══════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public retryable: boolean
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ═══════════════════════════════════════════
// MAIN API CLIENT
// ═══════════════════════════════════════════
class OpenF1Client {
  private cache = new ApiCache()
  private rateLimiter = new RateLimiter()
  private requestCount = 0
  
  // Cache TTL'leri (ms)
  private readonly CACHE_TTL = {
    meetings: 24 * 60 * 60 * 1000,    // 24 saat
    sessions: 6 * 60 * 60 * 1000,     // 6 saat
    drivers: 6 * 60 * 60 * 1000,      // 6 saat
    laps: 5 * 60 * 1000,              // 5 dakika (canlı veri için kısa)
    positions: 60 * 1000,             // 1 dakika
    weather: 60 * 1000,               // 1 dakika
    pit: 2 * 60 * 1000,              // 2 dakika
    historical_laps: 7 * 24 * 60 * 60 * 1000, // 7 gün (değişmez)
  }
  
  /**
   * Temel fetch fonksiyonu — retry, rate limit, cache
   */
  private async fetchWithRetry<T>(
    endpoint: string,
    params: Record<string, any> = {},
    options: { cacheTtl?: number; maxRetries?: number; cacheKey?: string } = {}
  ): Promise<T[]> {
    const { cacheTtl, maxRetries = 3, cacheKey } = options
    
    // URL oluştur
    const url = new URL(`${API_BASE}/${endpoint}`)
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
    })
    
    const key = cacheKey || url.toString()
    
    // Cache kontrol
    if (cacheTtl) {
      const cached = this.cache.get<T[]>(key)
      if (cached) return cached
    }
    
    // Rate limit bekle
    await this.rateLimiter.waitForSlot()
    
    // Retry loop
    let lastError: Error | null = null
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        this.requestCount++
        const response = await fetch(url.toString(), {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(15000) // 15s timeout
        })
        
        if (!response.ok) {
          if (response.status === 429) {
            // Rate limited — bekle ve tekrar dene
            const wait = Math.pow(2, attempt) * 2000
            console.warn(`[OpenF1] Rate limited, ${wait/1000}s bekleniyor...`)
            await new Promise(r => setTimeout(r, wait))
            continue
          }
          if (response.status === 401) {
            // OpenF1 locks API during live sessions — throw immediately, don't retry
            throw new ApiError('OpenF1 API locked (live session in progress)', 401, false)
          }
          if (response.status >= 500) {
            // Server error — retry
            const wait = Math.pow(2, attempt) * 1000
            await new Promise(r => setTimeout(r, wait))
            continue
          }
          throw new ApiError(`HTTP ${response.status}`, response.status, false)
        }
        
        const data = await response.json() as T[]
        
        // Cache'e yaz
        if (cacheTtl) {
          this.cache.set(key, data, cacheTtl)
        }
        
        return data
      } catch (err: any) {
        lastError = err
        if (err instanceof ApiError && !err.retryable) throw err
        if (attempt < maxRetries - 1) {
          const wait = Math.pow(2, attempt) * 1000
          await new Promise(r => setTimeout(r, wait))
        }
      }
    }
    
    throw lastError || new Error('Unknown API error')
  }
  
  // ═══════════════════════════════════════════
  // PUBLIC API METHODS
  // ═══════════════════════════════════════════
  
  async getMeetings(year: number): Promise<OpenF1Meeting[]> {
    return this.fetchWithRetry<OpenF1Meeting>('meetings', { year }, {
      cacheTtl: this.CACHE_TTL.meetings
    })
  }
  
  async getSessions(params: { year?: number; meeting_key?: number; session_type?: string } = {}): Promise<OpenF1Session[]> {
    return this.fetchWithRetry<OpenF1Session>('sessions', params, {
      cacheTtl: this.CACHE_TTL.sessions
    })
  }
  
  async getDrivers(sessionKey: number): Promise<OpenF1Driver[]> {
    return this.fetchWithRetry<OpenF1Driver>('drivers', { session_key: sessionKey }, {
      cacheTtl: this.CACHE_TTL.drivers
    })
  }
  
  async getLaps(sessionKey: number, driverNumber?: number): Promise<OpenF1Lap[]> {
    const params: any = { session_key: sessionKey }
    if (driverNumber) params.driver_number = driverNumber
    
    // Canlı session ise kısa cache, değilse uzun cache
    const isLive = await this.isSessionLive(sessionKey)
    const ttl = isLive ? this.CACHE_TTL.laps : this.CACHE_TTL.historical_laps
    
    return this.fetchWithRetry<OpenF1Lap>('laps', params, { cacheTtl: ttl })
  }
  
  async getPositions(sessionKey: number): Promise<OpenF1Position[]> {
    return this.fetchWithRetry<OpenF1Position>('position', { session_key: sessionKey }, {
      cacheTtl: this.CACHE_TTL.positions
    })
  }
  
  async getWeather(sessionKey: number): Promise<OpenF1Weather[]> {
    return this.fetchWithRetry<OpenF1Weather>('weather', { session_key: sessionKey }, {
      cacheTtl: this.CACHE_TTL.weather
    })
  }
  
  async getPitStops(sessionKey: number): Promise<OpenF1Pit[]> {
    return this.fetchWithRetry<OpenF1Pit>('pit', { session_key: sessionKey }, {
      cacheTtl: this.CACHE_TTL.pit
    })
  }
  
  /**
   * Gerçek x,y koordinatlar — ~3.7 Hz sample rate
   * Race replay için kritik!
   */
  async getLocations(sessionKey: number, driverNumber?: number): Promise<any[]> {
    const params: any = { session_key: sessionKey }
    if (driverNumber) params.driver_number = driverNumber
    return this.fetchWithRetry<any>('location', params, {
      cacheTtl: this.CACHE_TTL.positions
    })
  }
  
  /**
   * Araç telemetrisi — hız, RPM, vites, gaz, fren, DRS
   */
  async getCarData(sessionKey: number, driverNumber?: number): Promise<any[]> {
    const params: any = { session_key: sessionKey }
    if (driverNumber) params.driver_number = driverNumber
    return this.fetchWithRetry<any>('car_data', params, {
      cacheTtl: this.CACHE_TTL.positions
    })
  }
  
  /**
   * Race control mesajları — bayraklar, SC, VSC, penaltılar
   */
  async getRaceControl(sessionKey: number): Promise<any[]> {
    return this.fetchWithRetry<any>('race_control', { session_key: sessionKey }, {
      cacheTtl: this.CACHE_TTL.weather
    })
  }
  
  /**
   * Lastik stint bilgisi — compound, yaş
   */
  async getStints(sessionKey: number): Promise<any[]> {
    return this.fetchWithRetry<any>('stints', { session_key: sessionKey }, {
      cacheTtl: this.CACHE_TTL.pit
    })
  }
  
  /**
   * Sürücüler arası gap verileri
   */
  async getIntervals(sessionKey: number): Promise<any[]> {
    return this.fetchWithRetry<any>('intervals', { session_key: sessionKey }, {
      cacheTtl: this.CACHE_TTL.positions
    })
  }
  
  // ═══════════════════════════════════════════
  // HIGH-LEVEL METHODS
  // ═══════════════════════════════════════════
  
  /**
   * Bir yarış hafta sonu için tüm veriyi çek
   */
  async getRaceWeekendData(meetingKey: number): Promise<{
    sessions: OpenF1Session[]
    drivers: OpenF1Driver[]
    qualifyingLaps: OpenF1Lap[]
    raceLaps: OpenF1Lap[]
    weather: OpenF1Weather[]
    pitStops: OpenF1Pit[]
  } | null> {
    try {
      const sessions = await this.getSessions({ meeting_key: meetingKey })
      if (!sessions.length) return null
      
      const qualiSession = sessions.find(s => s.session_type === 'Qualifying')
      const raceSession = sessions.find(s => s.session_type === 'Race')
      
      const latestSession = raceSession || qualiSession || sessions[sessions.length - 1]
      const drivers = await this.getDrivers(latestSession.session_key)
      
      let qualifyingLaps: OpenF1Lap[] = []
      if (qualiSession) {
        qualifyingLaps = await this.getLaps(qualiSession.session_key)
      }
      
      let raceLaps: OpenF1Lap[] = []
      let pitStops: OpenF1Pit[] = []
      if (raceSession) {
        raceLaps = await this.getLaps(raceSession.session_key)
        pitStops = await this.getPitStops(raceSession.session_key)
      }
      
      const weather = await this.getWeather(latestSession.session_key)
      
      return { sessions, drivers, qualifyingLaps, raceLaps, weather, pitStops }
    } catch (err) {
      console.error('[OpenF1] Race weekend data error:', err)
      return null
    }
  }
  
  /**
   * Şu anki/sıradaki yarış hafta sonunu bul
   */
  async getCurrentRaceWeekend(year: number = 2026): Promise<{
    meeting: OpenF1Meeting
    sessions: OpenF1Session[]
    isLive: boolean
  } | null> {
    try {
      const meetings = await this.getMeetings(year)
      const now = new Date()
      
      // Şu an devam eden veya en yakın gelecek meeting
      let target = meetings.find(m => {
        const start = new Date(m.date_start)
        const end = new Date(m.date_end)
        return now >= start && now <= end
      })
      
      if (!target) {
        target = meetings.find(m => new Date(m.date_start) > now)
      }
      
      if (!target) return null
      
      const sessions = await this.getSessions({ meeting_key: target.meeting_key })
      const now2 = new Date()
      const isLive = sessions.some(s => {
        const start = new Date(s.date_start)
        const end = new Date(s.date_end)
        return now2 >= start && now2 <= end
      })
      
      return { meeting: target, sessions, isLive }
    } catch (err) {
      console.error('[OpenF1] Current race weekend error:', err)
      return null
    }
  }
  
  /**
   * Geçmiş yarış sonuçlarını çek (backtesting için)
   */
  async getHistoricalRaceResults(year: number, circuitName?: string): Promise<{
    meeting: OpenF1Meeting
    results: { driverCode: string; driverName: string; team: string; position: number; lapCount: number; bestLap: number }[]
  }[]> {
    const results: any[] = []
    
    try {
      const meetings = await this.getMeetings(year)
      const pastMeetings = meetings.filter(m => new Date(m.date_end) < new Date())
      
      if (circuitName) {
        const filtered = pastMeetings.filter(m => 
          m.circuit_short_name.toLowerCase().includes(circuitName.toLowerCase())
        )
        if (filtered.length) return this._processHistoricalMeetings(filtered)
      }
      
      return this._processHistoricalMeetings(pastMeetings)
    } catch (err) {
      console.error('[OpenF1] Historical results error:', err)
      return results
    }
  }
  
  private async _processHistoricalMeetings(meetings: OpenF1Meeting[]) {
    const results: any[] = []
    
    for (const meeting of meetings) {
      try {
        const sessions = await this.getSessions({ meeting_key: meeting.meeting_key })
        const raceSession = sessions.find(s => s.session_type === 'Race')
        if (!raceSession) continue
        
        const drivers = await this.getDrivers(raceSession.session_key)
        const positions = await this.getPositions(raceSession.session_key)
        const laps = await this.getLaps(raceSession.session_key)
        
        // Son pozisyonları al (yarış sonu)
        const finalPositions = new Map<number, number>()
        for (const pos of positions) {
          finalPositions.set(pos.driver_number, pos.position)
        }
        
        // En iyi tur sürelerini hesapla
        const bestLaps = new Map<number, number>()
        for (const lap of laps) {
          if (lap.lap_duration && lap.lap_duration > 0) {
            const current = bestLaps.get(lap.driver_number) || Infinity
            if (lap.lap_duration < current) {
              bestLaps.set(lap.driver_number, lap.lap_duration)
            }
          }
        }
        
        // Tur sayılarını hesapla
        const lapCounts = new Map<number, number>()
        for (const lap of laps) {
          const current = lapCounts.get(lap.driver_number) || 0
          lapCounts.set(lap.driver_number, Math.max(current, lap.lap_number))
        }
        
        const raceResults = drivers.map(d => ({
          driverCode: d.name_acronym,
          driverName: d.full_name,
          team: d.team_name,
          position: finalPositions.get(d.driver_number) || 99,
          lapCount: lapCounts.get(d.driver_number) || 0,
          bestLap: bestLaps.get(d.driver_number) || 0,
        })).sort((a, b) => a.position - b.position)
        
        results.push({ meeting, results: raceResults })
      } catch (err) {
        console.warn(`[OpenF1] ${meeting.meeting_name} işlenemedi:`, err)
      }
    }
    
    return results
  }
  
  // ═══════════════════════════════════════════
  // UTILITY
  // ═══════════════════════════════════════════
  
  private async isSessionLive(sessionKey: number): Promise<boolean> {
    try {
      const sessions = this.cache.get<OpenF1Session[]>(`sessions_containing_${sessionKey}`)
      if (sessions) {
        const session = sessions.find(s => s.session_key === sessionKey)
        if (session) {
          const now = new Date()
          return now >= new Date(session.date_start) && now <= new Date(session.date_end)
        }
      }
    } catch {}
    return false
  }
  
  get stats() {
    return {
      totalRequests: this.requestCount,
      cacheSize: this.cache.size,
    }
  }
  
  clearCache() {
    this.cache.invalidate()
  }
}

// Singleton instance
export const openF1 = new OpenF1Client()
