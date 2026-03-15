"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

// Dark style overrides matching brand (#0A0A0A bg)
const DARK_STYLE: mapboxgl.StyleSpecification = {
  version: 8,
  name: "Alsancak Dark",
  sources: {
    "mapbox-streets": {
      type: "vector",
      url: "mapbox://mapbox.mapbox-streets-v8",
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#0A0A0A" },
    },
    {
      id: "water",
      type: "fill",
      source: "mapbox-streets",
      "source-layer": "water",
      paint: { "fill-color": "#071828" },
    },
    {
      id: "land",
      type: "fill",
      source: "mapbox-streets",
      "source-layer": "landuse",
      paint: { "fill-color": "#0f0f0f" },
    },
    {
      id: "roads-minor",
      type: "line",
      source: "mapbox-streets",
      "source-layer": "road",
      filter: ["in", "class", "street", "street_limited", "service"],
      paint: {
        "line-color": "#1a1a1a",
        "line-width": 0.5,
      },
    },
    {
      id: "roads-major",
      type: "line",
      source: "mapbox-streets",
      "source-layer": "road",
      filter: ["in", "class", "primary", "secondary", "tertiary", "trunk"],
      paint: {
        "line-color": "#222",
        "line-width": 1,
      },
    },
    {
      id: "buildings",
      type: "fill",
      source: "mapbox-streets",
      "source-layer": "building",
      paint: {
        "fill-color": "#111",
        "fill-opacity": 0.6,
      },
    },
    {
      id: "place-labels",
      type: "symbol",
      source: "mapbox-streets",
      "source-layer": "place_label",
      filter: ["<=", "filterrank", 2],
      layout: {
        "text-field": ["get", "name"],
        "text-size": 11,
        "text-font": ["DIN Pro Regular", "Arial Unicode MS Regular"],
      },
      paint: {
        "text-color": "#444",
        "text-halo-color": "#0A0A0A",
        "text-halo-width": 1,
      },
    },
  ],
};

interface MapboxMapProps {
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  className?: string;
  onMapReady?: (map: mapboxgl.Map) => void;
  interactive?: boolean;
  children?: React.ReactNode;
}

export default function MapboxMap({
  center = [27.1428, 38.4237], // Izmir center
  zoom = 12,
  className = "w-full h-[400px]",
  onMapReady,
  interactive = true,
}: MapboxMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [noToken, setNoToken] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!MAPBOX_TOKEN) {
      setNoToken(true);
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: DARK_STYLE,
      center,
      zoom,
      interactive,
      attributionControl: false,
      fadeDuration: 0,
    });

    mapRef.current = map;

    map.on("load", () => {
      onMapReady?.(map);
    });

    if (interactive) {
      map.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        "top-right"
      );
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (noToken) {
    return (
      <div
        className={`${className} bg-[#0A0A0A] border border-[#222] flex items-center justify-center`}
      >
        <div className="text-center">
          <div className="text-3xl mb-3 opacity-20">🗺️</div>
          <p className="text-[12px] text-[#444] tracking-wider uppercase">
            Harita yakında aktif olacak
          </p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className={className} />;
}
