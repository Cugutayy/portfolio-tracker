"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { useTranslations } from "next-intl";
import RunsExplorerFilters from "./RunsExplorerFilters";
import RunsExplorerActivityCard from "./RunsExplorerActivityCard";
import type { CommunityActivity, Filters } from "./useRunsExplorer";

interface RunsExplorerBottomSheetProps {
  activities: CommunityActivity[];
  filters: Filters;
  selectedId: string | null;
  hoveredId: string | null;
  mapMode: "routes" | "heatmap";
  isLoading: boolean;
  total: number;
  onFiltersChange: (update: Partial<Filters>) => void;
  onMapModeChange: (mode: "routes" | "heatmap") => void;
  onSelectActivity: (id: string | null) => void;
  onHoverActivity: (id: string | null) => void;
}

const COLLAPSED_HEIGHT = 64;
const HALF_VH = 45;
const FULL_VH = 85;

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
  activities,
  filters,
  selectedId,
  hoveredId,
  mapMode,
  isLoading,
  total,
  onFiltersChange,
  onMapModeChange,
  onSelectActivity,
  onHoverActivity,
}: RunsExplorerBottomSheetProps) {
  const t = useTranslations("runsExplorer");
  const [snapState, setSnapState] = useState<"collapsed" | "half" | "full">("collapsed");
  const containerRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(typeof window !== "undefined" ? getSnapY("collapsed") : 0);

  // Animate to snap point
  useEffect(() => {
    const target = getSnapY(snapState);
    animate(y, target, { type: "spring", stiffness: 300, damping: 30 });
  }, [snapState, y]);

  // Set initial position on mount
  useEffect(() => {
    y.set(getSnapY("collapsed"));
  }, [y]);

  const handleDragEnd = useCallback(
    (_: unknown, info: { velocity: { y: number }; offset: { y: number } }) => {
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

  return (
    <motion.div
      ref={containerRef}
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
        onDoubleClick={() =>
          setSnapState(snapState === "collapsed" ? "half" : "collapsed")
        }
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
              setSnapState(
                snapState === "collapsed"
                  ? "half"
                  : snapState === "half"
                    ? "full"
                    : "collapsed"
              )
            }
            className="text-[10px] text-[#E6FF00] tracking-wider uppercase"
          >
            {snapState === "collapsed" ? "+" : snapState === "half" ? "++" : "-"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 space-y-3">
        {snapState !== "collapsed" && (
          <div className="pb-3 border-b border-[#222]">
            <RunsExplorerFilters
              filters={filters}
              mapMode={mapMode}
              onChange={onFiltersChange}
              onMapModeChange={onMapModeChange}
            />
          </div>
        )}

        {activities.length === 0 && !isLoading ? (
          <div className="text-center py-8">
            <p className="text-[12px] text-[#555] tracking-wider">
              {t("list.noRuns")}
            </p>
          </div>
        ) : (
          activities.map((act) => (
            <RunsExplorerActivityCard
              key={act.id}
              activity={act}
              isSelected={act.id === selectedId}
              isHovered={act.id === hoveredId}
              onSelect={(id) => {
                onSelectActivity(id);
                setSnapState("collapsed");
              }}
              onHover={onHoverActivity}
            />
          ))
        )}
      </div>
    </motion.div>
  );
}
