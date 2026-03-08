/**
 * F1 2026 Season Data — sadece gerçek bilgiler
 * Uydurma skill/speed puanları YOK
 */
import type { Driver, Team } from './types'

export const DRIVERS: Driver[] = [
  { code:'VER', name:'Max Verstappen',    team:'Red Bull',     teamColor:'#3671C6', number:1 },
  { code:'HAD', name:'Isack Hadjar',      team:'Red Bull',     teamColor:'#3671C6', number:20 },
  { code:'NOR', name:'Lando Norris',      team:'McLaren',      teamColor:'#FF8000', number:4 },
  { code:'PIA', name:'Oscar Piastri',     team:'McLaren',      teamColor:'#FF8000', number:81 },
  { code:'RUS', name:'George Russell',    team:'Mercedes',     teamColor:'#27F4D2', number:63 },
  { code:'ANT', name:'Kimi Antonelli',    team:'Mercedes',     teamColor:'#27F4D2', number:12 },
  { code:'LEC', name:'Charles Leclerc',   team:'Ferrari',      teamColor:'#E8002D', number:16 },
  { code:'HAM', name:'Lewis Hamilton',    team:'Ferrari',      teamColor:'#E8002D', number:44 },
  { code:'ALO', name:'Fernando Alonso',   team:'Aston Martin', teamColor:'#229971', number:14 },
  { code:'STR', name:'Lance Stroll',      team:'Aston Martin', teamColor:'#229971', number:18 },
  { code:'ALB', name:'Alexander Albon',   team:'Williams',     teamColor:'#64C4FF', number:23 },
  { code:'SAI', name:'Carlos Sainz',      team:'Williams',     teamColor:'#64C4FF', number:55 },
  { code:'GAS', name:'Pierre Gasly',      team:'Alpine',       teamColor:'#FF87BC', number:10 },
  { code:'COL', name:'Franco Colapinto',  team:'Alpine',       teamColor:'#FF87BC', number:43 },
  { code:'OCO', name:'Esteban Ocon',      team:'Haas',         teamColor:'#B6BABD', number:31 },
  { code:'BEA', name:'Oliver Bearman',    team:'Haas',         teamColor:'#B6BABD', number:87 },
  { code:'HUL', name:'Nico Hulkenberg',   team:'Audi',         teamColor:'#00E701', number:27 },
  { code:'BOR', name:'Gabriel Bortoleto', team:'Audi',         teamColor:'#00E701', number:5 },
  { code:'LAW', name:'Liam Lawson',       team:'Racing Bulls', teamColor:'#6692FF', number:30 },
  { code:'LIN', name:'Arvid Lindblad',    team:'Racing Bulls', teamColor:'#6692FF', number:40 },
  { code:'PER', name:'Sergio Perez',      team:'Cadillac',     teamColor:'#1B3D2F', number:11 },
  { code:'BOT', name:'Valtteri Bottas',   team:'Cadillac',     teamColor:'#1B3D2F', number:77 },
]

export const TEAMS: Record<string, Team> = {
  'McLaren':      { name:'McLaren',      color:'#FF8000' },
  'Mercedes':     { name:'Mercedes',     color:'#27F4D2' },
  'Red Bull':     { name:'Red Bull',     color:'#3671C6' },
  'Ferrari':      { name:'Ferrari',      color:'#E8002D' },
  'Aston Martin': { name:'Aston Martin', color:'#229971' },
  'Williams':     { name:'Williams',     color:'#64C4FF' },
  'Alpine':       { name:'Alpine',       color:'#FF87BC' },
  'Haas':         { name:'Haas',         color:'#B6BABD' },
  'Audi':         { name:'Audi',         color:'#00E701' },
  'Racing Bulls': { name:'Racing Bulls', color:'#6692FF' },
  'Cadillac':     { name:'Cadillac',     color:'#1B3D2F' },
}

// Sürücü numarası → kod
export const DRIVER_NUMBER_MAP: Record<number, string> = Object.fromEntries(DRIVERS.map(d => [d.number, d.code]))
