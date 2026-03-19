"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import type { Filters, LeaderboardEntry } from "./useRunsExplorer";
import { RUNNER_COLORS } from "./useRunsExplorer";

interface RunsExplorerOverlayFiltersProps {
  filters: Filters;
  mapMode: "routes" | "heatmap";
  leaderboard: LeaderboardEntry[];
  enabledRunners: Set<string>;
  runnerColorMap: Map<string, string>;
  onFiltersChange: (update: Partial<Filters>) => void;
  onMapModeChange: (mode: "routes" | "heatmap") => void;
  onToggleRunner: (memberId: string) => void;
  onToggleAll: (enable: boolean) => void;
  className?: string;
}

const periods = ["week", "month", "year", "all_time"] as const;

export default function RunsExplorerOverlayFilters({
  filters,
  mapMode,
  leaderboard,
  enabledRunners,
  runnerColorMap,
  onFiltersChange,
  onMapModeChange,
  onToggleRunner,
  onToggleAll,
  className = "",
}: RunsExplorerOverlayFiltersProps) {
  const t = useTranslations("runsExplorer");
  const [collapsed, setCollapsed] = useState(false);

  const allEnabled = leaderboard.length > 0 && leaderboard.every((e) => enabledRunners.has(e.memberId));

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className={`bg-[#0A0A0A]/85 backdrop-blur-md border border-[#222] rounded-lg overflow-hidden ${className}`}
      style={{ width: collapsed ? 44 : 260 }}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full px-3 py-2.5 flex items-center justify-between border-b border-[#1a1a1a] hover:bg-[#111] transition-colors"
      >
        {!collapsed && (
          <span className="text-[10px] tracking-[0.15em] text-[#888] uppercase font-semibold">
            {t("filters.period")}
          </span>
        )}
        <span className="text-[12px] text-[#666]">
          {collapsed ? "▶" : "◀"}
        </span>
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* Period selector */}
            <div className="px-3 py-2.5 border-b border-[#1a1a1a]">
              <div className="flex flex-wrap gap-1">
                {periods.map((p) => (
                  <button
                    key={p}
                    onClick={() => onFiltersChange({ period: p })}
                    className={`px-2 py-1 text-[10px] tracking-wider uppercase border rounded-sm transition-all ${
                      filters.period === p
                        ? "bg-[#E6FF00] text-[#0A0A0A] border-[#E6FF00] font-semibold"
                        : "bg-transparent text-[#888] border-[#333] hover:border-[#555]"
                    }`}
                  >
                    {t(`periods.${p === "all_time" ? "allTime" : p}`)}
                  </button>
                ))}
              </div>

              {/* Map mode toggle */}
              <div className="flex gap-1 mt-2">
                {(["routes", "heatmap"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => onMapModeChange(mode)}
                    className={`px-2 py-1 text-[10px] tracking-wider uppercase border rounded-sm transition-all ${
                      mapMode === mode
                        ? "bg-[#E6FF00] text-[#0A0A0A] border-[#E6FF00] font-semibold"
                        : "bg-transparent text-[#888] border-[#333] hover:border-[#555]"
                    }`}
                  >
                    {t(`mapMode.${mode}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Runner toggles */}
            <div className="px-3 py-2 border-b border-[#1a1a1a]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] tracking-[0.15em] text-[#888] uppercase font-semibold">
                  {t("runners.title")}
                </span>
                <button
                  onClick={() => onToggleAll(!allEnabled)}
                  className="text-[9px] tracking-wider text-[#E6FF00] hover:text-[#E6FF00]/80 uppercase"
                >
                  {allEnabled ? t("runners.hideAll") : t("runners.showAll")}
                </button>
              </div>

              <div className="space-y-0.5 max-h-[240px] overflow-y-auto">
                {leaderboard.map((entry) => {
                  const color = runnerColorMap.get(entry.memberId) || RUNNER_COLORS[0];
                  const isEnabled = enabledRunners.has(entry.memberId);

                  return (
                    <button
                      key={entry.memberId}
                      onClick={() => onToggleRunner(entry.memberId)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-sm transition-all ${
                        isEnabled ? "hover:bg-[#111]" : "opacity-40 hover:opacity-60"
                      }`}
                    >
                      {/* Color dot */}
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: isEnabled ? color : "#333" }}
                      />

                      {/* Name */}
                      <span className="text-[11px] text-[#ccc] truncate flex-1 text-left">
                        {entry.memberName}
                      </span>

                      {/* Distance */}
                      <span className="text-[10px] text-[#666] tabular-nums flex-shrink-0">
                        {entry.totalDistanceKm} km
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Strava CTA */}
            <div className="px-3 py-2.5">
              <a
                href="https://www.strava.com/mobile"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[10px] tracking-wider text-[#FC4C02] hover:text-[#FC4C02]/80 uppercase"
              >
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current" aria-hidden>
                  <path d="M6.7 0L3.4 6.6h2.3L6.7 0zM9.3 6.6l-2.6 5.2-2.6-5.2H1.8L6.7 16l4.9-9.4H9.3z" />
                </svg>
                {t("stravaCta.download")}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
