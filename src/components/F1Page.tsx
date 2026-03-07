import { useState, useEffect, useRef, useCallback } from 'react'
import { simulateRace, CIRCUITS, DRIVERS, TEAMS, TYRES, fetchCurrentRaceWeekend, type SimResult, type RacerState, type Circuit, type LapEvent } from '../f1/engine'

// ═══════════════════════════════════════════
// F1 RACE PREDICTOR PAGE
// ═══════════════════════════════════════════
export function F1Page() {
  const [circuit, setCircuit] = useState<Circuit>(CIRCUITS[0]) // Albert Park default
  const [simResult, setSimResult] = useState<SimResult | null>(null)
  const [currentLap, setCurrentLap] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [liveData, setLiveData] = useState<any>(null)
  const intervalRef = useRef<number | null>(null)

  // Simülasyonu başlat
  const runSimulation = useCallback((c: Circuit) => {
    setPlaying(false)
    setCurrentLap(0)
    if (intervalRef.current) clearInterval(intervalRef.current)
    const result = simulateRace(c)
    setSimResult(result)
  }, [])

  useEffect(() => { runSimulation(circuit) }, [circuit, runSimulation])

  // OpenF1'den canlı veri çek
  useEffect(() => {
    fetchCurrentRaceWeekend().then(data => {
      if (data) setLiveData(data)
    }).catch(() => {})
  }, [])

  // Oynatma
  useEffect(() => {
    if (!playing || !simResult) return
    intervalRef.current = window.setInterval(() => {
      setCurrentLap(prev => {
        if (prev >= simResult.circuit.laps) { setPlaying(false); return prev }
        return prev + 1
      })
    }, 800 / speed)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [playing, speed, simResult])

  const currentStandings = simResult?.lapByLap[currentLap - 1] || simResult?.standings || []
  const currentEvents = simResult?.events.filter(e => e.lap <= currentLap) || []

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', color:'var(--ink)', transition:'background .3s' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg, #111 0%, #1a1a2e 50%, #16213e 100%)', padding:'20px 0', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
        <div className="container" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <a href="/" style={{ color:'rgba(255,255,255,0.5)', fontSize:'.75rem', fontFamily:"'DM Mono',monospace", textDecoration:'none' }}>← Hub</a>
            <h1 style={{ color:'#fff', fontSize:'1.4rem', fontWeight:300, fontFamily:"'Newsreader',serif" }}>
              F1 Race <em style={{ color:'#c9543a' }}>Predictor</em>
            </h1>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {liveData && (
              <span style={{ fontSize:'.65rem', fontFamily:"'DM Mono',monospace", color:'#4ade80', display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#4ade80', animation:'pd 2s ease-in-out infinite', display:'inline-block' }}/>
                OpenF1 Bağlı
              </span>
            )}
            <span style={{ fontSize:'.65rem', fontFamily:"'DM Mono',monospace", color:'rgba(255,255,255,0.4)' }}>2026 Sezonu</span>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding:'24px 28px' }}>
        {/* Pist seçimi + kontroller */}
        <div style={{ display:'flex', gap:16, marginBottom:24, flexWrap:'wrap', alignItems:'center' }}>
          <select
            value={circuit.name}
            onChange={e => { const c = CIRCUITS.find(c => c.name === e.target.value); if (c) { setCircuit(c); runSimulation(c) } }}
            style={{ background:'var(--card-bg)', border:'1px solid var(--rule)', borderRadius:8, padding:'8px 12px', fontFamily:"'DM Mono',monospace", fontSize:'.75rem', color:'var(--ink)', cursor:'pointer' }}
          >
            {CIRCUITS.map(c => (
              <option key={c.name} value={c.name}>{c.flag} {c.name} — {c.country}</option>
            ))}
          </select>

          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => { setPlaying(!playing) }} style={btnStyle}>
              {playing ? '⏸ Durdur' : '▶ Oynat'}
            </button>
            <button onClick={() => runSimulation(circuit)} style={btnStyle}>🔄 Yeni Simülasyon</button>
            <button onClick={() => setSpeed(s => s === 4 ? 1 : s * 2)} style={btnStyle}>
              {speed}x Hız
            </button>
          </div>

          <div className="mono" style={{ fontSize:'.7rem', color:'var(--muted)', marginLeft:'auto' }}>
            Tur {currentLap} / {circuit.laps}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height:3, background:'var(--rule)', borderRadius:2, marginBottom:24, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${(currentLap / circuit.laps) * 100}%`, background:'var(--accent)', transition:'width .3s', borderRadius:2 }} />
        </div>

        {/* Main grid: Sıralama + Pist + Lastik stratejisi */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          
          {/* Sıralama Tablosu */}
          <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:12, padding:16, transition:'background .3s' }}>
            <h3 className="mono" style={{ fontSize:'.7rem', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:12 }}>
              Canlı Sıralama — Tur {currentLap}
            </h3>
            <div style={{ maxHeight:500, overflowY:'auto' }}>
              {currentStandings.map((r, i) => (
                <div key={r.driver.code} style={{
                  display:'flex', alignItems:'center', gap:8, padding:'6px 8px', borderRadius:6,
                  background: i === 0 ? 'rgba(201,168,76,0.08)' : i < 3 ? 'rgba(26,71,42,0.04)' : 'transparent',
                  marginBottom:2, transition:'background .2s',
                  opacity: r.dnf ? 0.35 : 1
                }}>
                  <span className="mono" style={{ width:24, fontSize:'.7rem', fontWeight:600, color: i < 3 ? 'var(--accent)' : 'var(--muted)' }}>
                    {r.dnf ? 'DNF' : `P${r.position}`}
                  </span>
                  <span style={{ width:4, height:16, borderRadius:2, background:r.driver.teamColor }} />
                  <span style={{ flex:1, fontSize:'.82rem', fontWeight: i === 0 ? 500 : 400 }}>
                    {r.driver.name}
                  </span>
                  <span className="mono" style={{ fontSize:'.6rem', color:'var(--muted)', width:50, textAlign:'right' }}>
                    {r.driver.team.split(' ')[0]}
                  </span>
                  {/* Lastik */}
                  <span style={{
                    width:16, height:16, borderRadius:'50%', border:'2px solid',
                    borderColor: TYRES[r.currentTyre].color === '#FFFFFF' ? '#888' : TYRES[r.currentTyre].color,
                    background: TYRES[r.currentTyre].color === '#FFFFFF' ? 'transparent' : TYRES[r.currentTyre].color + '30',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'.45rem', fontWeight:700, color: TYRES[r.currentTyre].color === '#FFFFFF' ? '#888' : TYRES[r.currentTyre].color,
                    fontFamily:"'DM Mono',monospace"
                  }}>
                    {r.currentTyre[0].toUpperCase()}
                  </span>
                  {/* Gap */}
                  <span className="mono" style={{ fontSize:'.6rem', color:'var(--muted)', width:55, textAlign:'right' }}>
                    {i === 0 ? 'LEADER' : r.dnf ? '' : `+${r.gap.toFixed(1)}s`}
                  </span>
                  {/* Pit stops */}
                  <span className="mono" style={{ fontSize:'.55rem', color:'var(--muted)', width:20 }}>
                    {r.pitStops > 0 ? `${r.pitStops}P` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sağ panel: Pist + Events + Lastik */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Pist animasyonu */}
            <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:12, padding:16 }}>
              <h3 className="mono" style={{ fontSize:'.7rem', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>
                {circuit.flag} {circuit.name} — {circuit.laps} tur × {circuit.lapDistance} km
              </h3>
              <TrackAnimation standings={currentStandings} />
            </div>

            {/* Yarış olayları */}
            <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:12, padding:16, maxHeight:200, overflowY:'auto' }}>
              <h3 className="mono" style={{ fontSize:'.7rem', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>
                Yarış Olayları
              </h3>
              {currentEvents.length === 0 ? (
                <div className="mono" style={{ fontSize:'.65rem', color:'var(--muted)' }}>Simülasyonu oynatın...</div>
              ) : (
                [...currentEvents].reverse().slice(0, 15).map((e, i) => (
                  <div key={i} style={{ display:'flex', gap:8, padding:'3px 0', fontSize:'.7rem', borderBottom:'1px solid var(--rule)' }}>
                    <span className="mono" style={{ color:'var(--accent)', width:30, flexShrink:0 }}>T{e.lap}</span>
                    <span style={{ fontSize:'.55rem', padding:'1px 6px', borderRadius:4, background: eventColor(e.type), color:'#fff', flexShrink:0 }}>
                      {eventLabel(e.type)}
                    </span>
                    <span style={{ color:'var(--muted)' }}>{e.detail}</span>
                  </div>
                ))
              )}
            </div>

            {/* Lastik stratejisi görselleştirme (top 5) */}
            <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:12, padding:16 }}>
              <h3 className="mono" style={{ fontSize:'.7rem', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>
                Lastik Stratejisi (Top 5)
              </h3>
              {currentStandings.filter(r => !r.dnf).slice(0, 5).map(r => (
                <div key={r.driver.code} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                  <span className="mono" style={{ fontSize:'.6rem', width:30 }}>{r.driver.code}</span>
                  <div style={{ flex:1, height:14, background:'var(--rule)', borderRadius:3, position:'relative', overflow:'hidden', display:'flex' }}>
                    {r.pitHistory.length === 0 ? (
                      <div style={{ width:'100%', height:'100%', background: TYRES[r.currentTyre].color + '80', borderRadius:3 }} />
                    ) : (
                      r.pitHistory.map((pit, pi) => {
                        const start = pi === 0 ? 0 : r.pitHistory[pi-1].lap
                        const end = pit.lap
                        const nextCompound = pit.compound
                        const prevCompound = pi === 0 ? (r.currentTyre) : r.pitHistory[pi-1].compound
                        // İlk stint
                        return (
                          <div key={pi} style={{
                            width: `${((end - start) / circuit.laps) * 100}%`,
                            height:'100%',
                            background: TYRES[pi === 0 ? 'soft' : r.pitHistory[pi-1].compound]?.color + '80' || '#888',
                          }} title={`Tur ${start}-${end}`} />
                        )
                      })
                    )}
                  </div>
                  <span className="mono" style={{ fontSize:'.55rem', color:'var(--muted)', width:20 }}>{r.pitStops}P</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fastest Lap + Pist bilgisi */}
        {simResult && simResult.fastestLap.driver && (
          <div style={{ marginTop:20, display:'flex', gap:16, flexWrap:'wrap' }}>
            <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:12, padding:'12px 16px', display:'flex', gap:12, alignItems:'center' }}>
              <span style={{ fontSize:'1.2rem' }}>⏱</span>
              <div>
                <div className="mono" style={{ fontSize:'.55rem', color:'var(--muted)', textTransform:'uppercase' }}>En Hızlı Tur</div>
                <div className="mono" style={{ fontSize:'.85rem', fontWeight:500 }}>
                  {formatLapTime(simResult.fastestLap.time)} — {simResult.fastestLap.driver} (Tur {simResult.fastestLap.lap})
                </div>
              </div>
            </div>
            {simResult.weather.rainLaps && (
              <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:12, padding:'12px 16px', display:'flex', gap:12, alignItems:'center' }}>
                <span style={{ fontSize:'1.2rem' }}>🌧</span>
                <div>
                  <div className="mono" style={{ fontSize:'.55rem', color:'var(--muted)', textTransform:'uppercase' }}>Yağmur</div>
                  <div className="mono" style={{ fontSize:'.85rem', fontWeight:500 }}>
                    Tur {simResult.weather.rainLaps[0]} — {simResult.weather.rainLaps[1]}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
// TRACK ANİMASYONU
// ═══════════════════════════════════════════
const TRACK_SVG = "M50,160 C50,60 100,30 180,30 C260,30 290,80 340,80 C390,80 440,40 470,90 C500,140 460,160 400,155 C340,150 280,165 180,165 C100,165 50,200 50,160 Z"

function TrackAnimation({ standings }: { standings: RacerState[] }) {
  const top6 = standings.filter(r => !r.dnf).slice(0, 6)
  
  return (
    <svg viewBox="0 0 520 200" style={{ width:'100%', height:120 }}>
      {/* Pist */}
      <path d={TRACK_SVG} fill="none" stroke="var(--rule)" strokeWidth="18" strokeLinecap="round" opacity=".6" />
      <path d={TRACK_SVG} fill="none" stroke="var(--dash-border)" strokeWidth="1" strokeDasharray="6,8" />
      
      {/* Arabalar */}
      {top6.map((r, i) => (
        <circle key={r.driver.code} r={6 - i * 0.5} fill={r.driver.teamColor} opacity={1 - i * 0.08}>
          <animateMotion
            dur={`${3.5 + i * 0.15}s`}
            repeatCount="indefinite"
            path={TRACK_SVG}
            begin={`${i * 0.3}s`}
          />
        </circle>
      ))}
    </svg>
  )
}

// ═══════════════════════════════════════════
// YARDIMCILAR
// ═══════════════════════════════════════════
const btnStyle: React.CSSProperties = {
  background:'var(--card-bg)', border:'1px solid var(--rule)', borderRadius:8,
  padding:'6px 14px', fontFamily:"'DM Mono',monospace", fontSize:'.65rem',
  color:'var(--ink)', cursor:'pointer', transition:'all .2s'
}

function eventColor(type: string) {
  switch(type) {
    case 'overtake': return '#3b82f6'
    case 'pit': return '#f59e0b'
    case 'sc': return '#ef4444'
    case 'vsc': return '#f97316'
    case 'rain_start': return '#6366f1'
    case 'rain_end': return '#22c55e'
    case 'dnf': return '#dc2626'
    case 'fastest_lap': return '#a855f7'
    default: return '#6b7280'
  }
}

function eventLabel(type: string) {
  switch(type) {
    case 'overtake': return 'OVT'
    case 'pit': return 'PIT'
    case 'sc': return 'SC'
    case 'vsc': return 'VSC'
    case 'rain_start': return '🌧'
    case 'rain_end': return '☀'
    case 'dnf': return 'DNF'
    case 'fastest_lap': return 'FL'
    default: return '?'
  }
}

function formatLapTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toFixed(3).padStart(6, '0')}`
}
