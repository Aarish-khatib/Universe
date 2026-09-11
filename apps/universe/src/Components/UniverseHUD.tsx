import React from "react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";

import type { EntityId } from "@known-universe/core";
import { METERS_PER_UNIT, convertDistance } from "@known-universe/core";
import type { SpaceEntity } from "@known-universe/core";
import type { UniverseState } from "@known-universe/engine";
import { scaleBandFor, scaleForBand } from "@known-universe/engine";

type HudMode = "explore" | "science";

type ScaleBand =
  | "surface"
  | "regional"
  | "planet"
  | "orbital"
  | "system"
  | "stellar"
  | "galactic"
  | "intergalactic"
  | "cosmic";

type CameraMode =
  | "orbit"
  | "free"
  | "surface"
  | "chase"
  | "cinematic"
  | "scale"
  | "observer";

type OverlayKey =
  | "labels"
  | "gravity"
  | "humanity"
  | "knowledge"
  | "orbits"
  | "discovery"
  | "waypoints";

type KnowledgeClass =
  | "observed"
  | "measured"
  | "estimated"
  | "theoretical"
  | "procedural";

interface HudEntityLike {
  id: EntityId;
  name?: string;
  kind?: string;
  parentId?: EntityId;
  frameId?: string;
  description?: string;
  subtype?: string;
  realityClass?: KnowledgeClass;
  evidenceLevel?: string;
  knowledge?: {
    confidence?: number;
    class?: KnowledgeClass;
    sources?: string[];
  };
  scientific?: {
    confidence?: number;
    evidenceLevel?: string;
    sources?: string[];
  };
  physical?: {
    radiusMeters?: number;
    massKg?: number;
    densityKgM3?: number;
    temperatureK?: number;
    luminosityW?: number;
    gravityMs2?: number;
    albedo?: number;
  };
  properties?: {
    radiusMeters?: number;
    massKg?: number;
    densityKgM3?: number;
    temperatureK?: number;
    luminosityW?: number;
    gravityMs2?: number;
    albedo?: number;
  };
  metadata?: Record<string, unknown>;
}

interface HumanitySnapshot {
  civilizationName?: string;
  estimatedKardashev?: number;
  energyUseWatts?: number;
  technologicalLevel?: string;
  interstellarCapability?: string;
  lightConeStatus?: string;
}

interface PerformanceSnapshot {
  fps?: number;
  frameMs?: number;
  visibleObjects?: number;
  drawCalls?: number;
  memoryMb?: number;
  quality?: string;
}

interface UniverseHUDProps {
  state: UniverseState;

  mode?: HudMode;
  onModeChange?: (mode: HudMode) => void;

  onSelect?: (id: EntityId | null) => void;
  onFocus?: (id: EntityId | null) => void;
  onNavigate?: (direction: "parent" | "child" | "previous" | "next") => void;
  onHome?: () => void;
  onBack?: () => void;

  onScaleChange?: (band: ScaleBand) => void;
  onSemanticZoom?: (direction: -1 | 1) => void;

  onPauseChange?: (paused: boolean) => void;
  onClockRateChange?: (rate: number) => void;

  onCameraModeChange?: (mode: CameraMode) => void;

  onToggleOverlay?: (overlay: OverlayKey, value: boolean) => void;

  onSearch?: (query: string) => void;
  onSearchSelect?: (id: EntityId) => void;

  onOpenSettings?: () => void;
  onDiscoveryMode?: () => void;
  onCompareScale?: () => void;
  onOpenDiscoveryLog?: () => void;
  onOpenWaypoints?: () => void;

  onCommand?: (command: string) => void;

  humanity?: HumanitySnapshot;
  performance?: PerformanceSnapshot;

  locationLabel?: string;
  coordinateLabel?: string;
  temporalLabel?: string;

  className?: string;
}

interface IconProps {
  name: string;
  size?: number;
  strokeWidth?: number;
}

interface GlassButtonProps {
  children: ReactNode;
  label?: string;
  active?: boolean;
  subtle?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  title?: string;
}

interface MetricProps {
  label: string;
  value: string;
  hint?: string;
  wide?: boolean;
}

