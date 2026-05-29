import { useEffect, useRef, useState } from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export type MuseumPlace = {
  title: string
  kindLabel: string
  loc: string
  geo: { lat: number; lng: number; zoom?: number }
  placePhoto?: string
  address?: string
}

const CSS = `
.mi-root{position:fixed;inset:0;z-index:60;background:#06080d;overflow:hidden;
  font-family:'Inter',system-ui,sans-serif;color:#eef2f8}
.mi-map{position:absolute;inset:0;background:#06080d}
.mi-map .leaflet-container{background:#06080d;width:100%;height:100%;outline:none;font-family:inherit}
.mi-map .leaflet-control-attribution{background:rgba(6,8,13,.55);color:#7f8aa0;
  font-size:9px;letter-spacing:.02em;padding:2px 7px;backdrop-filter:blur(4px)}
.mi-map .leaflet-control-attribution a{color:#9aa6bd}
.mi-veil{position:absolute;inset:0;pointer-events:none;
  background:
    radial-gradient(120% 80% at 50% 12%,transparent 38%,rgba(4,6,11,.55) 100%),
    linear-gradient(to bottom,rgba(4,6,11,.42) 0%,transparent 22%,transparent 58%,rgba(4,6,11,.86) 100%)}
.mi-pin{position:relative;width:30px;height:30px}
.mi-pin i{position:absolute;left:50%;top:50%;width:11px;height:11px;border-radius:50%;
  transform:translate(-50%,-50%);background:#e9c987;
  box-shadow:0 0 0 4px rgba(233,201,135,.22),0 0 18px 5px rgba(233,201,135,.55)}
.mi-pin b{position:absolute;left:50%;top:50%;width:30px;height:30px;border-radius:50%;
  transform:translate(-50%,-50%);border:1.5px solid rgba(233,201,135,.7);
  animation:mi-ping 2.1s cubic-bezier(.2,.6,.3,1) infinite}
@keyframes mi-ping{0%{transform:translate(-50%,-50%) scale(.35);opacity:.9}
  70%{opacity:0}100%{transform:translate(-50%,-50%) scale(1.9);opacity:0}}
.mi-eyebrow{position:absolute;left:0;right:0;top:8%;text-align:center;pointer-events:none;
  opacity:0;animation:mi-fade .9s ease .3s forwards}
.mi-eyebrow .k{font-size:11px;letter-spacing:.42em;text-transform:uppercase;color:#9aa6bd}
.mi-eyebrow .t{margin-top:9px;font-family:Georgia,'Times New Roman',serif;font-style:italic;
  font-size:clamp(20px,3.4vw,34px);color:#f3f6fb;text-shadow:0 2px 30px rgba(0,0,0,.7)}
.mi-skip{position:absolute;top:20px;left:22px;z-index:6;
  border:1px solid rgba(255,255,255,.18);background:rgba(10,13,20,.5);color:#cdd5e4;
  font:inherit;font-size:12px;letter-spacing:.12em;text-transform:uppercase;
  padding:9px 16px;border-radius:999px;cursor:pointer;backdrop-filter:blur(6px);
  transition:background .2s,border-color .2s}
.mi-skip:hover{background:rgba(20,25,36,.75);border-color:rgba(233,201,135,.5)}
.mi-card{position:absolute;left:50%;bottom:6%;transform:translateX(-50%) translateY(18px);
  width:min(420px,90vw);background:rgba(9,12,19,.82);backdrop-filter:blur(14px);
  border:1px solid rgba(255,255,255,.1);border-radius:16px;overflow:hidden;
  box-shadow:0 24px 70px rgba(0,0,0,.6);opacity:0;pointer-events:none;
  transition:opacity .7s ease,transform .7s cubic-bezier(.2,.7,.2,1)}
.mi-card.in{opacity:1;transform:translateX(-50%) translateY(0);pointer-events:auto}
.mi-photo{position:relative;height:148px;background:#11151f center/cover no-repeat}
.mi-photo::after{content:'';position:absolute;inset:0;
  background:linear-gradient(to bottom,transparent 30%,rgba(9,12,19,.92) 100%)}
.mi-body{padding:15px 18px 18px}
.mi-klabel{font-size:10px;letter-spacing:.34em;text-transform:uppercase;color:#e9c987}
.mi-title{margin:7px 0 3px;font-family:Georgia,'Times New Roman',serif;font-style:italic;
  font-size:23px;line-height:1.15;color:#f4f7fc}
.mi-loc{font-size:12.5px;color:#9aa6bd;letter-spacing:.02em}
.mi-addr{margin-top:3px;font-size:11px;color:#69728a;letter-spacing:.02em}
.mi-enter{margin-top:15px;width:100%;border:1px solid rgba(233,201,135,.45);
  background:linear-gradient(180deg,rgba(233,201,135,.16),rgba(233,201,135,.05));
  color:#f1e4c6;font:inherit;font-size:13px;letter-spacing:.16em;text-transform:uppercase;
  padding:12px;border-radius:10px;cursor:pointer;transition:background .22s,border-color .22s}
.mi-enter:hover{background:linear-gradient(180deg,rgba(233,201,135,.28),rgba(233,201,135,.1));
  border-color:rgba(233,201,135,.8)}
.mi-dots{display:inline-flex;gap:4px;margin-left:8px;vertical-align:middle}
.mi-dots i{width:4px;height:4px;border-radius:50%;background:#f1e4c6;opacity:.3;
  animation:mi-blink 1.2s infinite}
.mi-dots i:nth-child(2){animation-delay:.2s}
.mi-dots i:nth-child(3){animation-delay:.4s}
@keyframes mi-blink{0%,80%,100%{opacity:.3}40%{opacity:1}}
/* cinematic exit — black wipe that carries the visitor into the salon */
.mi-fade{position:absolute;inset:0;z-index:8;pointer-events:none;opacity:0;
  background:radial-gradient(120% 90% at 50% 50%,rgba(6,8,13,.65) 0%,#06080d 75%);
  transition:opacity .8s ease}
.mi-root.leaving .mi-fade{opacity:1;pointer-events:auto}
.mi-root.leaving .mi-card,.mi-root.leaving .mi-skip,.mi-root.leaving .mi-eyebrow{
  opacity:0;transition:opacity .5s ease}
@keyframes mi-fade{to{opacity:1}}
@media (prefers-reduced-motion:reduce){
  .mi-pin b{animation:none}.mi-eyebrow{animation:none;opacity:1}
  .mi-fade{transition:none}
}
`

