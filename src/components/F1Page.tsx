import { useState, useEffect, useRef, useCallback } from 'react'
import { TEAMS } from '../f1/data'
import { AUSTRALIA_2026_QUALI, AUSTRALIA_2026_RACE_RESULT, computeBacktest } from '../f1/realdata'
import { predictor } from '../f1/predictor'
import { openF1 } from '../f1/api'
import type { PredictionResult } from '../f1/types'

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes glow{0%,100%{box-shadow:0 0 8px rgba(225,6,0,.3)}50%{box-shadow:0 0 24px rgba(225,6,0,.5)}}
@keyframes drift{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
.f1{background:#08080a;min-height:100vh;color:#e8e8e8;font-family:'JetBrains Mono',monospace}
.f1 *{box-sizing:border-box}
.f1-card{background:linear-gradient(160deg,#111114,#0e0e11);border:1px solid #1c1c22;border-radius:12px;padding:16px 18px;position:relative;overflow:hidden;animation:slideUp .5s ease both}
.f1-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent 10%,rgba(225,6,0,.25) 50%,transparent 90%)}
.f1-title{font-family:'Outfit',sans-serif;font-size:11px;color:#555;letter-spacing:.12em;font-weight:700;margin-bottom:10px;text-transform:uppercase}
.f1-row{display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.03);transition:background .15s}
.f1-row:hover{background:rgba(225,6,0,.02)}
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

  const sec = new Map<number,{s1:number|null,s2:number|null,s3:number|null,best:number}>()
  for (const l of laps) { const c=sec.get(l.driver_number)||{s1:null,s2:null,s3:null,best:Infinity};c.s1=l.duration_sector_1;c.s2=l.duration_sector_2;c.s3=l.duration_sector_3;if(l.lap_duration&&l.lap_duration>0&&l.lap_duration<c.best)c.best=l.lap_duration;sec.set(l.driver_number,c) }
  const bS1=Math.min(...[...sec.values()].map(s=>s.s1||Infinity))
  const bS2=Math.min(...[...sec.values()].map(s=>s.s2||Infinity))
  const bS3=Math.min(...[...sec.values()].map(s=>s.s3||Infinity))
  const DN:Record<string,number>={RUS:63,ANT:12,HAD:20,LEC:16,PIA:81,NOR:4,HAM:44,LAW:30,LIN:40,BOR:5,HUL:27,BEA:87,OCO:31,GAS:10,ALB:23,COL:43,ALO:14,PER:11,BOT:77,VER:1,SAI:55,STR:18}

  return (
    <div className="f1">
      <style>{CSS}</style>

      {/* HEADER */}
      <header style={{background:'rgba(12,12,14,.97)',backdropFilter:'blur(10px)',padding:'12px 0',borderBottom:'2px solid #e10600',position:'sticky',top:0,zIndex:50}}>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'0 24px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            <a href="/" style={{color:'#555',textDecoration:'none',fontSize:14,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid #2a2a2e',borderRadius:8}}>←</a>
            <div>
              <div style={{fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:800,color:'#fff'}}>
                F1<span style={{color:'#e10600',marginLeft:5}}>PREDICTOR</span>
              </div>
              <div style={{fontSize:10,color:'#444',letterSpacing:'.1em',fontFamily:"'Outfit',sans-serif"}}>ENSEMBLE ML · LIVE TELEMETRY</div>
            </div>
          </div>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            {lap>0 && <div style={{background:'#e10600',padding:'4px 14px',borderRadius:6,fontSize:14,fontWeight:700,color:'#fff',animation:live?'glow 2s infinite':'none'}}>LAP {lap}/58</div>}
            {weather && <div style={{fontSize:12,color:'#666'}}>
              {weather.rainfall?'🌧':'☀'} {weather.air_temperature?.toFixed(0)}° · T{weather.track_temperature?.toFixed(0)}°
            </div>}
            <button onClick={toggle} style={{
              background:live?'linear-gradient(135deg,#e10600,#b30500)':'linear-gradient(135deg,#1a1a1e,#252528)',
              border:'none',borderRadius:8,padding:'8px 22px',fontSize:13,color:'#fff',cursor:'pointer',
              fontFamily:"'Outfit',sans-serif",fontWeight:700,display:'flex',alignItems:'center',gap:8,
              boxShadow:live?'0 0 20px rgba(225,6,0,.3)':'0 2px 8px rgba(0,0,0,.4)',
            }}>
              {live && <span style={{width:8,height:8,borderRadius:'50%',background:'#4ade80',animation:'pulse 1s infinite'}}/>}
              {live ? '■ STOP' : '▶ START LIVE'}
            </button>
          </div>
        </div>
      </header>

      <div style={{maxWidth:1200,margin:'0 auto',padding:'16px 24px',position:'relative',zIndex:1}}>

        {/* HERO — daha aydınlık, belirgin */}
        <div style={{borderRadius:16,marginBottom:14,position:'relative',overflow:'hidden',background:'linear-gradient(135deg,#12121a 0%,#1a1a2e 40%,#141828 100%)',border:'1px solid #2a2a36'}}>
          {/* Animated red line — daha parlak */}
          <div style={{position:'absolute',top:0,left:0,width:'40%',height:3,background:'linear-gradient(90deg,transparent,#e10600 40%,#ff4444 60%,transparent)',animation:'drift 3s linear infinite',zIndex:2}}/>
          {/* Red glow — daha belirgin */}
          <div style={{position:'absolute',top:'-20%',left:'10%',width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,rgba(225,6,0,.1),transparent 55%)',pointerEvents:'none'}}/>
          {/* Blue accent glow sağda */}
          <div style={{position:'absolute',top:'10%',right:'5%',width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(59,130,246,.06),transparent 55%)',pointerEvents:'none'}}/>
          {/* Grid pattern — daha görünür */}
          <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px, transparent 1px)',backgroundSize:'40px 40px',pointerEvents:'none'}}/>
          
          <div style={{position:'relative',zIndex:3,padding:'28px 32px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:20}}>
            <div>
              <div style={{fontFamily:"'Outfit',sans-serif",fontSize:11,color:'#555',letterSpacing:'.15em',fontWeight:600}}>ROUND 1 · 2026 FIA FORMULA ONE WORLD CHAMPIONSHIP</div>
              <div style={{fontFamily:"'Outfit',sans-serif",fontSize:32,fontWeight:800,color:'#fff',lineHeight:1.1,marginTop:6}}>
                Australian Grand Prix
              </div>
              <div style={{fontSize:13,color:'#444',marginTop:6}}>Albert Park · 58 Laps · 5.278 km · Melbourne</div>
              {preds?.[0] && (
                <div style={{marginTop:16,padding:'12px 20px',background:'rgba(212,168,67,.06)',border:'1px solid rgba(212,168,67,.15)',borderRadius:10,display:'inline-block'}}>
                  <div style={{fontSize:10,color:'#997a2e',letterSpacing:'.1em',fontFamily:"'Outfit',sans-serif",fontWeight:600}}>PREDICTED WINNER</div>
                  <div style={{fontFamily:"'Outfit',sans-serif",fontSize:24,fontWeight:800,color:'#d4a843',lineHeight:1.1}}>{preds[0].driverName}</div>
                  <div style={{fontSize:13,color:preds[0].teamColor,marginTop:3}}>{preds[0].team} · {preds[0].winProbability}% win probability</div>
                </div>
              )}
            </div>
            {/* Podium */}
            {preds && (
              <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
                {[1,0,2].map(idx => {
                  const p=preds[idx]; if(!p) return null
                  const h=idx===0?110:idx===1?85:65
                  return <div key={p.driverCode} style={{textAlign:'center',width:64}}>
                    <div style={{fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:800,color:idx===0?'#d4a843':idx===1?'#b0b0b0':'#a0704a'}}>{p.driverCode}</div>
                    <div style={{fontSize:11,color:'#555'}}>{p.winProbability}%</div>
                    <div style={{height:h,background:idx===0?'linear-gradient(0deg,rgba(212,168,67,.12),rgba(212,168,67,.03))':idx===1?'linear-gradient(0deg,rgba(180,180,180,.08),rgba(180,180,180,.02))':'linear-gradient(0deg,rgba(160,112,74,.08),rgba(160,112,74,.02))',borderRadius:'6px 6px 0 0',marginTop:4,display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:8}}>
                      <span style={{fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:800,color:idx===0?'#d4a843':idx===1?'#888':'#7a5a3a'}}>{idx+1}</span>
                    </div>
                  </div>
                })}
              </div>
            )}
          </div>
        </div>

        {/* DASHBOARD */}
        <div style={{display:'grid',gridTemplateColumns:'1.5fr .9fr .6fr',gap:12}}>
          {/* COL 1 */}
          <div className="f1-card" style={{animationDelay:'.1s'}}>
            <div className="f1-title">QUALIFYING GRID · SECTORS · AI PREDICTION</div>
            <div style={{overflowY:'auto',maxHeight:520}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead><tr style={{color:'#555',borderBottom:'1px solid #1e1e24',fontSize:10}}>
                  <th style={{...TH,width:28}}>P</th><th style={{width:4}}></th><th style={{...TH,textAlign:'left'}}>DRIVER</th>
                  <th style={{...TH,width:62}}>TIME</th>
                  <th style={{...TH,width:52,color:'#a855f7'}}>S1</th><th style={{...TH,width:52,color:'#a855f7'}}>S2</th><th style={{...TH,width:52,color:'#a855f7'}}>S3</th>
                  <th style={{...TH,width:34}}>AI</th><th style={{...TH,width:36}}>WIN%</th>
                </tr></thead>
                <tbody>
                  {AUSTRALIA_2026_QUALI.map((q,i) => {
                    const tm=TEAMS[q.team];const pr=preds?.find(p=>p.driverCode===q.driverCode)
                    const dn=DN[q.driverCode]||0;const sd=sec.get(dn)
                    const s1p=sd?.s1!=null&&sd.s1<=bS1,s2p=sd?.s2!=null&&sd.s2<=bS2,s3p=sd?.s3!=null&&sd.s3<=bS3
                    const lp=sd?.best!=null&&sd.best<Infinity&&sd.best<=Math.min(...[...sec.values()].map(s=>s.best))
                    return <tr key={q.driverCode} className="f1-row" style={{background:lp?'rgba(168,85,247,.04)':'transparent',fontSize:12}}>
                      <td style={{textAlign:'center',fontWeight:800,color:i<3?'#d4a843':i<10?'#aaa':'#444',fontFamily:"'Outfit',sans-serif",fontSize:13}}>{q.position}</td>
                      <td><div style={{width:3,height:18,borderRadius:2,background:tm?.color||'#333'}}/></td>
                      <td style={{padding:'5px 6px'}}>
                        <div style={{fontFamily:"'Outfit',sans-serif",fontWeight:i<3?700:500,color:i<10?'#eee':'#666',fontSize:13}}>{q.driverName}</div>
                        <div style={{fontSize:10,color:'#3a3a42'}}>{q.team}</div>
                      </td>
                      <td style={{textAlign:'right',color:lp?'#a855f7':'#666',fontWeight:lp?700:400,fontSize:11}}>{q.q3Time||q.q2Time||q.q1Time||'—'}</td>
                      <td style={{textAlign:'center',color:s1p?'#a855f7':sd?.s1?'#4ade80':'#2a2a2e',fontWeight:s1p?700:400,fontSize:10}}>{sd?.s1?.toFixed(3)||'—'}</td>
                      <td style={{textAlign:'center',color:s2p?'#a855f7':sd?.s2?'#fbbf24':'#2a2a2e',fontWeight:s2p?700:400,fontSize:10}}>{sd?.s2?.toFixed(3)||'—'}</td>
                      <td style={{textAlign:'center',color:s3p?'#a855f7':sd?.s3?'#4ade80':'#2a2a2e',fontWeight:s3p?700:400,fontSize:10}}>{sd?.s3?.toFixed(3)||'—'}</td>
                      <td style={{textAlign:'center',fontWeight:700,fontFamily:"'Outfit',sans-serif",color:pr?pr.predictedPosition<=3?'#d4a843':pr.predictedPosition<=10?'#ddd':'#555':'#2a2a2e',fontSize:12}}>P{pr?.predictedPosition||'—'}</td>
                      <td style={{textAlign:'right',color:pr&&pr.winProbability>10?'#fbbf24':'#3a3a42',fontSize:11}}>{pr?`${pr.winProbability}%`:'—'}</td>
                    </tr>
                  })}
                </tbody>
              </table>
            </div>
            <div style={{display:'flex',gap:14,marginTop:10,fontSize:10,color:'#3a3a42'}}>
              <span><span style={{color:'#a855f7'}}>●</span> Fastest</span>
              <span><span style={{color:'#4ade80'}}>●</span> Personal best</span>
              <span><span style={{color:'#fbbf24'}}>●</span> Sector</span>
            </div>
          </div>

          {/* COL 2 */}
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div className="f1-card" style={{animationDelay:'.2s'}}>
              <div className="f1-title">📡 LIVE TELEMETRY</div>
              {telem.size===0 ? <Emp text="▶ START LIVE ile telemetri başlat"/> :
                AUSTRALIA_2026_QUALI.slice(0,6).map(q => {
                  const d=DN[q.driverCode]||0;const t=telem.get(d);const tm=TEAMS[q.team]
                  if(!t) return null
                  return <div key={q.driverCode} style={{marginBottom:8}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                      <span style={{width:3,height:12,borderRadius:2,background:tm?.color||'#444'}}/>
                      <span style={{fontSize:12,fontWeight:700,color:tm?.color||'#888',fontFamily:"'Outfit',sans-serif"}}>{q.driverCode}</span>
                      <span style={{fontSize:16,fontWeight:800,color:'#eee',marginLeft:'auto',fontFamily:"'Outfit',sans-serif"}}>{t.speed}<span style={{fontSize:10,color:'#555',fontWeight:400}}> km/h</span></span>
                    </div>
                    <div style={{display:'flex',gap:3,height:6}}>
                      <div style={{flex:t.speed,background:t.speed>300?'#a855f7':t.speed>200?'#22c55e':'#fbbf24',borderRadius:3,transition:'flex .5s'}}/>
                      <div style={{flex:360-t.speed,background:'#1a1a1e',borderRadius:3}}/>
                    </div>
                    <div style={{display:'flex',gap:10,marginTop:3,fontSize:10,color:'#555'}}>
                      <span>G{t.gear}</span>
                      <span style={{color:'#4ade80'}}>THR {t.throttle}%</span>
                      <span style={{color:t.brake>0?'#ef4444':'#333'}}>BRK {t.brake}%</span>
                    </div>
                  </div>
                })
              }
            </div>

            <div className="f1-card" style={{animationDelay:'.3s'}}>
              <div className="f1-title">TYRE STRATEGY</div>
              {stints.length===0 ? <Emp text="Lastik verileri gelecek"/> : (() => {
                const bd=new Map<number,{c:string;l:number}[]>()
                for(const s of stints){if(!bd.has(s.driver_number))bd.set(s.driver_number,[]);bd.get(s.driver_number)!.push({c:s.compound||'?',l:s.tyre_age_at_start||0})}
                return [...bd.entries()].slice(0,8).map(([n,st])=>(
                  <div key={n} style={{display:'flex',gap:4,padding:'4px 0',borderBottom:'1px solid #1a1a1e',alignItems:'center',fontSize:11}}>
                    <span style={{color:'#666',width:22}}>#{n}</span>
                    {st.map((s,i)=>(<span key={i} style={{padding:'3px 8px',borderRadius:4,fontSize:10,fontWeight:700,background:tyreBg(s.c),color:s.c==='HARD'||s.c==='MEDIUM'?'#000':'#fff'}}>{s.c?.[0]}</span>))}
                  </div>
                ))
              })()}
            </div>

            <div className="f1-card" style={{animationDelay:'.4s'}}>
              <div className="f1-title">RACE CONTROL</div>
              {raceCtrl.length===0 ? <Emp text="Race control mesajları"/> :
                [...raceCtrl].reverse().slice(0,5).map((rc:any,i:number)=>(
                  <div key={i} style={{display:'flex',gap:6,padding:'4px 0',borderBottom:'1px solid #1a1a1e',fontSize:11}}>
                    <span style={{padding:'2px 8px',borderRadius:4,fontWeight:700,fontSize:9,background:flagBg(rc.flag),color:'#fff',flexShrink:0}}>{rc.flag||'—'}</span>
                    <span style={{color:'#888'}}>{rc.message?.slice(0,60)}</span>
                  </div>
                ))
              }
            </div>
          </div>

          {/* COL 3 */}
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {preds && <div className="f1-card" style={{animationDelay:'.2s'}}>
              <div className="f1-title">WHY THIS ORDER?</div>
              {preds.slice(0,5).map(p => {
                const qPct = Math.round(p.factors.qualiPerformance * 100)
                const fPct = Math.round(p.factors.historicalForm * 100)
                const tPct = Math.round(p.factors.teamStrength * 100)
                return <div key={p.driverCode} style={{marginBottom:10}}>
                  <div style={{display:'flex',gap:4,alignItems:'center',marginBottom:4}}>
                    <span style={{width:3,height:12,borderRadius:2,background:p.teamColor}}/>
                    <span style={{fontSize:12,fontWeight:700,color:'#eee',fontFamily:"'Outfit',sans-serif"}}>{p.driverCode}</span>
                    <span style={{fontSize:10,color:'#d4a843',marginLeft:'auto',fontWeight:700}}>P{p.predictedPosition}</span>
                  </div>
                  <BarLabel l="S\u0131ralama" v={p.factors.qualiPerformance} pct={qPct} tip={`Grid P${Math.round(22 - p.factors.qualiPerformance * 22)} \u2014 ${qPct > 70 ? '\u00d6n s\u0131rada, b\u00fcy\u00fck avantaj' : qPct > 40 ? 'Orta s\u0131ra' : 'Arka s\u0131ra'}`}/>
                  <BarLabel l="Form" v={p.factors.historicalForm} pct={fPct} tip={`Son 5 yar\u0131\u015f ort. \u2014 ${fPct > 70 ? 'Podyum formu' : fPct > 40 ? 'Puan b\u00f6lgesi' : 'Zay\u0131f form'}`}/>
                  <BarLabel l="Tak\u0131m" v={p.factors.teamStrength} pct={tPct} tip={`${p.team} \u2014 ${tPct > 70 ? 'Top tak\u0131m' : tPct > 40 ? 'Orta grup' : 'Arka grup'}`}/>
                </div>
              })}
            </div>}

            <div className="f1-card" style={{animationDelay:'.3s'}}>
              <div className="f1-title">PREDICTION LOG</div>
              <div style={{fontSize:10,color:'#555',lineHeight:1.8,maxHeight:220,overflowY:'auto'}}>
                <div style={{color:'#4ade80'}}>✓ Ensemble model yüklü (Ridge 40% + GB 60% + ELO recovery)</div>
                <div style={{color:'#4ade80'}}>✓ 2024-2025 verileriyle eğitildi ({predictor.dataCount} sample)</div>
                <div style={{color:'#4ade80'}}>✓ Qualifying grid → 14 feature çıkarıldı</div>
                {preds?.[0] && <div style={{color:'#d4a843',fontWeight:700}}>→ Tahmin: {preds[0].driverName} P1 ({preds[0].winProbability}%)</div>}
                {!live && <div style={{marginTop:6,paddingTop:6,borderTop:'1px solid #1a1a1e',color:'#666'}}>
                  <div>▶ START LIVE ne yapar:</div>
                  <div style={{color:'#555',marginLeft:8}}>1. OpenF1 API'den 2026 AUS GP session bulur (key: 11234)</div>
                  <div style={{color:'#555',marginLeft:8}}>2. Her 5 saniyede 7 endpoint paralel çeker:</div>
                  <div style={{color:'#444',marginLeft:16}}>positions · laps · weather · pit stops · stints · intervals · race control</div>
                  <div style={{color:'#555',marginLeft:8}}>3. Gap trendi analiz eder (saniyede kapama hızı)</div>
                  <div style={{color:'#555',marginLeft:8}}>4. DNF algılar, tahminleri anlık günceller</div>
                  <div style={{color:'#555',marginLeft:8}}>5. Yaşçn ilerledikçe mevcut pozisyon ağırlığı artar</div>
                </div>}
                {live && <div style={{marginTop:4,color:'#3b82f6'}}>
                  <div>⟳ CANLI — api.openf1.org/v1 · 5s polling</div>
                  {lap>0 && <div>⟳ Tur {lap}/58 · Pozisyon ağırlığı: {Math.round((lap/58)*70)}%</div>}
                  {lap>0 && <div>⟳ Momentum + pace trend hesaplanıyor</div>}
                </div>}
                {log.length>0 && <div style={{marginTop:4,paddingTop:4,borderTop:'1px solid #1a1a1e'}}>
                  {[...log].reverse().slice(0,5).map((e,i)=>(
                    <div key={i} style={{color:e.n>0?'#555':'#e10600'}}>
                      [{e.t}] {e.n>0?`✓ ${e.n} sürücü · 7 endpoint · ${e.ms}ms`:'✗ bağlantı hatası'}
                    </div>
                  ))}
                </div>}
              </div>
            </div>

            <div className="f1-card" style={{animationDelay:'.4s'}}>
              <div className="f1-title">MODEL</div>
              <div style={{fontSize:11,color:'#555',lineHeight:2}}>
                <div>Ensemble: <span style={{color:'#ccc'}}>Ridge 40% + GB 60%</span></div>
                <div>ELO: <span style={{color:'#ccc'}}>Driver + Team dynamic</span></div>
                <div>Features: <span style={{color:'#ccc'}}>14</span> · Temporal: <span style={{color:'#ccc'}}>2025×3</span></div>
                <div>Telemetry: <span style={{color:telem.size>0?'#22c55e':'#444'}}>{telem.size>0?`${telem.size} cars live`:'waiting'}</span></div>
                <div>Status: <span style={{color:live?'#22c55e':'#444'}}>{live?`LIVE Lap ${lap}/58`:'Pre-race prediction'}</span></div>
                <div>Confidence: <span style={{color:live?'#4ade80':'#fbbf24'}}>{live && lap>10?'85%':'70%'} {live?'(live data)':'(pre-race)'}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* RACE REVIEW — Tahmin vs Gerçek */}
        {preds && (() => {
          const bt = computeBacktest(preds)
          return <div className="f1-card" style={{animationDelay:'.5s',marginTop:14}}>
            <div className="f1-title">🏁 RACE REVIEW — PREDICTION vs ACTUAL (R1 Australia)</div>
            <div style={{display:'flex',gap:20,marginBottom:12,flexWrap:'wrap'}}>
              <div style={{textAlign:'center'}}>
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:28,fontWeight:800,color:bt.winnerCorrect?'#4ade80':'#fbbf24'}}>{bt.winnerCorrect?'✓':'✗'}</div>
                <div style={{fontSize:10,color:'#555'}}>Winner</div>
              </div>
              <div style={{textAlign:'center'}}>
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:28,fontWeight:800,color:'#d4a843'}}>{bt.podiumHits}/3</div>
                <div style={{fontSize:10,color:'#555'}}>Podium Hits</div>
              </div>
              <div style={{textAlign:'center'}}>
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:28,fontWeight:800,color:bt.mae<3?'#4ade80':bt.mae<5?'#fbbf24':'#ef4444'}}>{bt.mae.toFixed(1)}</div>
                <div style={{fontSize:10,color:'#555'}}>Avg Position Error</div>
              </div>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead><tr style={{color:'#555',borderBottom:'1px solid #1e1e24',fontSize:10}}>
                  <th style={{...TH,textAlign:'left',width:30}}>ACTUAL</th>
                  <th style={{width:4}}></th>
                  <th style={{...TH,textAlign:'left'}}>DRIVER</th>
                  <th style={TH}>PRED</th>
                  <th style={TH}>ERROR</th>
                  <th style={{...TH,width:80}}>STATUS</th>
                </tr></thead>
                <tbody>
                  {AUSTRALIA_2026_RACE_RESULT.map((r,i) => {
                    const d = bt.details.find(x=>x.code===r.code)
                    const tm = TEAMS[r.team]
                    const isDNF = r.status==='dnf'||r.status==='dns'
                    return <tr key={r.code} className="f1-row" style={{opacity:isDNF?0.4:1}}>
                      <td style={{fontFamily:"'Outfit',sans-serif",fontWeight:800,color:i<3?'#d4a843':i<10?'#aaa':'#555',fontSize:13}}>{isDNF?r.status.toUpperCase():`P${r.pos}`}</td>
                      <td><div style={{width:3,height:16,borderRadius:2,background:tm?.color||'#333'}}/></td>
                      <td style={{padding:'4px 6px'}}>
                        <span style={{fontFamily:"'Outfit',sans-serif",fontWeight:i<3?700:500,color:isDNF?'#444':i<10?'#eee':'#888',fontSize:12}}>{r.name}</span>
                      </td>
                      <td style={{textAlign:'center',fontFamily:"'Outfit',sans-serif",fontWeight:700,color:d&&d.err===0?'#4ade80':d&&d.err<=2?'#fbbf24':'#555',fontSize:12}}>{d?`P${d.pred}`:'—'}</td>
                      <td style={{textAlign:'center',color:d&&d.err===0?'#4ade80':d&&d.err<=2?'#fbbf24':'#ef4444',fontSize:11,fontWeight:700}}>{d?d.err===0?'✓':`±${d.err}`:''}</td>
                      <td style={{textAlign:'center',fontSize:10,color:isDNF?'#ef4444':'#333'}}>{r.note||''}</td>
                    </tr>
                  })}
                </tbody>
              </table>
            </div>
            <div style={{marginTop:10,fontSize:10,color:'#3a3a42',lineHeight:1.6}}>
              ⚠ Bu karşılaştırma FAIR BACKTEST'tir — model yarış sonuçlarını görmeden, sadece sralama verileriyle tahmin yapmıştır.
              2. yarış (China GP) tahmininde bu sonuçlar modele beslenecek.
            </div>
          </div>
        })()}
      </div>
    </div>
  )
}

