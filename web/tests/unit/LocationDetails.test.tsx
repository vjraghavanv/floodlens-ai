import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocationDetails } from "../../src/components/LocationDetails";
import type { AllData } from "../../src/types";

const data: AllData = {
  floodHotspots: [
    { id: "fh-0", coord: [80.2197, 12.9792], name: "Velachery", neighbourhood: "Velachery", event_year: 2015, flood_depth_m: 2.0, source: "Demonstration dataset", demo: true },
    // a hotspot with missing attributes — must render "—", not invent
    { id: "fh-1", coord: [80.25, 13.05], name: "Mystery", neighbourhood: null, event_year: null, flood_depth_m: null, source: null, demo: true },
  ],
  waterBodies: [
    { id: "wb-0", coord: [80.2176, 12.9856], name: "Velachery Lake", waterbody_type: "lake", osm_id: "way/1", source: "OpenStreetMap (ODbL)", demo: false },
  ],
  rainfallSites: [],
  hazardZones: [],
  manifest: { generated_at: "x", datasets: [], totals: {} },
};

describe("LocationDetails", () => {
  it("prompts to click when nothing is selected", () => {
    render(<LocationDetails selected={null} data={data} />);
    expect(screen.getByText(/click a map feature/i)).toBeInTheDocument();
  });

  it("shows flood hotspot details + nearby water bodies", () => {
    render(<LocationDetails selected={{ layer: "flood_hotspots", id: "fh-0" }} data={data} />);
    // "Velachery" appears as both the title and the neighbourhood row
    expect(screen.getAllByText("Velachery").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("2 m")).toBeInTheDocument(); // depth
    expect(screen.getByText("Velachery Lake")).toBeInTheDocument(); // nearby wb
    expect(screen.getByText("Demonstration dataset")).toBeInTheDocument();
  });

  it("renders '—' for missing attributes (never fabricates)", () => {
    render(<LocationDetails selected={{ layer: "flood_hotspots", id: "fh-1" }} data={data} />);
    // neighbourhood, year, depth, source all unknown -> multiple dashes
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(3);
  });

  it("shows water body details + nearby flood hotspots", () => {
    render(<LocationDetails selected={{ layer: "water_bodies", id: "wb-0" }} data={data} />);
    expect(screen.getByText("Velachery Lake")).toBeInTheDocument();
    expect(screen.getByText("lake")).toBeInTheDocument();
    expect(screen.getByText("way/1")).toBeInTheDocument();
  });
});
