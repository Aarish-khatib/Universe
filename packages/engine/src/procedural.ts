import type {
  EntityId,
  Vec3,
} from "@known-universe/core";

export const PROCEDURAL_ENGINE_VERSION = 1;

export const PROCEDURAL_ID_PREFIX =
  "proc";

export type RealityClass =
  | "observed"
  | "measured"
  | "estimated"
  | "theoretical"
  | "procedural";

export type ProceduralPreset =
  | "standard"
  | "dense-galaxies"
  | "sparse-universe"
  | "exotic-sandbox";

export type GalaxyMorphology =
  | "spiral"
  | "barred-spiral"
  | "elliptical"
  | "lenticular"
  | "irregular";

export type StellarClass =
  | "O"
  | "B"
  | "A"
  | "F"
  | "G"
  | "K"
  | "M";

export type PlanetClass =
  | "rocky"
  | "super-earth"
  | "sub-neptune"
  | "ice-giant"
  | "gas-giant"
  | "dwarf"
  | "lava"
  | "ocean"
  | "ice";

export type AtmosphereClass =
  | "none"
  | "trace"
  | "thin"
  | "earthlike-simulation"
  | "dense"
  | "hydrogen-rich"
  | "toxic-simulation";

export type LifePotential =
  | "none"
  | "low"
  | "moderate"
  | "high";

export type TerrainBiome =
  | "ocean"
  | "coast"
  | "rainforest"
  | "forest"
  | "grassland"
  | "savanna"
  | "desert"
  | "tundra"
  | "ice"
  | "volcanic"
  | "highland"
  | "cratered"
  | "sterile";

export interface TerrainTileAddress {
  face: number;
  x: number;
  y: number;
  lod: number;
}

export interface TerrainTile {
  kind: "terrain-tile";
  realityClass: "procedural";
  generationVersion: number;
  seedKey: string;
  planetId: EntityId;
  address: TerrainTileAddress;
  resolution: number;
  elevations: Float32Array;
  temperaturesK: Float32Array;
  moistures: Float32Array;
  biomes: readonly TerrainBiome[];
  waterFraction: number;
  cloudCover: number;
  weatherActivity: number;
}

export interface SectorCoordinate {
  x: number;
  y: number;
  z: number;
}

export interface ProceduralAddress {
  sector: SectorCoordinate;

  galaxyIndex:
    number | null;

  systemIndex:
    number | null;

  planetIndex:
    number | null;

  moonIndex:
    number | null;
}

export interface ProceduralSeed {
  input: string;

  version: number;

  words:
    readonly [
      number,
      number,
      number,
      number,
    ];

  key: string;
}

export interface ProceduralGenerationProfile {
  preset:
    ProceduralPreset;

  sectorSizeLy:
    number;

  galaxyDensity:
    number;

  maximumGalaxiesPerSector:
    number;

  multiStarRate:
    number;

  planetOccurrenceRate:
    number;

  giantPlanetRate:
    number;

  moonRate:
    number;

  anomalyRate:
    number;

  exoticity:
    number;
}

export interface ProceduralGenerationBudget {
  maximumGalaxies:
    number;

  maximumSystemsPerRequest:
    number;

  maximumPlanetsPerSystem:
    number;

  maximumMoonsPerPlanet:
    number;
}

export interface ProceduralDescriptorBase {
  id:
    EntityId;

  name:
    string;

  realityClass:
    "procedural";

  generationVersion:
    number;

  seedKey:
    string;

  address:
    ProceduralAddress;
}

export interface GalaxyDescriptor
  extends ProceduralDescriptorBase {
  kind:
    "galaxy";

  morphology:
    GalaxyMorphology;

  positionLy:
    Vec3;

  radiusLy:
    number;

  stellarMassSolar:
    number;

  metallicityRelativeSolar:
    number;

  estimatedStarCount:
    number;

  estimatedSystemCount:
    number;

  orientation: {
    yawRad:
      number;

    pitchRad:
      number;

    rollRad:
      number;
  };

  activity:
    number;
}

export interface StarDescriptor
  extends ProceduralDescriptorBase {
  kind:
    "star";

  systemIndex:
    number;

  stellarIndex:
    number;

  stellarClass:
    StellarClass;

  massSolar:
    number;

  radiusSolar:
    number;

  luminositySolar:
    number;

  temperatureK:
    number;

  ageGyr:
    number;

  metallicityRelativeSolar:
    number;

  localPositionAu:
    Vec3;
}

export interface MoonDescriptor
  extends ProceduralDescriptorBase {
  kind:
    "moon";

  systemIndex:
    number;

  planetIndex:
    number;

  moonIndex:
    number;

  radiusEarth:
    number;

  massEarth:
    number;

  densityKgM3:
    number;

  semiMajorAxisKm:
    number;

  eccentricity:
    number;

  inclinationDeg:
    number;

  orbitalPeriodDays:
    number;

  surface:
    "rock" |
    "ice" |
    "mixed";
}

export interface PlanetDescriptor
  extends ProceduralDescriptorBase {
  kind:
    "planet";

  systemIndex:
    number;

  planetIndex:
    number;

  planetClass:
    PlanetClass;

  semiMajorAxisAu:
    number;

  eccentricity:
    number;

  inclinationDeg:
    number;

  orbitalPeriodDays:
    number;

  radiusEarth:
    number;

  massEarth:
    number;

  densityKgM3:
    number;

  surfaceGravityEarth:
    number;

  equilibriumTemperatureK:
    number;

  atmosphere:
    AtmosphereClass;

  waterFraction:
    number;

  lifePotential:
    LifePotential;

  ringStrength:
    number;

  moons:
    readonly MoonDescriptor[];
}

export interface AsteroidBeltDescriptor
  extends ProceduralDescriptorBase {
  kind:
    "asteroid-belt";

  systemIndex:
    number;

  innerRadiusAu:
    number;

  outerRadiusAu:
    number;

  density:
    number;

  icyFraction:
    number;
}

export interface StarSystemDescriptor
  extends ProceduralDescriptorBase {
  kind:
    "star-system";

  galaxyId:
    EntityId;

  systemIndex:
    number;

  positionLy:
    Vec3;

  stars:
    readonly StarDescriptor[];

  planets:
    readonly PlanetDescriptor[];

  belts:
    readonly AsteroidBeltDescriptor[];

  anomalyScore:
    number;
}

export interface GalaxyAnchor {
  id:
    EntityId;

  galaxyIndex:
    number;

  positionLy:
    Vec3;
}

export interface ProceduralSector {
  kind:
    "sector";

  realityClass:
    "procedural";

  generationVersion:
    number;

  seedKey:
    string;

  coordinate:
    SectorCoordinate;

  originLy:
    Vec3;

  sizeLy:
    number;

  galaxies:
    readonly GalaxyDescriptor[];
}

export const DEFAULT_PROCEDURAL_BUDGET:
  ProceduralGenerationBudget = {
  maximumGalaxies:
    12,

  maximumSystemsPerRequest:
    64,

  maximumPlanetsPerSystem:
    14,

  maximumMoonsPerPlanet:
    12,
};

export const PROCEDURAL_PROFILES:
  Readonly<
    Record<
      ProceduralPreset,
      ProceduralGenerationProfile
    >
  > = {
  standard: {
    preset:
      "standard",

    sectorSizeLy:
      5_000_000,

    galaxyDensity:
      1,

    maximumGalaxiesPerSector:
      8,

    multiStarRate:
      0.28,

    planetOccurrenceRate:
      0.78,

    giantPlanetRate:
      0.16,

    moonRate:
      0.48,

    anomalyRate:
      0.015,

    exoticity:
      0.02,
  },

  "dense-galaxies": {
    preset:
      "dense-galaxies",

    sectorSizeLy:
      4_000_000,

    galaxyDensity:
      1.8,

    maximumGalaxiesPerSector:
      12,

    multiStarRate:
      0.32,

    planetOccurrenceRate:
      0.82,

    giantPlanetRate:
      0.18,

    moonRate:
      0.52,

    anomalyRate:
      0.02,

    exoticity:
      0.025,
  },

  "sparse-universe": {
    preset:
      "sparse-universe",

    sectorSizeLy:
      7_500_000,

    galaxyDensity:
      0.45,

    maximumGalaxiesPerSector:
      5,

    multiStarRate:
      0.22,

    planetOccurrenceRate:
      0.7,

    giantPlanetRate:
      0.13,

    moonRate:
      0.42,

    anomalyRate:
      0.01,

    exoticity:
      0.015,
  },

  "exotic-sandbox": {
    preset:
      "exotic-sandbox",

    sectorSizeLy:
      5_000_000,

    galaxyDensity:
      1.25,

    maximumGalaxiesPerSector:
      10,

    multiStarRate:
      0.42,

    planetOccurrenceRate:
      0.9,

    giantPlanetRate:
      0.24,

    moonRate:
      0.62,

    anomalyRate:
      0.08,

    exoticity:
      0.3,
  },
};

