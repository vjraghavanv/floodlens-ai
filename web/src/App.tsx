import { useMemo, useState } from "react";
import type { LayerId } from "./types";
import { LAYERS } from "./lib/layers";
import { computeOverview } from "./lib/stats";
import { useData } from "./hooks/useData";
import MapView from "./components/MapView";
import { LayerControls, Legend, SearchBox } from "./components/Controls";
import { LocationDetails } from "./components/LocationDetails";
import { DatasetExplorer, Insights, Proximity } from "./components/Panels";
import { Card, ErrorState, Loading, StatCard } from "./components/ui";

type Tab = "map" | "insights" | "proximity" | "datasets";

const defaultVisible = () =>
  LAYERS.reduce(
    (acc, l) => ({ ...acc, [l.id]: l.defaultVisible }),
    {} as Record<LayerId, boolean>,
  );

export default function App() {
  const state = useData();
  const [tab, setTab] = useState<Tab>("map");
  const [visible, setVisible] = useState<Record<LayerId, boolean>>(defaultVisible);
  const [selected, setSelected] = useState<{ layer: LayerId; id: string } | null>(null);
  const [flyTo, setFlyTo] = useState<{ center: [number, number]; zoom?: number } | null>(null);
  const [proximity, setProximity] = useState<{
    origin: [number, number] | null;
    targets: [number, number][];
  }>({ origin: null, targets: [] });

  const counts = useMemo(() => {
    if (state.status !== "ready")
      return { flood_hotspots: 0, water_bodies: 0, rainfall_sites: 0, hazard_zones: 0 };
    const d = state.data;
    return {
      flood_hotspots: d.floodHotspots.length,
      water_bodies: d.waterBodies.length,
      rainfall_sites: d.rainfallSites.length,
      hazard_zones: d.hazardZones.length,
    } as Record<LayerId, number>;
  }, [state]);

  return (
    <div className="flex min-h-screen flex-col bg-navy-950">
      <header className="sticky top-0 z-30 border-b border-navy-700 bg-navy-900/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌊</span>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight">
                FloodLens <span className="text-cyan-400">AI</span>
              </h1>
              <p className="text-[11px] text-slate-400">
                Understand Flood History. Explore Water Bodies. Discover Urban Risks.
              </p>
            </div>
          </div>
          <nav className="ml-auto flex gap-1 text-sm">
            {(["map", "insights", "proximity", "datasets"] as Tab[]).map((t) => (
              <button
                key={t}
                data-testid={`tab-${t}`}
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-1.5 capitalize ${
                  tab === t ? "bg-cyan-600 text-navy-950" : "text-slate-300 hover:bg-navy-700"
                }`}
              >
                {t}
              </button>
            ))}
          </nav>
          {state.status === "ready" && (
            <span className="rounded bg-navy-700 px-2 py-1 text-[10px] uppercase text-slate-300">
              {state.mode} data
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-4">
        {state.status === "loading" && (
          <div className="h-[70vh]">
            <Loading />
          </div>
        )}
        {state.status === "error" && (
          <div className="h-[70vh]">
            <ErrorState error={state.error} />
          </div>
        )}
        {state.status === "ready" &&
          (() => {
            const data = state.data;
            const ov = computeOverview(data);
            return (
              <div className="flex flex-col gap-4">
                {/* Overview cards — always computed from data */}
                <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
                  <StatCard label="Flood hotspots" value={ov.totalFloodHotspots} accent="#f472b6" />
                  <StatCard label="Water bodies" value={ov.totalWaterBodies} accent="#38bdf8" />
                  <StatCard label="Neighbourhoods" value={ov.neighbourhoods} accent="#22d3ee" />
                  <StatCard label="Rainfall records" value={ov.rainfallRecords} accent="#a78bfa" />
                  <StatCard
                    label="Last updated"
                    value={ov.lastUpdated ? new Date(ov.lastUpdated).toLocaleDateString() : "—"}
                    accent="#e5edf5"
                  />
                </section>

                {tab === "map" && (
                  <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
                    <div className="order-2 h-[60vh] overflow-hidden rounded-xl border border-navy-600 lg:order-1 lg:h-[70vh]">
                      <MapView
                        data={data}
                        visible={visible}
                        onFeatureClick={(layer, id) => setSelected({ layer, id })}
                        flyTo={flyTo}
                        highlightOrigin={proximity.origin}
                        highlight={proximity.targets}
                      />
                    </div>
                    <div className="order-1 flex flex-col gap-3 lg:order-2">
                      <SearchBox
                        data={data}
                        onSelect={(coord) => setFlyTo({ center: coord, zoom: 14 })}
                      />
                      <LayerControls
                        visible={visible}
                        counts={counts}
                        onToggle={(id) => setVisible((v) => ({ ...v, [id]: !v[id] }))}
                      />
                      <Legend />
                      <LocationDetails selected={selected} data={data} />
                    </div>
                  </section>
                )}

                {tab === "insights" && <Insights data={data} />}

                {tab === "proximity" && (
                  <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
                    <div className="h-[60vh] overflow-hidden rounded-xl border border-navy-600">
                      <MapView
                        data={data}
                        visible={{ ...visible, water_bodies: true, flood_hotspots: true }}
                        onFeatureClick={(layer, id) => setSelected({ layer, id })}
                        highlightOrigin={proximity.origin}
                        highlight={proximity.targets}
                      />
                    </div>
                    <Proximity
                      data={data}
                      onAnalyze={(origin, targets) => {
                        setProximity({ origin, targets });
                        setTab("proximity");
                      }}
                    />
                  </div>
                )}

                {tab === "datasets" && <DatasetExplorer data={data} />}

                {data.manifest.datasets.some((d) => d.demo) && (
                  <Card className="border-amber-500/30 bg-amber-500/5">
                    <p className="text-xs text-amber-200/90">
                      ⚠️ Some layers use clearly-labelled <strong>demonstration data</strong>. See
                      the Datasets tab for full provenance. FloodLens AI is a historical and
                      geographical tool and does not provide flood forecasts.
                    </p>
                  </Card>
                )}
              </div>
            );
          })()}
      </main>

      <footer className="border-t border-navy-700 px-4 py-3 text-center text-[11px] text-slate-500">
        FloodLens AI · Chennai · Water-body data © OpenStreetMap contributors (ODbL) · Historical
        & geographical intelligence only — not a flood forecast.
      </footer>
    </div>
  );
}
