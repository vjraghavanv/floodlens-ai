import { describe, expect, it } from "vitest";
import { haversineKm, nearest, bbox, formatKm } from "../../src/lib/geo";
import type { Coord } from "../../src/types";

describe("haversineKm", () => {
  it("is zero for identical points", () => {
    expect(haversineKm([80.2, 13.0], [80.2, 13.0])).toBe(0);
  });

  it("matches a known Chennai distance (Velachery ↔ Velachery Lake ≈ 0.7 km)", () => {
    const d = haversineKm([80.2197, 12.9792], [80.2176, 12.9856]);
    expect(d).toBeGreaterThan(0.5);
    expect(d).toBeLessThan(1.0);
  });

  it("is symmetric", () => {
    const a: Coord = [80.1, 13.1];
    const b: Coord = [80.3, 12.9];
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10);
  });

  it("~111 km per degree of latitude", () => {
    const d = haversineKm([80, 13], [80, 14]);
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(112);
  });
});

describe("nearest", () => {
  const items = [
    { coord: [80.20, 13.00] as Coord, id: "a" },
    { coord: [80.25, 13.05] as Coord, id: "b" },
    { coord: [80.40, 13.30] as Coord, id: "c" },
  ];
  it("returns k ascending by distance", () => {
    const r = nearest([80.20, 13.00], items, 2);
    expect(r).toHaveLength(2);
    expect(r[0].item.id).toBe("a");
    expect(r[0].distanceKm).toBeLessThanOrEqual(r[1].distanceKm);
  });
  it("never returns more than available", () => {
    expect(nearest([80, 13], items, 10)).toHaveLength(3);
  });
});

describe("bbox", () => {
  it("returns null for empty", () => {
    expect(bbox([])).toBeNull();
  });
  it("computes extents", () => {
    expect(bbox([[80, 13], [81, 14], [79.5, 12.5]])).toEqual([79.5, 12.5, 81, 14]);
  });
});

describe("formatKm", () => {
  it("uses metres below 1 km", () => {
    expect(formatKm(0.742)).toBe("742 m");
  });
  it("uses km at or above 1", () => {
    expect(formatKm(1.337)).toBe("1.34 km");
  });
});
