import {
  assertValidEntity,
  convertDistance,
  validConfidence,
  validVector,
} from "@known-universe/core";

import type {
  DistanceUnit,
  EntityId,
  EntityKind,
  EvidenceLevel,
  FrameId,
  ScientificSource,
  SourceId,
  SpaceEntity,
  Vec3,
} from "@known-universe/core";

export type ProviderState = "idle" | "loading" | "ready" | "error" | "offline";

export type QuerySort = "name" | "distance" | "relevance" | "kind";

export type SortDirection = "asc" | "desc";

export interface ProviderStatus {
  providerId: string;
  state: ProviderState;

  lastUpdated?: number;
  error?: string;

  records?: number;
}

export interface EntityQuery {
  text?: string;

  parentId?: EntityId;

  frameId?: FrameId;

  kinds?: readonly EntityKind[];

  tags?: readonly string[];

  limit?: number;
  offset?: number;

  sort?: QuerySort;

  direction?: SortDirection;
}

export interface SearchOptions {
  limit?: number;

  kinds?: readonly EntityKind[];

  providerIds?: readonly string[];

  minimumScore?: number;
}

export interface QueryPage<T> {
  items: readonly T[];

  total: number;

  offset: number;

  limit: number;

  hasMore: boolean;
}

export interface CatalogProvider {
  readonly id: string;

  readonly name: string;

  get(id: EntityId): Promise<SpaceEntity | null>;

  query(request: EntityQuery): Promise<QueryPage<SpaceEntity>>;

  search(
    text: string,
    options?: SearchOptions,
  ): Promise<readonly SpaceEntity[]>;

  getSources(): Promise<readonly ScientificSource[]>;

  status(): ProviderStatus;
}

export interface ProviderMetadata {
  id: string;

  name: string;

  description?: string;

  organization?: string;

  homepage?: string;

  license?: string;

  priority: number;
}

export interface CatalogRecord {
  entity: SpaceEntity;

  providerId: string;

  importedAt: number;

  updatedAt?: number;
}

export interface CachedEntity {
  entity: SpaceEntity;

  storedAt: number;

  expiresAt?: number;
}

export interface CatalogCache {
  readonly size: number;

  get(id: EntityId): SpaceEntity | undefined;

  set(entity: SpaceEntity, ttlMs?: number): void;

  delete(id: EntityId): boolean;

  has(id: EntityId): boolean;

  clear(): void;

  values(): readonly SpaceEntity[];
}

export class MemoryCatalogCache implements CatalogCache {
  private readonly entries = new Map<EntityId, CachedEntity>();

  get size(): number {
    this.prune();

    return this.entries.size;
  }

  get(id: EntityId): SpaceEntity | undefined {
    const entry = this.entries.get(id);

    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
      this.entries.delete(id);

      return undefined;
    }

    return entry.entity;
  }

  set(entity: SpaceEntity, ttlMs?: number): void {
    const now = Date.now();

    const entry: CachedEntity = {
      entity,
      storedAt: now,
    };

    if (ttlMs !== undefined && Number.isFinite(ttlMs) && ttlMs > 0) {
      entry.expiresAt = now + ttlMs;
    }

    this.entries.set(entity.id, entry);
  }

  delete(id: EntityId): boolean {
    return this.entries.delete(id);
  }

  has(id: EntityId): boolean {
    return this.get(id) !== undefined;
  }

  clear(): void {
    this.entries.clear();
  }

  values(): readonly SpaceEntity[] {
    this.prune();

    return [...this.entries.values()].map((entry) => entry.entity);
  }

  prune(): number {
    const now = Date.now();

    let removed = 0;

    for (const [id, entry] of this.entries) {
      if (entry.expiresAt !== undefined && entry.expiresAt <= now) {
        this.entries.delete(id);

        removed++;
      }
    }

    return removed;
  }
}

export class ProviderRegistry {
  private readonly providers = new Map<string, CatalogProvider>();

  private readonly metadata = new Map<string, ProviderMetadata>();

  register(
    provider: CatalogProvider,
    metadata?: Partial<ProviderMetadata>,
  ): void {
    if (this.providers.has(provider.id)) {
      throw new Error(`Provider "${provider.id}" is already registered.`);
    }

    this.providers.set(provider.id, provider);

    const record: ProviderMetadata = {
      id: provider.id,

      name: metadata?.name ?? provider.name,

      priority: metadata?.priority ?? 0,
    };

    if (metadata?.description !== undefined) {
      record.description = metadata.description;
    }

    if (metadata?.organization !== undefined) {
      record.organization = metadata.organization;
    }

    if (metadata?.homepage !== undefined) {
      record.homepage = metadata.homepage;
    }

    if (metadata?.license !== undefined) {
      record.license = metadata.license;
    }

    this.metadata.set(provider.id, record);
  }

  unregister(id: string): boolean {
    this.metadata.delete(id);

    return this.providers.delete(id);
  }

  get(id: string): CatalogProvider | undefined {
    return this.providers.get(id);
  }

  getMetadata(id: string): ProviderMetadata | undefined {
    return this.metadata.get(id);
  }

  has(id: string): boolean {
    return this.providers.has(id);
  }

  all(): readonly CatalogProvider[] {
    return [...this.providers.values()];
  }

  ordered(): readonly CatalogProvider[] {
    return [...this.providers.values()].sort((a, b) => {
      const left = this.metadata.get(a.id)?.priority ?? 0;

      const right = this.metadata.get(b.id)?.priority ?? 0;

      return right - left;
    });
  }

  statuses(): ProviderStatus[] {
    return this.all().map((provider) => provider.status());
  }

