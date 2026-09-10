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

export function assertValidEntity(entity: SpaceEntity): void {
    // Basic validation: throw if required fields are missing or invalid
    if (!entity.id || typeof entity.id !== 'string') {
        throw new Error('Entity must have a non-empty string id');
    }
    if (!entity.name || typeof entity.name !== 'string') {
        throw new Error('Entity must have a non-empty string name');
    }
    if (!entity.kind || typeof entity.kind !== 'string') {
        throw new Error('Entity must have a valid EntityKind');
    }
    // Optionally validate spatial, physical, orbit if present
    if (entity.spatial !== undefined) {
        if (!entity.spatial.frameId || typeof entity.spatial.frameId !== 'string') {
            throw new Error('Entity.spatial.frameId must be a non-empty string');
        }
        if (entity.spatial.position === undefined || !Array.isArray(entity.spatial.position) || entity.spatial.position.length !== 3) {
            throw new Error('Entity.spatial.position must be a tuple of three numbers');
        }
        for (const coord of entity.spatial.position) {
            if (typeof coord !== 'number' || !isFinite(coord)) {
                throw new Error('Entity.spatial.position coordinates must be finite numbers');
            }
        }
        if (entity.spatial.unit === undefined || typeof entity.spatial.unit !== 'string') {
            throw new Error('Entity.spatial.unit must be a string');
        }
        // Orientation validation if present
        if (entity.spatial.orientation !== undefined) {
            const q = entity.spatial.orientation;
            if (!(q instanceof Array) || q.length !== 4) {
                throw new Error('Entity.spatial.orientation must be a quaternion [x, y, z, w]');
            }
            for (const val of q) {
                if (typeof val !== 'number' || !isFinite(val)) {
                    throw new Error('Entity.spatial.orientation components must be finite numbers');
                }
            }
        }
    }
    // Validate physical properties if present
    if (entity.physical !== undefined) {
        const phys = entity.physical;
        // Each optional field, if present, must be a ScientificValue
        const fields = ['radiusM', 'massKg', 'temperatureK', 'densityKgM3', 'surfaceGravityMs2'];
        for (const field of fields) {
            const val = phys[field];
            if (val !== undefined) {
                if (typeof val !== 'object' || val === null) {
                    throw new Error(`Entity.physical.${field} must be a ScientificValue object`);
                }
                if (typeof val.value !== 'number' || !isFinite(val.value)) {
                    throw new Error(`Entity.physical.${field}.value must be a finite number`);
                }
                if (val.evidence !== undefined && typeof val.evidence !== 'string') {
                    throw new Error(`Entity.physical.${field}.evidence must be a string`);
                }
                if (val.confidence !== undefined && (typeof val.confidence !== 'number' || val.confidence < 0 || val.confidence > 1)) {
                    throw new Error(`Entity.physical.${field}.confidence must be a number between 0 and 1`);
                }
                if (!Array.isArray(val.sourceIds)) {
                    throw new Error(`Entity.physical.${field}.sourceIds must be an array`);
                }
                for (const src of val.sourceIds) {
                    if (typeof src !== 'string') {
                        throw new Error(`Entity.physical.${field}.sourceIds elements must be strings`);
                    }
                }
            }
        }
    }
    // Validate orbit if present
    if (entity.orbit !== undefined) {
        const orb = entity.orbit;
        const orbitFields = ['semiMajorAxisM', 'eccentricity', 'inclinationDeg', 'longitudeAscendingNodeDeg', 'argumentPeriapsisDeg', 'meanAnomalyDeg', 'epochJulianDay'];
        for (const field of orbitFields) {
            const val = orb[field];
            if (val !== undefined && (typeof val !== 'number' || !isFinite(val))) {
                throw new Error(`Entity.orbit.${field} must be a finite number if present`);
            }
        }
        // Additional constraints: eccentricity >= 0
        if (orb.eccentricity !== undefined && orb.eccentricity < 0) {
            throw new Error('Entity.orbit.eccentricity must be >= 0');
        }
    }
    // Validate sourceIds: each must be non-empty string
    for (const srcId of entity.sourceIds) {
        if (typeof srcId !== 'string' || !srcId.trim()) {
            throw new Error('Entity.sourceIds must be non-empty strings');
        }
    }
}
  return vector.every(Number.isFinite);
}

export const ARCHITECTURE_VERSION = 1;
export const CORE_NAME = "Known Universe Core";