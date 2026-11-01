// Build MapLibre-ready GeoJSON FeatureCollections from typed domain data.
import type { AllData, LayerId } from "../types";

export function buildFeatureCollections(data: AllData): Record<LayerId, GeoJSON.FeatureCollection> {
  const pt = (coord: [number, number], props: Record<string, unknown>): GeoJSON.Feature => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: coord },
    properties: props,
  });

  return {
    flood_hotspots: {
      type: "FeatureCollection",
      features: data.floodHotspots.map((h) =>
        pt(h.coord, {
          id: h.id,
          layer: "flood_hotspots",
          name: h.name,
          neighbourhood: h.neighbourhood,
          event_year: h.event_year,
          flood_depth_m: h.flood_depth_m,
          source: h.source,
          demo: h.demo,
        }),
      ),
    },
    water_bodies: {
      type: "FeatureCollection",
      features: data.waterBodies.map((w) =>
        pt(w.coord, {
          id: w.id,
          layer: "water_bodies",
          name: w.name,
          waterbody_type: w.waterbody_type,
          osm_id: w.osm_id,
          source: w.source,
          demo: w.demo,
        }),
      ),
    },
    rainfall_sites: {
      type: "FeatureCollection",
      features: data.rainfallSites.map((r) =>
        pt(r.coord, {
          id: r.id,
          layer: "rainfall_sites",
          name: r.name,
          station_locality: r.station_locality,
          source: r.source,
          demo: r.demo,
        }),
      ),
    },
    hazard_zones: {
      type: "FeatureCollection",
      features: data.hazardZones.map((z) => ({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: z.polygon },
        properties: {
          id: z.id,
          layer: "hazard_zones",
          name: z.name,
          risk: z.risk,
          source: z.source,
          demo: z.demo,
        },
      })),
    },
  };
}
