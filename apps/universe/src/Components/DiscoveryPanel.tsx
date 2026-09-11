/* ============================================================
   DiscoveryPanel.tsx  v1
   Cinematic dark-glass panel — bookmarks, journey log,
   anomaly highlights, rename & notes.  Plugs into the
   existing UniverseInterface modal / overlay system.
   ============================================================ */

import { useCallback, useEffect, useRef, useState } from "react";
import type { DiscoveryLog, DiscoveryRecord } from "@known-universe/engine";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function elapsed(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function distLabel(ly: number): string {
  if (ly === 0) return "–";
  if (ly < 0.001) return `${(ly * 63241).toFixed(1)} au`;
  if (ly < 1) return `${(ly * 1000).toFixed(1)} mly`;
  if (ly < 1000) return `${ly.toFixed(2)} ly`;
  return `${(ly / 1000).toFixed(2)} kly`;
}

const KIND_ICON: Record<string, string> = {
  "star-system": "✦",
  "star":        "★",
  "planet":      "●",
  "moon":        "◌",
  "galaxy":      "⬡",
  "asteroid-belt":"∷",
  "anomaly":     "⚠",
  "landmark":    "⚑",
};

const ORIGIN_BADGE: Record<string, { label: string; color: string }> = {
  reality:    { label: "REAL",   color: "#4fa3e0" },
  procedural: { label: "SIM",    color: "#8b7fe8" },
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

interface RecordRowProps {
  record: DiscoveryRecord;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onBookmark: (id: string) => void;
  onFly?: (id: string) => void;
}

function RecordRow({ record, isSelected, onSelect, onBookmark, onFly }: RecordRowProps) {
  const badge = ORIGIN_BADGE[record.origin] ?? ORIGIN_BADGE["procedural"]!;
  const icon  = KIND_ICON[record.kind] ?? "·";

  return (
    <div
      onClick={() => onSelect(record.id)}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "7px 10px", cursor: "pointer", borderRadius: 6,
        background: isSelected ? "rgba(255,255,255,0.06)" : "transparent",
        borderLeft: `2px solid ${isSelected ? "#7eb6ff" : "transparent"}`,
        transition: "background 0.15s",
      }}
    >
      <span style={{ fontSize: 13, opacity: 0.6, minWidth: 14 }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 12.5, color: "#e8edf5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {record.customName ?? record.name}
      </span>
      <span style={{ fontSize: 10, color: badge.color, opacity: 0.8, fontFamily: "monospace" }}>
        {badge.label}
      </span>
      <button
        onClick={e => { e.stopPropagation(); onBookmark(record.id); }}
        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13,
                 color: record.isBookmarked ? "#f5c842" : "#555", padding: "0 2px" }}
        title={record.isBookmarked ? "Remove bookmark" : "Bookmark"}
      >
        {record.isBookmarked ? "★" : "☆"}
      </button>
      {onFly && (
        <button
          onClick={e => { e.stopPropagation(); onFly(record.id); }}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11,
                   color: "#7eb6ff", padding: "0 2px" }}
          title="Fly to"
        >
          ↗
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Detail card                                                          */
/* ------------------------------------------------------------------ */

interface DetailCardProps {
  record: DiscoveryRecord;
  onRename: (id: string, name: string) => void;
  onNote: (id: string, note: string) => void;
  onClose: () => void;
}

function DetailCard({ record, onRename, onNote, onClose }: DetailCardProps) {
  const [nameEdit, setNameEdit] = useState(record.customName ?? record.name);
  const [noteEdit, setNoteEdit] = useState(record.notes ?? "");
  const badge = ORIGIN_BADGE[record.origin] ?? ORIGIN_BADGE["procedural"]!;

  return (
    <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: badge.color, fontFamily: "monospace" }}>{badge.label} · {record.kind}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 13 }}>✕</button>
      </div>

      <label style={{ fontSize: 10, color: "#888", display: "block", marginBottom: 3 }}>NAME</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <input
          value={nameEdit}
          onChange={e => setNameEdit(e.target.value)}
          style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
                   borderRadius: 4, color: "#e8edf5", fontSize: 12, padding: "4px 8px" }}
          maxLength={64}
        />
        <button
          onClick={() => onRename(record.id, nameEdit)}
          style={{ background: "rgba(100,150,255,0.15)", border: "1px solid rgba(100,150,255,0.3)",
                   borderRadius: 4, color: "#7eb6ff", fontSize: 11, padding: "4px 10px", cursor: "pointer" }}
        >
          Save
        </button>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 10, fontSize: 11, color: "#888" }}>
        <span>Visits: <span style={{ color: "#ccc" }}>{record.visitCount}</span></span>
        <span>First: <span style={{ color: "#ccc" }}>{elapsed(record.firstVisitedAt)}</span></span>
        {record.anomalyScore && record.anomalyScore > 0.3 && (
          <span>Anomaly: <span style={{ color: "#f5c842" }}>{(record.anomalyScore * 100).toFixed(0)}%</span></span>
        )}
      </div>

      <label style={{ fontSize: 10, color: "#888", display: "block", marginBottom: 3 }}>NOTES</label>
      <textarea
        value={noteEdit}
        onChange={e => setNoteEdit(e.target.value)}
        onBlur={() => onNote(record.id, noteEdit)}
        placeholder="Personal notes…"
        rows={3}
        style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)",
                 borderRadius: 4, color: "#d0d8e8", fontSize: 11.5, padding: "5px 8px",
                 resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main panel                                                          */
