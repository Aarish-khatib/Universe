import { convertDistance, validConfidence } from "@known-universe/core";

import type {
  DistanceUnit,
  EntityId,
  EntityKind,
  EvidenceLevel,
  FrameId,
  ReferenceFrame,
  ScientificSource,
  ScientificValue,
  SourceId,
  SpaceEntity,
  Vec3,
} from "@known-universe/core";

import type {
  CatalogProvider,
  EntityQuery,
  ProviderStatus,
  QueryPage,
  SearchOptions,
} from "./index";

import {
  SPEED_OF_LIGHT_M_S,
  ASTRONOMICAL_UNIT_M,
  J2000_JULIAN_DAY,
  SECONDS_PER_DAY,
  MILLISECONDS_PER_DAY,
  MU_SUN,
  MU_EARTH,
  GRAVITATIONAL_CONSTANT,
  FRAME_ICRS,
  FRAME_GALACTIC,
  FRAME_ECLIPTIC_J2000,
  FRAME_SOLAR_HELIOCENTRIC,
  FRAME_SOLAR_BARYCENTRIC,
  FRAME_EARTH_GEOCENTRIC,
  FRAME_EARTH_FIXED,
  FRAME_MOON_GEOCENTRIC,
  degreesToRadians,
  radiansToDegrees,
  tupleToVector3,
  vector3ToTuple,
  addVector,
  julianDayFromUnixMilliseconds,
  dateToJulianDay,
  temperatureToDisplayRgb,
  bpRpToDisplayRgb,
  stellarRecordPosition,
  stellarRecordToEntity,
  gaiaRecordToStellarRecord,
  stateVectorDistance,
  stateVectorSpeed,
  propagateMeanAnomaly,
  orbitalElementsToStateVector,
  evaluateSecularOrbitalModel,
} from "./astronomy-core";

import type {
  StellarCatalogRecord,
  GaiaLikeRecord,
  StateVector,
  ClassicalOrbitalElements,
  SecularOrbitalModel,
} from "./astronomy-core";

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function finite(value: number): boolean {
  return Number.isFinite(value);
}

function finitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export const SOURCE_IAU_2015: ScientificSource = {
  id: "iau:2015-resolution-b3",

  title:
    "IAU 2015 Resolution B3 on Nominal Solar and Planetary Conversion Constants",

  organization: "International Astronomical Union",
};

export const SOURCE_JPL_APPROX_PLANETS: ScientificSource = {
  id: "jpl:approx-planet-positions",

  title: "Approximate Positions of the Planets",

  organization: "NASA Jet Propulsion Laboratory",
};

export const SOURCE_NASA_PLANET_FACTS: ScientificSource = {
  id: "nasa:planetary-fact-sheet",

  title: "Planetary Fact Sheet",

  organization: "NASA",
};

export const SOURCE_GAIA_DR3: ScientificSource = {
  id: "gaia:dr3",

  title: "Gaia Data Release 3",

  organization: "European Space Agency",
};

export const SOURCE_CELESTRAK_TLE: ScientificSource = {
  id: "celestrak:tle",

  title: "Two-Line Element Sets",

  organization: "CelesTrak",
};

export const ASTRONOMY_SOURCES: readonly ScientificSource[] = [
  SOURCE_IAU_2015,
  SOURCE_JPL_APPROX_PLANETS,
  SOURCE_NASA_PLANET_FACTS,
  SOURCE_GAIA_DR3,
  SOURCE_CELESTRAK_TLE,
];

function scientificNumber(
  value: number,
  evidence: EvidenceLevel,
  sourceIds: readonly SourceId[],
  confidence?: number,
): ScientificValue<number> {
  const result: ScientificValue<number> = {
    value,

    evidence,

    sourceIds: [...sourceIds],
  };

  if (confidence !== undefined && validConfidence(confidence)) {
    result.confidence = confidence;
  }

  return result;
}

export interface SolarSystemBodyDefinition {
  id: EntityId;

  name: string;

  kind: EntityKind;

  parentId?: EntityId;

  radiusM: number;

  massKg: number;

  temperatureK?: number;

  summary: string;

  sourceIds: readonly SourceId[];
}

export const SOLAR_SYSTEM_BODIES: readonly SolarSystemBodyDefinition[] = [
  {
    id: "sun",

    name: "Sun",

    kind: "star",

    radiusM: 695_700_000,

    massKg: 1.98847e30,

    temperatureK: 5_778,

    summary: "The star at the center of the Solar System.",

    sourceIds: [SOURCE_IAU_2015.id, SOURCE_NASA_PLANET_FACTS.id],
  },

  {
    id: "mercury",

    name: "Mercury",

    kind: "planet",

    parentId: "sun",

    radiusM: 2_439_700,

    massKg: 3.3011e23,

    temperatureK: 440,

    summary: "The innermost planet of the Solar System.",

    sourceIds: [SOURCE_NASA_PLANET_FACTS.id, SOURCE_JPL_APPROX_PLANETS.id],
  },

  {
    id: "venus",

    name: "Venus",

    kind: "planet",

    parentId: "sun",

    radiusM: 6_051_800,

    massKg: 4.8675e24,

    temperatureK: 737,

    summary: "The second planet from the Sun.",

    sourceIds: [SOURCE_NASA_PLANET_FACTS.id, SOURCE_JPL_APPROX_PLANETS.id],
  },

  {
    id: "earth",

    name: "Earth",

    kind: "planet",

    parentId: "sun",

    radiusM: 6_371_000,

    massKg: 5.97237e24,

    temperatureK: 288,

    summary: "The third planet from the Sun and the present home of humanity.",

    sourceIds: [SOURCE_NASA_PLANET_FACTS.id, SOURCE_JPL_APPROX_PLANETS.id],
  },

  {
    id: "moon",

    name: "Moon",

    kind: "moon",

    parentId: "earth",

    radiusM: 1_737_400,

    massKg: 7.342e22,

    temperatureK: 250,

    summary: "Earth's natural satellite.",

    sourceIds: [SOURCE_NASA_PLANET_FACTS.id],
  },

  {
    id: "mars",

    name: "Mars",

    kind: "planet",

    parentId: "sun",

    radiusM: 3_389_500,

    massKg: 6.4171e23,

    temperatureK: 210,

    summary: "The fourth planet from the Sun.",

    sourceIds: [SOURCE_NASA_PLANET_FACTS.id, SOURCE_JPL_APPROX_PLANETS.id],
  },

  {
    id: "jupiter",

    name: "Jupiter",

    kind: "planet",

    parentId: "sun",

    radiusM: 69_911_000,

    massKg: 1.8982e27,

    temperatureK: 165,

    summary: "The largest planet in the Solar System.",

    sourceIds: [SOURCE_NASA_PLANET_FACTS.id, SOURCE_JPL_APPROX_PLANETS.id],
  },

  {
    id: "saturn",

    name: "Saturn",

    kind: "planet",

    parentId: "sun",

    radiusM: 58_232_000,

    massKg: 5.6834e26,

    temperatureK: 134,

    summary: "The sixth planet from the Sun.",

    sourceIds: [SOURCE_NASA_PLANET_FACTS.id, SOURCE_JPL_APPROX_PLANETS.id],
  },

  {
    id: "uranus",

    name: "Uranus",

    kind: "planet",

    parentId: "sun",

    radiusM: 25_362_000,

    massKg: 8.681e25,

    temperatureK: 76,

    summary: "The seventh planet from the Sun.",

    sourceIds: [SOURCE_NASA_PLANET_FACTS.id, SOURCE_JPL_APPROX_PLANETS.id],
  },

  {
    id: "neptune",

    name: "Neptune",

    kind: "planet",

    parentId: "sun",

    radiusM: 24_622_000,

    massKg: 1.02413e26,

    temperatureK: 72,

    summary: "The eighth major planet from the Sun.",

    sourceIds: [SOURCE_NASA_PLANET_FACTS.id, SOURCE_JPL_APPROX_PLANETS.id],
  },
];

