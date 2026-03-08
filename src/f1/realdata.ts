/**
 * 2026 Avustralya GP — Gerçek Sıralama Sonuçları
 * OpenF1 API henüz güncellenmemişse bu veri kullanılır.
 * Kaynak: formula1.com, planetf1.com, speedcafe.com (8 Mart 2026)
 */

export interface RealQualiResult {
  position: number
  driverCode: string
  driverName: string
  team: string
  q3Time: string | null    // "1:18.518" formatı
  q2Time: string | null
  q1Time: string | null
  gap: string | null       // "+0.293" formatı
  note: string | null      // "Crashed Q1", "DNS" vb.
}

// 2026 Avustralya GP Sıralama Sonuçları — Albert Park
export const AUSTRALIA_2026_QUALI: RealQualiResult[] = [
  { position:1,  driverCode:'RUS', driverName:'George Russell',      team:'Mercedes',     q3Time:'1:18.518', q2Time:null, q1Time:null, gap:null,     note:'Pole — her bölüm en hızlı' },
  { position:2,  driverCode:'ANT', driverName:'Kimi Antonelli',      team:'Mercedes',     q3Time:'1:18.811', q2Time:null, q1Time:null, gap:'+0.293', note:'Soruşturma altında (pit lane ihlali)' },
  { position:3,  driverCode:'HAD', driverName:'Isack Hadjar',        team:'Red Bull',     q3Time:'1:19.303', q2Time:null, q1Time:null, gap:'+0.785', note:'Red Bull ilk yarış — etkileyici' },
  { position:4,  driverCode:'LEC', driverName:'Charles Leclerc',     team:'Ferrari',      q3Time:'1:19.327', q2Time:null, q1Time:null, gap:'+0.809', note:null },
  { position:5,  driverCode:'PIA', driverName:'Oscar Piastri',       team:'McLaren',      q3Time:'1:19.380', q2Time:null, q1Time:null, gap:'+0.862', note:'Ev yarışı' },
  { position:6,  driverCode:'NOR', driverName:'Lando Norris',        team:'McLaren',      q3Time:'1:19.475', q2Time:null, q1Time:null, gap:'+0.957', note:'Şampiyon — zor sıralama' },
  { position:7,  driverCode:'HAM', driverName:'Lewis Hamilton',      team:'Ferrari',      q3Time:'1:19.478', q2Time:null, q1Time:null, gap:'+0.960', note:null },
  { position:8,  driverCode:'LAW', driverName:'Liam Lawson',         team:'Racing Bulls', q3Time:'1:19.994', q2Time:null, q1Time:null, gap:'+1.476', note:null },
  { position:9,  driverCode:'LIN', driverName:'Arvid Lindblad',      team:'Racing Bulls', q3Time:'1:21.247', q2Time:null, q1Time:null, gap:'+2.729', note:'Tek çaylak' },
  { position:10, driverCode:'BOR', driverName:'Gabriel Bortoleto',   team:'Audi',         q3Time:null,       q2Time:null, q1Time:null, gap:null,     note:'Q3 çıkamadı — teknik sorun' },
  { position:11, driverCode:'HUL', driverName:'Nico Hulkenberg',     team:'Audi',         q3Time:null,       q2Time:'1:20.303', q1Time:null, gap:null, note:'Q2 elendi' },
  { position:12, driverCode:'BEA', driverName:'Oliver Bearman',      team:'Haas',         q3Time:null,       q2Time:'1:20.311', q1Time:null, gap:null, note:'Q2 elendi' },
  { position:13, driverCode:'OCO', driverName:'Esteban Ocon',        team:'Haas',         q3Time:null,       q2Time:'1:20.491', q1Time:null, gap:null, note:'Q2 elendi' },
  { position:14, driverCode:'GAS', driverName:'Pierre Gasly',        team:'Alpine',       q3Time:null,       q2Time:'1:20.501', q1Time:null, gap:null, note:'Q2 elendi' },
  { position:15, driverCode:'ALB', driverName:'Alexander Albon',     team:'Williams',     q3Time:null,       q2Time:'1:20.941', q1Time:null, gap:null, note:'Q2 elendi' },
  { position:16, driverCode:'COL', driverName:'Franco Colapinto',    team:'Alpine',       q3Time:null,       q2Time:'1:21.270', q1Time:null, gap:null, note:'Q2 elendi' },
  { position:17, driverCode:'ALO', driverName:'Fernando Alonso',     team:'Aston Martin', q3Time:null,       q2Time:null, q1Time:'1:21.969', gap:null, note:'Q1 elendi' },
  { position:18, driverCode:'PER', driverName:'Sergio Perez',        team:'Cadillac',     q3Time:null,       q2Time:null, q1Time:'1:22.605', gap:null, note:'Q1 elendi' },
  { position:19, driverCode:'BOT', driverName:'Valtteri Bottas',     team:'Cadillac',     q3Time:null,       q2Time:null, q1Time:null, gap:null, note:'Q1 elendi' },
  { position:20, driverCode:'VER', driverName:'Max Verstappen',      team:'Red Bull',     q3Time:null,       q2Time:null, q1Time:null, gap:null, note:'Q1 kaza — arka aks kilitledi' },
  { position:21, driverCode:'SAI', driverName:'Carlos Sainz',        team:'Williams',     q3Time:null,       q2Time:null, q1Time:null, gap:null, note:'DNS — ERS sorunu' },
  { position:22, driverCode:'STR', driverName:'Lance Stroll',        team:'Aston Martin', q3Time:null,       q2Time:null, q1Time:null, gap:null, note:'DNS' },
]

