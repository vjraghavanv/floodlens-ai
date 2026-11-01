# FloodLens AI — 3-Minute Demo Script

A tight, rehearsed walkthrough for a live or recorded demo. Total ~3:00.
Start with the app running locally (`cd web && npm run dev`, open http://localhost:5173).

---

### 0:00–0:20 — Hook & framing
> "This is **FloodLens AI** — a geospatial intelligence platform for **Chennai**, the city
> that saw catastrophic flooding in 2015. Its tagline: *Understand Flood History, Explore
> Water Bodies, Discover Urban Risks.*
>
> Important up front: this is a **historical and geographical** tool. It does **not** predict
> floods — it helps you *understand* them from real data."

*(Show the landing dashboard: dark navy theme, the five overview cards.)*

### 0:20–0:45 — Overview, computed from real data
> "Every number here is **computed from loaded datasets**, not hardcoded. We have **57 real
> water bodies** pulled live from OpenStreetMap — lakes, temple tanks, reservoirs — 15 flood
> hotspots across 14 neighbourhoods, and rainfall observation sites. The 'LOCAL DATA' badge
> shows we're running fully offline; flip one env var and it reads from the AWS API instead."

### 0:45–1:25 — The interactive map (the core)
> "Here's Chennai. Four independent layers — flood hotspots in pink, water bodies in blue,
> rainfall sites in purple, hazard zones as polygons."

- Toggle **Water Bodies** off and on → *"each layer is independently controllable."*
- Point out a **cluster** (the number badge) → *"dense areas cluster automatically; zoom to expand."*
- Click a **water body marker** → *"real OpenStreetMap data — name, type, coordinates, its OSM id, and the ODbL source."*
- Type **"velach"** in search → click a result → *"search by neighbourhood or location; the map flies there."*

### 1:25–2:00 — Location detail & honesty about data
> "Click a flood hotspot — Velachery — and we get its coordinates, the event year, flood depth,
> and the **nearest water bodies with real distances.**"

- Point to a field that reads **"—"** → *"where a source doesn't have a value, we show 'not
> available'. We never invent data."*
- *(If helpful:)* click the **Datasets** tab briefly → *"full provenance — water bodies badged
> **VERIFIED** from OpenStreetMap; the flood/rainfall layers are **clearly labelled DEMO** data,
> because no open machine-readable source for those was verifiable. That honesty is the point."*

### 2:00–2:35 — Analytics & proximity
- **Insights** tab → *"charts built from the actual data — hotspots by neighbourhood, events by
  year, a depth histogram, and water bodies by type."* Change the **neighbourhood filter** →
  *"filters update every chart live."*
- **Proximity** tab → select **Velachery** → *"the three nearest water bodies — 742 m, 1.3 km,
  1.8 km — drawn on the map. And the explicit caveat: **proximity is geographic, not causal.**
  A lake being nearby doesn't mean it caused the flood."*

### 2:35–3:00 — Architecture & close
> "Under the hood: a repeatable Python ingestion pipeline validates coordinates and writes
> GeoJSON; on AWS that's **S3 + Lambda + API Gateway**, with the React app hosted on **Amplify**
> and an optional Amazon Location Service basemap — all serverless and cost-conscious. But it
> runs **with zero AWS** too, so anyone can try it.
>
> Sixty automated tests, all ten user journeys covered on desktop and mobile. That's FloodLens
> AI — real Chennai water data, honest provenance, and a clean, responsive map. Thank you."

---

## Demo prep checklist
- [ ] `cd web && npm run dev` is up; browser at http://localhost:5173
- [ ] Zoom the map once so a cluster is visible before you start
- [ ] Rehearse the search term ("velach") and the proximity hotspot (Velachery)
- [ ] Have the **Datasets** tab ready as the "honesty" beat if a judge asks about data
- [ ] Optional: run `python -m pytest pipeline/ infra/lambda/datasets_api/ -q` and
      `cd web && npx vitest run` beforehand to show green suites

## One-line pitch (if you only get 15 seconds)
> "FloodLens AI maps Chennai's real water bodies against its flood history — an honest,
> serverless geospatial tool that runs anywhere, with full data provenance and no fake numbers."
