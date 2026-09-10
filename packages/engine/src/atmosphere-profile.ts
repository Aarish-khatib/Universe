/* ============================================================
   atmosphere-profile.ts  v1
   Derives cinematic atmosphere render parameters from a planet
   descriptor (planet class, atmosphere class, equilibrium temp,
   water fraction, life potential).  No three.js dependency —
   pure data that the renderer consumes.
   ============================================================ */

export const ATMOSPHERE_PROFILE_VERSION = 1;

export interface AtmosphereRenderProfile {
  /* Is there a visible haze shell around this body? */
  hasAtmosphere: boolean;

  /* Dominant sky colour at zenith (linear sRGB) */
  skyColor: readonly [number, number, number];

  /* Horizon / scattering fringe colour (linear sRGB) */
  horizonColor: readonly [number, number, number];

  /* How far the atmosphere haze shell extends above surface (0-1, 1 = thick) */
  thickness: number;

  /* Mie scattering intensity — higher = milkier limb */
  mieStrength: number;

  /* Rayleigh scattering intensity */
  rayleighStrength: number;

  /* Cloud coverage fraction (0-1) */
  cloudCoverage: number;

  /* Cloud colour (linear sRGB, typically white/grey) */
  cloudColor: readonly [number, number, number];

  /* Is this world potentially habitable? Drives lush palette. */
  isLush: boolean;

  /* Glow tint visible from far distance (limb colour) */
  limbTint: readonly [number, number, number];

  /* Surface base albedo hint for shading */
  surfaceAlbedo: readonly [number, number, number];
}

type AtmosphereClass =
  | "none"
  | "trace"
  | "thin"
  | "earthlike-simulation"
  | "dense"
  | "hydrogen-rich"
  | "toxic-simulation";

type PlanetClass =
  | "rocky" | "super-earth" | "sub-neptune" | "ice-giant"
  | "gas-giant" | "dwarf" | "lava" | "ocean" | "ice";

type LifePotential = "none" | "low" | "moderate" | "high";

interface PlanetInput {
  planetClass: PlanetClass;
  atmosphere: AtmosphereClass;
  equilibriumTemperatureK: number;
  waterFraction: number;
  lifePotential: LifePotential;
}

const VOID: readonly [number, number, number] = [0, 0, 0];

function rgb(r: number, g: number, b: number): readonly [number, number, number] {
  return [r, g, b];
}

function lerp3(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
): readonly [number, number, number] {
  const c = Math.max(0, Math.min(1, t));
  return [a[0] + (b[0] - a[0]) * c, a[1] + (b[1] - a[1]) * c, a[2] + (b[2] - a[2]) * c];
}

