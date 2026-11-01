import { useEffect, useState } from "react";
import type { AllData } from "../types";
import { createProvider, LocalGeoJSONProvider } from "../data/provider";

export type LoadState =
  | { status: "loading" }
  | { status: "error"; error: string; mode: string }
  | { status: "ready"; data: AllData; mode: string };

export function useData(): LoadState {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const provider = createProvider();

    provider
      .load()
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data, mode: provider.mode });
      })
      .catch(async (err) => {
        // If AWS mode fails and fallback is enabled, try local demo data.
        const fallback = import.meta.env.VITE_FALLBACK_TO_DEMO === "true";
        if (provider.mode === "aws" && fallback) {
          try {
            const data = await new LocalGeoJSONProvider().load();
            if (!cancelled)
              setState({ status: "ready", data, mode: "local (fallback)" });
            return;
          } catch {
            /* fall through to error */
          }
        }
        if (!cancelled)
          setState({
            status: "error",
            error: err instanceof Error ? err.message : String(err),
            mode: provider.mode,
          });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