  clear(): void {
    this.providers.clear();
    this.metadata.clear();
  }

  get size(): number {
    return this.providers.size;
  }
}

function normalizeText(text: string): string {
  return text.normalize("NFKD").toLowerCase().trim();
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length > 0);
}

function searchableText(entity: SpaceEntity): string {
  const values: string[] = [entity.id, entity.name, entity.kind];

  if (entity.aliases) {
    values.push(...entity.aliases);
  }

  if (entity.tags) {
    values.push(...entity.tags);
  }

  if (entity.summary) {
    values.push(entity.summary);
  }

  return normalizeText(values.join(" "));
}

export interface SearchResult {
  entity: SpaceEntity;

  score: number;

  matchedTerms: readonly string[];
}

interface IndexedEntity {
  entity: SpaceEntity;

  searchable: string;

  tokens: Set<string>;
}

export class EntitySearchIndex {
  private readonly entries = new Map<EntityId, IndexedEntity>();

  private readonly tokenIndex = new Map<string, Set<EntityId>>();

  add(entity: SpaceEntity): void {
    this.remove(entity.id);

    const searchable = searchableText(entity);

    const tokens = new Set(tokenize(searchable));

    this.entries.set(entity.id, {
      entity,
      searchable,
      tokens,
    });

    for (const token of tokens) {
      let bucket = this.tokenIndex.get(token);

      if (!bucket) {
        bucket = new Set();

        this.tokenIndex.set(token, bucket);
      }

      bucket.add(entity.id);
    }
  }

  addMany(entities: Iterable<SpaceEntity>): void {
    for (const entity of entities) {
      this.add(entity);
    }
  }

  remove(id: EntityId): boolean {
    const current = this.entries.get(id);

    if (!current) {
      return false;
    }

    for (const token of current.tokens) {
      const bucket = this.tokenIndex.get(token);

      if (!bucket) {
        continue;
      }

      bucket.delete(id);

      if (bucket.size === 0) {
        this.tokenIndex.delete(token);
      }
    }

    return this.entries.delete(id);
  }

  clear(): void {
    this.entries.clear();
    this.tokenIndex.clear();
  }

  search(text: string, options: SearchOptions = {}): SearchResult[] {
    const query = normalizeText(text);

    if (!query) {
      return [];
    }

    const terms = tokenize(query);

    const candidateIds = new Set<EntityId>();

    for (const term of terms) {
      const exact = this.tokenIndex.get(term);

      if (exact) {
        for (const id of exact) {
          candidateIds.add(id);
        }
      }

      for (const [indexedToken, bucket] of this.tokenIndex) {
        if (indexedToken.startsWith(term) || term.startsWith(indexedToken)) {
          for (const id of bucket) {
            candidateIds.add(id);
          }
        }
      }
    }

    if (candidateIds.size === 0) {
      for (const id of this.entries.keys()) {
        candidateIds.add(id);
      }
    }

    const kindSet = options.kinds ? new Set(options.kinds) : null;

    const minimumScore = options.minimumScore ?? 0;

    const results: SearchResult[] = [];

    for (const id of candidateIds) {
      const indexed = this.entries.get(id);

      if (!indexed) {
        continue;
      }

      if (kindSet && !kindSet.has(indexed.entity.kind)) {
        continue;
      }

      let score = 0;

      const matched: string[] = [];

      const name = normalizeText(indexed.entity.name);

      const entityId = normalizeText(indexed.entity.id);

      if (name === query) {
        score += 100;
      }

      if (entityId === query) {
        score += 120;
      }

      if (name.startsWith(query)) {
        score += 60;
      }

      if (indexed.searchable.includes(query)) {
        score += 30;
      }

      for (const term of terms) {
        if (indexed.tokens.has(term)) {
          score += 20;

          matched.push(term);

          continue;
        }

        for (const token of indexed.tokens) {
          if (token.startsWith(term)) {
            score += 8;

            matched.push(term);

            break;
          }
        }
      }

      if (score < minimumScore) {
        continue;
      }

      results.push({
        entity: indexed.entity,

        score,

        matchedTerms: matched,
      });
    }

    results.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.entity.name.localeCompare(b.entity.name);
    });

    const limit = Math.max(1, Math.floor(options.limit ?? 20));

    return results.slice(0, limit);
  }

  get size(): number {
    return this.entries.size;
  }
}

export interface SpatialRecord {
  id: EntityId;

  frameId: FrameId;

  positionMeters: Vec3;
}

function spatialKey(x: number, y: number, z: number): string {
  return `${x}:${y}:${z}`;
}

export class SpatialGridIndex {
  private readonly records = new Map<EntityId, SpatialRecord>();

  private readonly cells = new Map<string, Set<EntityId>>();

  constructor(readonly cellSizeMeters: number) {
    if (!Number.isFinite(cellSizeMeters) || cellSizeMeters <= 0) {
      throw new Error("cellSizeMeters must be greater than zero.");
    }
  }

  private coordinates(position: Vec3): readonly [number, number, number] {
    return [
      Math.floor(position[0] / this.cellSizeMeters),

      Math.floor(position[1] / this.cellSizeMeters),

      Math.floor(position[2] / this.cellSizeMeters),
    ];
  }

  private cellKey(position: Vec3): string {
    const [x, y, z] = this.coordinates(position);

    return spatialKey(x, y, z);
  }

  add(record: SpatialRecord): void {
    this.remove(record.id);

    this.records.set(record.id, record);

    const key = this.cellKey(record.positionMeters);

    let bucket = this.cells.get(key);

    if (!bucket) {
      bucket = new Set();

      this.cells.set(key, bucket);
    }

    bucket.add(record.id);
  }

