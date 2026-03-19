"use client";

import { useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import mapboxgl from "mapbox-gl";
import polyline from "@mapbox/polyline";
import type { CommunityActivity, Bounds } from "./useRunsExplorer";

const MapboxMap = dynamic(() => import("../maps/MapboxMap"), { ssr: false });

interface RunsExplorerMapProps {
  activities: CommunityActivity[];
  selectedId: string | null;
  hoveredId: string | null;
  mapMode: "routes" | "heatmap";
  runnerColorMap: Map<string, string>;
  onBoundsChange: (bounds: Bounds) => void;
  onSelectActivity: (id: string | null) => void;
  onHoverActivity: (id: string | null) => void;
}

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export default function RunsExplorerMap({
  activities,
  selectedId,
  hoveredId,
  mapMode,
  runnerColorMap,
  onBoundsChange,
  onSelectActivity,
  onHoverActivity,
}: RunsExplorerMapProps) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // Build routes GeoJSON with runner color
  const buildRoutesGeoJSON = useCallback(
    (acts: CommunityActivity[], colorMap: Map<string, string>) => {
      const features: GeoJSON.Feature[] = [];
      for (const act of acts) {
        if (!act.polylineEncoded) continue;
        try {
          const decoded = polyline.decode(act.polylineEncoded);
          if (decoded.length < 2) continue;
          const coords = decoded.map(([lat, lng]) => [lng, lat] as [number, number]);
          features.push({
            type: "Feature",
            properties: {
              id: act.id,
              memberId: act.memberId,
              color: colorMap.get(act.memberId) || "#E6FF00",
            },
            geometry: { type: "LineString", coordinates: coords },
          });
        } catch {
          // Skip invalid
        }
      }
      return { type: "FeatureCollection" as const, features };
    },
    []
  );

  const buildPointsGeoJSON = useCallback(
    (acts: CommunityActivity[], colorMap: Map<string, string>) => {
      const features: GeoJSON.Feature[] = [];
      for (const act of acts) {
        if (act.startLat == null || act.startLng == null) continue;
        features.push({
          type: "Feature",
          properties: {
            id: act.id,
            memberId: act.memberId,
            color: colorMap.get(act.memberId) || "#E6FF00",
          },
          geometry: { type: "Point", coordinates: [act.startLng, act.startLat] },
        });
      }
      return { type: "FeatureCollection" as const, features };
    },
    []
  );

  const handleMapReady = useCallback(
    (map: mapboxgl.Map) => {
      mapRef.current = map;

      // ── Sources ──
      map.addSource("routes", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addSource("points", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 13,
      });
      map.addSource("selected-route", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addSource("hovered-route", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // ── Heatmap ──
      map.addLayer({
        id: "heatmap",
        type: "heatmap",
        source: "points",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "heatmap-weight": 1,
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 9, 1, 14, 3],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 9, 15, 14, 25],
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.2, "rgba(230,255,0,0.3)",
            0.4, "rgba(230,255,0,0.5)",
            0.6, "rgba(252,200,0,0.6)",
            0.8, "rgba(252,130,2,0.7)",
            1, "rgba(252,76,2,0.8)",
          ],
          "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 12, 0.8, 15, 0],
        },
      });

      // ── All routes (data-driven color per runner) ──
      map.addLayer({
        id: "all-routes-glow",
        type: "line",
        source: "routes",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 4,
          "line-opacity": 0.1,
          "line-blur": 3,
        },
        minzoom: 11,
      });
      map.addLayer({
        id: "all-routes",
        type: "line",
        source: "routes",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 1.5,
          "line-opacity": 0.4,
        },
        layout: { "line-cap": "round", "line-join": "round" },
        minzoom: 11,
      });

      // ── Clusters ──
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "points",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#E6FF00",
          "circle-radius": ["step", ["get", "point_count"], 16, 10, 22, 50, 30],
          "circle-opacity": 0.85,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#0A0A0A",
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "points",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 12,
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
        },
        paint: { "text-color": "#0A0A0A" },
      });

      // Unclustered points (data-driven color)
      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "points",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 5,
          "circle-color": ["get", "color"],
          "circle-opacity": 0.7,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#0A0A0A",
        },
        maxzoom: 12,
      });

      // ── Hovered route ──
      map.addLayer({
        id: "hovered-route-line",
        type: "line",
        source: "hovered-route",
        paint: {
          "line-color": ["coalesce", ["get", "color"], "#E6FF00"],
          "line-width": 3,
          "line-opacity": 0.6,
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });

      // ── Selected route ──
      map.addLayer({
        id: "selected-route-glow",
        type: "line",
        source: "selected-route",
        paint: {
          "line-color": ["coalesce", ["get", "color"], "#E6FF00"],
          "line-width": 8,
          "line-opacity": 0.25,
          "line-blur": 4,
        },
      });
      map.addLayer({
        id: "selected-route-line",
        type: "line",
        source: "selected-route",
        paint: {
          "line-color": ["coalesce", ["get", "color"], "#E6FF00"],
          "line-width": 3.5,
          "line-opacity": 0.9,
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });

      // ── Interactions ──
      map.on("click", "all-routes", (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (id) onSelectActivity(id);
      });
      map.on("click", "unclustered-point", (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (id) onSelectActivity(id);
      });
      map.on("click", "clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
        if (!features.length) return;
        const clusterId = features[0].properties?.cluster_id;
        const source = map.getSource("points") as mapboxgl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || zoom == null) return;
          const geom = features[0].geometry;
          if (geom.type === "Point") {
            map.easeTo({ center: geom.coordinates as [number, number], zoom });
          }
        });
      });

      for (const layer of ["all-routes", "unclustered-point", "clusters"]) {
        map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
      }
      map.on("mousemove", "all-routes", (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (id) onHoverActivity(id);
      });
      map.on("mouseleave", "all-routes", () => { onHoverActivity(null); });

      // ── Bounds ──
      const emitBoundsFromMap = () => {
        const b = map.getBounds();
        if (!b) return;
        onBoundsChange({
          swLng: b.getSouthWest().lng,
          swLat: b.getSouthWest().lat,
          neLng: b.getNorthEast().lng,
          neLat: b.getNorthEast().lat,
        });
      };
      const emitBounds = debounce(emitBoundsFromMap, 300);
      map.on("moveend", emitBounds);
      setTimeout(emitBoundsFromMap, 100);
    },
    [onBoundsChange, onSelectActivity, onHoverActivity]
  );

  // Update data when activities or colors change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const routesSrc = map.getSource("routes") as mapboxgl.GeoJSONSource | undefined;
    const pointsSrc = map.getSource("points") as mapboxgl.GeoJSONSource | undefined;
    if (routesSrc) routesSrc.setData(buildRoutesGeoJSON(activities, runnerColorMap));
    if (pointsSrc) pointsSrc.setData(buildPointsGeoJSON(activities, runnerColorMap));
  }, [activities, runnerColorMap, buildRoutesGeoJSON, buildPointsGeoJSON]);

  // Selected route
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource("selected-route") as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (!selectedId) {
      src.setData({ type: "FeatureCollection", features: [] });
      return;
    }
    const act = activities.find((a) => a.id === selectedId);
    if (!act?.polylineEncoded) {
      src.setData({ type: "FeatureCollection", features: [] });
      return;
    }
    try {
      const decoded = polyline.decode(act.polylineEncoded);
      const coords = decoded.map(([lat, lng]) => [lng, lat] as [number, number]);
      const color = runnerColorMap.get(act.memberId) || "#E6FF00";

      src.setData({
        type: "FeatureCollection",
        features: [{
          type: "Feature",
          properties: { color },
          geometry: { type: "LineString", coordinates: coords },
        }],
      });

      // Start marker
      const startEl = document.createElement("div");
      startEl.style.cssText = `width:12px;height:12px;background:${color};border-radius:50%;border:2px solid #0A0A0A;box-shadow:0 0 8px ${color}66`;
      markersRef.current.push(
        new mapboxgl.Marker({ element: startEl }).setLngLat(coords[0]).addTo(map)
      );

      // End marker
      const endEl = document.createElement("div");
      endEl.style.cssText = "width:12px;height:12px;background:#FC4C02;border-radius:50%;border:2px solid #0A0A0A;box-shadow:0 0 8px rgba(252,76,2,0.4)";
      markersRef.current.push(
        new mapboxgl.Marker({ element: endEl }).setLngLat(coords[coords.length - 1]).addTo(map)
      );

      const lngs = coords.map((c) => c[0]);
      const lats = coords.map((c) => c[1]);
      map.fitBounds(
        new mapboxgl.LngLatBounds(
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)]
        ),
        { padding: { top: 80, bottom: 80, left: 300, right: 280 }, maxZoom: 16, duration: 600 }
      );
    } catch {
      src.setData({ type: "FeatureCollection", features: [] });
    }
  }, [selectedId, activities, runnerColorMap]);

  // Hovered route
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource("hovered-route") as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;

    if (!hoveredId || hoveredId === selectedId) {
      src.setData({ type: "FeatureCollection", features: [] });
      return;
    }
    const act = activities.find((a) => a.id === hoveredId);
    if (!act?.polylineEncoded) {
      src.setData({ type: "FeatureCollection", features: [] });
      return;
    }
    try {
      const decoded = polyline.decode(act.polylineEncoded);
      const coords = decoded.map(([lat, lng]) => [lng, lat] as [number, number]);
      src.setData({
        type: "FeatureCollection",
        features: [{
          type: "Feature",
          properties: { color: runnerColorMap.get(act.memberId) || "#E6FF00" },
          geometry: { type: "LineString", coordinates: coords },
        }],
      });
    } catch {
      src.setData({ type: "FeatureCollection", features: [] });
    }
  }, [hoveredId, selectedId, activities, runnerColorMap]);

  // Toggle heatmap/routes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const heatmapVisible = mapMode === "heatmap";
    const routesVisible = mapMode === "routes";
    if (map.getLayer("heatmap")) map.setLayoutProperty("heatmap", "visibility", heatmapVisible ? "visible" : "none");
    if (map.getLayer("all-routes")) map.setLayoutProperty("all-routes", "visibility", routesVisible ? "visible" : "none");
    if (map.getLayer("all-routes-glow")) map.setLayoutProperty("all-routes-glow", "visibility", routesVisible ? "visible" : "none");
  }, [mapMode]);

  return (
    <MapboxMap
      center={[27.1428, 38.4237]}
      zoom={12}
      className="w-full h-full"
      onMapReady={handleMapReady}
      interactive={true}
    />
  );
}
