import { describe, expect, it, vi, beforeEach } from "vitest";
import { LocalGeoJSONProvider } from "../../src/data/provider";

const FC = (features: unknown[]) => ({ type: "FeatureCollection", features });

function mockFetch(map: Record<string, unknown>) {
  return vi.fn(async (url: string) => {
    const key = Object.keys(map).find((k) => url.endsWith(k));
    if (!key) return { ok: false, status: 404 } as Response;
    return { ok: true, status: 200, json: async () => map[key] } as unknown as Response;
  });
}

describe("LocalGeoJSONProvider", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("maps GeoJSON to typed domain data and treats missing props as null", async () => {
    const fetchMock = mockFetch({
      "flood_hotspots.geojson": FC([
        { geometry: { type: "Point", coordinates: [80.2, 13.0] }, properties: { name: "A", demo: true } },
      ]),
      "water_bodies.geojson": FC([
        { geometry: { type: "Point", coordinates: [80.1, 13.0] }, properties: { name: "L", waterbody_type: "lake", demo: false } },
      ]),
      "rainfall_sites.geojson": FC([]),
      "hazard_zones.geojson": FC([]),
      "datasets.json": { generated_at: "x", datasets: [], totals: {} },
    });
    vi.stubGlobal("fetch", fetchMock);

    const data = await new LocalGeoJSONProvider().load();
    expect(data.floodHotspots).toHaveLength(1);
    expect(data.floodHotspots[0].name).toBe("A");
    // event_year not provided -> null, never fabricated
    expect(data.floodHotspots[0].event_year).toBeNull();
    expect(data.floodHotspots[0].flood_depth_m).toBeNull();
    expect(data.waterBodies[0].waterbody_type).toBe("lake");
    expect(data.waterBodies[0].demo).toBe(false);
  });

  it("throws on a failed fetch (surfaces error state)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 }) as Response));
    await expect(new LocalGeoJSONProvider().load()).rejects.toThrow(/HTTP 500/);
  });

  it("does not crash on empty collections", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        "flood_hotspots.geojson": FC([]),
        "water_bodies.geojson": FC([]),
        "rainfall_sites.geojson": FC([]),
        "hazard_zones.geojson": FC([]),
        "datasets.json": { generated_at: "x", datasets: [], totals: {} },
      }),
    );
    const data = await new LocalGeoJSONProvider().load();
    expect(data.floodHotspots).toEqual([]);
    expect(data.waterBodies).toEqual([]);
  });
});
