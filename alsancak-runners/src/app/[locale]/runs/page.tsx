"use client";

import dynamic from "next/dynamic";
import { useRunsExplorer } from "@/components/runs-explorer/useRunsExplorer";
import RunsExplorerOverlayFilters from "@/components/runs-explorer/RunsExplorerOverlayFilters";
import RunsExplorerMiniLeaderboard from "@/components/runs-explorer/RunsExplorerMiniLeaderboard";

const RunsExplorerMap = dynamic(
  () => import("@/components/runs-explorer/RunsExplorerMap"),
  { ssr: false }
);

const RunsExplorerBottomSheet = dynamic(
  () => import("@/components/runs-explorer/RunsExplorerBottomSheet"),
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
  } = useRunsExplorer();

  return (
    <div className="fixed inset-0 top-[72px] bg-[#0A0A0A]">
      {/* Full-screen map */}
      <RunsExplorerMap
        activities={activities}
        selectedId={selectedId}
        hoveredId={hoveredId}
        mapMode={mapMode}
        runnerColorMap={runnerColorMap}
        onBoundsChange={onBoundsChange}
        onSelectActivity={setSelectedId}
        onHoverActivity={setHoveredId}
      />

      {/* Desktop: Left filter overlay */}
      <div className="hidden lg:block absolute top-4 left-4 z-10">
        <RunsExplorerOverlayFilters
          filters={filters}
          mapMode={mapMode}
          leaderboard={leaderboard}
          enabledRunners={enabledRunners}
          runnerColorMap={runnerColorMap}
          onFiltersChange={onFiltersChange}
          onMapModeChange={setMapMode}
          onToggleRunner={toggleRunner}
          onToggleAll={toggleAllRunners}
        />
      </div>

      {/* Desktop: Right top leaderboard overlay */}
      <div className="hidden lg:block absolute top-4 right-4 z-10">
        <RunsExplorerMiniLeaderboard leaderboard={leaderboard} />
      </div>

      {/* Mobile bottom sheet */}
      <RunsExplorerBottomSheet
        activities={activities}
        filters={filters}
        selectedId={selectedId}
        hoveredId={hoveredId}
        mapMode={mapMode}
        isLoading={isLoading}
        total={total}
        leaderboard={leaderboard}
        enabledRunners={enabledRunners}
        runnerColorMap={runnerColorMap}
        onFiltersChange={onFiltersChange}
        onMapModeChange={setMapMode}
        onSelectActivity={setSelectedId}
        onHoverActivity={setHoveredId}
        onToggleRunner={toggleRunner}
        onToggleAll={toggleAllRunners}
      />
    </div>
  );
}
