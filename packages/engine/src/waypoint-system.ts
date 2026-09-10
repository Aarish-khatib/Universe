/* ============================================================
   waypoint-system.ts  v1
   Waypoints, routes, and autopilot target management.
   The session drives navigation; this module is pure data + logic.
   ============================================================ */

export const WAYPOINT_SYSTEM_VERSION = 1;

export type WaypointKind =
  | "entity"
  | "coordinates"
  | "bookmark";

export interface Waypoint {
  id: string;
  label: string;
  kind: WaypointKind;
  entityId?: string;
  positionLy: readonly [number, number, number];
  createdAt: number;
  note?: string;
  isPinned: boolean;
}

export interface WaypointRoute {
  id: string;
  name: string;
  waypointIds: readonly string[];
  createdAt: number;
}

export type WaypointEvent =
  | { type: "added"; waypoint: Waypoint }
  | { type: "removed"; id: string }
  | { type: "activated"; waypoint: Waypoint }
  | { type: "cleared" }
  | { type: "route-saved"; route: WaypointRoute };

export type WaypointListener = (event: WaypointEvent) => void;

function uid(): string {
  return `wp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export class WaypointSystem {
  private readonly waypoints = new Map<string, Waypoint>();
  private readonly routes = new Map<string, WaypointRoute>();
  private readonly listeners = new Set<WaypointListener>();
  private activeId: string | null = null;

  subscribe(listener: WaypointListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private emit(event: WaypointEvent): void {
    for (const l of this.listeners) { try { l(event); } catch { /* */ } }
  }

  addEntity(entityId: string, label: string, positionLy: readonly [number, number, number], note?: string): Waypoint {
    const wp: Waypoint = {
      id: uid(), label, kind: "entity", entityId, positionLy,
      createdAt: Date.now(), note, isPinned: false,
    };
    this.waypoints.set(wp.id, wp);
    this.emit({ type: "added", waypoint: wp });
    return wp;
  }

  addCoordinates(label: string, positionLy: readonly [number, number, number], note?: string): Waypoint {
    const wp: Waypoint = {
      id: uid(), label, kind: "coordinates", positionLy,
      createdAt: Date.now(), note, isPinned: false,
    };
    this.waypoints.set(wp.id, wp);
    this.emit({ type: "added", waypoint: wp });
    return wp;
  }

  remove(id: string): void {
    if (!this.waypoints.has(id)) return;
    this.waypoints.delete(id);
    if (this.activeId === id) this.activeId = null;
    this.emit({ type: "removed", id });
  }

  activate(id: string): void {
    const wp = this.waypoints.get(id);
    if (!wp) return;
    this.activeId = id;
    this.emit({ type: "activated", waypoint: wp });
  }

  deactivate(): void {
    this.activeId = null;
    this.emit({ type: "cleared" });
  }

  pin(id: string): void {
    const wp = this.waypoints.get(id);
    if (!wp) return;
    this.waypoints.set(id, { ...wp, isPinned: true });
  }

  unpin(id: string): void {
    const wp = this.waypoints.get(id);
    if (!wp) return;
    this.waypoints.set(id, { ...wp, isPinned: false });
  }

  saveRoute(name: string, waypointIds: readonly string[]): WaypointRoute {
    const route: WaypointRoute = {
      id: uid(), name, waypointIds, createdAt: Date.now(),
    };
    this.routes.set(route.id, route);
    this.emit({ type: "route-saved", route });
    return route;
  }

  get active(): Waypoint | null {
    return this.activeId ? (this.waypoints.get(this.activeId) ?? null) : null;
  }

  getAll(): readonly Waypoint[] {
    return [...this.waypoints.values()].sort((a, b) => b.createdAt - a.createdAt);
  }

  getPinned(): readonly Waypoint[] {
    return this.getAll().filter(w => w.isPinned);
  }

  getRoutes(): readonly WaypointRoute[] {
    return [...this.routes.values()];
  }

  get count(): number { return this.waypoints.size; }
}
