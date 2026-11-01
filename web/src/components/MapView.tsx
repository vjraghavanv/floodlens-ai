import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { AllData, LayerId } from "../types";
import { BASEMAP_STYLE, CHENNAI_CENTER, DEFAULT_ZOOM, LAYERS } from "../lib/layers";
import { buildFeatureCollections } from "../lib/mapData";

export interface MapViewProps {
  data: AllData;
  visible: Record<LayerId, boolean>;
  onFeatureClick: (layer: LayerId, id: string) => void;
  flyTo?: { center: [number, number]; zoom?: number } | null;
  highlight?: [number, number][]; // proximity lines origin->targets
  highlightOrigin?: [number, number] | null;
}

export default function MapView({
  data,
  visible,
  onFeatureClick,
  flyTo,
  highlight,
  highlightOrigin,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const loadedRef = useRef(false);

  // init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP_STYLE as maplibregl.StyleSpecification,
      center: CHENNAI_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      const fcs = buildFeatureCollections(data);

      // hazard polygons first (under points)
      map.addSource("hazard_zones", { type: "geojson", data: fcs.hazard_zones });
      map.addLayer({
        id: "hazard_zones-fill",
        type: "fill",
        source: "hazard_zones",
        paint: { "fill-color": "#fb7185", "fill-opacity": 0.18 },
      });
      map.addLayer({
        id: "hazard_zones-line",
        type: "line",
        source: "hazard_zones",
        paint: { "line-color": "#fb7185", "line-width": 1.5 },
      });

      // point layers with clustering
      for (const cfg of LAYERS.filter((l) => l.kind === "point")) {
        const src = cfg.id;
        map.addSource(src, {
          type: "geojson",
          data: fcs[src],
          cluster: true,
          clusterRadius: 45,
          clusterMaxZoom: 13,
        });
        // clusters
        map.addLayer({
          id: `${src}-clusters`,
          type: "circle",
          source: src,
          filter: ["has", "point_count"],
          paint: {
            "circle-color": cfg.color,
            "circle-opacity": 0.35,
            "circle-radius": ["step", ["get", "point_count"], 14, 5, 18, 15, 24],
          },
        });
        map.addLayer({
          id: `${src}-cluster-count`,
          type: "symbol",
          source: src,
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-font": ["Noto Sans Regular"],
            "text-size": 12,
          },
          paint: { "text-color": "#e5edf5" },
        });
        // individual points
        map.addLayer({
          id: `${src}-point`,
          type: "circle",
          source: src,
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": cfg.color,
            "circle-radius": 6,
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#0a0f1e",
          },
        });

        // click: expand cluster or select feature
        map.on("click", `${src}-clusters`, (e) => {
          const f = e.features?.[0];
          if (!f) return;
          const clusterId = f.properties?.cluster_id;
          const source = map.getSource(src) as maplibregl.GeoJSONSource;
          source.getClusterExpansionZoom(clusterId).then((zoom) => {
            map.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom });
          });
        });
        map.on("click", `${src}-point`, (e) => {
          const f = e.features?.[0];
          if (!f) return;
          onFeatureClick(src as LayerId, String(f.properties?.id));
          popup(map, e.lngLat, f.properties ?? {});
        });
        map.on("mouseenter", `${src}-point`, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", `${src}-point`, () => (map.getCanvas().style.cursor = ""));
        map.on("mouseenter", `${src}-clusters`, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", `${src}-clusters`, () => (map.getCanvas().style.cursor = ""));
      }

      // proximity highlight source
      map.addSource("proximity", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "proximity-line",
        type: "line",
        source: "proximity",
        paint: { "line-color": "#22d3ee", "line-width": 2, "line-dasharray": [2, 1] },
      });

      loadedRef.current = true;
      applyVisibility(map, visible);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // update data when it changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const fcs = buildFeatureCollections(data);
    (Object.keys(fcs) as LayerId[]).forEach((id) => {
      const src = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
      if (src) src.setData(fcs[id]);
    });
  }, [data]);

  // visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    applyVisibility(map, visible);
  }, [visible]);

  // flyTo
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTo) return;
    map.flyTo({ center: flyTo.center, zoom: flyTo.zoom ?? 14, duration: 800 });
  }, [flyTo]);

  // proximity lines
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const src = map.getSource("proximity") as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    const features: GeoJSON.Feature[] =
      highlightOrigin && highlight
        ? highlight.map((t) => ({
            type: "Feature",
            geometry: { type: "LineString", coordinates: [highlightOrigin, t] },
            properties: {},
          }))
        : [];
    src.setData({ type: "FeatureCollection", features });
  }, [highlight, highlightOrigin]);

  return <div ref={containerRef} data-testid="map" className="h-full w-full" />;
}

function applyVisibility(map: maplibregl.Map, visible: Record<LayerId, boolean>) {
  const set = (layerId: string, vis: boolean) => {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", vis ? "visible" : "none");
    }
  };
  set("hazard_zones-fill", visible.hazard_zones);
  set("hazard_zones-line", visible.hazard_zones);
  for (const id of ["flood_hotspots", "water_bodies", "rainfall_sites"] as LayerId[]) {
    set(`${id}-point`, visible[id]);
    set(`${id}-clusters`, visible[id]);
    set(`${id}-cluster-count`, visible[id]);
  }
}

function popup(map: maplibregl.Map, lngLat: maplibregl.LngLatLike, props: Record<string, any>) {
  const na = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));
  const demo = props.demo ? `<span style="color:#fbbf24">demo</span>` : "";
  const html = `
    <div style="padding:10px 12px;max-width:240px;font-size:13px">
      <div style="font-weight:600;margin-bottom:4px">${na(props.name)} ${demo}</div>
      ${props.waterbody_type ? `<div>Type: ${na(props.waterbody_type)}</div>` : ""}
      ${props.neighbourhood ? `<div>Neighbourhood: ${na(props.neighbourhood)}</div>` : ""}
      ${props.flood_depth_m != null ? `<div>Depth: ${na(props.flood_depth_m)} m</div>` : ""}
      ${props.event_year ? `<div>Year: ${na(props.event_year)}</div>` : ""}
      <div style="margin-top:4px;color:#9fb3c8">${na(props.source)}</div>
    </div>`;
  new maplibregl.Popup({ closeButton: true, offset: 12 }).setLngLat(lngLat).setHTML(html).addTo(map);
}
