import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AllData, WaterBody } from "../types";
import {
  countByNeighbourhood,
  countByYear,
  depthHistogram,
  waterBodyByType,
} from "../lib/stats";
import { nearest, formatKm } from "../lib/geo";
import { Card, Empty } from "./ui";

const PALETTE = ["#38bdf8", "#22d3ee", "#a78bfa", "#f472b6", "#fb7185", "#34d399", "#fbbf24"];

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </div>
      <div className="h-56">{children}</div>
    </Card>
  );
}

export function Insights({ data }: { data: AllData }) {
  const [nbhd, setNbhd] = useState<string>("all");
  const [year, setYear] = useState<string>("all");

  const neighbourhoods = useMemo(
    () =>
      [...new Set(data.floodHotspots.map((h) => h.neighbourhood).filter(Boolean))].sort() as string[],
    [data],
  );
  const years = useMemo(
    () =>
      [...new Set(data.floodHotspots.map((h) => h.event_year).filter(Boolean))].sort() as number[],
    [data],
  );

  const filtered = useMemo(
    () =>
      data.floodHotspots.filter(
        (h) =>
          (nbhd === "all" || h.neighbourhood === nbhd) &&
          (year === "all" || String(h.event_year) === year),
      ),
    [data, nbhd, year],
  );

  const byNbhd = countByNeighbourhood(filtered);
  const byYear = countByYear(filtered);
  const byDepth = depthHistogram(filtered);
  const byType = waterBodyByType(data.waterBodies);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <label className="text-sm text-slate-300">
          Neighbourhood{" "}
          <select
            data-testid="filter-neighbourhood"
            value={nbhd}
            onChange={(e) => setNbhd(e.target.value)}
            className="ml-1 rounded border border-navy-600 bg-navy-900 px-2 py-1 text-sm"
          >
            <option value="all">All</option>
            {neighbourhoods.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-300">
          Year{" "}
          <select
            data-testid="filter-year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="ml-1 rounded border border-navy-600 bg-navy-900 px-2 py-1 text-sm"
          >
            <option value="all">All</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <span data-testid="filtered-count" className="self-center text-xs text-slate-500">
          {filtered.length} hotspot(s)
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="Flood hotspots by neighbourhood">
          {byNbhd.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer>
              <BarChart data={byNbhd} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid stroke="#232f52" horizontal={false} />
                <XAxis type="number" stroke="#9fb3c8" fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="label" stroke="#9fb3c8" fontSize={11} width={90} />
                <Tooltip contentStyle={{ background: "#121a2e", border: "1px solid #232f52" }} />
                <Bar dataKey="value" fill="#f472b6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Flood events by year">
          {byYear.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer>
              <BarChart data={byYear}>
                <CartesianGrid stroke="#232f52" vertical={false} />
                <XAxis dataKey="label" stroke="#9fb3c8" fontSize={11} />
                <YAxis stroke="#9fb3c8" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#121a2e", border: "1px solid #232f52" }} />
                <Bar dataKey="value" fill="#22d3ee" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Flood depth distribution (where available)">
          <ResponsiveContainer>
            <BarChart data={byDepth}>
              <CartesianGrid stroke="#232f52" vertical={false} />
              <XAxis dataKey="label" stroke="#9fb3c8" fontSize={11} />
              <YAxis stroke="#9fb3c8" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#121a2e", border: "1px solid #232f52" }} />
              <Bar dataKey="value" fill="#a78bfa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Water bodies by type">
          {byType.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byType} dataKey="value" nameKey="label" outerRadius={80} label>
                  {byType.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#121a2e", border: "1px solid #232f52" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

export function Proximity({
  data,
  onAnalyze,
}: {
  data: AllData;
  onAnalyze: (origin: [number, number], targets: [number, number][]) => void;
}) {
  const [hotspotId, setHotspotId] = useState<string>("");
  const [k, setK] = useState(3);

  const hotspot = data.floodHotspots.find((h) => h.id === hotspotId);
  const results = hotspot ? nearest<WaterBody>(hotspot.coord, data.waterBodies, k) : [];

  return (
    <Card>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Proximity analysis
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Finds the nearest mapped water bodies to a flood hotspot. Proximity is a geographic
        fact and does <strong>not</strong> establish that a water body caused flooding.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          data-testid="proximity-hotspot"
          value={hotspotId}
          onChange={(e) => setHotspotId(e.target.value)}
          className="rounded border border-navy-600 bg-navy-900 px-2 py-1 text-sm"
        >
          <option value="">Select a flood hotspot…</option>
          {data.floodHotspots.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name ?? h.id}
            </option>
          ))}
        </select>
        <select
          value={k}
          onChange={(e) => setK(Number(e.target.value))}
          className="rounded border border-navy-600 bg-navy-900 px-2 py-1 text-sm"
        >
          {[1, 3, 5, 8].map((n) => (
            <option key={n} value={n}>
              {n} nearest
            </option>
          ))}
        </select>
        <button
          data-testid="proximity-run"
          disabled={!hotspot}
          onClick={() =>
            hotspot && onAnalyze(hotspot.coord, results.map((r) => r.item.coord))
          }
          className="rounded bg-cyan-600 px-3 py-1 text-sm font-medium text-navy-950 disabled:opacity-40"
        >
          Show on map
        </button>
      </div>

      {hotspot && (
        <ul data-testid="proximity-results" className="mt-3">
          {results.map((r) => (
            <li
              key={r.item.id}
              className="flex justify-between border-b border-navy-700/50 py-1.5 text-sm last:border-0"
            >
              <span>{r.item.name ?? r.item.id}</span>
              <span className="text-cyan-300">{formatKm(r.distanceKm)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function DatasetExplorer({ data }: { data: AllData }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-400">
        Data provenance — each dataset's source, license, coverage and processing status.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {data.manifest.datasets.map((d) => (
          <Card key={d.id}>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-semibold">{d.name}</span>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                  d.demo ? "bg-amber-400/15 text-amber-300" : "bg-emerald-400/15 text-emerald-300"
                }`}
              >
                {d.demo ? "demo" : "verified"}
              </span>
            </div>
            <p className="mb-2 text-xs text-slate-400">{d.description}</p>
            <dl className="grid grid-cols-2 gap-1 text-xs">
              <dt className="text-slate-500">Source</dt>
              <dd>{d.source_org}</dd>
              <dt className="text-slate-500">Records</dt>
              <dd>{d.record_count}</dd>
              <dt className="text-slate-500">Format</dt>
              <dd>{d.format}</dd>
              <dt className="text-slate-500">CRS</dt>
              <dd>{d.crs_source}</dd>
              <dt className="text-slate-500">License</dt>
              <dd>{d.license}</dd>
              <dt className="text-slate-500">Updated</dt>
              <dd>{d.last_updated ? new Date(d.last_updated).toLocaleDateString() : "—"}</dd>
            </dl>
            <a
              href={d.source_url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs text-cyan-400 hover:underline"
            >
              Source link ↗
            </a>
          </Card>
        ))}
      </div>
    </div>
  );
}
