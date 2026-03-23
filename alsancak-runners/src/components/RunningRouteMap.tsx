"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, useInView } from "framer-motion";
import dynamic from "next/dynamic";
import mapboxgl from "mapbox-gl";

const MapboxMap = dynamic(() => import("@/components/maps/MapboxMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-[16/10] bg-[#080808] rounded-sm animate-pulse" />
  ),
});

// ── Types ──────────────────────────────────────────────────────────

interface Activity {
  id: string;
  title: string;
  polylineEncoded?: string;
  distanceM: number;
  movingTimeSec?: number;
  elevationGainM?: number;
  memberName?: string;
  startTime?: string;
}

// ── Google Polyline Decoder ─────────────────────────────────────────

function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push([lng / 1e5, lat / 1e5]);
  }
  return coords;
}

function formatPace(distanceM: number, timeSec?: number): string {
  if (!timeSec || timeSec === 0 || distanceM === 0) return "--:--";
  const paceSecKm = timeSec / (distanceM / 1000);
  const min = Math.floor(paceSecKm / 60);
  const sec = Math.round(paceSecKm % 60);
  return `${min}:${sec.toString().padStart(2, "0")} /km`;
}

// ── Colors ─────────────────────────────────────────────────────────

const ROUTE_COLORS = [
  "#E6FF00",
  "#FFFFFF",
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96E6A1",
  "#DDA0DD",
  "#F0E68C",
];

// ── Component ──────────────────────────────────────────────────────

