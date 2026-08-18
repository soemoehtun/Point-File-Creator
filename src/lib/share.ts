/**
 * Share / Save / Load project state.
 *
 * Two modes:
 *   1. .pfc file  — JSON with full dataset + config, gzipped. Works for any size.
 *   2. URL hash   — base64-encoded config (no data) for sharing just the design.
 */

import type { ColumnMapping, Dataset, StyleConfig, MapLayer } from "@/types";

export interface ProjectState {
  version: 1;
  dataset: Dataset | null;
  mapping: ColumnMapping;
  style: StyleConfig;
  mapLayer: MapLayer;
  showLegend: boolean;
  showSiteLabels: boolean;
  drawn: boolean;
}



/* ---------------------------------------------------------------- file */

/** Save the full project (data + config) as a downloadable .pfc.json file. */
export function saveProject(state: ProjectState, filename?: string) {
  const json = JSON.stringify(state);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `${state.dataset?.fileName?.replace(/\.[^.]+$/, "") ?? "project"}.pfc.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Load a .pfc.json file and return the project state. */
export async function loadProject(file: File): Promise<ProjectState> {
  const text = await file.text();
  const state = JSON.parse(text) as ProjectState;
  if (!state.version || state.version !== 1) {
    throw new Error("Unrecognized project file format.");
  }
  return state;
}

/* ---------------------------------------------------------------- URL hash */

/** Encode config (without data) into a URL-safe base64 hash. */
export function encodeConfigToHash(state: Omit<ProjectState, "dataset" | "drawn">): string {
  const json = JSON.stringify(state);
  return "#cfg=" + btoa(unescape(encodeURIComponent(json)));
}

/** Decode config from a URL hash. Returns null if no config found. */
export function decodeConfigFromHash(hash: string): Omit<ProjectState, "dataset" | "drawn"> | null {
  if (!hash.startsWith("#cfg=")) return null;
  try {
    const json = decodeURIComponent(escape(atob(hash.slice(5))));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Export the current project as a fully self-contained .html file.
 *
 * It fetches the currently-loaded app's own source (so it stays in sync with
 * the exact build being used), then inlines the saved project as JSON. When
 * someone opens the exported file, the app boots and automatically loads the
 * embedded project (data + all configuration) and draws it on the map.
 */
export async function exportStandaloneHtml(state: ProjectState): Promise<void> {
  // 1. Grab this running app's source. In development (no single-file build)
  //    we fall back to a small loader that points at the live URL.
  let source: string;
  try {
    const res = await fetch(window.location.href);
    source = await res.text();
  } catch {
    source = "";
  }

  // 2. Build the startup bootstrap that seeds the project before React mounts.
  const projectJson = JSON.stringify(state).replace(/</g, "\\u003c");

  const bootstrap = `<script>
  window.__PFC_PROJECT__ = ${projectJson};
<\/script>` + `\n`;

  // 3. If we couldn't read our own source (e.g. dev server with no single-file
  //    build), produce a lightweight viewer built on Leaflet from a CDN.
  if (!source) {
    const standalone = buildLightweightViewer(state);
    downloadBlob(`${state.dataset?.fileName?.replace(/\.[^.]+$/, "") ?? "project"}.html`, standalone);
    return;
  }

  // 4. Inject the bootstrap right before the closing </body> / first script.
  const injected = source.replace(/<script[\s\S]*?type="module"[\s\S]*?<\/script>/, (m) => bootstrap + m);

  const filename = `${state.dataset?.fileName?.replace(/\.[^.]+$/, "") ?? "project"}.html`;
  downloadBlob(filename, injected);
}

function downloadBlob(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Minimal standalone Leaflet viewer (used when the app bundle can't be inlined). */
function buildLightweightViewer(state: ProjectState): string {
  const ds = state.dataset!;
  const lat = state.mapping.lat;
  const lon = state.mapping.lon;
  const name = state.mapping.name;
  const category = state.mapping.category;

  const points = ds.rows
    .map((row, i) => {
      const la = parseFloat(String(row[lat] ?? ""));
      const lo = parseFloat(String(row[lon] ?? ""));
      if (Number.isNaN(la) || Number.isNaN(lo)) return null;
      const cat = category ? String(row[category] ?? "") : "All";
      const color =
        state.style.mode === "category"
          ? state.style.categoryColors[cat] ?? "#ef4444"
          : state.style.singleColor;
      const nm = name ? String(row[name] ?? "") : `Point ${i + 1}`;
      return { la, lo, cat, color, nm };
    })
    .filter(Boolean) as { la: number; lo: number; cat: string; color: string; nm: string }[];

  const json = JSON.stringify(points);
  const base = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(ds.fileName || "Project")}</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html,body{margin:0;height:100%;font-family:Inter,system-ui,sans-serif}
  #map{position:absolute;inset:0}
  .legend{position:absolute;bottom:24px;left:24px;background:rgba(255,255,255,.95);border:1px solid #e2e8f0;border-radius:8px;padding:14px;box-shadow:0 4px 16px rgba(0,0,0,.1);z-index:1000;min-width:180px;max-width:320px}
  .legend h3{margin:0 0 10px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#64748b}
  .legend .row{display:flex;align-items:center;gap:8px;padding:3px 0;font-size:12px;color:#334155}
  .legend .dot{width:11px;height:11px;border-radius:50%;flex-shrink:0}
</style>
</head>
<body>
<div id="map"></div>
<div class="legend" id="legend"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var points = ${json};
  var map = L.map('map').setView([points[0]?.la || 20, points[0]?.lo || 96], 7);
  L.tileLayer(${JSON.stringify(base)}, {maxZoom:19}).addTo(map);
  var colors = {};
  points.forEach(function(p){
    L.circleMarker([p.la,p.lo], {radius:5, color:p.color, weight:1, fillColor:p.color, fillOpacity:1})
      .addTo(map).bindTooltip(p.nm, {className:'label'});
    colors[p.cat] = p.color;
  });
  if (points.length) {
    var b = L.latLngBounds(points.map(function(p){return [p.la,p.lo]}));
    map.fitBounds(b, {padding:[50,50]});
  }
  var legend = document.getElementById('legend');
  var html = '<h3>${escapeHtml(category || "Legend")}</h3>';
  Object.keys(colors).forEach(function(c){
    html += '<div class="row"><span class="dot" style="background:'+colors[c]+'"></span>'+c+'</div>';
  });
  legend.innerHTML = html;
</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
}

/** Copy text to clipboard with fallback. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers / non-HTTPS
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }
}