export function deriveAtmosphereProfile(planet: PlanetInput): AtmosphereRenderProfile {
  const { planetClass, atmosphere, equilibriumTemperatureK, waterFraction, lifePotential } = planet;
  const tempK = equilibriumTemperatureK;
  const isIcy = tempK < 200;
  const isHot = tempK > 600;
  const isLush = lifePotential === "high" || lifePotential === "moderate";
  const hasWater = waterFraction > 0.1;

  if (atmosphere === "none") {
    const surfaceAlbedo: readonly [number, number, number] =
      planetClass === "lava"   ? rgb(0.35, 0.12, 0.06) :
      planetClass === "ice"    ? rgb(0.82, 0.88, 0.95) :
      planetClass === "rocky"  ? rgb(0.28, 0.24, 0.20) :
                                  rgb(0.30, 0.25, 0.22);
    return {
      hasAtmosphere: false, skyColor: VOID, horizonColor: VOID,
      thickness: 0, mieStrength: 0, rayleighStrength: 0,
      cloudCoverage: 0, cloudColor: rgb(1, 1, 1),
      isLush: false, limbTint: VOID, surfaceAlbedo,
    };
  }

  // Base sky colours per atmosphere type
  let skyColor: readonly [number, number, number];
  let horizonColor: readonly [number, number, number];
  let thickness: number;
  let mie: number;
  let rayleigh: number;
  let clouds: number;
  let limbTint: readonly [number, number, number];

  switch (atmosphere) {
    case "trace":
      skyColor = planetClass === "ice" ? rgb(0.52, 0.70, 0.88) : rgb(0.35, 0.28, 0.22);
      horizonColor = rgb(0.70, 0.45, 0.30);
      thickness = 0.08; mie = 0.12; rayleigh = 0.08; clouds = 0.02;
      limbTint = rgb(0.55, 0.35, 0.20);
      break;
    case "thin":
      skyColor = isIcy ? rgb(0.55, 0.72, 0.90) : rgb(0.55, 0.60, 0.70);
      horizonColor = isIcy ? rgb(0.80, 0.88, 0.95) : rgb(0.78, 0.65, 0.50);
      thickness = 0.18; mie = 0.22; rayleigh = 0.20; clouds = 0.15;
      limbTint = isIcy ? rgb(0.70, 0.84, 0.96) : rgb(0.68, 0.62, 0.52);
      break;
    case "earthlike-simulation":
      skyColor = isLush && hasWater ? rgb(0.22, 0.48, 0.82) : rgb(0.40, 0.55, 0.75);
      horizonColor = isLush ? rgb(0.68, 0.78, 0.62) : rgb(0.72, 0.68, 0.58);
      thickness = 0.32; mie = 0.30; rayleigh = 0.55; clouds = isLush ? 0.45 : 0.30;
      limbTint = rgb(0.42, 0.65, 0.90);
      break;
    case "dense":
      skyColor = isHot ? rgb(0.72, 0.52, 0.18) : rgb(0.52, 0.60, 0.72);
      horizonColor = isHot ? rgb(0.90, 0.65, 0.28) : rgb(0.68, 0.72, 0.80);
      thickness = 0.60; mie = 0.65; rayleigh = 0.38; clouds = 0.75;
      limbTint = isHot ? rgb(0.85, 0.60, 0.22) : rgb(0.55, 0.68, 0.82);
      break;
    case "hydrogen-rich":
      skyColor = rgb(0.70, 0.72, 0.88);
      horizonColor = rgb(0.78, 0.80, 0.95);
      thickness = 0.80; mie = 0.72; rayleigh = 0.62; clouds = 0.88;
      limbTint = rgb(0.72, 0.78, 0.95);
      break;
    case "toxic-simulation":
      skyColor = rgb(0.55, 0.62, 0.28);
      horizonColor = rgb(0.72, 0.75, 0.42);
      thickness = 0.45; mie = 0.58; rayleigh = 0.35; clouds = 0.60;
      limbTint = rgb(0.60, 0.68, 0.35);
      break;
    default:
      skyColor = rgb(0.4, 0.5, 0.6); horizonColor = rgb(0.6, 0.6, 0.6);
      thickness = 0.25; mie = 0.25; rayleigh = 0.30; clouds = 0.20;
      limbTint = rgb(0.5, 0.6, 0.7);
  }

  // Apply life potential warmth
  if (isLush) {
    skyColor = lerp3(skyColor, rgb(0.20, 0.45, 0.80), 0.15);
    clouds = Math.min(1, clouds + 0.10);
  }

  const surfaceAlbedo: readonly [number, number, number] =
    planetClass === "lava"       ? rgb(0.25, 0.10, 0.05) :
    planetClass === "ice"        ? rgb(0.85, 0.90, 0.98) :
    planetClass === "ocean"      ? rgb(0.10, 0.25, 0.50) :
    planetClass === "gas-giant"  ? rgb(0.78, 0.72, 0.62) :
    planetClass === "ice-giant"  ? rgb(0.50, 0.68, 0.82) :
    isLush && hasWater           ? rgb(0.12, 0.35, 0.18) :
                                   rgb(0.35, 0.30, 0.26);

  return {
    hasAtmosphere: true,
    skyColor,
    horizonColor,
    thickness,
    mieStrength: mie,
    rayleighStrength: rayleigh,
    cloudCoverage: clouds,
    cloudColor: isHot ? rgb(0.90, 0.82, 0.68) : rgb(0.94, 0.94, 0.96),
    isLush,
    limbTint,
    surfaceAlbedo,
  };
}
