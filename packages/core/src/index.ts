export type EntityId = string;
export type FrameId = string;
export type SourceId = string;

export type Vec3 = readonly [number, number, number];

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export type DistanceUnit =
  | "m"
  | "km"
  | "au"
  | "ly"
  | "pc";

export const METERS_PER_UNIT: Record<DistanceUnit, number> = {
  m: 1,
  km: 1_000,
  au: 149_597_870_700,
  ly: 9_460_730_472_580_700,
  pc: 30_856_775_814_913_670
};

export function convertDistance(
  value: number,
  from: DistanceUnit,
  to: DistanceUnit
) {
  return value * METERS_PER_UNIT[from] / METERS_PER_UNIT[to];
}

export function vectorLength([x, y, z]: Vec3) {
  return Math.sqrt(x * x + y * y + z * z);
}

/*
 * We deliberately use hierarchical reference frames instead
 * of placing the entire universe inside one enormous XYZ space.
 *
 * Earth can have its own frame, the Solar System another,
 * the Milky Way another, and so on.
 */
export type ReferenceFrameKind =
  | "local"
  | "surface"
  | "body"
  | "barycentric"
  | "stellar"
  | "galactic"
  | "cosmological";

export interface ReferenceFrame {
  id: FrameId;
  name: string;
  kind: ReferenceFrameKind;

  parentId?: FrameId;
  originEntityId?: EntityId;
}

export interface SpatialPosition {
  frameId: FrameId;
  position: Vec3;
  unit: DistanceUnit;

  orientation?: Quaternion;
}

export type EvidenceLevel =
  | "measured"
  | "derived"
  | "estimated"
  | "theoretical"
  | "unknown";

export interface ScientificSource {
  id: SourceId;
  title: string;

  organization?: string;
  url?: string;
  accessedAt?: string;
}

export interface ScientificValue<T> {
  value: T;
  evidence: EvidenceLevel;

  /*
   * Optional 0-1 confidence value.
   * We do not invent one when a dataset does not provide
   * enough information to justify it.
   */
  confidence?: number;

  sourceIds: readonly SourceId[];
}

export type EntityKind =
  | "surface-feature"
  | "building"
  | "city"
  | "country"
  | "planet"
  | "dwarf-planet"
  | "moon"
  | "star"
  | "black-hole"
  | "neutron-star"
  | "asteroid"
  | "comet"
  | "satellite"
  | "spacecraft"
  | "debris"
  | "nebula"
  | "star-cluster"
  | "galaxy"
  | "galaxy-group"
  | "galaxy-cluster"
  | "cosmic-structure";

export interface PhysicalProperties {
  radiusM?: ScientificValue<number>;
  massKg?: ScientificValue<number>;
  temperatureK?: ScientificValue<number>;
  densityKgM3?: ScientificValue<number>;
  surfaceGravityMs2?: ScientificValue<number>;
}

export interface OrbitalElements {
  semiMajorAxisM?: number;
  eccentricity?: number;
  inclinationDeg?: number;
  longitudeAscendingNodeDeg?: number;
  argumentPeriapsisDeg?: number;
  meanAnomalyDeg?: number;
  epochJulianDay?: number;
}

export interface SpaceEntity {
  id: EntityId;
  name: string;
  kind: EntityKind;

  parentId?: EntityId;

  spatial?: SpatialPosition;
  physical?: PhysicalProperties;
  orbit?: OrbitalElements;

  summary?: string;

  aliases?: readonly string[];
  tags?: readonly string[];

  sourceIds: readonly SourceId[];
}

/*
 * Astronomical calculations should not depend directly on
 * JavaScript Date. Different calculations may need UTC,
 * TAI, TT or TDB.
 */
export type TimeScale =
  | "UTC"
  | "TAI"
  | "TT"
  | "TDB";

export interface AstroTime {
  julianDay: number;
  scale: TimeScale;
}

export interface ClockState {
  time: AstroTime;

  /*
   * 1 = realtime
   * 10 = ten times faster
   * -1 = realtime backwards
   */
  rate: number;

  paused: boolean;
}

export function dateToJulianDay(date: Date): number {
  return date.getTime() / 86_400_000 + 2_440_587.5;
}

export function julianDayToDate(julianDay: number): Date {
  return new Date((julianDay - 2_440_587.5) * 86_400_000);
}

export interface KnowledgeProfile {
  entityId: EntityId;

  position?: number;
  mass?: number;
  composition?: number;
  surface?: number;
  overall?: number;

  notes?: readonly string[];
}

export type InterstellarCapability =
  | "none"
  | "uncrewed-probe"
  | "crew-capable";

export interface HumanityStatus {
  year: number;

  civilizationLabel: string;

  /*
   * This remains an estimate, not an absolute classification.
   */
  kardashevEstimate?: number;

  farthestHumanObjectId?: EntityId;

  humansLivingOffEarth: number;

  interstellarCapability: InterstellarCapability;

  confirmedExtraterrestrialLife: boolean;
}

export function findEntity(
  id: EntityId,
  entities: Iterable<SpaceEntity>
) {
  for (const entity of entities) {
    if (entity.id === id) {
      return entity;
    }
  }

  return undefined;
}

export function getChildren(
  parentId: EntityId,
  entities: Iterable<SpaceEntity>
) {
  const children: SpaceEntity[] = [];

  for (const entity of entities) {
    if (entity.parentId === parentId) {
      children.push(entity);
    }
  }

  return children;
}

export function validConfidence(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

export function validVector(vector: Vec3) {
  return vector.every(Number.isFinite);
}

export function assertValidEntity(entity: SpaceEntity): void {
  if (!entity.id || !entity.name || !entity.kind) {
    throw new Error("Entity must have non-empty id, name, and kind");
  }

  if (entity.spatial) {
    if (!entity.spatial.frameId || !validVector(entity.spatial.position)) {
      throw new Error("Entity.spatial must have a frameId and finite position");
    }
    if (entity.spatial.orientation) {
      const orientation = entity.spatial.orientation;
      if (![orientation.x, orientation.y, orientation.z, orientation.w].every(Number.isFinite)) {
        throw new Error("Entity.spatial.orientation must contain finite numbers");
      }
    }
  }

  if (entity.physical) {
    const fields: readonly (keyof PhysicalProperties)[] = [
      "radiusM",
      "massKg",
      "temperatureK",
      "densityKgM3",
      "surfaceGravityMs2",
    ];
    for (const field of fields) {
      const value = entity.physical[field];
      if (value && (!Number.isFinite(value.value) || !validConfidence(value.confidence ?? 1))) {
        throw new Error(`Entity.physical.${field} must contain valid values`);
      }
    }
  }

  if (entity.orbit) {
    const fields: readonly (keyof OrbitalElements)[] = [
      "semiMajorAxisM",
      "eccentricity",
      "inclinationDeg",
      "longitudeAscendingNodeDeg",
      "argumentPeriapsisDeg",
      "meanAnomalyDeg",
      "epochJulianDay",
    ];
    for (const field of fields) {
      const value = entity.orbit[field];
      if (value !== undefined && !Number.isFinite(value)) {
        throw new Error(`Entity.orbit.${field} must be finite`);
      }
    }
    if (entity.orbit.eccentricity !== undefined && entity.orbit.eccentricity < 0) {
      throw new Error("Entity.orbit.eccentricity must be non-negative");
    }
  }

  if (entity.sourceIds.some((sourceId) => !sourceId.trim())) {
    throw new Error("Entity.sourceIds must contain non-empty strings");
  }
}

export const ARCHITECTURE_VERSION = 1;
export const CORE_NAME = "Known Universe Core";