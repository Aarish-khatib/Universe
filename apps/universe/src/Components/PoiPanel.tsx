/* ============================================================
   PoiPanel.tsx  v1
   Cinematic Points of Interest browser panel.
   Shows all discovered POIs grouped by category,
   with fly-to, mark-visited, and user-mark actions.
   ============================================================ */

import React, { useEffect, useState } from "react";
import type { PointOfInterest, PoiSystem, PoiCategory } from "@known-universe/engine";

const CATEGORY_COLORS: Record<PoiCategory, string> = {
  "anomaly":          "#d4a843",
  "binary-spectacle": "#d4a843",
  "life-candidate":   "#4cca6c",
  "nebula-core":      "#7eb6ff",
  "extreme-world":    "#dd4422",
  "landmark":         "#8899aa",
  "user-marked":      "#f5c842",
};

function distLabel(ly: number): string {
  if (ly === 0) return "";
  if (ly < 0.001) return `${(ly * 63241).toFixed(1)} au`;
  if (ly < 1) return `${(ly * 1000).toFixed(1)} mly`;
  if (ly < 1000) return `${ly.toFixed(2)} ly`;
  return `${(ly / 1000).toFixed(2)} kly`;
}

function distance3(a: readonly [number,number,number], b: readonly [number,number,number]): number {
  const dx = a[0]-b[0], dy = a[1]-b[1], dz = a[2]-b[2];
  return Math.sqrt(dx*dx+dy*dy+dz*dz);
}

const CATEGORY_LABELS: Record<PoiCategory, string> = {
  "anomaly": "Anomalies", "binary-spectacle": "Binary Systems",
  "life-candidate": "Life Candidates", "nebula-core": "Nebulae",
  "extreme-world": "Extreme Worlds", "landmark": "Landmarks",
  "user-marked": "Your Marks",
};

interface PoiRowProps {
  poi: PointOfInterest;
  observerLy?: readonly [number,number,number];
  onFlyTo: (id: string) => void;
  onMarkVisited: (id: string) => void;
}

function PoiRow({ poi, observerLy, onFlyTo, onMarkVisited }: PoiRowProps) {
  const dist = observerLy ? distance3(observerLy, poi.positionLy) : 0;
  const color = CATEGORY_COLORS[poi.category];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "6px 10px", borderRadius: 5,
      opacity: poi.isVisited ? 0.5 : 1,
      borderLeft: `2px solid ${color}55`,
      cursor: "pointer",
    }}
    onClick={() => onFlyTo(poi.entityId)}>
      <span style={{ fontSize: 14, minWidth: 16 }}>{poi.icon}</span>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <div style={{ fontSize: 12, color: "#dde", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {poi.label}
        </div>
        <div style={{ fontSize: 10, color: "#556", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {poi.description}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
        {dist > 0 && <span style={{ fontSize: 10, color: "#556" }}>{distLabel(dist)}</span>}
        <span style={{
          fontSize: 9, color, padding: "1px 5px",
          background: `${color}18`, borderRadius: 3,
        }}>
          {(poi.rarity * 100).toFixed(0)}%
        </span>
      </div>
      {!poi.isVisited && (
        <button
          onClick={e => { e.stopPropagation(); onMarkVisited(poi.entityId); }}
          style={{ background: "none", border: "none", color: "#445", cursor: "pointer", fontSize: 10 }}
          title="Mark visited"
        >✓</button>
      )}
    </div>
  );
}

export interface PoiPanelProps {
  system: PoiSystem;
  observerPositionLy?: readonly [number,number,number];
  onFlyTo?: (entityId: string) => void;
  onClose: () => void;
}

export function PoiPanel({ system, observerPositionLy, onFlyTo, onClose }: PoiPanelProps) {
  const [, forceRender] = useState(0);
  const [filter, setFilter] = useState<"all"|"unvisited">("unvisited");

  useEffect(() => {
    const unsub = system.subscribe(() => forceRender(n => n + 1));
    return unsub;
  }, [system]);

  const all = filter === "unvisited" ? system.getUnvisited() : system.getAll();
  const categories = [...new Set(all.map(p => p.category))];

  return (
    <div style={{
      position: "absolute", top: 60, right: 16, width: 300,
      maxHeight: "calc(100vh - 120px)",
      background: "rgba(6,10,20,0.94)",
      backdropFilter: "blur(18px)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 10,
      boxShadow: "0 8px 40px rgba(0,0,0,0.65)",
      display: "flex", flexDirection: "column",
      fontFamily: "'Inter','SF Pro',sans-serif",
      color: "#c8d4e8",
      zIndex: 910, overflow: "hidden",
    }}>
      <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(255,255,255,0.07)",
                    display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#e0e8f8" }}>⚠ Points of Interest</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 14 }}>✕</button>
      </div>
      <div style={{ display: "flex", gap: 4, padding: "6px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        {(["unvisited","all"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            flex: 1, background: filter===f ? "rgba(100,150,255,0.18)" : "transparent",
            border: `1px solid ${filter===f ? "rgba(100,150,255,0.35)" : "rgba(255,255,255,0.08)"}`,
            borderRadius: 4, color: filter===f ? "#7eb6ff" : "#778899",
            fontSize: 10.5, padding: "3px 0", cursor: "pointer", fontFamily: "inherit",
          }}>{f === "unvisited" ? `Unvisited (${system.getUnvisited().length})` : `All (${system.count})`}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 4px" }}>
        {all.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", fontSize: 11.5, color: "#445" }}>
            No points of interest yet. Keep exploring!
          </div>
        ) : categories.map(cat => (
          <div key={cat}>
            <div style={{ padding: "5px 10px 2px", fontSize: 9.5, color: CATEGORY_COLORS[cat],
                          letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>
              {CATEGORY_LABELS[cat]}
            </div>
            {all.filter(p => p.category === cat).map(poi => (
              <PoiRow key={poi.id} poi={poi} observerLy={observerPositionLy}
                onFlyTo={id => onFlyTo?.(id)}
                onMarkVisited={id => system.markVisited(id)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default PoiPanel;