function finite(
  value:
    number,
): boolean {
  return Number.isFinite(
    value,
  );
}

function clamp(
  value:
    number,
  minimum:
    number,
  maximum:
    number,
): number {
  if (
    !finite(
      value,
    )
  ) {
    return minimum;
  }

  return Math.min(
    maximum,
    Math.max(
      minimum,
      value,
    ),
  );
}

function lerp(
  start:
    number,
  end:
    number,
  amount:
    number,
): number {
  return (
    start +
    (
      end -
      start
    ) *
    clamp(
      amount,
      0,
      1,
    )
  );
}

function roundTo(
  value:
    number,
  digits:
    number,
): number {
  const factor =
    10 **
    digits;

  return (
    Math.round(
      value *
      factor,
    ) /
    factor
  );
}

function unsigned(
  value:
    number,
): number {
  return value >>> 0;
}

export function mixHash32(
  value:
    number,
): number {
  let result =
    unsigned(
      value,
    );

  result ^=
    result >>>
    16;

  result =
    Math.imul(
      result,
      0x7feb352d,
    );

  result ^=
    result >>>
    15;

  result =
    Math.imul(
      result,
      0x846ca68b,
    );

  result ^=
    result >>>
    16;

  return unsigned(
    result,
  );
}

export function hashString32(
  value:
    string,
  initial =
    0x811c9dc5,
): number {
  let hash =
    unsigned(
      initial,
    );

  for (
    let index = 0;
    index <
    value.length;
    index++
  ) {
    hash ^=
      value.charCodeAt(
        index,
      );

    hash =
      Math.imul(
        hash,
        0x01000193,
      );
  }

  return mixHash32(
    hash,
  );
}

export function combineHash32(
  ...values:
    readonly number[]
): number {
  let hash =
    0x9e3779b9;

  for (
    const value
    of values
  ) {
    hash =
      mixHash32(
        hash ^
        mixHash32(
          value,
        ),
      );
  }

  return unsigned(
    hash,
  );
}

function wordToHex(
  value:
    number,
): string {
  return unsigned(
    value,
  )
    .toString(
      16,
    )
    .padStart(
      8,
      "0",
    );
}

export function createProceduralSeed(
  input:
    string,
): ProceduralSeed {
  const normalized =
    input.trim() ||
    "UNIVERSE";

  const first =
    hashString32(
      normalized,
      0x811c9dc5,
    );

  const second =
    hashString32(
      `${normalized}:b`,
      0x9e3779b9,
    );

  const third =
    hashString32(
      `${normalized}:c`,
      0x85ebca6b,
    );

  const fourth =
    hashString32(
      `${normalized}:d`,
      0xc2b2ae35,
    );

  const words:
    readonly [
      number,
      number,
      number,
      number,
    ] = [
    first,
    second,
    third,
    fourth,
  ];

  return {
    input:
      normalized,

    version:
      PROCEDURAL_ENGINE_VERSION,

    words,

    key:
      words
        .map(
          wordToHex,
        )
        .join(
          "",
        ),
  };
}

export function serializeProceduralSeed(
  seed:
    ProceduralSeed,
): string {
  return [
    `v${seed.version}`,
    seed.key,
    encodeURIComponent(
      seed.input,
    ),
  ].join(
    ":",
  );
}

export function seedFromSerialized(
  value:
    string,
): ProceduralSeed {
  const parts =
    value.split(
      ":",
    );

  if (
    parts.length <
    3
  ) {
    throw new Error(
      "Invalid procedural seed serialization.",
    );
  }

  const versionText =
    parts[0] ??
    "";

  const key =
    parts[1] ??
    "";

  const input =
    decodeURIComponent(
      parts
        .slice(
          2,
        )
        .join(
          ":",
        ),
    );

  if (
    !versionText.startsWith(
      "v",
    )
  ) {
    throw new Error(
      "Procedural seed is missing a version.",
    );
  }

  const version =
    Number.parseInt(
      versionText.slice(
        1,
      ),
      10,
    );

  if (
    version !==
      PROCEDURAL_ENGINE_VERSION ||
    key.length !==
      32
  ) {
    throw new Error(
      "Unsupported procedural seed version.",
    );
  }

  const regenerated =
    createProceduralSeed(
      input,
    );

  if (
    regenerated.key !==
    key
  ) {
    throw new Error(
      "Procedural seed checksum mismatch.",
    );
  }

  return regenerated;
}

export class DeterministicRandom {
  private a:
    number;

  private b:
    number;

  private c:
    number;

  private d:
    number;

  private normalSpare:
    number | null =
    null;

  constructor(
    words:
      readonly [
        number,
        number,
        number,
        number,
      ],
  ) {
    this.a =
      unsigned(
        words[0],
      );

    this.b =
      unsigned(
        words[1],
      );

    this.c =
      unsigned(
        words[2],
      );

    this.d =
      unsigned(
        words[3],
      );

    if (
      this.a === 0 &&
      this.b === 0 &&
      this.c === 0 &&
      this.d === 0
    ) {
      this.d =
        1;
    }
  }

  nextUint32():
    number {
    const result =
      unsigned(
        this.a +
        this.b +
        this.d,
      );

    this.d =
      unsigned(
        this.d +
        1,
      );

    this.a =
      unsigned(
        this.b ^
        (
          this.b >>>
          9
        ),
      );

    this.b =
      unsigned(
        this.c +
        (
          this.c <<
          3
        ),
      );

    this.c =
      unsigned(
        (
          this.c <<
          21
        ) |
        (
          this.c >>>
          11
        ),
      );

    this.c =
      unsigned(
        this.c +
        result,
      );

    return result;
  }

  next():
    number {
    return (
      this.nextUint32() /
      0x1_0000_0000
    );
  }

  range(
    minimum:
      number,
    maximum:
      number,
  ): number {
    return lerp(
      minimum,
      maximum,
      this.next(),
    );
  }

  integer(
    minimum:
      number,
    maximumInclusive:
      number,
  ): number {
    const low =
      Math.ceil(
        Math.min(
          minimum,
          maximumInclusive,
        ),
      );

    const high =
      Math.floor(
        Math.max(
          minimum,
          maximumInclusive,
        ),
      );

    return (
      low +
      Math.floor(
        this.next() *
        (
          high -
          low +
          1
        ),
      )
    );
  }

  chance(
    probability:
      number,
  ): boolean {
    return (
      this.next() <
      clamp(
        probability,
        0,
        1,
      )
    );
  }

  sign():
    -1 | 1 {
    return this.chance(
      0.5,
    )
      ? -1
      : 1;
  }

  normal(
    mean =
      0,
    standardDeviation =
      1,
  ): number {
    if (
      this.normalSpare !==
      null
    ) {
      const spare =
        this.normalSpare;

      this.normalSpare =
        null;

      return (
        mean +
        spare *
        standardDeviation
      );
    }

    let first =
      0;

    let second =
      0;

    while (
      first <=
      Number.EPSILON
    ) {
      first =
        this.next();
    }

    while (
      second <=
      Number.EPSILON
    ) {
      second =
        this.next();
    }

    const magnitude =
      Math.sqrt(
        -2 *
        Math.log(
          first,
        ),
      );

    const angle =
      Math.PI *
      2 *
      second;

    const value =
      magnitude *
      Math.cos(
        angle,
      );

    const spare =
      magnitude *
      Math.sin(
        angle,
      );

    this.normalSpare =
      spare;

    return (
      mean +
      value *
      standardDeviation
    );
  }

  weightedIndex(
    weights:
      readonly number[],
  ): number {
    if (
      weights.length ===
      0
    ) {
      return -1;
    }

    let total =
      0;

    for (
      const weight
      of weights
    ) {
      total +=
        Math.max(
          0,
          weight,
        );
    }

    if (
      total <=
      0
    ) {
      return this.integer(
        0,
        weights.length -
        1,
      );
    }

    let cursor =
      this.next() *
      total;

    for (
      let index = 0;
      index <
      weights.length;
      index++
    ) {
      cursor -=
        Math.max(
          0,
          weights[index] ??
          0,
        );

      if (
        cursor <=
        0
      ) {
        return index;
      }
    }

    return (
      weights.length -
      1
    );
  }

  fork(
    label:
      string,
  ):
    DeterministicRandom {
    const labelHash =
      hashString32(
        label,
      );

    const words:
      readonly [
        number,
        number,
        number,
        number,
      ] = [
      combineHash32(
        this.a,
        labelHash,
        0x243f6a88,
      ),

      combineHash32(
        this.b,
        labelHash,
        0x85a308d3,
      ),

      combineHash32(
        this.c,
        labelHash,
        0x13198a2e,
      ),

      combineHash32(
        this.d,
        labelHash,
        0x03707344,
      ),
    ];

    return new DeterministicRandom(
      words,
    );
  }
}

