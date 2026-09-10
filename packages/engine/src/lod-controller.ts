/* ============================================================
   lod-controller.ts  v1
   Level-of-detail controller.  Pure logic — computes LOD tier
   for entities based on observer distance and velocity, driving
   both renderer detail and streaming decisions.  No Three.js.
   ============================================================ */

export const LOD_CONTROLLER_VERSION = 1;

export type LodTier =
  | "cosmic"        // >10 000 ly — galaxy blobs only
  | "interstellar"  // 100 – 10 000 ly — star points
  | "stellar"       // 1 – 100 ly — star systems, basic planets
  | "system"        // 0.01 – 1 ly  — full system, orbital paths
  | "planetary"     // 0 – 0.1 ly  — planet detail, moons
  | "surface";      // <100 au  — surface approach

export interface LodInput {
  observerPositionLy: readonly [number, number, number];
  entityPositionLy: readonly [number, number, number];
  observerSpeedLyPerSecond: number;
}

export interface LodResult {
  tier: LodTier;
  distanceLy: number;
  renderDetail: number;  // 0-1
  streamPriority: number; // 0-1 (1 = highest)
}

function distance3(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

const LY_PER_AU = 1 / 63_241.1;

export function computeLod(input: LodInput): LodResult {
  const distanceLy = distance3(input.observerPositionLy, input.entityPositionLy);
  const speed = Math.max(0, input.observerSpeedLyPerSecond);
  // Velocity-based LOD bias: fast travel increases distance threshold
  const velocityBias = Math.min(1, speed / 0.001);

  let tier: LodTier;
  let renderDetail: number;
  let streamPriority: number;

  const effectiveDist = distanceLy * (1 + velocityBias * 0.5);

  if (effectiveDist > 10_000) {
    tier = "cosmic"; renderDetail = 0.05; streamPriority = 0.02;
  } else if (effectiveDist > 100) {
    tier = "interstellar";
    renderDetail = 0.05 + 0.15 * (1 - (effectiveDist - 100) / 9_900);
    streamPriority = 0.1;
  } else if (effectiveDist > 1) {
    tier = "stellar";
    renderDetail = 0.2 + 0.3 * (1 - (effectiveDist - 1) / 99);
    streamPriority = 0.3 + 0.2 * (1 - effectiveDist / 100);
  } else if (effectiveDist > 0.1) {
    tier = "system";
    renderDetail = 0.5 + 0.3 * (1 - (effectiveDist - 0.1) / 0.9);
    streamPriority = 0.7;
  } else if (effectiveDist > 100 * LY_PER_AU) {
    tier = "planetary"; renderDetail = 0.85; streamPriority = 0.9;
  } else {
    tier = "surface"; renderDetail = 1.0; streamPriority = 1.0;
  }

  return { tier, distanceLy, renderDetail, streamPriority };
}

export class LodController {
  private readonly entityLods = new Map<string, LodResult>();

  update(
    entityId: string,
    input: LodInput,
  ): LodResult {
    const result = computeLod(input);
    this.entityLods.set(entityId, result);
    return result;
  }

  get(entityId: string): LodResult | undefined {
    return this.entityLods.get(entityId);
  }

  getVisibleEntities(minDetail = 0): readonly string[] {
    return [...this.entityLods.entries()]
      .filter(([, v]) => v.renderDetail >= minDetail)
      .sort((a, b) => b[1].streamPriority - a[1].streamPriority)
      .map(([k]) => k);
  }

  clear(): void { this.entityLods.clear(); }
  get size(): number { return this.entityLods.size; }
}