export default function MuseumIntro({
  place,
  onArrive,
  onSkip,
}: {
  place: MuseumPlace
  onArrive: () => void
  onSkip?: () => void
}) {
  const mapEl = useRef<HTMLDivElement>(null)
  const [cardIn, setCardIn] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const arrivedRef = useRef(false)
  const leaveRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (!mapEl.current) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const target: L.LatLngExpression = [place.geo.lat, place.geo.lng]
    const finalZoom = place.geo.zoom ?? 16

    const map = L.map(mapEl.current, {
      zoomControl: false, attributionControl: true,
      dragging: false, scrollWheelZoom: false, doubleClickZoom: false,
      boxZoom: false, keyboard: false, touchZoom: false, tap: false,
      zoomSnap: 0, fadeAnimation: true, inertia: false,
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap · © CARTO', subdomains: 'abcd', maxZoom: 20,
    }).addTo(map)

    const icon = L.divIcon({
      className: 'mi-pinwrap', html: '<div class="mi-pin"><b></b><i></i></div>',
      iconSize: [30, 30], iconAnchor: [15, 15],
    })
    L.marker(target, { icon, interactive: false }).addTo(map)

    const timers: number[] = []
    const arrive = () => {
      if (arrivedRef.current) return
      arrivedRef.current = true
      onArrive()
    }
    // cinematic exit — dive the last bit *into* the building while the scene fades to black
    const FADE = 800
    const startLeave = () => {
      if (arrivedRef.current) return
      setLeaving(true)
      // final push-in: zoom past the rooftop so it reads as stepping inside the museum
      if (!reduce) map.flyTo(target, finalZoom + 2, { duration: 0.8, easeLinearity: 0.3 })
      timers.push(window.setTimeout(arrive, FADE))
    }
    leaveRef.current = startLeave

    map.invalidateSize(false)

    if (reduce) {
      map.setView(target, finalZoom, { animate: false })
      setCardIn(true)
      timers.push(window.setTimeout(arrive, 700))
    } else {
      // GTA-style cut: open above the planet, a brief beat for tiles, then a snappy
      // ~3s descent straight onto the museum and a quick dive inside — ~4s end to end.
      map.setView(target, 2.6, { animate: false })
      timers.push(window.setTimeout(() => {
        map.flyTo(target, finalZoom, { duration: 2.8, easeLinearity: 0.18 })
      }, 350))
      timers.push(window.setTimeout(() => setCardIn(true), 2400))
      timers.push(window.setTimeout(startLeave, 3400))
    }

    return () => {
      timers.forEach(clearTimeout)
      map.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place.geo.lat, place.geo.lng])

  // "Geç →" — skip straight into the hall, no waiting
  const skip = () => {
    if (arrivedRef.current) return
    arrivedRef.current = true
    ;(onSkip ?? onArrive)()
  }

  return (
    <div className={`mi-root${leaving ? ' leaving' : ''}`}>
      <style>{CSS}</style>
      <div className="mi-map" ref={mapEl} />
      <div className="mi-veil" />
      <div className="mi-eyebrow">
        <div className="k">Konuma yaklaşılıyor</div>
        <div className="t">{place.loc}</div>
      </div>
      <button className="mi-skip" onClick={skip}>Geç →</button>
      <div className={`mi-card${cardIn ? ' in' : ''}`}>
        {place.placePhoto && (
          <div className="mi-photo" style={{ backgroundImage: `url(${place.placePhoto})` }} />
        )}
        <div className="mi-body">
          <div className="mi-klabel">{place.kindLabel}</div>
          <div className="mi-title">{place.title}</div>
          <div className="mi-loc">{place.loc}</div>
          {place.address && <div className="mi-addr">{place.address}</div>}
          <button className="mi-enter" onClick={() => leaveRef.current()}>
            Salona giriliyor<span className="mi-dots"><i /><i /><i /></span>
          </button>
        </div>
      </div>
      {/* cinematic fade — covers the map and carries us into the hall */}
      <div className="mi-fade" />
    </div>
  )
}
