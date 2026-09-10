/* ============================================================
   discovery-log.ts  v1
   Persistent exploration journal — bookmarks, custom names,
   journey history, and serialization for localStorage.
   Works identically for real and procedural entities.
   ============================================================ */

export const DISCOVERY_LOG_VERSION = 1;

/* ------------------------------------------------------------------ */
/*  Core types                                                          */
/* ------------------------------------------------------------------ */

export type DiscoveryKind =
  | "star-system"
  | "star"
  | "planet"
  | "moon"
  | "galaxy"
  | "asteroid-belt"
  | "anomaly"
  | "landmark";

export type DiscoveryOrigin =
  | "reality"
  | "procedural";

export interface DiscoveryCoordinates {
  positionLy: readonly [number, number, number];
  label: string;
}

export interface DiscoveryRecord {
  id: string;
  name: string;
  customName?: string;
  kind: DiscoveryKind;
  origin: DiscoveryOrigin;
  firstVisitedAt: number;
  lastVisitedAt: number;
  visitCount: number;
  isBookmarked: boolean;
  notes?: string;
  coordinates?: DiscoveryCoordinates;
  seedKey?: string;
  parentId?: string;
  anomalyScore?: number;
  tags: readonly string[];
}

export interface JourneyEntry {
  discoveryId: string;
  arrivedAt: number;
  departedAt: number | null;
  transitDistanceLy: number;
}

export interface DiscoveryLogState {
  version: number;
  records: readonly DiscoveryRecord[];
  journey: readonly JourneyEntry[];
  totalDistanceTravelledLy: number;
  sessionStartedAt: number;
}

/* ------------------------------------------------------------------ */
/*  Event types                                                         */
/* ------------------------------------------------------------------ */

export type DiscoveryLogEvent =
  | { type: "discovered"; record: DiscoveryRecord }
  | { type: "revisited"; record: DiscoveryRecord }
  | { type: "bookmarked"; record: DiscoveryRecord }
  | { type: "unbookmarked"; record: DiscoveryRecord }
  | { type: "named"; record: DiscoveryRecord; previousName: string }
  | { type: "noted"; record: DiscoveryRecord }
  | { type: "journey-entry"; entry: JourneyEntry };

export type DiscoveryLogListener = (event: DiscoveryLogEvent) => void;

/* ------------------------------------------------------------------ */
/*  DiscoveryLog                                                        */
/* ------------------------------------------------------------------ */

export class DiscoveryLog {
  private readonly records = new Map<string, DiscoveryRecord>();
  private readonly journeyLog: JourneyEntry[] = [];
  private readonly listeners = new Set<DiscoveryLogListener>();
  private totalDistanceLy = 0;
  private readonly sessionStartedAt = Date.now();
  private currentJourneyEntry: JourneyEntry | null = null;

  /* -- Subscribe ---------------------------------------------------- */

  subscribe(listener: DiscoveryLogListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private emit(event: DiscoveryLogEvent): void {
    for (const l of this.listeners) {
      try { l(event); } catch { /* never crash the session */ }
    }
  }

  /* -- Visit -------------------------------------------------------- */

  visit(params: {
    id: string;
    name: string;
    kind: DiscoveryKind;
    origin: DiscoveryOrigin;
    coordinates?: DiscoveryCoordinates;
    seedKey?: string;
    parentId?: string;
    anomalyScore?: number;
    tags?: readonly string[];
    transitDistanceLy?: number;
  }): DiscoveryRecord {
    const now = Date.now();
    const existing = this.records.get(params.id);
    let record: DiscoveryRecord;

    if (existing) {
      record = { ...existing, lastVisitedAt: now, visitCount: existing.visitCount + 1 };
      this.records.set(params.id, record);
      this.emit({ type: "revisited", record });
    } else {
      record = {
        id: params.id,
        name: params.name,
        kind: params.kind,
        origin: params.origin,
        firstVisitedAt: now,
        lastVisitedAt: now,
        visitCount: 1,
        isBookmarked: false,
        coordinates: params.coordinates,
        seedKey: params.seedKey,
        parentId: params.parentId,
        anomalyScore: params.anomalyScore,
        tags: params.tags ?? [],
      };
      this.records.set(params.id, record);
      this.emit({ type: "discovered", record });
    }

    const distanceLy = params.transitDistanceLy ?? 0;
    this.totalDistanceLy += distanceLy;

    if (this.currentJourneyEntry) {
      const closed = { ...this.currentJourneyEntry, departedAt: now };
      this.journeyLog[this.journeyLog.length - 1] = closed;
    }

    const entry: JourneyEntry = {
      discoveryId: params.id,
      arrivedAt: now,
      departedAt: null,
      transitDistanceLy: distanceLy,
    };
    this.journeyLog.push(entry);
    this.currentJourneyEntry = entry;
    this.emit({ type: "journey-entry", entry });
    return record;
  }

  /* -- Bookmarks ---------------------------------------------------- */

  bookmark(id: string): void {
    const r = this.records.get(id);
    if (!r || r.isBookmarked) return;
    const updated = { ...r, isBookmarked: true };
    this.records.set(id, updated);
    this.emit({ type: "bookmarked", record: updated });
  }

  unbookmark(id: string): void {
    const r = this.records.get(id);
    if (!r || !r.isBookmarked) return;
    const updated = { ...r, isBookmarked: false };
    this.records.set(id, updated);
    this.emit({ type: "unbookmarked", record: updated });
  }

  toggleBookmark(id: string): void {
    const r = this.records.get(id);
    if (!r) return;
    r.isBookmarked ? this.unbookmark(id) : this.bookmark(id);
  }

  /* -- Names & notes ------------------------------------------------ */

  rename(id: string, name: string): void {
    const r = this.records.get(id);
    if (!r) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed === r.customName) return;
    const previous = r.customName ?? r.name;
    const updated = { ...r, customName: trimmed };
    this.records.set(id, updated);
    this.emit({ type: "named", record: updated, previousName: previous });
  }

