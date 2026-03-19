"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";

export interface CommunityActivity {
  id: string;
  memberId: string;
  memberName: string;
  memberInitials: string;
  title: string;
  activityType: string;
  startTime: string;
  distanceM: number;
  movingTimeSec: number;
  avgPaceSecKm: number | null;
  polylineEncoded: string | null;
  startLat: number | null;
  startLng: number | null;
}

export interface LeaderboardEntry {
  rank: number;
  memberId: string;
  memberName: string;
  memberImage: string | null;
  totalRuns: number;
  totalDistanceM: number;
  totalDistanceKm: number;
  totalTimeSec: number;
  avgPaceSecKm: number;
}

export interface Bounds {
  swLng: number;
  swLat: number;
  neLng: number;
  neLat: number;
}

export interface Filters {
  period: "week" | "month" | "year" | "all_time";
  type: "all" | "run" | "walk";
}

// Color palette for runner routes
export const RUNNER_COLORS = [
  "#E6FF00", // yellow (brand)
  "#00E5FF", // cyan
  "#FF6B6B", // coral
  "#A78BFA", // violet
  "#34D399", // emerald
  "#FB923C", // orange
  "#F472B6", // pink
  "#60A5FA", // blue
  "#FBBF24", // amber
  "#6EE7B7", // teal
];

export function useRunsExplorer() {
  const [activities, setActivities] = useState<CommunityActivity[]>([]);
  const [filters, setFilters] = useState<Filters>({ period: "month", type: "all" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<"routes" | "heatmap">("routes");
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [enabledRunners, setEnabledRunners] = useState<Set<string>>(new Set());
  const [runnersInitialized, setRunnersInitialized] = useState(false);
  const boundsRef = useRef<Bounds | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async (period: string) => {
    try {
      const res = await fetch(`/api/community/leaderboard?period=${period}&limit=20`);
      if (!res.ok) return;
      const data = await res.json();
      const entries = (data.leaderboard || []) as LeaderboardEntry[];
      setLeaderboard(entries);

      // Initialize enabled runners on first load
      if (!runnersInitialized && entries.length > 0) {
        setEnabledRunners(new Set(entries.map((e) => e.memberId)));
        setRunnersInitialized(true);
      }
    } catch {
      // Non-fatal
    }
  }, [runnersInitialized]);

  // Fetch leaderboard when period changes
  useEffect(() => {
    fetchLeaderboard(filters.period);
  }, [filters.period, fetchLeaderboard]);

  // Runner color mapping (stable per memberId)
  const runnerColorMap = useMemo(() => {
    const map = new Map<string, string>();
    leaderboard.forEach((entry, i) => {
      map.set(entry.memberId, RUNNER_COLORS[i % RUNNER_COLORS.length]);
    });
    // Also assign colors to activity members not in leaderboard
    activities.forEach((act) => {
      if (!map.has(act.memberId)) {
        map.set(act.memberId, RUNNER_COLORS[map.size % RUNNER_COLORS.length]);
      }
    });
    return map;
  }, [leaderboard, activities]);

  // Filtered activities based on enabled runners
  const filteredActivities = useMemo(
    () => activities.filter((a) => enabledRunners.has(a.memberId)),
    [activities, enabledRunners]
  );

  const toggleRunner = useCallback((memberId: string) => {
    setEnabledRunners((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  }, []);

  const toggleAllRunners = useCallback((enable: boolean) => {
    if (enable) {
      const allIds = new Set([
        ...leaderboard.map((e) => e.memberId),
        ...activities.map((a) => a.memberId),
      ]);
      setEnabledRunners(allIds);
    } else {
      setEnabledRunners(new Set());
    }
  }, [leaderboard, activities]);

  const fetchActivities = useCallback(
    async (bounds: Bounds | null, currentFilters: Filters) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          period: currentFilters.period,
          type: currentFilters.type,
          limit: "200",
        });

        if (bounds) {
          params.set(
            "bounds",
            `${bounds.swLng},${bounds.swLat},${bounds.neLng},${bounds.neLat}`
          );
        }

        const res = await fetch(`/api/community/activities?${params}`, {
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("Failed to fetch");

        const data = await res.json();
        const fetched = data.activities as CommunityActivity[];

        setActivities(fetched);
        setHasMore(data.hasMore);
        setTotal(data.total);

        // Add new runners to enabled set
        if (runnersInitialized) {
          setEnabledRunners((prev) => {
            const next = new Set(prev);
            for (const a of fetched) {
              if (!next.has(a.memberId) && !prev.has(a.memberId)) {
                next.add(a.memberId);
              }
            }
            return next;
          });
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Failed to fetch activities:", err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [runnersInitialized]
  );

  const onBoundsChange = useCallback(
    (bounds: Bounds) => {
      boundsRef.current = bounds;
      fetchActivities(bounds, filters);
    },
    [filters, fetchActivities]
  );

  const onFiltersChange = useCallback(
    (newFilters: Partial<Filters>) => {
      const updated = { ...filters, ...newFilters };
      setFilters(updated);
      setSelectedId(null);
      fetchActivities(boundsRef.current, updated);
    },
    [filters, fetchActivities]
  );

  const selectedActivity = useMemo(
    () => activities.find((a) => a.id === selectedId) ?? null,
    [activities, selectedId]
  );

  return {
    activities: filteredActivities,
    allActivities: activities,
    filters,
    selectedId,
    selectedActivity,
    hoveredId,
    mapMode,
    isLoading,
    hasMore,
    total,
    leaderboard,
    enabledRunners,
    runnerColorMap,
    setSelectedId,
    setHoveredId,
    setMapMode,
    toggleRunner,
    toggleAllRunners,
    onBoundsChange,
    onFiltersChange,
  };
}
