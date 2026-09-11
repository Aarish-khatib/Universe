/* ============================================================
   scale-transition.ts  v1
   Manages seamless transitions between scale bands:
   surface → regional → planet → orbital → system → stellar
   → galactic → intergalactic → cosmic

   Works alongside the existing CinematicNavigationController.
   Pure logic — no Three.js dependency.
   ============================================================ */

export const SCALE_TRANSITION_VERSION = 1;

export type ScaleBand =
  | "surface"
  | "regional"
  | "planet"
  | "orbital"
  | "system"
  | "stellar"
  | "galactic"
  | "intergalactic"
  | "cosmic";

export const SCALE_BAND_METERS: Record<ScaleBand, number> = {
  surface:        1_000,
  regional:       100_000,
  planet:         1_000_000,
  orbital:        1_000_000_000,
  system:         50_000_000_000,
  stellar:        9_460_730_472_580,
  galactic:       9_460_730_472_580_000,
  intergalactic:  9_460_730_472_580_000_000,
  cosmic:         9.461e26,
};

export const SCALE_BANDS_ORDERED: ScaleBand[] = [
  "surface", "regional", "planet", "orbital", "system",
  "stellar", "galactic", "intergalactic", "cosmic",
];

export interface ScaleTransitionState {
  currentBand: ScaleBand;
  targetBand: ScaleBand | null;
  progress: number; // 0-1
  isTransitioning: boolean;
  metersPerUnit: number;
  previousBand: ScaleBand | null;
}

export interface ScaleTransitionConfig {
  transitionDurationMs: number;
  easing: "linear" | "ease-in-out" | "ease-out";
  autoTransitionThreshold: number; // 0-1, when to auto-trigger
}

export const DEFAULT_SCALE_TRANSITION_CONFIG: ScaleTransitionConfig = {
  transitionDurationMs: 1200,
  easing: "ease-in-out",
  autoTransitionThreshold: 0.85,
};

export type ScaleTransitionEvent =
  | { type: "transition-start"; from: ScaleBand; to: ScaleBand }
  | { type: "transition-complete"; band: ScaleBand }
  | { type: "band-changed"; band: ScaleBand };

export type ScaleTransitionListener = (event: ScaleTransitionEvent) => void;

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function applyEasing(t: number, easing: ScaleTransitionConfig["easing"]): number {
  const c = Math.max(0, Math.min(1, t));
  switch (easing) {
    case "ease-in-out": return easeInOut(c);
    case "ease-out": return easeOut(c);
    default: return c;
  }
}

export function scaleBandForMeters(meters: number): ScaleBand {
  for (let i = SCALE_BANDS_ORDERED.length - 1; i >= 0; i--) {
    const band = SCALE_BANDS_ORDERED[i]!;
    if (meters >= SCALE_BAND_METERS[band]) return band;
  }
  return "surface";
}

export function scaleBandIndex(band: ScaleBand): number {
  return SCALE_BANDS_ORDERED.indexOf(band);
}

export class ScaleTransitionController {
  private state: ScaleTransitionState;
  private readonly config: ScaleTransitionConfig;
  private readonly listeners = new Set<ScaleTransitionListener>();
  private transitionStartMs = 0;

  constructor(
    initialBand: ScaleBand = "system",
    config: Partial<ScaleTransitionConfig> = {},
  ) {
    this.config = { ...DEFAULT_SCALE_TRANSITION_CONFIG, ...config };
    this.state = {
      currentBand: initialBand,
      targetBand: null,
      progress: 0,
      isTransitioning: false,
      metersPerUnit: SCALE_BAND_METERS[initialBand],
      previousBand: null,
    };
  }

  subscribe(listener: ScaleTransitionListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private emit(event: ScaleTransitionEvent): void {
    for (const l of this.listeners) { try { l(event); } catch { /* */ } }
  }

  transitionTo(band: ScaleBand): void {
    if (band === this.state.currentBand && !this.state.isTransitioning) return;
    if (band === this.state.targetBand) return;

    this.state = {
      ...this.state,
      targetBand: band,
      isTransitioning: true,
      progress: 0,
      previousBand: this.state.currentBand,
    };
    this.transitionStartMs = performance.now();
    this.emit({ type: "transition-start", from: this.state.currentBand, to: band });
  }

  stepUp(): void {
    const idx = scaleBandIndex(this.state.currentBand);
    const next = SCALE_BANDS_ORDERED[Math.min(idx + 1, SCALE_BANDS_ORDERED.length - 1)];
    if (next) this.transitionTo(next);
  }

  stepDown(): void {
    const idx = scaleBandIndex(this.state.currentBand);
    const prev = SCALE_BANDS_ORDERED[Math.max(idx - 1, 0)];
    if (prev) this.transitionTo(prev);
  }

  tick(nowMs: number = performance.now()): ScaleTransitionState {
    if (!this.state.isTransitioning || !this.state.targetBand) return this.state;

    const elapsed = nowMs - this.transitionStartMs;
    const raw = elapsed / this.config.transitionDurationMs;
    const progress = applyEasing(raw, this.config.easing);

    if (raw >= 1) {
      const completed = this.state.targetBand;
      this.state = {
        currentBand: completed,
        targetBand: null,
        progress: 1,
        isTransitioning: false,
        metersPerUnit: SCALE_BAND_METERS[completed],
        previousBand: this.state.currentBand,
      };
      this.emit({ type: "transition-complete", band: completed });
      this.emit({ type: "band-changed", band: completed });
    } else {
      const fromMeters = SCALE_BAND_METERS[this.state.currentBand];
      const toMeters = SCALE_BAND_METERS[this.state.targetBand];
      // Logarithmic interpolation for scale
      const logFrom = Math.log10(fromMeters);
      const logTo = Math.log10(toMeters);
      const logCurrent = logFrom + (logTo - logFrom) * progress;
      const metersPerUnit = Math.pow(10, logCurrent);

      this.state = { ...this.state, progress, metersPerUnit };
    }

    return this.state;
  }

  autoTransitionForSpeed(speedMetersPerSecond: number): void {
    const metersPerUnit = this.state.metersPerUnit;
    const relativeSpeed = speedMetersPerSecond / metersPerUnit;
    const threshold = this.config.autoTransitionThreshold;

    if (relativeSpeed > threshold * 10) {
      this.stepUp();
    } else if (relativeSpeed < threshold * 0.01 && this.state.currentBand !== "surface") {
      this.stepDown();
    }
  }

  get snapshot(): ScaleTransitionState { return { ...this.state }; }
  get currentBand(): ScaleBand { return this.state.currentBand; }
  get metersPerUnit(): number { return this.state.metersPerUnit; }
  get isTransitioning(): boolean { return this.state.isTransitioning; }
}
