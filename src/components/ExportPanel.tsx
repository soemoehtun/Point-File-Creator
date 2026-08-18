import type { StyleConfig } from "@/types";
import { VECTOR_CIRCLE } from "@/lib/kmlIcons";

function IconSwatch({ url, color }: { url: string; color: string }) {
  return (
    <div
      style={{
        width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
        background: "#fff", border: "1px solid #dce5e2", flexShrink: 0,
      }}
    >
      {url === VECTOR_CIRCLE ? (
        <div style={{ width: 13, height: 13, borderRadius: "50%", background: color }} />
      ) : (
        <span style={{ position: "relative", display: "inline-flex", width: 20, height: 20 }}>
          <img src={url} alt="" style={{ maxWidth: 20, maxHeight: 20, objectFit: "contain", display: "block" }} />
          <span style={{ position: "absolute", inset: 0, background: color, mixBlendMode: "multiply", pointerEvents: "none" }} />
        </span>
      )}
    </div>
  );
}

interface Props {
  style: StyleConfig;
  setStyle: React.Dispatch<React.SetStateAction<StyleConfig>>;
  categoryCol: string;
  categories: string[];
  getCatColor: (v: string) => string;
  count: number;
  onPickIcon: (category: string | null) => void;
  onClose: () => void;
  onExport: () => void;
}

export default function ExportPanel({
  style,
  setStyle,
  categoryCol,
  categories,
  getCatColor,
  count,
  onPickIcon,
  onClose,
  onExport,
}: Props) {
  const custom = style.exportAppearance === "custom";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="guide-modal" onClick={(e) => e.stopPropagation()}>
        <div className="guide-head">
          <div>
            <h2>Export to Google Earth</h2>
            <p>Choose how your points should look inside the KMZ file.</p>
          </div>
          <button className="guide-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="guide-body">
          <span className="field-label">Export style</span>
          <div className="mode-selector">
            <div
              className={`mode-option ${!custom ? "active" : ""}`}
              onClick={() => setStyle((s) => ({ ...s, exportAppearance: "map" }))}
            >
              Match map
            </div>
            <div
              className={`mode-option ${custom ? "active" : ""}`}
              onClick={() => setStyle((s) => ({ ...s, exportAppearance: "custom" }))}
            >
              Custom icons
            </div>
          </div>

          {!custom && (
            <>
              <div className="cat-row" style={{ marginTop: 16, cursor: "default" }}>
                <span className="cat-name" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <i style={{ width: 11, height: 11, borderRadius: "50%", background: style.singleColor, display: "block" }} />
                  {style.mode === "category" && categoryCol
                    ? "Vector points · category colours"
                    : "Vector points · single colour"}
                </span>
              </div>
              <p className="field-help">
                {style.mode === "category" && categoryCol && <>Grouped by <code>{categoryCol}</code> · </>}
                Scale {style.markerSize.toFixed(1)}× · Opacity {style.markerOpacity}% — exactly as shown on the map.
                Site names and popup fields are included.
              </p>
            </>
          )}

          {custom && (
            <div style={{ marginTop: 18 }}>
              <span className="field-label">Icon mode</span>
              <div className="mode-selector">
                <div
                  className={`mode-option ${style.exportMode === "single" ? "active" : ""}`}
                  onClick={() => setStyle((s) => ({ ...s, exportMode: "single" }))}
                >
                  Single icon
                </div>
                <div
                  className={`mode-option ${style.exportMode === "category" ? "active" : ""}`}
                  onClick={() => setStyle((s) => ({ ...s, exportMode: "category" }))}
                >
                  Per category
                </div>
              </div>

              {style.exportMode === "single" && (
                <div className="cat-row" style={{ marginTop: 14, cursor: "pointer" }} onClick={() => onPickIcon(null)}>
                  <span className="cat-name">
                    {style.exportIconUrl === VECTOR_CIRCLE ? "Vector circle" : "Google Earth icon"}
                  </span>
                  <IconSwatch url={style.exportIconUrl} color={style.exportIconColor || style.singleColor} />
                </div>
              )}

              {style.exportMode === "category" && (
                !categoryCol ? (
                  <p className="field-help" style={{ marginTop: 12 }}>
                    Select a category column in <b>Style</b> first.
                  </p>
                ) : (
                  <div style={{ marginTop: 14 }}>
                    <div className="mapping-label">
                      <label>Icon per value</label>
                      <span>{categories.length} groups</span>
                    </div>
                    <div style={{ maxHeight: 190, overflowY: "auto" }}>
                      {categories.map((val) => (
                        <div key={val} className="cat-row" style={{ cursor: "pointer" }} onClick={() => onPickIcon(val)}>
                          <span className="cat-name" title={val}>{val}</span>
                          <IconSwatch
                            url={style.exportCategoryIcons[val] ?? style.exportIconUrl}
                            color={style.exportCategoryColors[val] || style.categoryColors[val] || getCatColor(val)}
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      className="cat-reset"
                      onClick={() => setStyle((s) => ({ ...s, exportCategoryIcons: {}, exportCategoryColors: {} }))}
                    >
                      Reset icons
                    </button>
                  </div>
                )
              )}

              <div className="range-setting">
                <div>Icon scale <span>{style.exportIconScale.toFixed(1)}×</span></div>
                <input
                  type="range" min="0.1" max="3" step="0.1"
                  value={style.exportIconScale}
                  onChange={(e) => setStyle((s) => ({ ...s, exportIconScale: parseFloat(e.target.value) }))}
                />
              </div>

              <div className="range-setting">
                <div>Icon opacity <span>{Math.round(style.exportIconOpacity * 100)}%</span></div>
                <input
                  type="range" min="10" max="100"
                  value={Math.round(style.exportIconOpacity * 100)}
                  onChange={(e) => setStyle((s) => ({ ...s, exportIconOpacity: parseInt(e.target.value) / 100 }))}
                />
              </div>
            </div>
          )}
        </div>

        <div className="guide-footer">
          <span className="guide-count">{count.toLocaleString()} placemarks</span>
          <div className="guide-actions">
            <button className="secondary-button" onClick={onClose}>Cancel</button>
            <button className="primary-button" onClick={onExport} disabled={!count}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export KMZ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
