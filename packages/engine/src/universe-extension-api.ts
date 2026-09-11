/* ============================================================
   universe-extension-api.ts  v1
   Clean public facade that aggregates all Phase 4 extension
   systems into one composable surface.
   Consumers import from here rather than individual modules.
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

/**
 * UniverseExtensionBundle — instantiate all Phase 4 systems
 * together for easy wiring into UniverseSession.
 */
export interface UniverseExtensionBundle {
  markers: import("./marker-api").MarkerApi;
  photoMode: import("./photo-mode").PhotoModeController;
  narrative: import("./narrative-layer").NarrativeLayer;
  poi: import("./poi-system").PoiSystem;
  performanceBudget: import("./performance-budget").PerformanceBudget;
}

export function createExtensionBundle(): UniverseExtensionBundle {
  const { MarkerApi }              = require("./marker-api");
  const { PhotoModeController }    = require("./photo-mode");
  const { NarrativeLayer }         = require("./narrative-layer");
  const { PoiSystem }              = require("./poi-system");
  const { PerformanceBudget }      = require("./performance-budget");

  return {
    markers:          new MarkerApi(),
    photoMode:        new PhotoModeController(),
    narrative:        new NarrativeLayer(),
    poi:              PoiSystem.loadFromLocalStorage(),
    performanceBudget: new PerformanceBudget(),
  };
}
