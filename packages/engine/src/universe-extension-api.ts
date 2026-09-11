/* ============================================================
   universe-extension-api.ts  v1
   Clean public facade that aggregates all Phase 4 extension
   systems into one composable surface.
   ============================================================ */

export const UNIVERSE_EXTENSION_API_VERSION = 1;

export type { MarkerKind, MarkerVisibility, MarkerTransform, Marker, MarkerEvent, MarkerCreateParams } from "./marker-api";
export { MarkerApi } from "./marker-api";

export type { PhotoCameraPose, PhotoPostProcessing, PhotoModeState, PhotoModeEvent } from "./photo-mode";
export { PhotoModeController, DEFAULT_PHOTO_PP } from "./photo-mode";

export type { TriggerKind, EventActionKind, NarrativeEvent, NarrativeTrigger, NarrativeLayerEvent } from "./narrative-layer";
export { NarrativeLayer } from "./narrative-layer";

export type { PoiCategory, PointOfInterest, PoiEvent } from "./poi-system";
export { PoiSystem, categoryForAnomalyClasses } from "./poi-system";

export type { NebulaClass, NebulaColor, NebulaDescriptor } from "./nebula-generator";
export { generateNebula, generateSectorNebulae } from "./nebula-generator";

export type { QualityTier, PerformanceSample, BudgetRecommendation } from "./performance-budget";
export { PerformanceBudget } from "./performance-budget";

import { MarkerApi } from "./marker-api";
import { PhotoModeController } from "./photo-mode";
import { NarrativeLayer } from "./narrative-layer";
import { PoiSystem } from "./poi-system";
import { PerformanceBudget } from "./performance-budget";

export interface UniverseExtensionBundle {
  markers: MarkerApi;
  photoMode: PhotoModeController;
  narrative: NarrativeLayer;
  poi: PoiSystem;
  performanceBudget: PerformanceBudget;
}

export function createExtensionBundle(): UniverseExtensionBundle {
  return {
    markers:           new MarkerApi(),
    photoMode:         new PhotoModeController(),
    narrative:         new NarrativeLayer(),
    poi:               PoiSystem.loadFromLocalStorage(),
    performanceBudget: new PerformanceBudget(),
  };
}
