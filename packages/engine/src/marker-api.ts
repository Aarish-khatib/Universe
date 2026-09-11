/* ============================================================
   marker-api.ts  v1
   Universal marker & annotation API — the clean extension
   hook for photo mode markers, mission objectives, narrative
   triggers, multiplayer presence, and construction sites.
   Pure data, no rendering dependency.
   ============================================================ */

export const MARKER_API_VERSION = 1;

export type MarkerKind =
  | "photo"
  | "note"
  | "objective"
  | "narrative"
  | "construction"
  | "presence"
  | "custom";

export type MarkerVisibility =
  | "private"
  | "session"
  | "shared";

export interface MarkerTransform {
  positionLy: readonly [number, number, number];
  attachedEntityId?: string;
  offsetMeters?: readonly [number, number, number];
}

export interface Marker {
  id: string;
  kind: MarkerKind;
  label: string;
  body?: string;
  icon?: string;
  color?: readonly [number, number, number];
  transform: MarkerTransform;
  visibility: MarkerVisibility;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
  isActive: boolean;
}

export type MarkerEvent =
  | { type: "created"; marker: Marker }
  | { type: "updated"; marker: Marker }
  | { type: "deleted"; id: string }
  | { type: "activated"; marker: Marker }
  | { type: "deactivated"; id: string };

export type MarkerListener = (event: MarkerEvent) => void;

function uid(): string {
  return `marker-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface MarkerCreateParams {
  kind: MarkerKind;
  label: string;
  body?: string;
  icon?: string;
  color?: readonly [number, number, number];
  transform: MarkerTransform;
  visibility?: MarkerVisibility;
  metadata?: Record<string, unknown>;
}

export class MarkerApi {
  private readonly markers = new Map<string, Marker>();
  private readonly listeners = new Set<MarkerListener>();

  subscribe(listener: MarkerListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private emit(event: MarkerEvent): void {
    for (const l of this.listeners) { try { l(event); } catch { /* */ } }
  }

  create(params: MarkerCreateParams): Marker {
    const now = Date.now();
    const marker: Marker = {
      id: uid(),
      kind: params.kind,
      label: params.label,
      body: params.body,
      icon: params.icon,
      color: params.color,
      transform: params.transform,
      visibility: params.visibility ?? "session",
      createdAt: now,
      updatedAt: now,
      metadata: params.metadata,
      isActive: true,
    };
    this.markers.set(marker.id, marker);
    this.emit({ type: "created", marker });
    return marker;
  }

  update(id: string, patch: Partial<Omit<Marker, "id" | "createdAt">>): Marker | null {
    const existing = this.markers.get(id);
    if (!existing) return null;
    const updated: Marker = { ...existing, ...patch, updatedAt: Date.now() };
    this.markers.set(id, updated);
    this.emit({ type: "updated", marker: updated });
    return updated;
  }

  delete(id: string): void {
    if (!this.markers.has(id)) return;
    this.markers.delete(id);
    this.emit({ type: "deleted", id });
  }

  activate(id: string): void {
    const m = this.markers.get(id);
    if (!m || m.isActive) return;
    const updated = { ...m, isActive: true, updatedAt: Date.now() };
    this.markers.set(id, updated);
    this.emit({ type: "activated", marker: updated });
  }

  deactivate(id: string): void {
    const m = this.markers.get(id);
    if (!m || !m.isActive) return;
    const updated = { ...m, isActive: false, updatedAt: Date.now() };
    this.markers.set(id, updated);
    this.emit({ type: "deactivated", id });
  }

  get(id: string): Marker | undefined { return this.markers.get(id); }
  getAll(): readonly Marker[] { return [...this.markers.values()]; }
  getByKind(kind: MarkerKind): readonly Marker[] {
    return [...this.markers.values()].filter(m => m.kind === kind);
  }
  getActive(): readonly Marker[] {
    return [...this.markers.values()].filter(m => m.isActive);
  }
  getNearEntity(entityId: string): readonly Marker[] {
    return [...this.markers.values()].filter(m => m.transform.attachedEntityId === entityId);
  }
  get count(): number { return this.markers.size; }

  serialize(): readonly Marker[] { return [...this.markers.values()]; }

  static deserialize(data: readonly Marker[]): MarkerApi {
    const api = new MarkerApi();
    for (const m of data) api.markers.set(m.id, m);
    return api;
  }

  saveToLocalStorage(key = "universe:markers"): void {
    try { localStorage.setItem(key, JSON.stringify(this.serialize())); } catch { /* */ }
  }

  static loadFromLocalStorage(key = "universe:markers"): MarkerApi {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return new MarkerApi();
      return MarkerApi.deserialize(JSON.parse(raw) as Marker[]);
    } catch { return new MarkerApi(); }
  }
}
