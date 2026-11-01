import type { AllData, FloodHotspot, WaterBody } from "../types";
import { nearest, formatKm } from "../lib/geo";
import { Card, DemoBadge, Empty } from "./ui";

const na = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-navy-700/50 py-1.5 text-sm last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="text-right text-slate-100">{value}</span>
    </div>
  );
}

export function LocationDetails({
  selected,
  data,
}: {
  selected: { layer: string; id: string } | null;
  data: AllData;
}) {
  if (!selected) {
    return (
      <Card>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Location details
        </div>
        <Empty label="Click a map feature to see details." />
      </Card>
    );
  }

  if (selected.layer === "flood_hotspots") {
    const h = data.floodHotspots.find((x) => x.id === selected.id);
    if (!h) return null;
    const near = nearest<WaterBody>(h.coord, data.waterBodies, 3);
    return (
      <Card>
        <div className="mb-2 flex items-center text-sm font-semibold">
          {na(h.name)} {h.demo && <DemoBadge />}
        </div>
        <Row label="Type" value="Flood hotspot" />
        <Row label="Latitude" value={h.coord[1].toFixed(5)} />
        <Row label="Longitude" value={h.coord[0].toFixed(5)} />
        <Row label="Neighbourhood" value={na(h.neighbourhood)} />
        <Row label="Event year" value={na(h.event_year)} />
        <Row label="Flood depth" value={h.flood_depth_m != null ? `${h.flood_depth_m} m` : "—"} />
        <Row label="Data source" value={na(h.source)} />
        <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Nearby water bodies
        </div>
        {near.map((n) => (
          <Row key={n.item.id} label={na(n.item.name)} value={formatKm(n.distanceKm)} />
        ))}
      </Card>
    );
  }

  if (selected.layer === "water_bodies") {
    const w = data.waterBodies.find((x) => x.id === selected.id);
    if (!w) return null;
    const near = nearest<FloodHotspot>(w.coord, data.floodHotspots, 3);
    return (
      <Card>
        <div className="mb-2 flex items-center text-sm font-semibold">
          {na(w.name)} {w.demo && <DemoBadge />}
        </div>
        <Row label="Type" value={na(w.waterbody_type)} />
        <Row label="Latitude" value={w.coord[1].toFixed(5)} />
        <Row label="Longitude" value={w.coord[0].toFixed(5)} />
        <Row label="Area" value={w.area_sq_km != null ? `${w.area_sq_km} km²` : "—"} />
        <Row label="OSM id" value={na(w.osm_id)} />
        <Row label="Data source" value={na(w.source)} />
        <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Nearby flood hotspots
        </div>
        {near.map((n) => (
          <Row key={n.item.id} label={na(n.item.name)} value={formatKm(n.distanceKm)} />
        ))}
      </Card>
    );
  }

  // rainfall or other point
  const r = data.rainfallSites.find((x) => x.id === selected.id);
  if (!r) return null;
  return (
    <Card>
      <div className="mb-2 flex items-center text-sm font-semibold">
        {na(r.name)} {r.demo && <DemoBadge />}
      </div>
      <Row label="Type" value="Rainfall observation site" />
      <Row label="Latitude" value={r.coord[1].toFixed(5)} />
      <Row label="Longitude" value={r.coord[0].toFixed(5)} />
      <Row label="Station locality" value={na(r.station_locality)} />
      <Row label="Data source" value={na(r.source)} />
    </Card>
  );
}
