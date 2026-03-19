"use client";

import { useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import RunsExplorerFilters from "./RunsExplorerFilters";
import RunsExplorerActivityCard from "./RunsExplorerActivityCard";
import type { CommunityActivity, Filters } from "./useRunsExplorer";

interface RunsExplorerSidebarProps {
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

export default function RunsExplorerSidebar({
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
}: RunsExplorerSidebarProps) {
  const t = useTranslations("runsExplorer");
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll to selected card
  useEffect(() => {
    if (!selectedId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-activity-id="${selectedId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  return (
    <motion.aside
      initial={{ x: -380, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className="hidden lg:flex flex-col absolute left-0 top-0 bottom-0 w-[380px] z-10 bg-[#0A0A0A]/95 backdrop-blur-md border-r border-[#222]"
    >
      {/* Header */}
      <div className="p-5 border-b border-[#222]">
        <h1 className="text-[18px] font-bold tracking-wider text-white mb-1">
          {t("title")}
        </h1>
        <p className="text-[12px] text-[#666] tracking-wide">
          {t("subtitle")}
        </p>
      </div>

      {/* Filters */}
      <div className="p-5 border-b border-[#222]">
        <RunsExplorerFilters
          filters={filters}
          mapMode={mapMode}
          onChange={onFiltersChange}
          onMapModeChange={onMapModeChange}
        />
      </div>

      {/* Activity count */}
      <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
        <span className="text-[11px] tracking-wider text-[#666] uppercase">
          {t("list.runsNearby", { count: total })}
        </span>
        {isLoading && (
          <div className="w-3.5 h-3.5 border border-[#E6FF00] border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Activity list */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {activities.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-[12px] text-[#555] tracking-wider">
              {t("list.noRuns")}
            </p>
          </div>
        )}

        {activities.map((act, i) => (
          <motion.div
            key={act.id}
            data-activity-id={act.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.02, 0.5) }}
          >
            <RunsExplorerActivityCard
              activity={act}
              isSelected={act.id === selectedId}
              isHovered={act.id === hoveredId}
              onSelect={onSelectActivity}
              onHover={onHoverActivity}
            />
          </motion.div>
        ))}
      </div>
    </motion.aside>
  );
}