export default function RunningRouteMap() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);

  // Fetch activities with polylines
  useEffect(() => {
    if (!isInView) return;

    const fetchActivities = async () => {
      try {
        const res = await fetch("/api/community/activities?period=month&limit=50");
        if (res.ok) {
          const data = await res.json();
          const acts = (data.activities || []).filter(
            (a: Activity) => a.polylineEncoded
          );
          setActivities(acts);
          if (acts.length > 0) setSelectedActivity(acts[0]);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [isInView]);

  const handleMapReady = useCallback((map: mapboxgl.Map) => {
    setMapInstance(map);
  }, []);

  // Draw routes on map
  useEffect(() => {
    if (!mapInstance || activities.length === 0) return;

    const addRoutes = () => {
      // Remove existing layers
      activities.forEach((_, i) => {
        const glowId = `route-glow-${i}`;
        const lineId = `route-line-${i}`;
        const srcId = `route-src-${i}`;
        if (mapInstance.getLayer(glowId)) mapInstance.removeLayer(glowId);
        if (mapInstance.getLayer(lineId)) mapInstance.removeLayer(lineId);
        if (mapInstance.getSource(srcId)) mapInstance.removeSource(srcId);
      });

      // Add each activity as a separate source/layer
      activities.forEach((activity, i) => {
        const coords = decodePolyline(activity.polylineEncoded!);
        const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
        const isSelected = selectedActivity?.id === activity.id;
        const srcId = `route-src-${i}`;

        mapInstance.addSource(srcId, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: coords },
          },
        });

        // Glow
        mapInstance.addLayer({
          id: `route-glow-${i}`,
          type: "line",
          source: srcId,
          paint: {
            "line-color": color,
            "line-width": isSelected ? 8 : 4,
            "line-opacity": isSelected ? 0.2 : 0.05,
            "line-blur": 4,
          },
        });

        // Line
        mapInstance.addLayer({
          id: `route-line-${i}`,
          type: "line",
          source: srcId,
          paint: {
            "line-color": color,
            "line-width": isSelected ? 3 : 1.5,
            "line-opacity": isSelected ? 0.9 : 0.3,
          },
        });
      });

      // Fit bounds
      const allCoords = activities.flatMap((a) =>
        decodePolyline(a.polylineEncoded!)
      );
      if (allCoords.length > 0) {
        const bounds = allCoords.reduce(
          (b, c) => [
            [Math.min(b[0][0], c[0]), Math.min(b[0][1], c[1])],
            [Math.max(b[1][0], c[0]), Math.max(b[1][1], c[1])],
          ],
          [
            [allCoords[0][0], allCoords[0][1]],
            [allCoords[0][0], allCoords[0][1]],
          ]
        );
        mapInstance.fitBounds(bounds as [[number, number], [number, number]], {
          padding: 60,
          duration: 1500,
        });
      }
    };

    if (mapInstance.isStyleLoaded()) {
      addRoutes();
    } else {
      mapInstance.on("load", addRoutes);
    }
  }, [mapInstance, activities, selectedActivity]);

  // Highlight selected route
  useEffect(() => {
    if (!mapInstance || activities.length === 0) return;

    activities.forEach((activity, i) => {
      const isSelected = selectedActivity?.id === activity.id;
      const color = ROUTE_COLORS[i % ROUTE_COLORS.length];

      try {
        if (mapInstance.getLayer(`route-line-${i}`)) {
          mapInstance.setPaintProperty(`route-line-${i}`, "line-opacity", isSelected ? 0.9 : 0.3);
          mapInstance.setPaintProperty(`route-line-${i}`, "line-width", isSelected ? 3 : 1.5);
          mapInstance.setPaintProperty(`route-glow-${i}`, "line-opacity", isSelected ? 0.2 : 0.05);
          mapInstance.setPaintProperty(`route-glow-${i}`, "line-width", isSelected ? 8 : 4);
        }
      } catch {
        // Layer may not exist yet
      }
    });
  }, [selectedActivity, mapInstance, activities]);

  const hasData = activities.length > 0;

  return (
    <section ref={sectionRef} className="relative py-32 md:py-48 bg-[#111]">
      <div className="max-w-[1600px] mx-auto px-[clamp(1.5rem,4vw,4rem)]">
        {/* Header */}
        <div className="mb-16">
          <p className="label-text text-white/60 mb-4">ROUTE EXPLORER</p>
          <h2 className="headline-lg">
            YOUR
            <br />
            <span className="text-[#666]">ROUTES</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-[1fr_400px] gap-12">
          {/* Map */}
          <div className="relative aspect-[16/10] bg-[#080808] rounded-sm overflow-hidden">
            <MapboxMap
              center={[27.1428, 38.4237]}
              zoom={12.5}
              className="w-full h-full"
              onMapReady={handleMapReady}
              interactive={true}
            />

            {/* Empty state */}
            {!loading && !hasData && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#080808]/60 backdrop-blur-sm">
                <div className="text-center">
                  <p className="text-[13px] tracking-[0.15em] text-[#555] font-mono uppercase">
                    &#304;ZM&#304;R K&Ouml;RFEZ&#304;
                  </p>
                  <p className="text-[11px] text-[#444] mt-2">
                    Hen&uuml;z rota yok
                  </p>
                </div>
              </div>
            )}

            {/* Route name overlay */}
            {selectedActivity && (
              <div className="absolute top-4 left-4">
                <motion.div
                  key={selectedActivity.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="bg-[#111]/80 backdrop-blur-sm border border-[#222] px-3 py-2 rounded-sm"
                >
                  <p className="text-[10px] tracking-[0.2em] font-mono text-[#E6FF00]">
                    {selectedActivity.title.toUpperCase()}
                  </p>
                  <p className="text-[9px] text-[#444] font-mono mt-0.5">
                    {(selectedActivity.distanceM / 1000).toFixed(1)} KM
                    {selectedActivity.elevationGainM
                      ? ` \u00B7 ${Math.round(selectedActivity.elevationGainM)}m elev.`
                      : ""}
                  </p>
                </motion.div>
              </div>
            )}
          </div>

          {/* Route selector sidebar */}
          <div className="space-y-4">
            {loading && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-full p-6 border border-[#222] animate-pulse"
                  >
                    <div className="h-4 w-32 bg-[#222] rounded mb-3" />
                    <div className="h-3 w-48 bg-[#1a1a1a] rounded" />
                  </div>
                ))}
              </div>
            )}

            {!loading && !hasData && (
              <div className="p-6 border border-dashed border-[#333] text-center">
                <p className="text-[11px] text-[#555] tracking-wider">
                  Hen&uuml;z aktivite yok.
                </p>
                <p className="text-[10px] text-[#444] mt-1">
                  Ko&#351;u verisi eklenince rotalar burada g&ouml;r&uuml;n&uuml;r.
                </p>
              </div>
            )}

            {activities.map((activity, i) => {
              const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
              const isActive = selectedActivity?.id === activity.id;
              const distKm = (activity.distanceM / 1000).toFixed(1);

              return (
                <motion.button
                  key={activity.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  onClick={() => setSelectedActivity(activity)}
                  className={`w-full text-left p-6 border transition-all duration-300 ${
                    isActive
                      ? "border-[#E6FF00] bg-[#E6FF00]/5"
                      : "border-[#222] hover:border-[#444]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm font-bold tracking-wider">
                        {activity.title.toUpperCase()}
                      </span>
                    </div>
                    <span
                      className="text-lg font-bold"
                      style={{ color }}
                    >
                      {distKm} KM
                    </span>
                  </div>
                  {activity.memberName && (
                    <p className="text-xs text-[#666] mb-2">
                      {activity.memberName}
                    </p>
                  )}
                  <div className="flex gap-6 text-[10px] tracking-wider text-[#555]">
                    {activity.elevationGainM && (
                      <span>
                        ELEVATION {Math.round(activity.elevationGainM)}m
                      </span>
                    )}
                    <span>
                      PACE{" "}
                      {formatPace(activity.distanceM, activity.movingTimeSec)}
                    </span>
                  </div>
                </motion.button>
              );
            })}

            {/* Strava hint */}
            <div className="mt-4 p-4 border border-dashed border-[#333] text-center">
              <p className="text-[10px] tracking-[0.15em] text-[#555]">
                STRAVA &#304;LE SENKRON&#304;ZE ET
              </p>
              <p className="text-[10px] text-[#444] mt-1">
                Ger&ccedil;ek ko&#351;u verilerini g&ouml;r&uuml;nt&uuml;le
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
