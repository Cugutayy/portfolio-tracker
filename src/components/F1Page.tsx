import { useState, useEffect, useRef, useCallback } from 'react'
import { simulateRace } from '../f1/engine'
import { CIRCUITS, DRIVERS, TEAMS, TYRES } from '../f1/data'
import { predictor } from '../f1/predictor'
import { openF1 } from '../f1/api'
import type { SimResult, RacerState, Circuit, LapEvent, PredictionResult } from '../f1/types'

export function F1Page() {
  const [circuit, setCircuit] = useState<Circuit>(CIRCUITS[0])
  const [simResult, setSimResult] = useState<SimResult | null>(null)
  const [currentLap, setCurrentLap] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [apiStatus, setApiStatus] = useState<'connecting'|'connected'|'offline'>('connecting')
  const [aiPredictions, setAiPredictions] = useState<PredictionResult[]|null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [backtestMetrics, setBacktestMetrics] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'sim'|'ai'>('sim')
  const intervalRef = useRef<number|null>(null)

  const runSim = useCallback((c: Circuit) => {
    setPlaying(false); setCurrentLap(0)
    if (intervalRef.current) clearInterval(intervalRef.current)
    setSimResult(simulateRace(c))
  }, [])

  useEffect(() => { runSim(circuit) }, [circuit, runSim])

  // API check
  useEffect(() => {
    openF1.getMeetings(2026).then(m => setApiStatus(m.length > 0 ? 'connected' : 'offline')).catch(() => setApiStatus('offline'))
  }, [])

  // AI init + predict
  const runAIPrediction = useCallback(async () => {
    setAiLoading(true)
    try {
      await predictor.initialize([2023, 2024, 2025])
      const rw = await openF1.getCurrentRaceWeekend(2026)
      if (rw) {
        const preds = await predictor.predict(rw.meeting.meeting_key, rw.meeting.circuit_short_name)
        setAiPredictions(preds)
      }
      // Backtest
      const metrics = await predictor.backtest(2025)
      setBacktestMetrics(metrics)
    } catch (e) { console.warn('[AI]', e) }
    setAiLoading(false)
  }, [])

  // Playback
  useEffect(() => {
    if (!playing || !simResult) return
    intervalRef.current = window.setInterval(() => {
      setCurrentLap(prev => { if (prev >= simResult.circuit.laps) { setPlaying(false); return prev } return prev + 1 })
    }, 600 / speed)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [playing, speed, simResult])

  const standings = simResult?.lapByLap[currentLap - 1] || simResult?.standings || []
  const events = simResult?.events.filter(e => e.lap <= currentLap) || []
  const pittingNow = standings.filter(r => r.status === 'pitting')

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', color:'var(--ink)' }}>
      {/* Header */}
      <header style={{ background:'linear-gradient(135deg, #0a0a0f 0%, #141428 50%, #0f1923 100%)', padding:'14px 0', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div className="container" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <a href="/" style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:28, height:28, borderRadius:7, border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.4)', fontSize:'.75rem', textDecoration:'none' }}>←</a>
            <div>
              <h1 style={{ color:'#fff', fontSize:'1.2rem', fontWeight:300, fontFamily:"'Newsreader',serif", lineHeight:1 }}>F1 Race <em style={{ color:'#e06b52' }}>Predictor</em></h1>
              <span className="mono" style={{ fontSize:'.5rem', color:'rgba(255,255,255,0.25)', letterSpacing:'.08em' }}>2026 · SİMÜLASYON + AI TAHMİN</span>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <StatusDot status={apiStatus} />
            {/* Tab switch */}
            <div style={{ display:'flex', border:'1px solid rgba(255,255,255,0.15)', borderRadius:6, overflow:'hidden' }}>
              <TabBtn active={activeTab==='sim'} onClick={() => setActiveTab('sim')}>Simülasyon</TabBtn>
              <TabBtn active={activeTab==='ai'} onClick={() => { setActiveTab('ai'); if (!aiPredictions && !aiLoading) runAIPrediction() }}>AI Tahmin</TabBtn>
            </div>
          </div>
        </div>
      </header>

      <div className="container" style={{ padding:'16px 28px' }}>
        {activeTab === 'sim' ? (
          <SimTab circuit={circuit} setCircuit={setCircuit} simResult={simResult} currentLap={currentLap} standings={standings} events={events} pittingNow={pittingNow} playing={playing} setPlaying={setPlaying} speed={speed} setSpeed={setSpeed} runSim={runSim} />
        ) : (
          <AITab predictions={aiPredictions} loading={aiLoading} metrics={backtestMetrics} onRerun={runAIPrediction} />
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
// SİMÜLASYON TABI
// ═══════════════════════════════════════════
function SimTab({ circuit, setCircuit, simResult, currentLap, standings, events, pittingNow, playing, setPlaying, speed, setSpeed, runSim }: any) {
  return <>
    {/* Controls */}
    <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
      <select value={circuit.name} onChange={(e: any) => { const c = CIRCUITS.find(c => c.name === e.target.value); if (c) { setCircuit(c); runSim(c) } }} style={selStyle}>
        {CIRCUITS.map(c => <option key={c.name} value={c.name}>{c.flag} {c.name}</option>)}
      </select>
      <Btn onClick={() => setPlaying(!playing)} active={playing}>{playing ? '⏸' : '▶'}</Btn>
      <Btn onClick={() => runSim(circuit)}>↻</Btn>
      <Btn onClick={() => setSpeed((s: number) => s >= 4 ? 1 : s * 2)}>{speed}×</Btn>
      <div style={{ marginLeft:'auto' }} className="mono" ><small style={{ color:'var(--muted)' }}>Tur </small><strong>{currentLap}</strong><small style={{ color:'var(--muted)' }}> / {circuit.laps}</small></div>
    </div>
    {/* Progress */}
    <div style={{ height:2, background:'var(--rule)', borderRadius:1, marginBottom:16, overflow:'hidden' }}>
      <div style={{ height:'100%', width:`${(currentLap/circuit.laps)*100}%`, background:'linear-gradient(90deg,#e06b52,#f59e0b)', borderRadius:1 }} />
    </div>

    {/* BÜYÜK PİST */}
    <Card title={`${circuit.flag} ${circuit.name} · ${circuit.laps} tur · ${circuit.lapDistance} km`}>
      <TrackView standings={standings} pittingNow={pittingNow} />
    </Card>

    {/* Alt grid: sıralama + olaylar + lastik */}
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:12 }}>
      <Card title={`Sıralama · Tur ${currentLap}`}>
        <div style={{ maxHeight:400, overflowY:'auto' }}>
          {standings.map((r: RacerState, i: number) => <DriverRow key={r.driver.code} racer={r} index={i} />)}
        </div>
      </Card>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <Card title="Olaylar">
          <div style={{ maxHeight:180, overflowY:'auto' }}>
            {events.length === 0 ? <Muted>Simülasyonu başlatın...</Muted> :
              [...events].reverse().slice(0,15).map((e: LapEvent, i: number) => <EventRow key={i} event={e} />)}
          </div>
        </Card>
        <Card title="Lastik · Top 6">
          {standings.filter((r: RacerState) => !r.dnf).slice(0,6).map((r: RacerState) => <TyreBar key={r.driver.code} racer={r} totalLaps={circuit.laps} />)}
        </Card>
        {simResult?.fastestLap?.driver && (
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <Chip icon="⏱" label="En Hızlı" value={`${fmtLap(simResult.fastestLap.time)} · ${simResult.fastestLap.driver} · T${simResult.fastestLap.lap}`} />
            {simResult.weather.rainLaps && <Chip icon="🌧" label="Yağmur" value={`T${simResult.weather.rainLaps[0]}–${simResult.weather.rainLaps[1]}`} />}
          </div>
        )}
      </div>
    </div>
  </>
}

// ═══════════════════════════════════════════
// AI TAHMİN TABI
// ═══════════════════════════════════════════
function AITab({ predictions, loading, metrics, onRerun }: { predictions: PredictionResult[]|null; loading: boolean; metrics: any; onRerun: () => void }) {
  return <>
    <div style={{ display:'flex', gap:10, marginBottom:16, alignItems:'center' }}>
      <h2 style={{ fontSize:'1.1rem', fontWeight:300 }}>AI Yarış Tahmini</h2>
      <Btn onClick={onRerun}>{loading ? '⏳ Yükleniyor...' : '🤖 Tahmin Yap'}</Btn>
      <Muted>OpenF1 API + 2023-2025 geçmiş verisi</Muted>
    </div>

    {loading && <div style={{ textAlign:'center', padding:40 }}><Muted>Model eğitiliyor ve tahmin yapılıyor...</Muted></div>}

    {predictions && !loading && (
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {/* Tahmin tablosu */}
        <Card title="Tahmin Edilen Sıralama">
          <div style={{ maxHeight:500, overflowY:'auto' }}>
            {predictions.map((p, i) => (
              <div key={p.driverCode} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 6px', borderRadius:6, background: i === 0 ? 'rgba(201,168,76,0.06)' : i < 3 ? 'rgba(26,71,42,0.03)' : 'transparent', marginBottom:1 }}>
                <span className="mono" style={{ width:24, fontSize:'.7rem', fontWeight:700, color: i < 3 ? '#c9a84c' : 'var(--muted)' }}>P{p.predictedPosition}</span>
                <span style={{ width:3, height:20, borderRadius:2, background:p.teamColor }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'.78rem', fontWeight: i === 0 ? 600 : 400 }}>{p.driverName}</div>
                  <div className="mono" style={{ fontSize:'.48rem', color:'var(--muted)' }}>{p.team}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div className="mono" style={{ fontSize:'.7rem', fontWeight:600, color: p.winProbability > 10 ? '#c9a84c' : 'var(--ink)' }}>{p.winProbability}%</div>
                  <div className="mono" style={{ fontSize:'.45rem', color:'var(--muted)' }}>kazanma</div>
                </div>
                <div style={{ textAlign:'right', width:40 }}>
                  <div className="mono" style={{ fontSize:'.6rem', color:'var(--muted)' }}>{p.podiumProbability}%</div>
                  <div className="mono" style={{ fontSize:'.4rem', color:'var(--muted)' }}>podyum</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Sağ panel: metrikler + faktörler */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {/* Model metrikleri */}
          {metrics && (
            <Card title="Model Performansı (Backtest 2025)">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <MetricBox label="Kazanan Doğruluğu" value={`${metrics.winnerAccuracy.toFixed(0)}%`} />
                <MetricBox label="Podyum Doğruluğu" value={`${metrics.podiumAccuracy.toFixed(0)}%`} />
                <MetricBox label="Top 10 Doğruluğu" value={`${metrics.top10Accuracy.toFixed(0)}%`} />
                <MetricBox label="Ort. Pozisyon Hatası" value={`±${metrics.avgPositionError.toFixed(1)}`} />
                <MetricBox label="Test Edilen Yarış" value={`${metrics.totalRaces}`} />
                <MetricBox label="Güven Seviyesi" value={predictions?.[0]?.confidence ? `${(predictions[0].confidence * 100).toFixed(0)}%` : '-'} />
              </div>
            </Card>
          )}

          {/* Faktör analizi — top 3 */}
          {predictions && predictions.length > 0 && (
            <Card title="Faktör Analizi · Top 3">
              {predictions.slice(0, 3).map(p => (
                <div key={p.driverCode} style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', gap:4, alignItems:'center', marginBottom:4 }}>
                    <span style={{ width:3, height:12, borderRadius:1, background:p.teamColor }} />
                    <span className="mono" style={{ fontSize:'.65rem', fontWeight:600 }}>{p.driverCode}</span>
                    <span className="mono" style={{ fontSize:'.5rem', color:'var(--muted)' }}>{p.team}</span>
                  </div>
                  <FactorBar label="Kvalifikasyon" value={p.factors.qualiPerformance} />
                  <FactorBar label="Son Form" value={p.factors.historicalForm} />
                  <FactorBar label="Takım Gücü" value={p.factors.teamStrength} />
                  <FactorBar label="Pist Uyumu" value={p.factors.circuitAffinity} />
                  <FactorBar label="Hava Adaptasyonu" value={p.factors.weatherAdaptation} />
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    )}

    {!predictions && !loading && (
      <div style={{ textAlign:'center', padding:60 }}>
        <div style={{ fontSize:'2rem', marginBottom:12 }}>🤖</div>
        <div style={{ fontSize:'.9rem', color:'var(--muted)' }}>AI tahmin motorunu başlatmak için yukarıdaki butona tıklayın</div>
        <div className="mono" style={{ fontSize:'.6rem', color:'var(--muted)', marginTop:8 }}>OpenF1 API'den 2023-2025 verileri çekilecek, model eğitilecek ve bu hafta sonu için tahmin yapılacak</div>
      </div>
    )}
  </>
}

// ═══════════════════════════════════════════
// PİST — BÜYÜK, OKUNAKLABILIR, PIT STOP
// ═══════════════════════════════════════════
const TRACK_PATH = "M80,200 C80,70 150,30 280,30 C410,30 450,100 530,100 C610,100 670,50 710,120 C750,190 700,220 610,210 C520,200 420,225 280,225 C150,225 80,270 80,200 Z"

function F1CarTop({ color }: { color: string }) {
  return <g>
    <rect x="-10" y="-3.5" width="20" height="7" rx="2.5" fill={color} />
    <rect x="8" y="-5.5" width="4" height="11" rx="1.2" fill={color} opacity=".7" />
    <rect x="-13" y="-5" width="3" height="10" rx=".8" fill={color} opacity=".6" />
    <ellipse cx="0" cy="0" rx="4" ry="2.2" fill="#111" opacity=".45" />
    <rect x="4" y="-6.5" width="4" height="2" rx=".7" fill="#1a1a1a" />
    <rect x="4" y="4.5" width="4" height="2" rx=".7" fill="#1a1a1a" />
    <rect x="-9" y="-6.5" width="4" height="2" rx=".7" fill="#1a1a1a" />
    <rect x="-9" y="4.5" width="4" height="2" rx=".7" fill="#1a1a1a" />
  </g>
}

function TrackView({ standings, pittingNow }: { standings: RacerState[]; pittingNow: RacerState[] }) {
  const top6 = standings.filter(r => !r.dnf).slice(0, 6)

  return (
    <svg viewBox="0 0 800 280" style={{ width:'100%', height:220 }}>
      {/* Pist yüzeyi */}
      <path d={TRACK_PATH} fill="none" stroke="var(--rule)" strokeWidth="32" strokeLinecap="round" opacity=".35" />
      <path d={TRACK_PATH} fill="none" stroke="var(--muted)" strokeWidth=".7" strokeDasharray="10,14" opacity=".2" />

      {/* Start/Finish çizgisi */}
      <line x1="80" y1="178" x2="80" y2="222" stroke="var(--muted)" strokeWidth="3" opacity=".3" />
      <text x="80" y="175" fontSize="7" fontFamily="'DM Mono',monospace" fill="var(--muted)" textAnchor="middle" opacity=".4">S/F</text>

      {/* PIT LANE alanı */}
      <rect x="580" y="240" width="180" height="30" rx="6" fill="var(--card-bg)" stroke="var(--rule)" strokeWidth="1" opacity=".8" />
      <text x="670" y="250" fontSize="7" fontFamily="'DM Mono',monospace" fill="var(--muted)" textAnchor="middle" fontWeight="600">PIT LANE</text>

      {/* Pit'te olan arabalar */}
      {pittingNow.map((r, i) => {
        const team = TEAMS[r.driver.team]
        return <g key={r.driver.code} transform={`translate(${600 + i * 30}, 260)`}>
          <g transform="scale(0.7)"><F1CarTop color={team?.color || '#888'} /></g>
          <text y="-8" fontSize="6" fontFamily="'DM Mono',monospace" fontWeight="700" fill={team?.color || '#888'} textAnchor="middle">{r.driver.code}</text>
        </g>
      })}

      {/* Pistteki arabalar */}
      {top6.map((r, i) => {
        const team = TEAMS[r.driver.team]
        const dur = 5 + i * 0.25
        const color = team?.color || '#888'
        return <g key={r.driver.code}>
          {/* Araba */}
          <g opacity={1 - i * 0.04}>
            <animateMotion dur={`${dur}s`} repeatCount="indefinite" path={TRACK_PATH} begin={`${i * 0.5}s`} rotate="auto" />
            <F1CarTop color={color} />
          </g>
          {/* Etiket — arabanın üstünde sabit boyut kutu */}
          <g>
            <animateMotion dur={`${dur}s`} repeatCount="indefinite" path={TRACK_PATH} begin={`${i * 0.5}s`} />
            <rect x="-18" y="-22" width="36" height="13" rx="3.5" fill={color} opacity=".9" />
            <text fontSize="8" fontFamily="'DM Mono',monospace" fontWeight="800" fill="#fff" textAnchor="middle" y="-13">{r.driver.code}</text>
          </g>
        </g>
      })}
    </svg>
  )
}

// ═══════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════
function DriverRow({ racer, index }: { racer: RacerState; index: number }) {
  const team = TEAMS[racer.driver.team]; const tyre = TYRES[racer.currentTyre]; const hp = Math.round(racer.tyreDeg * 100)
  return <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 5px', borderRadius:5, background: racer.dnf ? 'rgba(220,38,38,0.04)' : index===0 ? 'rgba(201,168,76,0.06)' : index<3 ? 'rgba(26,71,42,0.03)' : 'transparent', marginBottom:1, opacity: racer.dnf ? 0.3 : 1 }}>
    <span className="mono" style={{ width:26, fontSize:'.65rem', fontWeight:700, color: index<3 ? '#c9a84c' : 'var(--muted)', textAlign:'center' }}>{racer.dnf ? 'DNF' : `P${racer.position}`}</span>
    <span style={{ width:3, height:20, borderRadius:1, background:team?.color||'#888' }} />
    <svg width={15} height={7} viewBox="0 0 22 10" style={{ flexShrink:0 }}><rect x="1" y="2" width="16" height="6" rx="2" fill={team?.color||'#888'}/><rect x="15" y="0.5" width="3" height="9" rx="1" fill={team?.color||'#888'} opacity=".6"/><circle cx="5" cy="8.5" r="1.3" fill="#333"/><circle cx="15" cy="8.5" r="1.3" fill="#333"/></svg>
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{ fontSize:'.73rem', fontWeight: index===0 ? 600 : 400, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{racer.driver.name}</div>
      <div className="mono" style={{ fontSize:'.45rem', color:'var(--muted)' }}>{racer.driver.team}</div>
    </div>
    <span style={{ width:14, height:14, borderRadius:'50%', border:`2px solid ${tyre.color==='#FFFFFF'?'#999':tyre.color}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.38rem', fontWeight:800, color:tyre.color==='#FFFFFF'?'#999':tyre.color, fontFamily:"'DM Mono',monospace" }}>{racer.currentTyre[0].toUpperCase()}</span>
    <span className="mono" style={{ fontSize:'.4rem', color: hp<30 ? '#ef4444' : 'var(--muted)', width:22, textAlign:'center' }}>{hp}%</span>
    <span className="mono" style={{ fontSize:'.55rem', color:'var(--muted)', width:48, textAlign:'right' }}>{index===0?'':racer.dnf?'':`+${racer.gap.toFixed(1)}s`}</span>
    <span className="mono" style={{ fontSize:'.45rem', color:racer.pitStops>0?'#f59e0b':'var(--muted)', width:16, textAlign:'center', opacity:racer.pitStops>0?1:.3 }}>{racer.pitStops}P</span>
  </div>
}

function EventRow({ event }: { event: LapEvent }) {
  const driver = DRIVERS.find(d => d.code === event.driverCode)
  const team = driver ? TEAMS[driver.team] : null
  return <div style={{ display:'flex', gap:5, padding:'3px 4px', fontSize:'.65rem', borderBottom:'1px solid var(--rule)', alignItems:'center' }}>
    <span className="mono" style={{ color:'var(--accent)', width:24, fontSize:'.58rem', fontWeight:700 }}>T{event.lap}</span>
    <span className="mono" style={{ fontSize:'.48rem', padding:'1px 5px', borderRadius:3, background:evC(event.type), color:'#fff', fontWeight:700 }}>{evL(event.type)}</span>
    {team && <span style={{ width:3, height:10, borderRadius:1, background:team.color }} />}
    {driver && <span style={{ fontWeight:500, fontSize:'.6rem' }}>{driver.name}</span>}
    {driver && <span className="mono" style={{ fontSize:'.45rem', color:'var(--muted)' }}>({driver.team})</span>}
    <span style={{ color:'var(--muted)', fontSize:'.55rem', marginLeft:'auto' }}>{event.detail.replace(driver?.name||'','').trim()}</span>
  </div>
}

function TyreBar({ racer, totalLaps }: { racer: RacerState; totalLaps: number }) {
  const team = TEAMS[racer.driver.team]
  const stints: {s:number;e:number;c:string}[] = []
  if (racer.pitHistory.length===0) { stints.push({s:0,e:totalLaps,c:racer.currentTyre}) }
  else {
    stints.push({s:0,e:racer.pitHistory[0].lap,c:racer.position<=10?'soft':'medium'})
    racer.pitHistory.forEach((p,i) => { const ne = i<racer.pitHistory.length-1?racer.pitHistory[i+1].lap:totalLaps; stints.push({s:p.lap,e:ne,c:p.compound}) })
  }
  return <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:3 }}>
    <span style={{ width:3, height:10, borderRadius:1, background:team?.color||'#888' }} />
    <span className="mono" style={{ fontSize:'.5rem', width:24, fontWeight:600 }}>{racer.driver.code}</span>
    <div style={{ flex:1, height:10, background:'var(--rule)', borderRadius:2, display:'flex', overflow:'hidden', gap:.5 }}>
      {stints.map((s,i) => { const t = TYRES[s.c as keyof typeof TYRES]; const w = ((s.e-s.s)/totalLaps)*100; return <div key={i} style={{ width:`${w}%`, height:'100%', background:t?(t.color==='#FFFFFF'?'#ccc':t.color+'70'):'#888', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.35rem', fontFamily:"'DM Mono',monospace", fontWeight:700, color:t&&t.color!=='#FFFFFF'?'#fff':'#666' }} title={`${t?.name}: T${s.s}-${s.e}`}>{w>10?t?.name?.[0]:''}</div> })}
    </div>
    <span className="mono" style={{ fontSize:'.4rem', color:'#f59e0b', width:14 }}>{racer.pitStops}P</span>
  </div>
}

function FactorBar({ label, value }: { label: string; value: number }) {
  return <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:2 }}>
    <span className="mono" style={{ fontSize:'.45rem', color:'var(--muted)', width:65 }}>{label}</span>
    <div style={{ flex:1, height:5, background:'var(--rule)', borderRadius:2, overflow:'hidden' }}>
      <div style={{ width:`${value*100}%`, height:'100%', background:'var(--accent)', borderRadius:2, opacity:.7 }} />
    </div>
    <span className="mono" style={{ fontSize:'.4rem', width:20, textAlign:'right' }}>{(value*100).toFixed(0)}</span>
  </div>
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return <div style={{ background:'var(--dash-bg)', border:'1px solid var(--dash-border)', borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
    <div className="mono" style={{ fontSize:'.45rem', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.04em' }}>{label}</div>
    <div className="mono" style={{ fontSize:'.9rem', fontWeight:600, marginTop:2 }}>{value}</div>
  </div>
}

// Shared
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:12, padding:'10px 12px' }}>
    <h3 className="mono" style={{ fontSize:'.58rem', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>{title}</h3>
    {children}
  </div>
}
function Btn({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return <button onClick={onClick} style={{ background:active?'var(--accent)':'var(--card-bg)', border:`1px solid ${active?'var(--accent)':'var(--rule)'}`, borderRadius:7, padding:'5px 12px', fontFamily:"'DM Mono',monospace", fontSize:'.6rem', color:active?'#fff':'var(--ink)', cursor:'pointer', fontWeight:500 }}>{children}</button>
}
function TabBtn({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return <button onClick={onClick} style={{ background:active?'rgba(255,255,255,0.1)':'transparent', border:'none', padding:'5px 12px', fontFamily:"'DM Mono',monospace", fontSize:'.55rem', color:active?'#fff':'rgba(255,255,255,0.4)', cursor:'pointer', fontWeight:active?600:400 }}>{children}</button>
}
function Chip({ icon, label, value }: { icon: string; label: string; value: string }) {
  return <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:8, padding:'6px 10px', display:'flex', gap:6, alignItems:'center' }}>
    <span>{icon}</span><div><div className="mono" style={{ fontSize:'.42rem', color:'var(--muted)', textTransform:'uppercase' }}>{label}</div><div className="mono" style={{ fontSize:'.65rem', fontWeight:500 }}>{value}</div></div>
  </div>
}
function StatusDot({ status }: { status: string }) {
  const c: any = { connected:'#4ade80', connecting:'#fbbf24', offline:'#6b7280' }
  const l: any = { connected:'API Bağlı', connecting:'...', offline:'Çevrimdışı' }
  return <span style={{ display:'flex', alignItems:'center', gap:4, fontFamily:"'DM Mono',monospace", fontSize:'.55rem', color:c[status] }}><span style={{ width:5, height:5, borderRadius:'50%', background:c[status], animation:status==='connected'?'pd 2s infinite':'none' }}/>{l[status]}</span>
}
function Muted({ children }: { children: React.ReactNode }) { return <div className="mono" style={{ fontSize:'.6rem', color:'var(--muted)' }}>{children}</div> }

const selStyle: React.CSSProperties = { background:'var(--card-bg)', border:'1px solid var(--rule)', borderRadius:7, padding:'6px 10px', fontFamily:"'DM Mono',monospace", fontSize:'.65rem', color:'var(--ink)', cursor:'pointer' }
function evC(t: string) { const m: any = {pit:'#f59e0b',sc:'#ef4444',vsc:'#f97316',rain_start:'#6366f1',rain_end:'#22c55e',dnf:'#dc2626',fastest_lap:'#a855f7',overtake:'#3b82f6'}; return m[t]||'#6b7280' }
function evL(t: string) { const m: any = {pit:'PIT',sc:'SC',vsc:'VSC',rain_start:'🌧',rain_end:'☀',dnf:'DNF',fastest_lap:'FL',overtake:'OVT'}; return m[t]||'?' }
function fmtLap(s: number) { const m = Math.floor(s/60); return `${m}:${(s%60).toFixed(3).padStart(6,'0')}` }
