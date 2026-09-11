/* ============================================================
   performance-budget.ts  v1
   Runtime performance budget manager.
   Tracks frame time, entity counts, and streaming pressure,
   then emits quality-tier recommendations so the renderer
   and world-stream can self-tune without melting the browser.
   ============================================================ */

export const PERFORMANCE_BUDGET_VERSION = 1;

export type QualityTier =
  | "ultra"    // 60fps, full detail
  | "high"     // 50fps, minor LOD
  | "medium"   // 40fps, LOD active
  | "low"      // 30fps, aggressive LOD
  | "potato";  // <30fps, survival mode

export interface PerformanceSample {
  frameMs: number;
  entityCount: number;
  drawCalls: number;
  streamQueueDepth: number;
  memoryMb: number;
  timestamp: number;
}

export interface BudgetRecommendation {
  tier: QualityTier;
  maxVisibleEntities: number;
  maxStreamQueueDepth: number;
  renderDetailMultiplier: number; // 0-1
  shadowsEnabled: boolean;
  atmosphereEnabled: boolean;
  nebulaEnabled: boolean;
  starfieldDensity: number; // 0-1
  reason: string;
}

const TIER_THRESHOLDS: Record<QualityTier, { frameMs: number; entities: number }> = {
  ultra:  { frameMs: 16,  entities: 20_000 },
  high:   { frameMs: 20,  entities: 15_000 },
  medium: { frameMs: 25,  entities: 10_000 },
  low:    { frameMs: 33,  entities: 5_000  },
  potato: { frameMs: 999, entities: 2_000  },
};

const TIER_RECOMMENDATIONS: Record<QualityTier, Omit<BudgetRecommendation, "tier" | "reason">> = {
  ultra:  { maxVisibleEntities: 20_000, maxStreamQueueDepth: 8, renderDetailMultiplier: 1.0, shadowsEnabled: true,  atmosphereEnabled: true,  nebulaEnabled: true,  starfieldDensity: 1.0 },
  high:   { maxVisibleEntities: 15_000, maxStreamQueueDepth: 6, renderDetailMultiplier: 0.85, shadowsEnabled: true,  atmosphereEnabled: true,  nebulaEnabled: true,  starfieldDensity: 0.85 },
  medium: { maxVisibleEntities: 10_000, maxStreamQueueDepth: 4, renderDetailMultiplier: 0.65, shadowsEnabled: false, atmosphereEnabled: true,  nebulaEnabled: false, starfieldDensity: 0.65 },
  low:    { maxVisibleEntities: 5_000,  maxStreamQueueDepth: 2, renderDetailMultiplier: 0.4,  shadowsEnabled: false, atmosphereEnabled: false, nebulaEnabled: false, starfieldDensity: 0.45 },
  potato: { maxVisibleEntities: 2_000,  maxStreamQueueDepth: 1, renderDetailMultiplier: 0.2,  shadowsEnabled: false, atmosphereEnabled: false, nebulaEnabled: false, starfieldDensity: 0.2  },
};

export type BudgetListener = (recommendation: BudgetRecommendation) => void;

export class PerformanceBudget {
  private readonly samples: PerformanceSample[] = [];
  private readonly listeners = new Set<BudgetListener>();
  private currentTier: QualityTier = "high";
  private readonly windowSize: number;
  private lastEmitTier: QualityTier | null = null;

  constructor(windowSize = 60) {
    this.windowSize = windowSize;
  }

  subscribe(listener: BudgetListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private emit(recommendation: BudgetRecommendation): void {
    for (const l of this.listeners) { try { l(recommendation); } catch { /* */ } }
  }

  record(sample: Omit<PerformanceSample, "timestamp">): void {
    this.samples.push({ ...sample, timestamp: Date.now() });
    if (this.samples.length > this.windowSize) this.samples.shift();

    if (this.samples.length < 10) return; // Need enough data

    const avgFrameMs = this.samples.reduce((s, x) => s + x.frameMs, 0) / this.samples.length;
    const maxEntities = Math.max(...this.samples.map(s => s.entityCount));
    const newTier = this.computeTier(avgFrameMs, maxEntities);

    if (newTier !== this.lastEmitTier) {
      this.currentTier = newTier;
      this.lastEmitTier = newTier;
      const rec = this.buildRecommendation(newTier, avgFrameMs);
      this.emit(rec);
    }
  }

  private computeTier(avgFrameMs: number, entityCount: number): QualityTier {
    const tiers: QualityTier[] = ["ultra", "high", "medium", "low", "potato"];
    for (const tier of tiers) {
      const t = TIER_THRESHOLDS[tier];
      if (avgFrameMs <= t.frameMs && entityCount <= t.entities) return tier;
    }
    return "potato";
  }

  private buildRecommendation(tier: QualityTier, avgFrameMs: number): BudgetRecommendation {
    return {
      tier,
      ...TIER_RECOMMENDATIONS[tier],
      reason: `avg frame ${avgFrameMs.toFixed(1)}ms → tier ${tier}`,
    };
  }

  get recommendation(): BudgetRecommendation {
    return this.buildRecommendation(this.currentTier, 16);
  }

  get tier(): QualityTier { return this.currentTier; }
  get sampleCount(): number { return this.samples.length; }
}
