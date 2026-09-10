import { describe, expect, it } from "vitest";

import {
  PROCEDURAL_ENGINE_VERSION,
  PROCEDURAL_PROFILES,
  DeterministicRandom,
  ProceduralUniverseGenerator,
  createProceduralSeed,
  emptyProceduralAddress,
  parseProceduralSectorKey,
  positionToSector,
  proceduralId,
  proceduralSectorKey,
  sectorOriginLy,
  seedFromSerialized,
  serializeProceduralSeed,
  validateProceduralDescriptor,
} from "./procedural";

import type {
  ProceduralAddress,
  SectorCoordinate,
  StarSystemDescriptor,
} from "./procedural";

const ORIGIN: SectorCoordinate = {
  x: 0,
  y: 0,
  z: 0,
};

function allSystemIds(system: StarSystemDescriptor): string[] {
  const ids: string[] = [system.id];

  for (const star of system.stars) {
    ids.push(star.id);
  }

  for (const planet of system.planets) {
    ids.push(planet.id);

    for (const moon of planet.moons) {
      ids.push(moon.id);
    }
  }

  for (const belt of system.belts) {
    ids.push(belt.id);
  }

  return ids;
}

describe("procedural seeds", () => {
  it("creates the same seed from the same input", () => {
    const first = createProceduralSeed("UNIVERSE");

    const second = createProceduralSeed("UNIVERSE");

    expect(first).toEqual(second);

    expect(first.version).toBe(PROCEDURAL_ENGINE_VERSION);

    expect(first.key).toHaveLength(32);
  });

  it("creates different seeds from different input", () => {
    const first = createProceduralSeed("Universe A");

    const second = createProceduralSeed("Universe B");

    expect(first.key).not.toBe(second.key);
  });

  it("round-trips serialized seeds", () => {
    const original = createProceduralSeed("Exploration Seed");

    const serialized = serializeProceduralSeed(original);

    const restored = seedFromSerialized(serialized);

    expect(restored).toEqual(original);
  });

  it("rejects corrupted serialized seeds", () => {
    const seed = createProceduralSeed("Checksum");

    const serialized = serializeProceduralSeed(seed);

    const corrupted = serialized.replace(seed.key, "0".repeat(32));

    expect(() => seedFromSerialized(corrupted)).toThrow();
  });
});

describe("deterministic random", () => {
  it("produces identical sequences from identical state", () => {
    const seed = createProceduralSeed("Random Test");

    const first = new DeterministicRandom(seed.words);

    const second = new DeterministicRandom(seed.words);

    const a = Array.from(
      {
        length: 100,
      },
      () => first.nextUint32(),
    );

    const b = Array.from(
      {
        length: 100,
      },
      () => second.nextUint32(),
    );

    expect(a).toEqual(b);
  });

  it("keeps floating values inside zero and one", () => {
    const random = new DeterministicRandom(
      createProceduralSeed("Range Test").words,
    );

    for (let index = 0; index < 500; index++) {
      const value = random.next();

      expect(value).toBeGreaterThanOrEqual(0);

      expect(value).toBeLessThan(1);
    }
  });

  it("creates deterministic child streams", () => {
    const seed = createProceduralSeed("Fork Test");

    const first = new DeterministicRandom(seed.words).fork("planet");

    const second = new DeterministicRandom(seed.words).fork("planet");

    expect([first.next(), first.next(), first.next()]).toEqual([
      second.next(),
      second.next(),
      second.next(),
    ]);
  });
});

describe("procedural coordinates", () => {
  it("calculates sector origins", () => {
    expect(
      sectorOriginLy(
        {
          x: 2,
          y: -3,
          z: 4,
        },
        100,
      ),
    ).toEqual([200, -300, 400]);
  });

  it("converts positions into sectors", () => {
    expect(positionToSector([250, -1, 399], 100)).toEqual({
      x: 2,
      y: -1,
      z: 3,
    });
  });

  it("round-trips sector keys", () => {
    const coordinate = {
      x: -500,
      y: 12,
      z: 900_000,
    };

    expect(parseProceduralSectorKey(proceduralSectorKey(coordinate))).toEqual(
      coordinate,
    );
  });

  it("rejects invalid sector sizes", () => {
    expect(() => positionToSector([0, 0, 0], 0)).toThrow();
  });
});

