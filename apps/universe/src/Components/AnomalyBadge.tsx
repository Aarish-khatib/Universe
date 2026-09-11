/* ============================================================
   AnomalyBadge.tsx  v1
   Small cinematic badge shown on explore cards and science
   panels when a system has anomaly classes.  No external deps.
   ============================================================ */

import type { AnomalyClass } from "@known-universe/engine";

const CLASS_META: Record<AnomalyClass, { icon: string; color: string }> = {
  "binary-star":        { icon: "✦✦", color: "#d4a843" },
  "trinary-star":       { icon: "✦✦✦", color: "#e06030" },
  "hot-jupiter":        { icon: "♃🔥", color: "#e07030" },
  "ocean-world":        { icon: "🌊", color: "#3a9fd4" },
  "lava-world":         { icon: "🌋", color: "#dd3a1a" },
  "diamond-world":      { icon: "💎", color: "#8af0e8" },
  "life-candidate":     { icon: "🌿", color: "#4cca6c" },
  "rogue-moon":         { icon: "◌?", color: "#9985c4" },
  "tight-multi-planet": { icon: "⬡⬡⬡", color: "#c4a060" },
  "giant-gas-system":   { icon: "♃♃", color: "#b08848" },
  "void-system":        { icon: "∅", color: "#556688" },
  "pulsar-like":        { icon: "⚡★", color: "#c8e060" },
  "binary-twin-planets":{ icon: "●●", color: "#90b8f8" },
};

interface AnomalyBadgeProps {
  classes: readonly AnomalyClass[];
  score: number;
  label: string;
  description?: string;
  compact?: boolean;
}

export function AnomalyBadge({ classes, score, label, description, compact = false }: AnomalyBadgeProps) {
  if (classes.length === 0 && score < 0.1) return null;

  const primary = classes[0];
  const meta = primary ? CLASS_META[primary] : null;
  const color = meta?.color ?? "#8899aa";
  const icon = meta?.icon ?? "⚠";

  if (compact) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "2px 7px", borderRadius: 4,
        background: `${color}22`, border: `1px solid ${color}44`,
        fontSize: 10.5, color,
      }}>
        {icon} {label}
      </span>
    );
  }

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 8,
      padding: "8px 10px", borderRadius: 6,
      background: `${color}11`, border: `1px solid ${color}33`,
    }}>
      <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color, marginBottom: 2 }}>{label}</div>
        {description && (
          <div style={{ fontSize: 10.5, color: "#8899aa", lineHeight: 1.5 }}>{description}</div>
        )}
        <div style={{ fontSize: 10, color: "#5566778", marginTop: 4 }}>
          Anomaly score: {(score * 100).toFixed(0)}%
          {classes.slice(1).map(c => (
            <span key={c} style={{ marginLeft: 6, color: CLASS_META[c]?.color ?? "#667" }}>
              {CLASS_META[c]?.icon ?? c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AnomalyBadge;
