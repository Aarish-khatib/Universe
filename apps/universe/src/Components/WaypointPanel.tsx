/* ============================================================
   WaypointPanel.tsx  v1
   Cinematic waypoint manager — set destinations, pin, remove,
   and activate autopilot fly-to from any waypoint.
   ============================================================ */

import React, { useEffect, useState } from "react";
import type { Waypoint, WaypointSystem } from "@known-universe/engine";

function distLabel(ly: number): string {
  if (ly === 0) return "";
  if (ly < 0.001) return `${(ly * 63241).toFixed(1)} au`;
  if (ly < 1) return `${(ly * 1000).toFixed(1)} mly`;
  if (ly < 1000) return `${ly.toFixed(2)} ly`;
  return `${(ly / 1000).toFixed(2)} kly`;
}

function distance3(a: readonly [number, number, number], b: readonly [number, number, number]): number {
  const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

interface WaypointRowProps {
  wp: Waypoint;
  isActive: boolean;
  observerLy?: readonly [number, number, number];
  onActivate: (id: string) => void;
  onRemove: (id: string) => void;
  onPin: (id: string) => void;
}

function WaypointRow({ wp, isActive, observerLy, onActivate, onRemove, onPin }: WaypointRowProps) {
  const dist = observerLy ? distance3(observerLy, wp.positionLy) : 0;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "6px 10px", borderRadius: 6,
      background: isActive ? "rgba(100,200,100,0.08)" : "transparent",
      borderLeft: `2px solid ${isActive ? "#5ecf7a" : "transparent"}`,
      cursor: "pointer",
    }}>
      <span style={{ fontSize: 11, color: wp.isPinned ? "#f5c842" : "#445", minWidth: 12 }}>
        {wp.isPinned ? "📍" : "◎"}
      </span>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <div style={{ fontSize: 12, color: "#dde", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {wp.label}
        </div>
        {dist > 0 && (
          <div style={{ fontSize: 10, color: "#556" }}>{distLabel(dist)}</div>
        )}
      </div>
      <button
        onClick={() => onActivate(wp.id)}
        style={{
          background: isActive ? "rgba(80,200,80,0.2)" : "rgba(255,255,255,0.06)",
          border: `1px solid ${isActive ? "#5ecf7a44" : "rgba(255,255,255,0.1)"}`,
          borderRadius: 4, color: isActive ? "#5ecf7a" : "#778",
          fontSize: 10, padding: "3px 8px", cursor: "pointer",
        }}
        title="Fly to"
      >
        {isActive ? "Active" : "→ Fly"}
      </button>
      <button
        onClick={() => onPin(wp.id)}
        style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: 12 }}
        title={wp.isPinned ? "Unpin" : "Pin"}
      >
        {wp.isPinned ? "✦" : "✧"}
      </button>
      <button
        onClick={() => onRemove(wp.id)}
        style={{ background: "none", border: "none", color: "#554", cursor: "pointer", fontSize: 11 }}
        title="Remove"
      >
        ✕
      </button>
    </div>
  );
}

export interface WaypointPanelProps {
  system: WaypointSystem;
  observerPositionLy?: readonly [number, number, number];
  onActivate: (waypoint: Waypoint) => void;
  onClose: () => void;
}

export function WaypointPanel({ system, observerPositionLy, onActivate, onClose }: WaypointPanelProps) {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const unsub = system.subscribe(() => forceRender(n => n + 1));
    return unsub;
  }, [system]);

  const waypoints = system.getAll();
  const active = system.active;

  return (
    <div style={{
      position: "absolute", top: 60, right: 16, width: 280,
      maxHeight: "calc(100vh - 120px)",
      background: "rgba(8,12,20,0.93)",
      backdropFilter: "blur(18px)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 10,
      boxShadow: "0 8px 40px rgba(0,0,0,0.65)",
      display: "flex", flexDirection: "column",
      fontFamily: "'Inter', 'SF Pro', sans-serif",
      color: "#c8d4e8",
      zIndex: 900,
      overflow: "hidden",
    }}>
      <div style={{ padding: "11px 14px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)",
                    display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#e0e8f8" }}>◎ Waypoints</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {active && (
            <button
              onClick={() => system.deactivate()}
              style={{ background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.25)",
                       borderRadius: 4, color: "#ff7070", fontSize: 10, padding: "3px 8px", cursor: "pointer" }}
            >
              Cancel
            </button>
          )}
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 4px" }}>
        {waypoints.length === 0 ? (
          <div style={{ padding: 18, textAlign: "center", fontSize: 11.5, color: "#445" }}>
            No waypoints yet.<br />
            <span style={{ fontSize: 10, color: "#334" }}>Right-click any object to set a waypoint.</span>
          </div>
        ) : (
          waypoints.map(wp => (
            <WaypointRow
              key={wp.id}
              wp={wp}
              isActive={active?.id === wp.id}
              observerLy={observerPositionLy}
              onActivate={(id) => {
                system.activate(id);
                const w = system.getAll().find(w => w.id === id);
                if (w) onActivate(w);
              }}
              onRemove={(id) => system.remove(id)}
              onPin={(id) => {
                const w = system.getAll().find(w => w.id === id);
                if (w) { w.isPinned ? system.unpin(id) : system.pin(id); }
              }}
            />
          ))
        )}
      </div>

      {waypoints.length > 0 && (
        <div style={{ padding: "6px 14px", borderTop: "1px solid rgba(255,255,255,0.05)",
                      fontSize: 10, color: "#445" }}>
          {waypoints.length} waypoint{waypoints.length !== 1 ? "s" : ""}
          {active ? ` · navigating to ${active.label}` : ""}
        </div>
      )}
    </div>
  );
}

export default WaypointPanel;
