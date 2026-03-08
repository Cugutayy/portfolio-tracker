import { useState, useEffect, useRef, useCallback, useMemo, Suspense, lazy } from 'react'
import { TEAMS, DRIVERS, DRIVER_NUMBER_MAP } from '../f1/data'
import { AUSTRALIA_2026_QUALI, AUSTRALIA_2026_RACE_RESULT, computeBacktest } from '../f1/realdata'
import { predictor } from '../f1/predictor'
import { openF1 } from '../f1/api'
import { TRACK_COORDS, CIRCUIT_MAP } from '../f1/trackData'
import { ALBERT_PARK_DRS } from '../f1/tracks'
import type { PredictionResult } from '../f1/types'
import { NeuroNoise } from '@paper-design/shaders-react'

const SESSION_KEY = 11234
const TOTAL_LAPS = 58

// ═══════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
@keyframes slideUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes drsFlash{0%,100%{box-shadow:0 0 4px rgba(34,197,94,.4)}50%{box-shadow:0 0 12px rgba(34,197,94,.7)}}
.f1{background:#0a0a14;min-height:100vh;color:#e0e0e8;font-family:'JetBrains Mono',monospace;position:relative;overflow:hidden}
.f1-shader{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.12}
.f1::after{content:'';position:fixed;inset:0;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");opacity:.025;z-index:0}
.f1 *{box-sizing:border-box}
.f1p{background:rgba(18,18,32,.75);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:14px 16px;position:relative;z-index:1;box-shadow:inset 0 1px 0 rgba(255,255,255,.03)}
.f1t{font-family:'Outfit',sans-serif;font-size:9px;color:#555;letter-spacing:.1em;font-weight:600;margin-bottom:8px;text-transform:uppercase}
.f1r{display:flex;align-items:center;gap:6px;padding:4px 4px;border-bottom:1px solid rgba(255,255,255,.04);transition:background .15s}
.f1r:hover{background:rgba(255,255,255,.03);border-radius:4px}
.f1b{border:none;border-radius:6px;padding:5px 12px;font-size:10px;color:#fff;cursor:pointer;font-family:'Outfit',sans-serif;font-weight:600;transition:opacity .15s}
.f1b:hover{opacity:.85}
.f1-tele{background:rgba(18,18,32,.85);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:10px 12px;cursor:pointer;transition:border-color .2s,box-shadow .2s}
.f1-tele:hover{border-color:rgba(255,255,255,.15)}
.f1-tele.selected{border-color:rgba(225,6,0,.4);box-shadow:0 0 16px rgba(225,6,0,.1)}
.f1-bar{height:5px;border-radius:3px;background:rgba(255,255,255,.06);overflow:hidden}
.f1-bar-fill{height:100%;border-radius:3px;transition:width .2s ease}
.f1-label{font-family:'Outfit',sans-serif;font-size:7px;color:#444;letter-spacing:.12em;font-weight:600;text-transform:uppercase}
.drs-on{animation:drsFlash 1.5s infinite}
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
export function F1Page() {
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
  const [selectedRace, setSelectedRace] = useState(SESSION_KEY)
  const [carPositions, setCarPositions] = useState<Map<number, { x: number, y: number }>>(new Map())
  const [allLocationData, setAllLocationData] = useState<any[]>([])
  const [livePreds, setLivePreds] = useState<PredictionResult[] | null>(null)
  const [liveActive, setLiveActive] = useState(false)
  // Telemetry
  const [selectedDrivers, setSelectedDrivers] = useState<number[]>([63, 1, 44])
  const [allCarData, setAllCarData] = useState<any[]>([])
  const [carTelemetry, setCarTelemetry] = useState<Map<number, {
    speed: number; gear: number; drs: number; throttle: number; brake: number
    aheadCode: string | null; aheadGap: number; behindCode: string | null; behindGap: number
  }>>(new Map())
  // Progress
  const [lapFlags, setLapFlags] = useState<Map<number, string>>(new Map())

  const replayRef = useRef<number | null>(null)
  const liveRef = useRef<number | null>(null)

  // === INIT: races + pre-race prediction ===
  useEffect(() => {
    (async () => {
      try {
        const sessions = await openF1.getSessions({ year: 2026, session_type: 'Race' })
        setRaces(sessions.map((s: any) => ({ key: s.session_key, name: s.country_name, circuit: s.circuit_short_name || s.country_name, date: s.date_start?.slice(0, 10) || '', hasData: new Date(s.date_start) <= new Date() })))
      } catch { }
    })()
    setPreds(predictor.predictFromGrid(AUSTRALIA_2026_QUALI.map(q => ({
      code: q.driverCode, name: q.driverName, team: q.team, teamColor: TEAMS[q.team]?.color || '#888', position: q.position,
      qualiDelta: (q.q3Time ? pT(q.q3Time) : q.q2Time ? pT(q.q2Time) : q.q1Time ? pT(q.q1Time) : 83) - 78.518
    }))))
  }, [])

  // Race change -> auto qualifying fetch
  useEffect(() => {
    if (selectedRace === SESSION_KEY) return
    ;(async () => {
      try {
        const race = races.find(r => r.key === selectedRace); if (!race?.hasData) return
        const allS = await openF1.getSessions({ year: 2026 })
        const qS = allS.find((s: any) => s.session_type === 'Qualifying' && Math.abs(new Date(s.date_start || '').getTime() - new Date(race.date).getTime()) < 3 * 86400000)
        if (!qS) return
        const [laps, drvs] = await Promise.all([openF1.getLaps(qS.session_key), openF1.getDrivers(qS.session_key)])
        const best = new Map<number, number>()
        for (const l of laps) if (l.lap_duration && l.lap_duration > 0) { const c = best.get(l.driver_number) || Infinity; if (l.lap_duration < c) best.set(l.driver_number, l.lap_duration) }
        const pole = Math.min(...best.values())
        const grid = [...best.entries()].sort((a, b) => a[1] - b[1]).map(([dn, t], i) => { const d = drvs.find((x: any) => x.driver_number === dn); return { code: d?.name_acronym || '?', name: d?.full_name || '?', team: d?.team_name || '?', teamColor: '#' + (d?.team_colour || '888'), position: i + 1, qualiDelta: t - pole } })
        if (grid.length > 0) setPreds(predictor.predictFromGrid(grid))
      } catch { }
    })()
  }, [selectedRace, races])

  // === LOAD REPLAY ===
  const loadReplay = useCallback(async () => {
    const sk = selectedRace; setLoading(true)
    try {
      const [drv, laps, pos, intv, st, rc, w] = await Promise.all([openF1.getDrivers(sk), openF1.getLaps(sk), openF1.getPositions(sk), openF1.getIntervals(sk), openF1.getStints(sk), openF1.getRaceControl(sk), openF1.getWeather(sk)])
      setDrivers(drv); setLapData(laps); setPosData(pos); setIntervalData(intv); setStintData(st); setRaceCtrl(rc)
      if (w.length > 0) setWeatherData(w[w.length - 1])
      // Compute lap flags from race control
      const flags = new Map<number, string>()
      for (let i = 1; i <= TOTAL_LAPS; i++) flags.set(i, 'green')
      for (const m of rc) {
        if (!m.lap_number) continue
        if (m.flag === 'RED') { for (let i = m.lap_number; i <= Math.min(m.lap_number + 2, TOTAL_LAPS); i++) flags.set(i, 'red') }
        else if (m.message?.includes('SAFETY CAR') && !m.message?.includes('VIRTUAL')) { for (let i = m.lap_number; i <= Math.min(m.lap_number + 3, TOTAL_LAPS); i++) flags.set(i, 'sc') }
        else if (m.message?.includes('VIRTUAL SAFETY CAR')) { for (let i = m.lap_number; i <= Math.min(m.lap_number + 2, TOTAL_LAPS); i++) flags.set(i, 'vsc') }
        else if (m.flag === 'YELLOW') flags.set(m.lap_number, 'yellow')
      }
      setLapFlags(flags)
      // Location data
      try {
        const top = [63, 12, 16, 44, 4, 1, 87, 30, 5, 10]
        const r1 = await Promise.all(top.slice(0, 3).map(dn => openF1.getLocations(sk, dn).catch(() => [])))
        const r2 = await Promise.all(top.slice(3, 6).map(dn => openF1.getLocations(sk, dn).catch(() => [])))
        const r3 = await Promise.all(top.slice(6, 10).map(dn => openF1.getLocations(sk, dn).catch(() => [])))
        setAllLocationData([...r1, ...r2, ...r3].flat())
      } catch { }
      // Car data for selected drivers
      try {
        const cd = await Promise.all(selectedDrivers.map(dn => openF1.getCarData(sk, dn).catch(() => [])))
        setAllCarData(cd.flat())
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
      } catch { }
    }
    poll(); liveRef.current = window.setInterval(poll, 5000)
  }, [liveActive, selectedRace])
  useEffect(() => () => { if (liveRef.current) clearInterval(liveRef.current) }, [])

  // === REPLAY TIMER ===
  useEffect(() => {
    if (!replayPlaying) { if (replayRef.current) clearInterval(replayRef.current); return }
    const T = 200, S = T * replaySpeed * 10
    replayRef.current = window.setInterval(() => setReplayTime(p => { const n = p + S; if (n >= raceEndTime) { setReplayPlaying(false); return raceEndTime } return n }), T)
    return () => { if (replayRef.current) clearInterval(replayRef.current) }
  }, [replayPlaying, replaySpeed, raceEndTime])

  // Lap from time
  useEffect(() => { if (!lapData.length || !replayTime) return; const rl = lapData.filter((l: any) => l.driver_number === 63 && l.date_start); let c = 1; for (const l of rl) if (new Date(l.date_start).getTime() <= replayTime) c = l.lap_number; setReplayLap(c) }, [replayTime, lapData])

  // Car positions from time
  useEffect(() => { if (!allLocationData.length || !replayTime) return; const m = new Map<number, { x: number, y: number }>(); const s = new Set<number>(); for (let i = allLocationData.length - 1; i >= 0; i--) { const l = allLocationData[i]; if (s.has(l.driver_number)) continue; if (new Date(l.date).getTime() <= replayTime) { m.set(l.driver_number, { x: l.x, y: l.y }); s.add(l.driver_number) } } setCarPositions(m) }, [replayTime, allLocationData])

  // Telemetry from car_data
  useEffect(() => {
    if (!allCarData.length || !replayTime || mode !== 'replay') return
    const tMap = new Map<number, any>()
    for (const dn of selectedDrivers) {
      const driverData = allCarData.filter(d => d.driver_number === dn)
      let best: any = null
      for (let i = driverData.length - 1; i >= 0; i--) {
        if (new Date(driverData[i].date).getTime() <= replayTime) { best = driverData[i]; break }
      }
      if (best) {
        // Compute ahead/behind
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
  }, [replayTime, allCarData, selectedDrivers, mode])

  // Fetch car_data for newly selected drivers
  useEffect(() => {
    if (mode !== 'replay' || !selectedRace || !allCarData.length) return
    const existing = new Set(allCarData.map(d => d.driver_number))
    const needed = selectedDrivers.filter(dn => !existing.has(dn))
    if (!needed.length) return
    ;(async () => {
      try {
        const results = await Promise.all(needed.map(dn => openF1.getCarData(selectedRace, dn).catch(() => [])))
        setAllCarData(prev => [...prev, ...results.flat()])
      } catch { }
    })()
  }, [selectedDrivers, mode, selectedRace, allCarData.length])

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

  // AI prediction update
  useEffect(() => {
    if (mode !== 'replay' || !standings.length || replayLap < 2) return
    setLivePreds(predictor.updateFromLiveData(standings.map((d: any) => ({
      code: d.code, name: d.name, team: d.team, teamColor: d.color, position: d.position,
      lastLapTime: d.lastLap || null, gap: d.gap, pitStops: d.stint?.tyre_age_at_start === 0 ? 1 : 0,
      compound: d.stint?.compound || 'MEDIUM'
    })), replayLap))
  }, [replayLap, mode, standings])

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
  return (
    <div className="f1"><style>{CSS}</style>
      {/* ═══ SHADER BACKGROUND ═══ */}
      <div className="f1-shader">
        <NeuroNoise
          colorFront="#e10600"
          colorMid="#1a0020"
          colorBack="#0a0a14"
          brightness={0.4}
          contrast={0.6}
          scale={1.5}
          speed={0.2}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      {/* ═══ HEADER BAR ═══ */}
      <div style={{ background: 'rgba(12,12,24,.95)', borderBottom: '2px solid #e10600', padding: '6px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href="/" style={{ color: '#444', textDecoration: 'none', fontSize: 11, border: '1px solid #222', borderRadius: 5, padding: '2px 8px' }}>{'<-'}</a>
          <span style={{ fontFamily: "'Outfit'", fontWeight: 800, color: '#fff', fontSize: 14 }}>F1</span>
          <span style={{ fontFamily: "'Outfit'", fontWeight: 800, color: '#e10600', fontSize: 14 }}>PREDICTOR</span>
          {races.length > 0 && <select value={selectedRace} onChange={e => setSelectedRace(Number(e.target.value))} style={{ background: '#111', border: '1px solid #222', borderRadius: 5, color: '#888', padding: '2px 6px', fontSize: 9 }}>
            {races.map(r => <option key={r.key} value={r.key} disabled={!r.hasData}>{r.circuit} {r.date.slice(5)}</option>)}
          </select>}
          {mode === 'replay' && <span style={{ background: '#e10600', padding: '1px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, color: '#fff' }}>LAP {replayLap}/{TOTAL_LAPS}</span>}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          {weatherData && <span style={{ fontSize: 8, color: '#444' }}>{weatherData.air_temperature?.toFixed(0)}deg T{weatherData.track_temperature?.toFixed(0)}deg</span>}
          <button className="f1b" onClick={() => setMode('predict')} style={{ background: mode === 'predict' ? '#e10600' : '#1a1a2a' }}>TAHMIN</button>
          <button className="f1b" onClick={loadReplay} style={{ background: mode === 'replay' && !liveActive ? '#e10600' : '#1a1a2a', opacity: loading ? .5 : 1 }}>{loading ? '...' : 'REPLAY'}</button>
          <button className="f1b" onClick={toggleLive} style={{ background: liveActive ? '#dc2626' : '#1a1a2a', animation: liveActive ? 'pulse 2s infinite' : '' }}>
            {liveActive && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', display: 'inline-block', marginRight: 4 }} />}CANLI
          </button>
        </div>
      </div>

      {/* ═══ 3-PANEL LAYOUT (both modes) ═══ */}
      <div className="f1-layout" style={{ padding: 0, height: 'calc(100vh - 42px)', display: 'flex', flexDirection: 'column' }}>
        <div className="f1-main" style={{ flex: 1, display: 'flex', overflow: 'hidden', gap: 4 }}>

          {/* ═══ LEFT PANEL ═══ */}
          <div className="f1-side" style={{ width: 260, minWidth: 220, padding: '8px 6px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Weather */}
            <WeatherCard data={weatherData} />

            {mode === 'predict' ? (
              // Predict: Qualifying grid
              <div className="f1p" style={{ flex: 1 }}>
                <div className="f1t">QUALIFYING GRID</div>
                <div style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
                  {AUSTRALIA_2026_QUALI.map((q, i) => {
                    const pr = preds?.find(p => p.driverCode === q.driverCode)
                    return <div key={q.driverCode} className="f1r">
                      <span style={{ width: 14, fontFamily: "'Outfit'", fontWeight: 800, color: i < 3 ? '#d4a843' : '#555', fontSize: 10 }}>{q.position}</span>
                      <div style={{ width: 2, height: 14, borderRadius: 1, background: TEAMS[q.team]?.color || '#444' }} />
                      <span style={{ flex: 1, fontSize: 9, color: i < 10 ? '#ddd' : '#555' }}>{q.driverCode}</span>
                      <span style={{ fontSize: 8, color: '#444' }}>{q.q3Time || q.q2Time || '--'}</span>
                      <span style={{ fontSize: 8, fontWeight: 700, color: pr && pr.predictedPosition <= 3 ? '#d4a843' : '#444' }}>P{pr?.predictedPosition || '--'}</span>
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

            {mode === 'predict' && <div className="f1p"><div className="f1t">MODEL</div><div style={{ fontSize: 8, color: '#555', lineHeight: 1.6 }}>Ridge40%+GB60% ELO + 14f + OpenF1</div></div>}
          </div>

          {/* ═══ CENTER: TRACK MAP ═══ */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, position: 'relative', zIndex: 1 }}>
            <TrackSVG pts={trackPts} cars={carPositions} drivers={drivers} standings={standings}
              selectedDrivers={selectedDrivers} onCarClick={handleCarClick}
              lapFlags={lapFlags} replayLap={replayLap} large />
          </div>

          {/* ═══ RIGHT PANEL ═══ */}
          <div className="f1-side" style={{ width: 280, minWidth: 230, padding: '8px 6px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {mode === 'predict' ? (
              // Predict: Results vs predictions
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
                      <span style={{ flex: 1, fontSize: 9, color: dead ? '#333' : i < 10 ? '#ddd' : '#666' }}>{r.code}</span>
                      <span style={{ fontSize: 8, fontWeight: 700, color: d && d.err === 0 ? '#4ade80' : d && d.err <= 2 ? '#fbbf24' : '#555' }}>{'P' + (d?.pred || '-')}</span>
                      <span style={{ fontSize: 8, fontWeight: 700, color: d && d.err === 0 ? '#4ade80' : d && d.err <= 2 ? '#fbbf24' : '#ef4444' }}>{d ? (d.err === 0 ? 'V' : '+' + d.err) : ''}</span>
                    </div>
                  })}
                </div>
              </div>
            ) : (
              // Replay: Leaderboard + AI + Events
              <>
                <div className="f1p" style={{ flex: 1 }}>
                  <div className="f1t">LEADERBOARD - L{replayLap}</div>
                  <div style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
                    {standings.slice(0, 22).map((d: any, i: number) => {
                      const lp = livePreds?.find(p => p.driverCode === d.code)
                      const isPitting = stintData.some((st: any) => st.driver_number === d.number && st.tyre_age_at_start === 0 && st.lap_start === replayLap)
                      return <div key={d.number} className="f1r" style={{ cursor: 'pointer', opacity: d.retired ? .3 : 1 }} onClick={() => handleCarClick(d.number)}>
                        <span style={{ width: 16, fontFamily: "'Outfit'", fontWeight: 800, color: d.retired ? '#ef4444' : i < 3 ? '#d4a843' : i < 10 ? '#aaa' : '#444', fontSize: 11 }}>{d.retired ? 'X' : i + 1}</span>
                        <div style={{ width: 3, height: 16, borderRadius: 1, background: d.color }} />
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
        <div className="f1-bottom" style={{ padding: '6px 12px', background: 'rgba(12,12,24,.95)', borderTop: '1px solid #1a1a2a', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', zIndex: 10 }}>
          {mode === 'replay' ? (
            <>
              {/* Transport controls */}
              <button className="f1b" onClick={() => setReplayTime(raceStartTime)} style={{ background: '#1a1a2a', padding: '3px 6px', fontSize: 9 }}>|{'<<'}</button>
              <button className="f1b" onClick={() => setReplayTime(Math.max(raceStartTime, replayTime - 85000))} style={{ background: '#1a1a2a', padding: '3px 6px', fontSize: 9 }}>{'<<'}</button>
              <button className="f1b" onClick={() => setReplayPlaying(!replayPlaying)} style={{ background: replayPlaying ? '#ef4444' : '#22c55e', padding: '4px 14px' }}>{replayPlaying ? 'STOP' : 'PLAY'}</button>
              <button className="f1b" onClick={() => setReplayTime(Math.min(raceEndTime, replayTime + 85000))} style={{ background: '#1a1a2a', padding: '3px 6px', fontSize: 9 }}>{'>>'}</button>
              {[.5, 1, 2, 4].map(s => <button key={s} className="f1b" onClick={() => setReplaySpeed(s)} style={{ background: replaySpeed === s ? '#e10600' : '#1a1a2a', padding: '3px 8px', fontSize: 8 }}>{s}x</button>)}
              {/* Progress bar */}
              <ProgressBar lapFlags={lapFlags} currentLap={replayLap} totalLaps={TOTAL_LAPS}
                replayTime={replayTime} raceStartTime={raceStartTime} raceEndTime={raceEndTime}
                onSeek={t => setReplayTime(t)} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: "'Outfit'" }}>L{replayLap}/{TOTAL_LAPS}</span>
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
  return (
    <div className="f1p">
      <div className="f1t">WEATHER</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 9, color: '#888' }}>
        <div><span className="f1-label">Track</span> <span style={{ color: '#ccc', fontWeight: 600 }}>{data.track_temperature?.toFixed(1)}C</span></div>
        <div><span className="f1-label">Air</span> <span style={{ color: '#ccc', fontWeight: 600 }}>{data.air_temperature?.toFixed(1)}C</span></div>
        <div><span className="f1-label">Humid</span> <span style={{ color: '#ccc' }}>{data.humidity?.toFixed(0)}%</span></div>
        <div><span className="f1-label">Wind</span> <span style={{ color: '#ccc' }}>{data.wind_speed?.toFixed(1)}km/h</span></div>
        <div style={{ gridColumn: '1 / -1' }}><span className="f1-label">Rain</span> <span style={{ color: data.rainfall > 0 ? '#3b82f6' : '#22c55e', fontWeight: 700 }}>{data.rainfall > 0 ? 'WET' : 'DRY'}</span></div>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
        <span style={{ fontFamily: "'Outfit'", fontWeight: 800, color: '#fff', fontSize: 12 }}>{code}</span>
        <span style={{ fontSize: 7, color: '#444' }}>{team}</span>
        <span style={{ flex: 1 }} />
        <button onClick={onSwap} style={{ background: 'none', border: '1px solid #222', borderRadius: 4, color: '#444', fontSize: 8, padding: '1px 5px', cursor: 'pointer' }}>x</button>
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

  return <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: large ? '100%' : 500, height: 'auto', borderRadius: 10, background: 'linear-gradient(135deg,#080810,#0e1018 50%,#080812)', border: flagBorder !== 'transparent' ? `2px solid ${flagBorder}` : 'none' }}>
    <defs>
      <pattern id="tg" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="#fff" strokeWidth=".2" opacity=".04" /></pattern>
      <radialGradient id="tv" cx="50%" cy="50%" r="55%"><stop offset="0%" stopColor="transparent" /><stop offset="100%" stopColor="#000" stopOpacity=".5" /></radialGradient>
    </defs>
    <rect width={W} height={H} fill="url(#tg)" /><rect width={W} height={H} fill="url(#tv)" />
    {/* Track layers */}
    <path d={path} fill="none" stroke="#1a1a2a" strokeWidth={sw + 6} strokeLinecap="round" strokeLinejoin="round" />
    <path d={path} fill="none" stroke="#2a2a3a" strokeWidth={sw + 2} strokeLinecap="round" strokeLinejoin="round" />
    <path d={path} fill="none" stroke="#3a3a4a" strokeWidth={sw - 2} strokeLinecap="round" strokeLinejoin="round" opacity=".5" />
    {/* DRS zones (green overlay) */}
    {drsZones.map((zp, i) => zp && <path key={`drs-${i}`} d={zp} fill="none" stroke="#22c55e" strokeWidth={sw + 3} strokeLinecap="round" strokeLinejoin="round" opacity=".25" />)}
    {/* Start/finish */}
    <circle cx={tx(pts[0][0])} cy={ty(pts[0][1])} r={large ? 5 : 3} fill="none" stroke="#fff" strokeWidth="1.5" opacity=".5" />
    <text x={tx(pts[0][0]) + (large ? 10 : 6)} y={ty(pts[0][1]) - 3} fill="#444" fontSize={large ? 7 : 5} fontFamily="Outfit">S/F</text>
    {/* Cars */}
    {[...cars.entries()].map(([dn, pos]) => {
      const drv = drivers.find((d: any) => d.driver_number === dn); if (!drv || (!pos.x && !pos.y)) return null
      const col = '#' + (drv.team_colour || '888'), code = drv.name_acronym || '?'
      const st = standings.find((s: any) => s.number === dn), p = st?.position || 99
      const cx = tx(pos.x), cy = ty(pos.y), r = large ? (p <= 3 ? 8 : 6) : (p <= 3 ? 5 : 4)
      const isSel = selectedDrivers.includes(dn)
      return <g key={dn} style={{ cursor: 'pointer' }} onClick={() => onCarClick(dn)}>
        {/* Selection glow */}
        {isSel && <circle cx={cx} cy={cy} r={r + 5} fill="none" stroke={col} strokeWidth="1.5" opacity=".35" />}
        {/* Podium ring */}
        {p <= 3 && <circle cx={cx} cy={cy} r={r + 2.5} fill="none" stroke="#d4a843" strokeWidth="1" opacity=".6" />}
        {/* Main dot */}
        <circle cx={cx} cy={cy} r={r} fill={col} stroke="#000" strokeWidth=".8" />
        {/* Position number */}
        {p <= 3 && <text x={cx} y={cy + (large ? 3 : 2)} fill="#000" fontSize={large ? 6 : 4} fontFamily="Outfit" fontWeight="800" textAnchor="middle">{p}</text>}
        {/* Driver code */}
        <text x={cx + (large ? 12 : 8)} y={cy + 3} fill={isSel ? '#fff' : '#aaa'} fontSize={large ? 8 : 6} fontFamily="Outfit" fontWeight={p <= 3 || isSel ? '700' : '400'}>{code}</text>
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
      <div style={{ flex: 1, height: 12, borderRadius: 6, background: '#0a0a14', display: 'flex', overflow: 'hidden', cursor: 'pointer', border: '1px solid rgba(255,255,255,.05)' }}
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
