# Point File Creator

A browser-based tool for turning CSV/Excel coordinate data into a styled interactive map, then exporting it as KMZ for Google Earth or as a standalone shareable HTML page.

All data is processed locally in your browser. Nothing is uploaded to a server.

## Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Input Files](#input-files)
- [Interface Guide](#interface-guide)
- [Export Guide](#export-guide)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Technical Details](#technical-details)
- [Developer Guide](#developer-guide)

## Features

- CSV, TXT, XLS, and XLSX support
- Automatic column detection with manual override
- Canvas-rendered vector points — smooth with tens of thousands of markers
- Single-colour or category-based colouring
- Adjustable marker size and opacity
- Optional permanent site labels
- Configurable popup fields
- Four basemaps: Map, Street, Satellite, Topo
- Search and column filtering
- Floating legend with per-category counts
- KMZ export with Google Earth icon picker
- Standalone HTML export for sharing
- Responsive desktop and mobile layouts

## Quick Start

1. Open the **Upload** tab and drop a CSV or Excel file.
2. Switch to **Columns** and confirm the Latitude, Longitude, and Site Name mappings.
3. Tick the fields you want to appear in map popups.
4. Open **Style** to set colours, marker size, and opacity.
5. Go to **Filter** and press **Calculate & Draw**.
6. Export as **KMZ** for Google Earth, or **Standalone HTML** to share.

## Input Files

### Supported Formats

`.csv` · `.txt` · `.xls` · `.xlsx`

For Excel files, the first worksheet is used and its first row is treated as the header.

### Required Fields

| Field | Description | Example |
|---|---|---|
| Latitude | WGS84 latitude | 16.8661 |
| Longitude | WGS84 longitude | 96.1951 |
| Site Name | Label for the point | YGN00023 |

Latitude must be between `-90` and `90`. Longitude must be between `-180` and `180`. Rows with invalid coordinates are skipped.

Example CSV:

```csv
Site ID,Site Name,Latitude,Longitude,Region,Site Type
YGN-0012,Sule Pagoda Road,16.7752,96.1594,Yangon,Macro
YGN-0034,Kandawgyi Park,16.7996,96.1652,Yangon,Macro
```

Column names and order may differ — map them manually after upload.

### Automatic Detection

The app recognises common column names:

- **Latitude**: `lat`, `latitude`, `y`, `site_lat`, `northing`
- **Longitude**: `lon`, `long`, `lng`, `longitude`, `x`, `easting`
- **Site Name**: `site`, `site_name`, `name`, `id`, `label`, `title`
- **Category**: `category`, `type`, `class`, `status`, `region`, `zone`

If latitude and longitude appear swapped, the app detects this numerically and corrects it.

## Interface Guide

### 1. Data Source

Drag a file onto the drop zone or click to browse. Once loaded, a preview table shows the first rows and columns. Use **Remove** to clear the dataset.

### 2. Column Mapping

Assign the Latitude, Longitude, and Site Name columns. Below that, tick which columns should appear in map popups — use **All Columns** or **Clear** for bulk selection.

### 3. Map Appearance

**Colour Mode**
- *Single Colour* — one colour for every point
- *Categorized* — pick a category column, then assign a colour per value

**Global Icon Scale** — marker radius multiplier (0.1x–3.0x)
**Marker Opacity** — fill opacity (10%–100%)
**Site Labels** — permanent name labels beside each point
**Map Legend** — show or hide the floating legend

### 4. Search & Filter

Filter points by site name, or narrow by a specific column value. A live counter shows how many of the total rows currently match. **Reset** clears all filters.

### 5. Actions

- **Calculate & Draw** — renders the filtered points on the map
- **Export KMZ** — opens the export panel
- **Download Standalone HTML** — saves a shareable web page
- **Clear** — removes points from the map

### Map Controls

- **Basemap selector** (top-right) — collapsed thumbnail expands into Map / Street / Satellite / Topo
- **Legend** (bottom-right) — category names with point counts
- Scroll to zoom, drag to pan, click a point for its popup, hover for its name

## Export Guide

### KMZ

Clicking **Export KMZ** opens a panel over the map with two modes:

**Map Appearance** — exports exactly what you see: vector circles in their map colours, at the same scale and opacity.

**Custom KMZ Icon** — choose Google Earth icons instead:
- *Single Icon* — one icon for all points
- *Categorized* — a different icon per category

The icon picker offers the full Google Earth icon library (Shapes, Pushpins, Paddles) plus a vector circle option and custom URL support. A colour tint, scale, and opacity can be set per icon.

The exported `.kmz` is a zip containing `doc.kml`. When the vector circle is used, a generated `circle.png` is packed inside so the file works offline. Points are grouped into folders by category when categorised.

### Standalone HTML

**Download Standalone HTML** produces a single `.html` file containing the complete app plus your data and configuration. The recipient double-clicks it and sees your exact map — data loaded, colours applied, points drawn. No installation or upload required.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl` + `Enter` | Calculate & Draw |
| `Ctrl` + `E` | Export KMZ |
| `Ctrl` + `L` | Toggle legend |
| `Ctrl` + `B` | Toggle sidebar |

## Technical Details

### Rendering

Points are drawn as Leaflet `CircleMarker` vectors into a single `<canvas>` element rather than as DOM nodes. This keeps panning and zooming smooth with large datasets where a marker-per-element approach would stall.

Additional optimisations:
- Markers are batched into one layer group insertion
- Popups are built lazily above 1,500 points
- Labels render in a separate layer group so toggling them doesn't rebuild markers
- Only the two affected markers are restyled on selection change
- Basemap tiles swap only after the replacement has loaded

### KML Colour Format

Google Earth uses `aabbggrr` (alpha, blue, green, red) rather than `#rrggbb`. The exporter converts colours and applies opacity to the alpha channel.

Google Earth multiplies the `<color>` value against the icon's own pixels. White or monochrome icons tint cleanly to any colour; already-coloured sprites retain their base hue.

### Coordinate Handling

Values are parsed leniently — thousands separators, degree symbols, and surrounding whitespace are stripped before conversion.

## Developer Guide

### Stack

- React 19
- TypeScript
- Vite 7
- Tailwind CSS 4
- Leaflet
- PapaParse
- SheetJS (`xlsx`)
- JSZip
- `vite-plugin-singlefile`

### Install

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

### Build

```bash
npm run build
```

The production build is written to `dist/index.html` as a single self-contained file.

### Preview

```bash
npm run preview
```

### Main Files

| File | Purpose |
|---|---|
| `src/App.tsx` | State, layout, sidebar tabs, actions |
| `src/components/MapView.tsx` | Map, basemaps, canvas markers, popups |
| `src/components/Legend.tsx` | Floating legend |
| `src/components/ExportPanel.tsx` | KMZ export options |
| `src/components/IconPickerModal.tsx` | Google Earth icon dialog |
| `src/components/BasemapThumb.tsx` | Basemap thumbnails with SVG fallbacks |
| `src/lib/parse.ts` | CSV/Excel parsing and column detection |
| `src/lib/export.ts` | KML generation and KMZ packaging |
| `src/lib/share.ts` | Standalone HTML export |
| `src/lib/kmlIcons.ts` | Google Earth icon catalogue |
| `src/lib/icons.ts` | Colour palette |
| `src/types.ts` | Shared types and basemap definitions |

### Defaults

| Setting | Default |
|---|---|
| Map centre | Yangon (16.8661, 96.1951) |
| Basemap | Map (Carto Light) |
| Colour mode | Single |
| Single colour | `#ef4444` |
| Marker scale | 1.0x |
| Marker opacity | 100% |
| Site labels | Off |
| Legend | On |
| KMZ export | Map Appearance |

## Troubleshooting

**No points appear** — Check the Latitude and Longitude mappings, confirm coordinates are in decimal degrees, and verify they aren't swapped.

**Map tiles don't load** — Basemaps require internet access. Check firewall and ad-blocker settings for CARTO, OpenStreetMap, Esri, and OpenTopoMap.

**Excel data looks wrong** — The first worksheet is used and its first row must contain headers. Remove any merged title cells above the table.

**Exported icon colour looks different** — Google Earth multiplies the tint against the icon's own colours. Use a vector circle or a white/monochrome icon for exact colour matching.

## Privacy

Files are parsed entirely in the browser. No coordinate data is sent to any application server. Basemap providers receive ordinary tile requests containing the requested tile coordinates.

## Limitations

- Basemaps require an internet connection
- Historical imagery and 3D terrain are not available (browser tile providers don't expose them)
- Very large files (100k+ rows) may take a moment to parse

## License

MIT