function coordinateWord(
  value:
    number,
): number {
  if (
    !Number.isSafeInteger(
      value,
    )
  ) {
    throw new Error(
      "Sector coordinates must be safe integers.",
    );
  }

  const sign =
    value <
    0
      ? 0x80000000
      : 0;

  return unsigned(
    mixHash32(
      Math.abs(
        value,
      ),
    ) ^
    sign,
  );
}

export function sectorHash(
  seed:
    ProceduralSeed,
  coordinate:
    SectorCoordinate,
): number {
  return combineHash32(
    seed.words[0],
    seed.words[1],
    seed.words[2],
    seed.words[3],

    coordinateWord(
      coordinate.x,
    ),

    coordinateWord(
      coordinate.y,
    ),

    coordinateWord(
      coordinate.z,
    ),
  );
}

export function sectorOriginLy(
  coordinate:
    SectorCoordinate,
  sectorSizeLy:
    number,
): Vec3 {
  return [
    coordinate.x *
      sectorSizeLy,

    coordinate.y *
      sectorSizeLy,

    coordinate.z *
      sectorSizeLy,
  ];
}

export function positionToSector(
  positionLy:
    Vec3,
  sectorSizeLy:
    number,
):
  SectorCoordinate {
  if (
    !finite(
      sectorSizeLy,
    ) ||
    sectorSizeLy <=
      0
  ) {
    throw new Error(
      "Sector size must be positive.",
    );
  }

  return {
    x:
      Math.floor(
        positionLy[0] /
        sectorSizeLy,
      ),

    y:
      Math.floor(
        positionLy[1] /
        sectorSizeLy,
      ),

    z:
      Math.floor(
        positionLy[2] /
        sectorSizeLy,
      ),
  };
}

export function emptyProceduralAddress(
  sector:
    SectorCoordinate,
):
  ProceduralAddress {
  return {
    sector: {
      x:
        sector.x,

      y:
        sector.y,

      z:
        sector.z,
    },

    galaxyIndex:
      null,

    systemIndex:
      null,

    planetIndex:
      null,

    moonIndex:
      null,
  };
}

function addressPart(
  value:
    number | null,
): string {
  return value ===
    null
    ? "_"
    : value.toString(
        36,
      );
}

export function proceduralId(
  seed:
    ProceduralSeed,
  kind:
    string,
  address:
    ProceduralAddress,
  extra:
    readonly (
      string |
      number
    )[] =
    [],
):
  EntityId {
  const sector =
    address.sector;

  const tail =
    [
      addressPart(
        address
          .galaxyIndex,
      ),

      addressPart(
        address
          .systemIndex,
      ),

      addressPart(
        address
          .planetIndex,
      ),

      addressPart(
        address
          .moonIndex,
      ),

      ...extra.map(
        String,
      ),
    ].join(
      ":",
    );

  return [
    PROCEDURAL_ID_PREFIX,

    `v${PROCEDURAL_ENGINE_VERSION}`,

    seed.key.slice(
      0,
      12,
    ),

    kind,

    sector.x,
    sector.y,
    sector.z,

    tail,
  ].join(
    ":",
  );
}

function derivedRandom(
  seed:
    ProceduralSeed,
  coordinate:
    SectorCoordinate,
  ...labels:
    readonly (
      string |
      number
    )[]
):
  DeterministicRandom {
  let hash =
    sectorHash(
      seed,
      coordinate,
    );

  for (
    const label
    of labels
  ) {
    hash =
      combineHash32(
        hash,

        hashString32(
          String(
            label,
          ),
        ),
      );
  }

  const words:
    readonly [
      number,
      number,
      number,
      number,
    ] = [
    combineHash32(
      seed.words[0],
      hash,
      0xa341316c,
    ),

    combineHash32(
      seed.words[1],
      hash,
      0xc8013ea4,
    ),

    combineHash32(
      seed.words[2],
      hash,
      0xad90777d,
    ),

    combineHash32(
      seed.words[3],
      hash,
      0x7e95761e,
    ),
  ];

  return new DeterministicRandom(
    words,
  );
}

function poisson(
  lambda:
    number,
  random:
    DeterministicRandom,
): number {
  const safeLambda =
    clamp(
      lambda,
      0,
      16,
    );

  if (
    safeLambda <=
    0
  ) {
    return 0;
  }

  const threshold =
    Math.exp(
      -safeLambda,
    );

  let product =
    1;

  let count =
    0;

  do {
    count++;

    product *=
      random.next();
  } while (
    product >
      threshold &&
    count <
      64
  );

  return Math.max(
    0,
    count -
    1,
  );
}

const NAME_STARTS =
  [
    "A",
    "Ae",
    "Al",
    "Ar",
    "Ca",
    "Ce",
    "Da",
    "E",
    "El",
    "Er",
    "I",
    "Ka",
    "Ke",
    "Ly",
    "Ma",
    "Na",
    "Or",
    "Ra",
    "Sa",
    "Ta",
    "Va",
    "Xe",
    "Za",
  ] as const;

const NAME_MIDDLES =
  [
    "ba",
    "ca",
    "da",
    "dra",
    "el",
    "en",
    "fi",
    "ga",
    "ia",
    "ka",
    "la",
    "mi",
    "na",
    "no",
    "phi",
    "ra",
    "ri",
    "sa",
    "ta",
    "the",
    "va",
    "xe",
  ] as const;

const NAME_ENDS =
  [
    "a",
    "ae",
    "ar",
    "ea",
    "el",
    "en",
    "eus",
    "ia",
    "ion",
    "is",
    "on",
    "or",
    "os",
    "um",
    "us",
  ] as const;

function proceduralName(
  random:
    DeterministicRandom,
): string {
  const start =
    NAME_STARTS[
      random.integer(
        0,
        NAME_STARTS.length -
        1,
      )
    ] ??
    "A";

  const middleCount =
    random.integer(
      1,
      2,
    );

  let name =
    start;

  for (
    let index = 0;
    index <
    middleCount;
    index++
  ) {
    name +=
      NAME_MIDDLES[
        random.integer(
          0,
          NAME_MIDDLES.length -
          1,
        )
      ] ??
      "ra";
  }

  name +=
    NAME_ENDS[
      random.integer(
        0,
        NAME_ENDS.length -
        1,
      )
    ] ??
    "is";

  return name;
}

function galaxyMorphology(
  random:
    DeterministicRandom,
  exoticity:
    number,
):
  GalaxyMorphology {
  const irregularBoost =
    clamp(
      exoticity,
      0,
      1,
    ) *
    0.2;

  const index =
    random.weightedIndex([
      0.34,
      0.22,
      0.22,
      0.12,
      0.1 +
        irregularBoost,
    ]);

  return (
    [
      "spiral",
      "barred-spiral",
      "elliptical",
      "lenticular",
      "irregular",
    ] as const
  )[index] ??
    "spiral";
}

function galaxyRadiusLy(
  random:
    DeterministicRandom,
  morphology:
    GalaxyMorphology,
): number {
  const scale =
    morphology ===
    "elliptical"
      ? random.range(
          0.8,
          1.8,
        )
      : morphology ===
          "irregular"
        ? random.range(
            0.25,
            0.9,
          )
        : random.range(
            0.55,
            1.35,
          );

  return roundTo(
    45_000 *
      scale,
    2,
  );
}

function galaxyMassSolar(
  random:
    DeterministicRandom,
  radiusLy:
    number,
): number {
  const radiusScale =
    radiusLy /
    45_000;

  return Math.max(
    5e7,

    5e10 *
      radiusScale **
        random.range(
          1.5,
          2.1,
        ) *
      random.range(
        0.65,
        1.45,
      ),
  );
}

function estimateStarCount(
  stellarMassSolar:
    number,
  random:
    DeterministicRandom,
): number {
  const averageMass =
    random.range(
      0.35,
      0.65,
    );

  return Math.floor(
    stellarMassSolar /
    averageMass,
  );
}

function galaxyLocalPosition(
  random:
    DeterministicRandom,
  sectorSizeLy:
    number,
): Vec3 {
  const margin =
    sectorSizeLy *
    0.08;

  const span =
    sectorSizeLy -
    margin *
    2;

  return [
    margin +
      random.next() *
      span,

    margin +
      random.next() *
      span,

    margin +
      random.next() *
      span,
  ];
}

function addVec3(
  first:
    Vec3,
  second:
    Vec3,
): Vec3 {
  return [
    first[0] +
      second[0],

    first[1] +
      second[1],

    first[2] +
      second[2],
  ];
}

