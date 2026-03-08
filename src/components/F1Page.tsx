import { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react'
import { TEAMS } from '../f1/data'
import { AUSTRALIA_2026_QUALI } from '../f1/realdata'
import { predictor } from '../f1/predictor'
import { openF1 } from '../f1/api'
import type { PredictionResult } from '../f1/types'

// Spline 3D — lazy loaded, kasmaz
const Spline = lazy(() => import('@splinetool/react-spline'))

export function F1Page() {
  const [preds, setPreds] = useState<PredictionResult[]|null>(null)
  const [live, setLive] = useState(false)
  const [lap, setLap] = useState(0)
  const [weather, setWeather] = useState<any>(null)
  const [raceCtrl, setRaceCtrl] = useState<any[]>([])
  const [stints, setStints] = useState<any[]>([])
  const [laps, setLaps] = useState<any[]>([])
  const [telemetry, setTelemetry] = useState<Map<number,{speed:number,rpm:number,gear:number,throttle:number,brake:number}>>(new Map())
  const [log, setLog] = useState<{t:string,n:number,ms:number}[]>([])
  const ref = useRef<number|null>(null)

  // Sayfa açılınca grid'den tahmin
  useEffect(() => {
    const grid = AUSTRALIA_2026_QUALI.map(q => ({
      code:q.driverCode, name:q.driverName, team:q.team,
      teamColor:TEAMS[q.team]?.color||'#888', position:q.position,
      qualiDelta:(q.q3Time?pT(q.q3Time):q.q2Time?pT(q.q2Time):q.q1Time?pT(q.q1Time):83)-78.518
    }))
    setPreds(predictor.predictFromGrid(grid))
  }, [])

  // TEK BUTON
  const toggle = useCallback(async () => {
    if (live) { setLive(false); if(ref.current){clearInterval(ref.current);ref.current=null}; return }
    setLive(true); setLog([])
    try {
      const rw = await openF1.getCurrentRaceWeekend(2026)
      if (!rw) { setLog([{t:nw(),n:0,ms:0}]); return }
      const sk = rw.sessions[rw.sessions.length-1].session_key
      const poll = async () => {
        const t0 = performance.now()
        // Ana veri
        const r = await predictor.fetchAndPredict(sk)
        // Telemetri (car_data) — ayrı çek, en son snapshot
        let telem = new Map<number,{speed:number,rpm:number,gear:number,throttle:number,brake:number}>()
        try {
          const cd = await openF1.getCarData(sk)
          for (const c of cd) telem.set(c.driver_number, {speed:c.speed||0,rpm:c.rpm||0,gear:c.n_gear||0,throttle:c.throttle||0,brake:c.brake||0})
        } catch {}
        setTelemetry(telem)
        const ms = Math.round(performance.now()-t0)
        if (r) { setPreds(r.predictions); setLap(r.lap); setWeather(r.weather); setRaceCtrl(r.raceControl); setStints(r.stints); setLaps(r.laps) }
        setLog(p => [...p.slice(-20), {t:nw(), n:r?.predictions.length||0, ms}])
      }
      await poll()
      ref.current = window.setInterval(poll, 5000)
    } catch { setLog(p => [...p, {t:nw(),n:0,ms:0}]) }
  }, [live])

  useEffect(() => () => { if(ref.current) clearInterval(ref.current) }, [])

  // Sektör hesapla
  const sectorData = new Map<number,{s1:number|null,s2:number|null,s3:number|null,best:number}>()
  for (const l of laps) {
    const c = sectorData.get(l.driver_number) || {s1:null,s2:null,s3:null,best:Infinity}
    c.s1=l.duration_sector_1; c.s2=l.duration_sector_2; c.s3=l.duration_sector_3
    if (l.lap_duration && l.lap_duration>0 && l.lap_duration<c.best) c.best=l.lap_duration
    sectorData.set(l.driver_number, c)
  }
  const bS1=Math.min(...[...sectorData.values()].map(s=>s.s1||Infinity))
  const bS2=Math.min(...[...sectorData.values()].map(s=>s.s2||Infinity))
  const bS3=Math.min(...[...sectorData.values()].map(s=>s.s3||Infinity))
  const bLap=Math.min(...[...sectorData.values()].map(s=>s.best||Infinity))

  // Driver number mapping
  const DN: Record<string,number> = {RUS:63,ANT:12,HAD:20,LEC:16,PIA:81,NOR:4,HAM:44,LAW:30,LIN:40,BOR:5,HUL:27,BEA:87,OCO:31,GAS:10,ALB:23,COL:43,ALO:14,PER:11,BOT:77,VER:1,SAI:55,STR:18}

  return (
    <div style={{background:'#0d0d0d',minHeight:'100vh',color:'#e5e5e5',fontFamily:"'DM Mono','Geist Mono',monospace"}}>
      {/* HEADER */}
      <header style={{background:'#111',padding:'8px 0',borderBottom:'2px solid #e10600'}}>
        <div className="container" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <a href="/" style={{color:'#555',textDecoration:'none',border:'1px solid #333',borderRadius:6,width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.7rem'}}>←</a>
            <div>
              <span style={{fontSize:'.9rem',fontWeight:700,color:'#fff'}}>F1 PREDICTOR</span>
              <span style={{fontSize:'.42rem',color:'#444',marginLeft:8}}>ENSEMBLE ML · LIVE LAP-BY-LAP</span>
            </div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {lap>0 && <span style={{fontSize:'.65rem',color:'#e10600',fontWeight:700}}>LAP {lap}/58</span>}
            {weather && <span style={{fontSize:'.48rem',color:'#555'}}>{weather.rainfall?'🌧':'☀'}{weather.air_temperature?.toFixed(0)}° T{weather.track_temperature?.toFixed(0)}°</span>}
            <button onClick={toggle} style={{background:live?'#e10600':'#222',border:`1px solid ${live?'#e10600':'#444'}`,borderRadius:5,padding:'5px 14px',fontSize:'.55rem',color:'#fff',cursor:'pointer',fontFamily:'inherit',fontWeight:700,display:'flex',alignItems:'center',gap:5}}>
              {live && <span style={{width:6,height:6,borderRadius:'50%',background:'#4ade80',animation:'pd 1s ease-in-out infinite'}}/>}
              {live ? 'STOP' : '▶ START LIVE'}
            </button>
          </div>
        </div>
      </header>

      <div className="container" style={{padding:'10px 16px'}}>
        {/* Hero — 3D arka plan + tahmin */}
        <div style={{borderRadius:12,marginBottom:10,border:'1px solid #222',display:'flex',alignItems:'center',position:'relative',overflow:'hidden',minHeight:180,background:'linear-gradient(135deg,#080810 0%,#0c0c1e 30%,#161222 60%,#0a0f18 100%)'}}>
          {/* Spline 3D arka plan */}
          <div style={{position:'absolute',inset:0,zIndex:0,opacity:0.6}}>
            <Suspense fallback={null}>
              <Spline scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode" style={{width:'100%',height:'100%'}}/>
            </Suspense>
          </div>
          {/* Gradient overlay — sol taraf okunabilir olsun */}
          <div style={{position:'absolute',inset:0,zIndex:1,background:'linear-gradient(90deg, rgba(8,8,16,0.95) 0%, rgba(8,8,16,0.7) 40%, rgba(8,8,16,0.2) 70%, transparent 100%)',pointerEvents:'none'}}/>
          {/* Spotlight efekti */}
          <div style={{position:'absolute',top:'-30%',left:'10%',width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(225,6,0,0.08),transparent 60%)',pointerEvents:'none',zIndex:1}}/>
          
          {/* İçerik */}
          <div style={{position:'relative',zIndex:2,padding:'20px 24px',flex:1}}>
            <div style={{fontSize:'.38rem',color:'#555',letterSpacing:'.12em'}}>AUSTRALIAN GRAND PRIX 2026</div>
            <div style={{fontSize:'.5rem',color:'#444',marginTop:2}}>Albert Park · 58 Laps · 5.278 km</div>
            {preds && preds[0] && (
              <div style={{marginTop:10}}>
                <div style={{fontSize:'.35rem',color:'#666',letterSpacing:'.1em'}}>PREDICTED WINNER</div>
                <div style={{fontSize:'1.4rem',fontWeight:700,color:'#c9a84c',lineHeight:1.1}}>{preds[0].driverName}</div>
                <div style={{fontSize:'.5rem',color:preds[0].teamColor,marginTop:2}}>{preds[0].team} · {preds[0].winProbability}% win probability</div>
              </div>
            )}
          </div>
          {/* Podyum */}
          {preds && (
            <div style={{position:'relative',zIndex:2,padding:'20px 24px',display:'flex',gap:16}}>
              {preds.slice(0,3).map((p,i) => (
                <div key={p.driverCode} style={{textAlign:'center'}}>
                  <div style={{fontSize:'.32rem',color:'#555'}}>P{i+1}</div>
                  <div style={{fontSize:'.8rem',fontWeight:700,color:i===0?'#c9a84c':i===1?'#c0c0c0':'#cd7f32'}}>{p.driverCode}</div>
                  <div style={{fontSize:'.38rem',color:'#555'}}>{p.winProbability}%</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MAIN 3-COLUMN GRID */}
        <div style={{display:'grid',gridTemplateColumns:'1.4fr 0.8fr 0.8fr',gap:8}}>

          {/* COL 1: Grid + Sectors */}
          <DC title="🇦🇺 GRID · SECTORS · PREDICTION">
            <div style={{overflowX:'auto',overflowY:'auto',maxHeight:480}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.5rem'}}>
                <thead><tr style={{color:'#444',borderBottom:'1px solid #333'}}>
                  <th style={th}>P</th><th style={{width:3}}></th><th style={{...th,textAlign:'left'}}>DRIVER</th>
                  <th style={{...th,width:48}}>TIME</th>
                  <th style={{...th,width:40,color:'#a855f7'}}>S1</th><th style={{...th,width:40,color:'#a855f7'}}>S2</th><th style={{...th,width:40,color:'#a855f7'}}>S3</th>
                  <th style={{...th,width:30}}>AI</th><th style={{...th,width:30}}>W%</th>
                </tr></thead>
                <tbody>
                  {AUSTRALIA_2026_QUALI.map((q,i) => {
                    const tm=TEAMS[q.team]; const pr=preds?.find(p=>p.driverCode===q.driverCode)
                    const dn=DN[q.driverCode]||0; const sec=sectorData.get(dn)
                    const s1p=sec?.s1!=null&&sec.s1<=bS1, s2p=sec?.s2!=null&&sec.s2<=bS2, s3p=sec?.s3!=null&&sec.s3<=bS3
                    const lp=sec?.best!=null&&sec.best<=bLap&&sec.best<Infinity
                    return <tr key={q.driverCode} style={{borderBottom:'1px solid #1a1a1a',background:lp?'rgba(168,85,247,0.05)':i<3?'rgba(201,168,76,0.03)':'transparent'}}>
                      <td style={{textAlign:'center',fontWeight:700,color:i<3?'#c9a84c':i<10?'#bbb':'#555',padding:'3px 2px'}}>{q.position}</td>
                      <td><div style={{width:3,height:14,borderRadius:1,background:tm?.color||'#444'}}/></td>
                      <td style={{padding:'3px 4px'}}><span style={{fontWeight:i<3?700:400,color:i<10?'#eee':'#777',fontSize:'.52rem'}}>{q.driverName}</span><br/><span style={{fontSize:'.35rem',color:'#444'}}>{q.team}</span></td>
                      <td style={{textAlign:'right',color:lp?'#a855f7':'#777',fontWeight:lp?700:400}}>{q.q3Time||q.q2Time||q.q1Time||'—'}</td>
                      <td style={{textAlign:'center',color:s1p?'#a855f7':sec?.s1?'#4ade80':'#333',fontWeight:s1p?700:400}}>{sec?.s1?.toFixed(3)||'—'}</td>
                      <td style={{textAlign:'center',color:s2p?'#a855f7':sec?.s2?'#fbbf24':'#333',fontWeight:s2p?700:400}}>{sec?.s2?.toFixed(3)||'—'}</td>
                      <td style={{textAlign:'center',color:s3p?'#a855f7':sec?.s3?'#4ade80':'#333',fontWeight:s3p?700:400}}>{sec?.s3?.toFixed(3)||'—'}</td>
                      <td style={{textAlign:'center',fontWeight:700,color:pr?pr.predictedPosition<=3?'#c9a84c':pr.predictedPosition<=10?'#eee':'#555':'#333'}}>P{pr?.predictedPosition||'—'}</td>
                      <td style={{textAlign:'right',color:pr&&pr.winProbability>10?'#fbbf24':'#555'}}>{pr?`${pr.winProbability}%`:'—'}</td>
                    </tr>
                  })}
                </tbody>
              </table>
            </div>
            <div style={{display:'flex',gap:10,marginTop:6,fontSize:'.38rem',color:'#444'}}>
              <span><span style={{color:'#a855f7'}}>■</span> Fastest</span>
              <span><span style={{color:'#4ade80'}}>■</span> Personal best</span>
              <span><span style={{color:'#fbbf24'}}>■</span> Sector</span>
            </div>
          </DC>

          {/* COL 2: Telemetry + Tyres + Race Control */}
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {/* TELEMETRY — top 6 */}
            <DC title="📡 TELEMETRY · TOP 6">
              {telemetry.size === 0 ? <Empty text="Canlı telemetri bekleniyor"/> :
                <div style={{fontSize:'.48rem'}}>
                  <div style={{display:'grid',gridTemplateColumns:'24px 1fr 30px 28px 16px 30px 26px',gap:'0 3px',color:'#444',marginBottom:3,fontSize:'.38rem'}}>
                    <div>#</div><div>SPD</div><div>RPM</div><div>GEAR</div><div></div><div>THR</div><div>BRK</div>
                  </div>
                  {AUSTRALIA_2026_QUALI.slice(0,6).map(q => {
                    const dn=DN[q.driverCode]||0; const t=telemetry.get(dn); const tm=TEAMS[q.team]
                    if (!t) return <div key={q.driverCode} style={{padding:'2px 0',color:'#333',fontSize:'.42rem'}}>{q.driverCode} —</div>
                    return <div key={q.driverCode} style={{display:'grid',gridTemplateColumns:'24px 1fr 30px 28px 16px 30px 26px',gap:'0 3px',padding:'2px 0',borderBottom:'1px solid #1a1a1a',alignItems:'center'}}>
                      <span style={{color:tm?.color||'#888',fontWeight:700,fontSize:'.45rem'}}>{q.driverCode}</span>
                      {/* Speed bar */}
                      <div style={{height:6,background:'#222',borderRadius:2,overflow:'hidden'}}>
                        <div style={{width:`${Math.min(t.speed/360*100,100)}%`,height:'100%',borderRadius:2,background:t.speed>300?'#a855f7':t.speed>200?'#4ade80':'#fbbf24'}}/>
                      </div>
                      <span style={{color:'#ccc',textAlign:'right'}}>{t.speed}</span>
                      <span style={{color:'#888',textAlign:'right'}}>{t.rpm>0?`${(t.rpm/1000).toFixed(0)}k`:'-'}</span>
                      <span style={{color:'#ccc',textAlign:'center',fontWeight:700}}>{t.gear||'-'}</span>
                      {/* Throttle bar */}
                      <div style={{height:4,background:'#222',borderRadius:2,overflow:'hidden'}}>
                        <div style={{width:`${t.throttle}%`,height:'100%',borderRadius:2,background:'#4ade80'}}/>
                      </div>
                      {/* Brake */}
                      <div style={{height:4,background:'#222',borderRadius:2,overflow:'hidden'}}>
                        <div style={{width:`${t.brake}%`,height:'100%',borderRadius:2,background:'#ef4444'}}/>
                      </div>
                    </div>
                  })}
                </div>
              }
            </DC>

            {/* TYRE STINTS */}
            <DC title="TYRE STINTS">
              {stints.length===0 ? <Empty text="Lastik verileri"/> : (() => {
                const bd=new Map<number,{c:string;l:number}[]>()
                for (const s of stints) { if(!bd.has(s.driver_number)) bd.set(s.driver_number,[]); bd.get(s.driver_number)!.push({c:s.compound||'?',l:s.tyre_age_at_start||0}) }
                return <div style={{maxHeight:120,overflowY:'auto'}}>
                  {[...bd.entries()].slice(0,10).map(([n,st])=>(
                    <div key={n} style={{display:'flex',gap:3,padding:'2px 0',fontSize:'.45rem',borderBottom:'1px solid #1a1a1a',alignItems:'center'}}>
                      <span style={{color:'#666',width:18}}>#{n}</span>
                      {st.map((s,i)=>(<span key={i} style={{padding:'1px 4px',borderRadius:3,fontSize:'.38rem',fontWeight:700,background:tyreBg(s.c),color:s.c==='HARD'||s.c==='MEDIUM'?'#000':'#fff'}}>{s.c?.[0]||'?'}</span>))}
                    </div>
                  ))}
                </div>
              })()}
            </DC>

            {/* RACE CONTROL */}
            <DC title="RACE CONTROL">
              {raceCtrl.length===0 ? <Empty text="Race control"/> :
                <div style={{maxHeight:100,overflowY:'auto'}}>
                  {[...raceCtrl].reverse().slice(0,6).map((rc:any,i:number)=>(
                    <div key={i} style={{display:'flex',gap:4,padding:'2px 0',fontSize:'.44rem',borderBottom:'1px solid #1a1a1a'}}>
                      <span style={{padding:'1px 4px',borderRadius:3,fontWeight:700,fontSize:'.38rem',background:flagBg(rc.flag),color:'#fff'}}>{rc.flag||'—'}</span>
                      <span style={{color:'#888'}}>{rc.message?.slice(0,60)}</span>
                    </div>
                  ))}
                </div>
              }
            </DC>
          </div>

          {/* COL 3: Factors + Feed + Model */}
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {/* FACTORS */}
            {preds && <DC title="TOP 5 FACTORS">
              {preds.slice(0,5).map(p => (
                <div key={p.driverCode} style={{marginBottom:5}}>
                  <div style={{display:'flex',gap:3,alignItems:'center',marginBottom:1}}>
                    <span style={{width:3,height:8,borderRadius:1,background:p.teamColor}}/>
                    <span style={{fontSize:'.48rem',fontWeight:600,color:'#eee'}}>{p.driverCode}</span>
                    <span style={{fontSize:'.36rem',color:'#555'}}>P{p.predictedPosition} · {p.winProbability}%</span>
                  </div>
                  <FB l="QUALI" v={p.factors.qualiPerformance}/>
                  <FB l="FORM" v={p.factors.historicalForm}/>
                  <FB l="TEAM" v={p.factors.teamStrength}/>
                </div>
              ))}
            </DC>}

            {/* LIVE FEED */}
            <DC title="DATA FEED">
              {log.length===0 ? <Empty text="▶ START LIVE"/> :
                <div style={{maxHeight:90,overflowY:'auto'}}>
                  {[...log].reverse().slice(0,8).map((e,i)=>(
                    <div key={i} style={{display:'flex',gap:4,padding:'1px 0',fontSize:'.42rem',borderBottom:'1px solid #1a1a1a'}}>
                      <span style={{color:'#444',width:44}}>{e.t}</span>
                      <span style={{color:e.n>0?'#4ade80':'#ef4444',width:8,fontWeight:700}}>{e.n>0?'✓':'✗'}</span>
                      <span style={{color:'#555'}}>{e.n} · {e.ms}ms</span>
                    </div>
                  ))}
                </div>
              }
            </DC>

            {/* MODEL */}
            <DC title="MODEL">
              <div style={{fontSize:'.42rem',color:'#555',lineHeight:1.7}}>
                <div>Ensemble: <span style={{color:'#ccc'}}>Ridge 40% + GB 60% + ELO</span></div>
                <div>Features: <span style={{color:'#ccc'}}>14</span> · Temporal: <span style={{color:'#ccc'}}>2025=3×</span></div>
                <div>Telemetry: <span style={{color:telemetry.size>0?'#4ade80':'#555'}}>{telemetry.size>0?`${telemetry.size} cars live`:'Waiting'}</span></div>
                <div>Live: <span style={{color:live?'#4ade80':'#555'}}>{live?`Lap ${lap} · 5s`:'Off'}</span></div>
              </div>
            </DC>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
const th: React.CSSProperties = {textAlign:'center',padding:'3px 2px',fontWeight:700}
function DC({title,children}:{title:string;children:React.ReactNode}) {
  return <div style={{background:'#151515',border:'1px solid #222',borderRadius:8,padding:'8px 10px'}}>
    <div style={{fontSize:'.44rem',color:'#555',letterSpacing:'.1em',fontWeight:700,marginBottom:6}}>{title}</div>{children}
  </div>
}
function FB({l,v}:{l:string;v:number}) {
  return <div style={{display:'flex',alignItems:'center',gap:3,marginBottom:1}}>
    <span style={{fontSize:'.36rem',color:'#444',width:28}}>{l}</span>
    <div style={{flex:1,height:3,background:'#222',borderRadius:2,overflow:'hidden'}}><div style={{width:`${v*100}%`,height:'100%',background:v>0.7?'#4ade80':v>0.4?'#fbbf24':'#ef4444',borderRadius:2}}/></div>
  </div>
}
function Empty({text}:{text:string}) { return <div style={{fontSize:'.44rem',color:'#333',textAlign:'center',padding:10}}>{text}</div> }
function nw() { return new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) }
function pT(t:string):number { const [m,s]=t.split(':'); return Number(m)*60+Number(s) }
function flagBg(f:string) { return f==='GREEN'?'#166534':f==='YELLOW'?'#854d0e':f==='RED'?'#991b1b':'#333' }
function tyreBg(c:string) { return c==='SOFT'?'#dc2626':c==='MEDIUM'?'#eab308':c==='HARD'?'#ddd':c==='INTERMEDIATE'?'#22c55e':'#3b82f6' }