export const PLANETARY_SECULAR_MODELS: readonly SecularOrbitalModel[] = [
  {
    id: "mercury",

    parentId: "sun",

    semiMajorAxisAu: {
      base: 0.38709927,

      ratePerCentury: 0.00000037,
    },

    eccentricity: {
      base: 0.20563593,

      ratePerCentury: 0.00001906,
    },

    inclinationDeg: {
      base: 7.00497902,

      ratePerCentury: -0.00594749,
    },

    meanLongitudeDeg: {
      base: 252.2503235,

      ratePerCentury: 149472.67411175,
    },

    longitudePerihelionDeg: {
      base: 77.45779628,

      ratePerCentury: 0.16047689,
    },

    longitudeAscendingNodeDeg: {
      base: 48.33076593,

      ratePerCentury: -0.12534081,
    },

    gravitationalParameter: MU_SUN,

    sourceIds: [SOURCE_JPL_APPROX_PLANETS.id],
  },

  {
    id: "venus",

    parentId: "sun",

    semiMajorAxisAu: {
      base: 0.72333566,

      ratePerCentury: 0.0000039,
    },

    eccentricity: {
      base: 0.00677672,

      ratePerCentury: -0.00004107,
    },

    inclinationDeg: {
      base: 3.39467605,

      ratePerCentury: -0.0007889,
    },

    meanLongitudeDeg: {
      base: 181.9790995,

      ratePerCentury: 58517.81538729,
    },

    longitudePerihelionDeg: {
      base: 131.60246718,

      ratePerCentury: 0.00268329,
    },

    longitudeAscendingNodeDeg: {
      base: 76.67984255,

      ratePerCentury: -0.27769418,
    },

    gravitationalParameter: MU_SUN,

    sourceIds: [SOURCE_JPL_APPROX_PLANETS.id],
  },

  {
    id: "earth",

    parentId: "sun",

    semiMajorAxisAu: {
      base: 1.00000261,

      ratePerCentury: 0.00000562,
    },

    eccentricity: {
      base: 0.01671123,

      ratePerCentury: -0.00004392,
    },

    inclinationDeg: {
      base: -0.00001531,

      ratePerCentury: -0.01294668,
    },

    meanLongitudeDeg: {
      base: 100.46457166,

      ratePerCentury: 35999.37244981,
    },

    longitudePerihelionDeg: {
      base: 102.93768193,

      ratePerCentury: 0.32327364,
    },

    longitudeAscendingNodeDeg: {
      base: 0,

      ratePerCentury: 0,
    },

    gravitationalParameter: MU_SUN,

    sourceIds: [SOURCE_JPL_APPROX_PLANETS.id],
  },

  {
    id: "mars",

    parentId: "sun",

    semiMajorAxisAu: {
      base: 1.52371034,

      ratePerCentury: 0.00001847,
    },

    eccentricity: {
      base: 0.0933941,

      ratePerCentury: 0.00007882,
    },

    inclinationDeg: {
      base: 1.84969142,

      ratePerCentury: -0.00813131,
    },

    meanLongitudeDeg: {
      base: -4.55343205,

      ratePerCentury: 19140.30268499,
    },

    longitudePerihelionDeg: {
      base: -23.94362959,

      ratePerCentury: 0.44441088,
    },

    longitudeAscendingNodeDeg: {
      base: 49.55953891,

      ratePerCentury: -0.29257343,
    },

    gravitationalParameter: MU_SUN,

    sourceIds: [SOURCE_JPL_APPROX_PLANETS.id],
  },

  {
    id: "jupiter",

    parentId: "sun",

    semiMajorAxisAu: {
      base: 5.202887,

      ratePerCentury: -0.00011607,
    },

    eccentricity: {
      base: 0.04838624,

      ratePerCentury: -0.00013253,
    },

    inclinationDeg: {
      base: 1.30439695,

      ratePerCentury: -0.00183714,
    },

    meanLongitudeDeg: {
      base: 34.39644051,

      ratePerCentury: 3034.74612775,
    },

    longitudePerihelionDeg: {
      base: 14.72847983,

      ratePerCentury: 0.21252668,
    },

    longitudeAscendingNodeDeg: {
      base: 100.47390909,

      ratePerCentury: 0.20469106,
    },

    gravitationalParameter: MU_SUN,

    sourceIds: [SOURCE_JPL_APPROX_PLANETS.id],
  },

  {
    id: "saturn",

    parentId: "sun",

    semiMajorAxisAu: {
      base: 9.53667594,

      ratePerCentury: -0.0012506,
    },

    eccentricity: {
      base: 0.05386179,

      ratePerCentury: -0.00050991,
    },

    inclinationDeg: {
      base: 2.48599187,

      ratePerCentury: 0.00193609,
    },

    meanLongitudeDeg: {
      base: 49.95424423,

      ratePerCentury: 1222.49362201,
    },

    longitudePerihelionDeg: {
      base: 92.59887831,

      ratePerCentury: -0.41897216,
    },

    longitudeAscendingNodeDeg: {
      base: 113.66242448,

      ratePerCentury: -0.28867794,
    },

    gravitationalParameter: MU_SUN,

    sourceIds: [SOURCE_JPL_APPROX_PLANETS.id],
  },

  {
    id: "uranus",

    parentId: "sun",

    semiMajorAxisAu: {
      base: 19.18916464,

      ratePerCentury: -0.00196176,
    },

    eccentricity: {
      base: 0.04725744,

      ratePerCentury: -0.00004397,
    },

    inclinationDeg: {
      base: 0.77263783,

      ratePerCentury: -0.00242939,
    },

    meanLongitudeDeg: {
      base: 313.23810451,

      ratePerCentury: 428.48202785,
    },

    longitudePerihelionDeg: {
      base: 170.9542763,

      ratePerCentury: 0.40805281,
    },

    longitudeAscendingNodeDeg: {
      base: 74.01692503,

      ratePerCentury: 0.04240589,
    },

    gravitationalParameter: MU_SUN,

    sourceIds: [SOURCE_JPL_APPROX_PLANETS.id],
  },

  {
    id: "neptune",

    parentId: "sun",

    semiMajorAxisAu: {
      base: 30.06992276,

      ratePerCentury: 0.00026291,
    },

    eccentricity: {
      base: 0.00859048,

      ratePerCentury: 0.00005105,
    },

    inclinationDeg: {
      base: 1.77004347,

      ratePerCentury: 0.00035372,
    },

    meanLongitudeDeg: {
      base: -55.12002969,

      ratePerCentury: 218.45945325,
    },

    longitudePerihelionDeg: {
      base: 44.96476227,

      ratePerCentury: -0.32241464,
    },

    longitudeAscendingNodeDeg: {
      base: 131.78422574,

      ratePerCentury: -0.00508664,
    },

    gravitationalParameter: MU_SUN,

    sourceIds: [SOURCE_JPL_APPROX_PLANETS.id],
  },
];

export const MOON_APPROXIMATE_ORBIT: ClassicalOrbitalElements = {
  semiMajorAxisM: 384_400_000,

  eccentricity: 0.0549,

  inclinationRad: degreesToRadians(5.145),

  longitudeAscendingNodeRad: degreesToRadians(125.08),

  argumentPeriapsisRad: degreesToRadians(318.15),

  meanAnomalyRad: degreesToRadians(135.27),

  epochJulianDay: J2000_JULIAN_DAY,

  gravitationalParameter: MU_EARTH,
};