// Pole zamanı saniye cinsinden
export const AUSTRALIA_2026_POLE_TIME = 78.518 // 1:18.518

// Grid sıralaması — yarış başlangıcı
export function getAustralia2026Grid() {
  return AUSTRALIA_2026_QUALI.map(q => ({
    ...q,
    gridPosition: q.position,
  }))
}

// GERÇEK YARIŞ SONUÇLARI — SADECE backtesting/review için
// Model eğitiminde KULLANILMAZ — fair backtesting
export const AUSTRALIA_2026_RACE_RESULT = [
  {pos:1,code:'RUS',name:'George Russell',team:'Mercedes',status:'finished'},
  {pos:2,code:'ANT',name:'Kimi Antonelli',team:'Mercedes',status:'finished'},
  {pos:3,code:'LEC',name:'Charles Leclerc',team:'Ferrari',status:'finished'},
  {pos:4,code:'HAM',name:'Lewis Hamilton',team:'Ferrari',status:'finished'},
  {pos:5,code:'NOR',name:'Lando Norris',team:'McLaren',status:'finished'},
  {pos:6,code:'VER',name:'Max Verstappen',team:'Red Bull',status:'finished',note:'P20\u2192P6'},
  {pos:7,code:'BEA',name:'Oliver Bearman',team:'Haas',status:'finished'},
  {pos:8,code:'LIN',name:'Arvid Lindblad',team:'Racing Bulls',status:'finished'},
  {pos:9,code:'BOR',name:'Gabriel Bortoleto',team:'Audi',status:'finished'},
  {pos:10,code:'GAS',name:'Pierre Gasly',team:'Alpine',status:'finished'},
  {pos:11,code:'OCO',name:'Esteban Ocon',team:'Haas',status:'finished'},
  {pos:12,code:'ALB',name:'Alexander Albon',team:'Williams',status:'finished'},
  {pos:13,code:'LAW',name:'Liam Lawson',team:'Racing Bulls',status:'finished'},
  {pos:14,code:'COL',name:'Franco Colapinto',team:'Alpine',status:'finished'},
  {pos:15,code:'SAI',name:'Carlos Sainz',team:'Williams',status:'finished'},
  {pos:16,code:'PER',name:'Sergio Perez',team:'Cadillac',status:'finished'},
  {pos:0,code:'STR',name:'Lance Stroll',team:'Aston Martin',status:'dnf'},
  {pos:0,code:'ALO',name:'Fernando Alonso',team:'Aston Martin',status:'dnf'},
  {pos:0,code:'BOT',name:'Valtteri Bottas',team:'Cadillac',status:'dnf'},
  {pos:0,code:'HAD',name:'Isack Hadjar',team:'Red Bull',status:'dnf'},
  {pos:0,code:'PIA',name:'Oscar Piastri',team:'McLaren',status:'dns'},
  {pos:0,code:'HUL',name:'Nico Hulkenberg',team:'Audi',status:'dns'},
]

export function computeBacktest(preds:{driverCode:string,predictedPosition:number}[]){
  const actual=AUSTRALIA_2026_RACE_RESULT.filter(r=>r.status==='finished')
  let totalErr=0,count=0,winOk=false,podHits=0
  const details:{code:string,pred:number,real:number,err:number}[]=[]
  for(const p of preds){
    const r=actual.find(a=>a.code===p.driverCode)
    if(!r||r.pos===0) continue
    const e=Math.abs(p.predictedPosition-r.pos)
    totalErr+=e;count++
    if(p.predictedPosition===1&&r.pos===1) winOk=true
    if(p.predictedPosition<=3&&r.pos<=3) podHits++
    details.push({code:p.driverCode,pred:p.predictedPosition,real:r.pos,err:e})
  }
  return {mae:count>0?totalErr/count:0,winnerCorrect:winOk,podiumHits:podHits,details:details.sort((a,b)=>a.real-b.real)}
}
