"use client";

import dynamic from "next/dynamic";
import { useRunsExplorer } from "@/components/runs-explorer/useRunsExplorer";
import RunsExplorerSidebar from "@/components/runs-explorer/RunsExplorerSidebar";
import RunsExplorerBottomSheet from "@/components/runs-explorer/RunsExplorerBottomSheet";

const RunsExplorerMap = dynamic(
  () => import("@/components/runs-explorer/RunsExplorerMap"),
  { ssr: false }
);

export default function RunsExplorerPage() {
  const {
    activities,
    filters,
    selectedId,
    hoveredId,
    mapMode,
    isLoading,
    total,
    setSelectedId,
    setHoveredId,
    setMapMode,
    onBoundsChange,
    onFiltersChange,
  } = useRunsExplorer();

  return (
    <div className="fixed inset-0 top-[72px] bg-[#0A0A0A]">
      {/* Full-screen map */}
      <RunsExplorerMap
        activities={activities}
        selectedId={selectedId}
        hoveredId={hoveredId}
        mapMode={mapMode}
        onBoundsChange={onBoundsChange}
        onSelectActivity={setSelectedId}
        onHoverActivity={setHoveredId}
      />

      {/* Desktop sidebar */}
      <RunsExplorerSidebar
        activities={activities}
        filters={filters}
        selectedId={selectedId}
        hoveredId={hoveredId}
        mapMode={mapMode}
        isLoading={isLoading}
        total={total}
        onFiltersChange={onFiltersChange}
        onMapModeChange={setMapMode}
        onSelectActivity={setSelectedId}
        onHoverActivity={setHoveredId}
      />

      {/* Mobile bottom sheet */}
      <RunsExplorerBottomSheet
        activities={activities}
        filters={filters}
        selectedId={selectedId}
        hoveredId={hoveredId}
        mapMode={mapMode}
        isLoading={isLoading}
        total={total}
        onFiltersChange={onFiltersChange}
        onMapModeChange={setMapMode}
        onSelectActivity={setSelectedId}
        onHoverActivity={setHoveredId}
      />
    </div>
  );
}
