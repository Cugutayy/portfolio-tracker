"use client";

import { useEffect, useState, use } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";

const RouteMap = dynamic(() => import("@/components/maps/RouteMap"), {
  ssr: false,
});

interface RouteDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  distanceM: number;
  elevationGainM: number | null;
  startLat: number | null;
  startLng: number | null;
  endLat: number | null;
  endLng: number | null;
  surfaceType: string | null;
  difficulty: string | null;
  isLoop: boolean | null;
  city: string | null;
  polylineGeojson: {
    type: "LineString";
    coordinates: [number, number][];
  } | null;
}

interface Segment {
  segmentIndex: number;
  name: string | null;
  distanceM: number | null;
  elevationM: number | null;
  surfaceType: string | null;
}

const difficultyLabels: Record<string, { label: string; color: string }> = {
  easy: { label: "KOLAY", color: "#4ade80" },
  moderate: { label: "ORTA", color: "#E6FF00" },
  hard: { label: "ZOR", color: "#FC4C02" },
};

const surfaceLabels: Record<string, string> = {
  road: "Asfalt",
  trail: "Patika",
  mixed: "Karışık",
  track: "Pist",
};

export default function RouteDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/routes/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        setRoute(data.route);
        setSegments(data.segments || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E6FF00] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!route) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#666] mb-4">Rota bulunamadı</p>
          <Link
            href="/routes"
            className="text-[11px] tracking-[0.15em] uppercase text-[#E6FF00] border border-[#E6FF00] px-6 py-3 hover:bg-[#E6FF00] hover:text-black transition-colors"
          >
            ROTALARA DÖN
          </Link>
        </div>
      </main>
    );
  }

  const diff = difficultyLabels[route.difficulty || "moderate"];

  return (
    <main className="min-h-screen bg-[#0A0A0A]">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-[#0A0A0A] border-b border-[#1a1a1a]">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 md:px-12 py-4">
          <Link
            href="/"
            className="text-sm font-bold tracking-[0.2em] uppercase text-white"
          >
            ALSANCAK<span className="text-[#E6FF00]">.</span>RUNNERS
          </Link>
          <Link
            href="/routes"
            className="text-[11px] tracking-[0.15em] uppercase text-[#666] hover:text-white transition-colors flex items-center gap-2"
          >
            <span>&#x2190;</span> ROTALAR
          </Link>
        </div>
      </nav>

      <div className="pt-[72px]">
        {/* Map */}
        {route.polylineGeojson && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <RouteMap
              geojson={route.polylineGeojson}
              className="w-full h-[350px] md:h-[450px]"
              isLoop={route.isLoop || false}
            />
          </motion.div>
        )}

        <div className="max-w-[1200px] mx-auto px-6 md:px-12 py-10">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <div className="flex items-center gap-2 mb-3">
              <span
                className="text-[10px] tracking-wider uppercase px-2 py-0.5 border"
                style={{
                  color: diff.color,
                  borderColor: `${diff.color}33`,
                }}
              >
                {diff.label}
              </span>
              {route.surfaceType && (
                <span className="text-[10px] tracking-wider uppercase text-[#555] px-2 py-0.5 border border-[#222]">
                  {surfaceLabels[route.surfaceType] || route.surfaceType}
                </span>
              )}
              {route.isLoop && (
                <span className="text-[10px] tracking-wider uppercase text-[#E6FF00] px-2 py-0.5 border border-[#E6FF00]/20">
                  DÖNGÜ
                </span>
              )}
            </div>
            <h1
              className="text-3xl md:text-5xl font-bold text-white mb-4"
              style={{ fontFamily: "var(--font-heading, inherit)" }}
            >
              {route.name}
            </h1>
            <p className="text-[15px] text-[#999] leading-relaxed max-w-2xl">
              {route.description}
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12"
          >
            <div className="border border-[#222] p-5">
              <p className="text-[10px] tracking-[0.15em] uppercase text-[#555] mb-2">
                MESAFE
              </p>
              <p className="text-2xl font-bold text-white">
                {(route.distanceM / 1000).toFixed(1)}
                <span className="text-[#666] text-sm ml-1">km</span>
              </p>
            </div>
            <div className="border border-[#222] p-5">
              <p className="text-[10px] tracking-[0.15em] uppercase text-[#555] mb-2">
                TIRMANMA
              </p>
              <p className="text-2xl font-bold text-white">
                {route.elevationGainM
                  ? `${Math.round(route.elevationGainM)}`
                  : "—"}
                <span className="text-[#666] text-sm ml-1">m</span>
              </p>
            </div>
            <div className="border border-[#222] p-5">
              <p className="text-[10px] tracking-[0.15em] uppercase text-[#555] mb-2">
                ZEMİN
              </p>
              <p className="text-2xl font-bold text-white">
                {surfaceLabels[route.surfaceType || ""] || route.surfaceType || "—"}
              </p>
            </div>
            <div className="border border-[#222] p-5">
              <p className="text-[10px] tracking-[0.15em] uppercase text-[#555] mb-2">
                KONUM
              </p>
              <p className="text-2xl font-bold text-white">
                {route.city || "—"}
              </p>
            </div>
          </motion.div>

          {/* Segments */}
          {segments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h2 className="text-[11px] tracking-[0.15em] uppercase text-[#666] mb-6">
                BÖLÜMLER
              </h2>
              <div className="border border-[#222] overflow-hidden">
                {segments.map((seg, i) => (
                  <div
                    key={seg.segmentIndex}
                    className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a] last:border-b-0 hover:bg-[#111] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-[#E6FF00] text-sm font-bold w-6">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-white text-sm font-medium">
                          {seg.name || `Bölüm ${i + 1}`}
                        </p>
                        {seg.surfaceType && (
                          <p className="text-[11px] text-[#555]">
                            {surfaceLabels[seg.surfaceType] || seg.surfaceType}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-[13px]">
                      {seg.distanceM && (
                        <span className="text-[#999]">
                          {(seg.distanceM / 1000).toFixed(1)} km
                        </span>
                      )}
                      {seg.elevationM != null && seg.elevationM > 0 && (
                        <span className="text-[#666]">
                          ↑ {Math.round(seg.elevationM)}m
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </main>
  );
}
