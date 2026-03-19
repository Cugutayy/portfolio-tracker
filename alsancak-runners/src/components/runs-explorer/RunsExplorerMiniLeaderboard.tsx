"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import type { LeaderboardEntry } from "./useRunsExplorer";

interface RunsExplorerMiniLeaderboardProps {
  leaderboard: LeaderboardEntry[];
  className?: string;
}

const MEDAL_COLORS = ["#E6FF00", "#C0C0C0", "#CD7F32"];

export default function RunsExplorerMiniLeaderboard({
  leaderboard,
  className = "",
}: RunsExplorerMiniLeaderboardProps) {
  const t = useTranslations("runsExplorer");

  const top5 = leaderboard.slice(0, 5);

  if (top5.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className={`bg-[#0A0A0A]/85 backdrop-blur-md border border-[#222] rounded-lg overflow-hidden ${className}`}
      style={{ width: 240 }}
    >
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-[#1a1a1a] flex items-center justify-between">
        <span className="text-[10px] tracking-[0.15em] text-[#888] uppercase font-semibold">
          {t("leaderboard.title")}
        </span>
        <Link
          href="/topluluk"
          className="text-[9px] tracking-wider text-[#E6FF00] hover:text-[#E6FF00]/80 uppercase"
        >
          {t("leaderboard.viewAll")} →
        </Link>
      </div>

      {/* Entries */}
      <div className="py-1">
        {top5.map((entry) => (
          <div
            key={entry.memberId}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#111] transition-colors"
          >
            {/* Rank */}
            <span
              className="text-[11px] font-bold w-4 text-center"
              style={{
                color: entry.rank <= 3 ? MEDAL_COLORS[entry.rank - 1] : "#555",
              }}
            >
              {entry.rank}
            </span>

            {/* Avatar */}
            <div className="w-5 h-5 rounded-full bg-[#222] flex items-center justify-center text-[8px] text-[#E6FF00] font-semibold">
              {entry.memberName
                .split(" ")
                .map((w) => w[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </div>

            {/* Name */}
            <span className="text-[11px] text-[#ccc] truncate flex-1">
              {entry.memberName}
            </span>

            {/* Distance */}
            <span className="text-[11px] text-[#E6FF00] font-semibold tabular-nums">
              {entry.totalDistanceKm} km
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
