/**
 * F1 Race Simulation Engine — 2026 Season
 * ========================================
 * Tur bazlı Monte Carlo yarış simülasyonu + OpenF1 API canlı veri
 * 
 * Özellikler:
 * - Lastik degradasyonu (S/M/H/I/W)
 * - Safety Car / VSC olasılık modeli
 * - Hava durumu değişimleri
 * - Pit stop stratejisi optimizasyonu
 * - DRS ve overtake modeli
 * - OpenF1 API ile canlı veri entegrasyonu
 */

// ═══════════════════════════════════════════
// TİPLER
// ═══════════════════════════════════════════
export interface Driver {
  code: string; name: string; team: string; teamColor: string; number: number
  skill: number; racecraft: number; consistency: number; wetSkill: number
}

export interface TeamPerf {
  name: string; color: string; carSpeed: number; reliability: number
  pitCrewSpeed: number; aeroEfficiency: number
}

export type TyreCompound = 'soft' | 'medium' | 'hard' | 'inter' | 'wet'

export interface TyreData {
  name: string; color: string; gripBase: number
  degradationRate: number; cliffLap: number
}

export interface Circuit {
  name: string; country: string; flag: string; laps: number; lapDistance: number
  overtakeDifficulty: number; tyreWear: number; safetyCarProb: number
  drsZones: number; baseLapTime: number
}

export interface RacerState {
  driver: Driver; position: number; lap: number
  totalTime: number; lastLapTime: number; bestLapTime: number
  currentTyre: TyreCompound; tyreAge: number; tyreDeg: number
  pitStops: number; pitHistory: { lap: number; compound: TyreCompound }[]
  gap: number; interval: number; drs: boolean
  dnf: boolean; dnfLap: number; status: 'racing' | 'pitting' | 'dnf'
}

export interface LapEvent {
  lap: number
  type: 'overtake' | 'pit' | 'sc' | 'vsc' | 'rain_start' | 'rain_end' | 'dnf' | 'fastest_lap'
  driverCode: string; detail: string
}

export interface SimResult {
  circuit: Circuit
  weather: { condition: string; temp: number; rainLaps: [number, number] | null }
  standings: RacerState[]
  lapByLap: RacerState[][]
  events: LapEvent[]
  fastestLap: { driver: string; time: number; lap: number }
}

