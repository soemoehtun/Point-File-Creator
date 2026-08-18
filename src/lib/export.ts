import JSZip from "jszip";
import type { ColumnMapping, MapPoint, StyleConfig } from "@/types";
import { VECTOR_CIRCLE, NO_ICON } from "./kmlIcons";

function clampN(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** #rrggbb + alpha (0..1) -> KML aabbggrr */
export function hexToKmlColor(hex: string, opacity = 1): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const rgb = m ? m[1] : "ff0000";
  const a = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${a}${rgb.slice(4, 6)}${rgb.slice(2, 4)}${rgb.slice(0, 2)}`.toLowerCase();
}

/** Short stable token from an icon href, for building unique <Style> ids. */
function hashHref(href: string): string {
  let h = 0;
  for (let i = 0; i < href.length; i++) h = (h * 31 + href.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

/** Flat circle PNG generated locally so a vector-circle export needs no network. */
function circlePng(): string {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.beginPath();
  g.arc(32, 32, 30, 0, Math.PI * 2);
  g.fillStyle = "#ffffff";
  g.fill();
  return c.toDataURL("image/png").split(",")[1];
}

function descriptionHtml(point: MapPoint, mapping: ColumnMapping): string {
  const rows = mapping.popup
    .map((c) => {
      const v = String(point.row[c] ?? "");
      return `<tr><td style="padding:3px 10px 3px 0;color:#555;font-weight:600;white-space:nowrap">${escapeXml(
        c,
      )}</td><td style="padding:3px 0">${escapeXml(v)}</td></tr>`;
    })
    .join("");
  if (!rows) return "";
  return `<![CDATA[<table style="font-family:Arial,sans-serif;font-size:12px;border-collapse:collapse">${rows}</table>]]>`;
}

export interface KmzOptions {
  documentName: string;
  points: MapPoint[];
  mapping: ColumnMapping;
  style: StyleConfig;
  showLabels: boolean;
  groupByCategory: boolean;
}

/** Builds the KML document that lives inside the KMZ. */
export function buildKml({
  documentName,
  points,
  mapping,
  style,
  showLabels,
  groupByCategory,
}: KmzOptions): string {
  const mapAppearance = style.exportAppearance === "map";

  // Resolve the icon for a point: map mode → always the vector circle;
  // custom mode → per-category override, otherwise the single icon.
  const iconFor = (p: MapPoint) =>
    mapAppearance
      ? VECTOR_CIRCLE
      : style.exportMode === "category"
        ? style.exportCategoryIcons[p.category] ?? style.exportIconUrl
        : style.exportIconUrl;

  // Colour: map mode → the point's own map colour; custom mode → the colour
  // chosen in the icon dialog, falling back to the map colour.
  const colorFor = (p: MapPoint) =>
    mapAppearance
      ? p.color
      : style.exportMode === "category"
        ? style.exportCategoryColors[p.category] || p.color
        : style.exportIconColor || p.color;

  // Map mode mirrors the on-screen size/opacity (radius 5·scale → ~10·scale px,
  // sprite base 32 px → ÷3.2). Custom mode uses its own scale & opacity controls.
  const kmlScale = mapAppearance
    ? clampN(style.markerSize / 3.2, 0.1, 4)
    : style.exportIconScale;
  const kmlOpacity = mapAppearance ? style.markerOpacity / 100 : style.exportIconOpacity;

  const styleKey = (p: MapPoint) =>
    `s_${colorFor(p).replace("#", "")}_${iconFor(p) === VECTOR_CIRCLE ? "vec" : hashHref(iconFor(p))}`;

  const styles = new Map<string, string>();

  for (const p of points) {
    const key = styleKey(p);
    if (styles.has(key)) continue;
    const url = iconFor(p);
    const vector = url === VECTOR_CIRCLE;
    const none = url === NO_ICON;
    const href = vector ? "files/circle.png" : url;
    styles.set(
      key,
      `  <Style id="${key}">
    <IconStyle>
      <color>${hexToKmlColor(colorFor(p), kmlOpacity)}</color>
      <colorMode>normal</colorMode>
      <scale>${none ? "0" : kmlScale.toFixed(2)}</scale>
      ${none ? "<Icon></Icon>" : `<Icon><href>${href}</href></Icon>`}
      <hotSpot x="0.5" y="${vector ? "0.5" : "0"}" xunits="fraction" yunits="fraction"/>
    </IconStyle>
    <LabelStyle><scale>${showLabels ? "1" : "0"}</scale></LabelStyle>
    <BalloonStyle><text>$[description]</text></BalloonStyle>
  </Style>`,
    );
  }

  const placemark = (p: MapPoint) => {
    const data = mapping.popup
      .map(
        (c) =>
          `        <Data name="${escapeXml(c)}"><value>${escapeXml(
            String(p.row[c] ?? ""),
          )}</value></Data>`,
      )
      .join("\n");
    const desc = descriptionHtml(p, mapping);
    return `    <Placemark>
      <name>${escapeXml(p.name)}</name>
      <styleUrl>#${styleKey(p)}</styleUrl>${desc ? `\n      <description>${desc}</description>` : ""}
      ${data ? `<ExtendedData>\n${data}\n      </ExtendedData>` : ""}
      <Point><altitudeMode>clampToGround</altitudeMode><coordinates>${p.lon},${p.lat},0</coordinates></Point>
    </Placemark>`;
  };

  let body: string;
  if (groupByCategory && mapping.category) {
    const groups = new Map<string, MapPoint[]>();
    for (const p of points) {
      const arr = groups.get(p.category) ?? [];
      arr.push(p);
      groups.set(p.category, arr);
    }
    body = Array.from(groups.entries())
      .map(
        ([cat, pts]) =>
          `  <Folder>\n    <name>${escapeXml(cat)} (${pts.length})</name>\n${pts
            .map(placemark)
            .join("\n")}\n  </Folder>`,
      )
      .join("\n");
  } else {
    body = points.map(placemark).join("\n");
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>${escapeXml(documentName)}</name>
  <description>Generated by Point File Creator — ${points.length} placemarks</description>
  <open>1</open>
${Array.from(styles.values()).join("\n")}
${body}
</Document>
</kml>`;
}

/** Zips doc.kml (+ the circle sprite when needed) into a .kmz and downloads it. */
export async function exportKmz(opts: KmzOptions): Promise<void> {
  const zip = new JSZip();
  zip.file("doc.kml", buildKml(opts));

  // Pack the sprite if map-appearance mode is on, OR any resolved icon is vector.
  const s = opts.style;
  const usesVector =
    s.exportAppearance === "map"
      ? true
      : s.exportMode === "category"
        ? opts.points.some((p) => (s.exportCategoryIcons[p.category] ?? s.exportIconUrl) === VECTOR_CIRCLE)
        : s.exportIconUrl === VECTOR_CIRCLE;

  if (usesVector) {
    zip.folder("files")!.file("circle.png", circlePng(), { base64: true });
  }

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.google-earth.kmz",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${opts.documentName}.kmz`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