const HUD_CSS = `
.universe-hud {
  --hud-font: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --hud-white: rgba(248, 252, 255, 0.96);
  --hud-text: rgba(229, 238, 248, 0.86);
  --hud-muted: rgba(175, 193, 214, 0.68);
  --hud-faint: rgba(146, 166, 190, 0.48);
  --hud-line: rgba(184, 214, 244, 0.14);
  --hud-line-strong: rgba(184, 214, 244, 0.25);
  --hud-glass: rgba(8, 20, 39, 0.48);
  --hud-glass-heavy: rgba(7, 17, 34, 0.78);
  --hud-glass-soft: rgba(15, 33, 58, 0.34);
  --hud-accent: var(--viz-accent, #8fd4ff);
  --hud-accent-text: var(--viz-accent-text, #06121e);
  --hud-accent-bg: var(--viz-accent-bg, rgba(143, 212, 255, 0.13));
  --hud-shadow: 0 16px 50px rgba(0, 0, 0, 0.28);

  position: absolute;
  inset: 0;
  z-index: 20;
  pointer-events: none;
  font-family: var(--hud-font);
  color: var(--hud-text);
  user-select: none;
}

.universe-hud *,
.universe-hud *::before,
.universe-hud *::after {
  box-sizing: border-box;
}

.universe-hud button,
.universe-hud input {
  font: inherit;
}

.hud-shell {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.hud-interactive {
  pointer-events: auto;
}

.hud-topbar {
  position: absolute;
  top: 18px;
  left: 18px;
  right: 18px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.hud-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.hud-brand-mark {
  width: 38px;
  height: 38px;
  border: 1px solid var(--hud-line-strong);
  border-radius: 50%;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 35% 30%, rgba(169, 226, 255, 0.24), transparent 46%),
    rgba(7, 18, 35, 0.62);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.015) inset;
}

.hud-brand-mark svg {
  color: var(--hud-white);
}

.hud-brand-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.hud-brand-title {
  color: var(--hud-white);
  font-size: 15px;
  font-weight: 650;
  letter-spacing: 0.18em;
  line-height: 1;
}

.hud-brand-subtitle {
  margin-top: 5px;
  color: var(--hud-muted);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.hud-top-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hud-pill {
  height: 38px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border: 1px solid var(--hud-line);
  border-radius: 999px;
  background: rgba(8, 19, 37, 0.52);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.hud-pill-text {
  font-size: 11px;
  color: var(--hud-text);
  white-space: nowrap;
}

.hud-pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--hud-accent);
  box-shadow: 0 0 14px color-mix(in srgb, var(--hud-accent) 70%, transparent);
}

.hud-mode-switch {
  display: inline-flex;
  align-items: center;
  padding: 3px;
  gap: 2px;
  border: 1px solid var(--hud-line);
  border-radius: 999px;
  background: rgba(7, 18, 35, 0.64);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.hud-mode-button {
  height: 30px;
  min-width: 78px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--hud-muted);
  cursor: pointer;
  transition:
    color 150ms ease,
    background 150ms ease,
    transform 150ms ease;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hud-mode-button:hover {
  color: var(--hud-white);
}

.hud-mode-button:active {
  transform: scale(0.97);
}

.hud-mode-button.is-active {
  color: var(--hud-accent-text);
  background: var(--hud-accent);
}

.hud-search {
  position: absolute;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  width: min(560px, calc(100vw - 40px));
}

.hud-search-shell {
  position: relative;
  display: flex;
  align-items: center;
  height: 50px;
  padding: 0 14px;
  gap: 10px;
  border: 1px solid var(--hud-line-strong);
  border-radius: 16px;
  background: rgba(6, 17, 34, 0.62);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
  box-shadow: var(--hud-shadow);
}

.hud-search-icon {
  flex: 0 0 auto;
  color: var(--hud-muted);
}

.hud-search-input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--hud-white);
  font-size: 13px;
}

.hud-search-input::placeholder {
  color: var(--hud-faint);
}

.hud-search-hint {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 24px;
  padding: 0 7px;
  border: 1px solid var(--hud-line);
  border-radius: 7px;
  color: var(--hud-muted);
  background: rgba(255, 255, 255, 0.03);
  font-size: 10px;
}

.hud-search-results {
  margin-top: 8px;
  overflow: hidden;
  border: 1px solid var(--hud-line-strong);
  border-radius: 16px;
  background: rgba(5, 15, 30, 0.86);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  box-shadow: var(--hud-shadow);
}

.hud-search-result {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 0;
  border-bottom: 1px solid var(--hud-line);
  padding: 10px 12px;
  text-align: left;
  color: var(--hud-text);
  background: transparent;
  cursor: pointer;
}

.hud-search-result:hover {
  background: rgba(255, 255, 255, 0.06);
}

.hud-search-result.is-selected {
  background: rgba(95, 214, 238, 0.18);
  border-radius: 8px;
}

.hud-search-result:last-child {
  border-bottom: 0;
}
  background: rgba(255, 255, 255, 0.05);
}

.hud-search-result-marker {
  width: 26px;
  height: 26px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid var(--hud-line);
  color: var(--hud-accent);
}

.hud-search-result-copy {
  min-width: 0;
  flex: 1;
}

.hud-search-result-name {
  overflow: hidden;
  color: var(--hud-white);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hud-search-result-meta {
  margin-top: 3px;
  overflow: hidden;
  color: var(--hud-muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hud-left-rail {
  position: absolute;
  top: 154px;
  left: 18px;
  bottom: 104px;
  width: 52px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.hud-rail-group {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.hud-icon-button {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border: 1px solid var(--hud-line);
  border-radius: 13px;
  background: rgba(7, 18, 35, 0.48);
  color: var(--hud-muted);
  cursor: pointer;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  transition:
    color 150ms ease,
    border-color 150ms ease,
    background 150ms ease,
    transform 150ms ease;
}

.hud-icon-button:hover {
  color: var(--hud-white);
  border-color: var(--hud-line-strong);
  background: rgba(15, 33, 57, 0.68);
}

.hud-icon-button:active {
  transform: scale(0.95);
}

.hud-icon-button.is-active {
  color: var(--hud-accent);
  border-color: color-mix(in srgb, var(--hud-accent) 34%, transparent);
  background: var(--hud-accent-bg);
}

.hud-icon-button:disabled {
  opacity: 0.4;
  cursor: default;
}

.hud-scale {
  position: absolute;
  top: 154px;
  left: 86px;
  width: min(270px, calc(100vw - 120px));
  padding: 14px 15px;
  border-left: 1px solid var(--hud-line-strong);
  background: linear-gradient(
    90deg,
    rgba(7, 18, 35, 0.60),
    rgba(7, 18, 35, 0.20),
    transparent
  );
}

.hud-eyebrow {
  color: var(--hud-muted);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.hud-scale-name {
  margin-top: 4px;
  color: var(--hud-white);
  font-size: 20px;
  font-weight: 500;
}

.hud-scale-readout {
  margin-top: 3px;
  color: var(--hud-muted);
  font-size: 11px;
}

.hud-scale-track {
  position: relative;
  margin-top: 12px;
  width: 100%;
  height: 2px;
  overflow: visible;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.15),
    rgba(255, 255, 255, 0.04)
  );
}

.hud-scale-progress {
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--progress, 40%);
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--hud-accent) 90%, white 10%),
    color-mix(in srgb, var(--hud-accent) 30%, transparent)
  );
}

.hud-scale-knob {
  position: absolute;
  top: 50%;
  left: var(--progress, 40%);
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--hud-accent);
  transform: translate(-50%, -50%);
  box-shadow: 0 0 14px color-mix(in srgb, var(--hud-accent) 68%, transparent);
}

.hud-scale-labels {
  margin-top: 7px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--hud-faint);
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.hud-inspector {
  position: absolute;
  top: 154px;
  right: 18px;
  width: min(360px, calc(100vw - 36px));
  max-height: calc(100vh - 286px);
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(184, 214, 244, 0.18) transparent;
  pointer-events: auto;
}

.hud-inspector::-webkit-scrollbar {
  width: 5px;
}

.hud-inspector::-webkit-scrollbar-track {
  background: transparent;
}

.hud-inspector::-webkit-scrollbar-thumb {
  background: rgba(184, 214, 244, 0.18);
  border-radius: 999px;
}

.hud-inspector-glass {
  overflow: hidden;
  border: 1px solid var(--hud-line);
  border-radius: 20px;
  background: rgba(6, 16, 32, 0.60);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  box-shadow: var(--hud-shadow);
}

.hud-inspector-head {
  padding: 17px 18px 14px;
  border-bottom: 1px solid var(--hud-line);
}

.hud-inspector-head-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.hud-entity-kind {
  color: var(--hud-muted);
  font-size: 9px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.hud-entity-name {
  margin-top: 5px;
  color: var(--hud-white);
  font-size: 24px;
  font-weight: 450;
  line-height: 1.08;
}

.hud-entity-subtitle {
  margin-top: 7px;
  color: var(--hud-muted);
  font-size: 11px;
  line-height: 1.5;
}

.hud-close-button {
  width: 29px;
  height: 29px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border: 1px solid var(--hud-line);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--hud-muted);
  cursor: pointer;
}

.hud-close-button:hover {
  color: var(--hud-white);
  background: rgba(255, 255, 255, 0.06);
}

.hud-badges {
  margin-top: 13px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.hud-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 24px;
  padding: 0 8px;
  border: 1px solid var(--hud-line);
  border-radius: 999px;
  color: var(--hud-muted);
  background: rgba(255, 255, 255, 0.028);
  font-size: 9px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.hud-badge.is-accent {
  color: var(--hud-accent);
  border-color: color-mix(in srgb, var(--hud-accent) 26%, transparent);
  background: var(--hud-accent-bg);
}

.hud-badge.is-procedural {
  color: rgba(206, 184, 255, 0.88);
  border-color: rgba(177, 146, 255, 0.24);
  background: rgba(177, 146, 255, 0.07);
}

.hud-inspector-body {
  padding: 14px 18px 17px;
}

.hud-description {
  color: var(--hud-text);
  font-size: 12px;
  line-height: 1.6;
}

.hud-metric-grid {
  margin-top: 15px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.hud-metric {
  min-width: 0;
  padding: 11px 12px;
  border-top: 1px solid var(--hud-line);
}

.hud-metric.is-wide {
  grid-column: 1 / -1;
}

.hud-metric-label {
  color: var(--hud-faint);
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.11em;
}

.hud-metric-value {
  margin: 4px 0;
  color: var(--hud-white);
  font-size: 12px;
  line-height: 1.4;
  font-feature-settings: "lnum", "tnum";
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hud-metric-hint {
  margin: 2px 0 0;
  color: var(--hud-muted);
  font-size: 9px;
  font-feature-settings: "lnum", "tnum";
}

.hud-confidence {
  margin: 12px 0;
  padding-top: 11px;
  border-top: 1px solid var(--hud-line);
}

.hud-confidence-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.hud-confidence-value {
  color: var(--hud-white);
  font-size: 12px;
}

.hud-confidence-track {
  margin-top: 8px;
  width: 100%;
  height: 3px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  overflow: hidden;
}

.hud-confidence-fill {
  width: var(--confidence, 0%);
  height: 100%;
  background: var(--hud-accent);
}

.hud-actions {
  margin-top: 15px;
  display: flex;
  gap: 7px;
}

.hud-action-button {
  flex: 1;
  min-width: 0;
  height: 34px;
  border: 1px solid var(--hud-line);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.025);
  color: var(--hud-text);
  cursor: pointer;
  font-size: 10px;
  transition:
    background 150ms ease,
    border-color 150ms ease,
    color 150ms ease;
}

.hud-action-button:hover {
  border-color: var(--hud-line-strong);
  color: var(--hud-white);
  background: rgba(255, 255, 255, 0.055);
}

.hud-action-button.is-primary {
  border-color: color-mix(in srgb, var(--hud-accent) 30%, transparent);
  background: var(--hud-accent-bg);
  color: var(--hud-accent);
}

.hud-science {
  margin-top: 8px;
  border-top: 1px solid var(--hud-line);
}

.hud-science-toggle {
  width: 100%;
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 0;
  color: var(--hud-muted);
  background: transparent;
  cursor: pointer;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.hud-science-toggle:hover {
  color: var(--hud-white);
}

.hud-science-content {
  padding-bottom: 3px;
}

.hud-source-line {
  margin-top: 9px;
  color: var(--hud-muted);
  font-size: 9px;
  line-height: 1.5;
}

.hud-source-label {
  color: var(--hud-faint);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.hud-humanity {
  position: absolute;
  left: 18px;
  bottom: 96px;
  width: min(320px, calc(100vw - 36px));
  padding: 12px 14px;
  border-left: 1px solid var(--hud-line-strong);
  background: linear-gradient(
    90deg,
    rgba(7, 18, 35, 0.58),
    rgba(7, 18, 35, 0.12),
    transparent
  );
}

.hud-humanity-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.hud-humanity-status {
  color: var(--hud-white);
  font-size: 14px;
}

.hud-humanity-kardashev {
  color: var(--hud-accent);
  font-size: 11px;
  white-space: nowrap;
}

.hud-humanity-meta {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  color: var(--hud-muted);
  font-size: 9px;
}

.hud-humanity-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.hud-humanity-meta-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--hud-faint);
}

.hud-camera {
  position: absolute;
  right: 18px;
  bottom: 96px;
  display: flex;
  align-items: center;
  gap: 6px;
  pointer-events: auto;
}

.hud-camera-mode {
  display: inline-flex;
  align-items: center;
  height: 36px;
  padding: 0 6px;
  gap: 2px;
  border: 1px solid var(--hud-line);
  border-radius: 12px;
  background: rgba(7, 18, 35, 0.52);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.hud-camera-button {
  height: 26px;
  padding: 0 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--hud-muted);
  cursor: pointer;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.hud-camera-button:hover {
  color: var(--hud-white);
}

.hud-camera-button.is-active {
  color: var(--hud-accent);
  background: var(--hud-accent-bg);
}

.hud-bottom {
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.hud-bottom-left,
.hud-bottom-center,
.hud-bottom-right {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.hud-control-strip {
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 46px;
  padding: 4px 6px;
  border: 1px solid var(--hud-line);
  border-radius: 15px;
  background: rgba(7, 18, 35, 0.58);
  backdrop-filter: blur(19px);
  -webkit-backdrop-filter: blur(19px);
}

.hud-strip-button {
  min-width: 36px;
  height: 36px;
  padding: 0 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--hud-muted);
  cursor: pointer;
  font-size: 10px;
  transition:
    color 150ms ease,
    background 150ms ease;
}

.hud-strip-button:hover {
  color: var(--hud-white);
  background: rgba(255, 255, 255, 0.05);
}

.hud-strip-button.is-active {
  color: var(--hud-accent);
  background: var(--hud-accent-bg);
}

.hud-strip-label {
  display: none;
}

.hud-clock {
  min-width: 170px;
  height: 46px;
  padding: 0 13px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border: 1px solid var(--hud-line);
  border-radius: 15px;
  background: rgba(7, 18, 35, 0.58);
  backdrop-filter: blur(19px);
  -webkit-backdrop-filter: blur(19px);
}

.hud-clock-date {
  color: var(--hud-white);
  font-size: 12px;
  line-height: 1.1;
}

.hud-clock-subtitle {
  margin-top: 4px;
  color: var(--hud-muted);
  font-size: 8px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hud-time-rate {
  min-width: 74px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  border: 1px solid var(--hud-line);
  border-radius: 15px;
  background: rgba(7, 18, 35, 0.58);
  color: var(--hud-text);
  font-size: 10px;
  backdrop-filter: blur(19px);
  -webkit-backdrop-filter: blur(19px);
}

.hud-status {
  height: 46px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 11px;
  border: 1px solid var(--hud-line);
  border-radius: 15px;
  background: rgba(7, 18, 35, 0.58);
  color: var(--hud-muted);
  font-size: 9px;
  backdrop-filter: blur(19px);
  -webkit-backdrop-filter: blur(19px);
}

.hud-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--hud-accent);
}

.hud-performance {
  position: absolute;
  top: 18px;
  right: 18px;
  margin-top: 88px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--hud-faint);
  font-size: 8px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  pointer-events: none;
}

.hud-divider {
  width: 1px;
  height: 10px;
  background: var(--hud-line);
}

.hud-location {
  position: absolute;
  left: 18px;
  top: 91px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  pointer-events: none;
}

.hud-location-primary {
  color: var(--hud-white);
  font-size: 10px;
}

.hud-location-secondary {
  color: var(--hud-faint);
  font-size: 8px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.hud-crosshair {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 26px;
  height: 26px;
  transform: translate(-50%, -50%);
  pointer-events: none;
  opacity: 0.36;
}

.hud-crosshair::before,
.hud-crosshair::after {
  content: "";
  position: absolute;
  background: rgba(225, 241, 255, 0.70);
}

.hud-crosshair::before {
  top: 50%;
  left: 3px;
  right: 3px;
  height: 1px;
  transform: translateY(-50%);
}

.hud-crosshair::after {
  left: 50%;
  top: 3px;
  bottom: 3px;
  width: 1px;
  transform: translateX(-50%);
}

.hud-toast-stack {
  position: absolute;
  top: 156px;
  left: 50%;
  transform: translateX(-50%);
  width: min(380px, calc(100vw - 36px));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  pointer-events: none;
}

.hud-toast {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 11px;
  border: 1px solid var(--hud-line);
  border-radius: 10px;
  background: rgba(7, 18, 35, 0.74);
  color: var(--hud-text);
  font-size: 10px;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  box-shadow: var(--hud-shadow);
}

.hud-toast-icon {
  color: var(--hud-accent);
}

.hud-kicker {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.hud-kicker-line {
  width: 18px;
  height: 1px;
  background: var(--hud-accent);
}

.hud-knowledge-note {
  margin-top: 12px;
  padding: 9px 10px;
  border-left: 2px solid color-mix(in srgb, var(--hud-accent) 52%, transparent);
  background: rgba(143, 212, 255, 0.045);
  color: var(--hud-muted);
  font-size: 9px;
  line-height: 1.55;
}

.hud-science-mode .hud-inspector-glass {
  background: rgba(5, 14, 29, 0.72);
}

.hud-science-mode .hud-scale {
  width: min(310px, calc(100vw - 120px));
}

.hud-empty-inspector {
  padding: 17px 18px;
}

.hud-empty-title {
  color: var(--hud-white);
  font-size: 15px;
}

.hud-empty-text {
  margin-top: 6px;
  color: var(--hud-muted);
  font-size: 10px;
  line-height: 1.55;
}

.hud-command-hint {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.hud-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 21px;
  padding: 0 6px;
  border: 1px solid var(--hud-line);
  border-radius: 6px;
  color: var(--hud-muted);
  background: rgba(255, 255, 255, 0.025);
  font-size: 8px;
}

.hud-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (min-width: 1180px) {
  .hud-strip-label {
    display: inline;
  }

  .hud-strip-button {
    min-width: auto;
  }
}

@media (max-width: 900px) {
  .hud-topbar {
    right: 12px;
    left: 12px;
  }

  .hud-brand-subtitle,
  .hud-pill,
  .hud-performance {
    display: none;
  }

  .hud-search {
    top: 70px;
    width: min(500px, calc(100vw - 32px));
  }

  .hud-left-rail {
    left: 12px;
  }

  .hud-scale {
    left: 70px;
  }

  .hud-inspector {
    right: 12px;
    top: 136px;
    width: min(340px, calc(100vw - 24px));
    max-height: calc(100vh - 230px);
  }

  .hud-humanity {
    left: 12px;
    bottom: 83px;
  }

  .hud-camera {
    right: 12px;
    bottom: 83px;
  }

  .hud-bottom {
    left: 12px;
    right: 12px;
    bottom: 12px;
  }

  .hud-clock,
  .hud-time-rate,
  .hud-status {
    display: none;
  }
}

@media (max-width: 680px) {
  .hud-top-actions {
    gap: 5px;
  }

  .hud-mode-button {
    min-width: 62px;
  }

  .hud-search {
    top: 64px;
  }

  .hud-location {
    top: 117px;
    left: 12px;
  }

  .hud-scale {
    top: 153px;
    left: 58px;
    width: 185px;
  }

  .hud-left-rail {
    top: 151px;
    width: 40px;
  }

  .hud-icon-button {
    width: 36px;
    height: 36px;
    border-radius: 11px;
  }

  .hud-inspector {
    top: auto;
    left: 12px;
    right: 12px;
    bottom: 73px;
    width: auto;
    max-height: min(58vh, 490px);
  }

  .hud-inspector-glass {
    border-radius: 17px;
  }

  .hud-humanity {
    display: none;
  }

  .hud-camera {
    display: none;
  }

  .hud-bottom {
    justify-content: center;
  }

  .hud-bottom-left {
    display: none;
  }

  .hud-bottom-center,
  .hud-bottom-right {
    min-width: 0;
  }

  .hud-control-strip {
    min-height: 42px;
  }

  .hud-strip-button {
    height: 32px;
    min-width: 32px;
    padding: 0 7px;
  }

  .hud-crosshair {
    display: none;
  }
}

@media (max-width: 420px) {
  .hud-topbar {
    top: 10px;
  }

  .hud-brand-mark {
    width: 33px;
    height: 33px;
  }

  .hud-brand-title {
    font-size: 13px;
  }

  .hud-mode-switch {
    transform: scale(0.92);
    transform-origin: right center;
  }

  .hud-search {
    top: 56px;
  }

  .hud-search-shell {
    height: 45px;
  }

  .hud-scale {
    top: 137px;
    left: 54px;
    width: 155px;
  }

  .hud-inspector {
    bottom: 68px;
  }

  .hud-entity-name {
    font-size: 20px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hud-icon-button,
  .hud-mode-button,
  .hud-strip-button,
  .hud-search-result,
  .hud-action-button {
    transition: none;
  }
}
`;