  addNote(id: string, notes: string): void {
    const r = this.records.get(id);
    if (!r) return;
    const updated = { ...r, notes: notes.trim() || undefined };
    this.records.set(id, updated);
    this.emit({ type: "noted", record: updated });
  }

  /* -- Queries ------------------------------------------------------- */

  get(id: string): DiscoveryRecord | undefined { return this.records.get(id); }
  has(id: string): boolean { return this.records.has(id); }
  getAll(): readonly DiscoveryRecord[] { return [...this.records.values()]; }
  getBookmarks(): readonly DiscoveryRecord[] {
    return [...this.records.values()].filter(r => r.isBookmarked);
  }
  getRecent(count = 20): readonly DiscoveryRecord[] {
    return [...this.records.values()]
      .sort((a, b) => b.lastVisitedAt - a.lastVisitedAt)
      .slice(0, count);
  }
  getAnomalies(minScore = 0.6): readonly DiscoveryRecord[] {
    return [...this.records.values()]
      .filter(r => (r.anomalyScore ?? 0) >= minScore)
      .sort((a, b) => (b.anomalyScore ?? 0) - (a.anomalyScore ?? 0));
  }
  search(query: string): readonly DiscoveryRecord[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.getAll();
    return [...this.records.values()].filter(r =>
      (r.customName ?? r.name).toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q) ||
      r.tags.some(t => t.toLowerCase().includes(q))
    );
  }
  get journey(): readonly JourneyEntry[] { return [...this.journeyLog]; }
  get totalDistanceTravelledLy(): number { return this.totalDistanceLy; }
  get discoveryCount(): number { return this.records.size; }
  get bookmarkCount(): number {
    return [...this.records.values()].filter(r => r.isBookmarked).length;
  }

  /* -- Persistence -------------------------------------------------- */

  serialize(): DiscoveryLogState {
    return {
      version: DISCOVERY_LOG_VERSION,
      records: [...this.records.values()],
      journey: [...this.journeyLog],
      totalDistanceTravelledLy: this.totalDistanceLy,
      sessionStartedAt: this.sessionStartedAt,
    };
  }

  static deserialize(state: DiscoveryLogState): DiscoveryLog {
    const log = new DiscoveryLog();
    if (state.version !== DISCOVERY_LOG_VERSION) return log;
    for (const r of state.records) log.records.set(r.id, r);
    log.journeyLog.push(...state.journey);
    log.totalDistanceLy = state.totalDistanceTravelledLy ?? 0;
    return log;
  }

  saveToLocalStorage(key = "universe:discovery-log"): void {
    try { localStorage.setItem(key, JSON.stringify(this.serialize())); } catch { /* quota */ }
  }

  static loadFromLocalStorage(key = "universe:discovery-log"): DiscoveryLog {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return new DiscoveryLog();
      return DiscoveryLog.deserialize(JSON.parse(raw) as DiscoveryLogState);
    } catch { return new DiscoveryLog(); }
  }
}
