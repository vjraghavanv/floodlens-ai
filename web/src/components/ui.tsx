import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-navy-600/60 bg-navy-800/70 p-4 shadow-glow backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  accent = "#22d3ee",
}: {
  label: string;
  value: ReactNode;
  accent?: string;
}) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-2xl font-bold" style={{ color: accent }}>
        {value}
      </span>
    </Card>
  );
}

export function Loading({ label = "Loading datasets…" }: { label?: string }) {
  return (
    <div
      data-testid="loading"
      className="flex h-full w-full items-center justify-center text-slate-400"
    >
      <div className="animate-pulse">{label}</div>
    </div>
  );
}

export function ErrorState({ error }: { error: string }) {
  return (
    <div
      data-testid="error"
      className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center"
    >
      <div className="text-lg font-semibold text-rose-300">Could not load data</div>
      <div className="max-w-md text-sm text-slate-400">{error}</div>
      <div className="text-xs text-slate-500">
        Check that the data files exist, or configure VITE_API_BASE for AWS mode.
      </div>
    </div>
  );
}

export function Empty({ label = "No data available" }: { label?: string }) {
  return (
    <div data-testid="empty" className="p-6 text-center text-sm text-slate-500">
      {label}
    </div>
  );
}

export function DemoBadge() {
  return (
    <span className="ml-1 rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
      demo
    </span>
  );
}
