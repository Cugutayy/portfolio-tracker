import { useEffect, useRef } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";

type JourneyStop = {
  name: string;
  country: string;
  lat: number;
  lng: number;
  tone: "aqua" | "coral" | "sun";
};

const STOPS: JourneyStop[] = [
  { name: "Belgrad", country: "Sırbistan", lat: 44.7866, lng: 20.4489, tone: "aqua" },
  { name: "Jaipur", country: "Hindistan", lat: 26.9124, lng: 75.7873, tone: "coral" },
  { name: "Varanasi", country: "Hindistan", lat: 25.3176, lng: 82.9739, tone: "sun" },
];

function stopIcon(stop: JourneyStop) {
  return L.divIcon({
    className: "jn-v16-map-marker-shell",
    html: `
      <div class="jn-v16-map-marker is-${stop.tone}">
        <span class="jn-v16-map-pulse"></span>
        <span class="jn-v16-map-core"></span>
        <span class="jn-v16-map-label">
          <strong>${stop.name}</strong>
          <em>${stop.country}</em>
        </span>
      </div>
    `,
    iconSize: [1, 1],
    iconAnchor: [0, 0],
  });
}

export default function JourneyMapCard() {
  const mapElement = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapElement.current) return;

    const map = L.map(mapElement.current, {
      zoomControl: false,
      attributionControl: true,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
      zoomSnap: 0.1,
      fadeAnimation: true,
      inertia: false,
      preferCanvas: true,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
      {
        attribution: "© OpenStreetMap · © CARTO",
        subdomains: "abcd",
        maxZoom: 20,
      },
    ).addTo(map);

    const routePane = map.createPane("journeyRoutes");
    routePane.style.zIndex = "420";

    const markerPane = map.createPane("journeyMarkers");
    markerPane.style.zIndex = "450";

    const route = STOPS.map((stop) => [stop.lat, stop.lng] as L.LatLngTuple);

    L.polyline(route, {
      pane: "journeyRoutes",
      color: "#f0e9d7",
      weight: 1.2,
      opacity: 0.62,
      dashArray: "3 7",
      lineCap: "round",
      lineJoin: "round",
      interactive: false,
    }).addTo(map);

    STOPS.forEach((stop) => {
      L.marker([stop.lat, stop.lng], {
        icon: stopIcon(stop),
        interactive: false,
        pane: "journeyMarkers",
      }).addTo(map);
    });

    const bounds = L.latLngBounds(route);
    map.fitBounds(bounds.pad(0.95), {
      animate: false,
      paddingTopLeft: [28, 54],
      paddingBottomRight: [28, 62],
      maxZoom: 3.25,
    });

    requestAnimationFrame(() => map.invalidateSize(false));

    const resize = new ResizeObserver(() => map.invalidateSize(false));
    resize.observe(mapElement.current);

    return () => {
      resize.disconnect();
      map.remove();
    };
  }, []);

  return (
    <div className="jn-v16-leaflet-wrap" aria-label="Journey konum haritası">
      <div className="jn-v16-leaflet-map" ref={mapElement} />
      <div className="jn-v16-leaflet-vignette" aria-hidden="true" />
      <div className="jn-v16-leaflet-caption">
        <span className="jn-v16-verified-dot" />
        <span>Doğrulanmış konumlar</span>
      </div>
      <div className="jn-v16-leaflet-coords" aria-hidden="true">
        44.7866° N — 82.9739° E
      </div>
    </div>
  );
}
