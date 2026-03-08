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
@keyframes slideUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.f1{background:linear-gradient(160deg,#0c0c18,#141420 30%,#0f1218 60%,#0a0e16);min-height:100vh;color:#e0e0e8;font-family:'JetBrains Mono',monospace;position:relative;overflow:hidden}
.f1::before{content:'';position:fixed;inset:0;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");opacity:.03;z-index:0}
.f1 *{box-sizing:border-box}
.f1p{background:rgba(20,20,36,.8);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:10px 12px;position:relative;z-index:1}
.f1t{font-family:'Outfit',sans-serif;font-size:9px;color:#555;letter-spacing:.1em;font-weight:600;margin-bottom:6px;text-transform:uppercase}
.f1r{display:flex;align-items:center;gap:5px;padding:3px 2px;border-bottom:1px solid rgba(255,255,255,.03)}
.f1b{border:none;border-radius:6px;padding:5px 12px;font-size:10px;color:#fff;cursor:pointer;font-family:'Outfit',sans-serif;font-weight:600}
@media(max-width:900px){.f1-main{flex-direction:column!important}.f1-side{min-width:0!important;max-width:100%!important}}
`

export function F1Page() {
  const [preds, setPreds] = useState<PredictionResult[]|null>(null)
  const [mode, setMode] = useState<'predict'|'replay'>('predict')
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
  const [log, setLog] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [races, setRaces] = useState<{key:number,name:string,circuit:string,date:string,hasData:boolean}[]>([])
  const [selectedRace, setSelectedRace] = useState(SESSION_KEY)
  const [carPositions, setCarPositions] = useState<Map<number,{x:number,y:number}>>(new Map())
  const [allLocationData, setAllLocationData] = useState<any[]>([])
  const [livePreds, setLivePreds] = useState<PredictionResult[]|null>(null)
  const [liveActive, setLiveActive] = useState(false)
  const replayRef = useRef<number|null>(null)
  const liveRef = useRef<number|null>(null)

  // Init: races + pre-race prediction
  useEffect(() => {
    (async () => { try {
      const sessions = await openF1.getSessions({year: 2026, session_type: 'Race'})
      setRaces(sessions.map((s:any) => ({key:s.session_key,name:s.country_name,circuit:s.circuit_short_name||s.country_name,date:s.date_start?.slice(0,10)||'',hasData:new Date(s.date_start)<=new Date()})))
    } catch {} })()
    setPreds(predictor.predictFromGrid(AUSTRALIA_2026_QUALI.map(q => ({
      code:q.driverCode,name:q.driverName,team:q.team,teamColor:TEAMS[q.team]?.color||'#888',position:q.position,
      qualiDelta:(q.q3Time?pT(q.q3Time):q.q2Time?pT(q.q2Time):q.q1Time?pT(q.q1Time):83)-78.518
    }))))
  }, [])

  // Race change → auto qualifying fetch
  useEffect(() => {
    if (selectedRace === SESSION_KEY) return
    ;(async () => { try {
      const race = races.find(r=>r.key===selectedRace); if(!race?.hasData) return
      const allS = await openF1.getSessions({year:2026})
      const qS = allS.find((s:any)=>s.session_type==='Qualifying'&&Math.abs(new Date(s.date_start||'').getTime()-new Date(race.date).getTime())<3*86400000)
      if(!qS) return
      const [laps,drvs] = await Promise.all([openF1.getLaps(qS.session_key),openF1.getDrivers(qS.session_key)])
      const best = new Map<number,number>()
      for(const l of laps) if(l.lap_duration>0){const c=best.get(l.driver_number)||Infinity;if(l.lap_duration<c) best.set(l.driver_number,l.lap_duration)}
      const pole=Math.min(...best.values())
      const grid=[...best.entries()].sort((a,b)=>a[1]-b[1]).map(([dn,t],i)=>{const d=drvs.find((x:any)=>x.driver_number===dn);return{code:d?.name_acronym||'?',name:d?.full_name||'?',team:d?.team_name||'?',teamColor:'#'+(d?.team_colour||'888'),position:i+1,qualiDelta:t-pole}})
      if(grid.length>0) setPreds(predictor.predictFromGrid(grid))
    } catch {} })()
  }, [selectedRace, races])

  const addLog = useCallback((m:string) => setLog(p=>[...p.slice(-40),`[${nw()}] ${m}`]), [])

  // Load replay data
  const loadReplay = useCallback(async () => {
    const sk=selectedRace; setLoading(true); setLog([])
    addLog('> Loading...')
    try {
      const [drv,laps,pos,intv,st,rc,w] = await Promise.all([openF1.getDrivers(sk),openF1.getLaps(sk),openF1.getPositions(sk),openF1.getIntervals(sk),openF1.getStints(sk),openF1.getRaceControl(sk),openF1.getWeather(sk)])
      setDrivers(drv);setLapData(laps);setPosData(pos);setIntervalData(intv);setStintData(st);setRaceCtrl(rc)
      if(w.length>0) setWeatherData(w[w.length-1])
      addLog(`OK ${drv.length}drv ${laps.length}laps ${pos.length}pos`)
      try {
        const top=[63,12,16,44,4,1,87,30,5,10]
        const r1=await Promise.all(top.slice(0,3).map(dn=>openF1.getLocations(sk,dn).catch(()=>[])))
        const r2=await Promise.all(top.slice(3,6).map(dn=>openF1.getLocations(sk,dn).catch(()=>[])))
        const r3=await Promise.all(top.slice(6,10).map(dn=>openF1.getLocations(sk,dn).catch(()=>[])))
        setAllLocationData([...r1,...r2,...r3].flat())
        addLog(`OK ${[...r1,...r2,...r3].flat().length} loc`)
      } catch{}
      const fl=laps.find((l:any)=>l.driver_number===63&&l.lap_number===1)
      const ll=[...laps].reverse().find((l:any)=>l.driver_number===63&&l.lap_duration>0)
      if(fl?.date_start){const s=new Date(fl.date_start).getTime(),e=ll?.date_start?new Date(ll.date_start).getTime()+90000:s+5400000;setRaceStartTime(s);setRaceEndTime(e);setReplayTime(s)}
      addLog('> Ready'); setMode('replay'); setReplayLap(1)
    } catch(e:any){addLog(`ERR ${e.message}`)}
    setLoading(false)
  }, [addLog, selectedRace])

  // Live mode
  const toggleLive = useCallback(() => {
    if(liveActive){if(liveRef.current)clearInterval(liveRef.current);setLiveActive(false);return}
    setLiveActive(true);setMode('replay');setLog([]);addLog('> LIVE 5s')
    const sk=selectedRace
    const poll=async()=>{try{
      const[drv,laps,pos,intv,st,rc,w]=await Promise.all([openF1.getDrivers(sk),openF1.getLaps(sk),openF1.getPositions(sk),openF1.getIntervals(sk),openF1.getStints(sk),openF1.getRaceControl(sk),openF1.getWeather(sk)])
      setDrivers(drv);setLapData(laps);setPosData(pos);setIntervalData(intv);setStintData(st);setRaceCtrl(rc);if(w.length>0)setWeatherData(w[w.length-1])
      const ml=Math.max(0,...laps.filter((l:any)=>l.driver_number===63).map((l:any)=>l.lap_number));setReplayLap(ml)
      try{const locs=await Promise.all([63,12,16,44,4,1].map(dn=>openF1.getLocations(sk,dn).catch(()=>[])));setAllLocationData(locs.flat());setReplayTime(Date.now())}catch{}
      addLog(`L${ml} ${pos.length}pos`)
    }catch(e:any){addLog(`ERR ${e.message}`)}}
    poll(); liveRef.current=window.setInterval(poll,5000)
  },[liveActive,selectedRace,addLog])
  useEffect(()=>()=>{if(liveRef.current)clearInterval(liveRef.current)},[])

  // Replay timer
  useEffect(()=>{
    if(!replayPlaying){if(replayRef.current)clearInterval(replayRef.current);return}
    const T=200,S=T*replaySpeed*10
    replayRef.current=window.setInterval(()=>setReplayTime(p=>{const n=p+S;if(n>=raceEndTime){setReplayPlaying(false);return raceEndTime}return n}),T)
    return()=>{if(replayRef.current)clearInterval(replayRef.current)}
  },[replayPlaying,replaySpeed,raceEndTime])

  // Lap from time
  useEffect(()=>{if(!lapData.length||!replayTime)return;const rl=lapData.filter((l:any)=>l.driver_number===63&&l.date_start);let c=1;for(const l of rl)if(new Date(l.date_start).getTime()<=replayTime)c=l.lap_number;setReplayLap(c)},[replayTime,lapData])

  // Car positions from time
  useEffect(()=>{if(!allLocationData.length||!replayTime)return;const m=new Map<number,{x:number,y:number}>();const s=new Set<number>();for(let i=allLocationData.length-1;i>=0;i--){const l=allLocationData[i];if(s.has(l.driver_number))continue;if(new Date(l.date).getTime()<=replayTime){m.set(l.driver_number,{x:l.x,y:l.y});s.add(l.driver_number)}}setCarPositions(m)},[replayTime,allLocationData])

  // Standings
  const standings = useMemo(()=>{
    if(!posData.length||!lapData.length)return[]
    const rl=lapData.filter((l:any)=>l.driver_number===63&&l.lap_number<=replayLap)
    const ref=rl.length>0?new Date(rl[rl.length-1].date_start||'').getTime():0
    const lP=new Map<number,number>(),lG=new Map<number,number>(),lL=new Map<number,number>()
    for(const p of posData)if(new Date(p.date||'').getTime()<=ref+10000)lP.set(p.driver_number,p.position)
    for(const iv of intervalData)if(new Date(iv.date||'').getTime()<=ref+10000)lG.set(iv.driver_number,iv.gap_to_leader??0)
    for(const l of lapData)if(l.lap_number<=replayLap&&l.lap_duration>0)lL.set(l.driver_number,l.lap_duration)
    const gS=(dn:number)=>{const s=stintData.filter((st:any)=>st.driver_number===dn&&(st.lap_start||0)<=replayLap);return s.length>0?s[s.length-1]:null}
    return drivers.map((d:any)=>({number:d.driver_number,code:d.name_acronym,name:d.full_name,team:d.team_name,color:'#'+(d.team_colour||'888'),position:lP.get(d.driver_number)||99,gap:lG.get(d.driver_number)||0,lastLap:lL.get(d.driver_number)||0,stint:gS(d.driver_number)})).sort((a:any,b:any)=>a.position-b.position)
  },[posData,lapData,intervalData,stintData,drivers,replayLap])

  // AI prediction update
  useEffect(()=>{if(mode!=='replay'||!standings.length||replayLap<2)return;setLivePreds(predictor.updateFromLiveData(standings.map((d:any)=>({code:d.code,name:d.name,team:d.team,teamColor:d.color,position:d.position,lastLapTime:d.lastLap||null,gap:d.gap,pitStops:d.stint?.tyre_age_at_start===0?1:0,compound:d.stint?.compound||'MEDIUM'})),replayLap))},[replayLap,mode,standings])

  // Events
  const events = useMemo(()=>{
    const ev:{lap:number,msg:string,color:string}[]=[]
    for(const st of stintData)if(st.tyre_age_at_start===0&&st.lap_start>1){const d=drivers.find((x:any)=>x.driver_number===st.driver_number);ev.push({lap:st.lap_start,msg:`PIT ${d?.name_acronym||'?'} > ${st.compound||'?'}`,color:'#eab308'})}
    for(const rc of raceCtrl){if(rc.flag==='RED')ev.push({lap:0,msg:`RED ${rc.message?.slice(0,40)}`,color:'#ef4444'});else if(rc.message?.includes('RETIRED'))ev.push({lap:0,msg:`DNF ${rc.message?.slice(0,40)}`,color:'#ef4444'})}
    return ev.sort((a,b)=>a.lap-b.lap)
  },[stintData,raceCtrl,drivers])

  const backtest = useMemo(()=>preds?computeBacktest(preds):null,[preds])
  const trackPts = useMemo(()=>{const n=CIRCUIT_MAP[selectedRace];return n?TRACK_COORDS[n]||[]:[]},[selectedRace])
  const fEvents = useMemo(()=>events.filter(e=>e.lap<=replayLap),[events,replayLap])

  // ═══ RENDER ═══
  return (
    <div className="f1"><style>{CSS}</style>
      {/* HEADER BAR */}
      <div style={{background:'rgba(12,12,24,.95)',borderBottom:'2px solid #e10600',padding:'6px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,zIndex:50,backdropFilter:'blur(10px)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <a href="/" style={{color:'#444',textDecoration:'none',fontSize:11,border:'1px solid #222',borderRadius:5,padding:'2px 8px'}}>←</a>
          <span style={{fontFamily:"'Outfit'",fontWeight:800,color:'#fff',fontSize:14}}>F1</span>
          <span style={{fontFamily:"'Outfit'",fontWeight:800,color:'#e10600',fontSize:14}}>PREDICTOR</span>
          {races.length>0&&<select value={selectedRace} onChange={e=>setSelectedRace(Number(e.target.value))} style={{background:'#111',border:'1px solid #222',borderRadius:5,color:'#888',padding:'2px 6px',fontSize:9}}>
            {races.map(r=><option key={r.key} value={r.key} disabled={!r.hasData}>{r.circuit} {r.date.slice(5)}</option>)}
          </select>}
          {mode==='replay'&&<span style={{background:'#e10600',padding:'1px 8px',borderRadius:4,fontSize:10,fontWeight:700,color:'#fff'}}>LAP {replayLap}/{TOTAL_LAPS}</span>}
        </div>
        <div style={{display:'flex',gap:4,alignItems:'center',flexWrap:'wrap'}}>
          {weatherData&&<span style={{fontSize:8,color:'#444'}}>{weatherData.air_temperature?.toFixed(0)}° T{weatherData.track_temperature?.toFixed(0)}°</span>}
          <button className="f1b" onClick={()=>setMode('predict')} style={{background:mode==='predict'?'#e10600':'#1a1a2a'}}>TAHMİN</button>
          <button className="f1b" onClick={loadReplay} style={{background:mode==='replay'&&!liveActive?'#e10600':'#1a1a2a',opacity:loading?.5:1}}>{loading?'...':'REPLAY'}</button>
          <button className="f1b" onClick={toggleLive} style={{background:liveActive?'#dc2626':'#1a1a2a',animation:liveActive?'pulse 2s infinite':''}}>
            {liveActive&&<span style={{width:5,height:5,borderRadius:'50%',background:'#fff',display:'inline-block',marginRight:4}}/>}CANLI
          </button>
        </div>
      </div>

      {mode==='predict'&&<div style={{padding:'12px 16px',maxWidth:1400,margin:'0 auto'}}>
        <div style={{display:'flex',gap:8,marginBottom:10,alignItems:'center',flexWrap:'wrap'}}>
          <span style={{fontFamily:"'Outfit'",fontSize:18,fontWeight:800,color:'#fff'}}>Australian Grand Prix</span>
          {preds?.[0]&&<span style={{fontSize:10,color:'#997a2e',background:'rgba(212,168,67,.08)',padding:'3px 10px',borderRadius:6,border:'1px solid rgba(212,168,67,.15)'}}>PRED {preds[0].driverName} P1 {preds[0].winProbability}%</span>}
          {backtest&&<><span style={{color:backtest.winnerCorrect?'#4ade80':'#ef4444',fontSize:16,fontWeight:800}}>{backtest.winnerCorrect?'✓':'✗'}</span><span style={{color:'#d4a843',fontSize:12,fontWeight:700}}>{backtest.podiumHits}/3</span><span style={{color:'#fbbf24',fontSize:12}}>MAE {backtest.mae.toFixed(1)}</span></>}
        </div>
        {/* Track + Grid side by side */}
        <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
          <div className="f1p" style={{flex:'1 1 400px',minWidth:300}}>
            <div className="f1t">{races.find(r=>r.key===selectedRace)?.circuit||'Albert Park'}</div>
            <TrackSVG pts={trackPts} cars={carPositions} drivers={drivers} standings={standings}/>
          </div>
          <div style={{flex:'1 1 300px',display:'flex',flexDirection:'column',gap:10}}>
            <div className="f1p" style={{flex:1}}>
              <div className="f1t">GRID · PRED</div>
              <div style={{maxHeight:300,overflowY:'auto'}}>
                {AUSTRALIA_2026_QUALI.slice(0,15).map((q,i)=>{const pr=preds?.find(p=>p.driverCode===q.driverCode);return<div key={q.driverCode} className="f1r"><span style={{width:16,fontFamily:"'Outfit'",fontWeight:800,color:i<3?'#d4a843':'#666',fontSize:11}}>{q.position}</span><div style={{width:2,height:14,borderRadius:1,background:TEAMS[q.team]?.color||'#444'}}/><span style={{flex:1,fontSize:10,color:i<10?'#ddd':'#666'}}>{q.driverCode}</span><span style={{fontSize:9,color:'#555'}}>{q.q3Time||q.q2Time||'—'}</span><span style={{fontSize:9,fontWeight:700,color:pr&&pr.predictedPosition<=3?'#d4a843':'#555'}}>P{pr?.predictedPosition||'—'}</span></div>})}
              </div>
            </div>
            <div className="f1p">
              <div className="f1t">MODEL</div>
              <div style={{fontSize:9,color:'#555',lineHeight:1.6}}>
                <div>Ensemble Ridge40%+GB60% · ELO recovery</div>
                <div>14 features · 2024-2025 data · OpenF1 API</div>
                <div style={{marginTop:4,color:'#444'}}>1. Qualifying → grid | 2. Model → 14 features | 3. Tahmin | 4. Canlı güncelleme | 5. ELO feedback</div>
              </div>
            </div>
          </div>
        </div>
      </div>}

      {mode==='replay'&&<div style={{padding:0,height:'calc(100vh - 42px)',display:'flex',flexDirection:'column'}}>
        {/* MAIN: Left panel + Track + Right panel */}
        <div className="f1-main" style={{flex:1,display:'flex',overflow:'hidden'}}>
          {/* LEFT PANEL */}
          <div className="f1-side" style={{width:200,minWidth:180,padding:'8px 6px',overflowY:'auto',display:'flex',flexDirection:'column',gap:6}}>
            {weatherData&&<div className="f1p"><div className="f1t">WEATHER</div>
              <div style={{fontSize:9,color:'#888',lineHeight:1.8}}>
                <div>Track: {weatherData.track_temperature?.toFixed(1)}°C</div>
                <div>Air: {weatherData.air_temperature?.toFixed(1)}°C</div>
                <div>Humidity: {weatherData.humidity?.toFixed(0)}%</div>
                <div>Wind: {weatherData.wind_speed?.toFixed(1)} km/h {weatherData.wind_direction}</div>
                <div>Rain: {weatherData.rainfall>0?'WET':'DRY'}</div>
              </div>
            </div>}
            <div className="f1p"><div className="f1t">AI TAHMIN · L{replayLap}</div>
              {livePreds?<div style={{maxHeight:200,overflowY:'auto'}}>{livePreds.slice(0,10).map((p,i)=><div key={p.driverCode} style={{display:'flex',gap:3,padding:'2px 0',fontSize:9}}><span style={{width:12,fontWeight:800,color:i<3?'#d4a843':'#555'}}>{p.predictedPosition}</span><div style={{width:2,height:10,borderRadius:1,background:p.teamColor}}/><span style={{flex:1,color:i<3?'#ddd':'#777'}}>{p.driverCode}</span><span style={{color:'#997a2e',fontSize:8}}>{p.winProbability}%</span></div>)}</div>:<div style={{color:'#333',fontSize:8}}>Oynat ile başlat</div>}
            </div>
            <div className="f1p" style={{flex:1}}><div className="f1t">OLAYLAR</div>
              <div style={{maxHeight:200,overflowY:'auto'}}>{fEvents.length===0?<div style={{color:'#333',fontSize:8}}>—</div>:[...fEvents].reverse().slice(0,15).map((e,i)=><div key={i} style={{fontSize:8,padding:'1px 0',color:e.color}}><span style={{color:'#333'}}>L{e.lap}</span> {e.msg}</div>)}</div>
            </div>
          </div>

          {/* CENTER: TRACK MAP */}
          <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:8,position:'relative',zIndex:1}}>
            <TrackSVG pts={trackPts} cars={carPositions} drivers={drivers} standings={standings} large/>
          </div>

          {/* RIGHT PANEL: LEADERBOARD */}
          <div className="f1-side" style={{width:240,minWidth:200,padding:'8px 6px',overflowY:'auto'}}>
            <div className="f1p"><div className="f1t">LEADERBOARD · L{replayLap}</div>
              <div style={{maxHeight:'calc(100vh - 140px)',overflowY:'auto'}}>
                {standings.slice(0,20).map((d:any,i:number)=><div key={d.number} className="f1r">
                  <span style={{width:16,fontFamily:"'Outfit'",fontWeight:800,color:i<3?'#d4a843':i<10?'#aaa':'#444',fontSize:11}}>{i+1}</span>
                  <div style={{width:2,height:14,borderRadius:1,background:d.color}}/>
                  <span style={{flex:1,fontFamily:"'Outfit'",fontWeight:i<3?700:400,color:i<10?'#ddd':'#666',fontSize:10}}>{d.code}</span>
                  <span style={{fontSize:8,color:'#444',width:40,textAlign:'right'}}>{d.gap>0?`+${d.gap.toFixed(1)}s`:i===0?'LDR':''}</span>
                  <span style={{fontSize:8,color:d.lastLap>0&&d.lastLap<82?'#a855f7':'#333',width:42,textAlign:'right'}}>{d.lastLap>0?d.lastLap.toFixed(3):'—'}</span>
                  <TB c={d.stint?.compound}/>
                  {(()=>{const lp=livePreds?.find(p=>p.driverCode===d.code);return lp?<span style={{fontSize:7,color:lp.predictedPosition<=3?'#d4a843':'#444',width:16,textAlign:'right'}}>P{lp.predictedPosition}</span>:null})()}
                </div>)}
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM: Controls */}
        <div style={{padding:'4px 12px',background:'rgba(12,12,24,.95)',borderTop:'1px solid #1a1a2a',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',zIndex:10}}>
          <button className="f1b" onClick={()=>setReplayPlaying(!replayPlaying)} style={{background:replayPlaying?'#ef4444':'#22c55e',padding:'4px 12px'}}>{replayPlaying?'STOP':'PLAY'}</button>
          <button className="f1b" onClick={()=>setReplayTime(Math.max(raceStartTime,replayTime-85000))} style={{background:'#1a1a2a'}}>←</button>
          <button className="f1b" onClick={()=>setReplayTime(Math.min(raceEndTime,replayTime+85000))} style={{background:'#1a1a2a'}}>→</button>
          {[.5,1,2,4].map(s=><button key={s} className="f1b" onClick={()=>setReplaySpeed(s)} style={{background:replaySpeed===s?'#e10600':'#1a1a2a',padding:'3px 6px',fontSize:8}}>{s}x</button>)}
          <input type="range" min={raceStartTime||0} max={raceEndTime||1} value={replayTime} onChange={e=>setReplayTime(Number(e.target.value))} step={1000} style={{flex:1,minWidth:100,accentColor:'#e10600',height:4}}/>
          <span style={{fontSize:11,fontWeight:700,color:'#fff',fontFamily:"'Outfit'"}}>L{replayLap}/{TOTAL_LAPS}</span>
        </div>
      </div>}
    </div>
  )
}

// ═══ TRACK SVG ═══
function TrackSVG({pts,cars,drivers,standings,large}:{pts:number[][],cars:Map<number,{x:number,y:number}>,drivers:any[],standings:any[],large?:boolean}) {
  if(!pts.length) return <div style={{color:'#333',textAlign:'center',padding:20,fontSize:10}}>No track data</div>
  const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1])
  const xMin=Math.min(...xs),xMax=Math.max(...xs),yMin=Math.min(...ys),yMax=Math.max(...ys)
  const W=large?700:500,H=large?420:280,P=large?30:20
  const tx=(x:number)=>P+((x-xMin)/(xMax-xMin))*(W-2*P)
  const ty=(y:number)=>H-P-((y-yMin)/(yMax-yMin))*(H-2*P)
  const path=pts.map((p,i)=>(i===0?'M':'L')+tx(p[0]).toFixed(1)+','+ty(p[1]).toFixed(1)).join(' ')
  const sw=large?8:6
  return <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',maxWidth:large?'100%':500,height:'auto',borderRadius:8,background:'linear-gradient(135deg,#080810,#0e1018 50%,#080812)'}}>
    <defs><pattern id="tg" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="#fff" strokeWidth=".2" opacity=".04"/></pattern>
    <radialGradient id="tv" cx="50%" cy="50%" r="55%"><stop offset="0%" stopColor="transparent"/><stop offset="100%" stopColor="#000" stopOpacity=".5"/></radialGradient></defs>
    <rect width={W} height={H} fill="url(#tg)"/><rect width={W} height={H} fill="url(#tv)"/>
    <path d={path} fill="none" stroke="#1a1a2a" strokeWidth={sw+4} strokeLinecap="round" strokeLinejoin="round"/>
    <path d={path} fill="none" stroke="#2a2a3a" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/>
    <path d={path} fill="none" stroke="#3a3a4a" strokeWidth={sw-2} strokeLinecap="round" strokeLinejoin="round" opacity=".5"/>
    <circle cx={tx(pts[0][0])} cy={ty(pts[0][1])} r={large?4:3} fill="none" stroke="#fff" strokeWidth="1" opacity=".4"/>
    {[...cars.entries()].map(([dn,pos])=>{
      const drv=drivers.find((d:any)=>d.driver_number===dn);if(!drv||(!pos.x&&!pos.y))return null
      const col='#'+(drv.team_colour||'888'),code=drv.name_acronym||'?'
      const st=standings.find((s:any)=>s.number===dn),p=st?.position||99
      const cx=tx(pos.x),cy=ty(pos.y),r=large?(p<=3?6:4):(p<=3?4:3)
      return <g key={dn}><circle cx={cx} cy={cy} r={r} fill={col} stroke="#000" strokeWidth=".6"/>
        <text x={cx+(large?8:6)} y={cy+2} fill="#ccc" fontSize={large?7:5} fontFamily="Outfit" fontWeight={p<=3?'700':'400'}>{code}</text>
        {p<=3&&<text x={cx} y={cy+(large?2.5:2)} fill="#000" fontSize={large?5:3.5} fontFamily="Outfit" fontWeight="800" textAnchor="middle">{p}</text>}
      </g>
    })}
  </svg>
}

function TB({c}:{c?:string}){const v=c||'MEDIUM';const bg=v==='SOFT'?'#dc2626':v==='HARD'?'#e5e5e5':'#eab308';const fg=v==='HARD'||v==='MEDIUM'?'#000':'#fff';return<span style={{padding:'1px 4px',borderRadius:3,fontSize:7,fontWeight:700,background:bg,color:fg}}>{v[0]}</span>}
function nw(){return new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
function pT(t:string):number{const[m,s]=t.split(':');return Number(m)*60+Number(s)}
