import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { TEAMS } from '../f1/data'
import { AUSTRALIA_2026_QUALI, AUSTRALIA_2026_RACE_RESULT, computeBacktest } from '../f1/realdata'
import { predictor } from '../f1/predictor'
import { openF1 } from '../f1/api'
import type { PredictionResult } from '../f1/types'

const SESSION_KEY = 11234
const TOTAL_LAPS = 58
const DN: Record<string, number> = {
  RUS:63,ANT:12,HAD:20,LEC:16,PIA:81,NOR:4,HAM:44,LAW:30,LIN:40,BOR:5,
  HUL:27,BEA:87,OCO:31,GAS:10,ALB:23,COL:43,ALO:14,PER:11,BOT:77,VER:1,SAI:55,STR:18
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.f1{background:#141420;min-height:100vh;color:#e0e0e8;font-family:'JetBrains Mono',monospace}
.f1 *{box-sizing:border-box}
.f1-card{background:#1a1a28;border:1px solid #2a2a3a;border-radius:14px;padding:18px 20px;animation:slideUp .4s ease both}
.f1-title{font-family:'Outfit',sans-serif;font-size:11px;color:#888;letter-spacing:.12em;font-weight:600;margin-bottom:12px;text-transform:uppercase}
.f1-row{display:flex;align-items:center;gap:6px;padding:6px 4px;border-bottom:1px solid rgba(255,255,255,.04)}
.f1-row:hover{background:rgba(225,6,0,.03);border-radius:6px}
.f1-btn{border:none;border-radius:8px;padding:8px 18px;font-size:12px;color:#fff;cursor:pointer;font-family:'Outfit',sans-serif;font-weight:600;display:flex;align-items:center;gap:6px}
`

export function F1Page() {
  const [preds, setPreds] = useState<PredictionResult[]|null>(null)
  const [mode, setMode] = useState<'predict'|'replay'>('predict')
  const [replayLap, setReplayLap] = useState(1)
  const [replayPlaying, setReplayPlaying] = useState(false)
  const [replaySpeed, setReplaySpeed] = useState(1)
  const [lapData, setLapData] = useState<any[]>([])
  const [posData, setPosData] = useState<any[]>([])
  const [intervalData, setIntervalData] = useState<any[]>([])
  const [stintData, setStintData] = useState<any[]>([])
  const [raceCtrl, setRaceCtrl] = useState<any[]>([])
  const [weatherData, setWeatherData] = useState<any>(null)
  const [drivers, setDrivers] = useState<any[]>([])
  const [log, setLog] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [races, setRaces] = useState<{key:number,name:string,country:string,date:string,hasData:boolean}[]>([])
  const [selectedRace, setSelectedRace] = useState(SESSION_KEY)
  const [trackPoints, setTrackPoints] = useState<{x:number,y:number}[]>([])
  const [carPositions, setCarPositions] = useState<Map<number,{x:number,y:number}>>(new Map())
  const [allLocationData, setAllLocationData] = useState<any[]>([])
  const replayRef = useRef<number|null>(null)

  // 2026 yarış listesini çek
  useEffect(() => {
    (async () => {
      try {
        const sessions = await openF1.getSessions({year: 2026, session_type: 'Race'})
        const raceList = sessions.map((s: any) => ({
          key: s.session_key,
          name: s.circuit_short_name || s.country_name,
          country: s.country_name,
          date: s.date_start?.slice(0,10) || '',
          hasData: new Date(s.date_start) <= new Date()
        }))
        setRaces(raceList)
      } catch { /* sessiz geç */ }
    })()
    const grid = AUSTRALIA_2026_QUALI.map(q => ({
      code:q.driverCode, name:q.driverName, team:q.team,
      teamColor:TEAMS[q.team]?.color||'#888', position:q.position,
      qualiDelta:(q.q3Time?pT(q.q3Time):q.q2Time?pT(q.q2Time):q.q1Time?pT(q.q1Time):83)-78.518
    }))
    setPreds(predictor.predictFromGrid(grid))
  }, [])

  const addLog = useCallback((msg: string) => {
    setLog(prev => [...prev.slice(-30), `[${nw()}] ${msg}`])
  }, [])

  const loadReplayData = useCallback(async () => {
    const sk = selectedRace
    setLoading(true)
    setLog([])
    addLog('📡 OpenF1 API bağlantısı kuruluyor...')
    addLog(`Session key: ${sk} (${races.find(r=>r.key===sk)?.name || 'Race'})`)
    try {
      addLog('→ Sürücü listesi çekiliyor...')
      const drv = await openF1.getDrivers(sk)
      setDrivers(drv)
      addLog(`✓ ${drv.length} sürücü yüklendi`)

      addLog('→ Tur verileri çekiliyor...')
      const laps = await openF1.getLaps(sk)
      setLapData(laps)
      addLog(`✓ ${laps.length} tur kaydı yüklendi`)

      addLog('→ Pozisyon verileri çekiliyor...')
      const pos = await openF1.getPositions(sk)
      setPosData(pos)
      addLog(`✓ ${pos.length} pozisyon kaydı yüklendi`)

      addLog('→ Gap verileri çekiliyor...')
      const intv = await openF1.getIntervals(sk)
      setIntervalData(intv)
      addLog(`✓ ${intv.length} interval kaydı yüklendi`)

      addLog('→ Lastik verileri çekiliyor...')
      const st = await openF1.getStints(sk)
      setStintData(st)
      addLog(`✓ ${st.length} stint kaydı yüklendi`)

      addLog('→ Race control mesajları çekiliyor...')
      const rc = await openF1.getRaceControl(sk)
      setRaceCtrl(rc)
      addLog(`✓ ${rc.length} race control mesajı yüklendi`)

      addLog('→ Hava durumu çekiliyor...')
      const w = await openF1.getWeather(sk)
      if (w.length > 0) setWeatherData(w[w.length-1])
      addLog(`✓ Hava durumu yüklendi`)

      // Pist koordinatları — ayrı try-catch (opsiyonel)
      try {
        addLog('→ Pist koordinatları çekiliyor (Russell 1 tur)...')
        const trackLoc = await openF1.getLocations(sk, 63)
        const tPts = trackLoc.slice(0, 400).map((l: any) => ({x: l.x, y: l.y}))
        setTrackPoints(tPts)
        addLog(`✓ ${tPts.length} pist noktası yüklendi`)
      } catch { addLog('⚠ Pist koordinatları alınamadı (opsiyonel)') }

      // Araç konumları — top 6 sürücü için ayrı ayrı çek
      try {
        addLog('→ Araç konum verileri çekiliyor (top 6)...')
        const topDrivers = [63,12,16,44,4,1] // RUS,ANT,LEC,HAM,NOR,VER
        const allLocs: any[] = []
        for (const dn of topDrivers) {
          const loc = await openF1.getLocations(sk, dn)
          allLocs.push(...loc)
          addLog(`  ✓ #${dn}: ${loc.length} konum`)
        }
        setAllLocationData(allLocs)
        addLog(`✓ Toplam ${allLocs.length} konum noktası yüklendi`)
      } catch { addLog('⚠ Konum verileri kısmi yüklendi') }

      addLog('🏁 Tüm veriler yüklendi! Replay başlatılabilir.')
      setMode('replay')
    } catch(e: any) {
      addLog(`❌ Hata: ${e.message}`)
    }
    setLoading(false)
  }, [addLog, selectedRace, races])

  useEffect(() => {
    if (!replayPlaying) { if(replayRef.current) clearInterval(replayRef.current); return }
    replayRef.current = window.setInterval(() => {
      setReplayLap(prev => {
        if (prev >= TOTAL_LAPS) { setReplayPlaying(false); return prev }
        return prev + 1
      })
    }, 2000 / replaySpeed)
    return () => { if(replayRef.current) clearInterval(replayRef.current) }
  }, [replayPlaying, replaySpeed])

  // Replay lap değiştiğinde araç pozisyonlarını güncelle
  useEffect(() => {
    if (allLocationData.length === 0 || lapData.length === 0) return
    // Bu tur için yaklaşık zaman aralığını hesapla
    const lapTimes = lapData.filter((l: any) => l.driver_number === 63 && l.lap_number <= replayLap)
    if (lapTimes.length === 0) return
    const lastLapEntry = lapTimes[lapTimes.length - 1]
    if (!lastLapEntry?.date_start) return
    const targetTime = new Date(lastLapEntry.date_start).getTime()
    // Her sürücü için bu zamana en yakın konumu bul
    const newPos = new Map<number, {x:number,y:number}>()
    const seen = new Set<number>()
    for (let i = allLocationData.length - 1; i >= 0; i--) {
      const loc = allLocationData[i]
      if (seen.has(loc.driver_number)) continue
      const locTime = new Date(loc.date).getTime()
      if (locTime <= targetTime + 5000) {
        newPos.set(loc.driver_number, {x: loc.x, y: loc.y})
        seen.add(loc.driver_number)
      }
    }
    setCarPositions(newPos)
  }, [replayLap, allLocationData, lapData])

  const currentStandings = useMemo(() => {
    if (posData.length === 0 || lapData.length === 0) return []
    const latestPos = new Map<number, number>()
    const latestGap = new Map<number, number>()
    const latestLapTime = new Map<number, number>()
    const lapTimes = new Map<number, number[]>()
    for (const p of posData) latestPos.set(p.driver_number, p.position)
    for (const l of lapData) {
      if (l.lap_number <= replayLap && l.lap_duration && l.lap_duration > 0) {
        latestLapTime.set(l.driver_number, l.lap_duration)
        const arr = lapTimes.get(l.driver_number) || []
        arr.push(l.lap_duration)
        lapTimes.set(l.driver_number, arr)
      }
    }
    for (const iv of intervalData) latestGap.set(iv.driver_number, iv.gap_to_leader || 0)
    return drivers.map((d: any) => ({
      number: d.driver_number, code: d.name_acronym, name: d.full_name,
      team: d.team_name, color: '#' + (d.team_colour || '888'),
      position: latestPos.get(d.driver_number) || 99,
      gap: latestGap.get(d.driver_number) || 0,
      lastLap: latestLapTime.get(d.driver_number) || 0,
      stint: (() => { const s = stintData.filter((s: any) => s.driver_number === d.driver_number); return s.length > 0 ? s[s.length-1] : null })(),
    })).sort((a: any, b: any) => a.position - b.position)
  }, [posData, lapData, intervalData, stintData, drivers, replayLap])

  const backtest = useMemo(() => preds ? computeBacktest(preds) : null, [preds])

  return (
    <div className="f1">
      <style>{CSS}</style>
      <header style={{background:'rgba(20,20,32,.97)',backdropFilter:'blur(12px)',padding:'10px 0',borderBottom:'2px solid #e10600',position:'sticky',top:0,zIndex:50}}>
        <div style={{maxWidth:1280,margin:'0 auto',padding:'0 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <a href="/" style={{color:'#666',textDecoration:'none',fontSize:13,width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid #2a2a3a',borderRadius:8}}>←</a>
            <div>
              <span style={{fontFamily:"'Outfit',sans-serif",fontSize:18,fontWeight:800,color:'#fff'}}>F1</span>
              <span style={{fontFamily:"'Outfit',sans-serif",fontSize:18,fontWeight:800,color:'#e10600',marginLeft:4}}>PREDICTOR</span>
              {races.length > 0 ? <select value={selectedRace} onChange={e => setSelectedRace(Number(e.target.value))} style={{marginLeft:10,background:'#1e1e30',border:'1px solid #2a2a3a',borderRadius:6,color:'#ccc',padding:'3px 8px',fontSize:10,fontFamily:"'Outfit',sans-serif",cursor:'pointer'}}>
                {races.map(r => <option key={r.key} value={r.key} disabled={!r.hasData}>{r.name} {r.date} {r.hasData ? '' : '(veri yok)'}</option>)}
              </select> : <span style={{fontSize:10,color:'#555',marginLeft:10}}>2026 Season</span>}
            </div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {weatherData && <span style={{fontSize:10,color:'#666'}}>☀ {weatherData.air_temperature?.toFixed(0)}° · Track {weatherData.track_temperature?.toFixed(0)}°</span>}
            {mode === 'replay' && <span style={{background:'#e10600',padding:'3px 10px',borderRadius:5,fontSize:12,fontWeight:700,color:'#fff'}}>LAP {replayLap}/{TOTAL_LAPS}</span>}
            <div style={{display:'flex',gap:4}}>
              <button className="f1-btn" onClick={() => setMode('predict')} style={{background:mode==='predict'?'#e10600':'#1e1e30',fontSize:11,padding:'6px 14px'}}>🎯 Tahmin</button>
              <button className="f1-btn" onClick={loadReplayData} style={{background:mode==='replay'?'#e10600':'#1e1e30',fontSize:11,padding:'6px 14px',opacity:loading?0.5:1}}>
                {loading ? '⏳ Yükleniyor...' : '🔄 Replay'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div style={{maxWidth:1280,margin:'0 auto',padding:'16px 20px'}}>
        <div style={{display:'flex',gap:12,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
          <div style={{flex:1,minWidth:200}}>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:22,fontWeight:800,color:'#fff'}}>Australian Grand Prix</div>
            <div style={{fontSize:11,color:'#555'}}>Albert Park · 58 Laps · 5.278 km · Melbourne</div>
          </div>
          {preds?.[0] && <div style={{padding:'8px 16px',background:'rgba(212,168,67,.08)',border:'1px solid rgba(212,168,67,.2)',borderRadius:10}}>
            <span style={{fontSize:9,color:'#997a2e',fontFamily:"'Outfit',sans-serif",fontWeight:600}}>AI TAHMİN: </span>
            <span style={{fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:800,color:'#d4a843'}}>{preds[0].driverName}</span>
            <span style={{fontSize:11,color:'#997a2e',marginLeft:6}}>P1 · {preds[0].winProbability}%</span>
          </div>}
          {backtest && <div style={{display:'flex',gap:12}}>
            <Stat label="Winner" value={backtest.winnerCorrect ? '✓' : '✗'} color={backtest.winnerCorrect ? '#4ade80' : '#ef4444'}/>
            <Stat label="Podium" value={`${backtest.podiumHits}/3`} color="#d4a843"/>
            <Stat label="MAE" value={backtest.mae.toFixed(1)} color={backtest.mae < 3 ? '#4ade80' : '#fbbf24'}/>
          </div>}
        </div>

        {mode === 'predict' && <>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <div className="f1-card">
              <div className="f1-title">QUALIFYING GRID · AI TAHMİN</div>
              <div style={{maxHeight:500,overflowY:'auto'}}>
                {AUSTRALIA_2026_QUALI.map((q, i) => {
                  const tm = TEAMS[q.team]; const pr = preds?.find(p => p.driverCode === q.driverCode)
                  const actual = AUSTRALIA_2026_RACE_RESULT.find(r => r.code === q.driverCode)
                  const isDNF = actual?.status === 'dnf' || actual?.status === 'dns'
                  return <div key={q.driverCode} className="f1-row" style={{opacity: isDNF ? 0.35 : 1}}>
                    <span style={{width:24,fontFamily:"'Outfit',sans-serif",fontWeight:800,color:i<3?'#d4a843':i<10?'#ccc':'#555',fontSize:14}}>{q.position}</span>
                    <div style={{width:3,height:20,borderRadius:2,background:tm?.color||'#444'}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:"'Outfit',sans-serif",fontWeight:i<3?700:500,color:i<10?'#f0f0f0':'#888',fontSize:13}}>{q.driverName}</div>
                      <div style={{fontSize:9,color:'#555'}}>{q.team}</div>
                    </div>
                    <span style={{fontSize:11,color:'#666',width:70,textAlign:'right'}}>{q.q3Time||q.q2Time||q.q1Time||'—'}</span>
                    <span style={{width:40,textAlign:'center',fontWeight:700,fontFamily:"'Outfit',sans-serif",color:pr && pr.predictedPosition<=3?'#d4a843':'#888',fontSize:12}}>P{pr?.predictedPosition||'—'}</span>
                    <span style={{width:36,textAlign:'right',fontSize:10,color:pr && pr.winProbability > 10 ? '#fbbf24' : '#444'}}>{pr ? `${pr.winProbability}%` : ''}</span>
                  </div>
                })}
              </div>
            </div>
            <div className="f1-card">
              <div className="f1-title">🏁 YARIŞ SONUCU vs TAHMİN</div>
              <div style={{maxHeight:500,overflowY:'auto'}}>
                {AUSTRALIA_2026_RACE_RESULT.map((r, i) => {
                  const d = backtest?.details.find(x => x.code === r.code)
                  const tm = TEAMS[r.team]; const isDNF = r.status === 'dnf' || r.status === 'dns'
                  return <div key={r.code} className="f1-row" style={{opacity: isDNF ? 0.3 : 1}}>
                    <span style={{width:36,fontFamily:"'Outfit',sans-serif",fontWeight:800,color:isDNF?'#ef4444':i<3?'#d4a843':i<10?'#ccc':'#555',fontSize:13}}>{isDNF ? r.status.toUpperCase() : `P${r.pos}`}</span>
                    <div style={{width:3,height:18,borderRadius:2,background:tm?.color||'#333'}}/>
                    <span style={{flex:1,fontFamily:"'Outfit',sans-serif",fontWeight:i<3?700:500,color:isDNF?'#555':i<10?'#f0f0f0':'#999',fontSize:12}}>{r.name}</span>
                    <span style={{width:36,textAlign:'center',fontWeight:700,color:d&&d.err===0?'#4ade80':d&&d.err<=2?'#fbbf24':'#888',fontSize:12}}>{d?`P${d.pred}`:'—'}</span>
                    <span style={{width:30,textAlign:'center',fontSize:11,fontWeight:700,color:d&&d.err===0?'#4ade80':d&&d.err<=2?'#fbbf24':'#ef4444'}}>{d?(d.err===0?'✓':`±${d.err}`):''}</span>
                  </div>
                })}
              </div>
              <div style={{marginTop:10,fontSize:9,color:'#444'}}>⚠ Fair backtest — model yarış sonuçlarını görmeden tahmin yaptı.</div>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginTop:14}}>
            <div className="f1-card">
              <div className="f1-title">MODEL BİLGİSİ</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,fontSize:11}}>
                <div><span style={{color:'#666'}}>Ensemble:</span> <span style={{color:'#ddd'}}>Ridge 40% + GB 60%</span></div>
                <div><span style={{color:'#666'}}>ELO:</span> <span style={{color:'#ddd'}}>Driver + Team dynamic</span></div>
                <div><span style={{color:'#666'}}>Features:</span> <span style={{color:'#ddd'}}>14 · Temporal 2025×3</span></div>
                <div><span style={{color:'#666'}}>Recovery:</span> <span style={{color:'#ddd'}}>ELO-grid gap {'>'} 8 → bonus</span></div>
                <div><span style={{color:'#666'}}>Veri:</span> <span style={{color:'#ddd'}}>{predictor.dataCount} sample</span></div>
                <div><span style={{color:'#666'}}>API:</span> <span style={{color:'#ddd'}}>OpenF1 · 3 req/s</span></div>
              </div>
              <div style={{marginTop:12,fontSize:10,color:'#555'}}>
                ▶ REPLAY: Avustralya GP'yi gerçek OpenF1 telemetri verileriyle tur tur izle
              </div>
            </div>
            <div className="f1-card">
              <div className="f1-title">NEDEN BU SIRA?</div>
              {preds?.slice(0,5).map(p => {
                const qP = Math.round(p.factors.qualiPerformance * 100)
                const fP = Math.round(p.factors.historicalForm * 100)
                const tP = Math.round(p.factors.teamStrength * 100)
                return <div key={p.driverCode} style={{marginBottom:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:3}}>
                    <div style={{width:3,height:12,borderRadius:2,background:p.teamColor}}/>
                    <span style={{fontSize:12,fontWeight:700,color:'#eee',fontFamily:"'Outfit',sans-serif"}}>{p.driverCode}</span>
                    <span style={{fontSize:10,color:'#d4a843',marginLeft:'auto',fontWeight:700}}>P{p.predictedPosition}</span>
                  </div>
                  <MiniBar label="Sıralama" value={qP} tip={qP>70?'Ön sıra':qP>40?'Orta':'Arka'}/>
                  <MiniBar label="Form" value={fP} tip={fP>70?'Podyum formu':fP>40?'Puan bölgesi':'Zayıf'}/>
                  <MiniBar label="Takım" value={tP} tip={p.team}/>
                </div>
              })}
            </div>
          </div>
        </>}

        {mode === 'replay' && <>
          <div className="f1-card" style={{marginBottom:14,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
            <button className="f1-btn" onClick={() => setReplayPlaying(!replayPlaying)} style={{background:replayPlaying?'#ef4444':'#22c55e',padding:'8px 20px'}}>
              {replayPlaying ? '⏸ Durdur' : '▶ Oynat'}
            </button>
            <button className="f1-btn" onClick={() => setReplayLap(Math.max(1, replayLap-1))} style={{background:'#2a2a3a'}}>⏪</button>
            <button className="f1-btn" onClick={() => setReplayLap(Math.min(TOTAL_LAPS, replayLap+1))} style={{background:'#2a2a3a'}}>⏩</button>
            <div style={{display:'flex',gap:4}}>
              {[0.5,1,2,4].map(s => (
                <button key={s} className="f1-btn" onClick={() => setReplaySpeed(s)} style={{background:replaySpeed===s?'#e10600':'#2a2a3a',padding:'6px 10px',fontSize:10}}>{s}x</button>
              ))}
            </div>
            <input type="range" min={1} max={TOTAL_LAPS} value={replayLap} onChange={e => setReplayLap(Number(e.target.value))} style={{flex:1,minWidth:200,accentColor:'#e10600'}}/>
            <span style={{fontSize:14,fontWeight:700,color:'#fff',fontFamily:"'Outfit',sans-serif"}}>LAP {replayLap}/{TOTAL_LAPS}</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1.2fr 0.8fr',gap:14}}>
            {/* TRACK MAP */}
            <div className="f1-card">
              <div className="f1-title">TRACK MAP · LAP {replayLap}</div>
              <TrackMap trackPoints={trackPoints} carPositions={carPositions} drivers={drivers} standings={currentStandings} stintData={stintData}/>
            </div>

            <div className="f1-card">
              <div className="f1-title">LEADERBOARD · LAP {replayLap}</div>
              <div style={{maxHeight:500,overflowY:'auto'}}>
                {currentStandings.slice(0,20).map((d: any, i: number) => (
                  <div key={d.number} className="f1-row">
                    <span style={{width:24,fontFamily:"'Outfit',sans-serif",fontWeight:800,color:i<3?'#d4a843':i<10?'#ccc':'#555',fontSize:14}}>{i+1}</span>
                    <div style={{width:3,height:20,borderRadius:2,background:d.color}}/>
                    <div style={{flex:1}}>
                      <span style={{fontFamily:"'Outfit',sans-serif",fontWeight:i<3?700:500,color:i<10?'#f0f0f0':'#888',fontSize:13}}>{d.code}</span>
                      <span style={{fontSize:9,color:'#555',marginLeft:8}}>{d.team}</span>
                    </div>
                    <span style={{fontSize:10,color:'#666',width:50,textAlign:'right'}}>{d.gap>0?`+${d.gap.toFixed(1)}s`:'LEADER'}</span>
                    <span style={{fontSize:10,color:d.lastLap>0&&d.lastLap<82?'#a855f7':'#555',width:55,textAlign:'right'}}>{d.lastLap>0?d.lastLap.toFixed(3):'—'}</span>
                    {d.stint && <span style={{padding:'2px 6px',borderRadius:3,fontSize:9,fontWeight:700,
                      background:d.stint.compound==='SOFT'?'#dc2626':d.stint.compound==='MEDIUM'?'#eab308':'#e5e5e5',
                      color:d.stint.compound==='HARD'||d.stint.compound==='MEDIUM'?'#000':'#fff'
                    }}>{d.stint.compound?.[0]||'?'}</span>}
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div className="f1-card" style={{flex:1}}>
                <div className="f1-title">RACE CONTROL</div>
                <div style={{maxHeight:200,overflowY:'auto'}}>
                  {raceCtrl.length===0?<div style={{color:'#444',fontSize:11}}>Veri yüklenmedi</div>:
                    [...raceCtrl].reverse().slice(0,8).map((rc: any, i: number) => (
                      <div key={i} style={{display:'flex',gap:6,padding:'4px 0',borderBottom:'1px solid #1e1e30',fontSize:10}}>
                        <span style={{padding:'2px 6px',borderRadius:3,fontWeight:700,fontSize:8,flexShrink:0,
                          background:rc.flag==='GREEN'?'#166534':rc.flag==='YELLOW'?'#854d0e':rc.flag==='RED'?'#991b1b':'#2a2a3a',color:'#fff'
                        }}>{rc.flag||'INFO'}</span>
                        <span style={{color:'#999'}}>{rc.message?.slice(0,80)}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
              <div className="f1-card" style={{flex:1}}>
                <div className="f1-title">API LOG</div>
                <div style={{maxHeight:200,overflowY:'auto',fontSize:10}}>
                  {log.length===0?<div style={{color:'#444'}}>REPLAY butonuna tıkla</div>:
                    [...log].reverse().map((l, i) => (
                      <div key={i} style={{color:l.includes('✓')?'#4ade80':l.includes('❌')?'#ef4444':l.includes('→')?'#3b82f6':'#666',padding:'2px 0',borderBottom:'1px solid #1a1a28'}}>{l}</div>
                    ))
                  }
                </div>
              </div>
            </div>
          </div>
        </>}
      </div>
    </div>
  )
}

function Stat({label,value,color}:{label:string;value:string;color:string}) {
  return <div style={{textAlign:'center',padding:'4px 10px'}}>
    <div style={{fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:800,color}}>{value}</div>
    <div style={{fontSize:9,color:'#555'}}>{label}</div>
  </div>
}

function MiniBar({label,value,tip}:{label:string;value:number;tip:string}) {
  const c = value>70?'#22c55e':value>40?'#fbbf24':'#ef4444'
  return <div style={{marginBottom:2}}>
    <div style={{display:'flex',alignItems:'center',gap:4}}>
      <span style={{fontSize:9,color:'#666',width:50,fontFamily:"'Outfit',sans-serif"}}>{label}</span>
      <div style={{flex:1,height:4,background:'#1e1e30',borderRadius:2,overflow:'hidden'}}><div style={{width:`${value}%`,height:'100%',background:c,borderRadius:2}}/></div>
      <span style={{fontSize:9,color:c,fontWeight:600,width:28,textAlign:'right'}}>{value}%</span>
    </div>
    <div style={{fontSize:8,color:'#444',marginLeft:54}}>{tip}</div>
  </div>
}

function nw(){return new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
function pT(t:string):number{const[m,s]=t.split(':');return Number(m)*60+Number(s)}

// ═══ TRACK MAP COMPONENT ═══
function TrackMap({trackPoints, carPositions, drivers, standings, stintData}: {
  trackPoints: {x:number,y:number}[],
  carPositions: Map<number,{x:number,y:number}>,
  drivers: any[],
  standings: any[],
  stintData: any[]
}) {
  if (trackPoints.length === 0) return <div style={{color:'#444',textAlign:'center',padding:40,fontSize:12}}>Pist verileri yükleniyor...</div>

  // Pist sınırlarını hesapla
  const xs = trackPoints.map(p=>p.x), ys = trackPoints.map(p=>p.y)
  const xMin = Math.min(...xs), xMax = Math.max(...xs)
  const yMin = Math.min(...ys), yMax = Math.max(...ys)
  const W = 600, H = 400, PAD = 30

  const toSVG = (x: number, y: number) => ({
    sx: PAD + ((x - xMin) / (xMax - xMin)) * (W - 2*PAD),
    sy: PAD + ((y - yMin) / (yMax - yMin)) * (H - 2*PAD)
  })

  // Pist yolu
  const trackPath = trackPoints.map((p, i) => {
    const {sx, sy} = toSVG(p.x, p.y)
    return (i === 0 ? 'M' : 'L') + sx.toFixed(1) + ',' + sy.toFixed(1)
  }).join(' ')

  // Pit lane (yaklaşık — start/finish hattını iştle)
  const pitDrivers = new Set<number>()
  stintData.forEach((s: any) => {
    if (s.tyre_age_at_start === 0) pitDrivers.add(s.driver_number)
  })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:'auto',background:'#12121e',borderRadius:10}}>
      {/* Pist arka plan */}
      <path d={trackPath + ' Z'} fill="none" stroke="#2a2a3a" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Pist ön plan */}
      <path d={trackPath + ' Z'} fill="none" stroke="#3a3a4a" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Pist orta çizgi */}
      <path d={trackPath + ' Z'} fill="none" stroke="#4a4a5a" strokeWidth="1" strokeDasharray="4,8" opacity="0.5"/>

      {/* Start/Finish çizgi */}
      {trackPoints.length > 0 && (() => {
        const {sx, sy} = toSVG(trackPoints[0].x, trackPoints[0].y)
        return <>
          <line x1={sx-8} y1={sy-8} x2={sx+8} y2={sy+8} stroke="#fff" strokeWidth="2" opacity="0.6"/>
          <text x={sx+10} y={sy-4} fill="#666" fontSize="8" fontFamily="Outfit,sans-serif">S/F</text>
        </>
      })()}

      {/* Araçlar pist üzerinde */}
      {[...carPositions.entries()].map(([driverNum, pos]) => {
        const {sx, sy} = toSVG(pos.x, pos.y)
        const driver = drivers.find((d: any) => d.driver_number === driverNum)
        if (!driver) return null
        const color = '#' + (driver.team_colour || '888')
        const code = driver.name_acronym || '?'
        const standing = standings.find((s: any) => s.number === driverNum)
        const position = standing?.position || 99
        const inPit = pos.x === 0 && pos.y === 0

        if (inPit) return null // Pit'te olanı gösterme

        return <g key={driverNum}>
          {/* Araba noktası */}
          <circle cx={sx} cy={sy} r={position <= 3 ? 6 : 4} fill={color} stroke="#000" strokeWidth="1"/>
          {/* İsim etiketi */}
          <text x={sx + 8} y={sy + 3} fill="#ddd" fontSize="7" fontFamily="Outfit,sans-serif" fontWeight={position<=3?'700':'400'}>
            {code}
          </text>
          {/* Pozisyon numarası */}
          {position <= 5 && <text x={sx} y={sy + 2.5} fill="#000" fontSize="5" fontFamily="Outfit,sans-serif" fontWeight="800" textAnchor="middle">
            {position}
          </text>}
        </g>
      })}

      {/* Legend */}
      <text x={W-80} y={H-10} fill="#555" fontSize="7" fontFamily="Outfit,sans-serif">
        {carPositions.size} araç pistte
      </text>
    </svg>
  )
}
