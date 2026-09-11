/* ============================================================
   AtmosphericOverlay.tsx  v1
   Full-screen overlay that renders atmospheric entry effects:
   - Entry plasma glow tint
   - Sky colour wash as altitude drops
   - Turbulence shake animation
   - Altitude HUD strip when in atmosphere
   Reads AtmosphericEntryState each frame via prop.
   ============================================================ */

import { useEffect, useRef } from "react";
import type { AtmosphericEntryState } from "@known-universe/engine";

function distLabel(m: number): string {
  if (m >= 1_000_000) return `${(m / 1_000_000).toFixed(1)} Mm`;
  if (m >= 1_000) return `${(m / 1_000).toFixed(1)} km`;
  return `${m.toFixed(0)} m`;
}

export interface AtmosphericOverlayProps {
  entry: AtmosphericEntryState | null;
}

export function AtmosphericOverlay({ entry }: AtmosphericOverlayProps) {
  const shakeRef = useRef<HTMLDivElement>(null);

  // Turbulence shake animation
  useEffect(() => {
    const el = shakeRef.current;
    if (!el || !entry || entry.turbulenceStrength < 0.05) {
      if (el) el.style.transform = "translate(0,0)";
      return;
    }

    let animId: number;
    const strength = entry.turbulenceStrength * 4; // max ±4px

    const shake = () => {
      const dx = (Math.random() - 0.5) * 2 * strength;
      const dy = (Math.random() - 0.5) * 2 * strength;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      animId = requestAnimationFrame(shake);
    };
    animId = requestAnimationFrame(shake);
    return () => {
      cancelAnimationFrame(animId);
      el.style.transform = "translate(0,0)";
    };
  }, [entry?.turbulenceStrength]);

  if (!entry || !entry.isInAtmosphere) return null;

  const [r, g, b] = entry.screenTintColor;
  const tintRgb = `${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)}`;
  const alpha = entry.screenTintAlpha;

  const PHASE_LABELS: Record<string, string> = {
    "upper-atmosphere": "Upper Atmosphere",
    "mesosphere": "Mesosphere",
    "stratosphere": "Stratosphere",
    "troposphere": "Troposphere",
    "low-altitude": "Low Altitude",
    "surface": "Surface",
  };

  return (
    <div
      ref={shakeRef}
      style={{
        position: "absolute", inset: 0,
        pointerEvents: "none",
        zIndex: 15,
      }}
    >
      {/* Screen tint */}
      {alpha > 0.01 && (
        <div style={{
          position: "absolute", inset: 0,
          background: `rgba(${tintRgb}, ${alpha})`,
          transition: "background 0.5s ease",
        }} />
      )}

      {/* Entry glow — vignette from edges */}
      {entry.entryGlowIntensity > 0.05 && (
        <div style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(ellipse at center, transparent 40%, rgba(${tintRgb}, ${entry.entryGlowIntensity * 0.6}) 100%)`,
          mixBlendMode: "screen",
        }} />
      )}

      {/* Altitude HUD strip */}
      <div style={{
        position: "absolute",
        top: 16, left: "50%",
        transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: 12,
        background: "rgba(4,10,22,0.75)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 6,
        padding: "5px 14px",
        fontSize: 11,
        fontFamily: "'Inter', sans-serif",
        color: "#8aa8cc",
        letterSpacing: "0.04em",
      }}>
        <span style={{ color: "#c8d8e8", fontWeight: 600 }}>
          {PHASE_LABELS[entry.phase] ?? entry.phase}
        </span>
        <span style={{ color: "#445566" }}>·</span>
        <span>ALT {distLabel(entry.altitudeM)}</span>
        {entry.turbulenceStrength > 0.3 && (
          <>
            <span style={{ color: "#445566" }}>·</span>
            <span style={{ color: "#e8b040" }}>TURB</span>
          </>
        )}
        {entry.surfaceApproach && (
          <>
            <span style={{ color: "#445566" }}>·</span>
            <span style={{ color: "#5ecf7a" }}>SURFACE APPROACH</span>
          </>
        )}
      </div>
    </div>
  );
}

export default AtmosphericOverlay;
