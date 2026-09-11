/* ============================================================
   nebula-generator.ts  v1
   Deterministic nebula / interstellar medium generator.
   Produces render-ready nebula descriptors from galactic
   sector coordinates. No Three.js dependency.
   ============================================================ */

export const NEBULA_GENERATOR_VERSION = 1;

export type NebulaClass =
  | "emission"
  | "reflection"
  | "dark"
  | "planetary"
  | "supernova-remnant"
  | "protostellar";

export interface NebulaColor {
  primary: readonly [number, number, number];
  secondary: readonly [number, number, number];
  emissionStrength: number;
}

export interface NebulaDescriptor {
  id: string;
  class: NebulaClass;
  seedKey: string;
  positionLy: readonly [number, number, number];
  radiusLy: number;
  densityFalloff: number;
  color: NebulaColor;
  rotationRad: number;
  elongation: number;
  opacity: number;
  hasProtostar: boolean;
  label: string;
}

const NEBULA_COLORS: Record<NebulaClass, NebulaColor> = {
  "emission":          { primary: [0.9, 0.15, 0.25], secondary: [0.3, 0.05, 0.8], emissionStrength: 0.9 },
  "reflection":        { primary: [0.2, 0.45, 0.9],  secondary: [0.1, 0.25, 0.6], emissionStrength: 0.2 },
  "dark":              { primary: [0.05, 0.05, 0.08], secondary: [0.08, 0.06, 0.12], emissionStrength: 0.0 },
  "planetary":         { primary: [0.1, 0.8, 0.6],   secondary: [0.05, 0.4, 0.9], emissionStrength: 0.85 },
  "supernova-remnant": { primary: [0.95, 0.4, 0.1],  secondary: [0.6, 0.1, 0.5], emissionStrength: 0.75 },
  "protostellar":      { primary: [0.7, 0.5, 0.15],  secondary: [0.4, 0.25, 0.05], emissionStrength: 0.3 },
};

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0);
}

function seededFloat(seed: number, salt: number): number {
  const v = hash(`${seed}:${salt}`);
  return (v >>> 0) / 0xffffffff;
}

const NEBULA_LABELS: Record<NebulaClass, string[]> = {
  "emission":          ["Crimson Veil", "Stellar Nursery", "Ionized Cloud", "H-Alpha Region"],
  "reflection":        ["Azure Shroud", "Reflection Mantle", "Dust Mirror", "Blue Haze"],
  "dark":              ["Void Rift", "Dark Pillar", "Shadow Nebula", "Absorption Cloud"],
  "planetary":         ["Expelled Shell", "Stellar Cocoon", "Ionic Ring", "Glowing Shell"],
  "supernova-remnant": ["Remnant Shock", "Stellar Debris", "Explosion Echo", "Shockwave Filament"],
  "protostellar":      ["Birth Cocoon", "Protostellar Disk", "Formation Cloud", "Young Star Veil"],
};

export function generateNebula(
  sectorKey: string,
  nebulaIndex: number,
  sectorOriginLy: readonly [number, number, number],
  sectorSizeLy: number,
): NebulaDescriptor {
  const seed = hash(`${sectorKey}:nebula:${nebulaIndex}`);
  const r = (salt: number) => seededFloat(seed, salt);

  const classes: NebulaClass[] = ["emission","reflection","dark","planetary","supernova-remnant","protostellar"];
  const weights = [0.35, 0.25, 0.15, 0.1, 0.1, 0.05];
  let classRoll = r(1);
  let nebulaClass: NebulaClass = "emission";
  for (let i = 0; i < weights.length; i++) {
    classRoll -= weights[i]!;
    if (classRoll <= 0) { nebulaClass = classes[i]!; break; }
  }

  const positionLy: readonly [number, number, number] = [
    sectorOriginLy[0] + (r(2) - 0.5) * sectorSizeLy,
    sectorOriginLy[1] + (r(3) - 0.5) * sectorSizeLy * 0.3,
    sectorOriginLy[2] + (r(4) - 0.5) * sectorSizeLy,
  ];

  const baseColor = NEBULA_COLORS[nebulaClass];
  const tintShift = r(9) * 0.15 - 0.075;
  const color: NebulaColor = {
    primary: [
      Math.max(0, Math.min(1, baseColor.primary[0] + tintShift)),
      Math.max(0, Math.min(1, baseColor.primary[1] + tintShift * 0.5)),
      Math.max(0, Math.min(1, baseColor.primary[2] - tintShift)),
    ],
    secondary: baseColor.secondary,
    emissionStrength: baseColor.emissionStrength,
  };

  const labels = NEBULA_LABELS[nebulaClass];
  const label = labels[Math.floor(r(10) * labels.length)]!;
  const id = `nebula:${sectorKey}:${nebulaIndex}`;

  return {
    id,
    class: nebulaClass,
    seedKey: `${seed.toString(16).padStart(8, "0")}`,
    positionLy,
    radiusLy: 20 + r(5) * 180,
    densityFalloff: 1.5 + r(6) * 3.0,
    color,
    rotationRad: r(7) * Math.PI * 2,
    elongation: 1 + r(8) * 2.5,
    opacity: nebulaClass === "dark" ? 0.85 : 0.15 + r(11) * 0.5,
    hasProtostar: nebulaClass === "protostellar" && r(12) > 0.4,
    label: `${label} ${(nebulaIndex + 1).toString().padStart(3, "0")}`,
  };
}

export function generateSectorNebulae(
  sectorKey: string,
  sectorOriginLy: readonly [number, number, number],
  sectorSizeLy: number,
  count = 3,
): readonly NebulaDescriptor[] {
  const nebulae: NebulaDescriptor[] = [];
  for (let i = 0; i < count; i++) {
    nebulae.push(generateNebula(sectorKey, i, sectorOriginLy, sectorSizeLy));
  }
  return nebulae;
}
