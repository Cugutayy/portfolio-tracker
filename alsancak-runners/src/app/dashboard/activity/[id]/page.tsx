"use client";

import { useEffect, useState, use } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";

const ActivityMap = dynamic(
  () => import("@/components/maps/ActivityMap"),
  { ssr: false }
);

interface ActivityDetail {
  id: string;
  title: string;
  activityType: string;
  startTime: string;
  distanceM: number;
  movingTimeSec: number;
  elapsedTimeSec: number;
  elevationGainM: number | null;
  elevationLossM: number | null;
  avgPaceSecKm: number | null;
  maxPaceSecKm: number | null;
  avgHeartrate: number | null;
  maxHeartrate: number | null;
  calories: number | null;
  avgCadence: number | null;
  polylineEncoded: string | null;
  source: string;
  city: string | null;
}

interface Split {
  splitIndex: number;
  distanceM: number;
  movingTimeSec: number;
  avgPaceSecKm: number | null;
  elevationM: number | null;
  avgHeartrate: number | null;
}

function formatDistance(meters: number): string {
  return (meters / 1000).toFixed(2);
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h === 0) return `${m}:${s.toString().padStart(2, "0")}`;
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function StatCard({
  label,
  value,
  unit,
  delay = 0,
}: {
  label: string;
  value: string;
  unit?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="border border-[#222] p-5 hover:border-[#333] transition-colors"
    >
      <p className="text-[10px] tracking-[0.15em] uppercase text-[#555] mb-2">
        {label}
      </p>
      <p className="text-2xl font-bold text-white">
        {value}
        {unit && (
          <span className="text-[#666] text-sm ml-1 font-normal">{unit}</span>
        )}
      </p>
    </motion.div>
  );
}