function systemPositionInGalaxy(
  random:
    DeterministicRandom,
  galaxy:
    GalaxyDescriptor,
): Vec3 {
  const radius =
    Math.sqrt(
      random.next(),
    ) *
    galaxy.radiusLy;

  const angle =
    random.range(
      0,
      Math.PI *
      2,
    );

  const thickness =
    galaxy.morphology ===
    "elliptical"
      ? galaxy.radiusLy *
        0.5
      : galaxy.morphology ===
          "irregular"
        ? galaxy.radiusLy *
          0.35
        : galaxy.radiusLy *
          0.08;

  return [
    galaxy.positionLy[0] +
      Math.cos(
        angle,
      ) *
      radius,

    galaxy.positionLy[1] +
      Math.sin(
        angle,
      ) *
      radius,

    galaxy.positionLy[2] +
      random.normal(
        0,
        thickness,
      ),
  ];
}

function spectralClassForTemperature(
  temperatureK:
    number,
):
  StellarClass {
  if (
    temperatureK >=
    30_000
  ) {
    return "O";
  }

  if (
    temperatureK >=
    10_000
  ) {
    return "B";
  }

  if (
    temperatureK >=
    7_500
  ) {
    return "A";
  }

  if (
    temperatureK >=
    6_000
  ) {
    return "F";
  }

  if (
    temperatureK >=
    5_200
  ) {
    return "G";
  }

  if (
    temperatureK >=
    3_700
  ) {
    return "K";
  }

  return "M";
}

function stellarMass(
  random:
    DeterministicRandom,
  exoticity:
    number,
): number {
  const roll =
    random.next();

  let mass:
    number;

  if (
    roll <
    0.72
  ) {
    mass =
      random.range(
        0.08,
        0.65,
      );
  } else if (
    roll <
    0.94
  ) {
    mass =
      random.range(
        0.65,
        1.35,
      );
  } else if (
    roll <
    0.992
  ) {
    mass =
      random.range(
        1.35,
        4.5,
      );
  } else {
    mass =
      random.range(
        4.5,

        lerp(
          18,
          55,
          exoticity,
        ),
      );
  }

  return roundTo(
    mass,
    5,
  );
}

function stellarLuminositySolar(
  massSolar:
    number,
): number {
  if (
    massSolar <
    0.43
  ) {
    return (
      0.23 *
      massSolar **
        2.3
    );
  }

  if (
    massSolar <
    2
  ) {
    return (
      massSolar **
      4
    );
  }

  if (
    massSolar <
    20
  ) {
    return (
      1.5 *
      massSolar **
        3.5
    );
  }

  return (
    3_200 *
    massSolar
  );
}

function stellarRadiusSolar(
  massSolar:
    number,
): number {
  return massSolar <=
    1
    ? massSolar **
        0.8
    : massSolar **
        0.57;
}

function stellarTemperatureK(
  luminositySolar:
    number,
  radiusSolar:
    number,
): number {
  return (
    5_772 *
    (
      luminositySolar /
      radiusSolar **
        2
    ) **
      0.25
  );
}

function stellarLifetimeGyr(
  massSolar:
    number,
  luminositySolar:
    number,
): number {
  return (
    10 *
    massSolar /
    Math.max(
      luminositySolar,
      1e-6,
    )
  );
}

function createStar(
  seed:
    ProceduralSeed,
  galaxy:
    GalaxyDescriptor,
  systemIndex:
    number,
  stellarIndex:
    number,
  exoticity:
    number,
  random:
    DeterministicRandom,
):
  StarDescriptor {
  const massSolar =
    stellarMass(
      random,
      exoticity,
    );

  const luminositySolar =
    stellarLuminositySolar(
      massSolar,
    );

  const radiusSolar =
    stellarRadiusSolar(
      massSolar,
    );

  const temperatureK =
    stellarTemperatureK(
      luminositySolar,
      radiusSolar,
    );

  const maximumAge =
    Math.min(
      13.7,

      stellarLifetimeGyr(
        massSolar,
        luminositySolar,
      ),
    );

  const address:
    ProceduralAddress = {
    sector:
      galaxy.address
        .sector,

    galaxyIndex:
      galaxy.address
        .galaxyIndex,

    systemIndex,

    planetIndex:
      null,

    moonIndex:
      null,
  };

  const separationAu =
    stellarIndex ===
    0
      ? 0
      : random.range(
          0.03,
          25,
        );

  const angle =
    random.range(
      0,
      Math.PI *
      2,
    );

  return {
    id:
      proceduralId(
        seed,
        "star",
        address,
        [
          stellarIndex,
        ],
      ),

    name:
      `${proceduralName(
        random.fork(
          "name",
        ),
      )} ${String.fromCharCode(
        65 +
        stellarIndex,
      )}`,

    realityClass:
      "procedural",

    generationVersion:
      PROCEDURAL_ENGINE_VERSION,

    seedKey:
      seed.key,

    address,

    kind:
      "star",

    systemIndex,

    stellarIndex,

    stellarClass:
      spectralClassForTemperature(
        temperatureK,
      ),

    massSolar,

    radiusSolar:
      roundTo(
        radiusSolar,
        5,
      ),

    luminositySolar:
      roundTo(
        luminositySolar,
        6,
      ),

    temperatureK:
      Math.round(
        temperatureK,
      ),

    ageGyr:
      roundTo(
        random.range(
          0.01,

          Math.max(
            0.02,
            maximumAge,
          ),
        ),
        4,
      ),

    metallicityRelativeSolar:
      roundTo(
        galaxy
          .metallicityRelativeSolar *
        random.range(
          0.75,
          1.25,
        ),
        4,
      ),

    localPositionAu: [
      Math.cos(
        angle,
      ) *
      separationAu,

      Math.sin(
        angle,
      ) *
      separationAu,

      stellarIndex ===
      0
        ? 0
        : random.normal(
            0,
            separationAu *
            0.05,
          ),
    ],
  };
}

function combinedLuminosity(
  stars:
    readonly StarDescriptor[],
): number {
  return stars.reduce(
    (
      total,
      star,
    ) =>
      total +
      star
        .luminositySolar,
    0,
  );
}

function combinedStellarMass(
  stars:
    readonly StarDescriptor[],
): number {
  return stars.reduce(
    (
      total,
      star,
    ) =>
      total +
      star.massSolar,
    0,
  );
}

function choosePlanetClass(
  random:
    DeterministicRandom,
  semiMajorAxisAu:
    number,
  giantPlanetRate:
    number,
):
  PlanetClass {
  if (
    random.chance(
      giantPlanetRate,
    )
  ) {
    return random.chance(
      0.68,
    )
      ? "gas-giant"
      : "ice-giant";
  }

  if (
    semiMajorAxisAu <
    0.16
  ) {
    return random.chance(
      0.3,
    )
      ? "lava"
      : "rocky";
  }

  const index =
    random.weightedIndex([
      0.42,
      0.18,
      0.12,
      0.1,
      0.09,
      0.09,
    ]);

  return (
    [
      "rocky",
      "super-earth",
      "sub-neptune",
      "dwarf",
      "ocean",
      "ice",
    ] as const
  )[index] ??
    "rocky";
}

function planetRadiusEarth(
  random:
    DeterministicRandom,
  planetClass:
    PlanetClass,
): number {
  switch (
    planetClass
  ) {
    case "dwarf":
      return random.range(
        0.12,
        0.55,
      );

    case "rocky":
    case "lava":
      return random.range(
        0.55,
        1.35,
      );

    case "ocean":
      return random.range(
        0.75,
        1.7,
      );

    case "super-earth":
      return random.range(
        1.25,
        2.2,
      );

    case "sub-neptune":
      return random.range(
        1.8,
        4,
      );

    case "ice":
      return random.range(
        0.35,
        1.4,
      );

    case "ice-giant":
      return random.range(
        3.2,
        5.2,
      );

    case "gas-giant":
      return random.range(
        7.5,
        14.5,
      );
  }
}

function planetMassEarth(
  random:
    DeterministicRandom,
  planetClass:
    PlanetClass,
  radiusEarth:
    number,
): number {
  switch (
    planetClass
  ) {
    case "gas-giant":
      return random.range(
        35,
        450,
      );

    case "ice-giant":
      return random.range(
        8,
        35,
      );

    case "sub-neptune":
      return random.range(
        3,
        18,
      );

    case "super-earth":
      return random.range(
        2,
        10,
      );

    case "dwarf":
      return random.range(
        0.01,
        0.25,
      );

    case "ice":
      return Math.max(
        0.03,

        radiusEarth **
          3 *
        random.range(
          0.5,
          0.9,
        ),
      );

    case "ocean":
      return (
        radiusEarth **
          3 *
        random.range(
          0.75,
          1.15,
        )
      );

    case "lava":
    case "rocky":
      return (
        radiusEarth **
          3 *
        random.range(
          0.85,
          1.3,
        )
      );
  }
}