describe("procedural IDs", () => {
  it("creates stable IDs from stable addresses", () => {
    const seed = createProceduralSeed("ID Test");

    const address: ProceduralAddress = {
      sector: ORIGIN,

      galaxyIndex: 1,

      systemIndex: 2,

      planetIndex: 3,

      moonIndex: null,
    };

    expect(proceduralId(seed, "planet", address)).toBe(
      proceduralId(seed, "planet", address),
    );
  });

  it("changes IDs when addresses change", () => {
    const seed = createProceduralSeed("ID Difference");

    const first: ProceduralAddress = {
      sector: ORIGIN,

      galaxyIndex: 0,

      systemIndex: 0,

      planetIndex: 0,

      moonIndex: null,
    };

    const second: ProceduralAddress = {
      ...first,

      planetIndex: 1,
    };

    expect(proceduralId(seed, "planet", first)).not.toBe(
      proceduralId(seed, "planet", second),
    );
  });

  it("creates empty sector addresses", () => {
    const address = emptyProceduralAddress(ORIGIN);

    expect(address.galaxyIndex).toBeNull();

    expect(address.systemIndex).toBeNull();

    expect(address.planetIndex).toBeNull();

    expect(address.moonIndex).toBeNull();
  });
});

describe("procedural universe generation", () => {
  it("generates identical sectors from the same seed", () => {
    const generator = new ProceduralUniverseGenerator("Stable Universe");

    const first = generator.sector({
      x: 10,
      y: -5,
      z: 2,
    });

    const second = generator.sector({
      x: 10,
      y: -5,
      z: 2,
    });

    expect(first).toEqual(second);
  });

  it("changes generated content when the seed changes", () => {
    const first = new ProceduralUniverseGenerator("Universe One");

    const second = new ProceduralUniverseGenerator("Universe Two");

    expect(first.galaxy(ORIGIN, 0)).not.toEqual(second.galaxy(ORIGIN, 0));
  });

  it("generates stable galaxies", () => {
    const generator = new ProceduralUniverseGenerator("Galaxy Test");

    expect(generator.galaxy(ORIGIN, 7)).toEqual(generator.galaxy(ORIGIN, 7));
  });

  it("generates stable star systems", () => {
    const generator = new ProceduralUniverseGenerator("System Test");

    const galaxy = generator.galaxy(ORIGIN, 0);

    expect(generator.system(galaxy, 123)).toEqual(
      generator.system(galaxy, 123),
    );
  });

  it("always creates at least one star", () => {
    const generator = new ProceduralUniverseGenerator("Star Test");

    const galaxy = generator.galaxy(ORIGIN, 0);

    for (let index = 0; index < 100; index++) {
      expect(
        generator.system(galaxy, index).stars.length,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("respects planet and moon generation budgets", () => {
    const generator = new ProceduralUniverseGenerator(
      "Budget Test",
      "exotic-sandbox",
      {
        maximumPlanetsPerSystem: 3,

        maximumMoonsPerPlanet: 2,
      },
    );

    const galaxy = generator.galaxy(ORIGIN, 0);

    for (let index = 0; index < 100; index++) {
      const system = generator.system(galaxy, index);

      expect(system.planets.length).toBeLessThanOrEqual(3);

      for (const planet of system.planets) {
        expect(planet.moons.length).toBeLessThanOrEqual(2);
      }
    }
  });

  it("normalizes non-integer generation budgets", () => {
    const generator = new ProceduralUniverseGenerator(
      "Budget Normalization",
      "standard",
      {
        maximumGalaxies: 7.9,
        maximumSystemsPerRequest: 33.4,
        maximumPlanetsPerSystem: 5.7,
        maximumMoonsPerPlanet: 2.2,
      },
    );

    expect(generator.budget.maximumGalaxies).toBe(7);
    expect(generator.budget.maximumSystemsPerRequest).toBe(33);
    expect(generator.budget.maximumPlanetsPerSystem).toBe(5);
    expect(generator.budget.maximumMoonsPerPlanet).toBe(2);
  });

  it("marks all generated content as procedural", () => {
    const generator = new ProceduralUniverseGenerator(
      "Reality Boundary",
      "exotic-sandbox",
    );

    const galaxy = generator.galaxy(ORIGIN, 0);

    expect(galaxy.realityClass).toBe("procedural");

    for (let index = 0; index < 50; index++) {
      const system = generator.system(galaxy, index);

      expect(system.realityClass).toBe("procedural");

      for (const star of system.stars) {
        expect(star.realityClass).toBe("procedural");
      }

      for (const planet of system.planets) {
        expect(planet.realityClass).toBe("procedural");

        for (const moon of planet.moons) {
          expect(moon.realityClass).toBe("procedural");
        }
      }
    }
  });

  it("creates unique IDs inside generated systems", () => {
    const generator = new ProceduralUniverseGenerator(
      "Unique IDs",
      "exotic-sandbox",
    );

    const galaxy = generator.galaxy(ORIGIN, 0);

    for (let index = 0; index < 50; index++) {
      const ids = allSystemIds(generator.system(galaxy, index));

      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("keeps generated planet values finite and positive", () => {
    const generator = new ProceduralUniverseGenerator(
      "Physics Test",
      "exotic-sandbox",
    );

    const galaxy = generator.galaxy(ORIGIN, 0);

    for (let systemIndex = 0; systemIndex < 100; systemIndex++) {
      const system = generator.system(galaxy, systemIndex);

      for (const planet of system.planets) {
        expect(Number.isFinite(planet.massEarth)).toBe(true);

        expect(Number.isFinite(planet.radiusEarth)).toBe(true);

        expect(Number.isFinite(planet.orbitalPeriodDays)).toBe(true);

        expect(planet.massEarth).toBeGreaterThan(0);

        expect(planet.radiusEarth).toBeGreaterThan(0);

        expect(planet.semiMajorAxisAu).toBeGreaterThan(0);
      }
    }
  });

  it("supports very distant sectors deterministically", () => {
    const generator = new ProceduralUniverseGenerator("Distant Universe");

    const coordinate = {
      x: 5_000_000,

      y: -7_000_000,

      z: 9_000_000,
    };

    expect(generator.sector(coordinate)).toEqual(generator.sector(coordinate));
  });

  it("biases giant planets toward colder outer orbits", () => {
    const generator = new ProceduralUniverseGenerator(
      "Outer Orbit Giants",
      "dense-galaxies",
      { maximumPlanetsPerSystem: 24 },
    );
    const galaxy = generator.galaxy(ORIGIN, 0);

    let innerCount = 0;
    let innerGiants = 0;
    let outerCount = 0;
    let outerGiants = 0;

    for (let systemIndex = 0; systemIndex < 320; systemIndex++) {
      const system = generator.system(galaxy, systemIndex);

      for (const planet of system.planets) {
        const giant =
          planet.planetClass === "gas-giant" ||
          planet.planetClass === "ice-giant";

        if (planet.semiMajorAxisAu < 0.8) {
          innerCount++;
          if (giant) {
            innerGiants++;
          }
        }

        if (planet.semiMajorAxisAu > 5) {
          outerCount++;
          if (giant) {
            outerGiants++;
          }
        }
      }
    }

    expect(innerCount).toBeGreaterThan(0);
    expect(outerCount).toBeGreaterThan(0);
    expect(outerGiants / outerCount).toBeGreaterThan(innerGiants / innerCount);
  });

  it("rejects invalid galaxy indexes", () => {
    const generator = new ProceduralUniverseGenerator("Invalid Index");

    expect(() => generator.galaxy(ORIGIN, -1)).toThrow();

    expect(() => generator.galaxy(ORIGIN, 1.5)).toThrow();
  });
});

describe("procedural profiles", () => {
  it("keeps dense galaxies denser than standard", () => {
    expect(PROCEDURAL_PROFILES["dense-galaxies"].galaxyDensity).toBeGreaterThan(
      PROCEDURAL_PROFILES.standard.galaxyDensity,
    );
  });

  it("keeps sparse universe less dense than standard", () => {
    expect(PROCEDURAL_PROFILES["sparse-universe"].galaxyDensity).toBeLessThan(
      PROCEDURAL_PROFILES.standard.galaxyDensity,
    );
  });

  it("makes exotic sandbox the most exotic preset", () => {
    const exotic = PROCEDURAL_PROFILES["exotic-sandbox"].exoticity;

    expect(exotic).toBeGreaterThan(PROCEDURAL_PROFILES.standard.exoticity);

    expect(exotic).toBeGreaterThan(
      PROCEDURAL_PROFILES["dense-galaxies"].exoticity,
    );

    expect(exotic).toBeGreaterThan(
      PROCEDURAL_PROFILES["sparse-universe"].exoticity,
    );
  });
});

describe("descriptor validation", () => {
  it("accepts correctly generated descriptors", () => {
    const generator = new ProceduralUniverseGenerator("Validation Test");

    const galaxy = generator.galaxy(ORIGIN, 0);

    expect(validateProceduralDescriptor(galaxy)).toHaveLength(0);
  });
});
