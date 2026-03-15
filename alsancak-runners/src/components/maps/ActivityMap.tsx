"use client";

import { useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import mapboxgl from "mapbox-gl";
import polyline from "@mapbox/polyline";

const MapboxMap = dynamic(() => import("./MapboxMap"), { ssr: false });

interface ActivityMapProps {
  polylineEncoded: string;
  className?: string;
  interactive?: boolean;
}

export default function ActivityMap({
  polylineEncoded,
  className = "w-full h-[400px]",
  interactive = true,
}: ActivityMapProps) {
  // Derive all map geometry from the encoded polyline (stable across renders)
  const mapData = useMemo(() => {
    const decoded = polyline.decode(polylineEncoded);
    if (decoded.length === 0) return null;

    const coordinates = decoded.map(
      ([lat, lng]) => [lng, lat] as [number, number],
    );
    const lngs = coordinates.map((c) => c[0]);
    const lats = coordinates.map((c) => c[1]);
    const bounds = new mapboxgl.LngLatBounds(
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    );
    const center = bounds.getCenter().toArray() as [number, number];

    return { coordinates, center, bounds };
  }, [polylineEncoded]);

  const handleMapReady = useCallback(
    (map: mapboxgl.Map) => {
      if (!mapData) return;

      // Add the route source
      map.addSource("activity-route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: mapData.coordinates,
          },
        },
      });

      // Route glow (outer)
      map.addLayer({
        id: "activity-route-glow",
        type: "line",
        source: "activity-route",
        paint: {
          "line-color": "#E6FF00",
          "line-width": 6,
          "line-opacity": 0.15,
          "line-blur": 4,
        },
      });

      // Route line (inner)
      map.addLayer({
        id: "activity-route-line",
        type: "line",
        source: "activity-route",
        paint: {
          "line-color": "#E6FF00",
          "line-width": 2.5,
          "line-opacity": 0.9,
        },
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
      });

      // Start marker
      const startEl = document.createElement("div");
      startEl.className = "start-marker";
      startEl.style.cssText =
        "width:12px;height:12px;background:#E6FF00;border-radius:50%;border:2px solid #0A0A0A;box-shadow:0 0 8px rgba(230,255,0,0.4)";
      new mapboxgl.Marker({ element: startEl })
        .setLngLat(mapData.coordinates[0])
        .addTo(map);

      // End marker
      const endEl = document.createElement("div");
      endEl.className = "end-marker";
      endEl.style.cssText =
        "width:12px;height:12px;background:#FC4C02;border-radius:50%;border:2px solid #0A0A0A;box-shadow:0 0 8px rgba(252,76,2,0.4)";
      new mapboxgl.Marker({ element: endEl })
        .setLngLat(mapData.coordinates[mapData.coordinates.length - 1])
        .addTo(map);

      // Fit bounds with padding
      map.fitBounds(mapData.bounds, {
        padding: { top: 40, bottom: 40, left: 40, right: 40 },
        maxZoom: 15,
        duration: 0,
      });
    },
    [mapData],
  );

  if (!mapData) {
    return (
      <div
        className={`${className} bg-[#0A0A0A] border border-[#222] flex items-center justify-center`}
      >
        <p className="text-[12px] text-[#444]">Rota verisi yok</p>
      </div>
    );
  }

  return (
    <MapboxMap
      center={mapData.center}
      zoom={13}
      className={className}
      onMapReady={handleMapReady}
      interactive={interactive}
    />
  );
}