function densityForPlanet(
  planetClass:
    PlanetClass,
  random:
    DeterministicRandom,
): number {
  switch (
    planetClass
  ) {
    case "gas-giant":
      return random.range(
        650,
        1_800,
      );

    case "ice-giant":
      return random.range(
        1_100,
        2_300,
      );

    case "sub-neptune":
      return random.range(
        1_400,
        3_500,
      );

    case "ocean":
      return random.range(
        2_200,
        4_800,
      );

    case "ice":
      return random.range(
        900,
        3_200,
      );

    case "dwarf":
      return random.range(
        1_500,
        4_000,
      );

    case "lava":
      return random.range(
        4_000,
        7_000,
      );

    case "rocky":
    case "super-earth":
      return random.range(
        3_500,
        7_500,
      );
  }
}

function equilibriumTemperatureK(
  luminositySolar:
    number,
  semiMajorAxisAu:
    number,
  random:
    DeterministicRandom,
): number {
  const albedo =
    random.range(
      0.05,
      0.65,
    );

  return (
    278.5 *
    luminositySolar **
      0.25 /
    Math.sqrt(
      Math.max(
        semiMajorAxisAu,
        0.01,
      ),
    ) *
    (
      1 -
      albedo
    ) **
      0.25
  );
}

function atmosphereForPlanet(
  planetClass:
    PlanetClass,
  temperatureK:
    number,
  random:
    DeterministicRandom,
):
  AtmosphereClass {
  if (
    planetClass ===
      "gas-giant" ||
    planetClass ===
      "ice-giant" ||
    planetClass ===
      "sub-neptune"
  ) {
    return "hydrogen-rich";
  }

  if (
    planetClass ===
      "dwarf" &&
    random.chance(
      0.7,
    )
  ) {
    return "none";
  }

  if (
    temperatureK >
    700
  ) {
    return random.chance(
      0.5,
    )
      ? "trace"
      : "toxic-simulation";
  }

  const roll =
    random.next();

  if (
    roll <
    0.18
  ) {
    return "none";
  }

  if (
    roll <
    0.34
  ) {
    return "trace";
  }

  if (
    roll <
    0.52
  ) {
    return "thin";
  }

  if (
    roll <
    0.84
  ) {
    return "dense";
  }

  return "earthlike-simulation";
}

function waterFractionForPlanet(
  planetClass:
    PlanetClass,
  temperatureK:
    number,
  random:
    DeterministicRandom,
): number {
  if (
    planetClass ===
    "ocean"
  ) {
    return random.range(
      0.65,
      0.98,
    );
  }

  if (
    planetClass ===
    "ice"
  ) {
    return random.range(
      0.25,
      0.85,
    );
  }

  if (
    temperatureK <
      160 ||
    temperatureK >
      520
  ) {
    return random.range(
      0,
      0.08,
    );
  }

  if (
    planetClass ===
      "rocky" ||
    planetClass ===
      "super-earth"
  ) {
    return random.range(
      0,
      0.65,
    );
  }

  return random.range(
    0,
    0.18,
  );
}

function lifePotentialForPlanet(
  planetClass:
    PlanetClass,
  temperatureK:
    number,
  atmosphere:
    AtmosphereClass,
  waterFraction:
    number,
):
  LifePotential {
  if (
    planetClass ===
      "gas-giant" ||
    planetClass ===
      "ice-giant" ||
    planetClass ===
      "lava"
  ) {
    return "none";
  }

  if (
    temperatureK <
      180 ||
    temperatureK >
      390
  ) {
    return "low";
  }

  const atmosphereScore =
    atmosphere ===
    "earthlike-simulation"
      ? 2
      : atmosphere ===
          "thin" ||
        atmosphere ===
          "dense"
        ? 1
        : 0;

  const waterScore =
    waterFraction >
      0.05 &&
    waterFraction <
      0.9
      ? 2
      : waterFraction >
          0
        ? 1
        : 0;

  const temperatureScore =
    temperatureK >=
      240 &&
    temperatureK <=
      330
      ? 2
      : 1;

  const score =
    atmosphereScore +
    waterScore +
    temperatureScore;

  if (
    score >=
    6
  ) {
    return "high";
  }

  if (
    score >=
    4
  ) {
    return "moderate";
  }

  return "low";
}

function orbitalPeriodDays(
  semiMajorAxisAu:
    number,
  stellarMassSolar:
    number,
): number {
  const years =
    Math.sqrt(
      semiMajorAxisAu **
        3 /
      Math.max(
        stellarMassSolar,
        0.01,
      ),
    );

  return (
    years *
    365.25
  );
}

function moonCountForPlanet(
  planetClass:
    PlanetClass,
  random:
    DeterministicRandom,
  profile:
    ProceduralGenerationProfile,
  budget:
    ProceduralGenerationBudget,
): number {
  let maximum:
    number;

  switch (
    planetClass
  ) {
    case "gas-giant":
      maximum =
        12;
      break;

    case "ice-giant":
      maximum =
        9;
      break;

    case "sub-neptune":
      maximum =
        5;
      break;

    case "super-earth":
      maximum =
        3;
      break;

    default:
      maximum =
        2;
      break;
  }

  maximum =
    Math.min(
      maximum,
      budget
        .maximumMoonsPerPlanet,
    );

  if (
    maximum <=
      0 ||
    !random.chance(
      profile.moonRate,
    )
  ) {
    return 0;
  }

  return Math.min(
    maximum,

    Math.max(
      1,

      Math.floor(
        random.next() *
        (
          maximum +
          1
        ),
      ),
    ),
  );
}

function createMoon(
  seed:
    ProceduralSeed,
  galaxy:
    GalaxyDescriptor,
  systemIndex:
    number,
  planetIndex:
    number,
  moonIndex:
    number,
  planet:
    {
      radiusEarth:
        number;

      massEarth:
        number;
    },
  random:
    DeterministicRandom,
):
  MoonDescriptor {
  const radiusEarth =
    clamp(
      planet.radiusEarth *
      random.range(
        0.03,
        0.32,
      ),
      0.01,
      0.8,
    );

  const massEarth =
    Math.max(
      0.00001,

      radiusEarth **
        3 *
      random.range(
        0.45,
        1.3,
      ),
    );

  const semiMajorAxisKm =
    random.range(
      25_000,
      1_800_000,
    ) *
    (
      1 +
      moonIndex *
      0.15
    );

  const orbitalPeriodDays =
    27.3 *
    (
      semiMajorAxisKm /
      384_400
    ) **
      1.5 /
    Math.sqrt(
      Math.max(
        planet.massEarth,
        0.01,
      ),
    );

  const address:
    ProceduralAddress = {
    sector:
      galaxy.address
        .sector,

    galaxyIndex:
      galaxy.address
        .galaxyIndex,

    systemIndex,

    planetIndex,

    moonIndex,
  };

  const surfaceRoll =
    random.next();

  return {
    id:
      proceduralId(
        seed,
        "moon",
        address,
      ),

    name:
      `${proceduralName(
        random.fork(
          "name",
        ),
      )} ${moonIndex + 1}`,

    realityClass:
      "procedural",

    generationVersion:
      PROCEDURAL_ENGINE_VERSION,

    seedKey:
      seed.key,

    address,

    kind:
      "moon",

    systemIndex,

    planetIndex,

    moonIndex,

    radiusEarth:
      roundTo(
        radiusEarth,
        5,
      ),

    massEarth:
      roundTo(
        massEarth,
        7,
      ),

    densityKgM3:
      Math.round(
        random.range(
          900,
          5_500,
        ),
      ),

    semiMajorAxisKm:
      roundTo(
        semiMajorAxisKm,
        2,
      ),

    eccentricity:
      roundTo(
        random.range(
          0,
          0.18,
        ),
        6,
      ),

    inclinationDeg:
      roundTo(
        random.range(
          0,
          18,
        ),
        4,
      ),

    orbitalPeriodDays:
      roundTo(
        orbitalPeriodDays,
        5,
      ),

    surface:
      surfaceRoll <
      0.33
        ? "ice"
        : surfaceRoll <
            0.72
          ? "rock"
          : "mixed",
  };
}

