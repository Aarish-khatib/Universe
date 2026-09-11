/* ============================================================
   narrative-layer.ts  v1
   Lightweight narrative + event trigger system.
   Defines trigger zones, conditions, and scripted events
   that fire when the player enters a region or selects an entity.
   Completely data-driven — no UI or rendering dependency.
   ============================================================ */

export const NARRATIVE_LAYER_VERSION = 1;

export type TriggerKind =
  | "proximity"    // Fire when observer enters radius
  | "selection"    // Fire when entity is selected
  | "discovery"    // Fire on first visit
  | "time"         // Fire at a simulated time
  | "manual";      // Fired programmatically

export type EventActionKind =
  | "narration"    // Show a text narration
  | "highlight"    // Highlight an entity
  | "waypoint"     // Auto-set a waypoint
  | "notification" // Push a discovery notification
  | "custom";      // Arbitrary payload for future use

export interface NarrativeEvent {
  id: string;
  title: string;
  body: string;
  actionKind: EventActionKind;
  entityId?: string;
  payload?: Record<string, unknown>;
  durationMs: number;
  priority: number; // 0-10
}

export interface NarrativeTrigger {
  id: string;
  kind: TriggerKind;
  isEnabled: boolean;
  isFired: boolean;
  fireOnce: boolean;
  entityId?: string;
  radiusLy?: number;
  positionLy?: readonly [number, number, number];
  events: readonly NarrativeEvent[];
}

export type NarrativeLayerEvent =
  | { type: "trigger-fired"; trigger: NarrativeTrigger; events: readonly NarrativeEvent[] }
  | { type: "trigger-reset"; id: string }
  | { type: "trigger-added"; trigger: NarrativeTrigger };

export type NarrativeLayerListener = (event: NarrativeLayerEvent) => void;

function dist3(a: readonly [number,number,number], b: readonly [number,number,number]): number {
  const dx = a[0]-b[0], dy = a[1]-b[1], dz = a[2]-b[2];
  return Math.sqrt(dx*dx + dy*dy + dz*dz);
}

export class NarrativeLayer {
  private readonly triggers = new Map<string, NarrativeTrigger>();
  private readonly listeners = new Set<NarrativeLayerListener>();

  subscribe(listener: NarrativeLayerListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private emit(event: NarrativeLayerEvent): void {
    for (const l of this.listeners) { try { l(event); } catch { /* */ } }
  }

  addTrigger(trigger: NarrativeTrigger): void {
    this.triggers.set(trigger.id, trigger);
    this.emit({ type: "trigger-added", trigger });
  }

  removeTrigger(id: string): void {
    this.triggers.delete(id);
  }

  resetTrigger(id: string): void {
    const t = this.triggers.get(id);
    if (!t) return;
    this.triggers.set(id, { ...t, isFired: false });
    this.emit({ type: "trigger-reset", id });
  }

  fireTrigger(id: string): void {
    const t = this.triggers.get(id);
    if (!t || !t.isEnabled) return;
    if (t.isFired && t.fireOnce) return;
    const updated = { ...t, isFired: true };
    this.triggers.set(id, updated);
    this.emit({ type: "trigger-fired", trigger: updated, events: t.events });
  }

  checkProximity(observerLy: readonly [number, number, number]): void {
    for (const trigger of this.triggers.values()) {
      if (trigger.kind !== "proximity") continue;
      if (!trigger.isEnabled) continue;
      if (trigger.isFired && trigger.fireOnce) continue;
      if (!trigger.positionLy || trigger.radiusLy === undefined) continue;
      if (dist3(observerLy, trigger.positionLy) <= trigger.radiusLy) {
        this.fireTrigger(trigger.id);
      }
    }
  }

  checkEntitySelection(entityId: string): void {
    for (const trigger of this.triggers.values()) {
      if (trigger.kind !== "selection") continue;
      if (trigger.entityId !== entityId) continue;
      this.fireTrigger(trigger.id);
    }
  }

  checkFirstDiscovery(entityId: string): void {
    for (const trigger of this.triggers.values()) {
      if (trigger.kind !== "discovery") continue;
      if (trigger.entityId !== entityId) continue;
      this.fireTrigger(trigger.id);
    }
  }

  getAll(): readonly NarrativeTrigger[] { return [...this.triggers.values()]; }
  getEnabled(): readonly NarrativeTrigger[] {
    return [...this.triggers.values()].filter(t => t.isEnabled && (!t.isFired || !t.fireOnce));
  }
}
