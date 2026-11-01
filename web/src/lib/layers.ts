import type { LayerId } from "../types";

export interface LayerConfig {
  id: LayerId;
  label: string;
  color: string;
  kind: "point" | "polygon";
  defaultVisible: boolean;
}

export const LAYERS: LayerConfig[] = [
  { id: "flood_hotspots", label: "Flood Hotspots", color: "#f472b6", kind: "point", defaultVisible: true },
  { id: "water_bodies", label: "Water Bodies", color: "#38bdf8", kind: "point", defaultVisible: true },
  { id: "rainfall_sites", label: "Rainfall Sites", color: "#a78bfa", kind: "point", defaultVisible: true },
  { id: "hazard_zones", label: "Hazard Zones", color: "#fb7185", kind: "polygon", defaultVisible: false },
];

// Chennai centre + default zoom
export const CHENNAI_CENTER: [number, number] = [80.237, 13.047];
export const DEFAULT_ZOOM = 10.6;

// Free OSM raster basemap style (no API key, works offline-capable in dev).
// Swap this for an Amazon Location Service style URL in AWS mode (see docs).
export const BASEMAP_STYLE = {
  version: 8 as const,
  // Glyphs endpoint is required for symbol (text) layers such as cluster counts.
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    "osm-raster": {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    { id: "osm-raster", type: "raster" as const, source: "osm-raster" },
  ],
};
