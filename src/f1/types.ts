/**
 * F1 Predictor — Type Definitions
 * Her şeyin tek yerde tanımlı olması — tutarlılık ve güvenilirlik için.
 */

// ═══════════════════════════════════════════
// DRIVER & TEAM
// ═══════════════════════════════════════════
export interface Driver {
  code: string
  name: string
  team: string
  teamColor: string
  number: number
  skill: number        // 0-100
  racecraft: number    // 0-100
  consistency: number  // 0-100
  wetSkill: number     // 0-100
}

export interface TeamPerf {
  name: string
  color: string
  carSpeed: number       // 0-100
  reliability: number    // 0-100
  pitCrewSpeed: number   // saniye
  aeroEfficiency: number // 0-100
}

// ═══════════════════════════════════════════
// TYRE
// ═══════════════════════════════════════════
export type TyreCompound = 'soft' | 'medium' | 'hard' | 'inter' | 'wet'

export interface TyreData {
  name: string
  color: string
  gripBase: number
  degradationRate: number
  cliffLap: number
}

// ═══════════════════════════════════════════
// CIRCUIT
// ═══════════════════════════════════════════
export interface Circuit {
  name: string
  country: string
  flag: string
  laps: number
  lapDistance: number
  overtakeDifficulty: number
  tyreWear: number
  safetyCarProb: number
  drsZones: number
  baseLapTime: number
}

// ═══════════════════════════════════════════
// SIMULATION STATE
// ═══════════════════════════════════════════
export interface RacerState {
  driver: Driver
  position: number
  lap: number
  totalTime: number
  lastLapTime: number
  bestLapTime: number
  currentTyre: TyreCompound
  tyreAge: number
  tyreDeg: number
  pitStops: number
  pitHistory: { lap: number; compound: TyreCompound }[]
  gap: number
  interval: number
  drs: boolean
  dnf: boolean
  dnfLap: number
  status: 'racing' | 'pitting' | 'dnf'
}

export interface LapEvent {
  lap: number
  type: 'overtake' | 'pit' | 'sc' | 'vsc' | 'rain_start' | 'rain_end' | 'dnf' | 'fastest_lap'
  driverCode: string
  detail: string
}

export interface SimResult {
  circuit: Circuit
  weather: { condition: string; temp: number; rainLaps: [number, number] | null }
  standings: RacerState[]
  lapByLap: RacerState[][]
  events: LapEvent[]
  fastestLap: { driver: string; time: number; lap: number }
  seed: number
}

// ═══════════════════════════════════════════
// API TYPES (OpenF1)
// ═══════════════════════════════════════════
export interface OpenF1Session {
  session_key: number
  session_name: string
  session_type: string
  date_start: string
  date_end: string
  meeting_key: number
  year: number
  country_name: string
  circuit_short_name: string
}

export interface OpenF1Lap {
  driver_number: number
  lap_number: number
  lap_duration: number | null
  duration_sector_1: number | null
  duration_sector_2: number | null
  duration_sector_3: number | null
  is_pit_out_lap: boolean
  st_speed: number | null // speed trap
}

export interface OpenF1Position {
  driver_number: number
  position: number
  date: string
}

export interface OpenF1Driver {
  driver_number: number
  broadcast_name: string
  full_name: string
  name_acronym: string
  team_name: string
  team_colour: string
}

export interface OpenF1Weather {
  air_temperature: number
  track_temperature: number
  humidity: number
  rainfall: boolean
  wind_speed: number
  date: string
}

export interface OpenF1Pit {
  driver_number: number
  lap_number: number
  pit_duration: number
  date: string
}

export interface OpenF1Meeting {
  meeting_key: number
  meeting_name: string
  circuit_short_name: string
  country_name: string
  date_start: string
  date_end: string
  year: number
}

// ═══════════════════════════════════════════
// PREDICTOR TYPES
// ═══════════════════════════════════════════
export interface PredictionResult {
  driverCode: string
  driverName: string
  team: string
  teamColor: string
  predictedPosition: number
  winProbability: number
  podiumProbability: number
  confidence: number
  factors: {
    qualiPerformance: number
    historicalForm: number
    teamStrength: number
    circuitAffinity: number
    weatherAdaptation: number
  }
}

export interface BacktestResult {
  race: string
  year: number
  round: number
  predictions: PredictionResult[]
  actualResults: { driverCode: string; position: number }[]
  accuracy: {
    top3Accuracy: number    // ilk 3'ü doğru tahmin yüzdesi
    top10Accuracy: number   // ilk 10'u doğru tahmin yüzdesi
    winnerCorrect: boolean
    avgPositionError: number // ortalama pozisyon hatası
  }
}

export interface ModelMetrics {
  totalRaces: number
  winnerAccuracy: number
  podiumAccuracy: number
  top10Accuracy: number
  avgPositionError: number
  backtestResults: BacktestResult[]
}
