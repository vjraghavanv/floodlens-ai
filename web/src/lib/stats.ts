// FloodLens AI — statistics derived from loaded data (never hardcoded).
import type { AllData, FloodHotspot, WaterBody } from "../types";

export interface Overview {
  totalFloodHotspots: number;
  totalWaterBodies: number;
  neighbourhoods: number;
  rainfallRecords: number;
  lastUpdated: string | null;
}

export function computeOverview(data: AllData): Overview {
  const neighbourhoods = new Set(
    data.floodHotspots.map((h) => h.neighbourhood).filter((n): n is string => !!n),
  );
  const dates = data.manifest.datasets
    .map((d) => d.last_updated)
    .filter((d): d is string => !!d)
    .sort();
  return {
    totalFloodHotspots: data.floodHotspots.length,
    totalWaterBodies: data.waterBodies.length,
    neighbourhoods: neighbourhoods.size,
    rainfallRecords: data.rainfallSites.length,
    lastUpdated: dates.length ? dates[dates.length - 1] : null,
  };
}

export interface Bucket {
  label: string;
  value: number;
}

export function countByNeighbourhood(hotspots: FloodHotspot[]): Bucket[] {
  const m = new Map<string, number>();
  for (const h of hotspots) {
    const key = h.neighbourhood ?? "Unknown";
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function countByYear(hotspots: FloodHotspot[]): Bucket[] {
  const m = new Map<string, number>();
  for (const h of hotspots) {
    const key = h.event_year != null ? String(h.event_year) : "Unknown";
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function depthHistogram(hotspots: FloodHotspot[]): Bucket[] {
  // Buckets in metres; only counts records that actually have a depth.
  const edges = [0, 0.5, 1, 1.5, 2, 2.5, 3, Infinity];
  const labels = ["0–0.5", "0.5–1", "1–1.5", "1.5–2", "2–2.5", "2.5–3", "3+"];
  const counts = new Array(labels.length).fill(0);
  for (const h of hotspots) {
    if (h.flood_depth_m == null) continue;
    for (let i = 0; i < edges.length - 1; i++) {
      if (h.flood_depth_m >= edges[i] && h.flood_depth_m < edges[i + 1]) {
        counts[i]++;
        break;
      }
    }
  }
  return labels.map((label, i) => ({ label, value: counts[i] }));
}

export function waterBodyByType(bodies: WaterBody[]): Bucket[] {
  const m = new Map<string, number>();
  for (const b of bodies) {
    const key = b.waterbody_type ?? "unknown";
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}
