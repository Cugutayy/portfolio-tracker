"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import RunsExplorerFilters from "./RunsExplorerFilters";
import type { CommunityActivity, Filters, LeaderboardEntry } from "./useRunsExplorer";
import { RUNNER_COLORS } from "./useRunsExplorer";

interface RunsExplorerBottomSheetProps {
  activities: CommunityActivity[];
  filters: Filters;
  selectedId: string | null;
  hoveredId: string | null;
  mapMode: "routes" | "heatmap";
  isLoading: boolean;
  total: number;
  leaderboard: LeaderboardEntry[];
  enabledRunners: Set<string>;
  runnerColorMap: Map<string, string>;
  onFiltersChange: (update: Partial<Filters>) => void;
  onMapModeChange: (mode: "routes" | "heatmap") => void;
  onSelectActivity: (id: string | null) => void;
  onHoverActivity: (id: string | null) => void;
  onToggleRunner: (memberId: string) => void;
  onToggleAll: (enable: boolean) => void;
}

const COLLAPSED_HEIGHT = 64;
const HALF_VH = 50;
const FULL_VH = 85;
const MEDAL_COLORS = ["#E6FF00", "#C0C0C0", "#CD7F32"];

function getSnapY(state: "collapsed" | "half" | "full"): number {
  if (typeof window === "undefined") return 0;
  const vh = window.innerHeight;
  switch (state) {
    case "collapsed": return vh - COLLAPSED_HEIGHT;
    case "half": return vh * (1 - HALF_VH / 100);
    case "full": return vh * (1 - FULL_VH / 100);
  }
}

