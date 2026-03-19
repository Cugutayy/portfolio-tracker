"use client";

import { useTranslations } from "next-intl";
import type { CommunityActivity } from "./useRunsExplorer";

interface RunsExplorerActivityCardProps {
  activity: CommunityActivity;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

function formatDistance(m: number): string {
  return (m / 1000).toFixed(1);
}

function formatPace(secPerKm: number | null): string {
  if (!secPerKm || secPerKm <= 0) return "--";
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

export default function RunsExplorerActivityCard({
  activity,
  isSelected,
  isHovered,
  onSelect,
  onHover,
}: RunsExplorerActivityCardProps) {
  const t = useTranslations("common");

  return (
    <button
      onClick={() => onSelect(activity.id)}
      onMouseEnter={() => onHover(activity.id)}
      onMouseLeave={() => onHover(null)}
      className={`w-full text-left p-3 border rounded-sm transition-all ${
        isSelected
          ? "bg-[#E6FF00]/10 border-[#E6FF00]/40"
          : isHovered
            ? "bg-[#111] border-[#444]"
            : "bg-transparent border-[#222] hover:border-[#333]"
      }`}
    >
      {/* Runner info */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-[#222] flex items-center justify-center text-[9px] text-[#E6FF00] font-semibold tracking-wider">
          {activity.memberInitials}
        </div>
        <span className="text-[11px] text-[#999] truncate">
          {activity.memberName}
        </span>
        <span className="text-[10px] text-[#555] ml-auto">
          {formatDate(activity.startTime)}
        </span>
      </div>

      {/* Title */}
      <p className="text-[13px] text-white truncate mb-2 font-medium">
        {activity.title}
      </p>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-[11px]">
        <span className="text-[#E6FF00] font-semibold">
          {formatDistance(activity.distanceM)} {t("km")}
        </span>
        <span className="text-[#666]">
          {formatPace(activity.avgPaceSecKm)} {t("perKm")}
        </span>
        <span className="text-[#666]">
          {formatDuration(activity.movingTimeSec)}
        </span>
      </div>
    </button>
  );
}
