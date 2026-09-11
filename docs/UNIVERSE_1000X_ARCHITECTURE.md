# Universe 1000x — Architecture & Integration Guide

> Branch: `feature/universe-1000x`
> Status: Phase 1 complete — Phase 2 in progress.

---

## What Was Added

### Engine packages (`packages/engine/src/`)

| File | Purpose |
|------|---------|
| `discovery-log.ts` | Persistent exploration journal. Records every visited entity, supports bookmarks, custom names, notes, and journey history. Serializes to `localStorage`. Works for real and procedural entities identically. |
| `waypoint-system.ts` | Data-only waypoint + route manager. The session consumes `active` to drive cinematic fly-to. No Three.js dependency. |
| `atmosphere-profile.ts` | Pure-function that derives a full cinematic `AtmosphereRenderProfile` from a `PlanetDescriptor`. Drives renderer limb haze, cloud coverage, sky colour, Mie/Rayleigh strengths. |
| `anomaly-generator.ts` | Deterministic anomaly classifier for `StarSystemDescriptor`. Returns an `AnomalyResult` with score, named classes (Life Candidate, Binary Star, Lava World, etc.), human label, and description. |
| `lod-controller.ts` | Distance + velocity-based LOD tier computation (`cosmic → surface`). Used by both the renderer and the streaming layer. |

### UI components (`apps/universe/src/Components/`)

| File | Purpose |
|------|---------|
| `DiscoveryPanel.tsx` | Cinematic dark-glass panel. Tabs: Recent, Bookmarks, Anomalies, Journey. Search, rename, notes, fly-to. Subscribes to `DiscoveryLog` for live updates. |
| `WaypointPanel.tsx` | Cinematic waypoint list. Activate → triggers session fly-to. Pin / remove. Shows distance from observer. |
| `AnomalyBadge.tsx` | Compact or full badge for anomaly classes. Drop into any explore card or science panel. |

---

## How to Wire Everything Into the Session

### 1. Instantiate in `universe-session.ts`

```typescript
import { DiscoveryLog }    from "./discovery-log";
import { WaypointSystem }  from "./waypoint-system";
import { LodController }   from "./lod-controller";

// Inside UniverseSession class:
readonly discoveryLog    = DiscoveryLog.loadFromLocalStorage();
readonly waypointSystem  = new WaypointSystem();
readonly lodController   = new LodController();
```

### 2. Record discoveries when entities become visible

```typescript
// In the WorldStream subscriber (ProceduralEntityBridge or unified-universe):
if (event.type === "system-ready") {
  const anomaly = classifyAnomalies(event.system);
  this.session.discoveryLog.visit({
    id: event.system.id,
    name: event.system.stars[0]?.name ?? event.system.id,
    kind: "star-system",
    origin: "procedural",
    anomalyScore: anomaly.score,
    seedKey: event.system.seedKey,
    tags: anomaly.classes as string[],
  });
}
```

### 3. Persist on unload

```typescript
window.addEventListener("beforeunload", () => {
  session.discoveryLog.saveToLocalStorage();
});
```

### 4. Wire atmosphere profiles into the renderer

```typescript
import { deriveAtmosphereProfile } from "@known-universe/engine";

// When creating a CelestialBodyVisuals for a procedural planet:
const atmProfile = deriveAtmosphereProfile(planetDescriptor);
// Pass atmProfile.skyColor, .limbTint, .thickness, .cloudCoverage
// into the existing atmosphere shader / visual profile system.
```

### 5. Expose panels in `universe-interface.tsx`

```typescript
import { DiscoveryPanel } from "./Components/DiscoveryPanel";
import { WaypointPanel }  from "./Components/WaypointPanel";

// Add to overlay state:
type OverlayKey = "labels" | "gravity" | "humanity" | "knowledge" | "orbits"
  | "discovery" | "waypoints";  // ← new

// Render conditionally:
{overlays.has("discovery") && (
  <DiscoveryPanel
    log={session.discoveryLog}
    onFlyTo={id => session.flyToEntity(id)}
    onClose={() => toggleOverlay("discovery")}
  />
)}
{overlays.has("waypoints") && (
  <WaypointPanel
    system={session.waypointSystem}
    observerPositionLy={snapshot.positionLy}
    onActivate={wp => session.flyToPosition(wp.positionLy)}
    onClose={() => toggleOverlay("waypoints")}
  />
)}
```

### 6. Add buttons to HUD

```typescript
// In UniverseHUD.tsx toolbar row:
<ToolButton icon="⚑" label="Log"       onClick={() => toggleOverlay("discovery")} />
<ToolButton icon="◎" label="Waypoints" onClick={() => toggleOverlay("waypoints")} />
```

---

## Anomaly Integration in Search / Catalog

In `universe-interface.tsx` `ExploreCard` / science panel:

```typescript
import { AnomalyBadge } from "./Components/AnomalyBadge";

// When rendering a procedural system card:
const anomaly = classifyAnomalies(system);
<AnomalyBadge
  classes={anomaly.classes}
  score={anomaly.score}
  label={anomaly.label}
  description={anomaly.description}
/>
```

---

## Phase Roadmap

| Phase | Status | Key deliverables |
|-------|--------|-----------------|
| 1 — Infinite Horizon Foundation | ✅ Engine hooks complete | `DiscoveryLog`, `WaypointSystem`, `AtmosphereProfile`, `AnomalyGenerator`, `LodController` |
| 2 — Deep Exploration & Agency | 🔄 Next | Surface approach feel, persistent naming across sessions, enhanced search covering procedural catalog |
| 3 — Rich Presence & Polish | ⬜ Planned | Procedural cloud systems, anomaly events/POI, minimal HUD mode, journey log UI |
| 4 — Expansion Hooks | ⬜ Planned | Photo mode, marker API, narrative layer hooks |

---

## Quality Bar

All new modules match the existing codebase standard:
- Pure TypeScript, no `any`, strict null checks.
- No circular dependencies — engine modules import only from `@known-universe/core` and sibling engine files.
- UI components import types from `@known-universe/engine` but never import Three.js directly.
- Event-driven subscriptions with automatic cleanup (`() => void` unsubscribers).
- `localStorage` operations are always wrapped in `try/catch`.