export function solarSystemBodyDefinitionToEntity(
  definition: SolarSystemBodyDefinition,
): SpaceEntity {
  const physical: SpaceEntity["physical"] = {
    radiusM: scientificNumber(
      definition.radiusM,
      "measured",
      definition.sourceIds,
    ),

    massKg: scientificNumber(
      definition.massKg,
      "derived",
      definition.sourceIds,
    ),

    densityKgM3: scientificNumber(
      definition.massKg / ((4/3) * Math.PI * Math.pow(definition.radiusM, 3)),
      "derived",
      definition.sourceIds,
    ),

    surfaceGravityMs2: scientificNumber(
      GRAVITATIONAL_CONSTANT * definition.massKg / Math.pow(definition.radiusM, 2),
      "derived",
      definition.sourceIds,
    ),
  };

  if (definition.temperatureK !== undefined) {
    physical.temperatureK = scientificNumber(
      definition.temperatureK,
      "measured",
      definition.sourceIds,
    );
  }

  const entity: SpaceEntity = {
    id: definition.id,

    name: definition.name,

    kind: definition.kind,

    summary: definition.summary,

    sourceIds: [...definition.sourceIds],

    physical,
  };

  if (definition.parentId) {
    entity.parentId = definition.parentId;
  }

  return entity;
}

export function createStaticSolarSystemEntities(): SpaceEntity[] {
  return SOLAR_SYSTEM_BODIES.map(solarSystemBodyDefinitionToEntity);
}

export interface EphemerisRequest {
  entityId: EntityId;

  julianDay: number;

  frameId: FrameId;
}

export interface EphemerisResult {
  entityId: EntityId;

  state: StateVector;

  evidence: EvidenceLevel;

  sourceIds: readonly SourceId[];

  model: string;
}

export interface EphemerisProvider {
  readonly id: string;

  readonly name: string;

  supports(entityId: EntityId): boolean;

  state(request: EphemerisRequest): Promise<EphemerisResult | null>;
}

export class ApproximatePlanetEphemerisProvider implements EphemerisProvider {
  readonly id = "analytic:major-planets";

  readonly name = "Approximate Major Planet Ephemeris";

  private readonly models = new Map<EntityId, SecularOrbitalModel>();

  constructor(
    models: readonly SecularOrbitalModel[] = PLANETARY_SECULAR_MODELS,
  ) {
    for (const model of models) {
      this.models.set(model.id, model);
    }
  }

  supports(entityId: EntityId): boolean {
    return (
      entityId === "sun" || entityId === "moon" || this.models.has(entityId)
    );
  }

  async state(request: EphemerisRequest): Promise<EphemerisResult | null> {
    if (request.entityId === "sun") {
      return {
        entityId: "sun",

        state: {
          positionM: [0, 0, 0],

          velocityMS: [0, 0, 0],

          frameId: FRAME_SOLAR_HELIOCENTRIC,

          julianDay: request.julianDay,
        },

        evidence: "derived",

        sourceIds: [SOURCE_JPL_APPROX_PLANETS.id],

        model: "heliocentric-origin",
      };
    }

    if (request.entityId === "moon") {
      const earthModel = this.models.get("earth");

      if (!earthModel) {
        return null;
      }

      const earthElements = evaluateSecularOrbitalModel(
        earthModel,
        request.julianDay,
      );

      const earth = orbitalElementsToStateVector(
        earthElements,
        request.julianDay,
        FRAME_SOLAR_HELIOCENTRIC,
      );

      const moonRelative = orbitalElementsToStateVector(
        MOON_APPROXIMATE_ORBIT,
        request.julianDay,
        FRAME_EARTH_GEOCENTRIC,
      );

      const moonAbsolute: StateVector = {
        positionM: vector3ToTuple(
          addVector(
            tupleToVector3(earth.positionM),

            tupleToVector3(moonRelative.positionM),
          ),
        ),

        velocityMS: vector3ToTuple(
          addVector(
            tupleToVector3(earth.velocityMS),

            tupleToVector3(moonRelative.velocityMS),
          ),
        ),

        frameId: FRAME_SOLAR_HELIOCENTRIC,

        julianDay: request.julianDay,
      };

      return {
        entityId: "moon",

        state: moonAbsolute,

        evidence: "estimated",

        sourceIds: [SOURCE_JPL_APPROX_PLANETS.id, SOURCE_NASA_PLANET_FACTS.id],

        model: "two-body-lunar-preview",
      };
    }

    const model = this.models.get(request.entityId);

    if (!model) {
      return null;
    }

    const elements = evaluateSecularOrbitalModel(model, request.julianDay);

    const state = orbitalElementsToStateVector(
      elements,
      request.julianDay,
      FRAME_SOLAR_HELIOCENTRIC,
    );

    return {
      entityId: request.entityId,

      state,

      evidence: "estimated",

      sourceIds: [...model.sourceIds],

      model: "jpl-low-precision-secular-elements",
    };
  }
}

export class CompositeEphemerisProvider implements EphemerisProvider {
  readonly id = "ephemeris:composite";

  readonly name = "Composite Ephemeris Provider";

  private readonly providers: EphemerisProvider[] = [];

  register(provider: EphemerisProvider): void {
    if (this.providers.some((candidate) => candidate.id === provider.id)) {
      throw new Error(
        `Ephemeris provider "${provider.id}" is already registered.`,
      );
    }

    this.providers.push(provider);
  }

  supports(entityId: EntityId): boolean {
    return this.providers.some((provider) => provider.supports(entityId));
  }

  async state(request: EphemerisRequest): Promise<EphemerisResult | null> {
    for (const provider of this.providers) {
      if (!provider.supports(request.entityId)) {
        continue;
      }

      const result = await provider.state(request);

      if (result) {
        return result;
      }
    }

    return null;
  }

  all(): readonly EphemerisProvider[] {
    return [...this.providers];
  }
}

export async function createSolarSystemSnapshot(
  julianDay: number,
  provider: EphemerisProvider = new ApproximatePlanetEphemerisProvider(),
): Promise<SpaceEntity[]> {
  const entities = createStaticSolarSystemEntities();

  for (const entity of entities) {
    const result = await provider.state({
      entityId: entity.id,

      julianDay,

      frameId: FRAME_SOLAR_HELIOCENTRIC,
    });

    if (!result) {
      continue;
    }

    entity.spatial = {
      frameId: result.state.frameId,

      position: result.state.positionM,

      unit: "m",
    };

    const model = PLANETARY_SECULAR_MODELS.find(
      (candidate) => candidate.id === entity.id,
    );

    if (model) {
      const evaluated = evaluateSecularOrbitalModel(model, julianDay);

      entity.orbit = {
        semiMajorAxisM: evaluated.semiMajorAxisM,

        eccentricity: evaluated.eccentricity,

        inclinationDeg: radiansToDegrees(evaluated.inclinationRad),

        longitudeAscendingNodeDeg: radiansToDegrees(
          evaluated.longitudeAscendingNodeRad,
        ),

        argumentPeriapsisDeg: radiansToDegrees(evaluated.argumentPeriapsisRad),

        meanAnomalyDeg: radiansToDegrees(evaluated.meanAnomalyRad),

        epochJulianDay: julianDay,
      };
    }

    if (entity.id === "moon") {
      entity.orbit = {
        semiMajorAxisM: MOON_APPROXIMATE_ORBIT.semiMajorAxisM,

        eccentricity: MOON_APPROXIMATE_ORBIT.eccentricity,

        inclinationDeg: radiansToDegrees(MOON_APPROXIMATE_ORBIT.inclinationRad),

        longitudeAscendingNodeDeg: radiansToDegrees(
          MOON_APPROXIMATE_ORBIT.longitudeAscendingNodeRad,
        ),

        argumentPeriapsisDeg: radiansToDegrees(
          MOON_APPROXIMATE_ORBIT.argumentPeriapsisRad,
        ),

        meanAnomalyDeg: radiansToDegrees(
          propagateMeanAnomaly(MOON_APPROXIMATE_ORBIT, julianDay),
        ),

        epochJulianDay: julianDay,
      };
    }
  }

  return entities;
}