  addEntity(entity: SpaceEntity): boolean {
    const spatial = entity.spatial;

    if (!spatial) {
      return false;
    }

    if (!validVector(spatial.position)) {
      return false;
    }

    const unitFactor = convertDistance(1, spatial.unit, "m");

    const positionMeters: Vec3 = [
      spatial.position[0] * unitFactor,

      spatial.position[1] * unitFactor,

      spatial.position[2] * unitFactor,
    ];

    this.add({
      id: entity.id,

      frameId: spatial.frameId,

      positionMeters,
    });

    return true;
  }

  remove(id: EntityId): boolean {
    const record = this.records.get(id);

    if (!record) {
      return false;
    }

    const key = this.cellKey(record.positionMeters);

    const bucket = this.cells.get(key);

    bucket?.delete(id);

    if (bucket && bucket.size === 0) {
      this.cells.delete(key);
    }

    return this.records.delete(id);
  }

  get(id: EntityId): SpatialRecord | undefined {
    return this.records.get(id);
  }

  nearby(
    frameId: FrameId,
    centerMeters: Vec3,
    radiusMeters: number,
    limit = 1000,
  ): SpatialRecord[] {
    if (radiusMeters < 0 || !Number.isFinite(radiusMeters)) {
      return [];
    }

    const radiusCells = Math.ceil(radiusMeters / this.cellSizeMeters);

    const [cx, cy, cz] = this.coordinates(centerMeters);

    const results: {
      record: SpatialRecord;

      distanceSquared: number;
    }[] = [];

    const radiusSquared = radiusMeters * radiusMeters;

    for (let x = cx - radiusCells; x <= cx + radiusCells; x++) {
      for (let y = cy - radiusCells; y <= cy + radiusCells; y++) {
        for (let z = cz - radiusCells; z <= cz + radiusCells; z++) {
          const bucket = this.cells.get(spatialKey(x, y, z));

          if (!bucket) {
            continue;
          }

          for (const id of bucket) {
            const record = this.records.get(id);

            if (!record || record.frameId !== frameId) {
              continue;
            }

            const dx = record.positionMeters[0] - centerMeters[0];

            const dy = record.positionMeters[1] - centerMeters[1];

            const dz = record.positionMeters[2] - centerMeters[2];

            const distanceSquared = dx * dx + dy * dy + dz * dz;

            if (distanceSquared > radiusSquared) {
              continue;
            }

            results.push({
              record,
              distanceSquared,
            });
          }
        }
      }
    }

    results.sort((a, b) => a.distanceSquared - b.distanceSquared);

    return results
      .slice(0, Math.max(0, Math.floor(limit)))
      .map((item) => item.record);
  }

  clear(): void {
    this.records.clear();
    this.cells.clear();
  }

  get size(): number {
    return this.records.size;
  }

  get cellCount(): number {
    return this.cells.size;
  }
}

export class SourceRegistry {
  private readonly sources = new Map<SourceId, ScientificSource>();

  add(source: ScientificSource): void {
    if (!source.id.trim()) {
      throw new Error("Source id cannot be empty.");
    }

    if (!source.title.trim()) {
      throw new Error(`Source "${source.id}" must have a title.`);
    }

    this.sources.set(source.id, source);
  }

  addMany(sources: Iterable<ScientificSource>): void {
    for (const source of sources) {
      this.add(source);
    }
  }

  get(id: SourceId): ScientificSource | undefined {
    return this.sources.get(id);
  }

  has(id: SourceId): boolean {
    return this.sources.has(id);
  }

  remove(id: SourceId): boolean {
    return this.sources.delete(id);
  }

  all(): ScientificSource[] {
    return [...this.sources.values()];
  }

  clear(): void {
    this.sources.clear();
  }

  get size(): number {
    return this.sources.size;
  }
}

export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationIssue {
  severity: ValidationSeverity;

  code: string;

  message: string;

  entityId?: EntityId;
}

export interface ValidationReport {
  valid: boolean;

  issues: readonly ValidationIssue[];
}

export function validateEntity(entity: SpaceEntity): ValidationReport {
  const issues: ValidationIssue[] = [];

  try {
    assertValidEntity(entity);
  } catch (error) {
    issues.push({
      severity: "error",

      code: "entity.invalid",

      message: error instanceof Error ? error.message : String(error),

      entityId: entity.id,
    });
  }

  for (const sourceId of entity.sourceIds) {
    if (!sourceId.trim()) {
      issues.push({
        severity: "warning",

        code: "source.empty",

        message: "Entity contains an empty source id.",

        entityId: entity.id,
      });
    }
  }

  const physical = entity.physical;

  if (physical) {
    const values = [
      physical.radiusM,
      physical.massKg,
      physical.temperatureK,
      physical.densityKgM3,
      physical.surfaceGravityMs2,
    ];

    for (const value of values) {
      if (!value) {
        continue;
      }

      if (
        value.confidence !== undefined &&
        !validConfidence(value.confidence)
      ) {
        issues.push({
          severity: "error",

          code: "confidence.invalid",

          message: "Scientific confidence must be between 0 and 1.",

          entityId: entity.id,
        });
      }
    }
  }

  if (entity.orbit?.eccentricity !== undefined) {
    const eccentricity = entity.orbit.eccentricity;

    if (!Number.isFinite(eccentricity) || eccentricity < 0) {
      issues.push({
        severity: "error",

        code: "orbit.eccentricity",

        message: "Orbital eccentricity must be a finite non-negative number.",

        entityId: entity.id,
      });
    }
  }

  if (entity.parentId === entity.id) {
    issues.push({
      severity: "error",

      code: "hierarchy.self-parent",

      message: "Entity cannot be its own parent.",

      entityId: entity.id,
    });
  }

  return {
    valid: !issues.some((issue) => issue.severity === "error"),

    issues,
  };
}

