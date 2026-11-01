// FloodLens AI — domain types.
// Every optional source attribute is `| null` so the UI can render
// "not available" instead of inventing a value.

export type Lng = number;
export type Lat = number;
export type Coord = [Lng, Lat];

export interface FeatureProps {
  name: string | null;
  source: string | null;
  demo: boolean;
}

export interface FloodHotspot extends FeatureProps {
  id: string;
  coord: Coord;
  neighbourhood: string | null;
  event_year: number | null;
  flood_depth_m: number | null;
}

export interface WaterBody extends FeatureProps {
  id: string;
  coord: Coord;
  waterbody_type: string | null; // lake | pond | reservoir | wetland …
  osm_id: string | null;
  area_sq_km?: number | null;
}

export interface RainfallSite extends FeatureProps {
  id: string;
  coord: Coord;
  station_locality: string | null;
}

export interface HazardZone extends FeatureProps {
  id: string;
  risk: string | null;
  // GeoJSON Polygon ring(s)
  polygon: Coord[][];
}

export interface DatasetMeta {
  id: string;
  name: string;
  source_org: string;
  description: string;
  source_url: string;
  license: string;
  coverage: string;
  format: string;
  crs_source: string;
  demo: boolean;
  record_count: number;
  last_updated?: string;
  fetch_error?: string;
}

export interface DatasetManifest {
  generated_at: string;
  datasets: DatasetMeta[];
  totals: Record<string, number>;
}

export type LayerId = "flood_hotspots" | "water_bodies" | "rainfall_sites" | "hazard_zones";

export interface AllData {
  floodHotspots: FloodHotspot[];
  waterBodies: WaterBody[];
  rainfallSites: RainfallSite[];
  hazardZones: HazardZone[];
  manifest: DatasetManifest;
}