function createPlanet(
  seed:
    ProceduralSeed,
  galaxy:
    GalaxyDescriptor,
  systemIndex:
    number,
  planetIndex:
    number,
  semiMajorAxisAu:
    number,
  stars:
    readonly StarDescriptor[],
  profile:
    ProceduralGenerationProfile,
  budget:
    ProceduralGenerationBudget,
  random:
    DeterministicRandom,
):
  PlanetDescriptor {
  const planetClass =
    choosePlanetClass(
      random,
      semiMajorAxisAu,
      profile
        .giantPlanetRate,
    );

  const radiusEarth =
    planetRadiusEarth(
      random,
      planetClass,
    );

  const massEarth =
    planetMassEarth(
      random,
      planetClass,
      radiusEarth,
    );

  const luminosity =
    combinedLuminosity(
      stars,
    );

  const temperatureK =
    equilibriumTemperatureK(
      luminosity,
      semiMajorAxisAu,
      random,
    );

  const atmosphere =
    atmosphereForPlanet(
      planetClass,
      temperatureK,
      random,
    );

  const waterFraction =
    waterFractionForPlanet(
      planetClass,
      temperatureK,
      random,
    );

  const address:
    ProceduralAddress = {
    sector:
      galaxy.address
        .sector,

    galaxyIndex:
      galaxy.address
        .galaxyIndex,

    systemIndex,

    planetIndex,

    moonIndex:
      null,
  };

  const moonCount =
    moonCountForPlanet(
      planetClass,

      random.fork(
        "moon-count",
      ),

      profile,

      budget,
    );

  const moons:
    MoonDescriptor[] = [];

  for (
    let moonIndex = 0;
    moonIndex <
    moonCount;
    moonIndex++
  ) {
    moons.push(
      createMoon(
        seed,
        galaxy,
        systemIndex,
        planetIndex,
        moonIndex,
        {
          radiusEarth,
          massEarth,
        },
        random.fork(
          `moon:${moonIndex}`,
        ),
      ),
    );
  }

  return {
    id:
      proceduralId(
        seed,
        "planet",
        address,
      ),

    name:
      proceduralName(
        random.fork(
          "name",
        ),
      ),

    realityClass:
      "procedural",

    generationVersion:
      PROCEDURAL_ENGINE_VERSION,

    seedKey:
      seed.key,

    address,

    kind:
      "planet",

    systemIndex,

    planetIndex,

    planetClass,

    semiMajorAxisAu:
      roundTo(
        semiMajorAxisAu,
        7,
      ),

    eccentricity:
      roundTo(
        clamp(
          Math.abs(
            random.normal(
              0.04,
              0.06,
            ),
          ),
          0,
          0.72,
        ),
        6,
      ),

    inclinationDeg:
      roundTo(
        Math.abs(
          random.normal(
            1.5,
            2.5,
          ),
        ),
        5,
      ),

    orbitalPeriodDays:
      roundTo(
        orbitalPeriodDays(
          semiMajorAxisAu,

          combinedStellarMass(
            stars,
          ),
        ),
        4,
      ),

    radiusEarth:
      roundTo(
        radiusEarth,
        5,
      ),

    massEarth:
      roundTo(
        massEarth,
        5,
      ),

    densityKgM3:
      Math.round(
        densityForPlanet(
          planetClass,
          random,
        ),
      ),

    surfaceGravityEarth:
      roundTo(
        massEarth /
        Math.max(
          radiusEarth **
            2,
          0.0001,
        ),
        5,
      ),

    equilibriumTemperatureK:
      Math.round(
        temperatureK,
      ),

    atmosphere,

    waterFraction:
      roundTo(
        waterFraction,
        5,
      ),

    lifePotential:
      lifePotentialForPlanet(
        planetClass,
        temperatureK,
        atmosphere,
        waterFraction,
      ),

    ringStrength:
      roundTo(
        (
          planetClass ===
            "gas-giant" ||
          planetClass ===
            "ice-giant"
        ) &&
        random.chance(
          0.48,
        )
          ? random.range(
              0.15,
              1,
            )
          : random.chance(
                0.05,
              )
            ? random.range(
                0.02,
                0.2,
              )
            : 0,
        4,
      ),

    moons,
  };
}

function createBelts(
  seed:
    ProceduralSeed,
  galaxy:
    GalaxyDescriptor,
  systemIndex:
    number,
  planets:
    readonly PlanetDescriptor[],
  random:
    DeterministicRandom,
):
  AsteroidBeltDescriptor[] {
  if (
    planets.length <
      2 ||
    !random.chance(
      0.42,
    )
  ) {
    return [];
  }

  const gapIndex =
    random.integer(
      0,
      planets.length -
      2,
    );

  const inner =
    planets[
      gapIndex
    ]
      ?.semiMajorAxisAu ??
    1;

  const outer =
    planets[
      gapIndex +
      1
    ]
      ?.semiMajorAxisAu ??
    inner *
      1.8;

  if (
    outer <=
    inner *
    1.15
  ) {
    return [];
  }

  const address:
    ProceduralAddress = {
    sector:
      galaxy.address
        .sector,

    galaxyIndex:
      galaxy.address
        .galaxyIndex,

    systemIndex,

    planetIndex:
      null,

    moonIndex:
      null,
  };

  return [
    {
      id:
        proceduralId(
          seed,
          "belt",
          address,
          [
            gapIndex,
          ],
        ),

      name:
        "Asteroid Belt",

      realityClass:
        "procedural",

      generationVersion:
        PROCEDURAL_ENGINE_VERSION,

      seedKey:
        seed.key,

      address,

      kind:
        "asteroid-belt",

      systemIndex,

      innerRadiusAu:
        roundTo(
          lerp(
            inner,
            outer,
            0.35,
          ),
          6,
        ),

      outerRadiusAu:
        roundTo(
          lerp(
            inner,
            outer,
            0.65,
          ),
          6,
        ),

      density:
        roundTo(
          random.range(
            0.1,
            1,
          ),
          4,
        ),

      icyFraction:
        roundTo(
          random.range(
            0,
            1,
          ),
          4,
        ),
    },
  ];
}

function planetCount(
  random:
    DeterministicRandom,
  profile:
    ProceduralGenerationProfile,
  budget:
    ProceduralGenerationBudget,
): number {
  if (
    !random.chance(
      profile
        .planetOccurrenceRate,
    )
  ) {
    return 0;
  }

  const raw =
    Math.floor(
      random.range(
        1,
        7.5,
      ) +
      Math.max(
        0,

        random.normal(
          1,
          2,
        ),
      ),
    );

  return Math.min(
    budget
      .maximumPlanetsPerSystem,

    Math.max(
      1,
      raw,
    ),
  );
}

function planetaryOrbits(
  count:
    number,
  random:
    DeterministicRandom,
):
  number[] {
  if (
    count <=
    0
  ) {
    return [];
  }

  const output:
    number[] = [];

  let current =
    random.range(
      0.03,
      0.55,
    );

  for (
    let index = 0;
    index <
    count;
    index++
  ) {
    output.push(
      current,
    );

    current *=
      random.range(
        1.35,
        2.15,
      );
  }

  return output;
}

function hashToUnit(value: number): number {
  return mixHash32(value) / 0x1_0000_0000;
}

function valueNoise2D(seed: number, x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const corner = (offsetX: number, offsetY: number): number =>
    hashToUnit(combineHash32(seed, x0 + offsetX, y0 + offsetY)) * 2 - 1;
  return lerp(
    lerp(corner(0, 0), corner(1, 0), sx),
    lerp(corner(0, 1), corner(1, 1), sx),
    sy,
  );
}

function fractalSurfaceNoise(seed: number, x: number, y: number): number {
  let amplitude = 0.5;
  let frequency = 1;
  let total = 0;
  let normalization = 0;
  for (let octave = 0; octave < 5; octave++) {
    total += valueNoise2D(seed + octave * 0x45d9f3b, x * frequency, y * frequency) * amplitude;
    normalization += amplitude;
    amplitude *= 0.5;
    frequency *= 2.03;
  }
  return total / normalization;
}

function terrainDirection(face: number, u: number, v: number): Vec3 {
  const direction: Vec3 = (() => {
    switch (face % 6) {
      case 0: return [1, v, -u];
      case 1: return [-1, v, u];
      case 2: return [u, 1, -v];
      case 3: return [u, -1, v];
      case 4: return [u, v, 1];
      default: return [-u, v, -1];
    }
  })();
  const magnitude = Math.sqrt(direction[0] ** 2 + direction[1] ** 2 + direction[2] ** 2);
  return [direction[0] / magnitude, direction[1] / magnitude, direction[2] / magnitude];
}

function classifyTerrainBiome(
  planet: PlanetDescriptor,
  temperatureK: number,
  moisture: number,
  elevation: number,
): TerrainBiome {
  if (planet.planetClass === "lava" || temperatureK > 700) return "volcanic";
  if (planet.planetClass === "gas-giant" || planet.planetClass === "ice-giant") return "sterile";
  if (elevation < -0.18) return temperatureK < 245 ? "ice" : "ocean";
  if (temperatureK < 210) return "ice";
  if (temperatureK < 260) return elevation > 0.45 ? "tundra" : "ice";
  if (elevation > 0.62) return "highland";
  if (moisture < 0.16) return "desert";
  if (moisture > 0.78 && temperatureK > 285) return "rainforest";
  if (moisture > 0.56) return "forest";
  if (moisture > 0.32) return temperatureK > 300 ? "savanna" : "grassland";
  return elevation < 0 ? "coast" : "cratered";
}

