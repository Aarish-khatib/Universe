/* ============================================================
   photo-mode.ts  v1
   Photo mode state manager.
   Freezes simulation time, records camera pose, applies
   cinematic post-processing hints, and emits capture events.
   Pure logic — renderer applies the hints each frame.
   ============================================================ */

export const PHOTO_MODE_VERSION = 1;

export interface PhotoCameraPose {
  positionLy: readonly [number, number, number];
  targetLy: readonly [number, number, number];
  upVector: readonly [number, number, number];
  fovDeg: number;
  rollDeg: number;
  frameId: string;
}

export interface PhotoPostProcessing {
  exposure: number;         // 0.5-3.0
  contrast: number;         // 0.5-2.0
  saturation: number;       // 0-2.0
  vignetteStrength: number; // 0-1
  chromaticAberration: number; // 0-1
  filmGrain: number;        // 0-1
  bloomStrength: number;    // 0-1
  lensFlareEnabled: boolean;
  dofEnabled: boolean;
  dofFocalDistanceM: number;
  dofAperture: number;
}

export const DEFAULT_PHOTO_PP: PhotoPostProcessing = {
  exposure: 1.0, contrast: 1.1, saturation: 1.15,
  vignetteStrength: 0.25, chromaticAberration: 0.02,
  filmGrain: 0.04, bloomStrength: 0.6,
  lensFlareEnabled: true, dofEnabled: false,
  dofFocalDistanceM: 1_000_000, dofAperture: 2.8,
};

export interface PhotoModeState {
  isActive: boolean;
  pose: PhotoCameraPose | null;
  postProcessing: PhotoPostProcessing;
  simulationPaused: boolean;
  captureCount: number;
}

export type PhotoModeEvent =
  | { type: "entered"; state: PhotoModeState }
  | { type: "exited" }
  | { type: "captured"; pose: PhotoCameraPose; pp: PhotoPostProcessing; index: number }
  | { type: "pp-changed"; pp: PhotoPostProcessing };

export type PhotoModeListener = (event: PhotoModeEvent) => void;

export class PhotoModeController {
  private active = false;
  private pose: PhotoCameraPose | null = null;
  private pp: PhotoPostProcessing = { ...DEFAULT_PHOTO_PP };
  private captureCount = 0;
  private readonly listeners = new Set<PhotoModeListener>();

  subscribe(listener: PhotoModeListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private emit(event: PhotoModeEvent): void {
    for (const l of this.listeners) { try { l(event); } catch { /* */ } }
  }

  enter(pose: PhotoCameraPose): void {
    this.active = true;
    this.pose = pose;
    const state = this.snapshot();
    this.emit({ type: "entered", state });
  }

  exit(): void {
    this.active = false;
    this.emit({ type: "exited" });
  }

  updatePose(pose: PhotoCameraPose): void {
    if (!this.active) return;
    this.pose = pose;
  }

  updatePP(patch: Partial<PhotoPostProcessing>): void {
    this.pp = { ...this.pp, ...patch };
    this.emit({ type: "pp-changed", pp: { ...this.pp } });
  }

  resetPP(): void {
    this.pp = { ...DEFAULT_PHOTO_PP };
    this.emit({ type: "pp-changed", pp: { ...this.pp } });
  }

  capture(): { pose: PhotoCameraPose; pp: PhotoPostProcessing; index: number } | null {
    if (!this.active || !this.pose) return null;
    this.captureCount++;
    const result = { pose: { ...this.pose }, pp: { ...this.pp }, index: this.captureCount };
    this.emit({ type: "captured", ...result });
    return result;
  }

  snapshot(): PhotoModeState {
    return {
      isActive: this.active,
      pose: this.pose ? { ...this.pose } : null,
      postProcessing: { ...this.pp },
      simulationPaused: this.active,
      captureCount: this.captureCount,
    };
  }

  get isActive(): boolean { return this.active; }
  get currentPP(): PhotoPostProcessing { return { ...this.pp }; }
}
