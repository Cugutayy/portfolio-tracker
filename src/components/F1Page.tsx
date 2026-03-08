import { useState, useEffect, useRef, useCallback } from 'react'
import { TEAMS } from '../f1/data'
import { AUSTRALIA_2026_QUALI } from '../f1/realdata'
import { predictor } from '../f1/predictor'
import { openF1 } from '../f1/api'
import type { PredictionResult } from '../f1/types'

export function F1Page() {
  const [preds, setPreds] = useState<PredictionResult[]|null>(null)
  const [live, setLive] = useState(false)
  const [lap, setLap] = useState(0)
  const [weather, setWeather] = useState<any>(null)
  const [raceCtrl, setRaceCtrl] = useState<any[]>([])
  const [stints, setStints] = useState<any[]>([])
  const [sectors, setSectors] = useState<Map<number, {s1:number|null,s2:number|null,s3:number|null,best:number}>>(new Map())
  const [log, setLog] = useState<{t:string,n:number,ms:number}[]>([])
  const ref = useRef<number|null>(null)

  // Sayfa açılınca hemen grid'den tahmin
  useEffect(() => {
    const grid = AUSTRALIA_2026_QUALI.map(q => ({
      code: q.driverCode, name: q.driverName, team: q.team,
      teamColor: TEAMS[q.team]?.color || '#888', position: q.position,
      qualiDelta: (q.q3Time ? pT(q.q3Time) : q.q2Time ? pT(q.q2Time) : q.q1Time ? pT(q.q1Time) : 83) - 78.518
    }))
    setPreds(predictor.predictFromGrid(grid))
  }, [])

  // TEK BUTON: canlı polling
  const toggle = useCallback(async () => {
    if (live) { setLive(false); if (ref.current) { clearInterval(ref.current); ref.current = null }; return }
    setLive(true); setLog([])
    try {
      const rw = await openF1.getCurrentRaceWeekend(2026)
      if (!rw) { setLog([{t:nw(),n:0,ms:0}]); return }
      const sk = rw.sessions[rw.sessions.length - 1].session_key
      const poll = async () => {
        const t0 = performance.now()
        const r = await predictor.fetchAndPredict(sk)
        const ms = Math.round(performance.now() - t0)
        if (r) {
          setPreds(r.predictions); setLap(r.lap); setWeather(r.weather)
          setRaceCtrl(r.raceControl); setStints(r.stints)
          // Sektör süreleri
          const sm = new Map<number, {s1:number|null,s2:number|null,s3:number|null,best:number}>()
          for (const l of r.laps) {
            const cur = sm.get(l.driver_number) || {s1:null,s2:null,s3:null,best:Infinity}
            cur.s1 = l.duration_sector_1; cur.s2 = l.duration_sector_2; cur.s3 = l.duration_sector_3
            if (l.lap_duration && l.lap_duration > 0 && l.lap_duration < cur.best) cur.best = l.lap_duration
            sm.set(l.driver_number, cur)
          }
          setSectors(sm)
        }
        setLog(p => [...p.slice(-20), {t:nw(), n: r?.predictions.length || 0, ms}])
      }
      await poll()
      ref.current = window.setInterval(poll, 5000)
    } catch { setLog(p => [...p, {t:nw(), n:0, ms:0}]) }
  }, [live])

  useEffect(() => () => { if (ref.current) clearInterval(ref.current) }, [])

  // En iyi sektör süreleri hesapla (mor sektör)
  const bestS1 = Math.min(...[...sectors.values()].map(s => s.s1 || Infinity))
  const bestS2 = Math.min(...[...sectors.values()].map(s => s.s2 || Infinity))
  const bestS3 = Math.min(...[...sectors.values()].map(s => s.s3 || Infinity))
  const bestLap = Math.min(...[...sectors.values()].map(s => s.best || Infinity))

  return (
    <div style={{background:'#0d0d0d',minHeight:'100vh',color:'#e5e5e5',fontFamily:"'DM Mono','Geist Mono',monospace"}}>
      {/* HEADER */}
      <header style={{background:'#111',padding:'10px 0',borderBottom:'2px solid #e10600'}}>
        <div className="container" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <a href="/" style={{color:'#555',fontSize:'.8rem',textDecoration:'none',border:'1px solid #333',borderRadius:6,width:26,height:26,display:'flex',alignItems:'center',justifyContent:'center'}}>←</a>
            <div>
              <div style={{fontSize:'1rem',fontWeight:700,color:'#fff'}}>F1 RACE PREDICTOR</div>
              <div style={{fontSize:'.45rem',color:'#444',letterSpacing:'.1em'}}>ENSEMBLE ML · LIVE LAP-BY-LAP · SECTOR ANALYSIS</div>
            </div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {lap > 0 && <span style={{fontSize:'.7rem',color:'#e10600',fontWeight:700}}>LAP {lap}/58</span>}
            {weather && <span style={{fontSize:'.5rem',color:weather.rainfall?'#3b82f6':'#555'}}>{weather.rainfall?'🌧':'☀'} {weather.air_temperature?.toFixed(0)}°</span>}
            <button onClick={toggle} style={{
              background:live?'#e10600':'#222',border:`1px solid ${live?'#e10600':'#444'}`,
              borderRadius:5,padding:'6px 16px',fontSize:'.6rem',color:'#fff',cursor:'pointer',
              fontFamily:'inherit',fontWeight:700,display:'flex',alignItems:'center',gap:6,
            }}>
              {live && <span style={{width:6,height:6,borderRadius:'50%',background:'#4ade80',animation:'pd 1s ease-in-out infinite'}}/>}
              {live ? 'STOP' : '▶ START LIVE'}
            </button>
          </div>
        </div>
      </header>

      <div className="container" style={{padding:'12px 20px'}}>
        {/* 3D HERO — Spline entegrasyonu */}
        <div style={{background:'linear-gradient(135deg,#0a0a0f 0%,#141428 50%,#0f1923 100%)',borderRadius:12,marginBottom:12,padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',border:'1px solid #222',overflow:'hidden',position:'relative'}}>
          <div style={{position:'relative',zIndex:2}}>
            <div style={{fontSize:'1.8rem',fontWeight:700,color:'#fff',lineHeight:1.1}}>
              🇦🇺 Australian GP
            </div>
            <div style={{fontSize:'.55rem',color:'#666',marginTop:6}}>Albert Park · 58 Laps · 5.278 km</div>
            {preds && preds[0] && (
              <div style={{marginTop:12,display:'flex',gap:12,alignItems:'center'}}>
                <div>
                  <div style={{fontSize:'.4rem',color:'#555'}}>PREDICTED WINNER</div>
                  <div style={{fontSize:'1rem',fontWeight:700,color:'#c9a84c'}}>{preds[0].driverName}</div>
                  <div style={{fontSize:'.5rem',color:preds[0].teamColor}}>{preds[0].team} · {preds[0].winProbability}%</div>
                </div>
                <div style={{width:1,height:30,background:'#333'}}/>
                <div>
                  <div style={{fontSize:'.4rem',color:'#555'}}>PODIUM</div>
                  {preds.slice(0,3).map(p => (
                    <div key={p.driverCode} style={{fontSize:'.5rem',display:'flex',gap:4,alignItems:'center'}}>
                      <span style={{width:3,height:8,borderRadius:1,background:p.teamColor}}/>
                      <span style={{color:'#ccc'}}>{p.driverCode}</span>
                      <span style={{color:'#555'}}>{p.winProbability}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Spotlight efekti */}
          <div style={{position:'absolute',top:'-40%',right:'-10%',width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(225,6,0,0.08) 0%,transparent 70%)',pointerEvents:'none'}}/>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr',gap:10}}>
          {/* SOL: GRID + SECTORS */}
          <DCard title="QUALIFYING GRID · SECTORS · PREDICTION">
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.52rem'}}>
                <thead>
                  <tr style={{color:'#444',borderBottom:'1px solid #333'}}>
                    <th style={{textAlign:'center',padding:'3px 2px',width:28}}>POS</th>
                    <th style={{width:4}}></th>
                    <th style={{textAlign:'left',padding:'3px 4px'}}>DRIVER</th>
                    <th style={{textAlign:'right',padding:'3px 4px',width:50}}>Q TIME</th>
                    <th style={{textAlign:'center',padding:'3px 2px',width:42,color:'#a855f7'}}>S1</th>
                    <th style={{textAlign:'center',padding:'3px 2px',width:42,color:'#a855f7'}}>S2</th>
                    <th style={{textAlign:'center',padding:'3px 2px',width:42,color:'#a855f7'}}>S3</th>
                    <th style={{textAlign:'center',padding:'3px 2px',width:36}}>→ AI</th>
                    <th style={{textAlign:'right',padding:'3px 2px',width:34}}>WIN%</th>
                  </tr>
                </thead>
                <tbody>
                  {AUSTRALIA_2026_QUALI.map((q, i) => {
                    const tm = TEAMS[q.team]; const pred = preds?.find(p => p.driverCode === q.driverCode)
                    // Sektör verisi (sıralama numarasına göre bul)
                    const driverNum = [63,12,20,16,81,4,44,30,40,5,27,87,31,10,23,43,14,11,77,1,55,18][i] || 0
                    const sec = sectors.get(driverNum)
                    const s1 = sec?.s1; const s2 = sec?.s2; const s3 = sec?.s3
                    const s1Purple = s1 !== null && s1 !== undefined && s1 <= bestS1
                    const s2Purple = s2 !== null && s2 !== undefined && s2 <= bestS2
                    const s3Purple = s3 !== null && s3 !== undefined && s3 <= bestS3
                    const lapPurple = sec?.best !== undefined && sec.best <= bestLap && sec.best < Infinity

                    return (
                      <tr key={q.driverCode} style={{borderBottom:'1px solid #1a1a1a',background:lapPurple?'rgba(168,85,247,0.06)':i===0?'rgba(201,168,76,0.04)':i<3?'rgba(30,30,30,0.5)':'transparent'}}>
                        <td style={{textAlign:'center',fontWeight:700,color:i<3?'#c9a84c':i<10?'#ccc':'#555',padding:'4px 2px'}}>{q.position}</td>
                        <td><div style={{width:3,height:16,borderRadius:1,background:tm?.color||'#444'}}/></td>
                        <td style={{padding:'4px 4px'}}>
                          <span style={{fontWeight:i===0?700:400,color:i<10?'#eee':'#777'}}>{q.driverName}</span>
                          <br/><span style={{fontSize:'.38rem',color:'#444'}}>{q.team}</span>
                        </td>
                        <td style={{textAlign:'right',color:lapPurple?'#a855f7':'#888',fontWeight:lapPurple?700:400,padding:'4px 4px'}}>{q.q3Time||q.q2Time||q.q1Time||'—'}</td>
                        <td style={{textAlign:'center',color:s1Purple?'#a855f7':s1?'#22c55e':'#333',fontWeight:s1Purple?700:400}}>{s1?s1.toFixed(3):'—'}</td>
                        <td style={{textAlign:'center',color:s2Purple?'#a855f7':s2?'#f59e0b':'#333',fontWeight:s2Purple?700:400}}>{s2?s2.toFixed(3):'—'}</td>
                        <td style={{textAlign:'center',color:s3Purple?'#a855f7':s3?'#22c55e':'#333',fontWeight:s3Purple?700:400}}>{s3?s3.toFixed(3):'—'}</td>
                        <td style={{textAlign:'center',fontWeight:700,color:pred?pred.predictedPosition<=3?'#c9a84c':pred.predictedPosition<=10?'#eee':'#555':'#333'}}>{pred?`P${pred.predictedPosition}`:'—'}</td>
                        <td style={{textAlign:'right',color:pred&&pred.winProbability>10?'#fbbf24':'#555'}}>{pred?`${pred.winProbability}%`:'—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {/* Sektör renk açıklaması */}
            <div style={{display:'flex',gap:12,marginTop:8,fontSize:'.42rem',color:'#555'}}>
              <span><span style={{color:'#a855f7'}}>■</span> Purple = fastest sector/lap</span>
              <span><span style={{color:'#22c55e'}}>■</span> Personal best</span>
              <span><span style={{color:'#f59e0b'}}>■</span> Sector time</span>
            </div>
          </DCard>

          {/* SAĞ KOLON */}
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {/* RACE CONTROL */}
            <DCard title="RACE CONTROL">
              {raceCtrl.length === 0 ? <Empty text="Race control mesajları burada görünecek"/> :
                <div style={{maxHeight:120,overflowY:'auto'}}>
                  {[...raceCtrl].reverse().slice(0,8).map((rc:any,i:number)=>(
                    <div key={i} style={{display:'flex',gap:5,padding:'2px 0',fontSize:'.48rem',borderBottom:'1px solid #1a1a1a'}}>
                      <span style={{padding:'1px 5px',borderRadius:3,fontWeight:700,fontSize:'.42rem',background:flagBg(rc.flag),color:'#fff'}}>{rc.flag||'—'}</span>
                      <span style={{color:'#999'}}>{rc.message?.slice(0,70)}</span>
                    </div>
                  ))}
                </div>
              }
            </DCard>

            {/* TYRE STINTS */}
            <DCard title="TYRE STINTS">
              {stints.length === 0 ? <Empty text="Lastik verileri gelecek"/> : (() => {
                const bd = new Map<number,{c:string;l:number}[]>()
                for (const s of stints) { if (!bd.has(s.driver_number)) bd.set(s.driver_number,[]); bd.get(s.driver_number)!.push({c:s.compound||'?',l:s.tyre_age_at_start||0}) }
                return <div style={{maxHeight:130,overflowY:'auto'}}>
                  {[...bd.entries()].slice(0,10).map(([n,st])=>(
                    <div key={n} style={{display:'flex',gap:3,padding:'2px 0',fontSize:'.48rem',borderBottom:'1px solid #1a1a1a',alignItems:'center'}}>
                      <span style={{color:'#666',width:20}}>#{n}</span>
                      {st.map((s,i)=>(<span key={i} style={{padding:'1px 5px',borderRadius:3,fontSize:'.4rem',fontWeight:700,background:tyreBg(s.c),color:s.c==='HARD'||s.c==='MEDIUM'?'#000':'#fff'}}>{s.c?.[0]||'?'}</span>))}
                    </div>
                  ))}
                </div>
              })()}
            </DCard>

            {/* FACTOR ANALYSIS */}
            {preds && (
              <DCard title="TOP 5 · FACTORS">
                {preds.slice(0,5).map(p => (
                  <div key={p.driverCode} style={{marginBottom:5}}>
                    <div style={{display:'flex',gap:3,alignItems:'center',marginBottom:2}}>
                      <span style={{width:3,height:8,borderRadius:1,background:p.teamColor}}/>
                      <span style={{fontSize:'.5rem',fontWeight:600,color:'#eee'}}>{p.driverCode}</span>
                      <span style={{fontSize:'.38rem',color:'#555'}}>P{p.predictedPosition} · {p.winProbability}%</span>
                    </div>
                    <FB l="QUALI" v={p.factors.qualiPerformance}/>
                    <FB l="FORM" v={p.factors.historicalForm}/>
                    <FB l="TEAM" v={p.factors.teamStrength}/>
                  </div>
                ))}
              </DCard>
            )}

            {/* LIVE FEED */}
            <DCard title="DATA FEED">
              {log.length === 0 ? <Empty text="▶ START LIVE butonuna bas"/> :
                <div style={{maxHeight:100,overflowY:'auto'}}>
                  {[...log].reverse().slice(0,8).map((e,i)=>(
                    <div key={i} style={{display:'flex',gap:4,padding:'1px 0',fontSize:'.45rem',borderBottom:'1px solid #1a1a1a'}}>
                      <span style={{color:'#444',width:46}}>{e.t}</span>
                      <span style={{color:e.n>0?'#4ade80':'#ef4444',width:8,fontWeight:700}}>{e.n>0?'✓':'✗'}</span>
                      <span style={{color:'#666'}}>{e.n} · {e.ms}ms</span>
                    </div>
                  ))}
                </div>
              }
            </DCard>

            {/* MODEL */}
            <DCard title="MODEL">
              <div style={{fontSize:'.45rem',color:'#555',lineHeight:1.7}}>
                <div>Ensemble: <span style={{color:'#ccc'}}>Ridge 40% + GB 60% + ELO</span></div>
                <div>Features: <span style={{color:'#ccc'}}>14</span> · Pre-trained: <span style={{color:'#4ade80'}}>2024-2025</span></div>
                <div>Live: <span style={{color:live?'#4ade80':'#555'}}>{live?`Lap ${lap} · 5s`:'Off'}</span></div>
              </div>
            </DCard>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
function DCard({title,children,span}:{title:string;children:React.ReactNode;span?:number}) {
  return <div style={{background:'#151515',border:'1px solid #222',borderRadius:8,padding:'10px 12px',gridColumn:span?`span ${span}`:undefined}}>
    <div style={{fontSize:'.46rem',color:'#555',letterSpacing:'.1em',fontWeight:700,marginBottom:8}}>{title}</div>{children}
  </div>
}
function FB({l,v}:{l:string;v:number}) {
  return <div style={{display:'flex',alignItems:'center',gap:3,marginBottom:1}}>
    <span style={{fontSize:'.38rem',color:'#444',width:30}}>{l}</span>
    <div style={{flex:1,height:3,background:'#222',borderRadius:2,overflow:'hidden'}}><div style={{width:`${v*100}%`,height:'100%',background:v>0.7?'#4ade80':v>0.4?'#fbbf24':'#ef4444',borderRadius:2}}/></div>
  </div>
}
function Empty({text}:{text:string}) { return <div style={{fontSize:'.46rem',color:'#333',textAlign:'center',padding:12}}>{text}</div> }
function nw() { return new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) }
function pT(t: string): number { const [m, s] = t.split(':'); return Number(m) * 60 + Number(s) }
function flagBg(f:string) { return f==='GREEN'?'#166534':f==='YELLOW'?'#854d0e':f==='RED'?'#991b1b':f==='DOUBLE YELLOW'?'#78350f':'#333' }
function tyreBg(c:string) { return c==='SOFT'?'#dc2626':c==='MEDIUM'?'#eab308':c==='HARD'?'#e5e5e5':c==='INTERMEDIATE'?'#22c55e':'#3b82f6' }
