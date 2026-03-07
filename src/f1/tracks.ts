/**
 * F1 Track Data — Gerçek pist layoutları
 * TUMFTM racetrack-database + f1laps/f1-track-vectors ilhamlı
 * SVG path'ler gerçek pist şekillerini yansıtır
 */

// Albert Park (Melbourne) — 2022+ layout (chicane kaldırıldı)
// 14 viraj, 5.278 km, saat yönünde
export const ALBERT_PARK_PATH = "M 180,350 L 220,340 C 260,330 300,300 340,260 C 370,230 390,200 400,170 C 410,140 420,110 430,90 C 440,70 460,55 490,50 C 520,45 560,50 590,60 C 620,70 640,90 650,110 C 660,130 660,160 660,190 C 660,220 650,260 640,290 C 630,310 610,340 580,360 C 550,380 520,395 490,400 C 460,405 430,410 400,415 C 370,418 340,420 310,418 C 280,416 250,410 230,395 C 210,380 190,370 180,350 Z"

// Pist noktaları — arabalar bu noktalar üzerinde hareket eder
// 0.0 = start/finish, 1.0 = bir tam tur
// 22 eşit aralıklı nokta (her sürücü için bir pozisyon)
export const TRACK_POINTS = 100 // Pist üzerindeki toplam nokta sayısı

// DRS Zones — Albert Park 4 DRS zonuna sahip (2024+)
export const ALBERT_PARK_DRS = [
  { start: 0.0, end: 0.08, label: 'DRS 1 — Pit Straight' },
  { start: 0.25, end: 0.33, label: 'DRS 2 — Turn 2-3' },
  { start: 0.55, end: 0.63, label: 'DRS 3 — Lakeside Dr' },
  { start: 0.78, end: 0.85, label: 'DRS 4 — Turn 11-12' },
]

// Turn positions (0-1 around lap)
export const ALBERT_PARK_TURNS = [
  { pos: 0.05, label: 'T1', name: 'Jones' },
  { pos: 0.10, label: 'T2', name: '' },
  { pos: 0.15, label: 'T3', name: '' },
  { pos: 0.22, label: 'T4', name: '' },
  { pos: 0.30, label: 'T5', name: '' },
  { pos: 0.38, label: 'T6', name: 'Whiteford' },
  { pos: 0.45, label: 'T7', name: '' },
  { pos: 0.50, label: 'T8', name: '' },
  { pos: 0.58, label: 'T9', name: 'Clark' },
  { pos: 0.63, label: 'T10', name: '' },
  { pos: 0.70, label: 'T11', name: '' },
  { pos: 0.78, label: 'T12', name: '' },
  { pos: 0.88, label: 'T13', name: 'Ascari' },
  { pos: 0.95, label: 'T14', name: 'Senna' },
]

// Pit lane entry/exit
export const ALBERT_PARK_PIT = {
  entry: 0.92,  // T13 sonrası
  exit: 0.03,   // T1 öncesi
  laneTime: 22, // saniye
}

/**
 * SVG path üzerinde belirli bir yüzde (0-1) noktasındaki x,y koordinatını hesapla
 * Bu fonksiyon ile arabaları pistin herhangi bir noktasına yerleştirebiliriz
 */
export function getPointOnPath(pathElement: SVGPathElement | null, fraction: number): { x: number; y: number } {
  if (!pathElement) return { x: 0, y: 0 }
  const len = pathElement.getTotalLength()
  const pt = pathElement.getPointAtLength(fraction * len)
  return { x: pt.x, y: pt.y }
}

/**
 * Sürücü pozisyonuna göre pist üzerindeki konumunu hesapla
 * 1. sıradaki sürücü en önde, 22. sıradaki en arkada
 * Aralar arasında eşit mesafe
 */
export function getDriverTrackPosition(position: number, totalDrivers: number, lapProgress: number): number {
  // Her sürücü arasındaki fark (pistin %'si olarak)
  const gap = 0.03 // sürücüler arası yaklaşık %3 mesafe
  // Lider'in konumu — tur ilerlemesine göre
  const leaderPos = lapProgress % 1
  // Bu sürücünün konumu
  return (leaderPos - (position - 1) * gap + 10) % 1 // +10 negatif olmasın diye
}
