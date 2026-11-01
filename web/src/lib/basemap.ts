// FloodLens AI — basemap style resolver.
// Default: open OSM raster (no AWS, works offline-capable in dev).
// Optional: Amazon Location Service map style, enabled only when
// VITE_LOCATION_STYLE_URL (+ API key) is configured. This keeps the app
// fully runnable with no AWS account while documenting the AWS path.
import type { StyleSpecification } from "maplibre-gl";
import { BASEMAP_STYLE } from "./layers";

export function resolveBasemapStyle(): string | StyleSpecification {
  const styleUrl = import.meta.env.VITE_LOCATION_STYLE_URL as string | undefined;
  const apiKey = import.meta.env.VITE_LOCATION_API_KEY as string | undefined;

  if (styleUrl && styleUrl.trim() !== "") {
    // Amazon Location Service style descriptor URL. When an API key is present
    // it is appended as a query param (Location Service API-key auth). The key
    // is a public, scoped map-read key — NOT an AWS secret — and is injected at
    // build time via Amplify env vars, never hardcoded in source.
    const sep = styleUrl.includes("?") ? "&" : "?";
    return apiKey ? `${styleUrl}${sep}key=${encodeURIComponent(apiKey)}` : styleUrl;
  }

  return BASEMAP_STYLE as StyleSpecification;
}