// ═══════════════════════════════════════════
// VERİ
// ═══════════════════════════════════════════
export const DRIVERS: Driver[] = [
  { code:'VER', name:'Max Verstappen',    team:'Red Bull',     teamColor:'#3671C6', number:1,  skill:98, racecraft:97, consistency:95, wetSkill:96 },
  { code:'HAD', name:'Isack Hadjar',      team:'Red Bull',     teamColor:'#3671C6', number:20, skill:78, racecraft:72, consistency:70, wetSkill:68 },
  { code:'NOR', name:'Lando Norris',      team:'McLaren',      teamColor:'#FF8000', number:4,  skill:95, racecraft:92, consistency:91, wetSkill:88 },
  { code:'PIA', name:'Oscar Piastri',     team:'McLaren',      teamColor:'#FF8000', number:81, skill:91, racecraft:88, consistency:88, wetSkill:82 },
  { code:'RUS', name:'George Russell',    team:'Mercedes',     teamColor:'#27F4D2', number:63, skill:91, racecraft:89, consistency:87, wetSkill:85 },
  { code:'ANT', name:'Kimi Antonelli',    team:'Mercedes',     teamColor:'#27F4D2', number:12, skill:82, racecraft:76, consistency:72, wetSkill:70 },
  { code:'LEC', name:'Charles Leclerc',   team:'Ferrari',      teamColor:'#E8002D', number:16, skill:93, racecraft:91, consistency:84, wetSkill:83 },
  { code:'HAM', name:'Lewis Hamilton',    team:'Ferrari',      teamColor:'#E8002D', number:44, skill:92, racecraft:96, consistency:86, wetSkill:97 },
  { code:'ALO', name:'Fernando Alonso',   team:'Aston Martin', teamColor:'#229971', number:14, skill:89, racecraft:95, consistency:88, wetSkill:93 },
  { code:'STR', name:'Lance Stroll',      team:'Aston Martin', teamColor:'#229971', number:18, skill:75, racecraft:70, consistency:68, wetSkill:65 },
  { code:'ALB', name:'Alexander Albon',   team:'Williams',     teamColor:'#64C4FF', number:23, skill:82, racecraft:80, consistency:80, wetSkill:78 },
  { code:'SAI', name:'Carlos Sainz',      team:'Williams',     teamColor:'#64C4FF', number:55, skill:88, racecraft:86, consistency:88, wetSkill:84 },
  { code:'GAS', name:'Pierre Gasly',      team:'Alpine',       teamColor:'#FF87BC', number:10, skill:83, racecraft:81, consistency:80, wetSkill:79 },
  { code:'COL', name:'Franco Colapinto',  team:'Alpine',       teamColor:'#FF87BC', number:43, skill:74, racecraft:70, consistency:66, wetSkill:64 },
  { code:'OCO', name:'Esteban Ocon',      team:'Haas',         teamColor:'#B6BABD', number:31, skill:80, racecraft:78, consistency:76, wetSkill:74 },
  { code:'BEA', name:'Oliver Bearman',    team:'Haas',         teamColor:'#B6BABD', number:87, skill:76, racecraft:72, consistency:70, wetSkill:68 },
  { code:'HUL', name:'Nico Hulkenberg',   team:'Audi',         teamColor:'#00E701', number:27, skill:80, racecraft:79, consistency:82, wetSkill:80 },
  { code:'BOR', name:'Gabriel Bortoleto', team:'Audi',         teamColor:'#00E701', number:5,  skill:75, racecraft:71, consistency:68, wetSkill:66 },
  { code:'LAW', name:'Liam Lawson',       team:'Racing Bulls', teamColor:'#6692FF', number:30, skill:79, racecraft:76, consistency:74, wetSkill:72 },
  { code:'LIN', name:'Arvid Lindblad',    team:'Racing Bulls', teamColor:'#6692FF', number:40, skill:72, racecraft:68, consistency:64, wetSkill:62 },
  { code:'PER', name:'Sergio Perez',      team:'Cadillac',     teamColor:'#1B3D2F', number:11, skill:78, racecraft:80, consistency:70, wetSkill:76 },
  { code:'BOT', name:'Valtteri Bottas',   team:'Cadillac',     teamColor:'#1B3D2F', number:77, skill:79, racecraft:75, consistency:78, wetSkill:80 },
]

export const TEAMS: Record<string, TeamPerf> = {
  'McLaren':      { name:'McLaren',      color:'#FF8000', carSpeed:96, reliability:92, pitCrewSpeed:2.3, aeroEfficiency:95 },
  'Mercedes':     { name:'Mercedes',     color:'#27F4D2', carSpeed:94, reliability:93, pitCrewSpeed:2.4, aeroEfficiency:93 },
  'Red Bull':     { name:'Red Bull',     color:'#3671C6', carSpeed:95, reliability:90, pitCrewSpeed:2.2, aeroEfficiency:96 },
  'Ferrari':      { name:'Ferrari',      color:'#E8002D', carSpeed:93, reliability:88, pitCrewSpeed:2.5, aeroEfficiency:92 },
  'Aston Martin': { name:'Aston Martin', color:'#229971', carSpeed:88, reliability:86, pitCrewSpeed:2.6, aeroEfficiency:88 },
  'Williams':     { name:'Williams',     color:'#64C4FF', carSpeed:84, reliability:82, pitCrewSpeed:2.7, aeroEfficiency:84 },
  'Alpine':       { name:'Alpine',       color:'#FF87BC', carSpeed:82, reliability:84, pitCrewSpeed:2.8, aeroEfficiency:82 },
  'Haas':         { name:'Haas',         color:'#B6BABD', carSpeed:80, reliability:80, pitCrewSpeed:2.9, aeroEfficiency:80 },
  'Audi':         { name:'Audi',         color:'#00E701', carSpeed:78, reliability:78, pitCrewSpeed:3.0, aeroEfficiency:78 },
  'Racing Bulls': { name:'Racing Bulls', color:'#6692FF', carSpeed:83, reliability:83, pitCrewSpeed:2.7, aeroEfficiency:83 },
  'Cadillac':     { name:'Cadillac',     color:'#1B3D2F', carSpeed:72, reliability:70, pitCrewSpeed:3.2, aeroEfficiency:72 },
}