export interface DatasetValidationReport {
  valid: boolean;

  entityCount: number;

  issues: readonly ValidationIssue[];
}

export function validateDataset(
  entities: Iterable<SpaceEntity>,
): DatasetValidationReport {
  const list = [...entities];

  const issues: ValidationIssue[] = [];

  const ids = new Set<EntityId>();

  for (const entity of list) {
    if (ids.has(entity.id)) {
      issues.push({
        severity: "error",

        code: "entity.duplicate-id",

        message: `Duplicate entity id: ${entity.id}`,

        entityId: entity.id,
      });

      continue;
    }

    ids.add(entity.id);

    issues.push(...validateEntity(entity).issues);
  }

  for (const entity of list) {
    if (entity.parentId && !ids.has(entity.parentId)) {
      issues.push({
        severity: "warning",

        code: "hierarchy.missing-parent",

        message: `Parent "${entity.parentId}" is not present in this dataset.`,

        entityId: entity.id,
      });
    }
  }

  return {
    valid: !issues.some((issue) => issue.severity === "error"),

    entityCount: list.length,

    issues,
  };
}

export interface EntityPatch {
  name?: string;

  parentId?: EntityId | null;

  summary?: string | null;

  aliases?: readonly string[];

  tags?: readonly string[];

  sourceIds?: readonly SourceId[];
}

export function patchEntity(
  entity: SpaceEntity,

  patch: EntityPatch,
): SpaceEntity {
  const next: SpaceEntity = {
    ...entity,
  };

  if (patch.name !== undefined) {
    next.name = patch.name;
  }

  if (patch.parentId !== undefined) {
    if (patch.parentId === null) {
      delete next.parentId;
    } else {
      next.parentId = patch.parentId;
    }
  }

  if (patch.summary !== undefined) {
    if (patch.summary === null) {
      delete next.summary;
    } else {
      next.summary = patch.summary;
    }
  }

  if (patch.aliases !== undefined) {
    next.aliases = [...patch.aliases];
  }

  if (patch.tags !== undefined) {
    next.tags = [...patch.tags];
  }

  if (patch.sourceIds !== undefined) {
    next.sourceIds = [...patch.sourceIds];
  }

  return next;
}

export type ConflictStrategy =
  "first" | "last" | "prefer-sourced" | "prefer-priority";

export interface EntityCandidate {
  entity: SpaceEntity;

  providerId: string;

  priority: number;
}

export function resolveEntityConflict(
  candidates: readonly EntityCandidate[],

  strategy: ConflictStrategy = "prefer-priority",
): EntityCandidate | undefined {
  if (candidates.length === 0) {
    return undefined;
  }

  switch (strategy) {
    case "first":
      return candidates[0];

    case "last":
      return candidates[candidates.length - 1];

    case "prefer-sourced":
      return [...candidates].sort(
        (a, b) => b.entity.sourceIds.length - a.entity.sourceIds.length,
      )[0];

    case "prefer-priority":
      return [...candidates].sort((a, b) => b.priority - a.priority)[0];
  }
}

export interface DatasetStats {
  totalEntities: number;

  byKind: Readonly<Partial<Record<EntityKind, number>>>;

  withSpatialPosition: number;

  withPhysicalData: number;

  withOrbit: number;

  sourced: number;

  unsourced: number;
}

export function datasetStats(entities: Iterable<SpaceEntity>): DatasetStats {
  const byKind: Partial<Record<EntityKind, number>> = {};

  let totalEntities = 0;

  let withSpatialPosition = 0;

  let withPhysicalData = 0;

  let withOrbit = 0;

  let sourced = 0;

  for (const entity of entities) {
    totalEntities++;

    byKind[entity.kind] = (byKind[entity.kind] ?? 0) + 1;

    if (entity.spatial) {
      withSpatialPosition++;
    }

    if (entity.physical) {
      withPhysicalData++;
    }

    if (entity.orbit) {
      withOrbit++;
    }

    if (entity.sourceIds.length > 0) {
      sourced++;
    }
  }

  return {
    totalEntities,

    byKind,

    withSpatialPosition,

    withPhysicalData,

    withOrbit,

    sourced,

    unsourced: totalEntities - sourced,
  };
}

export interface IngestResult {
  accepted: number;

  rejected: number;

  replaced: number;

  issues: readonly ValidationIssue[];
}

export interface IngestOptions {
  validate?: boolean;

  replaceExisting?: boolean;
}

export class CatalogStore {
  private readonly entities = new Map<EntityId, SpaceEntity>();

  readonly search = new EntitySearchIndex();

  readonly sources = new SourceRegistry();

  readonly spatial: SpatialGridIndex;

  constructor(spatialCellSizeMeters = 1e9) {
    this.spatial = new SpatialGridIndex(spatialCellSizeMeters);
  }

  get size(): number {
    return this.entities.size;
  }

  get(id: EntityId): SpaceEntity | undefined {
    return this.entities.get(id);
  }

  has(id: EntityId): boolean {
    return this.entities.has(id);
  }

  values(): readonly SpaceEntity[] {
    return [...this.entities.values()];
  }

