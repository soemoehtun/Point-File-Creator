import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { Dataset, Row, Cell, ColumnMapping } from "@/types";

const LAT_HINTS = ["latitude", "lat", "y", "lat_dd", "site_lat", "ycoord", "y_coord", "northing"];
const LON_HINTS = [
  "longitude",
  "long",
  "lon",
  "lng",
  "x",
  "lon_dd",
  "site_lon",
  "xcoord",
  "x_coord",
  "easting",
];
const NAME_HINTS = ["site name", "sitename", "site_name", "name", "site", "site id", "site_id", "id", "label", "title"];
const CAT_HINTS = [
  "category",
  "type",
  "class",
  "status",
  "group",
  "region",
  "operator",
  "band",
  "layer",
  "zone",
];

const norm = (s: string) => s.toLowerCase().replace(/[\s._-]+/g, "");

function pick(columns: string[], hints: string[]): string {
  const normalized = columns.map((c) => ({ raw: c, n: norm(c) }));
  for (const h of hints) {
    const hn = norm(h);
    const exact = normalized.find((c) => c.n === hn);
    if (exact) return exact.raw;
  }
  for (const h of hints) {
    const hn = norm(h);
    const partial = normalized.find((c) => c.n.includes(hn));
    if (partial) return partial.raw;
  }
  return "";
}

export function toNumber(value: Cell): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = String(value).trim().replace(/,/g, "").replace(/[°\s]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function detectColumns(dataset: Dataset): ColumnMapping {
  const cols = dataset.columns;
  let lat = pick(cols, LAT_HINTS);
  let lon = pick(cols, LON_HINTS);

  // Validate numerically
  const sample = dataset.rows.slice(0, 40);
  const scoreAs = (col: string, max: number) => {
    if (!col) return 0;
    let ok = 0;
    let seen = 0;
    for (const r of sample) {
      const n = toNumber(r[col]);
      if (n === null) continue;
      seen++;
      if (Math.abs(n) <= max) ok++;
    }
    return seen === 0 ? 0 : ok / seen;
  };
  if (lat && lon && scoreAs(lat, 90) < 0.6 && scoreAs(lon, 90) > 0.6) {
    const t = lat;
    lat = lon;
    lon = t;
  }

  const nameCandidates = NAME_HINTS.filter((h) => norm(h) !== norm(lat) && norm(h) !== norm(lon));
  let name = pick(
    cols.filter((c) => c !== lat && c !== lon),
    nameCandidates,
  );
  if (!name) name = cols.filter((c) => c !== lat && c !== lon)[0] ?? "";

  const category = pick(
    cols.filter((c) => c !== lat && c !== lon && c !== name),
    CAT_HINTS,
  );

  const popup = cols.filter((c) => c !== lat && c !== lon).slice(0, 6);
  return { lat, lon, name, category, popup };
}

function cleanRows(raw: Record<string, unknown>[], columns: string[]): Row[] {
  return raw
    .map((r) => {
      const out: Row = {};
      for (const c of columns) {
        const v = r[c];
        out[c] = v === undefined || v === null || v === "" ? "" : (v as Cell);
      }
      return out;
    })
    .filter((r) => columns.some((c) => String(r[c] ?? "").trim() !== ""));
}

function parseCsv(file: File): Promise<Dataset> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      dynamicTyping: false,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const columns = (results.meta.fields ?? []).filter((f) => f && f.trim() !== "");
        if (!columns.length) {
          reject(new Error("No columns found in file."));
          return;
        }
        resolve({ fileName: file.name, columns, rows: cleanRows(results.data, columns) });
      },
      error: (err: Error) => reject(err),
    });
  });
}

async function parseExcel(file: File): Promise<Dataset> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "" });
  if (!matrix.length) throw new Error("The first worksheet is empty.");

  const headerRow = (matrix[0] as unknown[]).map((h, i) =>
    String(h ?? "").trim() === "" ? `Column ${i + 1}` : String(h).trim(),
  );
  const rows: Row[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const arr = matrix[i] as unknown[];
    const row: Row = {};
    headerRow.forEach((h, idx) => {
      const v = arr?.[idx];
      row[h] = v === undefined || v === null ? "" : (v as Cell);
    });
    if (headerRow.some((h) => String(row[h] ?? "").trim() !== "")) rows.push(row);
  }
  return { fileName: file.name, columns: headerRow, rows };
}

export async function parseFile(file: File): Promise<Dataset> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "csv" || ext === "txt" || file.type === "text/csv") return parseCsv(file);
  if (["xlsx", "xls", "xlsm", "ods"].includes(ext)) return parseExcel(file);
  throw new Error(`Unsupported file type ".${ext}". Please use CSV, XLSX or XLS.`);
}

export function uniqueValues(rows: Row[], column: string): string[] {
  if (!column) return [];
  const set = new Set<string>();
  for (const r of rows) {
    const v = String(r[column] ?? "").trim();
    set.add(v === "" ? "(blank)" : v);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