function terrainSample(
  planet: PlanetDescriptor,
  seed: ProceduralSeed,
  face: number,
  u: number,
  v: number,
): { elevation: number; temperatureK: number; moisture: number; biome: TerrainBiome } {
  const direction = terrainDirection(face, u, v);
  const latitude = Math.asin(direction[1]);
  const longitude = Math.atan2(direction[2], direction[0]);
  const surfaceSeed = combineHash32(seed.words[0], hashString32(planet.id));
  const x = (longitude / (Math.PI * 2) + 0.5) * 8;
  const y = (latitude / Math.PI + 0.5) * 8;
  const elevation = clamp(
    fractalSurfaceNoise(surfaceSeed, x, y) + fractalSurfaceNoise(surfaceSeed ^ 0x9e3779b9, x * 2.7, y * 2.7) * 0.22,
    -1,
    1,
  );
  const temperatureK = Math.max(40, planet.equilibriumTemperatureK - Math.abs(Math.sin(latitude)) * 48 - Math.max(0, elevation) * 22);
  const moistureNoise = (fractalSurfaceNoise(surfaceSeed ^ 0x85ebca6b, x * 1.3, y * 1.3) + 1) * 0.5;
  const moisture = clamp(planet.waterFraction * 0.7 + moistureNoise * 0.45 - Math.max(0, elevation) * 0.18, 0, 1);
  return { elevation, temperatureK, moisture, biome: classifyTerrainBiome(planet, temperatureK, moisture, elevation) };
}

export class ProceduralUniverseGenerator {
  readonly seed:
    ProceduralSeed;

  readonly profile:
    ProceduralGenerationProfile;

  readonly budget:
    ProceduralGenerationBudget;

  constructor(
    seed:
      string |
      ProceduralSeed,

    preset:
      ProceduralPreset =
      "standard",

    budget:
      Partial<
        ProceduralGenerationBudget
      > = {},
  ) {
    this.seed =
      typeof seed ===
      "string"
        ? createProceduralSeed(
            seed,
          )
        : seed;

    this.profile =
      PROCEDURAL_PROFILES[
        preset
      ];

    this.budget = {
      ...DEFAULT_PROCEDURAL_BUDGET,
      ...budget,
    };

    this.validateBudget();
  }

  private validateBudget():
    void {
    if (
      this.budget
        .maximumGalaxies <
        0 ||
      this.budget
        .maximumSystemsPerRequest <
        0 ||
      this.budget
        .maximumPlanetsPerSystem <
        0 ||
      this.budget
        .maximumMoonsPerPlanet <
        0
    ) {
      throw new Error(
        "Procedural generation budgets cannot be negative.",
      );
    }
  }

  sector(
    coordinate:
      SectorCoordinate,
  ):
    ProceduralSector {
    const random =
      derivedRandom(
        this.seed,
        coordinate,
        "sector",
      );

    const origin =
      sectorOriginLy(
        coordinate,

        this.profile
          .sectorSizeLy,
      );

    const expected =
      2.2 *
      this.profile
        .galaxyDensity;

    const count =
      Math.min(
        this.profile
          .maximumGalaxiesPerSector,

        this.budget
          .maximumGalaxies,

        poisson(
          expected,
          random,
        ),
      );

    const galaxies:
      GalaxyDescriptor[] = [];

    for (
      let galaxyIndex = 0;
      galaxyIndex <
      count;
      galaxyIndex++
    ) {
      galaxies.push(
        this.galaxy(
          coordinate,
          galaxyIndex,
        ),
      );
    }

    return {
      kind:
        "sector",

      realityClass:
        "procedural",

      generationVersion:
        PROCEDURAL_ENGINE_VERSION,

      seedKey:
        this.seed.key,

      coordinate: {
        x:
          coordinate.x,

        y:
          coordinate.y,

        z:
          coordinate.z,
      },

      originLy:
        origin,

      sizeLy:
        this.profile
          .sectorSizeLy,

      galaxies,
    };
  }

  galaxy(
    coordinate:
      SectorCoordinate,
    galaxyIndex:
      number,
  ):
    GalaxyDescriptor {
    if (
      !Number.isSafeInteger(
        galaxyIndex,
      ) ||
      galaxyIndex <
        0
    ) {
      throw new Error(
        "Galaxy index must be a non-negative safe integer.",
      );
    }

    const random =
      derivedRandom(
        this.seed,
        coordinate,
        "galaxy",
        galaxyIndex,
      );

    const morphology =
      galaxyMorphology(
        random,
        this.profile
          .exoticity,
      );

    const radiusLy =
      galaxyRadiusLy(
        random,
        morphology,
      );

    const stellarMassSolar =
      galaxyMassSolar(
        random,
        radiusLy,
      );

    const estimatedStarCount =
      estimateStarCount(
        stellarMassSolar,
        random,
      );

    const estimatedSystemCount =
      Math.floor(
        estimatedStarCount *
        random.range(
          0.62,
          0.88,
        ),
      );

    const address:
      ProceduralAddress = {
      sector: {
        x:
          coordinate.x,

        y:
          coordinate.y,

        z:
          coordinate.z,
      },

      galaxyIndex,

      systemIndex:
        null,

      planetIndex:
        null,

      moonIndex:
        null,
    };

    const origin =
      sectorOriginLy(
        coordinate,

        this.profile
          .sectorSizeLy,
      );

    const local =
      galaxyLocalPosition(
        random,

        this.profile
          .sectorSizeLy,
      );

    const metallicity =
      clamp(
        random.normal(
          0.85,
          0.35,
        ),
        0.05,
        2.5,
      );

    return {
      id:
        proceduralId(
          this.seed,
          "galaxy",
          address,
        ),

      name:
        proceduralName(
          random.fork(
            "name",
          ),
        ),

      realityClass:
        "procedural",

      generationVersion:
        PROCEDURAL_ENGINE_VERSION,

      seedKey:
        this.seed.key,

      address,

      kind:
        "galaxy",

      morphology,

      positionLy:
        addVec3(
          origin,
          local,
        ),

      radiusLy,

      stellarMassSolar:
        roundTo(
          stellarMassSolar,
          2,
        ),

      metallicityRelativeSolar:
        roundTo(
          metallicity,
          4,
        ),

      estimatedStarCount,

      estimatedSystemCount,

      orientation: {
        yawRad:
          random.range(
            0,
            Math.PI *
            2,
          ),

        pitchRad:
          random.range(
            -Math.PI /
              2,

            Math.PI /
              2,
          ),

        rollRad:
          random.range(
            0,
            Math.PI *
            2,
          ),
      },

      activity:
        roundTo(
          clamp(
            random.range(
              0,
              0.5,
            ) +
            this.profile
              .exoticity *
            random.range(
              0,
              0.5,
            ),
            0,
            1,
          ),
          4,
        ),
    };
  }

  system(
    galaxy:
      GalaxyDescriptor,
    systemIndex:
      number,
  ):
    StarSystemDescriptor {
    if (
      galaxy.realityClass !==
      "procedural"
    ) {
      throw new Error(
        "Procedural systems require a procedural galaxy.",
      );
    }

    if (
      galaxy.seedKey !==
      this.seed.key
    ) {
      throw new Error(
        "Galaxy seed does not belong to this generator.",
      );
    }

    if (
      !Number.isSafeInteger(
        systemIndex,
      ) ||
      systemIndex <
        0
    ) {
      throw new Error(
        "System index must be a non-negative safe integer.",
      );
    }

    const coordinate =
      galaxy.address
        .sector;

    const random =
      derivedRandom(
        this.seed,
        coordinate,

        "galaxy",

        galaxy.address
          .galaxyIndex ??
          0,

        "system",

        systemIndex,
      );

    let starCount =
      1;

    if (
      random.chance(
        this.profile
          .multiStarRate,
      )
    ) {
      starCount =
        random.chance(
          0.8,
        )
          ? 2
          : random.chance(
                0.85,
              )
            ? 3
            : 4;
    }

    const stars:
      StarDescriptor[] = [];

    for (
      let stellarIndex = 0;
      stellarIndex <
      starCount;
      stellarIndex++
    ) {
      stars.push(
        createStar(
          this.seed,

          galaxy,

          systemIndex,

          stellarIndex,

          this.profile
            .exoticity,

          random.fork(
            `star:${stellarIndex}`,
          ),
        ),
      );
    }

    const count =
      planetCount(
        random.fork(
          "planet-count",
        ),

        this.profile,

        this.budget,
      );

    const orbits =
      planetaryOrbits(
        count,

        random.fork(
          "planet-orbits",
        ),
      );

    const planets:
      PlanetDescriptor[] = [];

    for (
      let planetIndex = 0;
      planetIndex <
      orbits.length;
      planetIndex++
    ) {
      planets.push(
        createPlanet(
          this.seed,

          galaxy,

          systemIndex,

          planetIndex,

          orbits[
            planetIndex
          ] ??
            1,

          stars,

          this.profile,

          this.budget,

          random.fork(
            `planet:${planetIndex}`,
          ),
        ),
      );
    }

    const belts =
      createBelts(
        this.seed,

        galaxy,

        systemIndex,

        planets,

        random.fork(
          "belts",
        ),
      );

    const address:
      ProceduralAddress = {
      sector:
        coordinate,

      galaxyIndex:
        galaxy.address
          .galaxyIndex,

      systemIndex,

      planetIndex:
        null,

      moonIndex:
        null,
    };

    return {
      id:
        proceduralId(
          this.seed,
          "system",
          address,
        ),

      name:
        `${proceduralName(
          random.fork(
            "name",
          ),
        )} System`,

      realityClass:
        "procedural",

      generationVersion:
        PROCEDURAL_ENGINE_VERSION,

      seedKey:
        this.seed.key,

      address,

      kind:
        "star-system",

      galaxyId:
        galaxy.id,

      systemIndex,

      positionLy:
        systemPositionInGalaxy(
          random.fork(
            "position",
          ),

          galaxy,
        ),

      stars,

      planets,

      belts,

      anomalyScore:
        roundTo(
          random.chance(
            this.profile
              .anomalyRate,
          )
            ? random.range(
                0.5,
                1,
              )
            : random.range(
                0,
                0.15,
              ),
          5,
        ),
    };
  }