  ingest(
    incoming: Iterable<SpaceEntity>,

    options: IngestOptions = {},
  ): IngestResult {
    const validate = options.validate ?? true;

    const replaceExisting = options.replaceExisting ?? true;

    let accepted = 0;
    let rejected = 0;
    let replaced = 0;

    const issues: ValidationIssue[] = [];

    for (const entity of incoming) {
      if (validate) {
        const report = validateEntity(entity);

        issues.push(...report.issues);

        if (!report.valid) {
          rejected++;
          continue;
        }
      }

      const exists = this.entities.has(entity.id);

      if (exists && !replaceExisting) {
        rejected++;

        issues.push({
          severity: "warning",

          code: "entity.exists",

          message: `Entity "${entity.id}" already exists.`,

          entityId: entity.id,
        });

        continue;
      }

      if (exists) {
        this.remove(entity.id);

        replaced++;
      }

      this.entities.set(entity.id, entity);

      this.search.add(entity);

      this.spatial.addEntity(entity);

      accepted++;
    }

    return {
      accepted,
      rejected,
      replaced,
      issues,
    };
  }

  remove(id: EntityId): boolean {
    const removed = this.entities.delete(id);

    if (!removed) {
      return false;
    }

    this.search.remove(id);
    this.spatial.remove(id);

    return true;
  }

  clear(): void {
    this.entities.clear();
    this.search.clear();
    this.spatial.clear();
  }

  query(request: EntityQuery = {}): QueryPage<SpaceEntity> {
    let items = [...this.entities.values()];

    if (request.parentId !== undefined) {
      items = items.filter((entity) => entity.parentId === request.parentId);
    }

    if (request.frameId !== undefined) {
      items = items.filter(
        (entity) => entity.spatial?.frameId === request.frameId,
      );
    }

    if (request.kinds && request.kinds.length > 0) {
      const kinds = new Set(request.kinds);

      items = items.filter((entity) => kinds.has(entity.kind));
    }

    if (request.tags && request.tags.length > 0) {
      const tags = new Set(request.tags.map(normalizeText));

      items = items.filter((entity) => {
        const entityTags = new Set((entity.tags ?? []).map(normalizeText));

        for (const tag of tags) {
          if (!entityTags.has(tag)) {
            return false;
          }
        }

        return true;
      });
    }

    if (request.text && request.text.trim()) {
      const found = new Set(
        this.search
          .search(request.text, {
            limit: Math.max(this.entities.size, 1),
          })
          .map((result) => result.entity.id),
      );

      items = items.filter((entity) => found.has(entity.id));
    }

    const direction = request.direction === "desc" ? -1 : 1;

    switch (request.sort) {
      case "name":
        items.sort((a, b) => a.name.localeCompare(b.name) * direction);

        break;

      case "kind":
        items.sort((a, b) => a.kind.localeCompare(b.kind) * direction);

        break;

      case "relevance":
      case "distance":
      case undefined:
        break;
    }

    const total = items.length;

    const offset = Math.max(0, Math.floor(request.offset ?? 0));

    const limit = Math.max(1, Math.floor(request.limit ?? 100));

    const page = items.slice(offset, offset + limit);

    return {
      items: page,

      total,

      offset,

      limit,

      hasMore: offset + page.length < total,
    };
  }

  stats(): DatasetStats {
    return datasetStats(this.entities.values());
  }
}

export class MemoryCatalogProvider implements CatalogProvider {
  private providerState: ProviderState = "ready";

  private lastUpdated = Date.now();

  readonly store: CatalogStore;

  constructor(
    readonly id: string,

    readonly name: string,

    entities: Iterable<SpaceEntity> = [],

    sources: Iterable<ScientificSource> = [],
  ) {
    this.store = new CatalogStore();

    this.store.ingest(entities);

    this.store.sources.addMany(sources);
  }

  async get(id: EntityId): Promise<SpaceEntity | null> {
    return this.store.get(id) ?? null;
  }

  async query(request: EntityQuery): Promise<QueryPage<SpaceEntity>> {
    return this.store.query(request);
  }

  async search(
    text: string,
    options: SearchOptions = {},
  ): Promise<readonly SpaceEntity[]> {
    return this.store.search
      .search(text, options)
      .map((result) => result.entity);
  }

  async getSources(): Promise<readonly ScientificSource[]> {
    return this.store.sources.all();
  }

  status(): ProviderStatus {
    return {
      providerId: this.id,

      state: this.providerState,

      lastUpdated: this.lastUpdated,

      records: this.store.size,
    };
  }

  ingest(
    entities: Iterable<SpaceEntity>,

    options: IngestOptions = {},
  ): IngestResult {
    this.providerState = "loading";

    try {
      const result = this.store.ingest(entities, options);

      this.lastUpdated = Date.now();

      this.providerState = "ready";

      return result;
    } catch (error) {
      this.providerState = "error";

      throw error;
    }
  }
}

export interface CompositeProviderOptions {
  conflictStrategy?: ConflictStrategy;

  cacheTtlMs?: number;
}

export class CompositeCatalogProvider implements CatalogProvider {
  readonly id = "composite";

  readonly name = "Known Universe Composite Catalog";

  private state: ProviderState = "idle";

  private error: string | undefined;

  private lastUpdated: number | undefined;

  private readonly cache = new MemoryCatalogCache();

  private readonly strategy: ConflictStrategy;

  private readonly cacheTtlMs: number;

  constructor(
    private readonly registry: ProviderRegistry,

    options: CompositeProviderOptions = {},
  ) {
    this.strategy = options.conflictStrategy ?? "prefer-priority";

    this.cacheTtlMs = options.cacheTtlMs ?? 60_000;
  }