export const ASTRONOMICAL_REFERENCE_FRAMES: readonly ReferenceFrame[] = [
  {
    id: FRAME_ICRS,

    name: "International Celestial Reference System",

    kind: "cosmological",
  },

  {
    id: FRAME_GALACTIC,

    name: "Galactic Coordinate Frame",

    kind: "galactic",

    parentId: FRAME_ICRS,
  },

  {
    id: FRAME_ECLIPTIC_J2000,

    name: "J2000 Mean Ecliptic",

    kind: "stellar",

    parentId: FRAME_ICRS,
  },

  {
    id: FRAME_SOLAR_BARYCENTRIC,

    name: "Solar System Barycentric",

    kind: "barycentric",

    parentId: FRAME_ICRS,
  },

  {
    id: FRAME_SOLAR_HELIOCENTRIC,

    name: "Solar Heliocentric",

    kind: "body",

    parentId: FRAME_SOLAR_BARYCENTRIC,

    originEntityId: "sun",
  },

  {
    id: FRAME_EARTH_GEOCENTRIC,

    name: "Earth Geocentric",

    kind: "body",

    parentId: FRAME_SOLAR_HELIOCENTRIC,

    originEntityId: "earth",
  },

  {
    id: FRAME_EARTH_FIXED,

    name: "Earth Fixed",

    kind: "surface",

    parentId: FRAME_EARTH_GEOCENTRIC,

    originEntityId: "earth",
  },

  {
    id: FRAME_MOON_GEOCENTRIC,

    name: "Moon Geocentric",

    kind: "body",

    parentId: FRAME_EARTH_GEOCENTRIC,

    originEntityId: "moon",
  },
];

export interface FrameGraphIssue {
  code: string;

  message: string;

  frameId?: FrameId;
}

export interface FrameGraphValidation {
  valid: boolean;

  issues: readonly FrameGraphIssue[];
}

export function validateReferenceFrameGraph(
  frames: Iterable<ReferenceFrame>,
): FrameGraphValidation {
  const list = [...frames];

  const map = new Map<FrameId, ReferenceFrame>();

  const issues: FrameGraphIssue[] = [];

  for (const frame of list) {
    if (map.has(frame.id)) {
      issues.push({
        code: "frame.duplicate",

        message: `Duplicate reference frame "${frame.id}".`,

        frameId: frame.id,
      });

      continue;
    }

    map.set(frame.id, frame);
  }

  for (const frame of list) {
    if (frame.parentId && !map.has(frame.parentId)) {
      issues.push({
        code: "frame.missing-parent",

        message: `Reference frame "${frame.id}" refers to missing parent "${frame.parentId}".`,

        frameId: frame.id,
      });
    }

    if (frame.parentId === frame.id) {
      issues.push({
        code: "frame.self-parent",

        message: `Reference frame "${frame.id}" cannot be its own parent.`,

        frameId: frame.id,
      });
    }
  }

  for (const frame of list) {
    const visited = new Set<FrameId>();

    let current: ReferenceFrame | undefined = frame;

    while (current?.parentId) {
      if (visited.has(current.id)) {
        issues.push({
          code: "frame.cycle",

          message: `Cycle detected in reference-frame hierarchy near "${current.id}".`,

          frameId: current.id,
        });

        break;
      }

      visited.add(current.id);

      current = map.get(current.parentId);
    }
  }

  return {
    valid: issues.length === 0,

    issues,
  };
}

export interface TleRecord {
  name?: string;

  satelliteNumber: number;

  classification: string;

  internationalDesignator: string;

  epochYear: number;

  epochDay: number;

  firstDerivativeMeanMotion: number;

  secondDerivativeMeanMotion: number;

  bStar: number;

  ephemerisType: number;

  elementSetNumber: number;

  inclinationDeg: number;

  rightAscensionAscendingNodeDeg: number;

  eccentricity: number;

  argumentPerigeeDeg: number;

  meanAnomalyDeg: number;

  meanMotionRevPerDay: number;

  revolutionNumber: number;

  line1: string;

  line2: string;
}

function parseIntegerField(value: string): number {
  const parsed = Number.parseInt(value.trim(), 10);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
}

function parseFloatField(value: string): number {
  const parsed = Number.parseFloat(value.trim());

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
}

export function parseTleImpliedDecimal(value: string): number {
  const trimmed = value.trim().replace(/\s+/g, "");

  if (!trimmed) {
    return 0;
  }

  const match = trimmed.match(/^([+-]?)(\d+)([+-]\d+)$/);

  if (!match) {
    const normal = Number(trimmed);

    return Number.isFinite(normal) ? normal : 0;
  }

  const sign = match[1] === "-" ? -1 : 1;

  const mantissaDigits = match[2] ?? "0";

  const exponent = Number.parseInt(match[3] ?? "0", 10);

  const mantissa = Number.parseFloat(`0.${mantissaDigits}`);

  return sign * mantissa * Math.pow(10, exponent);
}

export function tleChecksum(line: string): number {
  let checksum = 0;

  const length = Math.min(68, line.length);

  for (let index = 0; index < length; index++) {
    const character = line[index];

    if (character === "-") {
      checksum += 1;
      continue;
    }

    if (character && character >= "0" && character <= "9") {
      checksum += Number.parseInt(character, 10);
    }
  }

  return checksum % 10;
}

export function validateTleChecksum(line: string): boolean {
  if (line.length < 69) {
    return false;
  }

  const expected = Number.parseInt(line[68] ?? "", 10);

  if (!Number.isFinite(expected)) {
    return false;
  }

  return tleChecksum(line) === expected;
}

export function tleEpochToJulianDay(year: number, dayOfYear: number): number {
  const fullYear = year < 57 ? 2000 + year : 1900 + year;

  const start = Date.UTC(fullYear, 0, 1, 0, 0, 0, 0);

  const milliseconds = start + (dayOfYear - 1) * MILLISECONDS_PER_DAY;

  return julianDayFromUnixMilliseconds(milliseconds);
}

