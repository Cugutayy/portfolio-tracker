"use client";

import { useTranslations } from "next-intl";
import type { Filters } from "./useRunsExplorer";

interface RunsExplorerFiltersProps {
  filters: Filters;
  mapMode: "routes" | "heatmap";
  onChange: (update: Partial<Filters>) => void;
  onMapModeChange: (mode: "routes" | "heatmap") => void;
}

const periods = ["week", "month", "year", "all_time"] as const;
const types = ["all", "run", "walk"] as const;

export default function RunsExplorerFilters({
  filters,
  mapMode,
  onChange,
  onMapModeChange,
}: RunsExplorerFiltersProps) {
  const t = useTranslations("runsExplorer");

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div>
        <label className="block text-[10px] tracking-[0.15em] text-[#666] uppercase mb-2">
          {t("filters.period")}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => onChange({ period: p })}
              className={`px-3 py-1.5 text-[11px] tracking-wider uppercase border rounded-sm transition-all ${
                filters.period === p
                  ? "bg-[#E6FF00] text-[#0A0A0A] border-[#E6FF00] font-semibold"
                  : "bg-transparent text-[#888] border-[#333] hover:border-[#555] hover:text-white"
              }`}
            >
              {t(`periods.${p === "all_time" ? "allTime" : p}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Type selector */}
      <div>
        <label className="block text-[10px] tracking-[0.15em] text-[#666] uppercase mb-2">
          {t("filters.activityType")}
        </label>
        <div className="flex gap-1.5">
          {types.map((tp) => (
            <button
              key={tp}
              onClick={() => onChange({ type: tp })}
              className={`px-3 py-1.5 text-[11px] tracking-wider uppercase border rounded-sm transition-all ${
                filters.type === tp
                  ? "bg-[#E6FF00] text-[#0A0A0A] border-[#E6FF00] font-semibold"
                  : "bg-transparent text-[#888] border-[#333] hover:border-[#555] hover:text-white"
              }`}
            >
              {tp === "all"
                ? t("filters.allTypes")
                : tp === "run"
                  ? t("filters.run")
                  : t("filters.walk")}
            </button>
          ))}
        </div>
      </div>

      {/* Map mode toggle */}
      <div>
        <label className="block text-[10px] tracking-[0.15em] text-[#666] uppercase mb-2">
          HARİTA
        </label>
        <div className="flex gap-1.5">
          {(["routes", "heatmap"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onMapModeChange(mode)}
              className={`px-3 py-1.5 text-[11px] tracking-wider uppercase border rounded-sm transition-all ${
                mapMode === mode
                  ? "bg-[#E6FF00] text-[#0A0A0A] border-[#E6FF00] font-semibold"
                  : "bg-transparent text-[#888] border-[#333] hover:border-[#555] hover:text-white"
              }`}
            >
              {t(`mapMode.${mode}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