  async get(id: EntityId): Promise<SpaceEntity | null> {
    const cached = this.cache.get(id);

    if (cached) {
      return cached;
    }

    const candidates: EntityCandidate[] = [];

    this.state = "loading";

    try {
      for (const provider of this.registry.ordered()) {
        const entity = await provider.get(id);

        if (!entity) {
          continue;
        }

        candidates.push({
          entity,

          providerId: provider.id,

          priority: this.registry.getMetadata(provider.id)?.priority ?? 0,
        });
      }

      const selected = resolveEntityConflict(candidates, this.strategy);

      this.state = "ready";

      this.lastUpdated = Date.now();

      if (!selected) {
        return null;
      }

      this.cache.set(selected.entity, this.cacheTtlMs);

      return selected.entity;
    } catch (error) {
      this.state = "error";

      this.error = error instanceof Error ? error.message : String(error);

      throw error;
    }
  }

  async query(request: EntityQuery): Promise<QueryPage<SpaceEntity>> {
    this.state = "loading";

    try {
      const providers = this.registry.ordered();

      const pages = await Promise.all(
        providers.map((provider) => provider.query(request)),
      );

      const candidates = new Map<EntityId, EntityCandidate[]>();

      for (let i = 0; i < providers.length; i++) {
        const provider = providers[i];

        const page = pages[i];

        if (!provider || !page) {
          continue;
        }

        const priority = this.registry.getMetadata(provider.id)?.priority ?? 0;

        for (const entity of page.items) {
          let group = candidates.get(entity.id);

          if (!group) {
            group = [];

            candidates.set(entity.id, group);
          }

          group.push({
            entity,

            providerId: provider.id,

            priority,
          });
        }
      }

      const entities: SpaceEntity[] = [];

      for (const group of candidates.values()) {
        const selected = resolveEntityConflict(group, this.strategy);

        if (selected) {
          entities.push(selected.entity);
        }
      }

      const offset = Math.max(0, request.offset ?? 0);

      const limit = Math.max(1, request.limit ?? 100);

      const items = entities.slice(offset, offset + limit);

      this.state = "ready";

      this.lastUpdated = Date.now();

      return {
        items,

        total: entities.length,

        offset,

        limit,

        hasMore: offset + items.length < entities.length,
      };
    } catch (error) {
      this.state = "error";

      this.error = error instanceof Error ? error.message : String(error);

      throw error;
    }
  }

  async search(
    text: string,
    options: SearchOptions = {},
  ): Promise<readonly SpaceEntity[]> {
    const providers = options.providerIds
      ? this.registry
          .ordered()
          .filter((provider) => options.providerIds?.includes(provider.id))
      : this.registry.ordered();

    const results = await Promise.all(
      providers.map((provider) => provider.search(text, options)),
    );

    const selected = new Map<EntityId, EntityCandidate[]>();

    for (let index = 0; index < providers.length; index++) {
      const provider = providers[index];

      const entities = results[index];

      if (!provider || !entities) {
        continue;
      }

      const priority = this.registry.getMetadata(provider.id)?.priority ?? 0;

      for (const entity of entities) {
        let group = selected.get(entity.id);

        if (!group) {
          group = [];

          selected.set(entity.id, group);
        }

        group.push({
          entity,

          providerId: provider.id,

          priority,
        });
      }
    }

    const output: SpaceEntity[] = [];

    for (const group of selected.values()) {
      const entity = resolveEntityConflict(group, this.strategy);

      if (entity) {
        output.push(entity.entity);
      }
    }

    return output.slice(0, Math.max(1, options.limit ?? 20));
  }

  async getSources(): Promise<readonly ScientificSource[]> {
    const batches = await Promise.all(
      this.registry.all().map((provider) => provider.getSources()),
    );

    const sources = new Map<SourceId, ScientificSource>();

    for (const batch of batches) {
      for (const source of batch) {
        sources.set(source.id, source);
      }
    }

    return [...sources.values()];
  }

  status(): ProviderStatus {
    const result: ProviderStatus = {
      providerId: this.id,

      state: this.state,
    };

    if (this.lastUpdated !== undefined) {
      result.lastUpdated = this.lastUpdated;
    }

    if (this.error !== undefined) {
      result.error = this.error;
    }

    return result;
  }
}

export interface RetryPolicy {
  attempts: number;

  initialDelayMs: number;

  maximumDelayMs: number;

  multiplier: number;

  jitter: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  attempts: 3,

  initialDelayMs: 300,

  maximumDelayMs: 5_000,

  multiplier: 2,

  jitter: 0.2,
};

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function retry<T>(
  operation: (attempt: number) => Promise<T>,

  policy: Partial<RetryPolicy> = {},
): Promise<T> {
  const settings = {
    ...DEFAULT_RETRY_POLICY,
    ...policy,
  };

  const attempts = Math.max(1, Math.floor(settings.attempts));

  let delay = Math.max(0, settings.initialDelayMs);

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;

      if (attempt >= attempts) {
        break;
      }

      const jitter = 1 + (Math.random() * 2 - 1) * settings.jitter;

      await sleep(Math.max(0, delay * jitter));

      delay = Math.min(
        settings.maximumDelayMs,

        delay * settings.multiplier,
      );
    }
  }

  throw lastError;
}

export class RateLimiter {
  private nextAllowed = 0;

  private chain: Promise<void> = Promise.resolve();

  constructor(readonly minimumIntervalMs: number) {
    if (minimumIntervalMs < 0 || !Number.isFinite(minimumIntervalMs)) {
      throw new Error(
        "minimumIntervalMs must be a non-negative finite number.",
      );
    }
  }

