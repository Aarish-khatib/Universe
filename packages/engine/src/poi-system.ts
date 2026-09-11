/* ============================================================
   poi-system.ts  v1
   Points of Interest — rare/anomalous/beautiful locations
   that the engine flags for the HUD to highlight.
   Works with both real and procedural entities.
   ============================================================ */

export const POI_SYSTEM_VERSION = 1;

export type PoiCategory =
  | "anomaly"
  | "binary-spectacle"
  | "life-candidate"
  | "nebula-core"
  | "extreme-world"
  | "landmark"
  | "user-marked";

export interface PointOfInterest {
  id: string;
  entityId: string;
  label: string;
  description: string;
  category: PoiCategory;
  positionLy: readonly [number, number, number];
  discoveredAt: number;
  isVisited: boolean;
  isUserMarked: boolean;
  rarity: number; // 0-1
  icon: string;
}

export type PoiEvent =
  | { type: "added"; poi: PointOfInterest }
  | { type: "visited"; poi: PointOfInterest }
  | { type: "removed"; id: string };

export type PoiListener = (event: PoiEvent) => void;

const CATEGORY_ICONS: Record<PoiCategory, string> = {
  "anomaly":          "⚠",
  "binary-spectacle": "✦✦",
  "life-candidate":   "🌿",
  "nebula-core":      "☁",
  "extreme-world":    "🌋",
  "landmark":         "⚑",
  "user-marked":      "📍",
};

function uid(): string {
  return `poi-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function categoryForAnomalyClasses(classes: readonly string[]): PoiCategory {
  if (classes.includes("life-candidate")) return "life-candidate";
  if (classes.includes("binary-star") || classes.includes("trinary-star")) return "binary-spectacle";
  if (classes.includes("lava-world") || classes.includes("ocean-world")) return "extreme-world";
  return "anomaly";
}

export class PoiSystem {
  private readonly pois = new Map<string, PointOfInterest>();
  private readonly listeners = new Set<PoiListener>();

  subscribe(listener: PoiListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private emit(event: PoiEvent): void {
    for (const l of this.listeners) { try { l(event); } catch { /* */ } }
  }

  addFromAnomaly(params: {
    entityId: string;
    label: string;
    description: string;
    anomalyClasses: readonly string[];
    anomalyScore: number;
    positionLy: readonly [number, number, number];
  }): PointOfInterest | null {
    if (params.anomalyScore < 0.3) return null;
    if (this.pois.has(params.entityId)) return this.pois.get(params.entityId)!;

    const category = categoryForAnomalyClasses(params.anomalyClasses);
    const poi: PointOfInterest = {
      id: uid(),
      entityId: params.entityId,
      label: params.label,
      description: params.description,
      category,
      positionLy: params.positionLy,
      discoveredAt: Date.now(),
      isVisited: false,
      isUserMarked: false,
      rarity: Math.min(1, params.anomalyScore),
      icon: CATEGORY_ICONS[category],
    };
    this.pois.set(params.entityId, poi);
    this.emit({ type: "added", poi });
    return poi;
  }

  markUserPoi(entityId: string, label: string, positionLy: readonly [number, number, number]): PointOfInterest {
    const existing = this.pois.get(entityId);
    if (existing) {
      const updated = { ...existing, isUserMarked: true, category: "user-marked" as PoiCategory };
      this.pois.set(entityId, updated);
      return updated;
    }
    const poi: PointOfInterest = {
      id: uid(), entityId, label,
      description: "User-marked location.",
      category: "user-marked",
      positionLy, discoveredAt: Date.now(),
      isVisited: false, isUserMarked: true,
      rarity: 0, icon: CATEGORY_ICONS["user-marked"],
    };
    this.pois.set(entityId, poi);
    this.emit({ type: "added", poi });
    return poi;
  }

  markVisited(entityId: string): void {
    const poi = this.pois.get(entityId);
    if (!poi || poi.isVisited) return;
    const updated = { ...poi, isVisited: true };
    this.pois.set(entityId, updated);
    this.emit({ type: "visited", poi: updated });
  }

  remove(entityId: string): void {
    if (!this.pois.has(entityId)) return;
    this.pois.delete(entityId);
    this.emit({ type: "removed", id: entityId });
  }

  getAll(): readonly PointOfInterest[] {
    return [...this.pois.values()].sort((a, b) => b.rarity - a.rarity);
  }

  getUnvisited(): readonly PointOfInterest[] {
    return this.getAll().filter(p => !p.isVisited);
  }

  getNearby(positionLy: readonly [number, number, number], radiusLy: number): readonly PointOfInterest[] {
    return this.getAll().filter(p => {
      const dx = p.positionLy[0] - positionLy[0];
      const dy = p.positionLy[1] - positionLy[1];
      const dz = p.positionLy[2] - positionLy[2];
      return Math.sqrt(dx*dx + dy*dy + dz*dz) <= radiusLy;
    });
  }

  get count(): number { return this.pois.size; }

  serialize(): readonly PointOfInterest[] {
    return [...this.pois.values()];
  }

  static deserialize(data: readonly PointOfInterest[]): PoiSystem {
    const sys = new PoiSystem();
    for (const poi of data) sys.pois.set(poi.entityId, poi);
    return sys;
  }

  saveToLocalStorage(key = "universe:poi"): void {
    try { localStorage.setItem(key, JSON.stringify(this.serialize())); } catch { /* quota */ }
  }

  static loadFromLocalStorage(key = "universe:poi"): PoiSystem {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return new PoiSystem();
      return PoiSystem.deserialize(JSON.parse(raw) as PointOfInterest[]);
    } catch { return new PoiSystem(); }
  }
}