export function parseTle(
  line1: string,
  line2: string,
  name?: string,
): TleRecord {
  if (!line1.startsWith("1 ")) {
    throw new Error("TLE line 1 must start with '1 '.");
  }

  if (!line2.startsWith("2 ")) {
    throw new Error("TLE line 2 must start with '2 '.");
  }

  const satelliteNumber = parseIntegerField(line1.slice(2, 7));

  const line2Satellite = parseIntegerField(line2.slice(2, 7));

  if (satelliteNumber !== line2Satellite) {
    throw new Error("TLE lines refer to different satellite numbers.");
  }

  const result: TleRecord = {
    satelliteNumber,

    classification: line1.slice(7, 8).trim(),

    internationalDesignator: line1.slice(9, 17).trim(),

    epochYear: parseIntegerField(line1.slice(18, 20)),

    epochDay: parseFloatField(line1.slice(20, 32)),

    firstDerivativeMeanMotion: parseFloatField(line1.slice(33, 43)),

    secondDerivativeMeanMotion: parseTleImpliedDecimal(line1.slice(44, 52)),

    bStar: parseTleImpliedDecimal(line1.slice(53, 61)),

    ephemerisType: parseIntegerField(line1.slice(62, 63)),

    elementSetNumber: parseIntegerField(line1.slice(64, 68)),

    inclinationDeg: parseFloatField(line2.slice(8, 16)),

    rightAscensionAscendingNodeDeg: parseFloatField(line2.slice(17, 25)),

    eccentricity: Number.parseFloat(`0.${line2.slice(26, 33).trim()}`),

    argumentPerigeeDeg: parseFloatField(line2.slice(34, 42)),

    meanAnomalyDeg: parseFloatField(line2.slice(43, 51)),

    meanMotionRevPerDay: parseFloatField(line2.slice(52, 63)),

    revolutionNumber: parseIntegerField(line2.slice(63, 68)),

    line1,

    line2,
  };

  if (name !== undefined) {
    result.name = name.trim();
  }

  return result;
}

export function tleMeanMotionRadiansPerSecond(record: TleRecord): number {
  return (record.meanMotionRevPerDay * Math.PI * 2) / SECONDS_PER_DAY;
}

export function tleApproximateSemiMajorAxisM(record: TleRecord): number {
  const meanMotion = tleMeanMotionRadiansPerSecond(record);

  if (!finitePositive(meanMotion)) {
    return Number.NaN;
  }

  return Math.cbrt(MU_EARTH / (meanMotion * meanMotion));
}

export function tleToApproximateOrbitalElements(
  record: TleRecord,
): ClassicalOrbitalElements {
  return {
    semiMajorAxisM: tleApproximateSemiMajorAxisM(record),

    eccentricity: clamp(record.eccentricity, 0, 0.999999999),

    inclinationRad: degreesToRadians(record.inclinationDeg),

    longitudeAscendingNodeRad: degreesToRadians(
      record.rightAscensionAscendingNodeDeg,
    ),

    argumentPeriapsisRad: degreesToRadians(record.argumentPerigeeDeg),

    meanAnomalyRad: degreesToRadians(record.meanAnomalyDeg),

    epochJulianDay: tleEpochToJulianDay(record.epochYear, record.epochDay),

    gravitationalParameter: MU_EARTH,
  };
}

export interface SatelliteStateResult {
  state: StateVector;

  accuracy: "preview-only" | "sgp4";

  warning?: string;
}

export interface SatellitePropagator {
  readonly id: string;

  propagate(tle: TleRecord, julianDay: number): SatelliteStateResult;
}

export class MeanElementPreviewPropagator implements SatellitePropagator {
  readonly id = "tle:two-body-preview";

  propagate(tle: TleRecord, julianDay: number): SatelliteStateResult {
    const elements = tleToApproximateOrbitalElements(tle);

    return {
      state: orbitalElementsToStateVector(
        elements,
        julianDay,
        FRAME_EARTH_GEOCENTRIC,
      ),

      accuracy: "preview-only",

      warning:
        "TLE data is intended for SGP4/SDP4 propagation. This two-body result is only a visual preview and must not be presented as a precision satellite position.",
    };
  }
}

export function tleToSpaceEntity(
  record: TleRecord,
  sourceIds: readonly SourceId[] = [SOURCE_CELESTRAK_TLE.id],
): SpaceEntity {
  const id = `norad:${record.satelliteNumber}`;

  const elements = tleToApproximateOrbitalElements(record);

  const entity: SpaceEntity = {
    id,

    name: record.name ?? `NORAD ${record.satelliteNumber}`,

    kind: "satellite",

    parentId: "earth",

    sourceIds: [...sourceIds],

    orbit: {
      semiMajorAxisM: elements.semiMajorAxisM,

      eccentricity: elements.eccentricity,

      inclinationDeg: record.inclinationDeg,

      longitudeAscendingNodeDeg: record.rightAscensionAscendingNodeDeg,

      argumentPeriapsisDeg: record.argumentPerigeeDeg,

      meanAnomalyDeg: record.meanAnomalyDeg,

      epochJulianDay: elements.epochJulianDay,
    },

    tags: ["satellite", "tle", `norad:${record.satelliteNumber}`],
  };

  if (record.internationalDesignator) {
    entity.aliases = [record.internationalDesignator];
  }

  return entity;
}

export interface DebrisRecord {
  catalogId: string;

  name: string;

  noradId?: number;

  tle?: TleRecord;

  sourceIds: readonly SourceId[];

  lastUpdated?: number;
}

export function debrisRecordToEntity(record: DebrisRecord): SpaceEntity {
  const id =
    record.noradId !== undefined
      ? `norad:${record.noradId}`
      : `debris:${record.catalogId}`;

  const entity: SpaceEntity = {
    id,

    name: record.name,

    kind: "debris",

    parentId: "earth",

    sourceIds: [...record.sourceIds],

    tags: ["debris", "earth-orbit"],
  };

  if (record.tle) {
    const elements = tleToApproximateOrbitalElements(record.tle);

    entity.orbit = {
      semiMajorAxisM: elements.semiMajorAxisM,

      eccentricity: elements.eccentricity,

      inclinationDeg: record.tle.inclinationDeg,

      longitudeAscendingNodeDeg: record.tle.rightAscensionAscendingNodeDeg,

      argumentPeriapsisDeg: record.tle.argumentPerigeeDeg,

      meanAnomalyDeg: record.tle.meanAnomalyDeg,

      epochJulianDay: elements.epochJulianDay,
    };
  }

  return entity;
}

export interface PackedStarChunk {
  count: number;

  ids: readonly EntityId[];

  positionsPc: Float32Array;

  apparentMagnitudes: Float32Array;

  rgb: Float32Array;

  parallaxMas: Float32Array;
}

export interface StarChunkOptions {
  maximumRecords: number;

  defaultMagnitude: number;

  defaultTemperatureK: number;
}

export const DEFAULT_STAR_CHUNK_OPTIONS: StarChunkOptions = {
  maximumRecords: 65_536,

  defaultMagnitude: 10,

  defaultTemperatureK: 5_778,
};

export function packStarChunk(
  records: readonly StellarCatalogRecord[],
  options: Partial<StarChunkOptions> = {},
): PackedStarChunk {
  const settings = {
    ...DEFAULT_STAR_CHUNK_OPTIONS,
    ...options,
  };

  const count = Math.min(
    records.length,
    Math.max(1, Math.floor(settings.maximumRecords)),
  );

  const ids: EntityId[] = [];

  const positions = new Float32Array(count * 3);

  const magnitudes = new Float32Array(count);

  const rgb = new Float32Array(count * 3);

  const parallax = new Float32Array(count);

  for (let index = 0; index < count; index++) {
    const record = records[index];

    if (!record) {
      continue;
    }

    ids.push(record.id);

    const position = stellarRecordPosition(record);

    const positionOffset = index * 3;

    if (position) {
      positions[positionOffset] = position[0];

      positions[positionOffset + 1] = position[1];

      positions[positionOffset + 2] = position[2];
    }

    magnitudes[index] = record.apparentMagnitude ?? settings.defaultMagnitude;

    parallax[index] = record.parallaxMas ?? Number.NaN;

    const color =
      record.temperatureK !== undefined
        ? temperatureToDisplayRgb(record.temperatureK)
        : record.colorIndexBpRp !== undefined
          ? bpRpToDisplayRgb(record.colorIndexBpRp)
          : temperatureToDisplayRgb(settings.defaultTemperatureK);

    rgb[positionOffset] = color.r / 255;

    rgb[positionOffset + 1] = color.g / 255;

    rgb[positionOffset + 2] = color.b / 255;
  }

  return {
    count,

    ids,

    positionsPc: positions,

    apparentMagnitudes: magnitudes,

    rgb,

    parallaxMas: parallax,
  };
}

