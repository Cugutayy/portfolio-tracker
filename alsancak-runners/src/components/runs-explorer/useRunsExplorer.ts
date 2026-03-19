"use client";

import { useState, useCallback, useRef, useMemo } from "react";

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

export function useRunsExplorer() {
  const [activities, setActivities] = useState<CommunityActivity[]>([]);
  const [filters, setFilters] = useState<Filters>({ period: "month", type: "all" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<"routes" | "heatmap">("routes");
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const boundsRef = useRef<Bounds | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, CommunityActivity>>(new Map());

  const fetchActivities = useCallback(
    async (bounds: Bounds | null, currentFilters: Filters) => {
      // Abort previous request
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

        // Update cache
        for (const a of fetched) {
          cacheRef.current.set(a.id, a);
        }

        setActivities(fetched);
        setHasMore(data.hasMore);
        setTotal(data.total);
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
    []
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
    activities,
    filters,
    selectedId,
    selectedActivity,
    hoveredId,
    mapMode,
    isLoading,
    hasMore,
    total,
    setSelectedId,
    setHoveredId,
    setMapMode,
    onBoundsChange,
    onFiltersChange,
  };
}
