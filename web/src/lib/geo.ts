// FloodLens AI — pure geographic utilities. Unit-tested.
import type { Coord } from "../types";

const R_KM = 6371.0088; // mean Earth radius

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}

/** Great-circle distance in kilometres between two [lng, lat] coords. */
export function haversineKm(a: Coord, b: Coord): number {
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

export interface Nearby<T> {
  item: T;
  distanceKm: number;
}

/** k nearest items (by coord) to an origin, ascending by distance. */
export function nearest<T extends { coord: Coord }>(
  origin: Coord,
  items: T[],
  k = 5,
): Nearby<T>[] {
  return items
    .map((item) => ({ item, distanceKm: haversineKm(origin, item.coord) }))
    .sort((x, y) => x.distanceKm - y.distanceKm)
    .slice(0, k);
}

/** Bounding box [minLng, minLat, maxLng, maxLat] over coords. */
export function bbox(coords: Coord[]): [number, number, number, number] | null {
  if (coords.length === 0) return null;
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }
  return [minLng, minLat, maxLng, maxLat];
}

export function formatKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(2)} km`;
}
