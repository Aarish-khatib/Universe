/* ============================================================
   anomaly-generator.ts  v1
   Deterministic anomaly scoring and classification.
   Called by the procedural generator to flag rare / interesting
   systems that the UI should surface with special treatment.
   ============================================================ */

export const ANOMALY_GENERATOR_VERSION = 1;

export type AnomalyClass =
  | "binary-star"
  | "trinary-star"
  | "hot-jupiter"
  | "ocean-world"
  | "lava-world"
  | "diamond-world"
  | "life-candidate"
  | "rogue-moon"
  | "tight-multi-planet"
  | "giant-gas-system"
  | "void-system"
  | "pulsar-like"
  | "binary-twin-planets";

export interface AnomalyResult {
  score: number;
  classes: readonly AnomalyClass[];
  label: string;
  description: string;
}

interface StarLike { stellarClass: string; }
interface PlanetLike {
  planetClass: string;
  semiMajorAxisAu: number;
  equilibriumTemperatureK: number;
  waterFraction: number;
  lifePotential: string;
  atmosphere: string;
  radiusEarth: number;
}
interface SystemLike {
  stars: readonly StarLike[];
  planets: readonly PlanetLike[];
  anomalyScore: number;
}

export function classifyAnomalies(system: SystemLike): AnomalyResult {
  const classes: AnomalyClass[] = [];
  let score = system.anomalyScore;

  // Multi-star
  if (system.stars.length === 2) { classes.push("binary-star"); score += 0.18; }
  if (system.stars.length >= 3) { classes.push("trinary-star"); score += 0.35; }

  // Pulsar-like (rare O/B star solo system)
  if (system.stars.length === 1 && system.stars[0] && "OB".includes(system.stars[0].stellarClass)) {
    classes.push("pulsar-like"); score += 0.22;
  }

  for (const p of system.planets) {
    // Hot Jupiter
    if ((p.planetClass === "gas-giant" || p.planetClass === "sub-neptune") &&
        p.semiMajorAxisAu < 0.12) {
      classes.push("hot-jupiter"); score += 0.20;
    }

    // Ocean world
    if (p.planetClass === "ocean" && p.waterFraction > 0.7) {
      classes.push("ocean-world"); score += 0.25;
    }

    // Lava world
    if (p.planetClass === "lava" && p.equilibriumTemperatureK > 1200) {
      classes.push("lava-world"); score += 0.20;
    }

    // Life candidate
    if ((p.lifePotential === "high" || p.lifePotential === "moderate") &&
        p.atmosphere === "earthlike-simulation") {
      classes.push("life-candidate"); score += 0.40;
    }

    // Diamond world (high-density super-earth, very dry)
    if (p.planetClass === "super-earth" && p.radiusEarth < 1.6 && p.waterFraction < 0.02) {
      classes.push("diamond-world"); score += 0.15;
    }
  }

  // Tight multi-planet (≥ 4 planets inside 1 AU)
  const tight = system.planets.filter(p => p.semiMajorAxisAu < 1.0).length;
  if (tight >= 4) { classes.push("tight-multi-planet"); score += 0.28; }

  // Giant gas system (≥ 3 gas giants)
  const gasCount = system.planets.filter(p => p.planetClass === "gas-giant").length;
  if (gasCount >= 3) { classes.push("giant-gas-system"); score += 0.22; }

  // Void system (star only, no planets)
  if (system.planets.length === 0) { classes.push("void-system"); score += 0.08; }

  // Binary twin planets (two similar-mass planets in close orbits)
  for (let i = 0; i < system.planets.length - 1; i++) {
    const a = system.planets[i];
    const b = system.planets[i + 1];
    if (a && b) {
      const massDiff = Math.abs(a.radiusEarth - b.radiusEarth);
      const orbitDiff = Math.abs(a.semiMajorAxisAu - b.semiMajorAxisAu);
      if (massDiff < 0.12 && orbitDiff < 0.08) {
        classes.push("binary-twin-planets"); score += 0.18; break;
      }
    }
  }

  const uniqueClasses = [...new Set(classes)];
  const clamped = Math.min(1, score);

  return {
    score: clamped,
    classes: uniqueClasses,
    label: buildLabel(uniqueClasses, clamped),
    description: buildDescription(uniqueClasses),
  };
}

function buildLabel(classes: readonly AnomalyClass[], score: number): string {
  if (classes.includes("life-candidate")) return "Life Candidate";
  if (classes.includes("trinary-star")) return "Trinary System";
  if (classes.includes("binary-star") && classes.includes("hot-jupiter")) return "Hot Binary";
  if (classes.includes("ocean-world")) return "Ocean World";
  if (classes.includes("lava-world")) return "Inferno World";
  if (classes.includes("pulsar-like")) return "High-Energy Star";
  if (classes.includes("tight-multi-planet")) return "Compact System";
  if (classes.includes("giant-gas-system")) return "Gas Giant Archive";
  if (classes.includes("binary-star")) return "Binary System";
  if (classes.includes("hot-jupiter")) return "Hot Jupiter";
  if (classes.includes("diamond-world")) return "Diamond World";
  if (score > 0.5) return "Anomalous System";
  return "Unremarkable System";
}

function buildDescription(classes: readonly AnomalyClass[]): string {
  if (classes.includes("life-candidate"))
    return "Spectral and atmospheric data consistent with liquid-water habitability.";
  if (classes.includes("trinary-star"))
    return "Three-star gravitational complex — chaotic, rare, spectacular.";
  if (classes.includes("ocean-world"))
    return "Surface dominated by liquid water. Oceanic world.";
  if (classes.includes("lava-world"))
    return "Extreme volcanic activity. Surface temperature incompatible with life.";
  if (classes.includes("pulsar-like"))
    return "High-mass, high-luminosity host star. Intense radiation environment.";
  if (classes.includes("tight-multi-planet"))
    return "Four or more planets within one AU. Tidal interactions significant.";
  if (classes.includes("binary-star"))
    return "Two gravitationally bound stars. Unusual orbital dynamics for planets.";
  if (classes.includes("hot-jupiter"))
    return "Gas giant orbiting extremely close to its host star.";
  if (classes.includes("diamond-world"))
    return "Dense, dry super-Earth. High-pressure carbon interior possible.";
  return "Procedurally generated system. Characteristics within expected parameters.";
}
