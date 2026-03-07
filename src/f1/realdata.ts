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
    gridPosition: q.position, // penaltiler sonrası değişebilir
  }))
}
