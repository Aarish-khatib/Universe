import { METERS_PER_UNIT } from "@known-universe/core";

import type {
  EntityId,
  PhysicalProperties,
  SpaceEntity,
  Vec3,
} from "@known-universe/core";

import type {
  AsteroidBeltDescriptor,
  GalaxyDescriptor,
  MoonDescriptor,
  PlanetDescriptor,
  ProceduralSector,
  StarDescriptor,
  StarSystemDescriptor,
} from "./procedural";

import type { WorldStreamEvent, WorldStreamManager } from "./world-stream";

export const PROCEDURAL_ENTITY_FRAME = "solar-system:heliocentric";
export const PROCEDURAL_SOURCE_PREFIX = "procedural:";

const EARTH_MASS_KG = 5.9722e24;
const EARTH_RADIUS_M = 6.371e6;
const SOLAR_MASS_KG = 1.98847e30;
const SOLAR_RADIUS_M = 6.957e8;

export interface ProceduralEntityProjectionOptions {
  frameId?: string;
  epochJulianDay?: number;
}

export interface ProceduralEntityProjection {
  entities: readonly SpaceEntity[];
  ids: readonly EntityId[];
}

export interface ProceduralEntitySink {
  upsertEntities(entities: readonly SpaceEntity[]): void;
  removeEntity(id: EntityId): void;
}

function sourceId(id: EntityId): string {
  return `${PROCEDURAL_SOURCE_PREFIX}${id}`;
}

function tags(...values: string[]): readonly string[] {
  return ["procedural", "simulated", "estimated", ...values];
}

function positionInAu(positionLy: Vec3, localAu: Vec3 = [0, 0, 0]): Vec3 {
  const lyInAu = METERS_PER_UNIT.ly / METERS_PER_UNIT.au;

  return [
    positionLy[0] * lyInAu + localAu[0],
    positionLy[1] * lyInAu + localAu[1],
    positionLy[2] * lyInAu + localAu[2],
  ];
}

function physical(
  values: Partial<PhysicalProperties>,
): PhysicalProperties {
  return values;
}

function baseEntity(
  id: EntityId,
  name: string,
  kind: SpaceEntity["kind"],
  summary: string,
  options: ProceduralEntityProjectionOptions,
): SpaceEntity {
  return {
    id,
    name,
    kind,
    summary,
    tags: tags(kind),
    sourceIds: [sourceId(id)],
    spatial: {
      frameId: options.frameId ?? PROCEDURAL_ENTITY_FRAME,
      position: [0, 0, 0],
      unit: "au",
    },
  };
}

function withPosition(
  entity: SpaceEntity,
  position: Vec3,
): SpaceEntity {
  return {
    ...entity,
    spatial: {
      ...entity.spatial,
      frameId: entity.spatial?.frameId ?? PROCEDURAL_ENTITY_FRAME,
      position,
      unit: "au",
    },
  };
}

function projectGalaxy(
  galaxy: GalaxyDescriptor,
  options: ProceduralEntityProjectionOptions,
): SpaceEntity {
  return withPosition(
    {
      ...baseEntity(
        galaxy.id,
        galaxy.name,
        "galaxy",
        `${galaxy.morphology} galaxy; simulated stellar population estimate.`,
        options,
      ),
      physical: physical({
        massKg: {
          value: galaxy.stellarMassSolar * SOLAR_MASS_KG,
          evidence: "estimated",
          sourceIds: [sourceId(galaxy.id)],
        },
      }),
    },
    positionInAu(galaxy.positionLy),
  );
}

function projectStar(
  star: StarDescriptor,
  system: StarSystemDescriptor,
  options: ProceduralEntityProjectionOptions,
): SpaceEntity {
  return withPosition(
    {
      ...baseEntity(
        star.id,
        star.name,
        "star",
        `${star.stellarClass}-class simulated star in a procedural system.`,
        options,
      ),
      parentId: system.id,
      physical: physical({
        massKg: {
          value: star.massSolar * SOLAR_MASS_KG,
          evidence: "estimated",
          sourceIds: [sourceId(star.id)],
        },
        radiusM: {
          value: star.radiusSolar * SOLAR_RADIUS_M,
          evidence: "estimated",
          sourceIds: [sourceId(star.id)],
        },
        temperatureK: {
          value: star.temperatureK,
          evidence: "estimated",
          sourceIds: [sourceId(star.id)],
        },
      }),
    },
    positionInAu(system.positionLy, star.localPositionAu),
  );
}

function orbitPosition(radiusAu: number, index: number): Vec3 {
  const angle = index * 2.399963229728653;
  return [radiusAu * Math.cos(angle), 0, radiusAu * Math.sin(angle)];
}

function projectPlanet(
  planet: PlanetDescriptor,
  system: StarSystemDescriptor,
  options: ProceduralEntityProjectionOptions,
): SpaceEntity {
  const kind = planet.planetClass === "dwarf" ? "dwarf-planet" : "planet";

  return withPosition(
    {
      ...baseEntity(
        planet.id,
        planet.name,
        kind,
        `${planet.planetClass} world with a ${planet.atmosphere} simulated atmosphere.`,
        options,
      ),
      parentId: system.id,
      physical: physical({
        radiusM: {
          value: planet.radiusEarth * EARTH_RADIUS_M,
          evidence: "estimated",
          sourceIds: [sourceId(planet.id)],
        },
        massKg: {
          value: planet.massEarth * EARTH_MASS_KG,
          evidence: "estimated",
          sourceIds: [sourceId(planet.id)],
        },
        densityKgM3: {
          value: planet.densityKgM3,
          evidence: "estimated",
          sourceIds: [sourceId(planet.id)],
        },
        surfaceGravityMs2: {
          value: planet.surfaceGravityEarth * 9.80665,
          evidence: "derived",
          sourceIds: [sourceId(planet.id)],
        },
      }),
      orbit: {
        semiMajorAxisM: planet.semiMajorAxisAu * METERS_PER_UNIT.au,
        eccentricity: planet.eccentricity,
        inclinationDeg: planet.inclinationDeg,
        ...(options.epochJulianDay === undefined
          ? {}
          : { epochJulianDay: options.epochJulianDay }),
      },
    },
    positionInAu(system.positionLy, orbitPosition(planet.semiMajorAxisAu, planet.planetIndex)),
  );
}