export function chunkStarRecords(
  records: readonly StellarCatalogRecord[],
  chunkSize = 65_536,
): StellarCatalogRecord[][] {
  const size = Math.max(1, Math.floor(chunkSize));

  const chunks: StellarCatalogRecord[][] = [];

  for (let start = 0; start < records.length; start += size) {
    chunks.push(records.slice(start, start + size));
  }

  return chunks;
}

export function packStarCatalog(
  records: readonly StellarCatalogRecord[],
  chunkSize = 65_536,
): PackedStarChunk[] {
  return chunkStarRecords(records, chunkSize).map((chunk) =>
    packStarChunk(chunk, {
      maximumRecords: chunkSize,
    }),
  );
}

export interface CsvRecord {
  readonly [key: string]: string;
}

export function parseCsvLine(line: string, delimiter = ","): string[] {
  const values: string[] = [];

  let current = "";

  let quoted = false;

  for (let index = 0; index < line.length; index++) {
    const character = line[index] ?? "";

    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';

        index++;

        continue;
      }

      quoted = !quoted;

      continue;
    }

    if (character === delimiter && !quoted) {
      values.push(current);

      current = "";

      continue;
    }

    current += character;
  }

  values.push(current);

  return values;
}

export function parseDelimitedText(text: string, delimiter = ","): CsvRecord[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

  const headerLine = lines.shift();

  if (!headerLine) {
    return [];
  }

  const headers = parseCsvLine(headerLine, delimiter).map((header) =>
    header.trim(),
  );

  const records: CsvRecord[] = [];

  for (const line of lines) {
    const values = parseCsvLine(line, delimiter);

    const record: Record<string, string> = {};

    for (let index = 0; index < headers.length; index++) {
      const header = headers[index];

      if (!header) {
        continue;
      }

      record[header] = values[index] ?? "";
    }

    records.push(record);
  }

  return records;
}

function optionalCsvNumber(record: CsvRecord, key: string): number | undefined {
  const value = record[key];

  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
}

export function csvRecordToGaiaRecord(
  record: CsvRecord,
): GaiaLikeRecord | null {
  const sourceId = record.source_id;

  const ra = optionalCsvNumber(record, "ra");

  const dec = optionalCsvNumber(record, "dec");

  if (!sourceId || ra === undefined || dec === undefined) {
    return null;
  }

  const result: GaiaLikeRecord = {
    source_id: sourceId,

    ra,

    dec,
  };

  const refEpoch = optionalCsvNumber(record, "ref_epoch");

  const parallax = optionalCsvNumber(record, "parallax");

  const pmra = optionalCsvNumber(record, "pmra");

  const pmdec = optionalCsvNumber(record, "pmdec");

  const radialVelocity = optionalCsvNumber(record, "radial_velocity");

  const magnitude = optionalCsvNumber(record, "phot_g_mean_mag");

  const bpRp = optionalCsvNumber(record, "bp_rp");

  const temperature = optionalCsvNumber(record, "teff_gspphot");

  if (refEpoch !== undefined) {
    result.ref_epoch = refEpoch;
  }

  if (parallax !== undefined) {
    result.parallax = parallax;
  }

  if (pmra !== undefined) {
    result.pmra = pmra;
  }

  if (pmdec !== undefined) {
    result.pmdec = pmdec;
  }

  if (radialVelocity !== undefined) {
    result.radial_velocity = radialVelocity;
  }

  if (magnitude !== undefined) {
    result.phot_g_mean_mag = magnitude;
  }

  if (bpRp !== undefined) {
    result.bp_rp = bpRp;
  }

  if (temperature !== undefined) {
    result.teff_gspphot = temperature;
  }

  if (record.designation) {
    result.designation = record.designation;
  }

  return result;
}

export interface GaiaImportIssue {
  row: number;

  message: string;
}

export interface GaiaImportResult {
  records: readonly StellarCatalogRecord[];

  rejected: number;

  issues: readonly GaiaImportIssue[];
}

export function importGaiaCsv(
  text: string,
  sourceId: SourceId = SOURCE_GAIA_DR3.id,
): GaiaImportResult {
  const rows = parseDelimitedText(text);

  const records: StellarCatalogRecord[] = [];

  const issues: GaiaImportIssue[] = [];

  let rejected = 0;

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];

    if (!row) {
      continue;
    }

    const gaia = csvRecordToGaiaRecord(row);

    if (!gaia) {
      rejected++;

      issues.push({
        row: index + 2,

        message: "Row is missing source_id, ra or dec.",
      });

      continue;
    }

    if (gaia.dec < -90 || gaia.dec > 90) {
      rejected++;

      issues.push({
        row: index + 2,

        message: "Declination is outside the valid range.",
      });

      continue;
    }

    records.push(gaiaRecordToStellarRecord(gaia, sourceId));
  }

  return {
    records,

    rejected,

    issues,
  };
}

export interface ImportProgress {
  processed: number;

  total: number;

  accepted: number;

  rejected: number;
}

export interface StarImportJobOptions {
  batchSize: number;

  signal?: AbortSignal;

  onProgress?: (progress: ImportProgress) => void;
}

export class StarImportJob {
  constructor(private readonly options: Partial<StarImportJobOptions> = {}) {}

  async run(
    records: readonly GaiaLikeRecord[],
    consumer: (batch: readonly StellarCatalogRecord[]) => void | Promise<void>,
  ): Promise<ImportProgress> {
    const batchSize = Math.max(1, Math.floor(this.options.batchSize ?? 2_000));

    let accepted = 0;
    let rejected = 0;

    for (let start = 0; start < records.length; start += batchSize) {
      if (this.options.signal?.aborted) {
        throw new DOMException("Import aborted.", "AbortError");
      }

      const end = Math.min(records.length, start + batchSize);

      const output: StellarCatalogRecord[] = [];

      for (let index = start; index < end; index++) {
        const record = records[index];

        if (!record) {
          continue;
        }

        if (
          !finite(record.ra) ||
          !finite(record.dec) ||
          record.dec < -90 ||
          record.dec > 90
        ) {
          rejected++;
          continue;
        }

        output.push(gaiaRecordToStellarRecord(record));

        accepted++;
      }

      await consumer(output);

      const progress: ImportProgress = {
        processed: end,

        total: records.length,

        accepted,

        rejected,
      };

      this.options.onProgress?.(progress);

      await Promise.resolve();
    }

    return {
      processed: records.length,

      total: records.length,

      accepted,

      rejected,
    };
  }
}

export type AstronomyValidationSeverity = "error" | "warning" | "info";

export interface AstronomyValidationIssue {
  severity: AstronomyValidationSeverity;

  code: string;

  message: string;

  entityId?: EntityId;
}