  systems(
    galaxy:
      GalaxyDescriptor,
    startIndex:
      number,
    count:
      number,
  ):
    readonly StarSystemDescriptor[] {
    if (
      !Number.isSafeInteger(
        startIndex,
      ) ||
      startIndex <
        0
    ) {
      throw new Error(
        "System start index must be a non-negative safe integer.",
      );
    }

    const safeCount =
      Math.min(
        this.budget
          .maximumSystemsPerRequest,

        Math.max(
          0,

          Math.floor(
            count,
          ),
        ),
      );

    const systems:
      StarSystemDescriptor[] = [];

    for (
      let offset = 0;
      offset <
      safeCount;
      offset++
    ) {
      systems.push(
        this.system(
          galaxy,

          startIndex +
          offset,
        ),
      );
    }

    return systems;
  }

  anchor(
    galaxy:
      GalaxyDescriptor,
    systemIndex:
      number,
  ):
    GalaxyAnchor {
    const coordinate =
      galaxy.address
        .sector;

    const random =
      derivedRandom(
        this.seed,

        coordinate,

        "galaxy",

        galaxy.address
          .galaxyIndex ??
          0,

        "system",

        systemIndex,

        "anchor",
      );

    const address:
      ProceduralAddress = {
      sector:
        coordinate,

      galaxyIndex:
        galaxy.address
          .galaxyIndex,

      systemIndex,

      planetIndex:
        null,

      moonIndex:
        null,
    };

    return {
      id:
        proceduralId(
          this.seed,
          "system",
          address,
        ),

      galaxyIndex:
        galaxy.address
          .galaxyIndex ??
        0,

      positionLy:
        systemPositionInGalaxy(
          random,
          galaxy,
        ),
    };
  }

  terrainTile(
    planet: PlanetDescriptor,
    address: TerrainTileAddress,
  ): TerrainTile {
    if (planet.realityClass !== "procedural" || planet.seedKey !== this.seed.key) {
      throw new Error("Terrain requires a planet from this procedural generator.");
    }
    if (
      !Number.isSafeInteger(address.face) || address.face < 0 || address.face > 5 ||
      !Number.isSafeInteger(address.x) || !Number.isSafeInteger(address.y) ||
      !Number.isSafeInteger(address.lod) || address.x < 0 || address.y < 0 || address.lod < 0
    ) {
      throw new Error("Terrain tile address is invalid.");
    }
    const tilesPerFace = 2 ** Math.min(address.lod, 10);
    if (address.x >= tilesPerFace || address.y >= tilesPerFace) {
      throw new Error("Terrain tile coordinates exceed the selected LOD.");
    }
    const resolution = Math.min(64, 4 * 2 ** Math.min(address.lod, 4));
    const count = resolution * resolution;
    const elevations = new Float32Array(count);
    const temperaturesK = new Float32Array(count);
    const moistures = new Float32Array(count);
    const biomes: TerrainBiome[] = [];
    let waterSamples = 0;
    for (let row = 0; row < resolution; row++) {
      for (let column = 0; column < resolution; column++) {
        const u = ((address.x + (column + 0.5) / resolution) / tilesPerFace) * 2 - 1;
        const v = ((address.y + (row + 0.5) / resolution) / tilesPerFace) * 2 - 1;
        const sample = terrainSample(planet, this.seed, address.face, u, v);
        const index = row * resolution + column;
        elevations[index] = sample.elevation;
        temperaturesK[index] = sample.temperatureK;
        moistures[index] = sample.moisture;
        biomes.push(sample.biome);
        if (sample.elevation < -0.18) waterSamples++;
      }
    }
    const weatherSeed = combineHash32(this.seed.words[1], hashString32(planet.id), address.face, address.x, address.y, address.lod);
    return {
      kind: "terrain-tile",
      realityClass: "procedural",
      generationVersion: PROCEDURAL_ENGINE_VERSION,
      seedKey: this.seed.key,
      planetId: planet.id,
      address: { ...address },
      resolution,
      elevations,
      temperaturesK,
      moistures,
      biomes,
      waterFraction: waterSamples / count,
      cloudCover: clamp(planet.atmosphere === "none" ? 0 : 0.18 + hashToUnit(weatherSeed) * 0.62, 0, 1),
      weatherActivity: clamp(planet.atmosphere === "none" ? 0 : hashToUnit(weatherSeed ^ 0x27d4eb2d), 0, 1),
    };
  }
}

export function validateProceduralDescriptor(
  descriptor:
    ProceduralDescriptorBase,
):
  readonly string[] {
  const issues:
    string[] = [];

  if (
    descriptor
      .realityClass !==
    "procedural"
  ) {
    issues.push(
      "Generated descriptor is not marked procedural.",
    );
  }

  if (
    descriptor
      .generationVersion !==
    PROCEDURAL_ENGINE_VERSION
  ) {
    issues.push(
      "Generated descriptor has an unsupported generation version.",
    );
  }

  if (
    !descriptor.seedKey
  ) {
    issues.push(
      "Generated descriptor is missing its seed key.",
    );
  }

  if (
    !descriptor.id.startsWith(
      `${PROCEDURAL_ID_PREFIX}:`,
    )
  ) {
    issues.push(
      "Generated descriptor does not use a procedural ID.",
    );
  }

  return issues;
}

export function proceduralAddressEquals(
  first:
    ProceduralAddress,
  second:
    ProceduralAddress,
): boolean {
  return (
    first.sector.x ===
      second.sector.x &&

    first.sector.y ===
      second.sector.y &&

    first.sector.z ===
      second.sector.z &&

    first.galaxyIndex ===
      second.galaxyIndex &&

    first.systemIndex ===
      second.systemIndex &&

    first.planetIndex ===
      second.planetIndex &&

    first.moonIndex ===
      second.moonIndex
  );
}

export function proceduralSectorKey(
  coordinate:
    SectorCoordinate,
): string {
  return [
    coordinate.x,
    coordinate.y,
    coordinate.z,
  ].join(
    ",",
  );
}

export function parseProceduralSectorKey(
  value:
    string,
):
  SectorCoordinate {
  const parts =
    value.split(
      ",",
    );

  if (
    parts.length !==
    3
  ) {
    throw new Error(
      "Invalid procedural sector key.",
    );
  }

  const x =
    Number(
      parts[0],
    );

  const y =
    Number(
      parts[1],
    );

  const z =
    Number(
      parts[2],
    );

  if (
    !Number.isSafeInteger(
      x,
    ) ||
    !Number.isSafeInteger(
      y,
    ) ||
    !Number.isSafeInteger(
      z,
    )
  ) {
    throw new Error(
      "Procedural sector key contains invalid coordinates.",
    );
  }

  return {
    x,
    y,
    z,
  };
}

export function proceduralGeneratorInfo(
  generator:
    ProceduralUniverseGenerator,
): {
  version:
    number;

  seedKey:
    string;

  seed:
    string;

  preset:
    ProceduralPreset;

  sectorSizeLy:
    number;
} {
  return {
    version:
      PROCEDURAL_ENGINE_VERSION,

    seedKey:
      generator
        .seed
        .key,

    seed:
      generator
        .seed
        .input,

    preset:
      generator
        .profile
        .preset,

    sectorSizeLy:
      generator
        .profile
        .sectorSizeLy,
  };
}