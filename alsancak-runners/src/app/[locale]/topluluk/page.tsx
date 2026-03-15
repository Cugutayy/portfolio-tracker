"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

interface LeaderboardEntry {
  rank: number;
  memberId: string;
  memberName: string;
  memberImage: string | null;
  totalRuns: number;
  totalDistanceKm: number;
  totalTimeSec: number;
  totalElevationM: number;
  avgPaceSecKm: number;
}

interface CommunityStats {
  members: number;
  totalRuns: number;
  totalDistanceKm: number;
  totalTimeHours: number;
  monthlyRuns: number;
  monthlyDistanceKm: number;
  upcomingEvents: number;
}

type Period = "week" | "month" | "year" | "all_time";

const PERIOD_KEYS: Record<Period, string> = {
  week: "week",
  month: "month",
  year: "year",
  all_time: "allTime",
};

function formatDuration(seconds: number, minLabel: string, hrLabel: string): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}${minLabel}`;
  return `${h}${hrLabel} ${m}${minLabel}`;
}

function formatPace(secPerKm: number): string {
  if (secPerKm <= 0) return "—";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ToplulukPage() {
  const t = useTranslations("community");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const [period, setPeriod] = useState<Period>("month");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/community/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setStats(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/community/leaderboard?period=${period}&limit=20`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.leaderboard) setLeaderboard(data.leaderboard);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <main className="min-h-screen bg-[#0A0A0A]">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#1a1a1a]">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 md:px-12 py-4">
          <Link
            href="/"
            className="text-sm font-bold tracking-[0.2em] uppercase text-white"
          >
            ALSANCAK<span className="text-[#E6FF00]">.</span>RUNNERS
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/etkinlikler"
              className="text-[11px] tracking-[0.15em] uppercase text-[#666] hover:text-white transition-colors hidden md:block"
            >
              {tNav("events")}
            </Link>
            <Link
              href="/routes"
              className="text-[11px] tracking-[0.15em] uppercase text-[#666] hover:text-white transition-colors hidden md:block"
            >
              {tNav("routes")}
            </Link>
            <Link
              href="/dashboard"
              className="text-[11px] tracking-[0.15em] uppercase text-[#666] hover:text-white transition-colors hidden md:block"
            >
              {tNav("dashboard")}
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-[72px]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 py-16">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <p className="text-[11px] tracking-[0.15em] uppercase text-[#666] mb-4">
              {t("title")}
            </p>
            <h1
              className="text-5xl md:text-7xl font-bold text-white leading-[0.9]"
              style={{ fontFamily: "var(--font-heading, inherit)" }}
            >
              {t("leaderboard").split(" ")[0]}<br />
              <span className="text-[#E6FF00]">{t("leaderboard").split(" ").slice(1).join(" ")}</span>
            </h1>
          </motion.div>

          {/* Community Stats */}
          {stats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
            >
              {[
                { label: t("stats.members"), value: stats.members },
                { label: t("stats.totalRuns"), value: stats.totalRuns },
                {
                  label: t("stats.totalKm"),
                  value: stats.totalDistanceKm.toLocaleString(),
                },
                { label: t("stats.upcomingEvents"), value: stats.upcomingEvents },
              ].map((s, i) => (
                <div key={s.label} className="border border-[#222] p-6">
                  <p className="text-[10px] tracking-[0.15em] uppercase text-[#555] mb-2">
                    {s.label}
                  </p>
                  <p className="text-3xl font-bold text-white">{s.value}</p>
                </div>
              ))}
            </motion.div>
          )}

          {/* Period Selector */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex gap-2 mb-8"
          >
            {(Object.keys(PERIOD_KEYS) as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 text-[11px] tracking-[0.15em] uppercase border transition-all duration-300 ${
                  period === p
                    ? "border-[#E6FF00] text-[#E6FF00] bg-[#E6FF00]/5"
                    : "border-[#333] text-[#666] hover:border-white/30 hover:text-white"
                }`}
              >
                {t(`periods.${PERIOD_KEYS[p]}`)}
              </button>
            ))}
          </motion.div>

          {/* Leaderboard Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-[#E6FF00] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="border border-[#222] p-16 text-center">
              <div className="text-5xl mb-4 opacity-20">🏃</div>
              <p className="text-[15px] text-[#666] mb-2">
                {t("noData")}
              </p>
              <p className="text-[12px] text-[#444]">
                {t("noDataSubtitle")}
              </p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-[10px] tracking-[0.15em] uppercase text-[#555] border-b border-[#222]">
                <div className="col-span-1">#</div>
                <div className="col-span-3">{t("table.runner")}</div>
                <div className="col-span-2 text-right">{t("table.distance")}</div>
                <div className="col-span-2 text-right">{t("table.runs")}</div>
                <div className="col-span-2 text-right">{t("table.time")}</div>
                <div className="col-span-2 text-right">{t("table.avgPace")}</div>
              </div>

              {/* Rows */}
              <div className="space-y-1">
                {leaderboard.map((entry, i) => {
                  const isTop3 = entry.rank <= 3;
                  const rankColors = ["#E6FF00", "#C0C0C0", "#CD7F32"];

                  return (
                    <motion.div
                      key={entry.memberId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.03 }}
                      className={`grid grid-cols-3 md:grid-cols-12 gap-4 px-6 py-4 border transition-colors ${
                        isTop3
                          ? "border-[#333] bg-[#111]"
                          : "border-[#1a1a1a] hover:border-[#333]"
                      }`}
                    >
                      {/* Rank */}
                      <div className="col-span-1 flex items-center">
                        <span
                          className="text-xl font-bold"
                          style={{
                            color: isTop3
                              ? rankColors[entry.rank - 1]
                              : "#555",
                          }}
                        >
                          {entry.rank}
                        </span>
                      </div>

                      {/* Name */}
                      <div className="col-span-1 md:col-span-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#222] flex items-center justify-center text-[11px] text-white font-bold flex-shrink-0">
                          {entry.memberName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-white text-[15px] font-medium truncate">
                          {entry.memberName}
                        </span>
                      </div>

                      {/* Distance */}
                      <div className="col-span-1 md:col-span-2 flex items-center justify-end">
                        <span className="text-white text-lg font-semibold">
                          {entry.totalDistanceKm}
                          <span className="text-[#666] text-xs ml-0.5">
                            km
                          </span>
                        </span>
                      </div>

                      {/* Runs (hidden on mobile) */}
                      <div className="hidden md:flex col-span-2 items-center justify-end">
                        <span className="text-[#999]">{entry.totalRuns}</span>
                      </div>

                      {/* Time (hidden on mobile) */}
                      <div className="hidden md:flex col-span-2 items-center justify-end">
                        <span className="text-[#999]">
                          {formatDuration(entry.totalTimeSec, tCommon("min"), tCommon("hr"))}
                        </span>
                      </div>

                      {/* Avg Pace (hidden on mobile) */}
                      <div className="hidden md:flex col-span-2 items-center justify-end">
                        <span className="text-[#999]">
                          {formatPace(entry.avgPaceSecKm)}
                          <span className="text-[#555] text-xs ml-0.5">
                            /km
                          </span>
                        </span>
                      </div>
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
