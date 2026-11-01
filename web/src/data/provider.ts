// FloodLens AI — DataProvider abstraction.
// The whole UI reads through this seam; swapping local GeoJSON for the AWS
// REST API is a provider choice, not a rewrite.
import type {
  AllData,
  Coord,
  DatasetManifest,
  FloodHotspot,
  HazardZone,
  RainfallSite,
  WaterBody,
} from "../types";

export interface DataProvider {
  readonly mode: "local" | "aws";
  load(): Promise<AllData>;
}

type FC = { features: Array<{ geometry: any; properties: any }> };

function toFloodHotspots(fc: FC): FloodHotspot[] {
  return fc.features.map((f, i) => {
    const p = f.properties ?? {};
    return {
      id: `fh-${i}`,
      coord: f.geometry.coordinates as Coord,
      name: p.name ?? null,
      neighbourhood: p.neighbourhood ?? null,
      event_year: p.event_year ?? null,
      flood_depth_m: p.flood_depth_m ?? null,
      source: p.source ?? null,
      demo: Boolean(p.demo),
    };
  });
}

function toWaterBodies(fc: FC): WaterBody[] {
  return fc.features.map((f, i) => {
    const p = f.properties ?? {};
    return {
      id: `wb-${i}`,
      coord: f.geometry.coordinates as Coord,
      name: p.name ?? null,
      waterbody_type: p.waterbody_type ?? null,
      osm_id: p.osm_id ?? null,
      area_sq_km: p.area_sq_km ?? null,
      source: p.source ?? null,
      demo: Boolean(p.demo),
    };
  });
}

function toRainfallSites(fc: FC): RainfallSite[] {
  return fc.features.map((f, i) => {
    const p = f.properties ?? {};
    return {
      id: `rf-${i}`,
      coord: f.geometry.coordinates as Coord,
      name: p.name ?? null,
      station_locality: p.station_locality ?? null,
      source: p.source ?? null,
      demo: Boolean(p.demo),
    };
  });
}

function toHazardZones(fc: FC): HazardZone[] {
  return fc.features.map((f, i) => {
    const p = f.properties ?? {};
    return {
      id: `hz-${i}`,
      risk: p.risk ?? null,
      name: p.name ?? null,
      source: p.source ?? null,
      demo: Boolean(p.demo),
      polygon: (f.geometry?.coordinates ?? []) as Coord[][],
    };
  });
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

async function assemble(base: string): Promise<AllData> {
  const [fh, wb, rf, hz, manifest] = await Promise.all([
    fetchJson<FC>(`${base}/flood_hotspots.geojson`),
    fetchJson<FC>(`${base}/water_bodies.geojson`),
    fetchJson<FC>(`${base}/rainfall_sites.geojson`),
    fetchJson<FC>(`${base}/hazard_zones.geojson`),
    fetchJson<DatasetManifest>(`${base}/datasets.json`),
  ]);
  return {
    floodHotspots: toFloodHotspots(fh),
    waterBodies: toWaterBodies(wb),
    rainfallSites: toRainfallSites(rf),
    hazardZones: toHazardZones(hz),
    manifest,
  };
}

/** Local/demo mode — reads bundled GeoJSON from /data (no AWS). */
export class LocalGeoJSONProvider implements DataProvider {
  readonly mode = "local" as const;
  constructor(private base = "/data") {}
  load(): Promise<AllData> {
    return assemble(this.base);
  }
}

/** AWS mode — reads from the API Gateway REST base. */
export class AwsApiProvider implements DataProvider {
  readonly mode = "aws" as const;
  constructor(private base: string) {}
  async load(): Promise<AllData> {
    // The REST API returns the same GeoJSON documents by resource path.
    return assemble(this.base.replace(/\/$/, ""));
  }
}

/** Choose provider from env; default to local so the app runs with no AWS. */
export function createProvider(): DataProvider {
  const apiBase = import.meta.env.VITE_API_BASE as string | undefined;
  if (apiBase && apiBase.trim() !== "") {
    return new AwsApiProvider(apiBase.trim());
  }
  return new LocalGeoJSONProvider();
}
