/**
 * F1 2026 Season Static Data
 * Sürücü, takım ve pist verileri
 */
import type { Driver, TeamPerf, TyreCompound, TyreData, Circuit } from './types'

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
  { name:'Madrid',            country:'İspanya',      flag:'🇪🇸', laps:66, lapDistance:5.47,  overtakeDifficulty:.30, tyreWear:.70, safetyCarProb:.020, drsZones:3, baseLapTime:82.0 },
  { name:'Montreal',          country:'Kanada',       flag:'🇨🇦', laps:70, lapDistance:4.361, overtakeDifficulty:.30, tyreWear:.50, safetyCarProb:.030, drsZones:2, baseLapTime:73.0 },
  { name:'Silverstone',       country:'İngiltere',    flag:'🇬🇧', laps:52, lapDistance:5.891, overtakeDifficulty:.35, tyreWear:.90, safetyCarProb:.018, drsZones:2, baseLapTime:87.0 },
  { name:'Spa-Francorchamps', country:'Belçika',      flag:'🇧🇪', laps:44, lapDistance:7.004, overtakeDifficulty:.25, tyreWear:.60, safetyCarProb:.025, drsZones:2, baseLapTime:105.0 },
  { name:'Zandvoort',         country:'Hollanda',     flag:'🇳🇱', laps:72, lapDistance:4.259, overtakeDifficulty:.65, tyreWear:.75, safetyCarProb:.022, drsZones:1, baseLapTime:71.0 },
  { name:'Monza',             country:'İtalya',       flag:'🇮🇹', laps:53, lapDistance:5.793, overtakeDifficulty:.20, tyreWear:.40, safetyCarProb:.015, drsZones:2, baseLapTime:81.0 },
  { name:'Baku',              country:'Azerbaycan',   flag:'🇦🇿', laps:51, lapDistance:6.003, overtakeDifficulty:.35, tyreWear:.50, safetyCarProb:.035, drsZones:2, baseLapTime:102.0 },
  { name:'Singapore',         country:'Singapur',     flag:'🇸🇬', laps:62, lapDistance:4.940, overtakeDifficulty:.55, tyreWear:.70, safetyCarProb:.035, drsZones:3, baseLapTime:98.0 },
  { name:'COTA',              country:'Austin',       flag:'🇺🇸', laps:56, lapDistance:5.513, overtakeDifficulty:.30, tyreWear:.70, safetyCarProb:.020, drsZones:2, baseLapTime:95.0 },
  { name:'Mexico City',       country:'Meksika',      flag:'🇲🇽', laps:71, lapDistance:4.304, overtakeDifficulty:.30, tyreWear:.65, safetyCarProb:.020, drsZones:3, baseLapTime:78.0 },
  { name:'Interlagos',        country:'Brezilya',     flag:'🇧🇷', laps:71, lapDistance:4.309, overtakeDifficulty:.30, tyreWear:.70, safetyCarProb:.028, drsZones:2, baseLapTime:70.0 },
  { name:'Las Vegas',         country:'Las Vegas',    flag:'🇺🇸', laps:50, lapDistance:6.201, overtakeDifficulty:.25, tyreWear:.50, safetyCarProb:.020, drsZones:2, baseLapTime:93.0 },
  { name:'Lusail',            country:'Katar',        flag:'🇶🇦', laps:57, lapDistance:5.419, overtakeDifficulty:.35, tyreWear:.80, safetyCarProb:.018, drsZones:2, baseLapTime:84.0 },
  { name:'Yas Marina',        country:'Abu Dabi',     flag:'🇦🇪', laps:58, lapDistance:5.281, overtakeDifficulty:.30, tyreWear:.60, safetyCarProb:.015, drsZones:2, baseLapTime:85.0 },
]

// Sürücü numarası → kod eşleştirmesi (OpenF1 API driver_number → code)
export const DRIVER_NUMBER_MAP: Record<number, string> = {
  1: 'VER', 20: 'HAD', 4: 'NOR', 81: 'PIA', 63: 'RUS', 12: 'ANT',
  16: 'LEC', 44: 'HAM', 14: 'ALO', 18: 'STR', 23: 'ALB', 55: 'SAI',
  10: 'GAS', 43: 'COL', 31: 'OCO', 87: 'BEA', 27: 'HUL', 5: 'BOR',
  30: 'LAW', 40: 'LIN', 11: 'PER', 77: 'BOT',
}
