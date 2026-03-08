/**
 * F1 Types — Temiz tip tanımları
 * Uydurma skill/speed puanları KALDIRILDI
 */

// Sürücü — sadece gerçek bilgiler
export interface Driver {
  code: string
  name: string
  team: string
  teamColor: string
  number: number
}

// Takım — sadece gerçek bilgiler
export interface Team {
  name: string
  color: string
}

// Pist
export interface Circuit {
  name: string
  country: string
  flag: string
  laps: number
  lapDistance: number
}

// Lastik
export type TyreCompound = 'SOFT' | 'MEDIUM' | 'HARD' | 'INTERMEDIATE' | 'WET'

// OpenF1 API tipleri
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
  st_speed: number | null
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

// Tahmin sonucu
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
