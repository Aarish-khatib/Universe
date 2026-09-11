/* ============================================================
   atmospheric-entry.ts  v1
   Manages the visual + physical state of atmospheric entry.
   Drives: entry glow intensity, screen tint, turbulence,
   deceleration curve, altitude display, and transition to
   "surface approach" mode.

   Pure logic — renderer reads these values each frame.
   ============================================================ */

export const ATMOSPHERIC_ENTRY_VERSION = 1;

export type EntryPhase =
  | "space"           // Outside atmosphere entirely
  | "upper-atmosphere"// Entry begins — glow starts
  | "mesosphere"      // Plasma glow peak
  | "stratosphere"    // Glow fading, clouds approaching
  | "troposphere"     // Full cloud cover, turbulence
  | "low-altitude"    // Below cloud layer, surface visible
  | "surface";        // Near surface

export interface AtmosphericEntryState {
  phase: EntryPhase;
  altitudeM: number;
  atmosphereThickness: number; // 0-1 from profile
  entryGlowIntensity: number;  // 0-1, peaks at mesosphere
  screenTintColor: readonly [number, number, number]; // linear sRGB
  screenTintAlpha: number;     // 0-1
  turbulenceStrength: number;  // 0-1
  cloudOpacity: number;        // 0-1
  fogDensity: number;          // 0-1
  decelerationFactor: number;  // 1 = no decel, 0 = full stop
  isInAtmosphere: boolean;
  surfaceApproach: boolean;    // < 10km
}

export interface PlanetAtmosphereProfile {
  hasAtmosphere: boolean;
  thicknessM: number;       // Atmosphere shell height in meters
  cloudLayerM: number;      // Cloud top altitude in meters
  skyColor: readonly [number, number, number];
  horizonColor: readonly [number, number, number];
  entryGlowColor: readonly [number, number, number]; // Plasma color
  turbulenceStrength: number;
  radiusM: number;
}

export const DEFAULT_EARTHLIKE_PROFILE: PlanetAtmosphereProfile = {
  hasAtmosphere: true,
  thicknessM: 100_000,
  cloudLayerM: 8_000,
  skyColor: [0.22, 0.48, 0.82],
  horizonColor: [0.68, 0.78, 0.62],
  entryGlowColor: [1.0, 0.45, 0.12],
  turbulenceStrength: 0.6,
  radiusM: 6_371_000,
};

