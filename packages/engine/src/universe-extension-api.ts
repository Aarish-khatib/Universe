/* ============================================================
   universe-extension-api.ts  v1
   Clean public facade for all Phase 3+4 extension systems.
   ============================================================ */

export const UNIVERSE_EXTENSION_API_VERSION = 1;

export type { MarkerKind, MarkerVisibility, MarkerTransform, Marker, MarkerEvent, MarkerCreateParams } from "./marker-api";
export type { PhotoCameraPose, PhotoPostProcessing, PhotoModeState, PhotoModeEvent } from "./photo-mode";
export type { TriggerKind, EventActionKind, NarrativeEvent, NarrativeTrigger, NarrativeLayerEvent } from "./narrative-layer";
export type { PoiCategory, PointOfInterest, PoiEvent } from "./poi-system";
export type { NebulaClass, NebulaColor, NebulaDescriptor } from "./nebula-generator";
export type { QualityTier, PerformanceSample, BudgetRecommendation } from "./performance-budget";

import { MarkerApi } from "./marker-api";
import { PhotoModeController, DEFAULT_PHOTO_PP } from "./photo-mode";
import { NarrativeLayer } from "./narrative-layer";
import { PoiSystem, categoryForAnomalyClasses } from "./poi-system";
import { generateNebula, generateSectorNebulae } from "./nebula-generator";
import { PerformanceBudget } from "./performance-budget";

export {
  MarkerApi,
  PhotoModeController,
  DEFAULT_PHOTO_PP,
  NarrativeLayer,
  PoiSystem,
  categoryForAnomalyClasses,
  generateNebula,
  generateSectorNebulae,
  PerformanceBudget,
};

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
