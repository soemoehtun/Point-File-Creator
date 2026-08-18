import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnMapping, Dataset, MapPoint, StyleConfig, MapLayer } from "@/types";
import { detectColumns, parseFile, toNumber, uniqueValues } from "@/lib/parse";
import { exportKmz } from "@/lib/export";
import { paletteColor } from "@/lib/icons";
import MapView from "@/components/MapView";
import { PALETTE, BASEMAPS } from "@/types";
import IconPickerModal from "@/components/IconPickerModal";
import ExportPanel from "@/components/ExportPanel";
import { VECTOR_CIRCLE } from "@/lib/kmlIcons";
import { decodeConfigFromHash, exportStandaloneHtml } from "@/lib/share";
import type { ProjectState } from "@/lib/share";

/* ------------------------------------------------------------------ icons */
const I = {
  Menu: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),

  Upload: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  Columns: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  ),
  Style: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" />
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
  ),
  Filter: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  Search: (p: { size?: number }) => (
    <svg width={p.size ?? 14} height={p.size ?? 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  X: (p: { size?: number }) => (
    <svg width={p.size ?? 14} height={p.size ?? 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
  Export: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Code: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  Bolt: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  Trash: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  Sheet: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="9" x2="9" y2="21" />
    </svg>
  ),
  Pin: (p: { size?: number }) => (
    <svg width={p.size ?? 30} height={p.size ?? 30} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M12 21s-7-6.3-7-11a7 7 0 1 1 14 0c0 4.7-7 11-7 11Z" /><circle cx="12" cy="10" r="2.6" />
    </svg>
  ),
  Cloud: () => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4m0 0L8 8m4-4 4 4" /><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  ),
};

/* ------------------------------------------------------------------ setup */
type Tab = "upload" | "columns" | "style" | "filter";

const TABS: { id: Tab; label: string; Icon: () => React.ReactElement }[] = [
  { id: "upload", label: "Source", Icon: I.Upload },
  { id: "columns", label: "Fields", Icon: I.Columns },
  { id: "style", label: "Style", Icon: I.Style },
  { id: "filter", label: "Export", Icon: I.Filter },
];

const DEFAULT_STYLE: StyleConfig = {
  mode: "single",
  singleColor: "#13a38f",
  markerSize: 1.0,
  markerOpacity: 100,
  categoryColors: {},
  exportAppearance: "map",
  exportMode: "single",
  exportIconUrl: VECTOR_CIRCLE,
  exportIconScale: 1.0,
  exportIconOpacity: 1,
  exportCategoryIcons: {},
  exportIconColor: "#ff0000",
  exportCategoryColors: {},
};

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="check-row">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

/* ------------------------------------------------------------------- app */
export default function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({ lat: "", lon: "", name: "", category: "", popup: [] });
  const [style, setStyle] = useState<StyleConfig>(DEFAULT_STYLE);
  const [tab, setTab] = useState<Tab>("upload");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCol, setFilterCol] = useState("");
  const [filterVals, setFilterVals] = useState<string[]>([]);

  const [showOnMap, setShowOnMap] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawProgress, setDrawProgress] = useState(0);

  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window === "undefined" ? true : window.innerWidth > 860,
  );
  const [showLegend, setShowLegend] = useState(true);
  const [showSiteLabels, setShowSiteLabels] = useState(false);
  const [mapLayer, setMapLayer] = useState<MapLayer>("light");
  const [showIconPicker, setShowIconPicker] = useState(false);

  const [editingIconCat, setEditingIconCat] = useState<string | null>(null);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [exportingHtml, setExportingHtml] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const columns = dataset?.columns ?? [];

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }, []);

  /* ---------------------------------------------------------------- data */
  const loadDataset = useCallback((ds: Dataset) => {
    const detected = detectColumns(ds);
    setDataset(ds);
    setMapping(detected);
    setShowOnMap(false);
    setDrawProgress(0);
    setSelectedId(null);
    setSearchTerm("");
    setFilterCol("");
    setFilterVals([]);
    setTab("columns");
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setLoading(true);
      setError(null);
      try {
        const ds = await parseFile(file);
        if (!ds.rows.length) throw new Error("The file contains no data rows.");
        loadDataset(ds);
        flash(`Loaded ${ds.rows.length.toLocaleString()} rows from ${ds.fileName}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not read that file.");
      } finally {
        setLoading(false);
      }
    },
    [loadDataset, flash],
  );

  const uniqueCategoryVals = useMemo(
    () => (dataset && mapping.category ? uniqueValues(dataset.rows, mapping.category) : []),
    [dataset, mapping.category],
  );

  const getCatColor = useCallback(
    (val: string) => paletteColor(Math.max(0, uniqueCategoryVals.indexOf(val))),
    [uniqueCategoryVals],
  );

  const allPoints = useMemo(() => {
    if (!dataset || !mapping.lat || !mapping.lon) return [] as MapPoint[];
    const pts: MapPoint[] = [];
    dataset.rows.forEach((row, i) => {
      const lat = toNumber(row[mapping.lat]);
      const lon = toNumber(row[mapping.lon]);
      if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) return;
      const category = mapping.category ? String(row[mapping.category] ?? "").trim() || "(blank)" : "All";
      const color =
        style.mode === "category"
          ? style.categoryColors[category] ?? getCatColor(category)
          : style.singleColor;
      pts.push({
        id: i,
        lat,
        lon,
        name: mapping.name ? String(row[mapping.name] ?? "") : `Point ${i + 1}`,
        category,
        color,
        row,
      });
    });
    return pts;
  }, [dataset, mapping, style, getCatColor]);

  const filteredData = useMemo(() => {
    let pts = allPoints;
    if (filterCol && filterVals.length > 0) {
      pts = pts.filter((p) => filterVals.includes(String(p.row[filterCol] ?? "").trim() || "(blank)"));
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      pts = pts.filter(
        (p) => p.name.toLowerCase().includes(q) || Object.values(p.row).some((v) => String(v).toLowerCase().includes(q)),
      );
    }
    return pts;
  }, [allPoints, searchTerm, filterCol, filterVals]);

  const uniqueFilterVals = useMemo(
    () => (filterCol && dataset ? uniqueValues(dataset.rows, filterCol) : []),
    [filterCol, dataset],
  );

  const legendItems = useMemo(() => {
    if (style.mode === "category" && mapping.category) {
      const m = new Map<string, { color: string; count: number }>();
      for (const p of filteredData) {
        const e = m.get(p.category);
        if (e) e.count++;
        else m.set(p.category, { color: p.color, count: 1 });
      }
      return Array.from(m, ([label, v]) => ({ label, ...v })).sort((a, b) => b.count - a.count);
    }
    return [{ label: "All points", color: style.singleColor, count: filteredData.length }];
  }, [filteredData, style.mode, style.singleColor, mapping.category]);

  /* ------------------------------------------------------------- actions */
  const handleDraw = useCallback(() => {
    if (!mapping.lat || !mapping.lon || !dataset?.rows.length) return;
    setIsDrawing(true);
    setDrawProgress(0);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 8;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setIsDrawing(false);
        setShowOnMap(true);
        setSidebarOpen(false);
      }
      setDrawProgress(Math.min(progress, 100));
    }, 80);
  }, [mapping.lat, mapping.lon, dataset]);

  const exportKMZ = useCallback(async () => {
    if (!filteredData.length) return;
    const base = (dataset?.fileName ?? "points").replace(/\.[^.]+$/, "");
    await exportKmz({
      documentName: base,
      points: filteredData,
      mapping,
      style,
      showLabels: showSiteLabels,
      groupByCategory: style.mode === "category",
    });
    flash("KMZ exported");
  }, [filteredData, dataset, mapping, style, showSiteLabels, flash]);

  const doExportHtml = useCallback(() => {
    setExportingHtml(true);
    exportStandaloneHtml({
      version: 1,
      dataset,
      mapping,
      style,
      mapLayer,
      showLegend,
      showSiteLabels,
      drawn: showOnMap,
    })
      .then(() => flash("Standalone HTML downloaded"))
      .finally(() => setExportingHtml(false));
  }, [dataset, mapping, style, mapLayer, showLegend, showSiteLabels, showOnMap, flash]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "enter") { e.preventDefault(); handleDraw(); }
      else if (k === "e") { e.preventDefault(); setShowExportPanel(true); }
      else if (k === "l") { e.preventDefault(); setShowLegend((v) => !v); }
      else if (k === "b") { e.preventDefault(); setSidebarOpen((v) => !v); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleDraw]);

  useEffect(() => {
    const cfg = decodeConfigFromHash(window.location.hash);
    if (cfg) {
      setMapping(cfg.mapping);
      setStyle(cfg.style);
      setMapLayer(cfg.mapLayer);
      setShowLegend(cfg.showLegend);
      setShowSiteLabels(cfg.showSiteLabels);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const embedded = (window as any).__PFC_PROJECT__ as ProjectState | undefined;
    if (embedded) {
      if (embedded.dataset) setDataset(embedded.dataset);
      setMapping(embedded.mapping);
      setStyle(embedded.style);
      setMapLayer(embedded.mapLayer);
      setShowLegend(embedded.showLegend);
      setShowSiteLabels(embedded.showSiteLabels);
      if (embedded.drawn) setShowOnMap(true);
    }
  }, []);

  const canDraw = Boolean(mapping.lat && mapping.lon && dataset?.rows.length) && !isDrawing;



  const mapFields: { key: keyof ColumnMapping; label: string; req?: boolean; hint: string }[] = [
    { key: "lat", label: "Latitude", req: true, hint: "WGS84 · -90 to 90" },
    { key: "lon", label: "Longitude", req: true, hint: "WGS84 · -180 to 180" },
    { key: "name", label: "Site Name", hint: "marker label" },
  ];

  /* ---------------------------------------------------------------- view */
  return (
    <div className="app-shell">
      {/* ============================ header ============================ */}
      <header className="app-header">
        <div className="brand">
          <button
            className="mobile-menu"
            onClick={() => setSidebarOpen((v) => !v)}
            title="Toggle input panel"
            aria-label="Toggle input panel"
          >
            <I.Menu />
          </button>
          <div className="brand-name">Point File Creator</div>
        </div>

      </header>

      <div className="workspace">
        {sidebarOpen && <button className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close" />}

        {/* ============================ sidebar =========================== */}
        <aside className={`sidebar ${sidebarOpen ? "is-open" : "collapsed"}`}>
          <div className="sidebar-mobile-head">
            CONFIGURATION
            <button onClick={() => setSidebarOpen(false)}><I.X size={16} /></button>
          </div>

          <nav className="tabs">
            {TABS.map((t) => (
              <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
                <t.Icon />
                {t.label}
              </button>
            ))}
          </nav>

          <div className="sidebar-scroll">
            {/* ---------------------------------------------------- SOURCE */}
            {tab === "upload" && (
              <div className="panel-enter">
                <section className="sidebar-section intro-section">
                  <div className="section-kicker">Step 01</div>
                  <h1>Bring your coordinate data.</h1>
                  <p>Drop a CSV or Excel export. Everything is parsed in your browser — nothing is uploaded.</p>
                </section>

                <section className="sidebar-section border-top">
                  <div
                    className={`dropzone ${dragging ? "dragging" : ""}`}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleFile(f);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <I.Cloud />
                    <strong>{loading ? "Parsing file…" : "Drop file to upload"}</strong>
                    <span>CSV · XLSX · XLS · TXT</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls,.txt"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                        e.target.value = "";
                      }}
                    />
                  </div>

                  {error && <div className="error-note">{error}</div>}

                  {dataset && (
                    <>
                      <div style={{ marginTop: 18 }} className="source-summary">
                        <div className="source-icon sheet"><I.Sheet /></div>
                        <div>
                          <strong>{dataset.fileName}</strong>
                          <span>{dataset.rows.length.toLocaleString()} rows · {columns.length} columns</span>
                        </div>
                      </div>

                      <div className="source-actions">
                        <button onClick={() => fileInputRef.current?.click()}>Replace</button>
                        <button
                          className="danger"
                          onClick={() => {
                            setDataset(null);
                            setMapping({ lat: "", lon: "", name: "", category: "", popup: [] });
                            setShowOnMap(false);
                          }}
                        >
                          Remove
                        </button>
                      </div>

                      <div className="preview-wrap">
                        <table className="preview-table">
                          <thead>
                            <tr>{columns.slice(0, 5).map((c) => <th key={c}>{c}</th>)}</tr>
                          </thead>
                          <tbody>
                            {dataset.rows.slice(0, 12).map((r, i) => (
                              <tr key={i}>
                                {columns.slice(0, 5).map((c) => (
                                  <td key={c} title={String(r[c] ?? "")}>{String(r[c] ?? "")}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </section>
              </div>
            )}

            {/* ---------------------------------------------------- FIELDS */}
            {tab === "columns" && (
              <div className="panel-enter">
                <section className="sidebar-section intro-section compact">
                  <div className="section-kicker">Step 02</div>
                  <h1>Map your columns.</h1>
                  <p>Tell us which fields hold the coordinates, then pick what shows inside marker popups.</p>
                </section>

                <section className="sidebar-section border-top">
                  {!columns.length && <p className="field-help">Upload a file first to map its columns.</p>}

                  {mapFields.map((f) => (
                    <div className="mapping-field" key={f.key}>
                      <div className="mapping-label">
                        <label>{f.label}{f.req && <b>*</b>}</label>
                        <span>{f.hint}</span>
                      </div>
                      <select
                        className="field-control"
                        value={mapping[f.key] as string}
                        onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}
                        disabled={!columns.length}
                      >
                        <option value="">— Select column —</option>
                        {columns.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  ))}

                  {mapping.lat && mapping.lon && (
                    <p className="field-help">
                      <code>{allPoints.length.toLocaleString()}</code> valid coordinates detected
                      {dataset && allPoints.length < dataset.rows.length &&
                        ` · ${(dataset.rows.length - allPoints.length).toLocaleString()} skipped`}
                    </p>
                  )}
                </section>

                <section className="sidebar-section border-top">
                  <div className="mapping-label">
                    <label>Popup fields</label>
                    <span>{mapping.popup.length} selected</span>
                  </div>
                  <div className="source-actions" style={{ marginTop: 4, marginBottom: 12 }}>
                    <button onClick={() => setMapping({ ...mapping, popup: [...columns] })}>Select all</button>
                    <button onClick={() => setMapping({ ...mapping, popup: [] })}>Clear</button>
                  </div>
                  <div style={{ maxHeight: 210, overflowY: "auto", border: "1px solid #dfe7e5", padding: 9 }}>
                    {columns.map((h) => (
                      <label key={h} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          style={{ accentColor: "#0d3437", cursor: "pointer" }}
                          checked={mapping.popup.includes(h)}
                          onChange={(e) =>
                            setMapping({
                              ...mapping,
                              popup: e.target.checked ? [...mapping.popup, h] : mapping.popup.filter((c) => c !== h),
                            })
                          }
                        />
                        <span style={{ fontSize: 10, color: "#35534f" }}>{h}</span>
                      </label>
                    ))}
                    {!columns.length && <div style={{ fontSize: 10, color: "#9daba8" }}>No columns yet.</div>}
                  </div>
                </section>
              </div>
            )}

            {/* ----------------------------------------------------- STYLE */}
            {tab === "style" && (
              <div className="panel-enter">
                <section className="sidebar-section intro-section compact">
                  <div className="section-kicker">Step 03</div>
                  <h1>Style the map.</h1>
                  <p>Colour every point the same, or split them by a category column.</p>
                </section>

                <section className="sidebar-section border-top">
                  <span className="field-label">Color Mode</span>
                  <div className="mode-selector" style={{ marginBottom: 0 }}>
                    <div
                      className={`mode-option ${style.mode === "single" ? "active" : ""}`}
                      onClick={() => setStyle((s) => ({ ...s, mode: "single" }))}
                    >
                      Single Color
                    </div>
                    <div
                      className={`mode-option ${style.mode === "category" ? "active" : ""}`}
                      onClick={() => setStyle((s) => ({ ...s, mode: "category" }))}
                    >
                      Categorized
                    </div>
                  </div>

                  {style.mode === "single" && (
                    <div style={{ marginTop: 16 }}>
                      <span className="field-label">Point colour</span>
                      <div className="sw-row">
                        {PALETTE.map((c) => (
                          <button
                            key={c}
                            className={`sw ${style.singleColor === c ? "active" : ""}`}
                            style={{ background: c }}
                            onClick={() => setStyle((s) => ({ ...s, singleColor: c }))}
                            title={c}
                          />
                        ))}
                        <label className="sw sw-custom" title="Custom colour">
                          <input
                            type="color"
                            value={style.singleColor}
                            onChange={(e) => setStyle((s) => ({ ...s, singleColor: e.target.value }))}
                          />
                          <span style={{ background: style.singleColor }} />
                        </label>
                      </div>
                    </div>
                  )}

                  {style.mode === "category" && (
                    <div style={{ marginTop: 16 }}>
                      <span className="field-label">Category column</span>
                      <select
                        className="field-control"
                        value={mapping.category}
                        onChange={(e) => {
                          setMapping({ ...mapping, category: e.target.value });
                          setStyle((s) => ({ ...s, categoryColors: {} }));
                        }}
                      >
                        <option value="">— Select column —</option>
                        {columns.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>

                      {mapping.category && uniqueCategoryVals.length > 0 && (
                        <div style={{ marginTop: 14 }}>
                          <div className="mapping-label">
                            <label>Colour per value</label>
                            <span>{uniqueCategoryVals.length} groups</span>
                          </div>
                          <div style={{ maxHeight: 200, overflowY: "auto" }}>
                            {uniqueCategoryVals.map((val) => {
                              const c = style.categoryColors[val] ?? getCatColor(val);
                              return (
                                <div key={val} className="cat-row">
                                  <span className="cat-name" title={val}>{val}</span>
                                  <label className="cat-swatch">
                                    <input
                                      type="color"
                                      value={c}
                                      onChange={(e) =>
                                        setStyle((s) => ({
                                          ...s,
                                          categoryColors: { ...s.categoryColors, [val]: e.target.value },
                                        }))
                                      }
                                    />
                                    <span style={{ background: c }} />
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                          <button className="cat-reset" onClick={() => setStyle((s) => ({ ...s, categoryColors: {} }))}>
                            Reset colours
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                <section className="sidebar-section border-top">
                  <div className="range-setting" style={{ marginTop: 0 }}>
                    <div>Marker scale <span>{style.markerSize.toFixed(1)}×</span></div>
                    <input
                      type="range" min="0.1" max="3" step="0.1"
                      value={style.markerSize}
                      onChange={(e) => setStyle((s) => ({ ...s, markerSize: parseFloat(e.target.value) }))}
                    />
                  </div>

                  <div className="range-setting">
                    <div>Marker opacity <span>{style.markerOpacity}%</span></div>
                    <input
                      type="range" min="10" max="100"
                      value={style.markerOpacity}
                      onChange={(e) => setStyle((s) => ({ ...s, markerOpacity: parseInt(e.target.value) }))}
                    />
                  </div>

                  <Toggle label="Site labels" hint="Always show names beside points" checked={showSiteLabels} onChange={setShowSiteLabels} />
                  <Toggle label="Map legend" hint="Category swatches at the bottom" checked={showLegend} onChange={setShowLegend} />
                </section>
              </div>
            )}

            {tab === "filter" && (
              <div className="panel-enter">
                <section className="sidebar-section intro-section compact">
                  <div className="section-kicker">Step 04</div>
                  <h1>Draw &amp; export.</h1>
                  <p>Render your mapped points, then share them as HTML or export KMZ for Google Earth.</p>
                </section>

                <section className="sidebar-section border-top">
                  <button className="connect-button" onClick={handleDraw} disabled={!canDraw}>
                    <I.Bolt />
                    {isDrawing ? `Drawing ${Math.round(drawProgress)}%` : "Calculate & Draw"}
                  </button>

                  {isDrawing && (
                    <div className="progress-row">
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${drawProgress}%` }} />
                      </div>
                      <span className="progress-pct">{Math.round(drawProgress)}%</span>
                    </div>
                  )}

                  <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                    <button
                      className="action-button action-red"
                      onClick={doExportHtml}
                      disabled={!dataset || exportingHtml}
                    >
                      <I.Code /> {exportingHtml ? "Generating…" : "Share HTML"}
                    </button>

                    <button
                      className="action-button action-blue"
                      onClick={() => setShowExportPanel(true)}
                      disabled={!mapping.lat || !mapping.lon}
                    >
                      <I.Export /> Export KMZ
                    </button>
                  </div>
                </section>
              </div>
            )}

          </div>
        </aside>

        {/* ========================== map workspace ======================== */}
        <main className="map-workspace">
          <div className="map-toolbar">
            <div className="map-search">
              <I.Search />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search site name or any field…"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} aria-label="Clear"><I.X size={13} /></button>
              )}
            </div>

            <div className="toolbar-divider" />

            <div className="status-filter">
              <select value={filterCol} onChange={(e) => { setFilterCol(e.target.value); setFilterVals([]); }}>
                <option value="">All columns</option>
                {columns.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {filterCol && (
                <select
                  value={filterVals.length === 1 ? filterVals[0] : ""}
                  onChange={(e) => setFilterVals(e.target.value ? [e.target.value] : [])}
                >
                  <option value="">Any value</option>
                  {uniqueFilterVals.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              )}
            </div>

            <div className="toolbar-count">
              <strong>{showOnMap ? filteredData.length.toLocaleString() : 0}</strong> / {allPoints.length.toLocaleString()} points
            </div>
          </div>

          <div className="map-frame">
            <MapView
              points={showOnMap ? filteredData : []}
              style={style}
              mapping={mapping}
              layer={mapLayer}
              showLabels={showSiteLabels}
              selectedId={selectedId}
              onSelect={setSelectedId}
              sidebarOpen={sidebarOpen}
            />

            <div className="map-layer-control">
              {BASEMAPS.map((b) => (
                <button
                  key={b.id}
                  className={mapLayer === b.id ? "active" : ""}
                  onClick={() => setMapLayer(b.id as MapLayer)}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {showOnMap && showLegend && filteredData.length > 0 && (
              <div className="map-footer-info">
                <div className="legend-inline">
                  <div className="legend-title">
                    {style.mode === "category" && mapping.category
                      ? mapping.category
                      : filterCol
                        ? filterCol
                        : "Legend"}
                  </div>
                  <div className="legend-list">
                    {legendItems.map((it) => (
                      <span key={it.label}>
                        <i style={{ background: it.color }} />
                        {it.label} <b>{it.count.toLocaleString()}</b>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}



            {showExportPanel && (
              <ExportPanel
                style={style}
                setStyle={setStyle}
                categoryCol={mapping.category}
                categories={uniqueCategoryVals}
                getCatColor={getCatColor}
                count={filteredData.length}
                onPickIcon={(cat) => { setEditingIconCat(cat); setShowIconPicker(true); }}
                onClose={() => setShowExportPanel(false)}
                onExport={() => { setShowExportPanel(false); void exportKMZ(); }}
              />
            )}
          </div>
        </main>
      </div>

      <IconPickerModal
        isOpen={showIconPicker}
        onClose={() => { setShowIconPicker(false); setEditingIconCat(null); }}
        title={editingIconCat ? `KMZ icon — ${editingIconCat}` : "KMZ export icon"}
        current={{
          url: editingIconCat
            ? style.exportCategoryIcons[editingIconCat] ?? style.exportIconUrl
            : style.exportIconUrl,
          color: editingIconCat
            ? style.exportCategoryColors[editingIconCat] ??
              style.categoryColors[editingIconCat] ??
              getCatColor(editingIconCat)
            : style.exportIconColor || style.singleColor,
          scale: style.exportIconScale,
          opacity: style.exportIconOpacity,
        }}
        onSelect={(ic) =>
          setStyle((s) =>
            editingIconCat
              ? {
                  ...s,
                  exportCategoryIcons: { ...s.exportCategoryIcons, [editingIconCat]: ic.url },
                  exportCategoryColors: { ...s.exportCategoryColors, [editingIconCat]: ic.color },
                  exportIconScale: ic.scale,
                  exportIconOpacity: ic.opacity,
                }
              : {
                  ...s,
                  exportIconUrl: ic.url,
                  exportIconColor: ic.color,
                  exportIconScale: ic.scale,
                  exportIconOpacity: ic.opacity,
                },
          )
        }
      />

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