export default function RunsExplorerBottomSheet({
  filters,
  mapMode,
  isLoading,
  total,
  leaderboard,
  enabledRunners,
  runnerColorMap,
  onFiltersChange,
  onMapModeChange,
  onToggleRunner,
  onToggleAll,
}: RunsExplorerBottomSheetProps) {
  const t = useTranslations("runsExplorer");
  const [snapState, setSnapState] = useState<"collapsed" | "half" | "full">("collapsed");
  const y = useMotionValue(typeof window !== "undefined" ? getSnapY("collapsed") : 0);

  useEffect(() => {
    animate(y, getSnapY(snapState), { type: "spring", stiffness: 300, damping: 30 });
  }, [snapState, y]);

  useEffect(() => {
    y.set(getSnapY("collapsed"));
  }, [y]);

  const handleDragEnd = useCallback(
    (_: unknown, info: { velocity: { y: number } }) => {
      const currentY = y.get();
      const velocity = info.velocity.y;
      if (velocity > 500) {
        setSnapState(snapState === "full" ? "half" : "collapsed");
      } else if (velocity < -500) {
        setSnapState(snapState === "collapsed" ? "half" : "full");
      } else {
        const snapPoints = [
          { state: "collapsed" as const, y: getSnapY("collapsed") },
          { state: "half" as const, y: getSnapY("half") },
          { state: "full" as const, y: getSnapY("full") },
        ];
        const nearest = snapPoints.reduce((prev, curr) =>
          Math.abs(curr.y - currentY) < Math.abs(prev.y - currentY) ? curr : prev
        );
        setSnapState(nearest.state);
      }
    },
    [snapState, y]
  );

  const allEnabled = leaderboard.length > 0 && leaderboard.every((e) => enabledRunners.has(e.memberId));
  const top5 = leaderboard.slice(0, 5);

  return (
    <motion.div
      className="lg:hidden fixed left-0 right-0 bottom-0 z-20 flex flex-col rounded-t-2xl border-t border-[#333] overflow-hidden"
      style={{
        y,
        height: `${FULL_VH}vh`,
        backgroundColor: "rgba(10, 10, 10, 0.95)",
        backdropFilter: "blur(12px)",
      }}
      drag="y"
      dragConstraints={{
        top: typeof window !== "undefined" ? getSnapY("full") : 0,
        bottom: typeof window !== "undefined" ? getSnapY("collapsed") : 800,
      }}
      dragElastic={0.1}
      onDragEnd={handleDragEnd}
    >
      {/* Drag handle */}
      <div
        className="flex items-center justify-center py-3 cursor-grab active:cursor-grabbing"
        onDoubleClick={() => setSnapState(snapState === "collapsed" ? "half" : "collapsed")}
      >
        <div className="w-10 h-1 rounded-full bg-[#444]" />
      </div>

      {/* Summary bar */}
      <div className="px-4 pb-3 flex items-center justify-between">
        <span className="text-[12px] tracking-wider text-[#999] uppercase font-medium">
          {t("list.runsNearby", { count: total })}
        </span>
        <div className="flex items-center gap-2">
          {isLoading && (
            <div className="w-3 h-3 border border-[#E6FF00] border-t-transparent rounded-full animate-spin" />
          )}
          <button
            onClick={() =>
              setSnapState(snapState === "collapsed" ? "half" : snapState === "half" ? "full" : "collapsed")
            }
            className="text-[10px] text-[#E6FF00] tracking-wider uppercase"
          >
            {snapState === "collapsed" ? "+" : snapState === "half" ? "++" : "-"}
          </button>
        </div>
      </div>

      {/* Content (scrollable) */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 space-y-3">
        {snapState !== "collapsed" && (
          <>
            {/* Filters */}
            <div className="pb-3 border-b border-[#222]">
              <RunsExplorerFilters
                filters={filters}
                mapMode={mapMode}
                onChange={onFiltersChange}
                onMapModeChange={onMapModeChange}
              />
            </div>

            {/* Mini Leaderboard */}
            {top5.length > 0 && (
              <div className="pb-3 border-b border-[#222]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] tracking-[0.15em] text-[#888] uppercase font-semibold">
                    {t("leaderboard.title")}
                  </span>
                  <Link
                    href="/topluluk"
                    className="text-[9px] tracking-wider text-[#E6FF00] uppercase"
                  >
                    {t("leaderboard.viewAll")} →
                  </Link>
                </div>
                {top5.map((entry) => (
                  <div key={entry.memberId} className="flex items-center gap-2 py-1">
                    <span
                      className="text-[11px] font-bold w-4 text-center"
                      style={{ color: entry.rank <= 3 ? MEDAL_COLORS[entry.rank - 1] : "#555" }}
                    >
                      {entry.rank}
                    </span>
                    <div className="w-5 h-5 rounded-full bg-[#222] flex items-center justify-center text-[8px] text-[#E6FF00] font-semibold">
                      {entry.memberName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <span className="text-[11px] text-[#ccc] truncate flex-1">{entry.memberName}</span>
                    <span className="text-[11px] text-[#E6FF00] font-semibold tabular-nums">{entry.totalDistanceKm} km</span>
                  </div>
                ))}
              </div>
            )}

            {/* Runner toggles */}
            {leaderboard.length > 0 && (
              <div className="pb-3 border-b border-[#222]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] tracking-[0.15em] text-[#888] uppercase font-semibold">
                    {t("runners.title")}
                  </span>
                  <button
                    onClick={() => onToggleAll(!allEnabled)}
                    className="text-[9px] tracking-wider text-[#E6FF00] uppercase"
                  >
                    {allEnabled ? t("runners.hideAll") : t("runners.showAll")}
                  </button>
                </div>
                {leaderboard.map((entry) => {
                  const color = runnerColorMap.get(entry.memberId) || RUNNER_COLORS[0];
                  const isEnabled = enabledRunners.has(entry.memberId);
                  return (
                    <button
                      key={entry.memberId}
                      onClick={() => onToggleRunner(entry.memberId)}
                      className={`w-full flex items-center gap-2 px-1 py-1.5 rounded-sm transition-all ${
                        isEnabled ? "" : "opacity-40"
                      }`}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: isEnabled ? color : "#333" }}
                      />
                      <span className="text-[11px] text-[#ccc] truncate flex-1 text-left">{entry.memberName}</span>
                      <span className="text-[10px] text-[#666] tabular-nums">{entry.totalDistanceKm} km</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