  schedule<T>(task: () => Promise<T>): Promise<T> {
    let resolveValue: (value: T) => void;

    let rejectValue: (reason?: unknown) => void;

    const result = new Promise<T>((resolve, reject) => {
      resolveValue = resolve;

      rejectValue = reject;
    });

    this.chain = this.chain
      .catch(() => {})
      .then(async () => {
        const now = Date.now();

        const wait = Math.max(0, this.nextAllowed - now);

        if (wait > 0) {
          await sleep(wait);
        }

        this.nextAllowed = Date.now() + this.minimumIntervalMs;

        try {
          resolveValue(await task());
        } catch (error) {
          rejectValue(error);
        }
      });

    return result;
  }
}

export interface HttpRequestOptions {
  method?: "GET" | "POST";

  headers?: Readonly<Record<string, string>>;

  body?: string;

  timeoutMs?: number;
}

export interface HttpResponse<T> {
  status: number;

  ok: boolean;

  headers: Readonly<Record<string, string>>;

  data: T;
}

export interface HttpTransport {
  request<T>(
    url: string,
    options?: HttpRequestOptions,
  ): Promise<HttpResponse<T>>;
}

export class FetchTransport implements HttpTransport {
  async request<T>(
    url: string,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponse<T>> {
    const controller = new AbortController();

    const timeout = options.timeoutMs ?? 20_000;

    const timer = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const init: RequestInit = {
        method: options.method ?? "GET",

        signal: controller.signal,
      };

      if (options.headers) {
        init.headers = options.headers;
      }

      if (options.body !== undefined) {
        init.body = options.body;
      }

      const response = await fetch(url, init);

      const headers: Record<string, string> = {};

      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const data = (await response.json()) as T;

      return {
        status: response.status,

        ok: response.ok,

        headers,

        data,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

export interface DatasetSnapshot {
  version: number;

  createdAt: number;

  entities: readonly SpaceEntity[];

  sources: readonly ScientificSource[];

  metadata: Readonly<Record<string, string>>;
}

export function createSnapshot(
  store: CatalogStore,

  metadata: Readonly<Record<string, string>> = {},
): DatasetSnapshot {
  return {
    version: 1,

    createdAt: Date.now(),

    entities: store.values(),

    sources: store.sources.all(),

    metadata: {
      ...metadata,
    },
  };
}

export function serializeSnapshot(snapshot: DatasetSnapshot): string {
  return JSON.stringify(snapshot);
}

export function parseSnapshot(value: string): DatasetSnapshot {
  const parsed = JSON.parse(value) as unknown;

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Snapshot must be an object.");
  }

  const record = parsed as Record<string, unknown>;

  if (record.version !== 1) {
    throw new Error("Unsupported snapshot version.");
  }

  if (!Array.isArray(record.entities)) {
    throw new Error("Snapshot has no entity array.");
  }

  if (!Array.isArray(record.sources)) {
    throw new Error("Snapshot has no source array.");
  }

  const metadata: Record<string, string> = {};

  if (typeof record.metadata === "object" && record.metadata !== null) {
    for (const [key, value] of Object.entries(record.metadata)) {
      if (typeof value === "string") {
        metadata[key] = value;
      }
    }
  }

  return {
    version: 1,

    createdAt: typeof record.createdAt === "number" ? record.createdAt : 0,

    entities: record.entities as SpaceEntity[],

    sources: record.sources as ScientificSource[],

    metadata,
  };
}

export function restoreSnapshot(
  snapshot: DatasetSnapshot,

  store = new CatalogStore(),
): CatalogStore {
  store.clear();

  store.sources.addMany(snapshot.sources);

  const report = store.ingest(snapshot.entities);

  if (report.rejected > 0) {
    throw new Error(
      `Snapshot restoration rejected ${report.rejected} entities.`,
    );
  }

  return store;
}

export interface DataCoordinatorOptions {
  cacheTtlMs?: number;

  spatialCellSizeMeters?: number;
}

export class DataCoordinator {
  readonly providers = new ProviderRegistry();

  readonly store: CatalogStore;

  readonly cache = new MemoryCatalogCache();

  readonly composite: CompositeCatalogProvider;

  private readonly cacheTtl: number;

  constructor(options: DataCoordinatorOptions = {}) {
    this.cacheTtl = options.cacheTtlMs ?? 60_000;

    this.store = new CatalogStore(options.spatialCellSizeMeters ?? 1e9);

    this.composite = new CompositeCatalogProvider(this.providers, {
      cacheTtlMs: this.cacheTtl,
    });
  }

  register(
    provider: CatalogProvider,

    metadata?: Partial<ProviderMetadata>,
  ): void {
    this.providers.register(provider, metadata);
  }

  async get(id: EntityId): Promise<SpaceEntity | null> {
    const local = this.store.get(id);

    if (local) {
      return local;
    }

    const cached = this.cache.get(id);

    if (cached) {
      return cached;
    }

    const entity = await this.composite.get(id);

    if (!entity) {
      return null;
    }

    this.cache.set(entity, this.cacheTtl);

    this.store.ingest([entity]);

    return entity;
  }

  async search(
    text: string,
    options: SearchOptions = {},
  ): Promise<readonly SpaceEntity[]> {
    const local = this.store.search
      .search(text, options)
      .map((result) => result.entity);

    const limit = Math.max(1, options.limit ?? 20);

    if (local.length >= limit) {
      return local.slice(0, limit);
    }

    const remote = await this.composite.search(text, options);

    const merged = new Map<EntityId, SpaceEntity>();

    for (const entity of local) {
      merged.set(entity.id, entity);
    }

    for (const entity of remote) {
      if (!merged.has(entity.id)) {
        merged.set(entity.id, entity);

        this.store.ingest([entity]);
      }
    }

    return [...merged.values()].slice(0, limit);
  }

  async preloadSources(): Promise<number> {
    const sources = await this.composite.getSources();

    this.store.sources.addMany(sources);

    return sources.length;
  }

  nearby(
    frameId: FrameId,
    centerMeters: Vec3,
    radiusMeters: number,
    limit?: number,
  ): SpaceEntity[] {
    const records = this.store.spatial.nearby(
      frameId,
      centerMeters,
      radiusMeters,
      limit,
    );

    const entities: SpaceEntity[] = [];

    for (const record of records) {
      const entity = this.store.get(record.id);

      if (entity) {
        entities.push(entity);
      }
    }

    return entities;
  }

  clearCaches(): void {
    this.cache.clear();
  }

  clearAll(): void {
    this.cache.clear();

    this.store.clear();

    this.providers.clear();
  }

  stats(): DatasetStats {
    return this.store.stats();
  }
}

export interface RawEntityRecord {
  id: string;

  name: string;

  kind: EntityKind;

  parentId?: string;

  x?: number;
  y?: number;
  z?: number;

  unit?: DistanceUnit;

  frameId?: FrameId;

  radiusM?: number;

  massKg?: number;

  aliases?: readonly string[];

  tags?: readonly string[];

  summary?: string;

  sourceIds?: readonly SourceId[];
}

export interface RecordMapperOptions {
  defaultFrameId: FrameId;

  defaultUnit: DistanceUnit;

  evidence: EvidenceLevel;
}

export function mapRawRecord(
  record: RawEntityRecord,

  options: RecordMapperOptions,
): SpaceEntity {
  const entity: SpaceEntity = {
    id: record.id,

    name: record.name,

    kind: record.kind,

    sourceIds: record.sourceIds ? [...record.sourceIds] : [],
  };

  if (record.parentId !== undefined) {
    entity.parentId = record.parentId;
  }

  if (record.summary !== undefined) {
    entity.summary = record.summary;
  }

  if (record.aliases !== undefined) {
    entity.aliases = [...record.aliases];
  }

  if (record.tags !== undefined) {
    entity.tags = [...record.tags];
  }

  if (
    record.x !== undefined &&
    record.y !== undefined &&
    record.z !== undefined
  ) {
    entity.spatial = {
      frameId: record.frameId ?? options.defaultFrameId,

      position: [record.x, record.y, record.z],

      unit: record.unit ?? options.defaultUnit,
    };
  }

  if (record.radiusM !== undefined || record.massKg !== undefined) {
    entity.physical = {};

    if (record.radiusM !== undefined) {
      entity.physical.radiusM = {
        value: record.radiusM,

        evidence: options.evidence,

        sourceIds: entity.sourceIds,
      };
    }

    if (record.massKg !== undefined) {
      entity.physical.massKg = {
        value: record.massKg,

        evidence: options.evidence,

        sourceIds: entity.sourceIds,
      };
    }
  }

  return entity;
}

export interface ImportBatch {
  name: string;

  providerId: string;

  records: readonly RawEntityRecord[];

  options: RecordMapperOptions;
}

export interface ImportBatchResult {
  name: string;

  mapped: number;

  accepted: number;

  rejected: number;

  issues: readonly ValidationIssue[];
}

export function importBatch(
  batch: ImportBatch,

  store: CatalogStore,
): ImportBatchResult {
  const mapped: SpaceEntity[] = [];

  for (const record of batch.records) {
    mapped.push(mapRawRecord(record, batch.options));
  }

  const result = store.ingest(mapped);

  return {
    name: batch.name,

    mapped: mapped.length,

    accepted: result.accepted,

    rejected: result.rejected,

    issues: result.issues,
  };
}

export interface DataHealthReport {
  providers: number;

  readyProviders: number;

  errorProviders: number;

  localEntities: number;

  cachedEntities: number;

  indexedEntities: number;

  spatialEntities: number;

  sources: number;

  validation: DatasetValidationReport;
}

export function dataHealthReport(
  coordinator: DataCoordinator,
): DataHealthReport {
  const statuses = coordinator.providers.statuses();

  const entities = coordinator.store.values();

  return {
    providers: statuses.length,

    readyProviders: statuses.filter((status) => status.state === "ready")
      .length,

    errorProviders: statuses.filter((status) => status.state === "error")
      .length,

    localEntities: coordinator.store.size,

    cachedEntities: coordinator.cache.size,

    indexedEntities: coordinator.store.search.size,

    spatialEntities: coordinator.store.spatial.size,

    sources: coordinator.store.sources.size,

    validation: validateDataset(entities),
  };
}

export function formatDataHealthReport(report: DataHealthReport): string {
  const lines = [
    `Providers: ${report.providers}`,

    `Ready providers: ${report.readyProviders}`,

    `Provider errors: ${report.errorProviders}`,

    `Entities: ${report.localEntities}`,

    `Cached: ${report.cachedEntities}`,

    `Search indexed: ${report.indexedEntities}`,

    `Spatial indexed: ${report.spatialEntities}`,

    `Sources: ${report.sources}`,

    `Dataset valid: ${report.validation.valid}`,

    `Validation issues: ${report.validation.issues.length}`,
  ];

  return lines.join("\n");
}

export const DATA_FEATURES = {
  providerRegistry: true,

  compositeProviders: true,

  caching: true,

  searchIndex: true,

  spatialIndex: true,

  provenance: true,

  validation: true,

  datasetSnapshots: true,

  retries: true,

  rateLimiting: true,

  httpTransport: true,

  conflictResolution: true,

  rawRecordMapping: true,

  healthReporting: true,
} as const;

export const DATA_VERSION = 2;
export * from "./astronomy-core";
export * from "./astronomy-catalog";
export * from "./transfer-planner";