export function validateStellarRecord(
  record: StellarCatalogRecord,
): AstronomyValidationIssue[] {
  const issues: AstronomyValidationIssue[] = [];

  if (!record.id.trim()) {
    issues.push({
      severity: "error",

      code: "star.id",

      message: "Star id cannot be empty.",
    });
  }

  if (!finite(record.rightAscensionDeg)) {
    issues.push({
      severity: "error",

      code: "star.ra",

      message: "Right ascension must be finite.",

      entityId: record.id,
    });
  }

  if (
    !finite(record.declinationDeg) ||
    record.declinationDeg < -90 ||
    record.declinationDeg > 90
  ) {
    issues.push({
      severity: "error",

      code: "star.dec",

      message: "Declination must be between -90 and 90 degrees.",

      entityId: record.id,
    });
  }

  if (record.parallaxMas !== undefined && !finite(record.parallaxMas)) {
    issues.push({
      severity: "error",

      code: "star.parallax",

      message: "Parallax must be finite when provided.",

      entityId: record.id,
    });
  }

  if (record.parallaxMas !== undefined && record.parallaxMas <= 0) {
    issues.push({
      severity: "warning",

      code: "star.parallax-nonpositive",

      message:
        "Non-positive parallax cannot be directly converted into a geometric distance.",

      entityId: record.id,
    });
  }

  if (
    record.temperatureK !== undefined &&
    !finitePositive(record.temperatureK)
  ) {
    issues.push({
      severity: "error",

      code: "star.temperature",

      message: "Stellar temperature must be positive when provided.",

      entityId: record.id,
    });
  }

  if (record.sourceIds.length === 0) {
    issues.push({
      severity: "warning",

      code: "star.unsourced",

      message: "Stellar record has no provenance source.",

      entityId: record.id,
    });
  }

  return issues;
}

export function validateClassicalOrbitalElements(
  elements: ClassicalOrbitalElements,
): AstronomyValidationIssue[] {
  const issues: AstronomyValidationIssue[] = [];

  if (!finitePositive(elements.semiMajorAxisM)) {
    issues.push({
      severity: "error",

      code: "orbit.semi-major-axis",

      message: "Semi-major axis must be positive.",
    });
  }

  if (
    !finite(elements.eccentricity) ||
    elements.eccentricity < 0 ||
    elements.eccentricity >= 1
  ) {
    issues.push({
      severity: "error",

      code: "orbit.eccentricity",

      message: "This elliptic orbit model requires eccentricity in [0, 1).",
    });
  }

  if (!finitePositive(elements.gravitationalParameter)) {
    issues.push({
      severity: "error",

      code: "orbit.mu",

      message: "Gravitational parameter must be positive.",
    });
  }

  if (!finite(elements.epochJulianDay)) {
    issues.push({
      severity: "error",

      code: "orbit.epoch",

      message: "Orbital epoch must be finite.",
    });
  }

  return issues;
}

export interface AstronomyHealthReport {
  referenceFramesValid: boolean;

  referenceFrameIssues: number;

  solarSystemBodies: number;

  secularPlanetModels: number;

  astronomySources: number;

  ephemerisBodies: number;
}

export function astronomyHealthReport(): AstronomyHealthReport {
  const frameReport = validateReferenceFrameGraph(
    ASTRONOMICAL_REFERENCE_FRAMES,
  );

  const ephemeris = new ApproximatePlanetEphemerisProvider();

  let supported = 0;

  for (const body of SOLAR_SYSTEM_BODIES) {
    if (ephemeris.supports(body.id)) {
      supported++;
    }
  }

  return {
    referenceFramesValid: frameReport.valid,

    referenceFrameIssues: frameReport.issues.length,

    solarSystemBodies: SOLAR_SYSTEM_BODIES.length,

    secularPlanetModels: PLANETARY_SECULAR_MODELS.length,

    astronomySources: ASTRONOMY_SOURCES.length,

    ephemerisBodies: supported,
  };
}

function normalizedSearchText(value: string): string {
  return value.normalize("NFKD").toLowerCase().trim();
}

function astronomyEntityMatches(entity: SpaceEntity, query: string): boolean {
  const normalized = normalizedSearchText(query);

  if (!normalized) {
    return true;
  }

  if (normalizedSearchText(entity.name).includes(normalized)) {
    return true;
  }

  if (normalizedSearchText(entity.id).includes(normalized)) {
    return true;
  }

  for (const alias of entity.aliases ?? []) {
    if (normalizedSearchText(alias).includes(normalized)) {
      return true;
    }
  }

  return false;
}

export interface AstronomyCatalogProviderOptions {
  includeSolarSystem?: boolean;

  epochJulianDay?: number;
}

export class AstronomyCatalogProvider implements CatalogProvider {
  readonly id = "astronomy";

  readonly name = "Known Universe Astronomy Catalog";

  private readonly entities = new Map<EntityId, SpaceEntity>();

  private providerState: ProviderStatus["state"] = "ready";

  private lastUpdated = Date.now();

  private error: string | undefined;

  constructor(private readonly options: AstronomyCatalogProviderOptions = {}) {}

  async initialize(): Promise<void> {
    try {
      this.providerState = "loading";

      if (this.options.includeSolarSystem !== false) {
        const epoch =
          this.options.epochJulianDay ?? dateToJulianDay(new Date());

        const solarSystem = await createSolarSystemSnapshot(epoch);

        for (const entity of solarSystem) {
          this.entities.set(entity.id, entity);
        }
      }

      this.providerState = "ready";

      this.lastUpdated = Date.now();

      this.error = undefined;
    } catch (error) {
      this.providerState = "error";

      this.error = error instanceof Error ? error.message : String(error);

      throw error;
    }
  }

  ingestEntities(entities: Iterable<SpaceEntity>): number {
    let count = 0;

    for (const entity of entities) {
      this.entities.set(entity.id, entity);

      count++;
    }

    this.lastUpdated = Date.now();

    return count;
  }

  ingestStars(records: Iterable<StellarCatalogRecord>): number {
    let count = 0;

    for (const record of records) {
      const issues = validateStellarRecord(record);

      if (issues.some((issue) => issue.severity === "error")) {
        continue;
      }

      const entity = stellarRecordToEntity(record);

      this.entities.set(entity.id, entity);

      count++;
    }

    this.lastUpdated = Date.now();

    return count;
  }

  async get(id: EntityId): Promise<SpaceEntity | null> {
    return this.entities.get(id) ?? null;
  }

  async query(request: EntityQuery): Promise<QueryPage<SpaceEntity>> {
    let items = [...this.entities.values()];

    if (request.text) {
      items = items.filter((entity) =>
        astronomyEntityMatches(entity, request.text ?? ""),
      );
    }

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

    const direction = request.direction === "desc" ? -1 : 1;

    if (request.sort === "name") {
      items.sort((a, b) => a.name.localeCompare(b.name) * direction);
    }

    if (request.sort === "kind") {
      items.sort((a, b) => a.kind.localeCompare(b.kind) * direction);
    }

    const offset = Math.max(0, Math.floor(request.offset ?? 0));

    const limit = Math.max(1, Math.floor(request.limit ?? 100));

    const total = items.length;

    const page = items.slice(offset, offset + limit);

    return {
      items: page,

      total,

      offset,

      limit,

      hasMore: offset + page.length < total,
    };
  }

  async search(
    text: string,
    options: SearchOptions = {},
  ): Promise<readonly SpaceEntity[]> {
    const normalized = normalizedSearchText(text);

    if (!normalized) {
      return [];
    }

    const kinds = options.kinds ? new Set(options.kinds) : null;

    const scored: {
      entity: SpaceEntity;

      score: number;
    }[] = [];

    for (const entity of this.entities.values()) {
      if (kinds && !kinds.has(entity.kind)) {
        continue;
      }

      const name = normalizedSearchText(entity.name);

      const id = normalizedSearchText(entity.id);

      let score = 0;

      if (name === normalized) {
        score += 100;
      } else if (name.startsWith(normalized)) {
        score += 60;
      } else if (name.includes(normalized)) {
        score += 30;
      }

      if (id === normalized) {
        score += 100;
      } else if (id.includes(normalized)) {
        score += 20;
      }

      for (const alias of entity.aliases ?? []) {
        const value = normalizedSearchText(alias);

        if (value === normalized) {
          score += 80;
        } else if (value.includes(normalized)) {
          score += 20;
        }
      }

      if (score <= 0) {
        continue;
      }

      if (options.minimumScore !== undefined && score < options.minimumScore) {
        continue;
      }

      scored.push({
        entity,
        score,
      });
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.entity.name.localeCompare(b.entity.name);
    });

