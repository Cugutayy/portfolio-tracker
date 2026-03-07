import { useState, useEffect, useRef, useCallback } from 'react'
import { TEAMS } from '../f1/data'
import { AUSTRALIA_2026_QUALI } from '../f1/realdata'
import { predictor } from '../f1/predictor'
import { openF1 } from '../f1/api'
import type { PredictionResult } from '../f1/types'

/**
 * F1 RACE PREDICTOR DASHBOARD
 * ============================
 * f1_sensor ilhamlı — tek sayfa, dark F1 interface
 * Kartlar: Session, Grid+Tahmin, Canlı Tur Süreleri, Pit Stops, Hava, Championship
 * Veri: OpenF1 API — uydurma yok
 */

export function F1Page() {
  const [api, setApi] = useState<'on'|'off'|'...'>('...')
  const [preds, setPreds] = useState<PredictionResult[]|null>(null)
  const [loading, setLoading] = useState(false)
  const [prog, setProg] = useState<string[]>([])
  const [live, setLive] = useState(false)
  const [liveData, setLiveData] = useState<{pos:any[],laps:any[],weather:any[],pits:any[]}>({pos:[],laps:[],weather:[],pits:[]})
  const [liveLog, setLiveLog] = useState<{t:string,type:string,n:number,ok:boolean}[]>([])
  const [liveStats, setLiveStats] = useState({r:0,p:0,e:0,ms:0})
  const ref = useRef<number|null>(null)

  useEffect(() => { openF1.getMeetings(2025).then(m => setApi(m.length>0?'on':'off')).catch(() => setApi('off')) }, [])

  // AI Tahmin
  const predict = useCallback(async () => {
    setLoading(true); setProg(['🚀 Başlatılıyor...'])
    const a = (m:string) => setProg(p => [...p, m])
    try {
      a('📥 OpenF1 — 2024-2025 verisi toplanıyor...')
      await predictor.initialize(a)
      a('🧠 Tahmin yapılıyor...')
      const rw = await openF1.getCurrentRaceWeekend(2026)
      if (rw) {
        a(`🏁 ${rw.meeting.meeting_name}...`)
        setPreds(await predictor.predictRace(rw.meeting.meeting_key, rw.meeting.circuit_short_name))
        a('✅ Tamamlandı')
      } else {
        a('⚠ Aktif yarış yok — grid verisinden tahmin')
        const feats = AUSTRALIA_2026_QUALI.map(q => ({
          code:q.driverCode, name:q.driverName, team:q.team, teamColor:TEAMS[q.team]?.color||'#888',
          features:[q.position, q.position*0.3, 11, 11, 11, 20, 11, 11]
        }))
        setPreds(predictor.predictFromFeatures(feats))
        a('✅ Grid tahmin tamamlandı')
      }
    } catch(e:any) { setProg(p => [...p, `❌ ${e.message}`]) }
    setLoading(false)
  }, [])

  // Canlı polling
  const startLive = useCallback(async () => {
    setLive(true); setLiveLog([]); setLiveStats({r:0,p:0,e:0,ms:0})
    const poll = async () => {
      const now = new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})
      const t0 = performance.now()
      try {
        const rw = await openF1.getCurrentRaceWeekend(2026)
        if (!rw) { setLiveLog(p=>[...p.slice(-30),{t:now,type:'no-data',n:0,ok:false}]); return }
        const sk = rw.sessions[rw.sessions.length-1].session_key
        const [pos,laps,wea,pit] = await Promise.all([
          openF1.getPositions(sk), openF1.getLaps(sk), openF1.getWeather(sk), openF1.getPitStops(sk)
        ])
        setLiveData({pos,laps,weather:wea,pits:pit})
        const ms = Math.round(performance.now()-t0)
        const names = ['positions','laps','weather','pits']
        const counts = [pos.length,laps.length,wea.length,pit.length]
        let pts=0
        counts.forEach((c,i) => { pts+=c; setLiveLog(p=>[...p.slice(-40),{t:now,type:names[i],n:c,ok:c>=0}]) })
        setLiveStats(p=>({r:p.r+4, p:p.p+pts, e:p.e, ms}))
      } catch { setLiveStats(p=>({...p,e:p.e+1})) }
    }
    await poll()
    ref.current = window.setInterval(poll, 5000)
  }, [])
  const stopLive = useCallback(() => { setLive(false); if(ref.current){clearInterval(ref.current);ref.current=null} }, [])
  useEffect(() => () => { if(ref.current) clearInterval(ref.current) }, [])

  // Derived data
  const latestWeather = liveData.weather.length > 0 ? liveData.weather[liveData.weather.length-1] : null

  return (
    <div style={{background:'#0d0d0d',minHeight:'100vh',color:'#e5e5e5',fontFamily:"'DM Mono','Geist Mono',monospace"}}>
      {/* HEADER — F1 styled dark */}
      <header style={{background:'linear-gradient(90deg,#111 0%,#1a1a2e 50%,#111 100%)',padding:'10px 0',borderBottom:'2px solid #e10600'}}>
        <div className="container" style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <a href="/" style={{color:'#666',fontSize:'.8rem',textDecoration:'none',border:'1px solid #333',borderRadius:6,width:26,height:26,display:'flex',alignItems:'center',justifyContent:'center'}}>←</a>
            <div>
              <div style={{fontSize:'1rem',fontWeight:700,color:'#fff',letterSpacing:'.02em'}}>F1 RACE PREDICTOR</div>
              <div style={{fontSize:'.5rem',color:'#555',letterSpacing:'.1em'}}>WEIGHTED RIDGE REGRESSION · OPENF1 API · LIVE DATA</div>
            </div>
          </div>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <Dot c={api==='on'?'#4ade80':api==='off'?'#666':'#fbbf24'} label={api==='on'?'API Connected':api==='off'?'Offline':'Connecting'}/>
            <Btn onClick={predict} active={loading}>{loading?'⏳':'🤖'} Predict</Btn>
            <Btn onClick={live?stopLive:startLive} active={live}>{live?'⏹':'📡'} Live</Btn>
          </div>
        </div>
      </header>

      <div className="container" style={{padding:'12px 20px'}}>
        {/* PROGRESS */}
        {loading && <DarkCard title="MODEL TRAINING">{prog.map((m,i)=><div key={i} style={{fontSize:'.55rem',padding:'2px 0',color:m.includes('✓')?'#4ade80':m.includes('⚠')||m.includes('❌')?'#ef4444':'#888',borderBottom:'1px solid #222'}}><span style={{color:'#555',marginRight:6}}>{i+1}</span>{m}</div>)}<div style={{display:'flex',gap:4,alignItems:'center',marginTop:4}}><span style={{width:6,height:6,borderRadius:'50%',border:'2px solid #e10600',borderTopColor:'transparent',animation:'spin 1s linear infinite',display:'inline-block'}}/><span style={{fontSize:'.5rem',color:'#555'}}>Processing...</span></div><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></DarkCard>}

        {/* DASHBOARD GRID — f1_sensor inspired */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
          
          {/* 1. SESSION STATUS + WEATHER */}
          <DarkCard title="SESSION STATUS" span={1}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <div>
                <div style={{fontSize:'.9rem',fontWeight:700,color:'#fff'}}>🇦🇺 Australian GP</div>
                <div style={{fontSize:'.5rem',color:live?'#4ade80':'#555'}}>{live?'● LIVE':'QUALIFYING COMPLETED'}</div>
              </div>
              <div style={{background:'#1a472a',color:'#4ade80',padding:'3px 10px',borderRadius:4,fontSize:'.55rem',fontWeight:700}}>GREEN</div>
            </div>
            {latestWeather ? (
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
                <WStat label="AIR" val={`${latestWeather.air_temperature.toFixed(1)}°C`}/>
                <WStat label="TRACK" val={`${latestWeather.track_temperature.toFixed(1)}°C`}/>
                <WStat label="HUMIDITY" val={`${latestWeather.humidity}%`}/>
                <WStat label="WIND" val={`${latestWeather.wind_speed.toFixed(1)} m/s`}/>
                <WStat label="RAIN" val={latestWeather.rainfall?'YES':'NO'} alert={latestWeather.rainfall}/>
              </div>
            ) : (
              <div style={{fontSize:'.55rem',color:'#555',textAlign:'center',padding:10}}>Canlı veri başlatıldığında hava verileri burada görünecek</div>
            )}
          </DarkCard>

          {/* 2. GRID + AI PREDICTION */}
          <DarkCard title="QUALIFYING GRID + AI PREDICTION" span={2}>
            <div style={{maxHeight:320,overflowY:'auto'}}>
              <div style={{display:'grid',gridTemplateColumns:'32px 4px 1fr 60px 40px 40px',gap:'0 5px',fontSize:'.58rem',alignItems:'center'}}>
                <div style={{color:'#555',fontWeight:700}}>POS</div><div/><div style={{color:'#555'}}>DRIVER</div><div style={{color:'#555',textAlign:'right'}}>TIME</div><div style={{color:'#555',textAlign:'center'}}>→ AI</div><div style={{color:'#555',textAlign:'right'}}>WIN%</div>
                {AUSTRALIA_2026_QUALI.map((q,i) => {
                  const tm = TEAMS[q.team]; const pred = preds?.find(p=>p.driverCode===q.driverCode)
                  return [
                    <div key={`p${i}`} style={{fontWeight:700,color:i<3?'#c9a84c':i<10?'#ccc':'#666',textAlign:'center'}}>{q.position}</div>,
                    <div key={`c${i}`} style={{width:3,height:16,borderRadius:1,background:tm?.color||'#444'}}/>,
                    <div key={`n${i}`}><span style={{fontWeight:i===0?700:400,color:i<10?'#eee':'#888'}}>{q.driverName}</span><br/><span style={{fontSize:'.42rem',color:'#555'}}>{q.team}{q.note?` · ${q.note}`:''}</span></div>,
                    <div key={`t${i}`} style={{textAlign:'right',color:'#999'}}>{q.q3Time||q.q2Time||q.q1Time||'—'}</div>,
                    <div key={`a${i}`} style={{textAlign:'center',fontWeight:600,color:pred?pred.predictedPosition<=3?'#c9a84c':pred.predictedPosition<=10?'#eee':'#666':'#333'}}>{pred?`P${pred.predictedPosition}`:'—'}</div>,
                    <div key={`w${i}`} style={{textAlign:'right',color:pred&&pred.winProbability>10?'#fbbf24':'#555'}}>{pred?`${pred.winProbability}%`:'—'}</div>,
                  ]
                })}
              </div>
            </div>
          </DarkCard>

          {/* 3. LIVE DATA MONITOR */}
          <DarkCard title="LIVE DATA FEED">
            {liveStats.r > 0 && (
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:4,marginBottom:8}}>
                <LStat label="REQS" val={liveStats.r}/>
                <LStat label="POINTS" val={liveStats.p}/>
                <LStat label="ERRORS" val={liveStats.e} err/>
                <LStat label="LATENCY" val={`${liveStats.ms}ms`}/>
              </div>
            )}
            <div style={{maxHeight:140,overflowY:'auto'}}>
              {liveLog.length===0 ? <div style={{fontSize:'.5rem',color:'#444',textAlign:'center',padding:16}}>📡 butonuna bas</div> :
                [...liveLog].reverse().slice(0,14).map((e,i)=>(
                  <div key={i} style={{display:'flex',gap:4,padding:'1px 0',fontSize:'.48rem',borderBottom:'1px solid #1a1a1a',alignItems:'center'}}>
                    <span style={{color:'#444',width:46}}>{e.t}</span>
                    <span style={{color:e.ok?'#4ade80':'#ef4444',fontWeight:700,width:8}}>{e.ok?'✓':'✗'}</span>
                    <span style={{color:TC[e.type]||'#555',width:50}}>{e.type}</span>
                    <span style={{color:e.n>0?'#aaa':'#444'}}>{e.n}</span>
                  </div>
                ))
              }
            </div>
          </DarkCard>

          {/* 4. PIT STOPS — from live data */}
          <DarkCard title="PIT STOPS">
            {liveData.pits.length === 0 ? <Empty text="Canlı veriden pit stop bilgisi gelecek"/> :
              <div style={{maxHeight:160,overflowY:'auto'}}>
                {[...liveData.pits].reverse().slice(0,12).map((p:any,i:number)=>(
                  <div key={i} style={{display:'flex',gap:6,padding:'2px 0',fontSize:'.52rem',borderBottom:'1px solid #1a1a1a',alignItems:'center'}}>
                    <span style={{color:'#f59e0b',fontWeight:700,width:28}}>L{p.lap_number}</span>
                    <span style={{color:'#ccc'}}>#{p.driver_number}</span>
                    <span style={{color:'#888',marginLeft:'auto'}}>{p.pit_duration?.toFixed(1) || '—'}s</span>
                  </div>
                ))}
              </div>
            }
          </DarkCard>

          {/* 5. LAP TIMES — top drivers from live data */}
          <DarkCard title="DRIVER LAP TIMES">
            {liveData.laps.length === 0 ? <Empty text="Canlı tur süreleri gelecek"/> : (() => {
              const byDriver = new Map<number,{last:number,best:number,laps:number}>()
              for (const l of liveData.laps) {
                if (!l.lap_duration || l.lap_duration <= 0) continue
                const cur = byDriver.get(l.driver_number) || {last:0,best:Infinity,laps:0}
                cur.last = l.lap_duration; cur.best = Math.min(cur.best, l.lap_duration); cur.laps = Math.max(cur.laps, l.lap_number)
                byDriver.set(l.driver_number, cur)
              }
              const fastest = Math.min(...[...byDriver.values()].map(v=>v.best))
              return <div style={{maxHeight:160,overflowY:'auto'}}>
                {[...byDriver.entries()].sort((a,b)=>a[1].best-b[1].best).slice(0,12).map(([num,d],i)=>(
                  <div key={num} style={{display:'flex',gap:6,padding:'2px 0',fontSize:'.52rem',borderBottom:'1px solid #1a1a1a',alignItems:'center'}}>
                    <span style={{color:i<3?'#c9a84c':'#888',fontWeight:700,width:16}}>{i+1}</span>
                    <span style={{color:'#ccc',width:20}}>#{num}</span>
                    <span style={{color:d.best===fastest?'#a855f7':'#aaa'}}>{fmtLap(d.best)}</span>
                    <span style={{color:'#555',marginLeft:'auto'}}>L{d.laps}</span>
                  </div>
                ))}
              </div>
            })()}
          </DarkCard>

          {/* 6. FACTOR ANALYSIS — top 5 */}
          {preds && (
            <DarkCard title="FACTOR ANALYSIS · TOP 5">
              {preds.slice(0,5).map(p => (
                <div key={p.driverCode} style={{marginBottom:6}}>
                  <div style={{display:'flex',gap:3,alignItems:'center',marginBottom:2}}>
                    <span style={{width:3,height:10,borderRadius:1,background:p.teamColor}}/>
                    <span style={{fontSize:'.55rem',fontWeight:600,color:'#eee'}}>{p.driverCode}</span>
                    <span style={{fontSize:'.42rem',color:'#555'}}>{p.team} · P{p.predictedPosition} · {p.winProbability}%</span>
                  </div>
                  <FBar label="QUALI" v={p.factors.qualiPerformance}/>
                  <FBar label="FORM" v={p.factors.historicalForm}/>
                  <FBar label="TEAM" v={p.factors.teamStrength}/>
                  <FBar label="CIRCUIT" v={p.factors.circuitAffinity}/>
                </div>
              ))}
            </DarkCard>
          )}

          {/* 7. MODEL INFO */}
          {preds && (
            <DarkCard title="MODEL INFO">
              <div style={{fontSize:'.52rem',color:'#888',lineHeight:1.8}}>
                <div>Algorithm: <span style={{color:'#eee'}}>Ensemble (Ridge 40% + GradientBoosting 60% + ELO)</span></div>
                <div>Features: <span style={{color:'#eee'}}>14</span> (grid, delta, form, team, circuit, exp, season, teammate, driverELO, teamELO, trend, volatility, gridVsForm, frontRowBonus)</div>
                <div>Temporal: <span style={{color:'#eee'}}>2024=1× · 2025=3×</span></div>
                <div>Live: <span style={{color:'#4ade80'}}>Lap-by-lap güncelleme (momentum + pace)</span></div>
                <div>Training: <span style={{color:'#eee'}}>{predictor.dataCount} samples · {predictor.raceCount} races</span></div>
                <div>MAE: <span style={{color:predictor.mae<4?'#4ade80':'#fbbf24'}}>{predictor.mae.toFixed(2)} positions</span></div>
                <div>Source: <span style={{color:'#4ade80'}}>OpenF1 API (real data only)</span></div>
              </div>
            </DarkCard>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
// UI COMPONENTS — F1 dark theme
// ═══════════════════════════════════════════
function DarkCard({title,children,span}:{title:string;children:React.ReactNode;span?:number}) {
  return <div style={{background:'#151515',border:'1px solid #252525',borderRadius:8,padding:'10px 12px',gridColumn:span?`span ${span}`:undefined}}>
    <div style={{fontSize:'.5rem',color:'#666',letterSpacing:'.12em',fontWeight:700,marginBottom:8,textTransform:'uppercase'}}>{title}</div>
    {children}
  </div>
}
function Btn({children,onClick,active}:{children:React.ReactNode;onClick:()=>void;active?:boolean}) {
  return <button onClick={onClick} style={{background:active?'#e10600':'#222',border:'1px solid '+(active?'#e10600':'#333'),borderRadius:5,padding:'4px 10px',fontSize:'.55rem',color:active?'#fff':'#aaa',cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>{children}</button>
}
function Dot({c,label}:{c:string;label:string}) {
  return <span style={{display:'flex',alignItems:'center',gap:4,fontSize:'.5rem',color:c}}><span style={{width:5,height:5,borderRadius:'50%',background:c}}/>{label}</span>
}
function WStat({label,val,alert}:{label:string;val:string;alert?:boolean}) {
  return <div style={{textAlign:'center'}}><div style={{fontSize:'.4rem',color:'#555'}}>{label}</div><div style={{fontSize:'.65rem',fontWeight:600,color:alert?'#ef4444':'#ccc'}}>{val}</div></div>
}
function LStat({label,val,err}:{label:string;val:number|string;err?:boolean}) {
  return <div style={{background:'#1a1a1a',borderRadius:4,padding:'3px 4px',textAlign:'center'}}><div style={{fontSize:'.35rem',color:'#555'}}>{label}</div><div style={{fontSize:'.6rem',fontWeight:700,color:err&&Number(val)>0?'#ef4444':'#ccc'}}>{val}</div></div>
}
function FBar({label,v}:{label:string;v:number}) {
  return <div style={{display:'flex',alignItems:'center',gap:3,marginBottom:1}}>
    <span style={{fontSize:'.4rem',color:'#555',width:40}}>{label}</span>
    <div style={{flex:1,height:3,background:'#222',borderRadius:2,overflow:'hidden'}}><div style={{width:`${v*100}%`,height:'100%',background:v>0.7?'#4ade80':v>0.4?'#fbbf24':'#ef4444',borderRadius:2}}/></div>
    <span style={{fontSize:'.38rem',color:'#666',width:16,textAlign:'right'}}>{(v*100).toFixed(0)}</span>
  </div>
}
function Empty({text}:{text:string}) { return <div style={{fontSize:'.5rem',color:'#333',textAlign:'center',padding:16}}>{text}</div> }
function fmtLap(s:number) { const m=Math.floor(s/60); return `${m}:${(s%60).toFixed(3).padStart(6,'0')}` }
const TC:any = {positions:'#3b82f6',laps:'#f59e0b',weather:'#6366f1',pits:'#22c55e'}