function projectMoon(
  moon: MoonDescriptor,
  planet: PlanetDescriptor,
  system: StarSystemDescriptor,
  options: ProceduralEntityProjectionOptions,
): SpaceEntity {
  const planetPosition = orbitPosition(planet.semiMajorAxisAu, planet.planetIndex);
  const moonPosition = orbitPosition(moon.semiMajorAxisKm / 149_597_870.7, moon.moonIndex);

  return withPosition(
    {
      ...baseEntity(
        moon.id,
        moon.name,
        "moon",
        `${moon.surface} simulated moon orbiting ${planet.name}.`,
        options,
      ),
      parentId: planet.id,
      physical: physical({
        radiusM: {
          value: moon.radiusEarth * EARTH_RADIUS_M,
          evidence: "estimated",
          sourceIds: [sourceId(moon.id)],
        },
        massKg: {
          value: moon.massEarth * EARTH_MASS_KG,
          evidence: "estimated",
          sourceIds: [sourceId(moon.id)],
        },
        densityKgM3: {
          value: moon.densityKgM3,
          evidence: "estimated",
          sourceIds: [sourceId(moon.id)],
        },
      }),
      orbit: {
        semiMajorAxisM: moon.semiMajorAxisKm * 1_000,
        eccentricity: moon.eccentricity,
        inclinationDeg: moon.inclinationDeg,
        ...(options.epochJulianDay === undefined
          ? {}
          : { epochJulianDay: options.epochJulianDay }),
      },
    },
    positionInAu(system.positionLy, [
      planetPosition[0] + moonPosition[0],
      planetPosition[1] + moonPosition[1],
      planetPosition[2] + moonPosition[2],
    ]),
  );
}

function projectBelt(
  belt: AsteroidBeltDescriptor,
  system: StarSystemDescriptor,
  options: ProceduralEntityProjectionOptions,
): SpaceEntity {
  return withPosition(
    {
      ...baseEntity(
        belt.id,
        belt.name,
        "asteroid",
        "Simulated asteroid belt with estimated density and icy fraction.",
        options,
      ),
      parentId: system.id,
      orbit: {
        semiMajorAxisM: ((belt.innerRadiusAu + belt.outerRadiusAu) / 2) * METERS_PER_UNIT.au,
      },
    },
    positionInAu(system.positionLy),
  );
}

export function projectProceduralGalaxy(
  galaxy: GalaxyDescriptor,
  options: ProceduralEntityProjectionOptions = {},
): SpaceEntity {
  return projectGalaxy(galaxy, options);
}

export function projectProceduralSector(
  sector: ProceduralSector,
  options: ProceduralEntityProjectionOptions = {},
): ProceduralEntityProjection {
  const entities = sector.galaxies.map(galaxy => projectGalaxy(galaxy, options));

  return {
    entities,
    ids: entities.map(entity => entity.id),
  };
}

export function projectProceduralSystem(
  system: StarSystemDescriptor,
  options: ProceduralEntityProjectionOptions = {},
): ProceduralEntityProjection {
  const entities: SpaceEntity[] = [];

  for (const star of system.stars) {
    entities.push(projectStar(star, system, options));
  }

  for (const planet of system.planets) {
    entities.push(projectPlanet(planet, system, options));

    for (const moon of planet.moons) {
      entities.push(projectMoon(moon, planet, system, options));
    }
  }

  for (const belt of system.belts) {
    entities.push(projectBelt(belt, system, options));
  }

  return {
    entities,
    ids: entities.map(entity => entity.id),
  };
}

export class ProceduralEntityBridge {
  private readonly unsubscribeStream: () => void;
  private readonly sectorIds = new Map<string, readonly EntityId[]>();
  private readonly systemIds = new Map<string, readonly EntityId[]>();

  constructor(
    private readonly stream: WorldStreamManager,
    private readonly sink: ProceduralEntitySink,
    private readonly options: ProceduralEntityProjectionOptions = {},
  ) {
    this.unsubscribeStream = stream.subscribe(event => this.handle(event));
  }

  dispose(): void {
    this.unsubscribeStream();
    this.sectorIds.clear();
    this.systemIds.clear();
  }

  private handle(event: WorldStreamEvent): void {
    if (event.type === "sector-ready") {
      const projection = projectProceduralSector(event.sector, this.options);
      this.sectorIds.set(event.key, projection.ids);
      this.sink.upsertEntities(projection.entities);
      return;
    }

    if (event.type === "system-ready") {
      const projection = projectProceduralSystem(event.system, this.options);
      this.systemIds.set(event.key, projection.ids);
      this.sink.upsertEntities(projection.entities);
      return;
    }

    if (event.type === "sector-evicted") {
      for (const id of this.sectorIds.get(event.key) ?? []) {
        this.sink.removeEntity(id);
      }
      this.sectorIds.delete(event.key);
      return;
    }

    if (event.type === "system-evicted") {
      for (const id of this.systemIds.get(event.key) ?? []) {
        this.sink.removeEntity(id);
      }
      this.systemIds.delete(event.key);
    }
  }
}