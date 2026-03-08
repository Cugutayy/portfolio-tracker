import { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react'
import { TEAMS } from '../f1/data'
import { AUSTRALIA_2026_QUALI } from '../f1/realdata'
import { predictor } from '../f1/predictor'
import { openF1 } from '../f1/api'
import type { PredictionResult } from '../f1/types'

const Spline = lazy(() => import('@splinetool/react-spline'))

/* ═══════════════════════════════════════════
   F1 RACE PREDICTOR — IMMERSIVE DASHBOARD
   Carbon fiber aesthetic + racing red accents
   ═══════════════════════════════════════════ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes scanline{from{transform:translateY(-100%)}to{transform:translateY(100%)}}
@keyframes glow{0%,100%{box-shadow:0 0 8px rgba(225,6,0,0.3)}50%{box-shadow:0 0 20px rgba(225,6,0,0.6)}}
.f1-body{background:#08080a;min-height:100vh;color:#e8e8e8;font-family:'JetBrains Mono',monospace;position:relative;overflow-x:hidden}
.f1-body::before{content:'';position:fixed;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,.008) 2px,rgba(255,255,255,.008) 4px);pointer-events:none;z-index:0}
.f1-body::after{content:'';position:fixed;top:0;left:0;right:0;height:180px;background:linear-gradient(180deg,rgba(225,6,0,.04) 0%,transparent 100%);pointer-events:none;z-index:0}
.f1-card{background:linear-gradient(145deg,#0f0f12 0%,#131316 100%);border:1px solid #1e1e24;border-radius:10px;padding:12px 14px;position:relative;overflow:hidden;animation:slideIn .4s ease both}
.f1-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(225,6,0,.3),transparent)}
.f1-card-title{font-size:.42rem;color:#666;letter-spacing:.14em;font-weight:700;margin-bottom:8px;text-transform:uppercase;font-family:'Outfit',sans-serif}
.f1-row{display:flex;align-items:center;gap:4px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.03);transition:background .15s}
.f1-row:hover{background:rgba(225,6,0,.03)}
.f1-purple{color:#a855f7!important;font-weight:700!important}
.f1-gold{color:#d4a843!important}
.f1-green{color:#22c55e}
.f1-red{color:#e10600}
.f1-dim{color:#3a3a42}
`

export function F1Page() {
  const [preds, setPreds] = useState<PredictionResult[]|null>(null)
  const [live, setLive] = useState(false)
  const [lap, setLap] = useState(0)
  const [weather, setWeather] = useState<any>(null)
  const [raceCtrl, setRaceCtrl] = useState<any[]>([])
  const [stints, setStints] = useState<any[]>([])
  const [laps, setLaps] = useState<any[]>([])
  const [telem, setTelem] = useState<Map<number,{speed:number,rpm:number,gear:number,throttle:number,brake:number}>>(new Map())
  const [log, setLog] = useState<{t:string,n:number,ms:number}[]>([])
  const ref = useRef<number|null>(null)

  useEffect(() => {
    const grid = AUSTRALIA_2026_QUALI.map(q => ({
      code:q.driverCode,name:q.driverName,team:q.team,teamColor:TEAMS[q.team]?.color||'#888',
      position:q.position,qualiDelta:(q.q3Time?pT(q.q3Time):q.q2Time?pT(q.q2Time):q.q1Time?pT(q.q1Time):83)-78.518
    }))
    setPreds(predictor.predictFromGrid(grid))
  }, [])

  const toggle = useCallback(async () => {
    if (live) { setLive(false); if(ref.current){clearInterval(ref.current);ref.current=null}; return }
    setLive(true); setLog([])
    try {
      const rw = await openF1.getCurrentRaceWeekend(2026)
      if (!rw) return
      const sk = rw.sessions[rw.sessions.length-1].session_key
      const poll = async () => {
        const t0 = performance.now()
        const r = await predictor.fetchAndPredict(sk)
        let tm = new Map<number,{speed:number,rpm:number,gear:number,throttle:number,brake:number}>()
        try { const cd = await openF1.getCarData(sk); for (const c of cd) tm.set(c.driver_number,{speed:c.speed||0,rpm:c.rpm||0,gear:c.n_gear||0,throttle:c.throttle||0,brake:c.brake||0}) } catch{}
        setTelem(tm)
        const ms = Math.round(performance.now()-t0)
        if (r) { setPreds(r.predictions);setLap(r.lap);setWeather(r.weather);setRaceCtrl(r.raceControl);setStints(r.stints);setLaps(r.laps) }
        setLog(p=>[...p.slice(-20),{t:nw(),n:r?.predictions.length||0,ms}])
      }
      await poll(); ref.current = window.setInterval(poll, 5000)
    } catch {}
  }, [live])

  useEffect(() => () => { if(ref.current) clearInterval(ref.current) }, [])

  // Sektör
  const sec = new Map<number,{s1:number|null,s2:number|null,s3:number|null,best:number}>()
  for (const l of laps) { const c=sec.get(l.driver_number)||{s1:null,s2:null,s3:null,best:Infinity};c.s1=l.duration_sector_1;c.s2=l.duration_sector_2;c.s3=l.duration_sector_3;if(l.lap_duration&&l.lap_duration>0&&l.lap_duration<c.best)c.best=l.lap_duration;sec.set(l.driver_number,c) }
  const bS1=Math.min(...[...sec.values()].map(s=>s.s1||Infinity))
  const bS2=Math.min(...[...sec.values()].map(s=>s.s2||Infinity))
  const bS3=Math.min(...[...sec.values()].map(s=>s.s3||Infinity))
  const DN:Record<string,number>={RUS:63,ANT:12,HAD:20,LEC:16,PIA:81,NOR:4,HAM:44,LAW:30,LIN:40,BOR:5,HUL:27,BEA:87,OCO:31,GAS:10,ALB:23,COL:43,ALO:14,PER:11,BOT:77,VER:1,SAI:55,STR:18}

  return (
    <div className="f1-body">
      <style>{CSS}</style>

      {/* ─── HEADER ─── */}
      <header style={{background:'rgba(12,12,14,.95)',backdropFilter:'blur(12px)',padding:'10px 0',borderBottom:'1px solid #1a1a1e',position:'sticky',top:0,zIndex:50}}>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'0 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <a href="/" style={{color:'#444',textDecoration:'none',fontSize:'.7rem',width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid #2a2a2e',borderRadius:6,transition:'border-color .2s'}}
              onMouseEnter={e=>(e.currentTarget.style.borderColor='#e10600')}
              onMouseLeave={e=>(e.currentTarget.style.borderColor='#2a2a2e')}>←</a>
            <div>
              <div style={{fontFamily:"'Outfit',sans-serif",fontSize:'1rem',fontWeight:800,color:'#fff',letterSpacing:'-.02em'}}>
                F1<span style={{color:'#e10600',marginLeft:4}}>PREDICTOR</span>
              </div>
              <div style={{fontSize:'.38rem',color:'#444',letterSpacing:'.12em',fontFamily:"'Outfit',sans-serif"}}>ENSEMBLE ML · REAL-TIME TELEMETRY</div>
            </div>
          </div>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            {lap>0 && <div style={{background:'#e10600',padding:'3px 10px',borderRadius:4,fontSize:'.55rem',fontWeight:700,color:'#fff',animation:live?'glow 2s infinite':'none'}}>LAP {lap}/58</div>}
            {weather && <div style={{fontSize:'.45rem',color:'#555',display:'flex',gap:6}}>
              <span>{weather.rainfall?'🌧':'☀'} {weather.air_temperature?.toFixed(0)}°</span>
              <span style={{color:'#333'}}>|</span>
              <span>T{weather.track_temperature?.toFixed(0)}°</span>
            </div>}
            <button onClick={toggle} style={{
              background:live?'linear-gradient(135deg,#e10600,#b30500)':'linear-gradient(135deg,#1a1a1e,#222228)',
              border:'none',borderRadius:6,padding:'7px 18px',fontSize:'.55rem',color:'#fff',cursor:'pointer',
              fontFamily:"'Outfit',sans-serif",fontWeight:700,display:'flex',alignItems:'center',gap:6,
              boxShadow:live?'0 0 16px rgba(225,6,0,.3)':'0 2px 8px rgba(0,0,0,.3)',transition:'all .2s',
            }}>
              {live && <span style={{width:6,height:6,borderRadius:'50%',background:'#4ade80',animation:'pulse 1s infinite'}}/>}
              {live ? '■ STOP' : '▶ START LIVE'}
            </button>
          </div>
        </div>
      </header>

      <div style={{maxWidth:1200,margin:'0 auto',padding:'14px 20px',position:'relative',zIndex:1}}>
        {/* ─── HERO ─── */}
        <div style={{borderRadius:14,marginBottom:12,position:'relative',overflow:'hidden',minHeight:200,background:'linear-gradient(135deg,#08080c 0%,#0e0c18 40%,#100a16 100%)',border:'1px solid #1a1a22'}}>
          {/* 3D Background */}
          <div style={{position:'absolute',inset:0,zIndex:0,opacity:.5}}>
            <Suspense fallback={null}><Spline scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode" style={{width:'100%',height:'100%'}}/></Suspense>
          </div>
          {/* Overlays */}
          <div style={{position:'absolute',inset:0,zIndex:1,background:'linear-gradient(90deg,rgba(8,8,12,.96) 0%,rgba(8,8,12,.75) 35%,rgba(8,8,12,.3) 65%,transparent 100%)',pointerEvents:'none'}}/>
          <div style={{position:'absolute',bottom:0,left:0,right:0,height:60,background:'linear-gradient(0deg,#08080a,transparent)',zIndex:1,pointerEvents:'none'}}/>
          {/* Red accent glow */}
          <div style={{position:'absolute',top:'-20%',left:'5%',width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(225,6,0,.06),transparent 60%)',pointerEvents:'none',zIndex:1}}/>

          <div style={{position:'relative',zIndex:2,padding:'28px 32px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontFamily:"'Outfit',sans-serif",fontSize:'.4rem',color:'#555',letterSpacing:'.15em',fontWeight:600}}>ROUND 1 · 2026 FORMULA ONE WORLD CHAMPIONSHIP</div>
              <div style={{fontFamily:"'Outfit',sans-serif",fontSize:'1.6rem',fontWeight:800,color:'#fff',letterSpacing:'-.02em',lineHeight:1,marginTop:6}}>
                Australian<br/>Grand Prix
              </div>
              <div style={{fontSize:'.48rem',color:'#444',marginTop:6}}>Albert Park · 58 Laps · 5.278 km · Melbourne</div>
              {preds?.[0] && (
                <div style={{marginTop:16,padding:'10px 16px',background:'rgba(212,168,67,.06)',border:'1px solid rgba(212,168,67,.15)',borderRadius:8,display:'inline-block'}}>
                  <div style={{fontSize:'.35rem',color:'#997a2e',letterSpacing:'.1em',fontFamily:"'Outfit',sans-serif",fontWeight:600}}>PREDICTED WINNER</div>
                  <div style={{fontFamily:"'Outfit',sans-serif",fontSize:'1.1rem',fontWeight:800,color:'#d4a843',lineHeight:1.1}}>{preds[0].driverName}</div>
                  <div style={{fontSize:'.46rem',color:preds[0].teamColor,marginTop:2}}>{preds[0].team} · {preds[0].winProbability}%</div>
                </div>
              )}
            </div>
            {/* Podium */}
            {preds && (
              <div style={{display:'flex',gap:6,alignItems:'flex-end'}}>
                {[1,0,2].map(idx => {
                  const p = preds[idx]; if(!p) return null
                  const h = idx===0?100:idx===1?80:60
                  return <div key={p.driverCode} style={{textAlign:'center',width:56}}>
                    <div style={{fontSize:'.6rem',fontWeight:800,color:idx===0?'#d4a843':idx===1?'#b0b0b0':'#a0704a',fontFamily:"'Outfit',sans-serif"}}>{p.driverCode}</div>
                    <div style={{fontSize:'.36rem',color:'#555'}}>{p.winProbability}%</div>
                    <div style={{height:h,background:idx===0?'linear-gradient(0deg,rgba(212,168,67,.15),rgba(212,168,67,.05))':idx===1?'linear-gradient(0deg,rgba(180,180,180,.1),rgba(180,180,180,.03))':'linear-gradient(0deg,rgba(160,112,74,.1),rgba(160,112,74,.03))',borderRadius:'4px 4px 0 0',marginTop:4,display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:6}}>
                      <span style={{fontSize:'.8rem',fontWeight:800,color:idx===0?'#d4a843':idx===1?'#999':'#8a6a4a',fontFamily:"'Outfit',sans-serif"}}>{idx+1}</span>
                    </div>
                  </div>
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── DASHBOARD GRID ─── */}
        <div style={{display:'grid',gridTemplateColumns:'1.5fr .85fr .65fr',gap:10}}>
          {/* COL 1: Grid + Sectors */}
          <div className="f1-card" style={{animationDelay:'.1s'}}>
            <div className="f1-card-title">QUALIFYING GRID · SECTORS · AI PREDICTION</div>
            <div style={{overflowY:'auto',maxHeight:500}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.48rem'}}>
                <thead><tr style={{color:'#444',borderBottom:'1px solid #1e1e24'}}>
                  <th style={{...TH,width:24}}>P</th><th style={{width:3}}></th><th style={{...TH,textAlign:'left'}}>DRIVER</th>
                  <th style={{...TH,width:50}}>TIME</th>
                  <th style={{...TH,width:38,color:'#a855f7'}}>S1</th><th style={{...TH,width:38,color:'#a855f7'}}>S2</th><th style={{...TH,width:38,color:'#a855f7'}}>S3</th>
                  <th style={{...TH,width:28}}>AI</th><th style={{...TH,width:28}}>W%</th>
                </tr></thead>
                <tbody>
                  {AUSTRALIA_2026_QUALI.map((q,i) => {
                    const tm=TEAMS[q.team];const pr=preds?.find(p=>p.driverCode===q.driverCode)
                    const dn=DN[q.driverCode]||0;const sd=sec.get(dn)
                    const s1p=sd?.s1!=null&&sd.s1<=bS1,s2p=sd?.s2!=null&&sd.s2<=bS2,s3p=sd?.s3!=null&&sd.s3<=bS3
                    const lp=sd?.best!=null&&sd.best<Infinity&&sd.best<=Math.min(...[...sec.values()].map(s=>s.best))
                    return <tr key={q.driverCode} className="f1-row" style={{background:lp?'rgba(168,85,247,.04)':'transparent'}}>
                      <td style={{textAlign:'center',fontWeight:800,color:i<3?'#d4a843':i<10?'#aaa':'#444',padding:'4px 2px',fontFamily:"'Outfit',sans-serif"}}>{q.position}</td>
                      <td><div style={{width:3,height:16,borderRadius:1,background:tm?.color||'#333'}}/></td>
                      <td style={{padding:'4px 5px'}}>
                        <div style={{fontFamily:"'Outfit',sans-serif",fontWeight:i<3?700:400,color:i<10?'#eee':'#666',fontSize:'.52rem'}}>{q.driverName}</div>
                        <div style={{fontSize:'.34rem',color:'#3a3a42'}}>{q.team}</div>
                      </td>
                      <td style={{textAlign:'right',color:lp?'#a855f7':'#666',fontWeight:lp?700:400}}>{q.q3Time||q.q2Time||q.q1Time||'—'}</td>
                      <td style={{textAlign:'center'}} className={s1p?'f1-purple':''}><span style={{color:s1p?undefined:sd?.s1?'#4ade80':'#2a2a2e'}}>{sd?.s1?.toFixed(3)||'—'}</span></td>
                      <td style={{textAlign:'center'}} className={s2p?'f1-purple':''}><span style={{color:s2p?undefined:sd?.s2?'#fbbf24':'#2a2a2e'}}>{sd?.s2?.toFixed(3)||'—'}</span></td>
                      <td style={{textAlign:'center'}} className={s3p?'f1-purple':''}><span style={{color:s3p?undefined:sd?.s3?'#4ade80':'#2a2a2e'}}>{sd?.s3?.toFixed(3)||'—'}</span></td>
                      <td style={{textAlign:'center',fontWeight:700,fontFamily:"'Outfit',sans-serif",color:pr?pr.predictedPosition<=3?'#d4a843':pr.predictedPosition<=10?'#ddd':'#555':'#2a2a2e'}}>P{pr?.predictedPosition||'—'}</td>
                      <td style={{textAlign:'right',color:pr&&pr.winProbability>10?'#fbbf24':'#3a3a42',fontSize:'.44rem'}}>{pr?`${pr.winProbability}%`:'—'}</td>
                    </tr>
                  })}
                </tbody>
              </table>
            </div>
            <div style={{display:'flex',gap:12,marginTop:8,fontSize:'.36rem',color:'#3a3a42'}}>
              <span><span style={{color:'#a855f7'}}>●</span> Fastest sector</span>
              <span><span style={{color:'#4ade80'}}>●</span> Personal best</span>
              <span><span style={{color:'#fbbf24'}}>●</span> Sector time</span>
            </div>
          </div>

          {/* COL 2: Telemetry + Tyres + RC */}
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <div className="f1-card" style={{animationDelay:'.2s'}}>
              <div className="f1-card-title">📡 LIVE TELEMETRY</div>
              {telem.size===0 ? <Emp text="Telemetri bekleniyor — ▶ START LIVE"/> :
                AUSTRALIA_2026_QUALI.slice(0,6).map(q => {
                  const d=DN[q.driverCode]||0;const t=telem.get(d);const tm=TEAMS[q.team]
                  if(!t) return null
                  return <div key={q.driverCode} style={{marginBottom:6}}>
                    <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:2}}>
                      <span style={{width:3,height:10,borderRadius:1,background:tm?.color||'#444'}}/>
                      <span style={{fontSize:'.46rem',fontWeight:700,color:tm?.color||'#888',fontFamily:"'Outfit',sans-serif"}}>{q.driverCode}</span>
                      <span style={{fontSize:'.65rem',fontWeight:800,color:'#eee',marginLeft:'auto',fontFamily:"'Outfit',sans-serif"}}>{t.speed}<span style={{fontSize:'.38rem',color:'#555',fontWeight:400}}> km/h</span></span>
                    </div>
                    <div style={{display:'flex',gap:3,height:5}}>
                      <div style={{flex:t.speed,background:t.speed>300?'#a855f7':t.speed>200?'#22c55e':'#fbbf24',borderRadius:2,transition:'flex .5s'}}/>
                      <div style={{flex:360-t.speed,background:'#1a1a1e',borderRadius:2}}/>
                    </div>
                    <div style={{display:'flex',gap:8,marginTop:2,fontSize:'.36rem',color:'#555'}}>
                      <span>G{t.gear}</span>
                      <span style={{color:'#4ade80'}}>THR {t.throttle}%</span>
                      <span style={{color:t.brake>0?'#ef4444':'#333'}}>BRK {t.brake}%</span>
                    </div>
                  </div>
                })
              }
            </div>

            <div className="f1-card" style={{animationDelay:'.3s'}}>
              <div className="f1-card-title">TYRE STRATEGY</div>
              {stints.length===0 ? <Emp text="Lastik verileri"/> : (() => {
                const bd=new Map<number,{c:string;l:number}[]>()
                for(const s of stints){if(!bd.has(s.driver_number))bd.set(s.driver_number,[]);bd.get(s.driver_number)!.push({c:s.compound||'?',l:s.tyre_age_at_start||0})}
                return [...bd.entries()].slice(0,8).map(([n,st])=>(
                  <div key={n} style={{display:'flex',gap:3,padding:'2px 0',borderBottom:'1px solid #1a1a1e',alignItems:'center',fontSize:'.43rem'}}>
                    <span style={{color:'#555',width:18}}>#{n}</span>
                    {st.map((s,i)=>(<span key={i} style={{padding:'2px 6px',borderRadius:4,fontSize:'.38rem',fontWeight:700,background:tyreBg(s.c),color:s.c==='HARD'||s.c==='MEDIUM'?'#000':'#fff'}}>{s.c?.[0]}</span>))}
                  </div>
                ))
              })()}
            </div>

            <div className="f1-card" style={{animationDelay:'.4s'}}>
              <div className="f1-card-title">RACE CONTROL</div>
              {raceCtrl.length===0 ? <Emp text="Race control mesajları"/> :
                [...raceCtrl].reverse().slice(0,5).map((rc:any,i:number)=>(
                  <div key={i} style={{display:'flex',gap:5,padding:'3px 0',borderBottom:'1px solid #1a1a1e',fontSize:'.42rem'}}>
                    <span style={{padding:'1px 5px',borderRadius:3,fontWeight:700,fontSize:'.36rem',background:flagBg(rc.flag),color:'#fff',flexShrink:0}}>{rc.flag||'—'}</span>
                    <span style={{color:'#777'}}>{rc.message?.slice(0,55)}</span>
                  </div>
                ))
              }
            </div>
          </div>

          {/* COL 3: Factors + Feed + Model */}
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {preds && <div className="f1-card" style={{animationDelay:'.2s'}}>
              <div className="f1-card-title">FACTOR ANALYSIS</div>
              {preds.slice(0,5).map(p => (
                <div key={p.driverCode} style={{marginBottom:6}}>
                  <div style={{display:'flex',gap:3,alignItems:'center',marginBottom:2}}>
                    <span style={{width:3,height:8,borderRadius:1,background:p.teamColor}}/>
                    <span style={{fontSize:'.46rem',fontWeight:700,color:'#eee',fontFamily:"'Outfit',sans-serif"}}>{p.driverCode}</span>
                    <span style={{fontSize:'.34rem',color:'#444',marginLeft:'auto'}}>P{p.predictedPosition} · {p.winProbability}%</span>
                  </div>
                  <Bar l="QUALI" v={p.factors.qualiPerformance}/>
                  <Bar l="FORM" v={p.factors.historicalForm}/>
                  <Bar l="TEAM" v={p.factors.teamStrength}/>
                </div>
              ))}
            </div>}

            <div className="f1-card" style={{animationDelay:'.3s'}}>
              <div className="f1-card-title">DATA FEED</div>
              {log.length===0 ? <Emp text="▶ START LIVE"/> :
                [...log].reverse().slice(0,6).map((e,i)=>(
                  <div key={i} style={{display:'flex',gap:4,padding:'1px 0',fontSize:'.4rem',borderBottom:'1px solid #1a1a1e'}}>
                    <span style={{color:'#333',width:44}}>{e.t}</span>
                    <span style={{color:e.n>0?'#22c55e':'#e10600',fontWeight:700}}>{e.n>0?'✓':'✗'}</span>
                    <span style={{color:'#444'}}>{e.ms}ms</span>
                  </div>
                ))
              }
            </div>

            <div className="f1-card" style={{animationDelay:'.4s'}}>
              <div className="f1-card-title">MODEL</div>
              <div style={{fontSize:'.4rem',color:'#444',lineHeight:1.8}}>
                <div>Ensemble <span style={{color:'#aaa'}}>Ridge 40% + GB 60%</span></div>
                <div>ELO <span style={{color:'#aaa'}}>Driver + Team ratings</span></div>
                <div>Features <span style={{color:'#aaa'}}>14</span> · Temporal <span style={{color:'#aaa'}}>2025×3</span></div>
                <div>Telem <span style={{color:telem.size>0?'#22c55e':'#333'}}>{telem.size>0?`${telem.size} cars`:'—'}</span></div>
                <div>Status <span style={{color:live?'#22c55e':'#333'}}>{live?`LIVE Lap ${lap}`:'OFF'}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── HELPERS ───
const TH:React.CSSProperties={textAlign:'center',padding:'4px 2px',fontWeight:700,fontFamily:"'Outfit',sans-serif"}
function Bar({l,v}:{l:string;v:number}) {
  const clr = v>.7?'#22c55e':v>.4?'#fbbf24':'#e10600'
  return <div style={{display:'flex',alignItems:'center',gap:3,marginBottom:1}}>
    <span style={{fontSize:'.34rem',color:'#3a3a42',width:26,fontFamily:"'Outfit',sans-serif"}}>{l}</span>
    <div style={{flex:1,height:3,background:'#1a1a1e',borderRadius:2,overflow:'hidden'}}><div style={{width:`${v*100}%`,height:'100%',background:clr,borderRadius:2,boxShadow:`0 0 6px ${clr}40`}}/></div>
  </div>
}
function Emp({text}:{text:string}){return<div style={{fontSize:'.42rem',color:'#2a2a2e',textAlign:'center',padding:12}}>{text}</div>}
function nw(){return new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
function pT(t:string):number{const[m,s]=t.split(':');return Number(m)*60+Number(s)}
function flagBg(f:string){return f==='GREEN'?'#166534':f==='YELLOW'?'#854d0e':f==='RED'?'#991b1b':f==='DOUBLE YELLOW'?'#78350f':'#2a2a2e'}
function tyreBg(c:string){return c==='SOFT'?'#dc2626':c==='MEDIUM'?'#eab308':c==='HARD'?'#e5e5e5':c==='INTERMEDIATE'?'#22c55e':'#3b82f6'}
