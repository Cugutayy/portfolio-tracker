"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import mapboxgl from "mapbox-gl";

const MapboxMap = dynamic(() => import("@/components/maps/MapboxMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-[16/9] bg-[#080808] rounded-sm animate-pulse" />
  ),
});

// ── Types ──────────────────────────────────────────────────────────

interface CommunityStats {
  members: number;
  totalRuns: number;
  totalDistanceKm: number;
  totalTimeHours: number;
  monthlyRuns: number;
  monthlyDistanceKm: number;
  upcomingEvents: number;
}

interface Activity {
  id: string;
  title: string;
  polylineEncoded?: string;
  distanceM: number;
  memberName?: string;
  startLat?: number;
  startLng?: number;
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

    coords.push([lng / 1e5, lat / 1e5]); // [lng, lat] for Mapbox
  }
  return coords;
}

// ── Component ──────────────────────────────────────────────────────

export default function IzmirRunMap() {
  const t = useTranslations("home.map");
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);

  // Fetch real data
  useEffect(() => {
    if (!isInView) return;

    const fetchData = async () => {
      try {
        const [statsRes, activitiesRes] = await Promise.all([
          fetch("/api/community/stats"),
          fetch("/api/community/activities?period=month&limit=50"),
        ]);

        if (statsRes.ok) {
          setStats(await statsRes.json());
        }

        if (activitiesRes.ok) {
          const data = await activitiesRes.json();
          setActivities(data.activities || []);
        }
      } catch {
        // Silently fail — we show empty state
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isInView]);

  // Add routes to map when ready
  const handleMapReady = useCallback(
    (map: mapboxgl.Map) => {
      setMapInstance(map);
    },
    []
  );

  // Draw activity polylines on map when activities load
  useEffect(() => {
    if (!mapInstance || activities.length === 0) return;

    // Wait for map style to be loaded
    const addRoutes = () => {
      const routeFeatures = activities
        .filter((a) => a.polylineEncoded)
        .map((a, i) => {
          const coords = decodePolyline(a.polylineEncoded!);
          return {
            type: "Feature" as const,
            properties: {
              id: a.id,
              title: a.title,
              distanceKm: (a.distanceM / 1000).toFixed(1),
            },
            geometry: {
              type: "LineString" as const,
              coordinates: coords,
            },
          };
        });

      if (routeFeatures.length === 0) return;

      // Remove existing source if re-rendering
      if (mapInstance.getSource("activity-routes")) {
        mapInstance.removeLayer("activity-routes-glow");
        mapInstance.removeLayer("activity-routes-line");
        mapInstance.removeSource("activity-routes");
      }

      mapInstance.addSource("activity-routes", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: routeFeatures,
        },
      });

      // Glow layer
      mapInstance.addLayer({
        id: "activity-routes-glow",
        type: "line",
        source: "activity-routes",
        paint: {
          "line-color": "#E6FF00",
          "line-width": 6,
          "line-opacity": 0.15,
          "line-blur": 4,
        },
      });

      // Main line
      mapInstance.addLayer({
        id: "activity-routes-line",
        type: "line",
        source: "activity-routes",
        paint: {
          "line-color": "#E6FF00",
          "line-width": 2,
          "line-opacity": 0.7,
        },
      });

      // Fit bounds to all routes
      const allCoords = routeFeatures.flatMap(
        (f) => f.geometry.coordinates
      );
      if (allCoords.length > 0) {
        const bounds = allCoords.reduce(
          (b, c) => {
            return [
              [Math.min(b[0][0], c[0]), Math.min(b[0][1], c[1])],
              [Math.max(b[1][0], c[0]), Math.max(b[1][1], c[1])],
            ];
          },
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
  }, [mapInstance, activities]);

  const hasData = activities.length > 0;

  return (
    <section
      ref={sectionRef}
      className="relative py-32 md:py-48 bg-[#111] overflow-hidden"
    >
      <div className="max-w-[1600px] mx-auto px-[clamp(1.5rem,4vw,4rem)]">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-16">
          <div>
            <p className="label-text text-white/60 mb-4">{t("label")}</p>
            <h2 className="headline-lg">
              {t("title").split("\n")[0]}
              <br />
              <span className="text-[#666]">
                {t("title").split("\n")[1]}
              </span>
            </h2>
          </div>
          <p className="body-text max-w-xs mt-4 md:mt-0 md:text-right">
            {t("subtitle")}
          </p>
        </div>

        {/* Map + Stats grid */}
        <div className="grid lg:grid-cols-[1fr_340px] gap-8 max-w-6xl mx-auto">
          {/* Map */}
          <div className="relative w-full aspect-[16/9] rounded-sm overflow-hidden bg-[#080808]">
            <MapboxMap
              center={[27.1428, 38.4237]}
              zoom={12.5}
              className="w-full h-full"
              onMapReady={handleMapReady}
              interactive={true}
            />

            {/* Empty state overlay */}
            {!loading && !hasData && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#080808]/60 backdrop-blur-sm">
                <div className="text-center">
                  <p className="text-[13px] tracking-[0.15em] text-[#555] font-mono uppercase">
                    {t("bayLabel")}
                  </p>
                  <p className="text-[11px] text-[#444] mt-2">
                    Hen&uuml;z rota yok
                  </p>
                </div>
              </div>
            )}

            {/* Route count badge */}
            {hasData && (
              <div className="absolute top-4 left-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="bg-[#111]/80 backdrop-blur-sm border border-[#222] px-3 py-2 rounded-sm"
                >
                  <p className="text-[10px] tracking-[0.2em] font-mono text-[#E6FF00]">
                    {activities.length} ROTA
                  </p>
                </motion.div>
              </div>
            )}
          </div>

          {/* Stats sidebar */}
          <div className="space-y-4">
            {/* Community stats cards */}
            {stats && (
              <>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.3 }}
                  className="p-6 border border-[#222] bg-[#0A0A0A]"
                >
                  <p className="text-[10px] tracking-[0.15em] text-[#555] mb-3 uppercase">
                    Topluluk
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-2xl font-bold text-[#E6FF00]">
                        {stats.members}
                      </p>
                      <p className="text-[9px] text-[#555] tracking-wider mt-1">
                        KOSUCU
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {stats.totalRuns}
                      </p>
                      <p className="text-[9px] text-[#555] tracking-wider mt-1">
                        KOSU
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {stats.totalDistanceKm}
                      </p>
                      <p className="text-[9px] text-[#555] tracking-wider mt-1">
                        KM
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.5 }}
                  className="p-6 border border-[#222] bg-[#0A0A0A]"
                >
                  <p className="text-[10px] tracking-[0.15em] text-[#555] mb-3 uppercase">
                    Bu Ay
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xl font-bold text-white">
                        {stats.monthlyRuns}
                      </p>
                      <p className="text-[9px] text-[#555] tracking-wider mt-1">
                        KOSU
                      </p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-white">
                        {stats.monthlyDistanceKm}
                      </p>
                      <p className="text-[9px] text-[#555] tracking-wider mt-1">
                        KM
                      </p>
                    </div>
                  </div>
                </motion.div>

                {stats.upcomingEvents > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.7 }}
                    className="p-6 border border-[#E6FF00]/30 bg-[#E6FF00]/5"
                  >
                    <p className="text-[10px] tracking-[0.15em] text-[#E6FF00] mb-2 uppercase">
                      Yakla&#351;an Etkinlikler
                    </p>
                    <p className="text-2xl font-bold text-[#E6FF00]">
                      {stats.upcomingEvents}
                    </p>
                  </motion.div>
                )}
              </>
            )}

            {/* Loading state */}
            {loading && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-6 border border-[#222] bg-[#0A0A0A] animate-pulse"
                  >
                    <div className="h-3 w-20 bg-[#222] rounded mb-3" />
                    <div className="h-8 w-16 bg-[#222] rounded" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty stats state */}
            {!loading && !stats && (
              <div className="p-6 border border-dashed border-[#333] text-center">
                <p className="text-[10px] tracking-[0.15em] text-[#555]">
                  Topluluk verileri y&uuml;kleniyor...
                </p>
              </div>
            )}

            {/* Strava connect hint */}
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