const TH:React.CSSProperties={textAlign:'center',padding:'5px 3px',fontWeight:700,fontFamily:"'Outfit',sans-serif"}
function Bar({l,v}:{l:string;v:number}) {
  const c=v>.7?'#22c55e':v>.4?'#fbbf24':'#e10600'
  return <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:2}}>
    <span style={{fontSize:9,color:'#3a3a42',width:32,fontFamily:"'Outfit',sans-serif"}}>{l}</span>
    <div style={{flex:1,height:4,background:'#1a1a1e',borderRadius:2,overflow:'hidden'}}><div style={{width:`${v*100}%`,height:'100%',background:c,borderRadius:2,boxShadow:`0 0 8px ${c}30`}}/></div>
  </div>
}
function BarLabel({l,v,pct,tip}:{l:string;v:number;pct:number;tip:string}) {
  const c=v>.7?'#22c55e':v>.4?'#fbbf24':'#e10600'
  return <div style={{marginBottom:3}}>
    <div style={{display:'flex',alignItems:'center',gap:4}}>
      <span style={{fontSize:9,color:'#555',width:52,fontFamily:"'Outfit',sans-serif"}}>{l}</span>
      <div style={{flex:1,height:5,background:'#1a1a1e',borderRadius:3,overflow:'hidden'}}><div style={{width:`${v*100}%`,height:'100%',background:c,borderRadius:3,boxShadow:`0 0 6px ${c}40`}}/></div>
      <span style={{fontSize:9,color:c,fontWeight:700,width:28,textAlign:'right',fontFamily:"'JetBrains Mono',monospace"}}>{pct}%</span>
    </div>
    <div style={{fontSize:8,color:'#333',marginLeft:56,marginTop:1}}>{tip}</div>
  </div>
}
function Emp({text}:{text:string}){return<div style={{fontSize:12,color:'#2a2a2e',textAlign:'center',padding:16}}>{text}</div>}
function nw(){return new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
function pT(t:string):number{const[m,s]=t.split(':');return Number(m)*60+Number(s)}
function flagBg(f:string){return f==='GREEN'?'#166534':f==='YELLOW'?'#854d0e':f==='RED'?'#991b1b':'#2a2a2e'}
function tyreBg(c:string){return c==='SOFT'?'#dc2626':c==='MEDIUM'?'#eab308':c==='HARD'?'#e5e5e5':c==='INTERMEDIATE'?'#22c55e':'#3b82f6'}