const SCALE_LABELS: Record<ScaleBand, string> = {
  surface: "Surface",
  regional: "Regional",
  planet: "Planet",
  orbital: "Orbital",
  system: "System",
  stellar: "Stellar",
  galactic: "Galactic",
  intergalactic: "Intergalactic",
  cosmic: "Cosmic",
};

const SCALE_ORDER: ScaleBand[] = [
  "surface",
  "regional",
  "planet",
  "orbital",
  "system",
  "stellar",
  "galactic",
  "intergalactic",
  "cosmic",
];

const CAMERA_LABELS: Record<CameraMode, string> = {
  orbit: "Orbit",
  free: "Free",
  surface: "Surface",
  chase: "Chase",
  cinematic: "Cinematic",
  scale: "Scale",
  observer: "Observer",
};

function Icon({
  name,
  size = 17,
  strokeWidth = 1.6,
}: IconProps): React.ReactElement {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
      );

    case "home":
      return (
        <svg {...common}>
          <path d="m3.5 10.6 8.5-7 8.5 7" />
          <path d="M5.5 9.5v10h13v-10" />
          <path d="M9.5 19.5v-5h5v5" />
        </svg>
      );

    case "target":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7.5" />
          <circle cx="12" cy="12" r="2.4" />
          <path d="M12 2v3" />
          <path d="M12 19v3" />
          <path d="M2 12h3" />
          <path d="M19 12h3" />
        </svg>
      );

    case "layers":
      return (
        <svg {...common}>
          <path d="m12 3 8 4.3-8 4.2-8-4.2L12 3Z" />
          <path d="m4 12 8 4.3 8-4.3" />
          <path d="m4 16.5 8 4.2 8-4.2" />
        </svg>
      );

    case "globe":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.8 9.5h16.4" />
          <path d="M3.8 14.5h16.4" />
          <path d="M12 3.5c2.3 2.2 3.4 5 3.4 8.5S14.3 18.3 12 20.5c-2.3-2.2-3.4-5-3.4-8.5S9.7 5.7 12 3.5Z" />
        </svg>
      );

    case "orbit":
      return (
        <svg {...common}>
          <ellipse cx="12" cy="12" rx="9" ry="4.3" transform="rotate(-24 12 12)" />
          <ellipse cx="12" cy="12" rx="9" ry="4.3" transform="rotate(28 12 12)" />
          <circle cx="12" cy="12" r="1.8" />
        </svg>
      );

    case "crosshair":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="6.8" />
          <path d="M12 2v3.5" />
          <path d="M12 18.5V22" />
          <path d="M2 12h3.5" />
          <path d="M18.5 12H22" />
        </svg>
      );

    case "play":
      return (
        <svg {...common}>
          <path d="m8 5 11 7-11 7V5Z" />
        </svg>
      );

    case "pause":
      return (
        <svg {...common}>
          <path d="M8 5v14" />
          <path d="M16 5v14" />
        </svg>
      );

    case "step":
      return (
        <svg {...common}>
          <path d="M7 5v14" />
          <path d="m7 12 9-7v14l-9-7Z" />
        </svg>
      );

    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="2.4" />
          <path d="M19 13.2a7.9 7.9 0 0 0 0-2.4l2-1.5-1.8-3-2.3.9a7.4 7.4 0 0 0-2.1-1.2L14.5 3h-5l-.3 3a7.4 7.4 0 0 0-2.1 1.2l-2.3-.9-1.8 3 2 1.5a7.9 7.9 0 0 0 0 2.4l-2 1.5 1.8 3 2.3-.9a7.4 7.4 0 0 0 2.1 1.2l.3 3h5l.3-3a7.4 7.4 0 0 0 2.1-1.2l2.3.9 1.8-3-2-1.5Z" />
        </svg>
      );

    case "info":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 10.5v5" />
          <path d="M12 7.5h.01" />
        </svg>
      );

    case "close":
      return (
        <svg {...common}>
          <path d="m6 6 12 12" />
          <path d="m18 6-12 12" />
        </svg>
      );

    case "chevron":
      return (
        <svg {...common}>
          <path d="m8 10 4 4 4-4" />
        </svg>
      );

    case "chevron-right":
      return (
        <svg {...common}>
          <path d="m9 5 7 7-7 7" />
        </svg>
      );

    case "back":
      return (
        <svg {...common}>
          <path d="M19 12H5" />
          <path d="m11 18-6-6 6-6" />
        </svg>
      );

    case "up":
      return (
        <svg {...common}>
          <path d="M12 19V5" />
          <path d="m6 11 6-6 6 6" />
        </svg>
      );

    case "down":
      return (
        <svg {...common}>
          <path d="M12 5v14" />
          <path d="m6 13 6 6 6-6" />
        </svg>
      );

    case "compare":
      return (
        <svg {...common}>
          <path d="M5 18V9" />
          <path d="M12 18V5" />
          <path d="M19 18v-6" />
          <path d="M3 18h18" />
        </svg>
      );

    case "discovery":
      return (
        <svg {...common}>
          <path d="M12 3.5 14 9l5.5 2-5.5 2-2 5.5-2-5.5-5.5-2L10 9l2-5.5Z" />
          <path d="m18.5 4 .7 1.8L21 6.5l-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" />
        </svg>
      );

    case "satellite":
      return (
        <svg {...common}>
          <path d="m8 14 6-6" />
          <path d="m5 17 2-2" />
          <path d="m17 7 2-2" />
          <path d="m9 6 9 9" />
          <path d="m13 3 8 8" />
          <path d="M5 12 2 9l4-4 3 3" />
        </svg>
      );

    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v5l3.5 2" />
        </svg>
      );

    case "cpu":
      return (
        <svg {...common}>
          <rect x="7" y="7" width="10" height="10" rx="1.5" />
          <path d="M9 2v3" />
          <path d="M15 2v3" />
          <path d="M9 19v3" />
          <path d="M15 19v3" />
          <path d="M2 9h3" />
          <path d="M2 15h3" />
          <path d="M19 9h3" />
          <path d="M19 15h3" />
        </svg>
      );

    case "keyboard":
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M7 10h.01" />
          <path d="M10 10h.01" />
          <path d="M13 10h.01" />
          <path d="M16 10h.01" />
          <path d="M7 14h10" />
        </svg>
      );

    case "mouse":
      return (
        <svg {...common}>
          <rect x="7" y="3" width="10" height="18" rx="5" />
          <path d="M12 3v5" />
          <path d="M12 8v3" />
        </svg>
      );

    case "layers-off":
      return (
        <svg {...common}>
          <path d="m8.5 4.8 3.5-1.8 8 4.3-3 1.6" />
          <path d="m4 12 8 4.3 3-1.6" />
          <path d="m4 16.5 8 4.2 4-2.1" />
          <path d="m3 3 18 18" />
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

function GlassButton({
  children,
  label,
  active = false,
  subtle = false,
  disabled = false,
  onClick,
  className = "",
  title,
}: GlassButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      className={[
        "hud-icon-button",
        active ? "is-active" : "",
        subtle ? "is-subtle" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      aria-label={label}
    >
      {children}
    </button>
  );
}

function Metric({
  label,
  value,
  hint,
  wide = false,
}: MetricProps): React.ReactElement {
  return (
    <div className={`hud-metric ${wide ? "is-wide" : ""}`}>
      <div className="hud-metric-label">{label}</div>
      <div className="hud-metric-value" title={value}>
        {value}
      </div>
      {hint ? <div className="hud-metric-hint">{hint}</div> : null}
    </div>
  );
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(value);
}

function formatScientific(value: number): string {
  if (!Number.isFinite(value) || value === 0) {
    return "0";
  }

  const abs = Math.abs(value);

  if (abs >= 1e6 || abs < 1e-3) {
    return value.toExponential(2).replace("+", "");
  }

  if (abs >= 1000) {
    return formatInteger(value);
  }

  return formatNumber(value, 2);
}

function formatDistanceMeters(meters: number): string {
  if (!Number.isFinite(meters)) {
    return "Unknown";
  }

  const abs = Math.abs(meters);

  if (abs < 1_000) {
    return `${formatNumber(meters, 1)} m`;
  }

  if (abs < 1_000_000_000) {
    return `${formatNumber(meters / 1_000, 2)} km`;
  }

  if (abs < 1_000_000_000_000) {
    return `${formatNumber(meters / 1_000_000_000, 2)} million km`;
  }

  if (abs < 149_597_870_700) {
    return `${formatNumber(meters / 149_597_870_700, 2)} AU`;
  }

  if (abs < 9.4607e15) {
    return `${formatNumber(meters / 149_597_870_700, 2)} AU`;
  }

  if (abs < 3.0857e16) {
    return `${formatNumber(meters / 9.4607e15, 2)} ly`;
  }

  return `${formatScientific(meters / 3.0857e16)} ly`;
}

function formatMassKg(mass: number): string {
  if (!Number.isFinite(mass)) {
    return "Unknown";
  }

  if (Math.abs(mass) >= 1e27) {
    return `${formatScientific(mass)} kg`;
  }

  if (Math.abs(mass) >= 1e24) {
    return `${formatNumber(mass / 1e24, 2)} Ã— 10Â²â´ kg`;
  }

  if (Math.abs(mass) >= 1e21) {
    return `${formatNumber(mass / 1e21, 2)} Ã— 10Â²Â¹ kg`;
  }

  return `${formatScientific(mass)} kg`;
}

function formatTemperature(value: number): string {
  if (!Number.isFinite(value)) {
    return "Unknown";
  }

  return `${formatNumber(value, 0)} K`;
}

function formatPower(watts: number): string {
  if (!Number.isFinite(watts)) {
    return "Unknown";
  }

  const abs = Math.abs(watts);

  if (abs >= 1e24) {
    return `${formatNumber(watts / 1e24, 2)} YW`;
  }

  if (abs >= 1e21) {
    return `${formatNumber(watts / 1e21, 2)} ZW`;
  }

  if (abs >= 1e18) {
    return `${formatNumber(watts / 1e18, 2)} EW`;
  }

  if (abs >= 1e15) {
    return `${formatNumber(watts / 1e15, 2)} PW`;
  }

  if (abs >= 1e12) {
    return `${formatNumber(watts / 1e12, 2)} TW`;
  }

  if (abs >= 1e9) {
    return `${formatNumber(watts / 1e9, 2)} GW`;
  }

  if (abs >= 1e6) {
    return `${formatNumber(watts / 1e6, 2)} MW`;
  }

  if (abs >= 1e3) {
    return `${formatNumber(watts / 1e3, 2)} kW`;
  }

  return `${formatNumber(watts, 1)} W`;
}

function humanizeKind(kind?: string): string {
  if (!kind) {
    return "Entity";
  }

  return kind
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function humanizeRealityClass(value?: KnowledgeClass): string {
  switch (value) {
    case "observed":
      return "Observed";
    case "measured":
      return "Measured";
    case "estimated":
      return "Estimated";
    case "theoretical":
      return "Theoretical";
    case "procedural":
      return "Procedural simulation";
    default:
      return "Knowledge class unavailable";
  }
}

function knowledgeColorClass(value?: KnowledgeClass): string {
  if (value === "procedural") {
    return "is-procedural";
  }

  if (value === "observed" || value === "measured") {
    return "is-accent";
  }

  return "";
}

function mapSpaceEntityToHud(entity: SpaceEntity): HudEntityLike {
  // The entity's physical properties come wrapped in ScientificValue objects
  // that carry both the number and evidence/confidence metadata.
  const physical = entity.physical;

  // Pull the raw values out of the wrappers.  If any property is missing,
  // the optional-chaining pattern ensures we get undefined rather than crashing.
  const radiusMeters = physical?.radiusM?.value;
  const massKg = physical?.massKg?.value;
  const densityKgM3 = physical?.densityKgM3?.value;
  const temperatureK = physical?.temperatureK?.value;
  const surfaceGravityMs2 = physical?.surfaceGravityMs2?.value;

  // Build the HudEntityLike shape that the HUD components expect.
  // Fields that the underlying data doesn't provide are left as undefined
  // rather than being fake- —  the UI will simply show "Unknown" which is
  // more honest than inventing a number.
  return {
    id: entity.id,
    name: entity.name,
    kind: entity.kind,
    parentId: entity.parentId,
    frameId: entity.spatial && entity.spatial.frameId,
    description: entity.summary,
    subtype: undefined,
    // The reality class label comes from the evidence string on the radius
    // measurement.  "measured" → "Measured", "estimated" → "Estimated", etc.
    realityClass: physical?.radiusM?.evidence as KnowledgeClass | undefined,
    evidenceLevel: physical?.radiusM?.evidence,
    knowledge: {
      // Confidence is stored as a 0–1 number on the radius measurement.
      confidence: physical?.radiusM?.confidence,
      // Mirror the evidence string as a class name so the HUD can colour-code
      // the entity row (e.g. "is-accent" for observed/measured bodies).
      class: physical?.radiusM?.evidence as KnowledgeClass | undefined,
      // Preserve the source IDs so the "More Information" section can cite
      // where the numbers came from.
      sources: entity.sourceIds != null ? [...entity.sourceIds] : undefined,
    },
    scientific: {
      // The scientific block mirrors knowledge; keep them in sync so either
      // can be used by downstream code without a separate mapping step.
      confidence: physical?.radiusM?.confidence,
      evidenceLevel: physical?.radiusM?.evidence,
      sources: entity.sourceIds != null ? [...entity.sourceIds] : undefined,
    },
    physical: {
      // These are the numeric values the HUD metric cards display.
      radiusMeters,
      massKg,
      densityKgM3,
      temperatureK,
      // Luminosity is only meaningful for stars; for planets/moons it's
      // always undefined — showing "Unknown" is the correct honest response.
      luminosityW: undefined,
      // Surface gravity derived from mass / radius² using the gravitational
      // constant.  If the catalog didn't compute it, we leave it undefined.
      gravityMs2: surfaceGravityMs2,
      // Albedo (reflectivity) isn't part of the standard solar-system body
      // definitions, so we leave it undefined rather than guessing.
      albedo: undefined,
    },
    properties: {
      // The "quick-stats" strip beneath the main metrics re-uses these same
      // values so the layout stays consistent without duplicated logic.
      radiusMeters,
      massKg,
      densityKgM3,
      temperatureK,
      luminosityW: undefined,
      gravityMs2: surfaceGravityMs2,
      albedo: undefined,
    },
    // Free-form metadata — aliases (a.k.a. alternate names) and tags (topic
    // labels used in search/filter).  If the entity has neither, we assign
    // an empty array rather than omitting the key so the UI rendering code
    // doesn't need extra null checks.
    metadata: {
      aliases: entity.aliases != null ? [...entity.aliases] : [],
      tags: entity.tags != null ? [...entity.tags] : [],
    },
  };
}

function getHudEntity(entity: unknown): HudEntityLike | undefined {
  if (!entity || typeof entity !== "object") {
    return undefined;
  }

  // Check if it's already a HudEntityLike (has HudEntityLike properties)
  const candidate = entity as Record<string, unknown>;
  if ("physical" in candidate && candidate.physical && typeof candidate.physical === "object" && "radiusMeters" in (candidate.physical as Record<string, unknown>)) {
    return entity as HudEntityLike;
  }

  // Check if it's a SpaceEntity (has physical.radiusM structure)
  if ("physical" in candidate && candidate.physical && typeof candidate.physical === "object" && "radiusM" in (candidate.physical as Record<string, unknown>)) {
    return mapSpaceEntityToHud(entity as SpaceEntity);
  }

  return entity as HudEntityLike;
}

function getPhysicalProperties(
  entity?: HudEntityLike,
): HudEntityLike["physical"] | HudEntityLike["properties"] {
  return entity?.physical ?? entity?.properties;
}

function getKnowledgeClass(entity?: HudEntityLike): KnowledgeClass | undefined {
  return (
    entity?.realityClass ??
    entity?.knowledge?.class ??
    undefined
  );
}

function getConfidence(entity?: HudEntityLike): number | undefined {
  const raw =
    entity?.knowledge?.confidence ??
    entity?.scientific?.confidence;

  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return undefined;
  }

  if (raw > 1) {
    return Math.max(0, Math.min(1, raw / 100));
  }

  return Math.max(0, Math.min(1, raw));
}

function formatAstroDate(value: unknown): string {
  if (value instanceof Date) {
    return value.toLocaleString("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "date" in value &&
    value.date instanceof Date
  ) {
    return value.date.toLocaleString("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  if (typeof value === "string") {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString("en-GB", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    }
  }

  return "Current simulation time";
}

function scaleProgress(band: ScaleBand): number {
  const index = SCALE_ORDER.indexOf(band);

  if (index < 0) {
    return 0;
  }

  return (index / (SCALE_ORDER.length - 1)) * 100;
}

function scaleReadout(state: UniverseState): string {
  const metersPerUnit = state.scale.metersPerUnit;

  if (!Number.isFinite(metersPerUnit) || metersPerUnit <= 0) {
    return "Surface reference";
  }

  return `${formatDistanceMeters(metersPerUnit)} / unit`;
}

function frameLabel(frameId: string | undefined): string {
  if (!frameId) {
    return "Reference frame unavailable";
  }

  if (frameId === "root") {
    return "Universal reference frame";
  }

  return frameId
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getEntitySearchText(entity: HudEntityLike): string {
  return [
    entity.name,
    entity.kind,
    entity.subtype,
    entity.description,
    entity.id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getParentChain(
  state: UniverseState,
  entity?: HudEntityLike,
): HudEntityLike[] {
  if (!entity?.parentId) {
    return [];
  }

  const chain: HudEntityLike[] = [];
  let nextId: EntityId | undefined = entity.parentId;
  const visited = new Set<EntityId>();

  while (nextId && !visited.has(nextId) && chain.length < 8) {
    visited.add(nextId);

    const nextEntity = getHudEntity(state.entities.get(nextId));

    if (!nextEntity) {
      break;
    }

    chain.push(nextEntity);
    nextId = nextEntity.parentId;
  }

  return chain.reverse();
}

function useStableString(value: string, delay: number): string {
  const [stableValue, setStableValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStableValue(value);
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [value, delay]);

  return stableValue;
}

function SearchResults({
  entities,
  query,
  onSelect,
}: {
  entities: HudEntityLike[];
  query: string;
  onSelect: (id: EntityId) => void;
}): React.ReactElement | null {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  const matches = entities
    .filter((entity) => getEntitySearchText(entity).includes(normalized))
    .slice(0, 8);

  if (matches.length === 0) {
    return (
      <div className="hud-search-results hud-interactive">
        <div className="hud-search-result">
          <div className="hud-search-result-marker">
            <Icon name="search" size={13} />
          </div>
          <div className="hud-search-result-copy">
            <div className="hud-search-result-name">
              No known entity matches
            </div>
            <div className="hud-search-result-meta">
              Try a planet, moon, star, galaxy, catalog identifier, or procedural coordinate.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hud-search-results hud-interactive">
      {matches.map((entity) => (
        <button
          key={String(entity.id)}
          type="button"
          className="hud-search-result"
          onClick={() => onSelect(entity.id)}
        >
          <div className="hud-search-result-marker">
            <Icon
              name={
                entity.kind?.toLowerCase().includes("star")
                  ? "orbit"
                  : entity.kind?.toLowerCase().includes("planet")
                    ? "globe"
                    : "target"
              }
              size={13}
            />
          </div>

          <div className="hud-search-result-copy">
            <div className="hud-search-result-name">
              {entity.name ?? String(entity.id)}
            </div>

            <div className="hud-search-result-meta">
              {humanizeKind(entity.kind)}
              {entity.frameId ? ` Â· ${frameLabel(entity.frameId)}` : ""}
            </div>
          </div>

          <Icon name="chevron-right" size={13} />
        </button>
      ))}
    </div>
  );
}

function SearchBar({
  state,
  query,
  setQuery,
  onSearch,
  onSearchSelect,
}: {
  state: UniverseState;
  query: string;
  setQuery: (value: string) => void;
  onSearch?: (query: string) => void;
  onSearchSelect?: (id: EntityId) => void;
}): React.ReactElement {
  const allEntities = useMemo(
    () =>
      Array.from(state.entities.values())
        .map((entity) => getHudEntity(entity))
        .filter((entity): entity is HudEntityLike => Boolean(entity)),
    [state.entities],
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const value = query.trim();

    if (!value) {
      return;
    }

    onSearch?.(value);
  };

  const handleKeyDown = (
    event: ReactKeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Escape") {
      setQuery("");
      event.currentTarget.blur();
    }
  };

  return (
    <div className="hud-search">
      <form className="hud-search-shell hud-interactive" onSubmit={submit}>
        <div className="hud-search-icon">
          <Icon name="search" size={16} />
        </div>

        <input
          id="universe-search"
          className="hud-search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search the known universe"
          aria-label="Search the known universe"
          autoComplete="off"
          spellCheck={false}
        />

        <div className="hud-search-hint">/</div>
      </form>

      <SearchResults
        entities={allEntities}
        query={query}
        onSelect={(id) => {
          onSearchSelect?.(id);
          setQuery("");
        }}
      />
    </div>
  );
}

function LocationReadout({
  state,
  locationLabel,
  coordinateLabel,
}: {
  state: UniverseState;
  locationLabel?: string;
  coordinateLabel?: string;
}): React.ReactElement {
  const selected = state.selectedId
    ? getHudEntity(state.entities.get(state.selectedId))
    : undefined;

  const focus = state.focusId
    ? getHudEntity(state.entities.get(state.focusId))
    : undefined;

  const primary =
    locationLabel ??
    selected?.name ??
    focus?.name ??
    frameLabel(state.camera.frameId);

  const secondary =
    coordinateLabel ??
    `${humanizeKind(selected?.kind)} Â· ${frameLabel(state.scale.frameId)}`;

  return (
    <div className="hud-location">
      <div className="hud-location-primary">{primary}</div>
      <div className="hud-location-secondary">{secondary}</div>
    </div>
  );
}

function ScaleIndicator({
  state,
  mode,
  onScaleChange,
  onSemanticZoom,
}: {
  state: UniverseState;
  mode: HudMode;
  onScaleChange?: (band: ScaleBand) => void;
  onSemanticZoom?: (direction: -1 | 1) => void;
}): React.ReactElement {
  const progress = scaleProgress(state.scale.band);
  const currentIndex = SCALE_ORDER.indexOf(state.scale.band);

  const previousScale = (): void => {
    if (currentIndex <= 0) {
      onSemanticZoom?.(-1);
      return;
    }

    onScaleChange?.(SCALE_ORDER[currentIndex - 1]);
  };

  const nextScale = (): void => {
    if (currentIndex >= SCALE_ORDER.length - 1) {
      onSemanticZoom?.(1);
      return;
    }

    onScaleChange?.(SCALE_ORDER[currentIndex + 1]);
  };

  const style = {
    "--progress": `${progress}%`,
  } as CSSProperties;

  return (
    <div className={`hud-scale ${mode === "science" ? "hud-science-mode" : ""}`}>
      <div className="hud-kicker">
        <div className="hud-kicker-line" />
        <div className="hud-eyebrow">Scale</div>
      </div>

      <div className="hud-scale-name">
        {SCALE_LABELS[state.scale.band]}
      </div>

      <div className="hud-scale-readout">
        {scaleReadout(state)} Â· {frameLabel(state.scale.frameId)}
      </div>

      <div
        className="hud-scale-track"
        aria-label={`Current scale ${SCALE_LABELS[state.scale.band]}`}
      >
        <div className="hud-scale-progress" style={style} />
        <div className="hud-scale-knob" style={style} />
      </div>

      <div className="hud-scale-labels">
        <span>Surface</span>
        <span>Cosmic</span>
      </div>

      <div
        className="hud-command-hint hud-interactive"
        style={{ marginTop: 10 }}
      >
        <button
          type="button"
          className="hud-key"
          onClick={previousScale}
          title="Move down one semantic scale band"
        >
          Wheel âˆ’
        </button>

        <button
          type="button"
          className="hud-key"
          onClick={nextScale}
          title="Move up one semantic scale band"
        >
          Wheel +
        </button>
      </div>
    </div>
  );
}

function Inspector({
  state,
  mode,
  onSelect,
  onFocus,
  onNavigate,
  onCompareScale,
}: {
  state: UniverseState;
  mode: HudMode;
  onSelect?: (id: EntityId | null) => void;
  onFocus?: (id: EntityId | null) => void;
  onNavigate?: (direction: "parent" | "child" | "previous" | "next") => void;
  onCompareScale?: () => void;
}): React.ReactElement {
  const [scienceExpanded, setScienceExpanded] = useState(mode === "science");

  useEffect(() => {
    if (mode === "science") {
      setScienceExpanded(true);
    }
  }, [mode]);

  if (!state.selectedId) {
    return (
      <aside className="hud-inspector">
        <div className="hud-inspector-glass hud-empty-inspector">
          <div className="hud-eyebrow">Observer</div>
          <div className="hud-empty-title">Nothing selected</div>
          <div className="hud-empty-text">
            Select an object in the scene to inspect it. Double-click can become
            focus or travel once the renderer navigation layer is connected.
          </div>

          <div className="hud-command-hint">
            <span className="hud-key">Click</span>
            <span className="hud-key">Select</span>
            <span className="hud-key">Double-click</span>
            <span className="hud-key">Travel</span>
            <span className="hud-key">?</span>
            <span className="hud-key">Discover</span>
          </div>
        </div>
      </aside>
    );
  }

  const selected = getHudEntity(state.entities.get(state.selectedId));

  if (!selected) {
    return (
      <aside className="hud-inspector">
        <div className="hud-inspector-glass hud-empty-inspector">
          <div className="hud-eyebrow">Observer</div>
          <div className="hud-empty-title">Selection unavailable</div>
          <div className="hud-empty-text">
            The selected entity is not currently present in the active
            streaming set.
          </div>
        </div>
      </aside>
    );
  }

  const properties = getPhysicalProperties(selected);
  const knowledgeClass = getKnowledgeClass(selected);
  const confidence = getConfidence(selected);
  const parents = getParentChain(state, selected);

  const parentLabel =
    parents.length > 0
      ? parents.map((item) => item.name ?? item.id).join(" / ")
      : "Root reference";

  const description =
    selected.description ??
    `A ${humanizeKind(selected.kind).toLowerCase()} in the current ${SCALE_LABELS[state.scale.band].toLowerCase()} view.`;

  const sources =
    selected.knowledge?.sources ??
    selected.scientific?.sources ??
    [];

  return (
    <aside className="hud-inspector">
      <div className="hud-inspector-glass">
        <div className="hud-inspector-head">
          <div className="hud-inspector-head-row">
            <div>
              <div className="hud-entity-kind">
                {humanizeKind(selected.kind)}
              </div>

              <div className="hud-entity-name">
                {selected.name ?? String(selected.id)}
              </div>

              <div className="hud-entity-subtitle">
                {selected.subtype
                  ? `${selected.subtype} Â· `
                  : ""}
                {frameLabel(selected.frameId)}
              </div>
            </div>

            <button
              type="button"
              className="hud-close-button hud-interactive"
              onClick={() => onSelect?.(null)}
              aria-label="Close inspector"
              title="Deselect"
            >
              <Icon name="close" size={14} />
            </button>
          </div>

          <div className="hud-badges">
            {knowledgeClass ? (
              <span
                className={`hud-badge ${knowledgeColorClass(knowledgeClass)}`}
              >
                <span className="hud-pill-dot" />
                {humanizeRealityClass(knowledgeClass)}
              </span>
            ) : null}

            {state.camera.targetId === selected.id ? (
              <span className="hud-badge is-accent">Camera target</span>
            ) : null}

            {state.focusId === selected.id ? (
              <span className="hud-badge">Focused</span>
            ) : null}
          </div>
        </div>

        <div className="hud-inspector-body">
          <div className="hud-description">{description}</div>

          <div className="hud-metric-grid">
            <Metric
              label="Reference"
              value={frameLabel(selected.frameId)}
              hint="active frame"
              wide
            />

            <Metric
              label="Radius"
              value={
                properties?.radiusMeters !== undefined
                  ? formatDistanceMeters(properties.radiusMeters)
                  : "Unknown"
              }
            />

            <Metric
              label="Mass"
              value={
                properties?.massKg !== undefined
                  ? formatMassKg(properties.massKg)
                  : "Unknown"
              }
            />

            <Metric
              label="Temperature"
              value={
                properties?.temperatureK !== undefined
                  ? formatTemperature(properties.temperatureK)
                  : "Unknown"
              }
            />

            <Metric
              label="Gravity"
              value={
                properties?.gravityMs2 !== undefined
                  ? `${formatNumber(properties.gravityMs2, 2)} m/sÂ²`
                  : "Unknown"
              }
            />

            {properties?.densityKgM3 !== undefined ? (
              <Metric
                label="Density"
                value={`${formatNumber(properties.densityKgM3, 1)} kg/mÂ³`}
              />
            ) : null}

            {properties?.albedo !== undefined ? (
              <Metric
                label="Albedo"
                value={formatNumber(properties.albedo, 3)}
              />
            ) : null}

            {properties?.luminosityW !== undefined ? (
              <Metric
                label="Luminosity"
                value={formatPower(properties.luminosityW)}
              />
            ) : null}

            <Metric
              label="Hierarchy"
              value={parentLabel}
              hint="known parent chain"
              wide
            />
          </div>

          {confidence !== undefined ? (
            <div className="hud-confidence">
              <div className="hud-confidence-row">
                <div className="hud-metric-label">
                  Knowledge confidence
                </div>

                <div className="hud-confidence-value">
                  {Math.round(confidence * 100)}%
                </div>
              </div>

              <div className="hud-confidence-track">
                <div
                  className="hud-confidence-fill"
                  style={
                    {
                      "--confidence": `${confidence * 100}%`,
                    } as CSSProperties
                  }
                />
              </div>

              <div className="hud-source-line">
                Confidence describes the strength of the available knowledge,
                not visual certainty.
              </div>
            </div>
          ) : (
            <div className="hud-knowledge-note">
              The current data object does not expose an explicit confidence
              value. The HUD will not invent one.
            </div>
          )}

          <div className="hud-actions hud-interactive">
            <button
              type="button"
              className="hud-action-button is-primary"
              onClick={() => onFocus?.(selected.id)}
            >
              Focus
            </button>

            <button
              type="button"
              className="hud-action-button"
              onClick={() => onCompareScale?.()}
              aria-label="Compare scale"
              title="Compare scale"
            >
              <Icon name="compare" size={15} strokeWidth={1.5} />
              <span className="hud-action-tooltip">Compare Scale</span>
            </button>
          </div>

          <div className="hud-actions hud-interactive">
            <button
              type="button"
              className="hud-action-button"
              onClick={() => onNavigate?.("parent")}
            >
              Parent
            </button>

            <button
              type="button"
              className="hud-action-button"
              onClick={() => onNavigate?.("child")}
            >
              Child
            </button>

            <button
              type="button"
              className="hud-action-button"
              onClick={() => onNavigate?.("previous")}
            >
              Previous
            </button>

            <button
              type="button"
              className="hud-action-button"
              onClick={() => onNavigate?.("next")}
            >
              Next
            </button>
          </div>

          <div className="hud-science">
            <button
              type="button"
              className="hud-science-toggle hud-interactive"
              onClick={() => setScienceExpanded((value) => !value)}
              aria-expanded={scienceExpanded}
            >
              <span>
                {mode === "science"
                  ? "Scientific record"
                  : "More information"}
              </span>

              <Icon
                name="chevron"
                size={14}
              />
            </button>

            {scienceExpanded ? (
              <div className="hud-science-content">
                <div className="hud-source-line">
                  <span className="hud-source-label">Entity ID</span>
                  <br />
                  {String(selected.id)}
                </div>

                <div className="hud-source-line">
                  <span className="hud-source-label">Parent hierarchy</span>
                  <br />
                  {parentLabel}
                </div>

                <div className="hud-source-line">
                  <span className="hud-source-label">
                    Evidence
                  </span>
                  <br />
                  {selected.evidenceLevel ??
                    selected.scientific?.evidenceLevel ??
                    "Not specified by the active record"}
                </div>

                <div className="hud-source-line">
                  <span className="hud-source-label">
                    Reality class
                  </span>
                  <br />
                  {humanizeRealityClass(knowledgeClass)}
                </div>

                <div className="hud-source-line">
                  <span className="hud-source-label">
                    Sources
                  </span>
                  <br />
                  {sources.length > 0
                    ? sources.join(" Â· ")
                    : "No source identifiers attached to this entity"}
                </div>

                <div className="hud-knowledge-note">
                  Universe intentionally separates observed, measured,
                  estimated, theoretical, and procedural content. Procedural
                  objects are simulations and must never be presented as
                  observations.
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}

function HumanityStatus({
  humanity,
}: {
  humanity?: HumanitySnapshot;
}): React.ReactElement | null {
  if (!humanity) {
    return null;
  }

  const civilizationName =
    humanity.civilizationName ?? "Human civilization";

  const capability =
    humanity.interstellarCapability ??
    "Pre-interstellar";

  const kardashev =
    humanity.estimatedKardashev !== undefined
      ? `Type ${humanity.estimatedKardashev.toFixed(2)}`
      : "Energy scale unavailable";

  return (
    <div className="hud-humanity">
      <div className="hud-eyebrow">Humanity status</div>

      <div className="hud-humanity-head">
        <div className="hud-humanity-status">{civilizationName}</div>

        <div className="hud-humanity-kardashev">
          {kardashev}
        </div>
      </div>

      <div className="hud-humanity-meta">
        <span className="hud-humanity-meta-item">
          <span className="hud-humanity-meta-dot" />
          {capability}
        </span>

        {humanity.technologicalLevel ? (
          <span className="hud-humanity-meta-item">
            <span className="hud-humanity-meta-dot" />
            {humanity.technologicalLevel}
          </span>
        ) : null}

        {humanity.energyUseWatts !== undefined ? (
          <span className="hud-humanity-meta-item">
            <span className="hud-humanity-meta-dot" />
            {formatPower(humanity.energyUseWatts)}
          </span>
        ) : null}

        {humanity.lightConeStatus ? (
          <span className="hud-humanity-meta-item">
            <span className="hud-humanity-meta-dot" />
            {humanity.lightConeStatus}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function CameraControls({
  state,
  onCameraModeChange,
}: {
  state: UniverseState;
  onCameraModeChange?: (mode: CameraMode) => void;
}): React.ReactElement {
  const modes: CameraMode[] = [
    "orbit",
    "free",
    "surface",
    "chase",
    "cinematic",
  ];

  return (
    <div className="hud-camera">
      <div className="hud-camera-mode">
        {modes.map((mode) => (
          <button
            key={mode}
            type="button"
            className={`hud-camera-button ${
              state.camera.mode === mode ? "is-active" : ""
            }`}
            onClick={() => onCameraModeChange?.(mode)}
          >
            {CAMERA_LABELS[mode]}
          </button>
        ))}
      </div>
    </div>
  );
}

function BottomControls({
  state,
  onPauseChange,
  onClockRateChange,
  onToggleOverlay,
  onHome,
  onBack,
  onOpenSettings,
  onDiscoveryMode,
  onCompareScale,
}: {
  state: UniverseState;
  onPauseChange?: (paused: boolean) => void;
  onClockRateChange?: (rate: number) => void;
  onToggleOverlay?: (overlay: OverlayKey, value: boolean) => void;
  onHome?: () => void;
  onBack?: () => void;
  onOpenSettings?: () => void;
  onDiscoveryMode?: () => void;
  onCompareScale?: () => void;
}): React.ReactElement {
  const cycleRate = (): void => {
    const values = [
      0.001,
      0.01,
      0.1,
      1,
      10,
      100,
      1_000,
      10_000,
    ];

    const current = state.clock.rate;

    const nextIndex = Math.max(
      0,
      values.findIndex((value) => value > current),
    );

    const nextValue =
      nextIndex >= 0 && nextIndex < values.length
        ? values[nextIndex]
        : values[0];

    onClockRateChange?.(nextValue);
  };

  const rateLabel =
    state.clock.rate === 1
      ? "1Ã— realtime"
      : `${formatScientific(state.clock.rate)}Ã—`;

  return (
    <div className="hud-bottom">
      <div className="hud-bottom-left">
        <div className="hud-control-strip hud-interactive">
          <button
            type="button"
            className="hud-strip-button"
            onClick={onBack}
            aria-label="Navigate back"
            title="Previous navigation state"
          >
            <Icon name="back" size={15} />
            <span className="hud-strip-label">Back</span>
          </button>

          <button
            type="button"
            className="hud-strip-button"
            onClick={onHome}
            aria-label="Return home"
            title="Return to home view"
          >
            <Icon name="home" size={15} />
            <span className="hud-strip-label">Home</span>
          </button>

          <button
            type="button"
            className="hud-strip-button"
            onClick={onCompareScale}
            aria-label="Compare scale"
            title="Compare scale"
          >
            <Icon name="compare" size={15} />
            <span className="hud-strip-label">Scale</span>
          </button>
        </div>
      </div>

      <div className="hud-bottom-center">
        <div className="hud-control-strip hud-interactive">
          <button
            type="button"
            className="hud-strip-button"
            onClick={() => onPauseChange?.(!state.clock.paused)}
            aria-label={state.clock.paused ? "Resume time" : "Pause time"}
            title={state.clock.paused ? "Resume" : "Pause"}
          >
            <Icon
              name={state.clock.paused ? "play" : "pause"}
              size={15}
            />
          </button>

          <button
            type="button"
            className="hud-strip-button"
            onClick={() => onClockRateChange?.(1)}
            aria-label="Set realtime"
            title="Set simulation time to realtime"
          >
            <Icon name="clock" size={15} />
          </button>

          <button
            type="button"
            className="hud-strip-button"
            onClick={() => onClockRateChange?.(10)}
            aria-label="Speed time by ten times"
            title="10Ã—"
          >
            <Icon name="step" size={15} />
          </button>

          <button
            type="button"
            className="hud-strip-button"
            onClick={cycleRate}
            aria-label="Cycle time rate"
            title="Cycle simulation rate"
          >
            {rateLabel}
          </button>
        </div>

        <div className="hud-clock">
          <div className="hud-clock-date">
            {formatAstroDate(state.clock.time)}
          </div>

          <div className="hud-clock-subtitle">
            {state.clock.paused
              ? "Simulation paused"
              : "Simulation running"}
          </div>
        </div>

        <div className="hud-time-rate">
          {rateLabel}
        </div>
      </div>

      <div className="hud-bottom-right">
        <div className="hud-control-strip hud-interactive">
          <button
            type="button"
            className={`hud-strip-button ${
              state.overlays.labels ? "is-active" : ""
            }`}
            onClick={() =>
              onToggleOverlay?.(
                "labels",
                !state.overlays.labels,
              )
            }
            aria-label="Toggle labels"
            title="Labels"
          >
            <Icon name="layers" size={15} />
            <span className="hud-strip-label">Labels</span>
          </button>

          <button
            type="button"
            className={`hud-strip-button ${
              state.overlays.orbits ? "is-active" : ""
            }`}
            onClick={() =>
              onToggleOverlay?.(
                "orbits",
                !state.overlays.orbits,
              )
            }
            aria-label="Toggle orbit lines"
            title="Orbit lines"
          >
            <Icon name="orbit" size={15} />
            <span className="hud-strip-label">Orbits</span>
          </button>

          <button
            type="button"
            className={`hud-strip-button ${
              state.overlays.knowledge ? "is-active" : ""
            }`}
            onClick={() =>
              onToggleOverlay?.(
                "knowledge",
                !state.overlays.knowledge,
              )
            }
            aria-label="Toggle knowledge overlay"
            title="Knowledge overlay"
          >
            <Icon name="info" size={15} />
            <span className="hud-strip-label">Knowledge</span>
          </button>

          <button
            type="button"
            className={`hud-strip-button ${
              state.overlays.humanity ? "is-active" : ""
            }`}
            onClick={() =>
              onToggleOverlay?.(
                "humanity",
                !state.overlays.humanity,
              )
            }
            aria-label="Toggle humanity overlay"
            title="Humanity status"
          >
            <Icon name="globe" size={15} />
            <span className="hud-strip-label">Humanity</span>
          </button>

          <button
            type="button"
            className="hud-strip-button"
            onClick={onDiscoveryMode}
            aria-label="Open discovery mode"
            title="Discovery mode"
          >
            <Icon name="discovery" size={15} />
          </button>

          <button
            type="button"
            className="hud-strip-button"
            onClick={onOpenSettings}
            aria-label="Open settings"
            title="Settings"
          >
            <Icon name="settings" size={15} />
          </button>
        </div>

        <div className="hud-status">
          <span className="hud-status-dot" />
          Universe online
        </div>
      </div>
    </div>
  );
}

function PerformanceOverlay({
  performance,
}: {
  performance?: PerformanceSnapshot;
}): React.ReactElement | null {
  if (!performance) {
    return null;
  }

  const values: string[] = [];

  if (performance.fps !== undefined) {
    values.push(`${Math.round(performance.fps)} FPS`);
  }

  if (performance.visibleObjects !== undefined) {
    values.push(`${formatInteger(performance.visibleObjects)} visible`);
  }

  if (performance.quality) {
    values.push(performance.quality);
  }

  if (values.length === 0) {
    return null;
  }

  return (
    <div className="hud-performance">
      <Icon name="cpu" size={11} />
      {values.map((value, index) => (
        <span key={value}>
          {index > 0 ? (
            <span className="hud-divider" aria-hidden="true" />
          ) : null}
          {value}
        </span>
      ))}
    </div>
  );
}

function HotkeyOverlay({
  visible,
}: {
  visible: boolean;
}): React.ReactElement | null {
  if (!visible) {
    return null;
  }

  return (
    <div className="hud-toast-stack">
      <div className="hud-toast">
        <span className="hud-toast-icon">
          <Icon name="keyboard" size={13} />
        </span>

        <span>WASD navigate Â· Shift boost Â· Alt precision Â· Space brake</span>
      </div>

      <div className="hud-toast">
        <span className="hud-toast-icon">
          <Icon name="mouse" size={13} />
        </span>

        <span>Drag orbit Â· Wheel travel through scale Â· Double-click focus</span>
      </div>
    </div>
  );
}

export function UniverseHUD({
  state,
  mode: controlledMode,
  onModeChange,
  onSelect,
  onFocus,
  onNavigate,
  onHome,
  onBack,
  onScaleChange,
  onSemanticZoom,
  onPauseChange,
  onClockRateChange,
  onCameraModeChange,
  onToggleOverlay,
  onSearch,
  onSearchSelect,
  onOpenSettings,
  onDiscoveryMode,
  onCompareScale,
  onOpenDiscoveryLog,
  onOpenWaypoints,
  onCommand,
  humanity,
  performance,
  locationLabel,
  coordinateLabel,
  temporalLabel,
  className = "",
}: UniverseHUDProps): React.ReactElement {
  const [internalMode, setInternalMode] =
    useState<HudMode>("explore");

  const [query, setQuery] = useState("");
  const [showHotkeys, setShowHotkeys] = useState(false);

  const commandRef = useRef<HTMLInputElement | null>(null);

  const mode = controlledMode ?? internalMode;

  const stableTemporalLabel = useStableString(
    temporalLabel ??
      formatAstroDate(state.clock.time),
    100,
  );

  const selectMode = (nextMode: HudMode): void => {
    setInternalMode(nextMode);
    onModeChange?.(nextMode);
  };

  useEffect(() => {
    const keyDown = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;

      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        commandRef.current?.focus();
        return;
      }

      if (event.key === "Escape") {
        setQuery("");

        if (!isTyping) {
          onSelect?.(null);
        }
        return;
      }

      if (event.key === "?") {
        if (!isTyping) {
          event.preventDefault();
          setShowHotkeys((value) => !value);
          onDiscoveryMode?.();
        }
        return;
      }

      if (isTyping) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case "e":
          selectMode("explore");
          break;

        case "s":
          selectMode("science");
          break;

        case "h":
          onHome?.();
          break;

        case "f":
          onFocus?.(state.selectedId ?? null);
          break;

        case "[":
          onNavigate?.("previous");
          break;

        case "]":
          onNavigate?.("next");
          break;

        case "p":
          onPauseChange?.(!state.clock.paused);
          break;

        default:
          break;
      }
    };

    window.addEventListener("keydown", keyDown);

    return () => {
      window.removeEventListener("keydown", keyDown);
    };
  }, [
    onSelect,
    onDiscoveryMode,
    onHome,
    onFocus,
    onNavigate,
    onPauseChange,
    state.selectedId,
    state.clock.paused,
  ]);

  const panelClassName = [
    "universe-hud",
    mode === "science" ? "hud-science-mode" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const selectedEntity = state.selectedId
    ? getHudEntity(state.entities.get(state.selectedId))
    : undefined;

  const focusEntity = state.focusId
    ? getHudEntity(state.entities.get(state.focusId))
    : undefined;

  const effectiveLocationLabel =
    locationLabel ??
    selectedEntity?.name ??
    focusEntity?.name ??
    "Observable universe";

  const effectiveSecondaryLocation =
    coordinateLabel ??
    `${humanizeKind(selectedEntity?.kind)} Â· ${frameLabel(state.camera.frameId)}`;

  const effectiveTemporal =
    temporalLabel ?? stableTemporalLabel;

  return (
    <div className={panelClassName}>
      <style>{HUD_CSS}</style>

      <div className="hud-shell">
        <header className="hud-topbar">
          <div className="hud-brand">
            <div className="hud-brand-mark">
              <Icon name="orbit" size={21} strokeWidth={1.35} />
            </div>

            <div className="hud-brand-copy">
              <div className="hud-brand-title">UNIVERSE</div>
              <div className="hud-brand-subtitle">
                Humanity's known reality
              </div>
            </div>
          </div>

          <div className="hud-top-actions hud-interactive">
            <div className="hud-pill">
              <span className="hud-pill-dot" />
              <span className="hud-pill-text">
                {state.entities.size > 0
                  ? `${formatInteger(state.entities.size)} loaded`
                  : "Loading known objects"}
              </span>
            </div>

            <div className="hud-mode-switch">
              <button
                type="button"
                className={`hud-mode-button ${
                  mode === "explore" ? "is-active" : ""
                }`}
                onClick={() => selectMode("explore")}
              >
                Explore
              </button>

              <button
                type="button"
                className={`hud-mode-button ${
                  mode === "science" ? "is-active" : ""
                }`}
                onClick={() => selectMode("science")}
              >
                Science
              </button>
            </div>
          </div>
        </header>

        <SearchBar
          state={state}
          query={query}
          setQuery={setQuery}
          onSearch={onSearch}
          onSearchSelect={onSearchSelect}
        />

        <div className="hud-location">
          <div className="hud-location-primary">
            {effectiveLocationLabel}
          </div>

          <div className="hud-location-secondary">
            {effectiveSecondaryLocation}
            {" Â· "}
            {effectiveTemporal}
          </div>
        </div>

        <nav className="hud-left-rail">
          <div className="hud-rail-group">
            <GlassButton
              label="Home"
              title="Home"
              onClick={onHome}
            >
              <Icon name="home" size={17} />
            </GlassButton>

            <GlassButton
              label="Focus selected object"
              title="Focus selected object"
              active={Boolean(state.focusId)}
              disabled={!state.selectedId}
              onClick={() => onFocus?.(state.selectedId ?? null)}
            >
              <Icon name="target" size={17} />
            </GlassButton>

            <GlassButton
              label="Return to parent"
              title="Navigate to parent"
              disabled={!state.selectedId}
              onClick={() => onNavigate?.("parent")}
            >
              <Icon name="up" size={17} />
            </GlassButton>

            <GlassButton
              label="Enter child"
              title="Navigate into child"
              disabled={!state.selectedId}
              onClick={() => onNavigate?.("child")}
            >
              <Icon name="down" size={17} />
            </GlassButton>
          </div>

          <div className="hud-rail-group">
            <GlassButton
              label="Discovery mode"
              title="Discovery mode"
              active={showHotkeys}
              onClick={() => {
                setShowHotkeys((value) => !value);
                onDiscoveryMode?.();
              }}
            >
              <Icon name="discovery" size={17} />
            </GlassButton>

            <GlassButton
              label="Discovery Log (⚑)"
              title="Discovery Log — bookmarks, anomalies, journey"
              onClick={onOpenDiscoveryLog}
            >
              <span style={{ fontSize: 15, lineHeight: 1 }}>⚑</span>
            </GlassButton>

            <GlassButton
              label="Waypoints (◎)"
              title="Waypoints — set destinations, navigate"
              onClick={onOpenWaypoints}
            >
              <span style={{ fontSize: 15, lineHeight: 1 }}>◎</span>
            </GlassButton>

            <GlassButton
              label="Settings"
              title="Settings"
              onClick={onOpenSettings}
            >
              <Icon name="settings" size={17} />
            </GlassButton>
          </div>
        </nav>

        <ScaleIndicator
          state={state}
          mode={mode}
          onScaleChange={onScaleChange}
          onSemanticZoom={onSemanticZoom}
        />

        <Inspector
          state={state}
          mode={mode}
          onSelect={onSelect}
          onFocus={onFocus}
          onNavigate={onNavigate}
          onCompareScale={onCompareScale}
        />

        <HumanityStatus humanity={humanity} />

        <CameraControls
          state={state}
          onCameraModeChange={onCameraModeChange}
        />

        <PerformanceOverlay performance={performance} />

        <div className="hud-crosshair" aria-hidden="true" />

        <HotkeyOverlay visible={showHotkeys} />

        <BottomControls
          state={state}
          onPauseChange={onPauseChange}
          onClockRateChange={onClockRateChange}
          onToggleOverlay={onToggleOverlay}
          onHome={onHome}
          onBack={onBack}
          onOpenSettings={onOpenSettings}
          onDiscoveryMode={onDiscoveryMode}
          onCompareScale={onCompareScale}
        />

        <div className="hud-sr-only" aria-live="polite">
          {selectedEntity
            ? `Selected ${selectedEntity.name ?? selectedEntity.id}`
            : "No object selected"}
        </div>
      </div>
    </div>
  );
}

export default UniverseHUD;

