import { describe, expect, it } from "vitest";
import {
  computeOverview,
  countByNeighbourhood,
  countByYear,
  depthHistogram,
  waterBodyByType,
} from "../../src/lib/stats";
import type { AllData } from "../../src/types";

const sample: AllData = {
  floodHotspots: [
    { id: "1", coord: [80.2, 13.0], name: "A", neighbourhood: "Velachery", event_year: 2015, flood_depth_m: 2.0, source: "demo", demo: true },
    { id: "2", coord: [80.3, 13.1], name: "B", neighbourhood: "Adyar", event_year: 2015, flood_depth_m: null, source: "demo", demo: true },
    { id: "3", coord: [80.25, 13.05], name: "C", neighbourhood: "Velachery", event_year: 2005, flood_depth_m: 0.4, source: "demo", demo: true },
  ],
  waterBodies: [
    { id: "w1", coord: [80.1, 13.0], name: "L1", waterbody_type: "lake", osm_id: "way/1", source: "osm", demo: false },
    { id: "w2", coord: [80.15, 13.0], name: "P1", waterbody_type: "pond", osm_id: "way/2", source: "osm", demo: false },
    { id: "w3", coord: [80.12, 13.0], name: "L2", waterbody_type: "lake", osm_id: "way/3", source: "osm", demo: false },
  ],
  rainfallSites: [
    { id: "r1", coord: [80.24, 13.06], name: "S1", station_locality: "S1", source: "demo", demo: true },
  ],
  hazardZones: [],
  manifest: {
    generated_at: "2026-11-01T00:00:00Z",
    datasets: [{ id: "flood_hotspots", name: "", source_org: "", description: "", source_url: "", license: "", coverage: "", format: "", crs_source: "", demo: true, record_count: 3, last_updated: "2026-11-01T00:00:00Z" }],
    totals: { flood_hotspots: 3, water_bodies: 3, rainfall_sites: 1, hazard_zones: 0 },
  },
};

describe("computeOverview", () => {
  it("derives all figures from loaded data (not hardcoded)", () => {
    const ov = computeOverview(sample);
    expect(ov.totalFloodHotspots).toBe(3);
    expect(ov.totalWaterBodies).toBe(3);
    expect(ov.neighbourhoods).toBe(2); // Velachery, Adyar
    expect(ov.rainfallRecords).toBe(1);
    expect(ov.lastUpdated).toBe("2026-11-01T00:00:00Z");
  });
});

describe("aggregations", () => {
  it("countByNeighbourhood sorts desc", () => {
    const b = countByNeighbourhood(sample.floodHotspots);
    expect(b[0]).toEqual({ label: "Velachery", value: 2 });
  });
  it("countByYear groups", () => {
    const b = countByYear(sample.floodHotspots);
    expect(b.find((x) => x.label === "2015")?.value).toBe(2);
    expect(b.find((x) => x.label === "2005")?.value).toBe(1);
  });
  it("depthHistogram ignores null depths", () => {
    const h = depthHistogram(sample.floodHotspots);
    const total = h.reduce((s, x) => s + x.value, 0);
    expect(total).toBe(2); // only 2 of 3 have a depth
  });
  it("waterBodyByType counts", () => {
    const t = waterBodyByType(sample.waterBodies);
    expect(t.find((x) => x.label === "lake")?.value).toBe(2);
    expect(t.find((x) => x.label === "pond")?.value).toBe(1);
  });
});