export const AIRLESS_PROFILE: PlanetAtmosphereProfile = {
  hasAtmosphere: false,
  thicknessM: 0,
  cloudLayerM: 0,
  skyColor: [0, 0, 0],
  horizonColor: [0, 0, 0],
  entryGlowColor: [0, 0, 0],
  turbulenceStrength: 0,
  radiusM: 1_000_000,
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function lerp3(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
): readonly [number, number, number] {
  const c = Math.max(0, Math.min(1, t));
  return [a[0] + (b[0] - a[0]) * c, a[1] + (b[1] - a[1]) * c, a[2] + (b[2] - a[2]) * c];
}

export function computeAtmosphericEntry(
  altitudeM: number,
  speedMs: number,
  profile: PlanetAtmosphereProfile,
): AtmosphericEntryState {
  if (!profile.hasAtmosphere || altitudeM > profile.thicknessM) {
    return {
      phase: "space",
      altitudeM,
      atmosphereThickness: profile.thicknessM,
      entryGlowIntensity: 0,
      screenTintColor: [0, 0, 0],
      screenTintAlpha: 0,
      turbulenceStrength: 0,
      cloudOpacity: 0,
      fogDensity: 0,
      decelerationFactor: 1,
      isInAtmosphere: false,
      surfaceApproach: false,
    };
  }

  const normalized = Math.max(0, Math.min(1, altitudeM / profile.thicknessM));
  const speedFactor = Math.min(1, speedMs / 8_000); // Orbital velocity reference

  // Phase determination
  let phase: EntryPhase;
  if (normalized > 0.85) phase = "upper-atmosphere";
  else if (normalized > 0.65) phase = "mesosphere";
  else if (normalized > 0.40) phase = "stratosphere";
  else if (normalized > 0.15) phase = "troposphere";
  else if (normalized > 0.02) phase = "low-altitude";
  else phase = "surface";

  // Entry glow: peaks at mesosphere
  let entryGlowIntensity = 0;
  if (phase === "upper-atmosphere") {
    entryGlowIntensity = (1 - (normalized - 0.85) / 0.15) * speedFactor * 0.6;
  } else if (phase === "mesosphere") {
    entryGlowIntensity = (1 - (normalized - 0.65) / 0.20) * speedFactor;
  }

  // Screen tint
  const glowColor = profile.entryGlowColor;
  const skyColor = profile.skyColor;
  let screenTintColor: readonly [number, number, number];
  let screenTintAlpha: number;

  if (entryGlowIntensity > 0) {
    screenTintColor = lerp3([0, 0, 0], glowColor, entryGlowIntensity);
    screenTintAlpha = entryGlowIntensity * 0.35;
  } else if (phase === "stratosphere" || phase === "troposphere") {
    const t = phase === "stratosphere" ? (0.40 - normalized) / 0.25 : 1;
    screenTintColor = lerp3([0, 0, 0], skyColor, t * 0.5);
    screenTintAlpha = t * 0.25;
  } else if (phase === "low-altitude" || phase === "surface") {
    screenTintColor = skyColor;
    screenTintAlpha = 0.12;
  } else {
    screenTintColor = [0, 0, 0];
    screenTintAlpha = 0;
  }

  // Turbulence: strongest at troposphere entry
  let turbulenceStrength = 0;
  if (phase === "mesosphere") turbulenceStrength = profile.turbulenceStrength * 0.3 * speedFactor;
  else if (phase === "stratosphere") turbulenceStrength = profile.turbulenceStrength * 0.5;
  else if (phase === "troposphere") turbulenceStrength = profile.turbulenceStrength;
  else if (phase === "low-altitude") turbulenceStrength = profile.turbulenceStrength * 0.4;

  // Cloud opacity
  const cloudLayerNorm = profile.cloudLayerM / profile.thicknessM;
  let cloudOpacity = 0;
  if (normalized < cloudLayerNorm + 0.05) {
    cloudOpacity = Math.min(1, (cloudLayerNorm + 0.05 - normalized) / 0.1);
  }

  // Fog density near surface
  const fogDensity = normalized < 0.05 ? lerp(0.8, 0, normalized / 0.05) : 0;

  // Deceleration: gentle drag above, stronger in lower atmo
  const decelerationFactor = normalized > 0.7 ? 1 : lerp(0.3, 1, normalized / 0.7);

  return {
    phase,
    altitudeM,
    atmosphereThickness: profile.thicknessM,
    entryGlowIntensity,
    screenTintColor,
    screenTintAlpha,
    turbulenceStrength,
    cloudOpacity,
    fogDensity,
    decelerationFactor,
    isInAtmosphere: true,
    surfaceApproach: altitudeM < 10_000,
  };
}

export class AtmosphericEntryController {
  private state: AtmosphericEntryState | null = null;
  private currentProfile: PlanetAtmosphereProfile = AIRLESS_PROFILE;

  setProfile(profile: PlanetAtmosphereProfile): void {
    this.currentProfile = profile;
  }

  update(altitudeM: number, speedMs: number): AtmosphericEntryState {
    this.state = computeAtmosphericEntry(altitudeM, speedMs, this.currentProfile);
    return this.state;
  }

  get current(): AtmosphericEntryState | null { return this.state; }
  get phase(): EntryPhase { return this.state?.phase ?? "space"; }
  get isInAtmosphere(): boolean { return this.state?.isInAtmosphere ?? false; }
}
