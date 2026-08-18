import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ColumnMapping, MapPoint, StyleConfig, MapLayer } from "@/types";
import { BASEMAPS } from "@/types";

interface Props {
  points: MapPoint[];
  style: StyleConfig;
  mapping: ColumnMapping;
  layer: MapLayer;
  showLabels: boolean;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  sidebarOpen?: boolean;
}

const BASEMAP_BY_ID = Object.fromEntries(BASEMAPS.map((b) => [b.id, b])) as Record<
  MapLayer,
  (typeof BASEMAPS)[number]
>;

/** Above this count we skip per-point popups/labels and bind lazily for speed. */
const LABEL_LIMIT = 1500;

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
}

function popupHtml(p: MapPoint, mapping: ColumnMapping): string {
  const skip = new Set([mapping.lat, mapping.lon, mapping.name].filter(Boolean));
  const cols = mapping.popup.length
    ? mapping.popup
    : Object.keys(p.row).filter((c) => !skip.has(c)).slice(0, 8);

  let rows = "";
  for (const c of cols) {
    const raw = p.row[c];
    const val = raw === null || raw === undefined ? "" : String(raw).trim();
    rows += `<div class="pg-pop-row"><span class="pg-pop-k">${escapeHtml(c)}</span><span class="pg-pop-v${val ? "" : " pg-empty"}">${val ? escapeHtml(val) : "—"}</span></div>`;
  }

  if (!rows) {
    rows = `<div class="pg-pop-hint">No popup columns selected.</div>`;
  }

  return (
    `<div class="pg-pop">` +
    `<div class="pg-pop-head">` +
    `<span class="pg-pop-dot" style="background:${p.color}"></span>` +
    `<span class="pg-pop-title">${escapeHtml(p.name || "Point")}</span>` +
    `</div>` +
    `<div class="pg-pop-body">${rows}</div>` +
    `</div>`
  );
}



export default function MapView({
  points,
  style,
  mapping,
  layer,
  showLabels,
  selectedId,
  onSelect,
  sidebarOpen,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const rendererRef = useRef<L.Canvas | null>(null);
  const groupRef = useRef<L.LayerGroup | null>(null);
  const labelGroupRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<number, L.CircleMarker>>(new Map());
  const prevSelRef = useRef<number | null>(null);
  const didFitRef = useRef(false);

  const mappingRef = useRef(mapping);
  mappingRef.current = mapping;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const radius = Math.max(2, 5 * style.markerSize);
  const fillOpacity = style.markerOpacity / 100;

  /* ---------------------------------------------------------------- init */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const renderer = L.canvas({ padding: 0.5 });
    const map = L.map(containerRef.current, {
      center: [16.8661, 96.1951],
      zoom: 11,
      zoomControl: false,
      attributionControl: false,
      renderer,
      preferCanvas: true,
      zoomAnimation: true,
      markerZoomAnimation: false,
    });

    rendererRef.current = renderer;
    groupRef.current = L.layerGroup().addTo(map);
    labelGroupRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  /* -------------------------------------------------- sidebar resize */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const t = setTimeout(() => map.invalidateSize(), 320);
    return () => clearTimeout(t);
  }, [sidebarOpen]);

  /* ------------------------------------------------------------ basemap */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const cfg = BASEMAP_BY_ID[layer] ?? BASEMAP_BY_ID.light;
    if (tileRef.current) map.removeLayer(tileRef.current);
    tileRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      subdomains: [...cfg.subdomains],
      maxZoom: cfg.maxZoom,
      keepBuffer: 2,
      updateWhenIdle: false,
      updateWhenZooming: false,
    }).addTo(map);
    tileRef.current.setZIndex(0);
  }, [layer]);

  /* ------------------------------------------------------------- points */
  useEffect(() => {
    const group = groupRef.current;
    const map = mapRef.current;
    if (!group || !map) return;

    group.clearLayers();
    markersRef.current.clear();
    prevSelRef.current = null;

    if (!points.length) {
      didFitRef.current = false;
      return;
    }

    const heavy = points.length > LABEL_LIMIT;
    const buf: L.CircleMarker[] = new Array(points.length);

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const m = L.circleMarker([p.lat, p.lon], {
        renderer: rendererRef.current!,
        radius,
        color: p.color,
        weight: 1,
        opacity: fillOpacity,
        fillColor: p.color,
        fillOpacity,
        bubblingMouseEvents: false,
        interactive: true,
      });

      if (heavy) {
        m.on("click", () => {
          if (!m.getPopup()) m.bindPopup(popupHtml(p, mappingRef.current), { maxWidth: 320, className: "pg-popup" });
          m.openPopup();
          onSelectRef.current(p.id);
        });
      } else {
        m.bindPopup(popupHtml(p, mappingRef.current), {
          className: "pg-popup",
          maxWidth: 340,
          minWidth: 200,
          maxHeight: 300,
          autoPan: true,
          autoPanPadding: [24, 24],
          closeButton: true,
        });
        if (p.name) m.bindTooltip(p.name, { direction: "top", className: "pg-hover-label", opacity: 1 });
        m.on("click", () => onSelectRef.current(p.id));
      }

      markersRef.current.set(p.id, m);
      buf[i] = m;
    }

    L.layerGroup(buf).addTo(group);

    if (!didFitRef.current) {
      let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
      for (const p of points) {
        if (p.lat < minLat) minLat = p.lat;
        if (p.lat > maxLat) maxLat = p.lat;
        if (p.lon < minLon) minLon = p.lon;
        if (p.lon > maxLon) maxLon = p.lon;
      }
      map.fitBounds(
        L.latLngBounds([minLat, minLon], [maxLat, maxLon]),
        { padding: [60, 60], maxZoom: 15, animate: false },
      );
      didFitRef.current = true;
    }
  }, [points, radius, fillOpacity]);

  /* ------------------------------------------------------------- labels */
  useEffect(() => {
    const lg = labelGroupRef.current;
    const map = mapRef.current;
    if (!lg || !map) return;
    lg.clearLayers();
    if (!showLabels || !points.length || points.length > LABEL_LIMIT) return;

    const off: L.PointExpression = [0, -radius - 3];
    const buf: L.Marker[] = [];
    for (const p of points) {
      if (!p.name) continue;
      const t = L.marker([p.lat, p.lon], {
        icon: L.divIcon({ className: "pg-label-wrap", html: "", iconSize: [0, 0] }),
        interactive: false,
        keyboard: false,
      });
      t.bindTooltip(p.name, { permanent: true, direction: "top", offset: off, className: "pg-label" });
      buf.push(t);
    }
    L.layerGroup(buf).addTo(lg);
  }, [showLabels, points, radius]);

  /* ---------------------------------------------------------- selection */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const prev = prevSelRef.current;
    if (prev !== null && prev !== selectedId) {
      const pm = markersRef.current.get(prev);
      if (pm) pm.setStyle({ color: pm.options.fillColor, weight: 1, radius });
    }
    prevSelRef.current = selectedId;

    if (selectedId === null) return;
    const m = markersRef.current.get(selectedId);
    if (!m) return;
    m.setStyle({ radius: radius * 1.6, opacity: 1, fillOpacity: 1 });
    m.bringToFront();
    map.flyTo(m.getLatLng(), Math.max(map.getZoom(), 14), { duration: 0.4 });
    m.openPopup();
  }, [selectedId, radius]);

  // Expose map instance for toolbar actions
  useEffect(() => {
    (window as any).__pfcMap = {
      getMap: () => mapRef.current,
    };
    return () => {
      delete (window as any).__pfcMap;
    };
  }, []);

  return <div ref={containerRef} id="map" />;
}
