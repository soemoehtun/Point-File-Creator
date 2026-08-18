export type Cell = string | number | null;
export type Row = Record<string, Cell>;

export interface Dataset {
  fileName: string;
  columns: string[];
  rows: Row[];
}

export interface ColumnMapping {
  lat: string;
  lon: string;
  name: string;
  category: string;
  popup: string[];
}

export type ColorMode = "single" | "category";

export interface StyleConfig {
  mode: ColorMode;
  singleColor: string;
  /** On-map vector dot size / opacity. */
  markerSize: number;
  markerOpacity: number;
  categoryColors: Record<string, string>;
  /** KMZ export only — never affects the web map. */
  /** "map" = export with the current map appearance; "custom" = pick icons. */
  exportAppearance: "map" | "custom";
  exportMode: ColorMode;
  exportIconUrl: string;
  exportIconScale: number;
  exportIconOpacity: number;
  /** Per-category KMZ icon overrides. */
  exportCategoryIcons: Record<string, string>;
  /** KMZ icon colours. Empty string = inherit the map colour. */
  exportIconColor: string;
  exportCategoryColors: Record<string, string>;
}

export interface MapPoint {
  id: number;
  lat: number;
  lon: number;
  name: string;
  category: string;
  color: string;
  row: Row;
}

export type MapLayer = "light" | "street" | "satellite" | "topo";

/** Basemap set ported from the polygon generator's BASEMAPS constant. */
export const BASEMAPS = [
  {
    id: "light",
    label: "Map",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    thumb: "https://a.basemaps.cartocdn.com/light_all/12/3143/1852.png",
    subdomains: ["a", "b", "c", "d"],
    maxZoom: 20,
    bg: "#f8fafc",
    accent: "#cbd5e1",
  },
  {
    id: "street",
    label: "Street",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    thumb: "https://tile.openstreetmap.org/12/3143/1852.png",
    subdomains: ["a", "b", "c"],
    maxZoom: 19,
    bg: "#f0eadb",
    accent: "#fff",
  },
  {
    id: "satellite",
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    thumb: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/12/1852/3143",
    subdomains: [],
    maxZoom: 19,
    bg: "#1a3a2a",
    accent: "#468058",
  },
  {
    id: "topo",
    label: "Topo",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors, SRTM · Map style: &copy; OpenTopoMap",
    thumb: "https://a.tile.opentopomap.org/12/3143/1852.png",
    subdomains: ["a", "b", "c"],
    maxZoom: 17,
    bg: "#e8dcc8",
    accent: "#a07c58",
  },
] as const;

/** Shared palette — same values as the polygon generator's colors.ts */
export const PALETTE = [
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#0ea5e9",
  "#22c55e",
  "#f43f5e",
  "#a855f7",
];

export const SOURCE_COLOR = "#22c55e";
export const NEIGHBOUR_COLOR = "#ef4444";
