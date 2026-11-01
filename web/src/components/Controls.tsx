import { useState } from "react";
import type { AllData, LayerId } from "../types";
import { LAYERS } from "../lib/layers";
import { Card } from "./ui";

export function LayerControls({
  visible,
  counts,
  onToggle,
}: {
  visible: Record<LayerId, boolean>;
  counts: Record<LayerId, number>;
  onToggle: (id: LayerId) => void;
}) {
  return (
    <Card>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Layers
      </div>
      <div className="flex flex-col gap-2">
        {LAYERS.map((l) => (
          <label
            key={l.id}
            className="flex cursor-pointer items-center justify-between gap-3 text-sm"
          >
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                data-testid={`layer-toggle-${l.id}`}
                checked={visible[l.id]}
                onChange={() => onToggle(l.id)}
                className="h-4 w-4 accent-cyan-500"
              />
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ background: l.color }}
              />
              {l.label}
            </span>
            <span className="text-xs text-slate-500">{counts[l.id]}</span>
          </label>
        ))}
      </div>
    </Card>
  );
}

export function Legend() {
  return (
    <Card>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Legend
      </div>
      <div className="flex flex-col gap-1.5 text-xs text-slate-300">
        {LAYERS.map((l) => (
          <div key={l.id} className="flex items-center gap-2">
            <span
              className={l.kind === "polygon" ? "h-3 w-4 rounded-sm" : "h-3 w-3 rounded-full"}
              style={{
                background: l.kind === "polygon" ? `${l.color}40` : l.color,
                border: l.kind === "polygon" ? `1px solid ${l.color}` : "none",
              }}
            />
            {l.label}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function SearchBox({
  data,
  onSelect,
}: {
  data: AllData;
  onSelect: (coord: [number, number], label: string) => void;
}) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  const results =
    query.length < 2
      ? []
      : [
          ...data.floodHotspots.map((h) => ({
            label: `${h.name ?? "?"} · flood`,
            key: h.id,
            coord: h.coord,
            hay: `${h.name ?? ""} ${h.neighbourhood ?? ""}`.toLowerCase(),
          })),
          ...data.waterBodies.map((w) => ({
            label: `${w.name ?? "?"} · water`,
            key: w.id,
            coord: w.coord,
            hay: (w.name ?? "").toLowerCase(),
          })),
          ...data.rainfallSites.map((r) => ({
            label: `${r.name ?? "?"} · rainfall`,
            key: r.id,
            coord: r.coord,
            hay: (r.name ?? "").toLowerCase(),
          })),
        ]
          .filter((x) => x.hay.includes(query))
          .slice(0, 8);

  return (
    <div className="relative">
      <input
        data-testid="search-input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search neighbourhood or location…"
        className="w-full rounded-lg border border-navy-600 bg-navy-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
      />
      {results.length > 0 && (
        <ul
          data-testid="search-results"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-navy-600 bg-navy-800 shadow-xl"
        >
          {results.map((r) => (
            <li key={r.key}>
              <button
                className="block w-full px-3 py-2 text-left text-sm hover:bg-navy-700"
                onClick={() => {
                  onSelect(r.coord, r.label);
                  setQ("");
                }}
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