export const TYRES: Record<TyreCompound, TyreData> = {
  soft:   { name:'Soft',   color:'#FF3333', gripBase:1.00, degradationRate:0.018, cliffLap:22 },
  medium: { name:'Medium', color:'#FFD700', gripBase:0.95, degradationRate:0.010, cliffLap:36 },
  hard:   { name:'Hard',   color:'#FFFFFF', gripBase:0.88, degradationRate:0.006, cliffLap:50 },
  inter:  { name:'Inter',  color:'#00CC00', gripBase:0.82, degradationRate:0.012, cliffLap:30 },
  wet:    { name:'Wet',    color:'#0066FF', gripBase:0.70, degradationRate:0.008, cliffLap:40 },
}

export const CIRCUITS: Circuit[] = [
  { name:'Albert Park',       country:'Avustralya',   flag:'🇦🇺', laps:58, lapDistance:5.278, overtakeDifficulty:.35, tyreWear:.70, safetyCarProb:.025, drsZones:4, baseLapTime:79.5 },
  { name:'Shanghai',          country:'Çin',          flag:'🇨🇳', laps:56, lapDistance:5.451, overtakeDifficulty:.30, tyreWear:.60, safetyCarProb:.020, drsZones:2, baseLapTime:94.0 },
  { name:'Suzuka',            country:'Japonya',      flag:'🇯🇵', laps:53, lapDistance:5.807, overtakeDifficulty:.50, tyreWear:.80, safetyCarProb:.018, drsZones:1, baseLapTime:90.0 },
  { name:'Bahrain',           country:'Bahreyn',      flag:'🇧🇭', laps:57, lapDistance:5.412, overtakeDifficulty:.25, tyreWear:.80, safetyCarProb:.015, drsZones:3, baseLapTime:90.5 },
  { name:'Jeddah',            country:'S. Arabistan', flag:'🇸🇦', laps:50, lapDistance:6.174, overtakeDifficulty:.40, tyreWear:.50, safetyCarProb:.035, drsZones:3, baseLapTime:88.0 },
  { name:'Miami',             country:'Miami',        flag:'🇺🇸', laps:57, lapDistance:5.412, overtakeDifficulty:.30, tyreWear:.70, safetyCarProb:.020, drsZones:3, baseLapTime:89.0 },
  { name:'Monaco',            country:'Monako',       flag:'🇲🇨', laps:78, lapDistance:3.337, overtakeDifficulty:.95, tyreWear:.30, safetyCarProb:.040, drsZones:1, baseLapTime:72.0 },
  { name:'Silverstone',       country:'İngiltere',    flag:'🇬🇧', laps:52, lapDistance:5.891, overtakeDifficulty:.35, tyreWear:.90, safetyCarProb:.018, drsZones:2, baseLapTime:87.0 },
  { name:'Spa-Francorchamps', country:'Belçika',      flag:'🇧🇪', laps:44, lapDistance:7.004, overtakeDifficulty:.25, tyreWear:.60, safetyCarProb:.025, drsZones:2, baseLapTime:105.0 },
  { name:'Monza',             country:'İtalya',       flag:'🇮🇹', laps:53, lapDistance:5.793, overtakeDifficulty:.20, tyreWear:.40, safetyCarProb:.015, drsZones:2, baseLapTime:81.0 },
  { name:'Singapore',         country:'Singapur',     flag:'🇸🇬', laps:62, lapDistance:4.940, overtakeDifficulty:.55, tyreWear:.70, safetyCarProb:.035, drsZones:3, baseLapTime:98.0 },
  { name:'Interlagos',        country:'Brezilya',     flag:'🇧🇷', laps:71, lapDistance:4.309, overtakeDifficulty:.30, tyreWear:.70, safetyCarProb:.028, drsZones:2, baseLapTime:70.0 },
  { name:'Las Vegas',         country:'Las Vegas',    flag:'🇺🇸', laps:50, lapDistance:6.201, overtakeDifficulty:.25, tyreWear:.50, safetyCarProb:.020, drsZones:2, baseLapTime:93.0 },
  { name:'Yas Marina',        country:'Abu Dabi',     flag:'🇦🇪', laps:58, lapDistance:5.281, overtakeDifficulty:.30, tyreWear:.60, safetyCarProb:.015, drsZones:2, baseLapTime:85.0 },
]

