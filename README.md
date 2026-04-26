# Point File Creator

A web-based tool for creating point-based maps from CSV/Excel data and exporting to KML format.

## Features

### Data Import
- Support for CSV and Excel files (.csv, .xlsx, .xls)
- Drag-and-drop or click to upload
- Automatic column detection

### Column Mapping
- Map latitude and longitude columns
- Map site name column
- Select popup columns for marker info windows

### Styling Options
- **Single Color Mode**: All markers use the same color
- **Category Mode**: Different colors/icons per category
  - Manual Color & Icon assignment for each category
  - Google Earth icons selection
  - Vector circle option
- Adjustable marker size and opacity
- Default icon picker with preview

### Map Controls
- Toggle legend visibility
- Toggle site labels on map
- Multiple base map layers (OpenStreetMap, Satellite, Terrain, etc.)
- Zoom and pan controls

### Filter & Search
- Search by site name
- Filter data by category

### Export
- Export to KML format with:
  - Custom icons and colors
  - Popup information
  - Category-based styling

## Usage

1. **Upload Data**: Click "Upload" tab or drag-drop a CSV/Excel file
2. **Map Columns**: Go to "Columns" tab and map:
   - Latitude column
   - Longitude column
   - Site Name column (optional)
   - Popup columns (optional)
3. **Style Markers**: In "Style" tab:
   - Choose single or category color mode
   - Adjust marker size and opacity
   - Pick custom icons
4. **Filter Data**: Use "Filter" tab to search/filter points
5. **Draw & Export**:
   - Click "Calculate & Draw" to display markers on map
   - Click "Export KML" to download

## Keyboard Shortcuts

- `Ctrl+Enter`: Calculate & Draw
- `Ctrl+E`: Export KML
- `Ctrl+L`: Toggle Legend
- `Ctrl+B`: Toggle Sidebar

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Edge
- Safari

## Technical Details

- Built with React 18
- Leaflet.js for mapping
- PapaParse for CSV parsing
- SheetJS for Excel handling
- Single HTML file, no build required

## License

MIT