export default function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [splits, setSplits] = useState<Split[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/activities/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        setActivity(data.activity);
        setSplits(data.splits || []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E6FF00] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (error || !activity) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#666] mb-4">Activity not found</p>
          <Link
            href="/dashboard"
            className="text-[11px] tracking-[0.15em] uppercase text-[#E6FF00] border border-[#E6FF00] px-6 py-3 hover:bg-[#E6FF00] hover:text-black transition-colors"
          >
            BACK TO DASHBOARD
          </Link>
        </div>
      </main>
    );
  }

  const date = new Date(activity.startTime);

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
            href="/dashboard"
            className="text-[11px] tracking-[0.15em] uppercase text-[#666] hover:text-white transition-colors flex items-center gap-2"
          >
            <span>&#x2190;</span> DASHBOARD
          </Link>
        </div>
      </nav>

      <div className="pt-[72px]">
        {/* Map */}
        {activity.polylineEncoded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <ActivityMap
              polylineEncoded={activity.polylineEncoded}
              className="w-full h-[350px] md:h-[450px]"
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
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] tracking-wider uppercase text-[#E6FF00] border border-[#E6FF00]/20 px-2 py-0.5">
                {activity.activityType}
              </span>
              {activity.source === "strava" && (
                <span className="text-[9px] tracking-wider uppercase text-[#FC4C02] border border-[#FC4C02]/30 px-2 py-0.5">
                  STRAVA
                </span>
              )}
            </div>
            <h1
              className="text-3xl md:text-4xl font-bold text-white mb-2"
              style={{ fontFamily: "var(--font-heading, inherit)" }}
            >
              {activity.title}
            </h1>
            <p className="text-[14px] text-[#666]">
              {date.toLocaleDateString("en-US", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              {" \u2014 "}
              {date.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {activity.city && ` \u00B7 ${activity.city}`}
            </p>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
            <StatCard
              label="DISTANCE"
              value={formatDistance(activity.distanceM)}
              unit="km"
              delay={0}
            />
            <StatCard
              label="TIME"
              value={formatDuration(activity.movingTimeSec)}
              delay={0.05}
            />
            <StatCard
              label="PACE"
              value={
                activity.avgPaceSecKm
                  ? formatPace(activity.avgPaceSecKm)
                  : "\u2014"
              }
              unit={activity.avgPaceSecKm ? "/km" : ""}
              delay={0.1}
            />
            <StatCard
              label="ELEVATION"
              value={
                activity.elevationGainM
                  ? `${Math.round(activity.elevationGainM)}`
                  : "\u2014"
              }
              unit={activity.elevationGainM ? "m" : ""}
              delay={0.15}
            />
            <StatCard
              label="AVG HR"
              value={
                activity.avgHeartrate
                  ? `${Math.round(activity.avgHeartrate)}`
                  : "\u2014"
              }
              unit={activity.avgHeartrate ? "bpm" : ""}
              delay={0.2}
            />
            <StatCard
              label="MAX HR"
              value={
                activity.maxHeartrate
                  ? `${Math.round(activity.maxHeartrate)}`
                  : "\u2014"
              }
              unit={activity.maxHeartrate ? "bpm" : ""}
              delay={0.25}
            />
            <StatCard
              label="CALORIES"
              value={activity.calories ? `${Math.round(activity.calories)}` : "\u2014"}
              unit={activity.calories ? "kcal" : ""}
              delay={0.3}
            />
            <StatCard
              label="CADENCE"
              value={
                activity.avgCadence
                  ? `${Math.round(activity.avgCadence)}`
                  : "\u2014"
              }
              unit={activity.avgCadence ? "spm" : ""}
              delay={0.35}
            />
          </div>

          {/* Splits */}
          {splits.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h2 className="text-[11px] tracking-[0.15em] uppercase text-[#666] mb-6">
                SPLIT DETAILS
              </h2>
              <div className="border border-[#222] overflow-x-auto">
                {/* Header */}
                <div className="grid grid-cols-5 gap-2 px-5 py-3 border-b border-[#222] bg-[#111] min-w-[400px]">
                  <p className="text-[10px] tracking-wider text-[#555] uppercase">
                    KM
                  </p>
                  <p className="text-[10px] tracking-wider text-[#555] uppercase">
                    PACE
                  </p>
                  <p className="text-[10px] tracking-wider text-[#555] uppercase">
                    TIME
                  </p>
                  <p className="text-[10px] tracking-wider text-[#555] uppercase">
                    ELEV
                  </p>
                  <p className="text-[10px] tracking-wider text-[#555] uppercase">
                    HR
                  </p>
                </div>
                {/* Rows */}
                {splits.map((split, i) => {
                  const avgPace = split.avgPaceSecKm || 0;
                  const bestPace = Math.min(
                    ...splits.map((s) => s.avgPaceSecKm || 999)
                  );
                  const isBest = avgPace === bestPace && avgPace > 0;
                  return (
                    <motion.div
                      key={split.splitIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 + i * 0.02 }}
                      className={`grid grid-cols-5 gap-2 px-5 py-3 border-b border-[#1a1a1a] last:border-b-0 min-w-[400px] ${
                        isBest ? "bg-[#E6FF00]/5" : "hover:bg-[#111]"
                      } transition-colors`}
                    >
                      <p className="text-white text-sm font-medium">
                        {split.splitIndex + 1}
                      </p>
                      <p
                        className={`text-sm font-medium ${
                          isBest ? "text-[#E6FF00]" : "text-white"
                        }`}
                      >
                        {split.avgPaceSecKm
                          ? formatPace(split.avgPaceSecKm)
                          : "\u2014"}
                      </p>
                      <p className="text-[#999] text-sm">
                        {split.movingTimeSec
                          ? formatDuration(split.movingTimeSec)
                          : "\u2014"}
                      </p>
                      <p className="text-[#999] text-sm">
                        {split.elevationM
                          ? `${split.elevationM > 0 ? "+" : ""}${Math.round(split.elevationM)}m`
                          : "\u2014"}
                      </p>
                      <p className="text-[#999] text-sm">
                        {split.avgHeartrate
                          ? Math.round(split.avgHeartrate)
                          : "\u2014"}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </main>
  );
}