// ═══════════════════════════════════════════
// YARDIMCI FONKSİYONLAR
// ═══════════════════════════════════════════
function seededRandom(seed: number): () => number {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

function gaussianRandom(rand: () => number): number {
  const u1 = rand(), u2 = rand()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

function calcLapTime(
  racer: RacerState, circuit: Circuit, team: TeamPerf,
  weather: string, scActive: boolean, rand: () => number
): number {
  const base = circuit.baseLapTime
  
  // Araç performansı (0-4 saniye fark)
  const carDelta = (100 - team.carSpeed) * 0.04
  
  // Sürücü yeteneği (0-1.5 saniye fark)
  const driverDelta = (100 - racer.driver.skill) * 0.015
  
  // Lastik degradasyonu
  const tyreData = TYRES[racer.currentTyre]
  const deg = Math.max(0.3, racer.tyreDeg)
  const tyreDelta = (1 - deg) * 3.5  // Tam degradasyonda 3.5s kayıp
  
  // Uçurum (cliff) — lastik ömrünü geçerse dramatik kayıp
  let cliffPenalty = 0
  if (racer.tyreAge > tyreData.cliffLap) {
    cliffPenalty = (racer.tyreAge - tyreData.cliffLap) * 0.3
  }
  
  // Hava durumu etkisi
  let weatherDelta = 0
  if (weather === 'light_rain') {
    if (racer.currentTyre === 'soft' || racer.currentTyre === 'medium' || racer.currentTyre === 'hard') {
      weatherDelta = 8 - (racer.driver.wetSkill * 0.04)  // Kuru lastikle yağmurda 4-8s kayıp
    } else {
      weatherDelta = (100 - racer.driver.wetSkill) * 0.02
    }
  } else if (weather === 'heavy_rain') {
    if (racer.currentTyre === 'wet') {
      weatherDelta = (100 - racer.driver.wetSkill) * 0.025
    } else if (racer.currentTyre === 'inter') {
      weatherDelta = 3 + (100 - racer.driver.wetSkill) * 0.03
    } else {
      weatherDelta = 15  // Kuru lastikle ağır yağmur — çok tehlikeli
    }
  }
  
  // Safety Car
  if (scActive) return base + 25  // SC arkasında yavaş tur
  
  // DRS avantajı
  const drsDelta = racer.drs ? -0.3 * circuit.drsZones : 0
  
  // Rastgele varyasyon (tutarlılık bazlı)
  const variance = (100 - racer.driver.consistency) * 0.008
  const randomDelta = gaussianRandom(rand) * variance
  
  // Yakıt etkisi (tur ilerledikçe hafifleyen araç)
  const fuelDelta = (1 - racer.lap / circuit.laps) * 0.8
  
  return base + carDelta + driverDelta + tyreDelta + cliffPenalty + weatherDelta + drsDelta + randomDelta + fuelDelta
}

function shouldPit(racer: RacerState, circuit: Circuit, weather: string, rand: () => number): TyreCompound | null {
  const tyreData = TYRES[racer.currentTyre]
  const remainingLaps = circuit.laps - racer.lap
  
  // Zorunlu pit: yağmur başladıysa ve kuru lastikteyse
  if ((weather === 'light_rain' || weather === 'heavy_rain') && 
      ['soft', 'medium', 'hard'].includes(racer.currentTyre)) {
    return weather === 'heavy_rain' ? 'wet' : 'inter'
  }
  
  // Yağmur durdu, ıslak lastikteyse kuru lastik
  if (weather === 'dry' && (racer.currentTyre === 'inter' || racer.currentTyre === 'wet')) {
    if (racer.tyreAge > 3) return remainingLaps > 25 ? 'medium' : 'soft'
  }
  
  // Uçurum yaklaşıyorsa pit
  if (racer.tyreAge >= tyreData.cliffLap - 2 && remainingLaps > 5) {
    if (remainingLaps > 30) return 'hard'
    if (remainingLaps > 18) return 'medium'
    return 'soft'
  }
  
  // Stratejik pit: henüz pit yapmamışsa ve yarışın %40-60 arası
  if (racer.pitStops === 0 && racer.lap > circuit.laps * 0.35 && racer.lap < circuit.laps * 0.55) {
    if (racer.tyreDeg < 0.65 && rand() < 0.3) {
      return remainingLaps > 25 ? 'hard' : 'medium'
    }
  }
  
  return null  // Pit yapma
}

// ═══════════════════════════════════════════
// ANA SİMÜLASYON
// ═══════════════════════════════════════════
export function simulateRace(circuit: Circuit, seed?: number, rainProb?: number): SimResult {
  const rand = seededRandom(seed || Date.now())
  const events: LapEvent[] = []
  
  // Hava durumu planla
  let weatherCondition = 'dry'
  let rainLaps: [number, number] | null = null
  const rp = rainProb ?? 0.15
  if (rand() < rp) {
    const start = Math.floor(rand() * circuit.laps * 0.5) + Math.floor(circuit.laps * 0.15)
    const dur = Math.floor(rand() * 15) + 5
    rainLaps = [start, Math.min(start + dur, circuit.laps)]
  }
  
  // Grid oluştur (kvalifikasyon simülasyonu)
  const grid: RacerState[] = DRIVERS.map(driver => {
    const team = TEAMS[driver.team]
    const qualiPerf = driver.skill * 0.5 + team.carSpeed * 0.5 + gaussianRandom(rand) * 2
    return {
      driver, position: 0, lap: 0, totalTime: 0, lastLapTime: 0, bestLapTime: 999,
      currentTyre: 'medium' as TyreCompound, tyreAge: 0, tyreDeg: 1.0,
      pitStops: 0, pitHistory: [], gap: 0, interval: 0,
      drs: false, dnf: false, dnfLap: 0, status: 'racing' as const,
      _qualiPerf: qualiPerf
    }
  }).sort((a, b) => (b as any)._qualiPerf - (a as any)._qualiPerf)
  
  // Grid pozisyonları ata + başlangıç lastikleri
  grid.forEach((r, i) => {
    r.position = i + 1
    delete (r as any)._qualiPerf
    r.currentTyre = i < 10 ? 'soft' : (rand() < 0.6 ? 'medium' : 'hard')
    r.tyreDeg = 1.0
    r.tyreAge = 0
  })
  
  // SC durumu
  let scActive = false, scStartLap = 0, scDuration = 0
  
  // Fastest lap tracker
  let fastestLap = { driver: '', time: 999, lap: 0 }
  
  // Tur tur simülasyon
  const lapByLap: RacerState[][] = []
  
  for (let lap = 1; lap <= circuit.laps; lap++) {
    // Hava durumu güncelle
    if (rainLaps) {
      if (lap === rainLaps[0]) {
        weatherCondition = rand() < 0.4 ? 'heavy_rain' : 'light_rain'
        events.push({ lap, type: 'rain_start', driverCode: '', detail: weatherCondition === 'heavy_rain' ? 'Ağır yağmur başladı!' : 'Hafif yağmur başladı' })
      }
      if (lap === rainLaps[1]) {
        weatherCondition = 'dry'
        events.push({ lap, type: 'rain_end', driverCode: '', detail: 'Yağmur durdu, pist kuruyor' })
      }
    }
    
    // Safety Car kontrolü
    if (!scActive && rand() < circuit.safetyCarProb) {
      if (rand() < 0.6) {
        scActive = true; scStartLap = lap; scDuration = Math.floor(rand() * 4) + 2
        events.push({ lap, type: 'sc', driverCode: '', detail: `Safety Car — ${scDuration} tur` })
      } else {
        events.push({ lap, type: 'vsc', driverCode: '', detail: 'Virtual Safety Car — 1 tur' })
      }
    }
    if (scActive && lap >= scStartLap + scDuration) {
      scActive = false
    }
    
    // Her sürücü için tur hesapla
    for (const racer of grid) {
      if (racer.dnf) continue
      racer.lap = lap
      
      // DNF kontrolü
      const team = TEAMS[racer.driver.team]
      if (rand() < (1 - team.reliability / 100) * 0.015) {
        racer.dnf = true; racer.dnfLap = lap; racer.status = 'dnf'
        events.push({ lap, type: 'dnf', driverCode: racer.driver.code, detail: `${racer.driver.name} yarış dışı!` })
        continue
      }
      
      // Pit stop kararı
      const pitTo = shouldPit(racer, circuit, weatherCondition, rand)
      if (pitTo) {
        racer.pitStops++
        racer.pitHistory.push({ lap, compound: pitTo })
        racer.currentTyre = pitTo
        racer.tyreAge = 0; racer.tyreDeg = 1.0
        racer.totalTime += team.pitCrewSpeed + 20  // pit lane sürüş + duruş
        racer.status = 'pitting'
        events.push({ lap, type: 'pit', driverCode: racer.driver.code, detail: `Pit → ${TYRES[pitTo].name} (${racer.pitStops}. duruş)` })
      } else {
        racer.status = 'racing'
      }
      
      // DRS hesapla (öndeki araca 1s'den yakınsa)
      const posIdx = grid.findIndex(r => r === racer)
      racer.drs = false
      if (posIdx > 0 && !scActive) {
        const ahead = grid[posIdx - 1]
        if (!ahead.dnf && racer.totalTime - ahead.totalTime < 1.0 && racer.totalTime - ahead.totalTime > 0) {
          racer.drs = true
        }
      }
      
      // Tur süresini hesapla
      const lapTime = calcLapTime(racer, circuit, team, weatherCondition, scActive, rand)
      racer.lastLapTime = lapTime
      racer.totalTime += lapTime
      if (lapTime < racer.bestLapTime) racer.bestLapTime = lapTime
      if (lapTime < fastestLap.time && lap > 3) {
        fastestLap = { driver: racer.driver.code, time: lapTime, lap }
      }
      
      // Lastik degradasyonu güncelle
      const tyreData = TYRES[racer.currentTyre]
      racer.tyreAge++
      racer.tyreDeg = Math.max(0.2, racer.tyreDeg - tyreData.degradationRate * circuit.tyreWear)
    }
    
    // Sıralama güncelle (totalTime'a göre, DNF'ler en sona)
    grid.sort((a, b) => {
      if (a.dnf && !b.dnf) return 1
      if (!a.dnf && b.dnf) return -1
      if (a.dnf && b.dnf) return b.dnfLap - a.dnfLap
      return a.totalTime - b.totalTime
    })
    grid.forEach((r, i) => {
      r.position = i + 1
      r.gap = r.dnf ? -1 : r.totalTime - grid[0].totalTime
      r.interval = i === 0 ? 0 : (r.dnf ? -1 : r.totalTime - grid[i-1].totalTime)
    })
    
    // Overtake event'leri (pozisyon değişimleri)
    // (basitleştirilmiş — sıralama totalTime'a göre zaten yapılıyor)
    
    // Tur snapshot'ı kaydet
    lapByLap.push(grid.map(r => ({ ...r, driver: { ...r.driver }, pitHistory: [...r.pitHistory] })))
  }
  
  return {
    circuit,
    weather: { condition: weatherCondition, temp: 25, rainLaps },
    standings: grid,
    lapByLap,
    events,
    fastestLap
  }
}

// ═══════════════════════════════════════════
// OpenF1 API FONKSİYONLARI
// ═══════════════════════════════════════════
const API_BASE = 'https://api.openf1.org/v1'

export async function fetchSessions(year: number): Promise<any[]> {
  const res = await fetch(`${API_BASE}/sessions?year=${year}`)
  return res.json()
}

export async function fetchLaps(sessionKey: number, driverNumber?: number): Promise<any[]> {
  let url = `${API_BASE}/laps?session_key=${sessionKey}`
  if (driverNumber) url += `&driver_number=${driverNumber}`
  const res = await fetch(url)
  return res.json()
}

export async function fetchDrivers(sessionKey: number): Promise<any[]> {
  const res = await fetch(`${API_BASE}/drivers?session_key=${sessionKey}`)
  return res.json()
}

export async function fetchWeather(sessionKey: number): Promise<any[]> {
  const res = await fetch(`${API_BASE}/weather?session_key=${sessionKey}`)
  return res.json()
}

export async function fetchPositions(sessionKey: number): Promise<any[]> {
  const res = await fetch(`${API_BASE}/position?session_key=${sessionKey}`)
  return res.json()
}

export async function fetchPitStops(sessionKey: number): Promise<any[]> {
  const res = await fetch(`${API_BASE}/pit?session_key=${sessionKey}`)
  return res.json()
}

export async function fetchMeetings(year: number): Promise<any[]> {
  const res = await fetch(`${API_BASE}/meetings?year=${year}`)
  return res.json()
}

/**
 * Bu pazar (Avustralya GP) için mevcut session bilgisini çek
 */
export async function fetchCurrentRaceWeekend(): Promise<{
  meeting: any; sessions: any[]; latestSession: any
} | null> {
  try {
    const meetings = await fetchMeetings(2026)
    // En yakın meeting'i bul
    const now = new Date()
    const upcoming = meetings.find(m => new Date(m.date_end) > now)
    if (!upcoming) return null
    
    const sessions = await fetchSessions(2026)
    const meetingSessions = sessions.filter(s => s.meeting_key === upcoming.meeting_key)
    const latestSession = meetingSessions[meetingSessions.length - 1]
    
    return { meeting: upcoming, sessions: meetingSessions, latestSession }
  } catch (e) {
    console.error('OpenF1 API hatası:', e)
    return null
  }
}
