import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { TEAMS, DRIVERS, DRIVER_NUMBER_MAP } from '../f1/data'
import { AUSTRALIA_2026_QUALI, AUSTRALIA_2026_RACE_RESULT, computeBacktest, type RealQualiResult } from '../f1/realdata'
import { predictor } from '../f1/predictor'
import { openF1 } from '../f1/api'
import { TRACK_COORDS, CIRCUIT_MAP, getCircuitLaps } from '../f1/trackData'
import { ALBERT_PARK_DRS } from '../f1/tracks'
import type { PredictionResult } from '../f1/types'

const AUS_SESSION_KEY = 11234
const CHINA_RACE_KEY = 11245
const CHINA_QUALI_KEY = 11241

// ═══════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
@keyframes slideUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes drsFlash{0%,100%{box-shadow:0 0 4px rgba(34,197,94,.4)}50%{box-shadow:0 0 12px rgba(34,197,94,.7)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes borderGlow{0%,100%{border-color:rgba(225,6,0,.2)}50%{border-color:rgba(225,6,0,.45)}}
@keyframes panelAppear{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes ledPulse{0%,100%{opacity:.4}50%{opacity:.8}}
@keyframes ledSweep{0%{background-position:-200% 0}100%{background-position:200% 0}}
.f1{min-height:100vh;color:#e0e0e8;font-family:'JetBrains Mono',monospace;position:relative;overflow:hidden}
/* LED Background — dark mode */
.f1{background:#080810}
.f1::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:0;background:radial-gradient(ellipse at 50% -10%,rgba(225,6,0,.07) 0%,transparent 55%),radial-gradient(ellipse at 0% 50%,rgba(225,6,0,.03) 0%,transparent 40%),radial-gradient(ellipse at 100% 50%,rgba(225,6,0,.03) 0%,transparent 40%),radial-gradient(ellipse at 50% 110%,rgba(225,6,0,.04) 0%,transparent 45%)}
.f1::after{content:'';position:fixed;inset:0;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");opacity:.02;z-index:0}
/* LED strip accents */
.f1-led-top{position:fixed;top:0;left:0;right:0;height:2px;z-index:100;background:linear-gradient(90deg,transparent 5%,#e10600 30%,#ff3030 50%,#e10600 70%,transparent 95%);opacity:.6;background-size:200% 100%;animation:ledSweep 6s ease-in-out infinite}
.f1-led-left,.f1-led-right{position:fixed;top:0;width:1px;height:100%;z-index:100;pointer-events:none}
.f1-led-left{left:0;background:linear-gradient(180deg,#e10600 0%,transparent 30%,transparent 70%,#e10600 100%);opacity:.15}
.f1-led-right{right:0;background:linear-gradient(180deg,#e10600 0%,transparent 30%,transparent 70%,#e10600 100%);opacity:.15}
.f1 *{box-sizing:border-box}
.f1p{background:rgba(10,10,22,.65);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:14px 16px;position:relative;z-index:1;box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 8px 32px rgba(0,0,0,.25),0 0 0 1px rgba(0,0,0,.15);animation:panelAppear .4s ease both;overflow:hidden}
.f1p::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(225,6,0,.25),rgba(255,255,255,.08),rgba(225,6,0,.25),transparent)}
.f1t{font-family:'Outfit',sans-serif;font-size:8.5px;color:#777;letter-spacing:.14em;font-weight:700;margin-bottom:8px;text-transform:uppercase;display:flex;align-items:center;gap:6px}
.f1t::before{content:'';width:3px;height:10px;border-radius:2px;background:linear-gradient(180deg,#e10600,#b30500);flex-shrink:0;box-shadow:0 0 6px rgba(225,6,0,.4)}
.f1r{display:flex;align-items:center;gap:6px;padding:4px 6px;border-bottom:1px solid rgba(255,255,255,.025);transition:all .2s ease;border-radius:4px}
.f1r:hover{background:rgba(225,6,0,.04);border-color:rgba(225,6,0,.08)}
.f1b{border:none;border-radius:8px;padding:5px 14px;font-size:10px;color:#fff;cursor:pointer;font-family:'Outfit',sans-serif;font-weight:600;transition:all .2s ease;letter-spacing:.03em;position:relative;overflow:hidden}
.f1b::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.08),transparent);pointer-events:none;border-radius:8px}
.f1b:hover{opacity:.9;transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.3)}
.f1-tele{background:rgba(10,10,22,.6);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:10px 12px;cursor:pointer;transition:all .3s cubic-bezier(.4,0,.2,1);animation:panelAppear .4s ease both;position:relative;overflow:hidden}
.f1-tele::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent)}
.f1-tele:hover{border-color:rgba(255,255,255,.12);box-shadow:0 8px 32px rgba(0,0,0,.2);transform:translateY(-1px)}
.f1-tele.selected{border-color:rgba(225,6,0,.35);box-shadow:0 0 24px rgba(225,6,0,.1),inset 0 0 0 1px rgba(225,6,0,.12);animation:borderGlow 3s ease infinite}
.f1-bar{height:5px;border-radius:3px;background:rgba(255,255,255,.05);overflow:hidden;position:relative}
.f1-bar::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.03),transparent);border-radius:3px}
.f1-bar-fill{height:100%;border-radius:3px;transition:width .3s cubic-bezier(.4,0,.2,1);position:relative}
.f1-label{font-family:'Outfit',sans-serif;font-size:7px;color:#555;letter-spacing:.12em;font-weight:600;text-transform:uppercase}
.drs-on{animation:drsFlash 1.5s infinite}
/* Light theme */
.f1.f1-light{background:#f0ece5;color:#1c1c18}
.f1.f1-light::before{background:radial-gradient(ellipse at 50% -10%,rgba(225,6,0,.04) 0%,transparent 55%)}
.f1.f1-light .f1p{background:rgba(255,255,255,.75);border-color:rgba(0,0,0,.08);box-shadow:0 2px 12px rgba(0,0,0,.06)}
.f1.f1-light .f1p::before{background:linear-gradient(90deg,transparent,rgba(225,6,0,.15),rgba(0,0,0,.04),rgba(225,6,0,.15),transparent)}
.f1.f1-light .f1t{color:#888}
.f1.f1-light .f1r{border-color:rgba(0,0,0,.04)}
.f1.f1-light .f1r:hover{background:rgba(225,6,0,.04)}
.f1.f1-light .f1b{color:#333}
.f1.f1-light .f1-tele{background:rgba(255,255,255,.7);border-color:rgba(0,0,0,.08)}
.f1.f1-light .f1-bar{background:rgba(0,0,0,.06)}
.f1.f1-light .f1-label{color:#888}
.f1.f1-light .f1-led-top{opacity:.3}
.f1.f1-light .f1-led-left,.f1.f1-light .f1-led-right{opacity:.06}
@media(max-width:900px){.f1{overflow-y:auto!important;overflow-x:hidden!important}.f1-layout{height:auto!important;min-height:0!important}.f1-main{flex-direction:column!important;overflow:visible!important;height:auto!important;flex:none!important}.f1-side{min-width:0!important;max-width:100%!important;width:100%!important;overflow:visible!important;height:auto!important}.f1-side *{max-height:none!important}.f1-side div[style*="max-height"]{max-height:none!important;overflow:visible!important}.f1-tele-row{flex-direction:row!important;gap:6px}}
@media(max-width:600px){.f1-bottom{flex-direction:column!important;gap:6px!important}}
`

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════
function pT(t: string): number { const [m, s] = t.split(':'); return Number(m) * 60 + Number(s) }

function bsearch(arr: any[], time: number, dn: number): any | null {
  let lo = 0, hi = arr.length - 1, best: any = null
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const entry = arr[mid]
    if (entry.driver_number !== dn) { lo = mid + 1; continue }
    const t = new Date(entry.date).getTime()
    if (t <= time) { best = entry; lo = mid + 1 }
    else hi = mid - 1
  }
  // fallback: linear scan for the driver if binary search missed due to unsorted driver_numbers
  if (!best) {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i].driver_number === dn && new Date(arr[i].date).getTime() <= time) { best = arr[i]; break }
    }
  }
  return best
}

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════
export function F1Page({ dark = true, setDark }: { dark?: boolean; setDark?: (d: boolean) => void }) {
  // === STATE ===
  const [preds, setPreds] = useState<PredictionResult[] | null>(null)
  const [mode, setMode] = useState<'predict' | 'replay'>('predict')
  const [replayLap, setReplayLap] = useState(1)
  const [replayPlaying, setReplayPlaying] = useState(false)
  const [replaySpeed, setReplaySpeed] = useState(1)
  const [raceStartTime, setRaceStartTime] = useState(0)
  const [raceEndTime, setRaceEndTime] = useState(0)
  const [replayTime, setReplayTime] = useState(0)
  const [lapData, setLapData] = useState<any[]>([])
  const [posData, setPosData] = useState<any[]>([])
  const [intervalData, setIntervalData] = useState<any[]>([])
  const [stintData, setStintData] = useState<any[]>([])
  const [raceCtrl, setRaceCtrl] = useState<any[]>([])
  const [weatherData, setWeatherData] = useState<any>(null)
  const [drivers, setDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [races, setRaces] = useState<{ key: number, name: string, circuit: string, date: string, hasData: boolean }[]>([])
  const [selectedRace, setSelectedRace] = useState(CHINA_RACE_KEY)
  const [carPositions, setCarPositions] = useState<Map<number, { x: number, y: number }>>(new Map())
  const [allLocationData, setAllLocationData] = useState<any[]>([])
  const [livePreds, setLivePreds] = useState<PredictionResult[] | null>(null)
  const [liveActive, setLiveActive] = useState(false)
  const [totalLaps, setTotalLaps] = useState(() => getCircuitLaps(CHINA_RACE_KEY))
  // Dynamic qualifying grid — fetched from API or hardcoded fallback
  const [qualiGrid, setQualiGrid] = useState<RealQualiResult[]>([])
  const [qualiPoleTime, setQualiPoleTime] = useState(0)
  const [qualiFetching, setQualiFetching] = useState(false)
  // Telemetry
  const [selectedDrivers, setSelectedDrivers] = useState<number[]>([12, 63, 44])
  const [allCarData, setAllCarData] = useState<any[]>([])
  const [carTelemetry, setCarTelemetry] = useState<Map<number, {
    speed: number; gear: number; drs: number; throttle: number; brake: number
    aheadCode: string | null; aheadGap: number; behindCode: string | null; behindGap: number
  }>>(new Map())
  // Progress
  const [lapFlags, setLapFlags] = useState<Map<number, string>>(new Map())

  const replayRef = useRef<number | null>(null)
  const liveRef = useRef<number | null>(null)
  const preloadedRef = useRef(false)
  const lastPredLapRef = useRef(-1)
  const fetchedDriversRef = useRef(new Set<number>())

  // === Helper: fetch qualifying data for a race session key ===
  const fetchQualiForRace = useCallback(async (raceKey: number) => {
    setQualiFetching(true)
    try {
      // For Australia, use hardcoded data
      if (raceKey === AUS_SESSION_KEY) {
        setQualiGrid(AUSTRALIA_2026_QUALI)
        setQualiPoleTime(78.518)
        const grid = AUSTRALIA_2026_QUALI.map(q => ({
          code: q.driverCode, name: q.driverName, team: q.team, teamColor: TEAMS[q.team]?.color || '#888', position: q.position,
          qualiDelta: (q.q3Time ? pT(q.q3Time) : q.q2Time ? pT(q.q2Time) : q.q1Time ? pT(q.q1Time) : 83) - 78.518
        }))
        setPreds(predictor.predictFromGrid(grid))
        setQualiFetching(false)
        return
      }
      // Find qualifying session near this race
      const allS = await openF1.getSessions({ year: 2026 })
      const raceS = allS.find((s: any) => s.session_key === raceKey)
      if (!raceS) { setQualiFetching(false); return }
      const raceDate = new Date(raceS.date_start || '')
      // Find the Qualifying session (not Sprint Qualifying) closest to race
      const qualiSession = allS
        .filter((s: any) => s.session_type === 'Qualifying' && s.session_name === 'Qualifying')
        .find((s: any) => Math.abs(new Date(s.date_start || '').getTime() - raceDate.getTime()) < 3 * 86400000)
      if (!qualiSession) { setQualiFetching(false); return }
      // Fetch lap data & drivers from qualifying session
      const [laps, drvs] = await Promise.all([openF1.getLaps(qualiSession.session_key), openF1.getDrivers(qualiSession.session_key)])
      // Build best time per driver
      const best = new Map<number, number>()
      for (const l of laps) if (l.lap_duration && l.lap_duration > 0) { const c = best.get(l.driver_number) || Infinity; if (l.lap_duration < c) best.set(l.driver_number, l.lap_duration) }
      if (best.size === 0) { setQualiFetching(false); return }
      const pole = Math.min(...best.values())
      setQualiPoleTime(pole)
      // Sort by best time → qualifying grid
      const sorted = [...best.entries()].sort((a, b) => a[1] - b[1])
      const qualiResults: RealQualiResult[] = sorted.map(([dn, t], i) => {
        const d = drvs.find((x: any) => x.driver_number === dn)
        const code = d?.name_acronym || DRIVER_NUMBER_MAP[dn] || '?'
        const name = d?.full_name || DRIVERS.find(dr => dr.code === code)?.name || '?'
        const team = d?.team_name || DRIVERS.find(dr => dr.code === code)?.team || '?'
        const mins = Math.floor(t / 60)
        const secs = (t % 60).toFixed(3)
        return {
          position: i + 1, driverCode: code, driverName: name, team,
          q3Time: i < 10 ? `${mins}:${secs.padStart(6, '0')}` : null,
          q2Time: i >= 10 && i < 16 ? `${mins}:${secs.padStart(6, '0')}` : null,
          q1Time: i >= 16 ? `${mins}:${secs.padStart(6, '0')}` : null,
          gap: i === 0 ? null : `+${(t - pole).toFixed(3)}`,
          note: null,
        }
      })
      setQualiGrid(qualiResults)
      // Run prediction
      const grid = qualiResults.map(q => ({
        code: q.driverCode, name: q.driverName, team: q.team,
        teamColor: TEAMS[q.team]?.color || '#' + (drvs.find((x: any) => x.name_acronym === q.driverCode)?.team_colour || '888'),
        position: q.position,
        qualiDelta: (q.q3Time ? pT(q.q3Time) : q.q2Time ? pT(q.q2Time) : q.q1Time ? pT(q.q1Time) : pole + 5) - pole
      }))
      if (grid.length > 0) setPreds(predictor.predictFromGrid(grid))
    } catch (e) { console.error('[F1] Quali fetch error:', e) }
    setQualiFetching(false)
  }, [])

  // === INIT: races + auto-fetch qualifying for current race ===
  useEffect(() => {
    (async () => {
      try {
        const sessions = await openF1.getSessions({ year: 2026, session_type: 'Race' })
        // Filter: only main races (not sprints) — sprint session_name includes 'Sprint'
        const mainRaces = sessions.filter((s: any) => !s.session_name?.includes('Sprint'))
        setRaces(mainRaces.map((s: any) => ({ key: s.session_key, name: s.country_name, circuit: s.circuit_short_name || s.country_name, date: s.date_start?.slice(0, 10) || '', hasData: new Date(s.date_start) <= new Date() || Math.abs(new Date(s.date_start).getTime() - Date.now()) < 2 * 86400000 })))
      } catch { }
    })()
    // Auto-fetch qualifying for default race
    fetchQualiForRace(selectedRace)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // === PRELOAD replay data in background (2.5s after mount) — only for past races ===
  useEffect(() => {
    const timer = setTimeout(() => {
      if (preloadedRef.current) return
      preloadedRef.current = true
      const sk = selectedRace
      // Only preload if race has already happened
      const race = races.find(r => r.key === sk)
      if (race && new Date(race.date) > new Date()) return // future race, no replay data
      ;(async () => {
        try {
          const [drv, laps, pos, intv, st, rc, w] = await Promise.all([openF1.getDrivers(sk), openF1.getLaps(sk), openF1.getPositions(sk), openF1.getIntervals(sk), openF1.getStints(sk), openF1.getRaceControl(sk), openF1.getWeather(sk)])
          setDrivers(drv); setLapData(laps); setPosData(pos); setIntervalData(intv); setStintData(st); setRaceCtrl(rc)
          if (w.length > 0) setWeatherData(w[w.length - 1])
          const fl: any = laps.find((l: any) => l.driver_number === 63 && l.lap_number === 1)
          const ll: any = [...laps].reverse().find((l: any) => l.driver_number === 63 && l.lap_duration > 0)
          if (fl?.date_start) { const s = new Date(fl.date_start).getTime(), e = ll?.date_start ? new Date(ll.date_start).getTime() + 90000 : s + 5400000; setRaceStartTime(s); setRaceEndTime(e); setReplayTime(s) }
          // Preload location data
          const top = [63, 12, 16, 44, 1, 3, 87, 30, 5, 10]
          const locResults = await Promise.all(top.map(dn => openF1.getLocations(sk, dn).catch(() => [])))
          setAllLocationData(locResults.flat())
        } catch { }
      })()
    }, 2500)
    return () => clearTimeout(timer)
  }, [races]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update totalLaps when race changes + reset refs for new race
  useEffect(() => {
    const laps = getCircuitLaps(selectedRace)
    setTotalLaps(laps)
    predictor.totalLaps = laps
    fetchedDriversRef.current.clear()
    lastPredLapRef.current = -1
  }, [selectedRace])

  // Race change -> auto qualifying fetch
  useEffect(() => {
    fetchQualiForRace(selectedRace)
    // Reset replay state for new race
    preloadedRef.current = false
    setLapData([]); setPosData([]); setIntervalData([]); setStintData([]); setRaceCtrl([])
    setAllLocationData([]); setAllCarData([]); setCarPositions(new Map())
    setMode('predict')
  }, [selectedRace, fetchQualiForRace])

  // === LOAD REPLAY ===
  const loadReplay = useCallback(async () => {
    const sk = selectedRace
    // If preloaded data exists for this race, skip fetching core data
    if (preloadedRef.current && lapData.length > 0) {
      // Just need to compute flags and switch mode
      const rc = raceCtrl
      const flags = new Map<number, string>()
      for (let i = 1; i <= totalLaps; i++) flags.set(i, 'green')
      for (const m of rc) {
        if (!m.lap_number) continue
        if (m.flag === 'RED') { for (let i = m.lap_number; i <= Math.min(m.lap_number + 2, totalLaps); i++) flags.set(i, 'red') }
        else if (m.message?.includes('SAFETY CAR') && !m.message?.includes('VIRTUAL')) { for (let i = m.lap_number; i <= Math.min(m.lap_number + 3, totalLaps); i++) flags.set(i, 'sc') }
        else if (m.message?.includes('VIRTUAL SAFETY CAR')) { for (let i = m.lap_number; i <= Math.min(m.lap_number + 2, totalLaps); i++) flags.set(i, 'vsc') }
        else if (m.flag === 'YELLOW') flags.set(m.lap_number, 'yellow')
      }
      setLapFlags(flags)
      // Load car data if missing
      if (allCarData.length === 0) {
        try { const cd = await Promise.all(selectedDrivers.map(dn => openF1.getCarData(sk, dn).catch(() => []))); setAllCarData(cd.flat()) } catch { }
      }
      setMode('replay'); setReplayLap(1)
      return
    }
    setLoading(true)
    try {
      const [drv, laps, pos, intv, st, rc, w] = await Promise.all([openF1.getDrivers(sk), openF1.getLaps(sk), openF1.getPositions(sk), openF1.getIntervals(sk), openF1.getStints(sk), openF1.getRaceControl(sk), openF1.getWeather(sk)])
      setDrivers(drv); setLapData(laps); setPosData(pos); setIntervalData(intv); setStintData(st); setRaceCtrl(rc)
      if (w.length > 0) setWeatherData(w[w.length - 1])
      // Compute lap flags from race control
      const flags = new Map<number, string>()
      for (let i = 1; i <= totalLaps; i++) flags.set(i, 'green')
      for (const m of rc) {
        if (!m.lap_number) continue
        if (m.flag === 'RED') { for (let i = m.lap_number; i <= Math.min(m.lap_number + 2, totalLaps); i++) flags.set(i, 'red') }
        else if (m.message?.includes('SAFETY CAR') && !m.message?.includes('VIRTUAL')) { for (let i = m.lap_number; i <= Math.min(m.lap_number + 3, totalLaps); i++) flags.set(i, 'sc') }
        else if (m.message?.includes('VIRTUAL SAFETY CAR')) { for (let i = m.lap_number; i <= Math.min(m.lap_number + 2, totalLaps); i++) flags.set(i, 'vsc') }
        else if (m.flag === 'YELLOW') flags.set(m.lap_number, 'yellow')
      }
      setLapFlags(flags)
      // Location data + car data — all in parallel
      try {
        const top = [63, 12, 16, 44, 4, 1, 87, 30, 5, 10]
        const [locResults, cdResults] = await Promise.all([
          Promise.all(top.map(dn => openF1.getLocations(sk, dn).catch(() => []))),
          Promise.all(selectedDrivers.map(dn => openF1.getCarData(sk, dn).catch(() => [])))
        ])
        setAllLocationData(locResults.flat())
        setAllCarData(cdResults.flat())
      } catch { }
      const fl: any = laps.find((l: any) => l.driver_number === 63 && l.lap_number === 1)
      const ll: any = [...laps].reverse().find((l: any) => l.driver_number === 63 && l.lap_duration > 0)
      if (fl?.date_start) { const s = new Date(fl.date_start).getTime(), e = ll?.date_start ? new Date(ll.date_start).getTime() + 90000 : s + 5400000; setRaceStartTime(s); setRaceEndTime(e); setReplayTime(s) }
      setMode('replay'); setReplayLap(1)
    } catch { }
    setLoading(false)
  }, [selectedRace, selectedDrivers])

  // === LIVE MODE ===
  const toggleLive = useCallback(() => {
    if (liveActive) { if (liveRef.current) clearInterval(liveRef.current); setLiveActive(false); return }
    setLiveActive(true); setMode('replay')
    const sk = selectedRace
    const poll = async () => {
      try {
        const [drv, laps, pos, intv, st, rc, w] = await Promise.all([openF1.getDrivers(sk), openF1.getLaps(sk), openF1.getPositions(sk), openF1.getIntervals(sk), openF1.getStints(sk), openF1.getRaceControl(sk), openF1.getWeather(sk)])
        setDrivers(drv); setLapData(laps); setPosData(pos); setIntervalData(intv); setStintData(st); setRaceCtrl(rc); if (w.length > 0) setWeatherData(w[w.length - 1])
        const ml = Math.max(0, ...laps.filter((l: any) => l.driver_number === 63).map((l: any) => l.lap_number)); setReplayLap(ml)
        try { const locs = await Promise.all([63, 12, 16, 44, 4, 1].map(dn => openF1.getLocations(sk, dn).catch(() => []))); setAllLocationData(locs.flat()); setReplayTime(Date.now()) } catch { }
        // Car telemetry for selected drivers (live)
        try { const cd = await Promise.all(selectedDrivers.map(dn => openF1.getCarData(sk, dn).catch(() => []))); setAllCarData(cd.flat()) } catch { }
      } catch { }
    }
    poll(); liveRef.current = window.setInterval(poll, 5000)
  }, [liveActive, selectedRace, selectedDrivers])
  useEffect(() => () => { if (liveRef.current) clearInterval(liveRef.current) }, [])

  // === REPLAY TIMER (requestAnimationFrame, throttled state updates) ===
  const replayTimeRef = useRef(0)
  useEffect(() => { replayTimeRef.current = replayTime }, [replayTime])

  // Pre-process location data into per-driver sorted arrays for fast lookup
  const driverLocRef = useRef<Map<number, { t: number, x: number, y: number }[]>>(new Map())
  useEffect(() => {
    if (!allLocationData.length) return
    const byDriver = new Map<number, { t: number, x: number, y: number }[]>()
    for (const l of allLocationData) {
      const arr = byDriver.get(l.driver_number) || []
      arr.push({ t: new Date(l.date).getTime(), x: l.x, y: l.y })
      byDriver.set(l.driver_number, arr)
    }
    for (const [, arr] of byDriver) arr.sort((a, b) => a.t - b.t)
    driverLocRef.current = byDriver
  }, [allLocationData])

  useEffect(() => {
    if (!replayPlaying) { if (replayRef.current) cancelAnimationFrame(replayRef.current); return }
    let prev = 0
    let lastStateUpdate = 0
    const tick = (now: number) => {
      replayRef.current = requestAnimationFrame(tick)
      if (!prev) { prev = now; return }
      const dt = Math.min(now - prev, 50)
      prev = now
      const advance = dt * replaySpeed * 10
      const newTime = replayTimeRef.current + advance
      if (newTime >= raceEndTime) { setReplayPlaying(false); setReplayTime(raceEndTime); return }
      replayTimeRef.current = newTime

      // Throttle ALL React state updates to ~30fps to avoid cascading re-renders
      if (now - lastStateUpdate > 33) {
        lastStateUpdate = now
        // Compute car positions
        const byDriver = driverLocRef.current
        if (byDriver.size) {
          const m = new Map<number, { x: number, y: number }>()
          for (const [dn, pts] of byDriver) {
            let lo = 0, hi = pts.length - 1, idx = -1
            while (lo <= hi) { const mid = (lo + hi) >> 1; if (pts[mid].t <= newTime) { idx = mid; lo = mid + 1 } else { hi = mid - 1 } }
            if (idx >= 0) {
              const p = pts[idx], next = idx + 1 < pts.length ? pts[idx + 1] : null
              if (next && next.t > p.t) {
                const frac = Math.min(1, (newTime - p.t) / (next.t - p.t))
                m.set(dn, { x: p.x + (next.x - p.x) * frac, y: p.y + (next.y - p.y) * frac })
              } else { m.set(dn, { x: p.x, y: p.y }) }
            }
          }
          setCarPositions(m)
        }
        setReplayTime(newTime)
        // Update lap from time
        if (lapData.length) {
          const rl = lapData.filter((l: any) => l.driver_number === 63 && l.date_start)
          let c = 1; for (const l of rl) if (new Date(l.date_start).getTime() <= newTime) c = l.lap_number
          setReplayLap(c)
        }
      }
    }
    replayRef.current = requestAnimationFrame(tick)
    return () => { if (replayRef.current) cancelAnimationFrame(replayRef.current) }
  }, [replayPlaying, replaySpeed, raceEndTime, lapData]) // eslint-disable-line react-hooks/exhaustive-deps

  // Telemetry from car_data — throttled to ~5fps (200ms) for smooth UI updates
  const telemetryTimerRef = useRef<number>(0)
  useEffect(() => {
    if (!allCarData.length || !replayTime || mode !== 'replay') return
    const now = Date.now()
    if (now - telemetryTimerRef.current < 200) return
    telemetryTimerRef.current = now
    const tMap = new Map<number, any>()
    for (const dn of selectedDrivers) {
      const driverData = allCarData.filter(d => d.driver_number === dn)
      let best: any = null
      for (let i = driverData.length - 1; i >= 0; i--) {
        if (new Date(driverData[i].date).getTime() <= replayTime) { best = driverData[i]; break }
      }
      if (best) {
        const pos = standings.findIndex(s => s.number === dn)
        const ahead = pos > 0 ? standings[pos - 1] : null
        const behind = pos < standings.length - 1 ? standings[pos + 1] : null
        tMap.set(dn, {
          speed: best.speed || 0, gear: best.n_gear || 0, drs: best.drs || 0,
          throttle: best.throttle || 0, brake: best.brake || 0,
          aheadCode: ahead?.code || null, aheadGap: ahead?.gap ? (standings[pos]?.gap || 0) - (ahead.gap || 0) : 0,
          behindCode: behind?.code || null, behindGap: behind ? (behind.gap || 0) - (standings[pos]?.gap || 0) : 0,
        })
      }
    }
    setCarTelemetry(tMap)
  }, [replayTime, allCarData, selectedDrivers, mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch car_data for newly selected drivers — ref-tracked to avoid cascading
  useEffect(() => {
    if (mode !== 'replay' || !selectedRace) return
    const needed = selectedDrivers.filter(dn => !fetchedDriversRef.current.has(dn))
    if (!needed.length) return
    for (const dn of needed) fetchedDriversRef.current.add(dn)
    ;(async () => {
      try {
        const results = await Promise.all(needed.map(dn => openF1.getCarData(selectedRace, dn).catch(() => [])))
        const flat = results.flat()
        if (flat.length) setAllCarData(prev => [...prev, ...flat])
      } catch { }
    })()
  }, [selectedDrivers, mode, selectedRace])

  // === STANDINGS ===
  const standings = useMemo(() => {
    if (!posData.length || !lapData.length) return []
    const rl = lapData.filter((l: any) => l.driver_number === 63 && l.lap_number <= replayLap)
    const ref = rl.length > 0 ? new Date(rl[rl.length - 1].date_start || '').getTime() : 0
    const lP = new Map<number, number>(), lG = new Map<number, number>(), lL = new Map<number, number>()
    for (const p of posData) if (new Date(p.date || '').getTime() <= ref + 10000) lP.set(p.driver_number, p.position)
    for (const iv of intervalData) if (new Date(iv.date || '').getTime() <= ref + 10000) lG.set(iv.driver_number, iv.gap_to_leader ?? 0)
    for (const l of lapData) if (l.lap_number <= replayLap && l.lap_duration > 0) lL.set(l.driver_number, l.lap_duration)
    const gS = (dn: number) => { const s = stintData.filter((st: any) => st.driver_number === dn && (st.lap_start || 0) <= replayLap); return s.length > 0 ? s[s.length - 1] : null }
    const isRetired = (dn: number) => raceCtrl.some(rc => rc.driver_number === dn && rc.message?.includes('RETIRED'))
    return drivers.map((d: any) => ({
      number: d.driver_number, code: d.name_acronym, name: d.full_name, team: d.team_name, color: '#' + (d.team_colour || '888'),
      position: lP.get(d.driver_number) || 99, gap: lG.get(d.driver_number) || 0, lastLap: lL.get(d.driver_number) || 0,
      stint: gS(d.driver_number), retired: isRetired(d.driver_number)
    })).sort((a: any, b: any) => a.position - b.position)
  }, [posData, lapData, intervalData, stintData, drivers, replayLap, raceCtrl])

  // AI prediction update — guarded to fire only once per lap
  useEffect(() => {
    if (mode !== 'replay' || !standings.length || replayLap < 2) return
    if (lastPredLapRef.current === replayLap) return
    lastPredLapRef.current = replayLap
    setLivePreds(predictor.updateFromLiveData(standings.map((d: any) => {
      const pits = stintData.filter((st: any) => st.driver_number === d.number && st.tyre_age_at_start === 0 && (st.lap_start || 0) > 1 && (st.lap_start || 0) <= replayLap).length
      return {
        code: d.code, name: d.name, team: d.team, teamColor: d.color, position: d.position,
        lastLapTime: d.lastLap || null, gap: d.gap, pitStops: pits,
        compound: d.stint?.compound || 'MEDIUM'
      }
    }), replayLap))
  }, [replayLap, mode, standings, stintData])

  // Events
  const events = useMemo(() => {
    const ev: { lap: number, msg: string, color: string }[] = []
    for (const st of stintData) if (st.tyre_age_at_start === 0 && st.lap_start > 1) { const d = drivers.find((x: any) => x.driver_number === st.driver_number); ev.push({ lap: st.lap_start, msg: `PIT ${d?.name_acronym || '?'} > ${st.compound || '?'}`, color: '#eab308' }) }
    for (const rc of raceCtrl) { if (rc.flag === 'RED') ev.push({ lap: rc.lap_number || 0, msg: `RED ${rc.message?.slice(0, 35)}`, color: '#ef4444' }); else if (rc.message?.includes('RETIRED')) ev.push({ lap: rc.lap_number || 0, msg: `DNF ${rc.message?.slice(0, 35)}`, color: '#ef4444' }) }
    return ev.sort((a, b) => b.lap - a.lap)
  }, [stintData, raceCtrl, drivers])

  const backtest = useMemo(() => preds ? computeBacktest(preds) : null, [preds])
  const trackPts = useMemo(() => { const n = CIRCUIT_MAP[selectedRace]; return n ? TRACK_COORDS[n] || [] : [] }, [selectedRace])
  const fEvents = useMemo(() => events.filter(e => e.lap <= replayLap), [events, replayLap])

  const handleCarClick = useCallback((driverNumber: number) => {
    setSelectedDrivers(prev => {
      if (prev.includes(driverNumber)) return prev
      return [prev[0], prev[1], driverNumber]
    })
  }, [])

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════
  const isDark = dark
  const headerBg = isDark ? 'linear-gradient(180deg,rgba(8,8,18,.85),rgba(8,8,18,.75))' : 'linear-gradient(180deg,rgba(255,255,255,.92),rgba(248,246,240,.88))'
  const headerBorder = isDark ? '1px solid rgba(225,6,0,.3)' : '1px solid rgba(225,6,0,.15)'
  const headerShadow = isDark ? '0 4px 40px rgba(0,0,0,.4),inset 0 -1px 0 rgba(225,6,0,.15)' : '0 2px 16px rgba(0,0,0,.06)'
  const headerText = isDark ? '#fff' : '#1c1c18'
  const headerMuted = isDark ? '#666' : '#999'
  const sideBg = isDark ? 'linear-gradient(180deg,rgba(8,8,18,.15),rgba(8,8,18,.05))' : 'linear-gradient(180deg,rgba(248,246,240,.3),rgba(248,246,240,.1))'
  const sideBorder = isDark ? '1px solid rgba(255,255,255,.03)' : '1px solid rgba(0,0,0,.04)'

  return (
    <div className={`f1${isDark ? '' : ' f1-light'}`}><style>{CSS}</style>
      {/* ═══ LED ACCENT STRIPS ═══ */}
      <div className="f1-led-top" />
      <div className="f1-led-left" />
      <div className="f1-led-right" />
      {/* ═══ HEADER BAR ═══ */}
      <div style={{ background: headerBg, borderBottom: headerBorder, padding: '8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', boxShadow: headerShadow }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/" style={{ color: headerMuted, textDecoration: 'none', fontSize: 11, border: `1px solid ${isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.1)'}`, borderRadius: 6, padding: '3px 10px', transition: 'all .2s', background: isDark ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.02)' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(225,6,0,.3)'; e.currentTarget.style.color = '#e10600' }} onMouseLeave={e => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.1)'; e.currentTarget.style.color = headerMuted }}>{'<-'}</a>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span style={{ fontFamily: "'Outfit'", fontWeight: 800, color: headerText, fontSize: 16, letterSpacing: '.04em' }}>F1</span>
            <span style={{ fontFamily: "'Outfit'", fontWeight: 800, background: 'linear-gradient(135deg,#e10600,#ff3030)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: 16, letterSpacing: '.04em' } as any}>PREDICTOR</span>
          </div>
          {races.length > 0 && <select value={selectedRace} onChange={e => setSelectedRace(Number(e.target.value))} style={{ background: isDark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.1)'}`, borderRadius: 8, color: isDark ? '#999' : '#666', padding: '4px 10px', fontSize: 9, outline: 'none', transition: 'all .2s' }}>
            {races.map(r => <option key={r.key} value={r.key} disabled={!r.hasData}>{r.circuit} {r.date.slice(5)}</option>)}
          </select>}
          {mode === 'replay' && <span style={{ background: 'linear-gradient(135deg,#e10600,#b30500)', padding: '3px 12px', borderRadius: 8, fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: '.04em', boxShadow: '0 2px 12px rgba(225,6,0,.35),inset 0 1px 0 rgba(255,255,255,.15)' }}>LAP {replayLap}/{totalLaps}</span>}
        </div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
          {weatherData && <span style={{ fontSize: 8, color: isDark ? '#555' : '#888', padding: '2px 8px', background: isDark ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.03)', borderRadius: 6 }}>{weatherData.air_temperature?.toFixed(0)}°C  T{weatherData.track_temperature?.toFixed(0)}°C</span>}
          <button className="f1b" onClick={() => setMode('predict')} style={{ background: mode === 'predict' ? 'linear-gradient(135deg,#e10600,#b30500)' : isDark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.04)', boxShadow: mode === 'predict' ? '0 2px 12px rgba(225,6,0,.35)' : 'none', borderRadius: 8, color: mode === 'predict' ? '#fff' : headerText }}>TAHMIN</button>
          <button className="f1b" onClick={loadReplay} style={{ background: mode === 'replay' && !liveActive ? 'linear-gradient(135deg,#e10600,#b30500)' : isDark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.04)', opacity: loading ? .5 : 1, boxShadow: mode === 'replay' && !liveActive ? '0 2px 12px rgba(225,6,0,.35)' : 'none', borderRadius: 8, color: mode === 'replay' && !liveActive ? '#fff' : headerText }}>{loading ? '...' : 'REPLAY'}</button>
          <button className="f1b" onClick={toggleLive} style={{ background: liveActive ? 'linear-gradient(135deg,#dc2626,#b91c1c)' : isDark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.04)', animation: liveActive ? 'pulse 2s infinite' : '', boxShadow: liveActive ? '0 2px 12px rgba(220,38,38,.35)' : 'none', borderRadius: 8, color: liveActive ? '#fff' : headerText }}>
            {liveActive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block', marginRight: 5, boxShadow: '0 0 8px rgba(255,255,255,.5)' }} />}CANLI
          </button>
          {/* Dark/Light Toggle */}
          {setDark && <div onClick={() => setDark(!dark)} style={{ width: 36, height: 20, padding: 2, borderRadius: 99, cursor: 'pointer', border: `1px solid ${isDark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.12)'}`, background: isDark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.04)', transition: 'all .3s', marginLeft: 2, position: 'relative', display: 'flex', alignItems: 'center' }} title="Dark/Light">
            <div style={{ width: 14, height: 14, borderRadius: '50%', transition: 'all .3s cubic-bezier(.16,1,.3,1)', position: 'absolute', left: 2, transform: isDark ? 'translateX(16px)' : 'translateX(0)', background: isDark ? '#252420' : '#e8e4dc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 8 }}>{isDark ? '☀' : '☾'}</span>
            </div>
          </div>}
        </div>
      </div>

      {/* ═══ 3-PANEL LAYOUT (both modes) ═══ */}
      <div className="f1-layout" style={{ padding: 0, height: 'calc(100vh - 42px)', display: 'flex', flexDirection: 'column' }}>
        <div className="f1-main" style={{ flex: 1, display: 'flex', overflow: 'hidden', gap: 4 }}>

          {/* ═══ LEFT PANEL ═══ */}
          <div className="f1-side" style={{ width: 260, minWidth: 220, padding: '10px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, background: sideBg, borderRight: sideBorder }}>
            {/* Weather */}
            <WeatherCard data={weatherData} />

            {mode === 'predict' ? (
              // Predict: Qualifying grid (dynamic — fetched from OpenF1 API)
              <div className="f1p" style={{ flex: 1 }}>
                <div className="f1t">{qualiFetching ? 'LOADING...' : 'QUALIFYING GRID'}</div>
                <div style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
                  {qualiGrid.length === 0 && qualiFetching && <div style={{ fontSize: 9, color: '#555', padding: 8, textAlign: 'center' }}>Sıralama verisi çekiliyor...</div>}
                  {qualiGrid.map((q, i) => {
                    const pr = preds?.find(p => p.driverCode === q.driverCode)
                    return <div key={q.driverCode} className="f1r">
                      <span style={{ width: 14, fontFamily: "'Outfit'", fontWeight: 800, color: i < 3 ? '#d4a843' : '#555', fontSize: 10 }}>{q.position}</span>
                      <div style={{ width: 2, height: 14, borderRadius: 1, background: TEAMS[q.team]?.color || '#444' }} />
                      <span style={{ flex: 1, fontSize: 9, color: i < 10 ? (isDark ? '#ddd' : '#222') : (isDark ? '#555' : '#999') }}>{q.driverCode}</span>
                      <span style={{ fontSize: 8, color: isDark ? '#444' : '#aaa' }}>{q.q3Time || q.q2Time || q.q1Time || '--'}</span>
                      <span style={{ fontSize: 8, fontWeight: 700, color: pr && pr.predictedPosition <= 3 ? '#d4a843' : (isDark ? '#444' : '#aaa') }}>P{pr?.predictedPosition || '--'}</span>
                    </div>
                  })}
                </div>
              </div>
            ) : (
              // Replay: Telemetry cards
              <>
                {selectedDrivers.map((dn, idx) => (
                  <TelemetryCard key={dn} driverNumber={dn} telemetry={carTelemetry.get(dn) || null}
                    isSelected={idx === 0} drivers={drivers}
                    onSwap={() => {
                      setSelectedDrivers(prev => {
                        const next = [...prev]; next.splice(idx, 1); return next.concat([63, 1, 44, 12, 16, 4, 81, 87, 30].find(n => !next.includes(n)) || 63)
                      })
                    }} />
                ))}
              </>
            )}

            {mode === 'predict' && <div className="f1p"><div className="f1t">MODEL</div><div style={{ fontSize: 8, color: '#666', lineHeight: 1.7, padding: '4px 0' }}>
              <span style={{ color: '#888', fontWeight: 600 }}>Ridge 40%</span> + <span style={{ color: '#888', fontWeight: 600 }}>GB 60%</span><br/>
              <span style={{ color: '#555' }}>ELO + 14 features + OpenF1</span>
            </div></div>}
          </div>

          {/* ═══ CENTER: TRACK MAP ═══ */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, position: 'relative', zIndex: 1, background: 'transparent' }}>
            <TrackSVG pts={trackPts} cars={carPositions} drivers={drivers} standings={standings}
              selectedDrivers={selectedDrivers} onCarClick={handleCarClick}
              lapFlags={lapFlags} replayLap={replayLap} large />
          </div>

          {/* ═══ RIGHT PANEL ═══ */}
          <div className="f1-side" style={{ width: 280, minWidth: 230, padding: '10px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, background: sideBg, borderLeft: sideBorder }}>
            {mode === 'predict' ? (
              selectedRace === AUS_SESSION_KEY ? (
              // Australia: Results vs predictions (backtest)
              <div className="f1p" style={{ flex: 1 }}>
                <div className="f1t" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  SONUC vs TAHMIN
                  {backtest && <span style={{ color: backtest.winnerCorrect ? '#4ade80' : '#ef4444' }}>
                    {backtest.winnerCorrect ? 'V' : 'X'} {backtest.podiumHits}/3 MAE{backtest.mae.toFixed(1)}
                  </span>}
                </div>
                <div style={{ maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>
                  {AUSTRALIA_2026_RACE_RESULT.map((r, i) => {
                    const d = backtest?.details.find(x => x.code === r.code)
                    const dead = r.status === 'dnf' || r.status === 'dns'
                    return <div key={r.code} className="f1r" style={{ opacity: dead ? .25 : 1 }}>
                      <span style={{ width: 28, fontFamily: "'Outfit'", fontWeight: 800, color: dead ? '#ef4444' : i < 3 ? '#d4a843' : '#888', fontSize: 10 }}>{dead ? r.status.toUpperCase() : 'P' + r.pos}</span>
                      <div style={{ width: 2, height: 14, borderRadius: 1, background: TEAMS[r.team]?.color || '#333' }} />
                      <span style={{ flex: 1, fontSize: 9, color: dead ? (isDark ? '#333' : '#bbb') : i < 10 ? (isDark ? '#ddd' : '#222') : (isDark ? '#666' : '#999') }}>{r.code}</span>
                      <span style={{ fontSize: 8, fontWeight: 700, color: d && d.err === 0 ? '#4ade80' : d && d.err <= 2 ? '#fbbf24' : '#555' }}>{'P' + (d?.pred || '-')}</span>
                      <span style={{ fontSize: 8, fontWeight: 700, color: d && d.err === 0 ? '#4ade80' : d && d.err <= 2 ? '#fbbf24' : '#ef4444' }}>{d ? (d.err === 0 ? 'V' : '+' + d.err) : ''}</span>
                    </div>
                  })}
                </div>
              </div>
              ) : (
              // Other races: Prediction results
              <div className="f1p" style={{ flex: 1 }}>
                <div className="f1t">YARIŞ TAHMİNİ</div>
                <div style={{ maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>
                  {qualiFetching && <div style={{ fontSize: 9, color: '#555', padding: 8, textAlign: 'center' }}>Tahmin hesaplanıyor...</div>}
                  {preds?.map((p, i) => {
                    const gridPos = qualiGrid.find(q => q.driverCode === p.driverCode)?.position || 0
                    const diff = gridPos - p.predictedPosition
                    return <div key={p.driverCode} className="f1r">
                      <span style={{ width: 20, fontFamily: "'Outfit'", fontWeight: 800, color: i < 3 ? '#d4a843' : (isDark ? '#888' : '#666'), fontSize: 11 }}>P{p.predictedPosition}</span>
                      <div style={{ width: 3, height: 16, borderRadius: 2, background: p.teamColor, boxShadow: i < 3 ? `0 0 6px ${p.teamColor}40` : 'none' }} />
                      <span style={{ flex: 1, fontFamily: "'Outfit'", fontWeight: i < 3 ? 700 : 400, color: i < 3 ? (isDark ? '#ddd' : '#222') : (isDark ? '#777' : '#666'), fontSize: 10 }}>{p.driverCode}</span>
                      {/* Win probability */}
                      {p.winProbability > 0 && <span style={{ fontSize: 7, color: '#997a2e', fontWeight: 700, background: 'rgba(153,122,46,.1)', padding: '1px 4px', borderRadius: 3 }}>{p.winProbability}%</span>}
                      {/* Grid change */}
                      <span style={{ fontSize: 8, fontWeight: 700, width: 32, textAlign: 'right', color: diff > 0 ? '#4ade80' : diff < 0 ? '#ef4444' : (isDark ? '#555' : '#aaa') }}>
                        {diff > 0 ? `↑${diff}` : diff < 0 ? `↓${Math.abs(diff)}` : '—'}
                      </span>
                    </div>
                  })}
                </div>
              </div>
              )
            ) : (
              // Replay: Leaderboard + AI + Events
              <>
                <div className="f1p" style={{ flex: 1 }}>
                  <div className="f1t">LEADERBOARD - L{replayLap}</div>
                  <div style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
                    {standings.slice(0, 22).map((d: any, i: number) => {
                      const lp = livePreds?.find(p => p.driverCode === d.code)
                      const isPitting = stintData.some((st: any) => st.driver_number === d.number && st.tyre_age_at_start === 0 && st.lap_start === replayLap)
                      return <div key={d.number} className="f1r" style={{ cursor: 'pointer', opacity: d.retired ? .3 : 1, background: i < 3 ? 'rgba(212,168,67,.03)' : 'transparent' }} onClick={() => handleCarClick(d.number)}>
                        <span style={{ width: 18, fontFamily: "'Outfit'", fontWeight: 800, color: d.retired ? '#ef4444' : i < 3 ? '#d4a843' : i < 10 ? '#aaa' : '#444', fontSize: 11, textAlign: 'center' }}>{d.retired ? 'X' : i + 1}</span>
                        <div style={{ width: 3, height: 16, borderRadius: 2, background: d.color, boxShadow: i < 3 ? `0 0 6px ${d.color}40` : 'none' }} />
                        <span style={{ flex: 1, fontFamily: "'Outfit'", fontWeight: i < 3 ? 700 : 400, color: d.retired ? '#555' : i < 10 ? '#ddd' : '#666', fontSize: 10 }}>{d.code}</span>
                        {/* Status badge */}
                        {d.retired && <span style={{ fontSize: 7, color: '#ef4444', fontWeight: 700, background: 'rgba(239,68,68,.1)', padding: '1px 4px', borderRadius: 3 }}>OUT</span>}
                        {isPitting && <span style={{ fontSize: 7, color: '#eab308', fontWeight: 700, background: 'rgba(234,179,8,.1)', padding: '1px 4px', borderRadius: 3 }}>PIT</span>}
                        {/* Gap */}
                        <span style={{ fontSize: 8, color: '#444', width: 42, textAlign: 'right' }}>{d.gap > 0 ? `+${d.gap.toFixed(1)}s` : i === 0 ? 'LDR' : ''}</span>
                        {/* Last lap */}
                        <span style={{ fontSize: 8, color: d.lastLap > 0 && d.lastLap < 82 ? '#a855f7' : '#333', width: 44, textAlign: 'right' }}>{d.lastLap > 0 ? d.lastLap.toFixed(3) : '--'}</span>
                        {/* Tire */}
                        <TB c={d.stint?.compound} age={d.stint ? replayLap - (d.stint.lap_start || 1) : undefined} />
                        {/* AI pred */}
                        {lp && <span style={{ fontSize: 7, color: lp.predictedPosition <= 3 ? '#d4a843' : '#444', width: 20, textAlign: 'right' }}>{'->'}P{lp.predictedPosition}</span>}
                      </div>
                    })}
                  </div>
                </div>
                {/* AI Prediction Panel */}
                <div className="f1p">
                  <div className="f1t">AI TAHMIN - L{replayLap}</div>
                  {livePreds ? <div>{livePreds.slice(0, 5).map((p, i) => <div key={p.driverCode} style={{ display: 'flex', gap: 4, padding: '3px 0', fontSize: 9, alignItems: 'center' }}>
                    <span style={{ width: 14, fontWeight: 800, color: i < 3 ? '#d4a843' : '#555', fontFamily: "'Outfit'" }}>{p.predictedPosition}</span>
                    <div style={{ width: 3, height: 12, borderRadius: 1, background: p.teamColor }} />
                    <span style={{ flex: 1, color: i < 3 ? '#ddd' : '#777' }}>{p.driverCode}</span>
                    <span style={{ color: '#997a2e', fontSize: 8, fontWeight: 700 }}>{p.winProbability}%</span>
                  </div>)}</div> : <div style={{ color: '#333', fontSize: 8 }}>Oynat ile baslat</div>}
                </div>
                {/* Events */}
                <div className="f1p" style={{ maxHeight: 180 }}>
                  <div className="f1t">OLAYLAR</div>
                  <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                    {fEvents.length === 0 ? <div style={{ color: '#333', fontSize: 8 }}>--</div> :
                      fEvents.slice(0, 15).map((e, i) => <div key={i} style={{ fontSize: 8, padding: '2px 0', color: e.color }}>
                        <span style={{ color: '#333', marginRight: 4 }}>L{e.lap}</span>{e.msg}
                      </div>)}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ═══ BOTTOM BAR ═══ */}
        <div className="f1-bottom" style={{ padding: '8px 16px', background: isDark ? 'linear-gradient(180deg,rgba(8,8,18,.7),rgba(8,8,18,.8))' : 'linear-gradient(180deg,rgba(255,255,255,.85),rgba(248,246,240,.9))', borderTop: `1px solid ${isDark ? 'rgba(225,6,0,.12)' : 'rgba(225,6,0,.08)'}`, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', zIndex: 10, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,.03)' : 'inset 0 1px 0 rgba(0,0,0,.03)' }}>
          {mode === 'replay' ? (
            <>
              {/* Transport controls */}
              <button className="f1b" onClick={() => setReplayTime(raceStartTime)} style={{ background: 'rgba(255,255,255,.05)', padding: '3px 8px', fontSize: 9 }}>|{'<<'}</button>
              <button className="f1b" onClick={() => setReplayTime(Math.max(raceStartTime, replayTime - 85000))} style={{ background: 'rgba(255,255,255,.05)', padding: '3px 8px', fontSize: 9 }}>{'<<'}</button>
              <button className="f1b" onClick={() => setReplayPlaying(!replayPlaying)} style={{ background: replayPlaying ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#22c55e,#16a34a)', padding: '4px 16px', boxShadow: replayPlaying ? '0 2px 12px rgba(239,68,68,.3)' : '0 2px 12px rgba(34,197,94,.3)' }}>{replayPlaying ? 'STOP' : 'PLAY'}</button>
              <button className="f1b" onClick={() => setReplayTime(Math.min(raceEndTime, replayTime + 85000))} style={{ background: 'rgba(255,255,255,.05)', padding: '3px 8px', fontSize: 9 }}>{'>>'}</button>
              {[.5, 1, 2, 4].map(s => <button key={s} className="f1b" onClick={() => setReplaySpeed(s)} style={{ background: replaySpeed === s ? 'linear-gradient(135deg,#e10600,#b30500)' : 'rgba(255,255,255,.04)', padding: '3px 8px', fontSize: 8, boxShadow: replaySpeed === s ? '0 2px 8px rgba(225,6,0,.3)' : 'none' }}>{s}x</button>)}
              {/* Progress bar */}
              <ProgressBar lapFlags={lapFlags} currentLap={replayLap} totalLaps={totalLaps}
                replayTime={replayTime} raceStartTime={raceStartTime} raceEndTime={raceEndTime}
                onSeek={t => setReplayTime(t)} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: "'Outfit'" }}>L{replayLap}/{totalLaps}</span>
            </>
          ) : (
            <>
              {preds?.[0] && <span style={{ fontSize: 9, color: '#997a2e' }}>PRED {preds[0].driverName} P1 {preds[0].winProbability}%</span>}
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 9, color: '#444' }}>REPLAY ile izle</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════

// Weather Card
function WeatherCard({ data }: { data: any }) {
  if (!data) return null
  const isDry = !(data.rainfall > 0)
  return (
    <div className="f1p" style={{ padding: '10px 14px' }}>
      <div className="f1t" style={{ marginBottom: 8 }}>WEATHER</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 14px', fontSize: 9, color: '#888' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', background: 'rgba(255,255,255,.02)', borderRadius: 4 }}><span className="f1-label">Track</span> <span style={{ color: '#eee', fontWeight: 700, fontFamily: "'Outfit'" }}>{data.track_temperature?.toFixed(1)}°</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', background: 'rgba(255,255,255,.02)', borderRadius: 4 }}><span className="f1-label">Air</span> <span style={{ color: '#eee', fontWeight: 700, fontFamily: "'Outfit'" }}>{data.air_temperature?.toFixed(1)}°</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px' }}><span className="f1-label">Humid</span> <span style={{ color: '#bbb' }}>{data.humidity?.toFixed(0)}%</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px' }}><span className="f1-label">Wind</span> <span style={{ color: '#bbb' }}>{data.wind_speed?.toFixed(1)}km/h</span></div>
        <div style={{ gridColumn: '1 / -1', paddingTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="f1-label">Cond</span>
          <span style={{ color: isDry ? '#22c55e' : '#3b82f6', fontWeight: 700, fontSize: 10, fontFamily: "'Outfit'", padding: '1px 8px', background: isDry ? 'rgba(34,197,94,.1)' : 'rgba(59,130,246,.1)', borderRadius: 4, border: `1px solid ${isDry ? 'rgba(34,197,94,.2)' : 'rgba(59,130,246,.2)'}` }}>{isDry ? 'DRY' : 'WET'}</span>
        </div>
      </div>
    </div>
  )
}

// Telemetry Card
function TelemetryCard({ driverNumber, telemetry, isSelected, drivers, onSwap }: {
  driverNumber: number; telemetry: any; isSelected: boolean; drivers: any[]; onSwap: () => void
}) {
  const drv = drivers.find((d: any) => d.driver_number === driverNumber)
  const staticDrv = DRIVERS.find(d => d.number === driverNumber)
  const code = drv?.name_acronym || staticDrv?.code || '?'
  const color = drv ? '#' + (drv.team_colour || '888') : staticDrv?.teamColor || '#888'
  const team = drv?.team_name || staticDrv?.team || '?'

  const speed = telemetry?.speed || 0
  const speedPct = Math.min(100, (speed / 350) * 100)
  const gear = telemetry?.gear || 0
  const drs = telemetry?.drs || 0
  const throttle = telemetry?.throttle || 0
  const brake = telemetry?.brake || 0

  return (
    <div className={`f1-tele ${isSelected ? 'selected' : ''}`}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,.04)' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}60` }} />
        <span style={{ fontFamily: "'Outfit'", fontWeight: 800, color: '#fff', fontSize: 13, letterSpacing: '.02em' }}>{code}</span>
        <span style={{ fontSize: 7, color: '#555', fontFamily: "'Outfit'", fontWeight: 500 }}>{team}</span>
        <span style={{ flex: 1 }} />
        <button onClick={onSwap} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 4, color: '#555', fontSize: 8, padding: '2px 6px', cursor: 'pointer', transition: 'all .2s' }}>x</button>
      </div>
      {/* Speed */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span className="f1-label">SPEED</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', fontFamily: "'Outfit'" }}>{speed} <span style={{ fontSize: 7, color: '#555' }}>km/h</span></span>
        </div>
        <div className="f1-bar">
          <div className="f1-bar-fill" style={{ width: `${speedPct}%`, background: `linear-gradient(90deg, #3b82f6, #f59e0b ${Math.max(10, 50 / speedPct * 100)}%, #ef4444)` }} />
        </div>
      </div>
      {/* Gear + DRS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span className="f1-label">GEAR</span>
        <span style={{ display: 'inline-block', width: 22, height: 22, lineHeight: '22px', textAlign: 'center', border: `2px solid ${color}`, borderRadius: 4, fontSize: 14, fontWeight: 800, fontFamily: "'JetBrains Mono'", color: '#fff' }}>{gear}</span>
        <span style={{ flex: 1 }} />
        <span className={drs > 0 ? 'drs-on' : ''} style={{ padding: '2px 8px', borderRadius: 4, fontSize: 8, fontWeight: 700, background: drs > 0 ? 'rgba(34,197,94,.2)' : '#1a1a2a', color: drs > 0 ? '#22c55e' : '#444' }}>DRS {drs > 0 ? 'ON' : 'OFF'}</span>
      </div>
      {/* Throttle */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
          <span className="f1-label">THR</span>
          <span style={{ fontSize: 8, color: '#555' }}>{throttle}%</span>
        </div>
        <div className="f1-bar">
          <div className="f1-bar-fill" style={{ width: `${throttle}%`, background: 'linear-gradient(90deg, #166534, #22c55e)' }} />
        </div>
      </div>
      {/* Brake */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
          <span className="f1-label">BRK</span>
          <span style={{ fontSize: 8, color: '#555' }}>{brake}%</span>
        </div>
        <div className="f1-bar">
          <div className="f1-bar-fill" style={{ width: `${brake}%`, background: 'linear-gradient(90deg, #991b1b, #ef4444)' }} />
        </div>
      </div>
      {/* Ahead / Behind */}
      <div style={{ display: 'flex', gap: 10, fontSize: 8 }}>
        <div><span className="f1-label">AHEAD</span> <span style={{ color: '#888' }}>{telemetry?.aheadCode || '--'}</span> {telemetry?.aheadGap > 0 && <span style={{ color: '#555' }}>+{telemetry.aheadGap.toFixed(1)}s</span>}</div>
        <div><span className="f1-label">BEHIND</span> <span style={{ color: '#888' }}>{telemetry?.behindCode || '--'}</span> {telemetry?.behindGap > 0 && <span style={{ color: '#555' }}>+{telemetry.behindGap.toFixed(1)}s</span>}</div>
      </div>
    </div>
  )
}

// Enhanced Track SVG
// Snap a point to the nearest position on the track polyline
function snapToTrack(x: number, y: number, trackPts: number[][]): { x: number, y: number } {
  let minDist = Infinity, bestX = x, bestY = y
  for (let i = 0; i < trackPts.length - 1; i++) {
    const [ax, ay] = trackPts[i], [bx, by] = trackPts[i + 1]
    const dx = bx - ax, dy = by - ay
    const len2 = dx * dx + dy * dy
    if (len2 === 0) continue
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2))
    const px = ax + t * dx, py = ay + t * dy
    const d = (x - px) * (x - px) + (y - py) * (y - py)
    if (d < minDist) { minDist = d; bestX = px; bestY = py }
  }
  return { x: bestX, y: bestY }
}

function TrackSVG({ pts, cars, drivers, standings, large, selectedDrivers, onCarClick, lapFlags, replayLap }: {
  pts: number[][], cars: Map<number, { x: number, y: number }>, drivers: any[], standings: any[],
  large?: boolean, selectedDrivers: number[], onCarClick: (dn: number) => void,
  lapFlags: Map<number, string>, replayLap: number
}) {
  if (!pts.length) return <div style={{ color: '#333', textAlign: 'center', padding: 20, fontSize: 10 }}>No track data</div>
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1])
  const xMin = Math.min(...xs), xMax = Math.max(...xs), yMin = Math.min(...ys), yMax = Math.max(...ys)
  const W = large ? 800 : 500, H = large ? 500 : 280, P = large ? 40 : 20
  const tx = (x: number) => P + ((x - xMin) / (xMax - xMin)) * (W - 2 * P)
  const ty = (y: number) => H - P - ((y - yMin) / (yMax - yMin)) * (H - 2 * P)
  const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + tx(p[0]).toFixed(1) + ',' + ty(p[1]).toFixed(1)).join(' ')
  const sw = large ? 10 : 6

  // DRS zone paths
  const drsZones = ALBERT_PARK_DRS.map(zone => {
    const startIdx = Math.round(zone.start * (pts.length - 1))
    const endIdx = Math.round(zone.end * (pts.length - 1))
    const zonePts = pts.slice(startIdx, endIdx + 1)
    if (zonePts.length < 2) return null
    return zonePts.map((p, i) => (i === 0 ? 'M' : 'L') + tx(p[0]).toFixed(1) + ',' + ty(p[1]).toFixed(1)).join(' ')
  })

  // Current flag status
  const currentFlag = lapFlags.get(replayLap) || 'green'
  const flagBorder = currentFlag === 'yellow' ? '#eab308' : currentFlag === 'red' ? '#ef4444' : currentFlag === 'sc' ? '#f97316' : currentFlag === 'vsc' ? '#fbbf24' : 'transparent'

  return <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: large ? '100%' : 500, height: 'auto', borderRadius: 16, background: 'transparent', border: flagBorder !== 'transparent' ? `2px solid ${flagBorder}` : '1px solid rgba(255,255,255,.04)', filter: 'drop-shadow(0 4px 20px rgba(0,0,0,.15))' }}>
    <defs>
      <pattern id="tg" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#fff" strokeWidth=".15" opacity=".03" /></pattern>
      <radialGradient id="tv" cx="50%" cy="50%" r="55%"><stop offset="0%" stopColor="transparent" /><stop offset="100%" stopColor="#000" stopOpacity=".2" /></radialGradient>
      <filter id="trackGlow"><feGaussianBlur stdDeviation="2.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <linearGradient id="trackStroke" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="rgba(80,80,120,.4)"/><stop offset="50%" stopColor="rgba(100,100,150,.5)"/><stop offset="100%" stopColor="rgba(80,80,120,.4)"/></linearGradient>
    </defs>
    <rect width={W} height={H} fill="url(#tg)" opacity=".5" /><rect width={W} height={H} fill="url(#tv)" />
    {/* Track layers - semi-transparent for shader bleed-through */}
    <path d={path} fill="none" stroke="rgba(20,20,35,.7)" strokeWidth={sw + 8} strokeLinecap="round" strokeLinejoin="round" />
    <path d={path} fill="none" stroke="rgba(40,40,60,.6)" strokeWidth={sw + 3} strokeLinecap="round" strokeLinejoin="round" />
    <path d={path} fill="none" stroke="rgba(70,70,100,.35)" strokeWidth={sw - 1} strokeLinecap="round" strokeLinejoin="round" filter="url(#trackGlow)" />
    {/* DRS zones (green overlay) */}
    {drsZones.map((zp, i) => zp && <g key={`drs-${i}`}>
      <path d={zp} fill="none" stroke="#22c55e" strokeWidth={sw + 4} strokeLinecap="round" strokeLinejoin="round" opacity=".15" />
      <path d={zp} fill="none" stroke="#22c55e" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" opacity=".35" />
    </g>)}
    {/* Start/finish */}
    <circle cx={tx(pts[0][0])} cy={ty(pts[0][1])} r={large ? 6 : 3} fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.5)" strokeWidth="1.5" />
    <circle cx={tx(pts[0][0])} cy={ty(pts[0][1])} r={large ? 2 : 1.5} fill="#fff" opacity=".6" />
    <text x={tx(pts[0][0]) + (large ? 12 : 6)} y={ty(pts[0][1]) - 3} fill="#666" fontSize={large ? 7 : 5} fontFamily="Outfit" fontWeight="600">S/F</text>
    {/* Cars — snapped to track polyline for accuracy */}
    {[...cars.entries()].map(([dn, pos]) => {
      const drv = drivers.find((d: any) => d.driver_number === dn); if (!drv || (!pos.x && !pos.y)) return null
      const col = '#' + (drv.team_colour || '888'), code = drv.name_acronym || '?'
      const st = standings.find((s: any) => s.number === dn), p = st?.position || 99
      const snapped = snapToTrack(pos.x, pos.y, pts)
      const cx = tx(snapped.x), cy = ty(snapped.y), r = large ? (p <= 3 ? 8 : 6) : (p <= 3 ? 5 : 4)
      const isSel = selectedDrivers.includes(dn)
      return <g key={dn} style={{ cursor: 'pointer', transform: `translate(${cx}px,${cy}px)` }} onClick={() => onCarClick(dn)}>
        {/* Ambient glow */}
        <circle cx={0} cy={0} r={r + 3} fill={col} opacity=".08" style={{ transition: 'r .3s ease' }} />
        {/* Selection glow */}
        {isSel && <circle cx={0} cy={0} r={r + 6} fill="none" stroke={col} strokeWidth="1.5" opacity=".4" style={{ transition: 'all .3s ease' }} />}
        {/* Podium ring */}
        {p <= 3 && <circle cx={0} cy={0} r={r + 3} fill="none" stroke="#d4a843" strokeWidth="1" opacity=".6" />}
        {/* Main dot */}
        <circle cx={0} cy={0} r={r} fill={col} stroke="rgba(0,0,0,.6)" strokeWidth=".8" />
        {/* Position number */}
        {p <= 3 && <text x={0} y={large ? 3 : 2} fill="#000" fontSize={large ? 6 : 4} fontFamily="Outfit" fontWeight="800" textAnchor="middle">{p}</text>}
        {/* Driver code */}
        <text x={large ? 12 : 8} y={3} fill={isSel ? '#fff' : '#bbb'} fontSize={large ? 8 : 6} fontFamily="Outfit" fontWeight={p <= 3 || isSel ? '700' : '400'} style={{ transition: 'fill .2s ease' }}>{code}</text>
      </g>
    })}
    {/* Flag label */}
    {currentFlag !== 'green' && <text x={W / 2} y={20} fill={flagBorder} fontSize="10" fontFamily="Outfit" fontWeight="700" textAnchor="middle">{currentFlag === 'sc' ? 'SAFETY CAR' : currentFlag === 'vsc' ? 'VSC' : currentFlag === 'red' ? 'RED FLAG' : 'YELLOW FLAG'}</text>}
  </svg>
}

// Progress Bar
function ProgressBar({ lapFlags, currentLap, totalLaps, replayTime, raceStartTime, raceEndTime, onSeek }: {
  lapFlags: Map<number, string>, currentLap: number, totalLaps: number,
  replayTime: number, raceStartTime: number, raceEndTime: number, onSeek: (t: number) => void
}) {
  const flagColors: Record<string, string> = { green: '#22c55e', yellow: '#eab308', red: '#ef4444', sc: '#f97316', vsc: '#fbbf24' }
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 120 }}>
      <div style={{ flex: 1, height: 12, borderRadius: 6, background: 'rgba(10,10,20,.6)', display: 'flex', overflow: 'hidden', cursor: 'pointer', border: '1px solid rgba(255,255,255,.05)', backdropFilter: 'blur(8px)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,.3)' }}
        onClick={e => {
          const rect = e.currentTarget.getBoundingClientRect()
          const pct = (e.clientX - rect.left) / rect.width
          const targetTime = raceStartTime + pct * (raceEndTime - raceStartTime)
          onSeek(targetTime)
        }}>
        {Array.from({ length: totalLaps }, (_, i) => {
          const lap = i + 1
          const flag = lapFlags.get(lap) || 'green'
          const isPast = lap <= currentLap
          return <div key={lap} style={{
            flex: 1,
            background: isPast ? (flagColors[flag] || '#22c55e') : 'rgba(255,255,255,.04)',
            opacity: isPast ? (flag === 'green' ? 0.5 : 0.85) : 0.15,
            borderRight: lap < totalLaps ? '1px solid rgba(0,0,0,.4)' : 'none'
          }} />
        })}
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 4, fontSize: 7, color: '#444', flexShrink: 0 }}>
        <span><span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: 1, background: '#22c55e', marginRight: 2 }} />Flag</span>
        <span><span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: 1, background: '#eab308', marginRight: 2 }} />SC</span>
        <span><span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: 1, background: '#ef4444', marginRight: 2 }} />Red</span>
      </div>
    </div>
  )
}

// Tire Badge
function TB({ c, age }: { c?: string; age?: number }) {
  const v = c || 'MEDIUM'
  const bg = v === 'SOFT' ? '#dc2626' : v === 'HARD' ? '#e5e5e5' : v === 'INTERMEDIATE' ? '#22c55e' : v === 'WET' ? '#3b82f6' : '#eab308'
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
    <span style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${bg}`, display: 'inline-block', flexShrink: 0 }} />
    {age !== undefined && age > 0 && <span style={{ fontSize: 7, color: '#444' }}>{age}L</span>}
  </span>
}