/* ------------------------------------------------------------------ */

type Tab = "bookmarks" | "recent" | "anomalies" | "journey";

export interface DiscoveryPanelProps {
  log: DiscoveryLog;
  onFlyTo?: (entityId: string) => void;
  onClose: () => void;
}

export function DiscoveryPanel({ log, onFlyTo, onClose }: DiscoveryPanelProps) {
  const [tab, setTab] = useState<Tab>("recent");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, forceRender] = useState(0);

  // Re-render on log events
  useEffect(() => {
    const unsub = log.subscribe(() => forceRender(n => n + 1));
    return unsub;
  }, [log]);

  const records = query.trim()
    ? log.search(query)
    : tab === "bookmarks" ? log.getBookmarks()
    : tab === "anomalies" ? log.getAnomalies(0.3)
    : log.getRecent(50);

  const selectedRecord = selectedId ? log.get(selectedId) : undefined;
  const journey = log.journey.slice().reverse().slice(0, 30);

  const handleBookmark = useCallback((id: string) => {
    log.toggleBookmark(id);
  }, [log]);

  const handleRename = useCallback((id: string, name: string) => {
    log.rename(id, name);
  }, [log]);

  const handleNote = useCallback((id: string, note: string) => {
    log.addNote(id, note);
  }, [log]);

  const TAB_LABELS: { key: Tab; label: string; count?: number }[] = [
    { key: "recent",    label: "Recent",    count: log.discoveryCount },
    { key: "bookmarks", label: "Bookmarks", count: log.bookmarkCount },
    { key: "anomalies", label: "Anomalies" },
    { key: "journey",   label: "Journey" },
  ];

  return (
    <div style={{
      position: "absolute", top: 60, left: 16, width: 320,
      maxHeight: "calc(100vh - 100px)",
      background: "rgba(8,12,20,0.94)",
      backdropFilter: "blur(18px)",
      border: "1px solid rgba(255,255,255,0.09)",
      borderRadius: 10,
      boxShadow: "0 8px 40px rgba(0,0,0,0.7)",
      display: "flex", flexDirection: "column",
      fontFamily: "'Inter', 'SF Pro', sans-serif",
      color: "#c8d4e8",
      zIndex: 900,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "12px 14px 8px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.04em", color: "#e8edf5" }}>
            ⚑ Discovery Log
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search discoveries…"
          style={{
            width: "100%", background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.10)", borderRadius: 5,
            color: "#d0d8e8", fontSize: 12, padding: "5px 10px",
            boxSizing: "border-box", outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
          {TAB_LABELS.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setQuery(""); }}
              style={{
                flex: 1, background: tab === t.key ? "rgba(100,150,255,0.18)" : "transparent",
                border: `1px solid ${tab === t.key ? "rgba(100,150,255,0.35)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 4, color: tab === t.key ? "#7eb6ff" : "#778899",
                fontSize: 10.5, padding: "4px 0", cursor: "pointer",
                fontFamily: "inherit", whiteSpace: "nowrap",
              }}
            >
              {t.label}{t.count !== undefined ? ` (${t.count})` : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: "flex", gap: 12, padding: "6px 14px",
                    borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 10, color: "#556677" }}>
        <span>{log.discoveryCount} discovered</span>
        <span>{log.bookmarkCount} bookmarked</span>
        <span>{distLabel(log.totalDistanceTravelledLy)} travelled</span>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 4px" }}>
        {tab === "journey" ? (
          journey.length === 0
            ? <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "#445" }}>No journey yet.</div>
            : journey.map((entry, i) => {
                const r = log.get(entry.discoveryId);
                return (
                  <div key={i} style={{ padding: "5px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 11.5 }}>
                    <span style={{ color: "#7eb6ff", marginRight: 6 }}>{KIND_ICON[r?.kind ?? ""] ?? "·"}</span>
                    <span style={{ color: "#ccd" }}>{r?.customName ?? r?.name ?? entry.discoveryId}</span>
                    {entry.transitDistanceLy > 0 && (
                      <span style={{ marginLeft: 8, color: "#558" }}>{distLabel(entry.transitDistanceLy)}</span>
                    )}
                  </div>
                );
              })
        ) : (
          records.length === 0
            ? <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "#445" }}>
                {query ? "No results." : "Nothing here yet. Start exploring!"}
              </div>
            : records.map(r => (
                <RecordRow
                  key={r.id}
                  record={r}
                  isSelected={selectedId === r.id}
                  onSelect={id => setSelectedId(id === selectedId ? null : id)}
                  onBookmark={handleBookmark}
                  onFly={onFlyTo ? (id) => {
                    const record = log.get(id);
                    if (record?.id) onFlyTo(record.id);
                  } : undefined}
                />
              ))
        )}
      </div>

      {/* Detail card */}
      {selectedRecord && (
        <DetailCard
          record={selectedRecord}
          onRename={handleRename}
          onNote={handleNote}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

export default DiscoveryPanel;
