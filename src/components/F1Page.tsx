import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { TEAMS } from '../f1/data'
import { AUSTRALIA_2026_QUALI, AUSTRALIA_2026_RACE_RESULT, computeBacktest } from '../f1/realdata'
import { predictor } from '../f1/predictor'
import { openF1 } from '../f1/api'
import { TRACK_COORDS, CIRCUIT_MAP } from '../f1/trackData'
import type { PredictionResult } from '../f1/types'

const SESSION_KEY = 11234
const TOTAL_LAPS = 58

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
@keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.f1{background:#141420;min-height:100vh;color:#e0e0e8;font-family:'JetBrains Mono',monospace}
.f1 *{box-sizing:border-box}
.f1-card{background:#1a1a28;border:1px solid #2a2a3a;border-radius:12px;padding:14px 16px;animation:slideUp .4s ease both}
.f1-title{font-family:'Outfit',sans-serif;font-size:10px;color:#777;letter-spacing:.12em;font-weight:600;margin-bottom:10px;text-transform:uppercase}
.f1-row{display:flex;align-items:center;gap:6px;padding:5px 4px;border-bottom:1px solid rgba(255,255,255,.03)}
.f1-row:hover{background:rgba(255,255,255,.02)}
.f1-btn{border:none;border-radius:8px;padding:7px 16px;font-size:11px;color:#fff;cursor:pointer;font-family:'Outfit',sans-serif;font-weight:600;display:flex;align-items:center;gap:5px}
`

export function F1Page() {
  const [preds, setPreds] = useState<PredictionResult[]|null>(null)
  const [mode, setMode] = useState<'predict'|'replay'>('predict')
  const [replayLap, setReplayLap] = useState(1)
  const [replayPlaying, setReplayPlaying] = useState(false)
  const [replaySpeed, setReplaySpeed] = useState(1)
  const [raceStartTime, setRaceStartTime] = useState(0) // yarış başlangıç ms
  const [raceEndTime, setRaceEndTime] = useState(0)
  const [replayTime, setReplayTime] = useState(0) // mevcut replay zamanı ms
  const [lapData, setLapData] = useState<any[]>([])
  const [posData, setPosData] = useState<any[]>([])
  const [intervalData, setIntervalData] = useState<any[]>([])
  const [stintData, setStintData] = useState<any[]>([])
  const [raceCtrl, setRaceCtrl] = useState<any[]>([])
  const [weatherData, setWeatherData] = useState<any>(null)
  const [drivers, setDrivers] = useState<any[]>([])
  const [log, setLog] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [races, setRaces] = useState<{key:number,name:string,circuit:string,date:string,hasData:boolean}[]>([])
  const [selectedRace, setSelectedRace] = useState(SESSION_KEY)
  const [carPositions, setCarPositions] = useState<Map<number,{x:number,y:number}>>(new Map())
  const [allLocationData, setAllLocationData] = useState<any[]>([])
  const [livePreds, setLivePreds] = useState<PredictionResult[]|null>(null)
  const replayRef = useRef<number|null>(null)

  // Seçilen yarış değişince qualifying'den tahmin üret
  useEffect(() => {
    if (selectedRace === SESSION_KEY) return
    (async () => {
      try {
        const race = races.find(r => r.key === selectedRace)
        if (!race?.hasData) return
        const allS = await openF1.getSessions({year: 2026})
        const qSess = allS.find((s:any) => s.session_type==='Qualifying' && Math.abs(new Date(s.date_start||'').getTime()-new Date(race.date).getTime())<3*86400000)
        if (!qSess) return
        const [laps, drvs] = await Promise.all([openF1.getLaps(qSess.session_key), openF1.getDrivers(qSess.session_key)])
        const best = new Map<number,number>()
        for (const l of laps) { if (l.lap_duration>0) { const c=best.get(l.driver_number)||Infinity; if(l.lap_duration<c) best.set(l.driver_number,l.lap_duration) } }
        const pole = Math.min(...best.values())
        const grid = [...best.entries()].sort((a,b)=>a[1]-b[1]).map(([dn,t],i) => {
          const d=drvs.find((x:any)=>x.driver_number===dn)
          return {code:d?.name_acronym||'?',name:d?.full_name||'?',team:d?.team_name||'?',teamColor:'#'+(d?.team_colour||'888'),position:i+1,qualiDelta:t-pole}
        })
        if (grid.length>0) setPreds(predictor.predictFromGrid(grid))
      } catch {}
    })()
  }, [selectedRace, races])

  useEffect(() => {
    (async () => {
      try {
        const sessions = await openF1.getSessions({year: 2026, session_type: 'Race'})
        setRaces(sessions.map((s: any) => ({
          key: s.session_key, name: s.country_name,
          circuit: s.circuit_short_name || s.country_name,
          date: s.date_start?.slice(0,10) || '',
          hasData: new Date(s.date_start) <= new Date()
        })))
      } catch {}
    })()
    const grid = AUSTRALIA_2026_QUALI.map(q => ({
      code:q.driverCode, name:q.driverName, team:q.team,
      teamColor:TEAMS[q.team]?.color||'#888', position:q.position,
      qualiDelta:(q.q3Time?pT(q.q3Time):q.q2Time?pT(q.q2Time):q.q1Time?pT(q.q1Time):83)-78.518
    }))
    setPreds(predictor.predictFromGrid(grid))
  }, [])

  const addLog = useCallback((msg: string) => {
    setLog(prev => [...prev.slice(-40), `[${nw()}] ${msg}`])
  }, [])

  const loadReplayData = useCallback(async () => {
    const sk = selectedRace
    setLoading(true); setLog([])
    addLog('📡 OpenF1 API...')
    try {
      const [drv, laps, pos, intv, st, rc, w] = await Promise.all([
        openF1.getDrivers(sk), openF1.getLaps(sk), openF1.getPositions(sk),
        openF1.getIntervals(sk), openF1.getStints(sk), openF1.getRaceControl(sk), openF1.getWeather(sk)
      ])
      setDrivers(drv); setLapData(laps); setPosData(pos)
      setIntervalData(intv); setStintData(st); setRaceCtrl(rc)
      if (w.length > 0) setWeatherData(w[w.length-1])
      addLog(`✓ ${drv.length} sürücü · ${laps.length} tur · ${pos.length} pozisyon`)
      addLog(`✓ ${intv.length} interval · ${st.length} stint · ${rc.length} race ctrl`)
      try {
        // TÜM sürücülerin konum verisini çek (3'erli batch, rate limit için)
        const allNums = drv.map((d:any) => d.driver_number)
        const allLocs: any[] = []
        for (let i = 0; i < allNums.length; i += 3) {
          const batch = allNums.slice(i, i+3)
          const results = await Promise.all(batch.map((dn:number) => openF1.getLocations(sk, dn).catch(() => [])))
          allLocs.push(...results.flat())
          addLog(`  ✓ ${i+batch.length}/${allNums.length} sürücü konum`)
        }
        setAllLocationData(allLocs)
        addLog(`✓ ${allLocs.length} toplam konum`)
      } catch { addLog('⚠ Konum kısmi') }
      // Yarış zaman aralığını hesapla
      const firstLap = laps.find((l:any) => l.driver_number===63 && l.lap_number===1)
      const lastLap = [...laps].reverse().find((l:any) => l.driver_number===63 && l.lap_duration>0)
      if (firstLap?.date_start) {
        const st = new Date(firstLap.date_start).getTime()
        const en = lastLap?.date_start ? new Date(lastLap.date_start).getTime() + 90000 : st + 5400000
        setRaceStartTime(st); setRaceEndTime(en); setReplayTime(st)
        addLog(`✓ Yarış: ${new Date(st).toISOString().slice(11,19)} → ${new Date(en).toISOString().slice(11,19)}`)
      }
      addLog('🏁 Veriler yüklendi!')
      setMode('replay'); setReplayLap(1)
    } catch(e: any) { addLog(`❌ ${e.message}`) }
    setLoading(false)
  }, [addLog, selectedRace])

  // Zaman bazlı replay timer — her 200ms'de replayTime ilerler
  useEffect(() => {
    if (!replayPlaying) { if(replayRef.current) clearInterval(replayRef.current); return }
    const TICK = 200 // ms aralık
    const TIME_STEP = TICK * replaySpeed * 10 // 1x'te 2 saniye/tick, 4x'te 8 saniye/tick
    replayRef.current = window.setInterval(() => {
      setReplayTime(prev => {
        const next = prev + TIME_STEP
        if (next >= raceEndTime) { setReplayPlaying(false); return raceEndTime }
        return next
      })
    }, TICK)
    return () => { if(replayRef.current) clearInterval(replayRef.current) }
  }, [replayPlaying, replaySpeed, raceEndTime])

  // replayTime değiştiğinde lap numarasını güncelle
  useEffect(() => {
    if (lapData.length === 0 || replayTime === 0) return
    const rusLaps = lapData.filter((l:any) => l.driver_number===63 && l.date_start)
    let currentLap = 1
    for (const l of rusLaps) {
      if (new Date(l.date_start).getTime() <= replayTime) currentLap = l.lap_number
    }
    setReplayLap(currentLap)
  }, [replayTime, lapData])

  // Araç pozisyonlarını ZAMAN bazlı güncelle (akıcı hareket)
  useEffect(() => {
    if (allLocationData.length === 0 || replayTime === 0) return
    const newPos = new Map<number,{x:number,y:number}>()
    const seen = new Set<number>()
    // Sondan başa tara — her sürücü için replayTime'a en yakın önceki konumu bul
    for (let i = allLocationData.length-1; i >= 0; i--) {
      const loc = allLocationData[i]
      if (seen.has(loc.driver_number)) continue
      if (new Date(loc.date).getTime() <= replayTime) {
        newPos.set(loc.driver_number, {x:loc.x, y:loc.y}); seen.add(loc.driver_number)
      }
    }
    setCarPositions(newPos)
  }, [replayTime, allLocationData])

  const currentStandings = useMemo(() => {
    if (posData.length===0 || lapData.length===0) return []
    const rusLaps = lapData.filter((l:any)=>l.driver_number===63&&l.lap_number<=replayLap)
    const refTime = rusLaps.length>0 ? new Date(rusLaps[rusLaps.length-1].date_start||'').getTime() : 0
    const lPos = new Map<number,number>(), lGap = new Map<number,number>(), lLap = new Map<number,number>()
    for (const p of posData) { if (new Date(p.date||'').getTime()<=refTime+10000) lPos.set(p.driver_number,p.position) }
    for (const iv of intervalData) { if (new Date(iv.date||'').getTime()<=refTime+10000) lGap.set(iv.driver_number,iv.gap_to_leader??0) }
    for (const l of lapData) { if (l.lap_number<=replayLap && l.lap_duration>0) lLap.set(l.driver_number,l.lap_duration) }
    const getStint = (dn:number) => { const s = stintData.filter((st:any)=>st.driver_number===dn&&(st.lap_start||0)<=replayLap); return s.length>0?s[s.length-1]:null }
    return drivers.map((d:any) => ({
      number:d.driver_number, code:d.name_acronym, name:d.full_name,
      team:d.team_name, color:'#'+(d.team_colour||'888'),
      position:lPos.get(d.driver_number)||99, gap:lGap.get(d.driver_number)||0,
      lastLap:lLap.get(d.driver_number)||0, stint:getStint(d.driver_number),
    })).sort((a:any,b:any) => a.position-b.position)
  }, [posData,lapData,intervalData,stintData,drivers,replayLap])

  // Her lap değişiminde AI tahminini güncelle
  useEffect(() => {
    if (mode !== 'replay' || currentStandings.length === 0 || replayLap < 2) return
    const liveDrivers = currentStandings.map((d: any) => ({
      code: d.code, name: d.name, team: d.team, teamColor: d.color,
      position: d.position, lastLapTime: d.lastLap || null,
      gap: d.gap, pitStops: d.stint?.tyre_age_at_start === 0 ? 1 : 0,
      compound: d.stint?.compound || 'MEDIUM'
    }))
    const updated = predictor.updateFromLiveData(liveDrivers, replayLap)
    setLivePreds(updated)
  }, [replayLap, mode, currentStandings])

  const eventFeed = useMemo(() => {
    const events: {lap:number,type:string,msg:string,color:string}[] = []
    for (const st of stintData) {
      if (st.tyre_age_at_start === 0 && st.lap_start > 1) {
        const drv = drivers.find((d:any)=>d.driver_number===st.driver_number)
        events.push({lap:st.lap_start, type:'PIT', msg:`🔧 ${drv?.name_acronym||'?'} pit → ${st.compound||'?'}`, color:'#eab308'})
      }
    }
    const posHist = new Map<number,{pos:number,date:string}[]>()
    for (const p of posData) { const a=posHist.get(p.driver_number)||[]; a.push({pos:p.position,date:p.date}); posHist.set(p.driver_number,a) }
    for (const [dn, hist] of posHist) {
      for (let i=1;i<hist.length;i++) {
        if (hist[i].pos<hist[i-1].pos) {
          const drv=drivers.find((d:any)=>d.driver_number===dn)
          const t=new Date(hist[i].date).getTime()
          const lapM=lapData.filter((l:any)=>l.driver_number===63).find((l:any)=>Math.abs(new Date(l.date_start||'').getTime()-t)<100000)
          if (lapM?.lap_number && hist[i-1].pos-hist[i].pos>=1) {
            events.push({lap:lapM.lap_number, type:'OVT', msg:`⚔ ${drv?.name_acronym||'?'} P${hist[i-1].pos}→P${hist[i].pos}`, color:'#22c55e'})
          }
        }
      }
    }
    for (const rc of raceCtrl) {
      if (rc.flag==='RED') events.push({lap:0,type:'FLAG',msg:`🔴 ${rc.message?.slice(0,50)}`,color:'#ef4444'})
      else if (rc.message?.includes('SAFETY CAR')) events.push({lap:0,type:'SC',msg:`🚗 ${rc.message?.slice(0,50)}`,color:'#f97316'})
      else if (rc.message?.includes('RETIRED')||rc.message?.includes('STOPPED')) events.push({lap:0,type:'DNF',msg:`💥 ${rc.message?.slice(0,50)}`,color:'#ef4444'})
    }
    return events.sort((a,b)=>a.lap-b.lap)
  }, [stintData,posData,raceCtrl,drivers,lapData])

  const filteredEvents = useMemo(() => eventFeed.filter(e=>e.lap<=replayLap), [eventFeed,replayLap])
  const backtest = useMemo(() => preds ? computeBacktest(preds) : null, [preds])
  const trackPoints = useMemo(() => { const n=CIRCUIT_MAP[selectedRace]; return n?TRACK_COORDS[n]||[]:[] }, [selectedRace])

  return (
    <div className="f1"><style>{CSS}</style>
      <header style={{background:'rgba(20,20,32,.97)',backdropFilter:'blur(12px)',padding:'8px 0',borderBottom:'2px solid #e10600',position:'sticky',top:0,zIndex:50}}>
        <div style={{maxWidth:1400,margin:'0 auto',padding:'0 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <a href="/" style={{color:'#555',textDecoration:'none',fontSize:12,width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid #2a2a3a',borderRadius:7}}>←</a>
            <span style={{fontFamily:"'Outfit'",fontSize:16,fontWeight:800,color:'#fff'}}>F1</span>
            <span style={{fontFamily:"'Outfit'",fontSize:16,fontWeight:800,color:'#e10600'}}>PREDICTOR</span>
            {races.length>0 && <select value={selectedRace} onChange={e=>setSelectedRace(Number(e.target.value))} style={{background:'#1e1e30',border:'1px solid #2a2a3a',borderRadius:6,color:'#aaa',padding:'3px 8px',fontSize:10,fontFamily:"'Outfit'",cursor:'pointer'}}>
              {races.map(r=><option key={r.key} value={r.key} disabled={!r.hasData}>{r.circuit} {r.date.slice(5)} {r.hasData?'':'⊘'}</option>)}
            </select>}
          </div>
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            {weatherData && <span style={{fontSize:9,color:'#555'}}>☀{weatherData.air_temperature?.toFixed(0)}° T{weatherData.track_temperature?.toFixed(0)}°</span>}
            <button className="f1-btn" onClick={()=>setMode('predict')} style={{background:mode==='predict'?'#e10600':'#1e1e30',fontSize:10,padding:'5px 12px'}}>🎯 Tahmin</button>
            <button className="f1-btn" onClick={loadReplayData} style={{background:mode==='replay'?'#e10600':'#1e1e30',fontSize:10,padding:'5px 12px',opacity:loading?.5:1}}>
              {loading?'⏳...':'🔄 Replay'}
            </button>
          </div>
        </div>
      </header>
      <div style={{maxWidth:1400,margin:'0 auto',padding:'12px 16px'}}>
        <div style={{display:'flex',gap:10,marginBottom:12,alignItems:'center',flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:180}}>
            <div style={{fontFamily:"'Outfit'",fontSize:20,fontWeight:800,color:'#fff'}}>Australian Grand Prix</div>
            <div style={{fontSize:10,color:'#555'}}>Albert Park · 58 Laps · 5.278 km</div>
          </div>
          {preds?.[0] && <div style={{padding:'6px 14px',background:'rgba(212,168,67,.06)',border:'1px solid rgba(212,168,67,.15)',borderRadius:8}}>
            <span style={{fontSize:8,color:'#997a2e',fontFamily:"'Outfit'",fontWeight:600}}>AI: </span>
            <span style={{fontFamily:"'Outfit'",fontSize:14,fontWeight:800,color:'#d4a843'}}>{preds[0].driverName}</span>
            <span style={{fontSize:10,color:'#997a2e',marginLeft:4}}>P1 {preds[0].winProbability}%</span>
          </div>}
          {backtest && <div style={{display:'flex',gap:10}}>
            <Stat l="Winner" v={backtest.winnerCorrect?'✓':'✗'} c={backtest.winnerCorrect?'#4ade80':'#ef4444'}/>
            <Stat l="Podium" v={`${backtest.podiumHits}/3`} c="#d4a843"/>
            <Stat l="MAE" v={backtest.mae.toFixed(1)} c={backtest.mae<3?'#4ade80':'#fbbf24'}/>
          </div>}
        </div>

        {mode==='predict' && <>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div className="f1-card">
              <div className="f1-title">QUALIFYING GRID · AI TAHMİN</div>
              <div style={{maxHeight:480,overflowY:'auto'}}>
                {AUSTRALIA_2026_QUALI.map((q,i) => {
                  const tm=TEAMS[q.team]; const pr=preds?.find(p=>p.driverCode===q.driverCode)
                  const dead=AUSTRALIA_2026_RACE_RESULT.find(r=>r.code===q.driverCode)
                  const isDead=dead?.status==='dnf'||dead?.status==='dns'
                  return <div key={q.driverCode} className="f1-row" style={{opacity:isDead?.3:1}}>
                    <span style={{width:22,fontFamily:"'Outfit'",fontWeight:800,color:i<3?'#d4a843':i<10?'#bbb':'#555',fontSize:13}}>{q.position}</span>
                    <div style={{width:3,height:18,borderRadius:2,background:tm?.color||'#444'}}/>
                    <div style={{flex:1}}><div style={{fontFamily:"'Outfit'",fontWeight:i<3?700:400,color:i<10?'#eee':'#777',fontSize:12}}>{q.driverName}</div><div style={{fontSize:8,color:'#444'}}>{q.team}</div></div>
                    <span style={{fontSize:10,color:'#555',width:62,textAlign:'right'}}>{q.q3Time||q.q2Time||q.q1Time||'—'}</span>
                    <span style={{width:32,textAlign:'center',fontWeight:700,color:pr&&pr.predictedPosition<=3?'#d4a843':'#666',fontSize:11}}>P{pr?.predictedPosition||'—'}</span>
                    <span style={{width:30,textAlign:'right',fontSize:9,color:pr&&pr.winProbability>10?'#fbbf24':'#333'}}>{pr?`${pr.winProbability}%`:''}</span>
                  </div>
                })}
              </div>
            </div>
            <div className="f1-card">
              <div className="f1-title">🏁 SONUÇ vs TAHMİN</div>
              <div style={{maxHeight:480,overflowY:'auto'}}>
                {AUSTRALIA_2026_RACE_RESULT.map((r,i) => {
                  const d=backtest?.details.find(x=>x.code===r.code); const tm=TEAMS[r.team]; const dead=r.status==='dnf'||r.status==='dns'
                  return <div key={r.code} className="f1-row" style={{opacity:dead?.25:1}}>
                    <span style={{width:32,fontFamily:"'Outfit'",fontWeight:800,color:dead?'#ef4444':i<3?'#d4a843':'#bbb',fontSize:12}}>{dead?r.status.toUpperCase():`P${r.pos}`}</span>
                    <div style={{width:3,height:16,borderRadius:2,background:tm?.color||'#333'}}/>
                    <span style={{flex:1,fontFamily:"'Outfit'",fontWeight:i<3?700:400,color:dead?'#444':i<10?'#eee':'#888',fontSize:11}}>{r.name}</span>
                    <span style={{width:30,textAlign:'center',fontWeight:700,color:d&&d.err===0?'#4ade80':d&&d.err<=2?'#fbbf24':'#666',fontSize:11}}>{d?`P${d.pred}`:'—'}</span>
                    <span style={{width:24,textAlign:'center',fontSize:10,fontWeight:700,color:d&&d.err===0?'#4ade80':d&&d.err<=2?'#fbbf24':'#ef4444'}}>{d?(d.err===0?'✓':`±${d.err}`):''}</span>
                  </div>
                })}
              </div>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:12}}>
            <div className="f1-card">
              <div className="f1-title">MODEL & SONRAKİ YARIŞ</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,fontSize:10}}>
                <div><span style={{color:'#555'}}>Ensemble:</span> <span style={{color:'#ccc'}}>Ridge40%+GB60%</span></div>
                <div><span style={{color:'#555'}}>ELO:</span> <span style={{color:'#ccc'}}>Driver+Team</span></div>
                <div><span style={{color:'#555'}}>Features:</span> <span style={{color:'#ccc'}}>14 · 2025×3</span></div>
                <div><span style={{color:'#555'}}>Recovery:</span> <span style={{color:'#ccc'}}>Gap{'>'} 8→bonus</span></div>
              </div>
              <div style={{marginTop:10,padding:'8px 10px',background:'#12121e',borderRadius:8,fontSize:9,color:'#666',lineHeight:1.7}}>
                <div style={{color:'#888',fontWeight:700,marginBottom:4,fontFamily:"'Outfit'"}}>Sonraki yarışta nasıl çalışır?</div>
                <div>🏁 <span style={{color:'#aaa'}}>Qualifying tamamlanınca:</span> Sralama grid'i OpenF1 API'den otomatik çekilir</div>
                <div>🧠 <span style={{color:'#aaa'}}>Model çalışır:</span> Grid pozisyonu + ELO + form + takım gücü → 14 feature</div>
                <div>📊 <span style={{color:'#aaa'}}>Tahmin üretilir:</span> Ridge(40%) + GradientBoost(60%) + ELO recovery</div>
                <div>📡 <span style={{color:'#aaa'}}>Canlı yarış:</span> Her 5s'de positions, intervals, laps çekilir → tahmin güncellenir</div>
                <div>🔄 <span style={{color:'#aaa'}}>Yarış sonrası:</span> Sonuç modele feedback olarak eklenir (ELO güncellenir)</div>
                <div style={{marginTop:4,color:'#555'}}>Antrenman verileri: Pace analizi için kullanılır ama qualifying grid ana input</div>
                <div style={{color:'#555'}}>API: api.openf1.org · Ücretsiz · Rate limit 3 req/s</div>
              </div>
            </div>
            <div className="f1-card">
              <div className="f1-title">NEDEN BU SIRA?</div>
              {preds?.slice(0,5).map(p => {
                const q=Math.round(p.factors.qualiPerformance*100),f=Math.round(p.factors.historicalForm*100),t=Math.round(p.factors.teamStrength*100)
                return <div key={p.driverCode} style={{marginBottom:6}}>
                  <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:2}}>
                    <div style={{width:3,height:10,borderRadius:2,background:p.teamColor}}/><span style={{fontSize:11,fontWeight:700,color:'#ddd',fontFamily:"'Outfit'"}}>{p.driverCode}</span>
                    <span style={{fontSize:9,color:'#d4a843',marginLeft:'auto',fontWeight:700}}>P{p.predictedPosition}</span>
                  </div>
                  <MBar l="Grid" v={q}/><MBar l="Form" v={f}/><MBar l="Team" v={t}/>
                </div>
              })}
            </div>
          </div>
        </>}

        {mode==='replay' && <>
          <div className="f1-card" style={{marginBottom:12,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
            <button className="f1-btn" onClick={()=>setReplayPlaying(!replayPlaying)} style={{background:replayPlaying?'#ef4444':'#22c55e',padding:'7px 18px'}}>{replayPlaying?'⏸':'▶'}</button>
            <button className="f1-btn" onClick={()=>setReplayTime(Math.max(raceStartTime,replayTime-85000))} style={{background:'#2a2a3a',padding:'6px 10px'}}>⏪</button>
            <button className="f1-btn" onClick={()=>setReplayTime(Math.min(raceEndTime,replayTime+85000))} style={{background:'#2a2a3a',padding:'6px 10px'}}>⏩</button>
            {[.5,1,2,4].map(s=><button key={s} className="f1-btn" onClick={()=>setReplaySpeed(s)} style={{background:replaySpeed===s?'#e10600':'#2a2a3a',padding:'4px 8px',fontSize:9}}>{s}x</button>)}
            <input type="range" min={raceStartTime||0} max={raceEndTime||1} value={replayTime} onChange={e=>{setReplayTime(Number(e.target.value))}} step={1000} style={{flex:1,minWidth:150,accentColor:'#e10600'}}/>
            <span style={{fontSize:13,fontWeight:700,color:'#fff',fontFamily:"'Outfit'"}}>LAP {replayLap}/{TOTAL_LAPS}</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1.2fr 1fr 0.8fr',gap:12}}>
            <div className="f1-card">
              <div className="f1-title">TRACK MAP · LAP {replayLap}</div>
              <TrackMap pts={trackPoints} cars={carPositions} drivers={drivers} standings={currentStandings}/>
            </div>
            <div className="f1-card">
              <div className="f1-title">LEADERBOARD · LAP {replayLap}</div>
              <div style={{maxHeight:440,overflowY:'auto'}}>
                {currentStandings.slice(0,20).map((d:any,i:number)=>(
                  <div key={d.number} className="f1-row">
                    <span style={{width:20,fontFamily:"'Outfit'",fontWeight:800,color:i<3?'#d4a843':i<10?'#bbb':'#555',fontSize:13}}>{i+1}</span>
                    <div style={{width:3,height:18,borderRadius:2,background:d.color}}/>
                    <div style={{flex:1}}><span style={{fontFamily:"'Outfit'",fontWeight:i<3?700:400,color:i<10?'#eee':'#777',fontSize:12}}>{d.code}</span><span style={{fontSize:8,color:'#444',marginLeft:6}}>{d.team}</span></div>
                    <span style={{fontSize:9,color:'#555',width:46,textAlign:'right'}}>{d.gap>0?`+${d.gap.toFixed(1)}s`:i===0?'LDR':''}</span>
                    <span style={{fontSize:9,color:d.lastLap>0&&d.lastLap<82?'#a855f7':'#444',width:46,textAlign:'right'}}>{d.lastLap>0?d.lastLap.toFixed(3):'—'}</span>
                    <TyreBadge compound={d.stint?.compound}/>
                    {(() => { const lp=livePreds?.find(p=>p.driverCode===d.code); return lp ? <span style={{fontSize:8,color:lp.predictedPosition<=3?'#d4a843':'#555',width:24,textAlign:'right',fontWeight:600}}>→P{lp.predictedPosition}</span> : null })()}
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {/* AI TAHMİN PANELİ */}
            <div className="f1-card" style={{flex:0}}>
              <div className="f1-title">AI TAHMİN · LAP {replayLap}</div>
              {livePreds ? <div style={{maxHeight:160,overflowY:'auto'}}>
                {livePreds.slice(0,10).map((p,i) => (
                  <div key={p.driverCode} style={{display:'flex',alignItems:'center',gap:4,padding:'2px 0',fontSize:10}}>
                    <span style={{width:16,fontWeight:800,color:i<3?'#d4a843':'#666',fontFamily:"'Outfit'"}}>{p.predictedPosition}</span>
                    <div style={{width:2,height:10,borderRadius:1,background:p.teamColor}}/>
                    <span style={{color:i<3?'#eee':'#888',fontWeight:i<3?700:400,flex:1}}>{p.driverCode}</span>
                    <span style={{color:'#d4a843',fontSize:8}}>{p.winProbability}%</span>
                  </div>
                ))}
              </div> : <div style={{color:'#444',fontSize:9}}>Yarış başlayınca güncellenir</div>}
              {livePreds && <div style={{marginTop:6,fontSize:8,color:'#444'}}>Confidence: {Math.round(70 + (replayLap/TOTAL_LAPS)*25)}% · Momentum+Pace+Position</div>}
            </div>
            {/* OLAY AKIŞI */}
            <div className="f1-card" style={{flex:1}}>
              <div className="f1-title">OLAY AKIŞI</div>
              <div style={{maxHeight:440,overflowY:'auto'}}>
                {filteredEvents.length===0 ? <div style={{color:'#444',fontSize:10}}>Oynat ile başlat</div> :
                  [...filteredEvents].reverse().slice(0,30).map((e,i)=>(
                    <div key={i} style={{fontSize:10,padding:'3px 0',borderBottom:'1px solid #1e1e30',color:e.color}}>
                      <span style={{color:'#444',marginRight:4}}>L{e.lap}</span>{e.msg}
                    </div>
                  ))
                }
              </div>
            </div>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:12}}>
            <div className="f1-card">
              <div className="f1-title">RACE CONTROL</div>
              <div style={{maxHeight:150,overflowY:'auto'}}>
                {raceCtrl.length===0?<div style={{color:'#444',fontSize:10}}>—</div>:
                  [...raceCtrl].reverse().slice(0,6).map((rc:any,i:number)=>(
                    <div key={i} style={{display:'flex',gap:4,padding:'3px 0',borderBottom:'1px solid #1e1e30',fontSize:9}}>
                      <span style={{padding:'1px 5px',borderRadius:3,fontWeight:700,fontSize:7,background:rc.flag==='GREEN'?'#166534':rc.flag==='YELLOW'?'#854d0e':rc.flag==='RED'?'#991b1b':'#2a2a3a',color:'#fff'}}>{rc.flag||'INFO'}</span>
                      <span style={{color:'#888'}}>{rc.message?.slice(0,70)}</span>
                    </div>
                  ))
                }
              </div>
            </div>
            <div className="f1-card">
              <div className="f1-title">API LOG</div>
              <div style={{maxHeight:150,overflowY:'auto',fontSize:9}}>
                {log.length===0?<div style={{color:'#444'}}>REPLAY tıkla</div>:
                  [...log].reverse().map((l,i)=>(<div key={i} style={{color:l.includes('✓')?'#4ade80':l.includes('❌')?'#ef4444':'#555',padding:'1px 0'}}>{l}</div>))
                }
              </div>
            </div>
          </div>
        </>}
      </div>
    </div>
  )
}

function TrackMap({pts,cars,drivers,standings}:{pts:number[][],cars:Map<number,{x:number,y:number}>,drivers:any[],standings:any[]}) {
  if (pts.length===0) return <div style={{color:'#444',textAlign:'center',padding:30,fontSize:11}}>Bu pist için koordinat yok</div>
  const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1])
  const xMin=Math.min(...xs),xMax=Math.max(...xs),yMin=Math.min(...ys),yMax=Math.max(...ys)
  const W=580,H=380,P=25
  const tx=(x:number)=>P+((x-xMin)/(xMax-xMin))*(W-2*P)
  const ty=(y:number)=>H-P-((y-yMin)/(yMax-yMin))*(H-2*P)
  const path=pts.map((p,i)=>(i===0?'M':'L')+tx(p[0]).toFixed(1)+','+ty(p[1]).toFixed(1)).join(' ')
  return <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:'auto',background:'#10101a',borderRadius:8}}>
    <path d={path} fill="none" stroke="#2a2a3a" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round"/>
    <path d={path} fill="none" stroke="#3a3a4a" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
    <path d={path} fill="none" stroke="#4a4a5a" strokeWidth="1" strokeDasharray="3,6" opacity=".3"/>
    <circle cx={tx(pts[0][0])} cy={ty(pts[0][1])} r="4" fill="none" stroke="#fff" strokeWidth="1.5" opacity=".5"/>
    <text x={tx(pts[0][0])+7} y={ty(pts[0][1])-3} fill="#666" fontSize="7" fontFamily="Outfit">S/F</text>
    {[...cars.entries()].map(([dn,pos])=>{
      const drv=drivers.find((d:any)=>d.driver_number===dn); if(!drv||(!pos.x&&!pos.y)) return null
      const col='#'+(drv.team_colour||'888'),code=drv.name_acronym||'?'
      const st=standings.find((s:any)=>s.number===dn),p=st?.position||99
      const cx=tx(pos.x),cy=ty(pos.y)
      return <g key={dn}><circle cx={cx} cy={cy} r={p<=3?5:3.5} fill={col} stroke="#000" strokeWidth=".8"/>
        <text x={cx+7} y={cy+3} fill="#ccc" fontSize="6.5" fontFamily="Outfit" fontWeight={p<=3?'700':'400'}>{code}</text>
        {p<=3&&<text x={cx} y={cy+2.5} fill="#000" fontSize="4.5" fontFamily="Outfit" fontWeight="800" textAnchor="middle">{p}</text>}</g>
    })}
    <text x={W-60} y={H-8} fill="#444" fontSize="6" fontFamily="Outfit">{cars.size} araç</text>
  </svg>
}

function TyreBadge({compound}:{compound?:string}) {
  const c=compound||'MEDIUM'
  const bg=c==='SOFT'?'#dc2626':c==='HARD'?'#e5e5e5':c==='INTERMEDIATE'?'#22c55e':c==='WET'?'#3b82f6':'#eab308'
  const fg=c==='HARD'||c==='MEDIUM'?'#000':'#fff'
  return <span style={{padding:'2px 5px',borderRadius:3,fontSize:8,fontWeight:700,background:bg,color:fg,minWidth:14,textAlign:'center'}}>{c[0]}</span>
}
function Stat({l,v,c}:{l:string;v:string;c:string}) { return <div style={{textAlign:'center',padding:'2px 8px'}}><div style={{fontFamily:"'Outfit'",fontSize:18,fontWeight:800,color:c}}>{v}</div><div style={{fontSize:8,color:'#555'}}>{l}</div></div> }
function MBar({l,v}:{l:string;v:number}) { const c=v>70?'#22c55e':v>40?'#fbbf24':'#ef4444'; return <div style={{display:'flex',alignItems:'center',gap:3,marginBottom:1}}><span style={{fontSize:8,color:'#555',width:30}}>{l}</span><div style={{flex:1,height:3,background:'#1e1e30',borderRadius:2,overflow:'hidden'}}><div style={{width:`${v}%`,height:'100%',background:c,borderRadius:2}}/></div><span style={{fontSize:8,color:c,fontWeight:600,width:24,textAlign:'right'}}>{v}%</span></div> }
function nw(){return new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
function pT(t:string):number{const[m,s]=t.split(':');return Number(m)*60+Number(s)}