    const limit = Math.max(1, Math.floor(options.limit ?? 20));

    return scored.slice(0, limit).map((result) => result.entity);
  }

  async getSources(): Promise<readonly ScientificSource[]> {
    return [...ASTRONOMY_SOURCES];
  }

  status(): ProviderStatus {
    const result: ProviderStatus = {
      providerId: this.id,

      state: this.providerState,

      lastUpdated: this.lastUpdated,

      records: this.entities.size,
    };

    if (this.error !== undefined) {
      result.error = this.error;
    }

    return result;
  }

  clear(): void {
    this.entities.clear();

    this.lastUpdated = Date.now();
  }

  get size(): number {
    return this.entities.size;
  }
}

export interface AstronomicalEntityState {
  entity: SpaceEntity;

  stateVector?: StateVector;

  distanceFromOriginM?: number;

  speedMS?: number;
}

export async function resolveAstronomicalEntityState(
  entity: SpaceEntity,
  julianDay: number,
  ephemeris: EphemerisProvider,
): Promise<AstronomicalEntityState> {
  const result: AstronomicalEntityState = {
    entity,
  };

  if (ephemeris.supports(entity.id)) {
    const state = await ephemeris.state({
      entityId: entity.id,

      julianDay,

      frameId: FRAME_SOLAR_HELIOCENTRIC,
    });

    if (state) {
      result.stateVector = state.state;

      result.distanceFromOriginM = stateVectorDistance(state.state);

      result.speedMS = stateVectorSpeed(state.state);
    }
  }

  return result;
}

export function distanceLightTravelTimeSeconds(distanceM: number): number {
  return distanceM / SPEED_OF_LIGHT_M_S;
}

export function lightTravelTimeSecondsBetween(
  a: Vec3,
  b: Vec3,
  unit: DistanceUnit,
): number {
  const dx = a[0] - b[0];

  const dy = a[1] - b[1];

  const dz = a[2] - b[2];

  const distanceUnits = Math.sqrt(dx * dx + dy * dy + dz * dz);

  const meters = convertDistance(distanceUnits, unit, "m");

  return distanceLightTravelTimeSeconds(meters);
}

export function formatLightTravelTime(seconds: number): string {
  if (!finitePositive(seconds)) {
    return "0 s";
  }

  if (seconds < 60) {
    return `${seconds.toFixed(1)} s`;
  }

  const minutes = seconds / 60;

  if (minutes < 60) {
    return `${minutes.toFixed(1)} min`;
  }

  const hours = minutes / 60;

  if (hours < 24) {
    return `${hours.toFixed(1)} h`;
  }

  const days = hours / 24;

  if (days < 365.25) {
    return `${days.toFixed(1)} d`;
  }

  const years = days / 365.25;

  return `${years.toFixed(2)} y`;
}

export interface DistanceDescription {
  meters: number;

  value: number;

  unit: DistanceUnit;

  label: string;
}

export function describeAstronomicalDistance(
  meters: number,
): DistanceDescription {
  const absolute = Math.abs(meters);

  let unit: DistanceUnit;

  if (absolute < 1_000) {
    unit = "m";
  } else if (absolute < 0.01 * ASTRONOMICAL_UNIT_M) {
    unit = "km";
  } else if (absolute < convertDistance(0.1, "ly", "m")) {
    unit = "au";
  } else if (absolute < convertDistance(3.26, "ly", "m")) {
    unit = "ly";
  } else {
    unit = "pc";
  }

  const value = convertDistance(meters, "m", unit);

  return {
    meters,

    value,

    unit,

    label: `${value.toLocaleString(undefined, {
      maximumFractionDigits: 3,
    })} ${unit}`,
  };
}

export interface AstronomicalScale {
  name: string;

  minimumM: number;

  maximumM: number;
}

export const ASTRONOMICAL_SCALES: readonly AstronomicalScale[] = [
  {
    name: "human",

    minimumM: 0,

    maximumM: 1_000,
  },

  {
    name: "local",

    minimumM: 1_000,

    maximumM: 1_000_000,
  },

  {
    name: "planetary",

    minimumM: 1_000_000,

    maximumM: 1e9,
  },

  {
    name: "earth-moon",

    minimumM: 1e8,

    maximumM: 1e10,
  },

  {
    name: "solar-system",

    minimumM: 1e9,

    maximumM: 1e14,
  },

  {
    name: "stellar",

    minimumM: 1e14,

    maximumM: 1e19,
  },

  {
    name: "galactic",

    minimumM: 1e18,

    maximumM: 1e22,
  },

  {
    name: "intergalactic",

    minimumM: 1e21,

    maximumM: 1e25,
  },

  {
    name: "cosmological",

    minimumM: 1e24,

    maximumM: Number.POSITIVE_INFINITY,
  },
];

export function astronomicalScaleForDistance(
  meters: number,
): AstronomicalScale {
  const absolute = Math.abs(meters);

  for (const scale of ASTRONOMICAL_SCALES) {
    if (absolute >= scale.minimumM && absolute < scale.maximumM) {
      return scale;
    }
  }

  return (
    ASTRONOMICAL_SCALES[ASTRONOMICAL_SCALES.length - 1] ?? {
      name: "cosmological",

      minimumM: 0,

      maximumM: Number.POSITIVE_INFINITY,
    }
  );
}

export interface KnowledgeDisplay {
  label: "Known" | "Estimated" | "Theoretical" | "Unknown";

  confidence?: number;

  sourceCount: number;
}

export function evidenceToKnowledgeDisplay(
  evidence: EvidenceLevel,
  sourceIds: readonly SourceId[],
  confidence?: number,
): KnowledgeDisplay {
  let label: KnowledgeDisplay["label"];

  switch (evidence) {
    case "measured":
    case "derived":
      label = "Known";
      break;

    case "estimated":
      label = "Estimated";
      break;

    case "theoretical":
      label = "Theoretical";
      break;

    case "unknown":
      label = "Unknown";
      break;
  }

  const result: KnowledgeDisplay = {
    label,

    sourceCount: sourceIds.length,
  };

  if (confidence !== undefined && validConfidence(confidence)) {
    result.confidence = confidence;
  }

  return result;
}

export const ASTRONOMY_FEATURES = {
  astronomicalTime: true,

  angleUtilities: true,

  icrsCoordinates: true,

  galacticCoordinates: true,

  eclipticCoordinates: true,

  geodeticEarth: true,

  earthFixedCoordinates: true,

  localHorizontalCoordinates: true,

  parallaxDistance: true,

  properMotion: true,

  stellarPhotometry: true,

  keplerSolver: true,

  orbitalPropagation: true,

  orbitSampling: true,

  secularPlanetModels: true,

  solarSystemSnapshot: true,

  ephemerisProviders: true,

  referenceFrameGraph: true,

  gaiaMapping: true,

  gaiaCsvImport: true,

  packedStarCatalogs: true,

  tleParsing: true,

  tleChecksums: true,

  satellitePreviewPropagation: true,

  debrisMapping: true,

  scientificProvenance: true,

  astronomyValidation: true,

  lightTravelTime: true,

  astronomicalScale: true,
} as const;

export const ASTRONOMY_VERSION = 1;
