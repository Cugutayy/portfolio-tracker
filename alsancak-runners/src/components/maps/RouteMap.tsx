"use client";

import { useCallback } from "react";
import dynamic from "next/dynamic";
import mapboxgl from "mapbox-gl";

const MapboxMap = dynamic(() => import("./MapboxMap"), { ssr: false });

interface RouteMapProps {
  geojson: {
    type: "LineString";
    coordinates: [number, number][];
  };
  color?: string;
  className?: string;
  interactive?: boolean;
  showMarkers?: boolean;
  isLoop?: boolean;
}

export default function RouteMap({
  geojson,
  color = "#E6FF00",
  className = "w-full h-[400px]",
  interactive = true,
  showMarkers = true,
  isLoop = false,
}: RouteMapProps) {
  const coords = geojson.coordinates;

  if (!coords || coords.length === 0) {
    return (
      <div
        className={`${className} bg-[#0A0A0A] border border-[#222] flex items-center justify-center`}
      >
        <p className="text-[12px] text-[#444]">Rota verisi yok</p>
      </div>
    );
  }

  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  const bounds = new mapboxgl.LngLatBounds(
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)]
  );
  const center = bounds.getCenter().toArray() as [number, number];

  const handleMapReady = useCallback(
    (map: mapboxgl.Map) => {
      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: geojson,
        },
      });

      // Glow
      map.addLayer({
        id: "route-glow",
        type: "line",
        source: "route",
        paint: {
          "line-color": color,
          "line-width": 8,
          "line-opacity": 0.12,
          "line-blur": 6,
        },
      });

      // Main line
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        paint: {
          "line-color": color,
          "line-width": 3,
          "line-opacity": 0.85,
        },
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
      });

      if (showMarkers) {
        // Start marker
        const startEl = document.createElement("div");
        startEl.style.cssText = `width:14px;height:14px;background:${color};border-radius:50%;border:3px solid #0A0A0A;box-shadow:0 0 10px ${color}66`;
        new mapboxgl.Marker({ element: startEl })
          .setLngLat(coords[0])
          .addTo(map);

        // End marker (only if not loop)
        if (!isLoop) {
          const endEl = document.createElement("div");
          endEl.style.cssText =
            "width:14px;height:14px;background:#FC4C02;border-radius:50%;border:3px solid #0A0A0A;box-shadow:0 0 10px rgba(252,76,2,0.4)";
          new mapboxgl.Marker({ element: endEl })
            .setLngLat(coords[coords.length - 1])
            .addTo(map);
        }
      }

      map.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 15,
        duration: 0,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(geojson)]
  );

  return (
    <MapboxMap
      center={center}
      zoom={13}
      className={className}
      onMapReady={handleMapReady}
      interactive={interactive}
    />
  );
}
