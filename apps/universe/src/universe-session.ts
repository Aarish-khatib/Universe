import {
  METERS_PER_UNIT,
  convertDistance,
  dateToJulianDay,
  julianDayToDate,
  vectorLength,
} from "@known-universe/core";

import type {
  EntityId,
  SpaceEntity,
} from "@known-universe/core";

import {
  UniverseRuntime,
  createInitialUniverseState,
  createWorldStream,
  ProceduralEntityBridge,
  WorldStreamManager,
  DiscoveryLog,
  WaypointSystem,
  LodController,
  classifyAnomalies,
  DiscoveryNotificationQueue,
  buildNotification,
  ScaleTransitionController,
  AtmosphericEntryController,
  PoiSystem,
  MarkerApi,
  PhotoModeController,
  NarrativeLayer,
  PerformanceBudget,
} from "@known-universe/engine";

import type {
  UniverseState,
} from "@known-universe/engine";

import {
  FRAME_SOLAR_HELIOCENTRIC,
  createSolarSystemSnapshot,
} from "@known-universe/data";

import {
  ThreeUniverseRenderer,
} from "@known-universe/render-three";

import type {
  RendererStats,
} from "@known-universe/render-three";

import {
  createUniverseInteraction,
} from "./universe-interaction";

import type {
  UniverseInteractionController,
  UniverseInteractionSnapshot,
} from "./universe-interaction";


export const UNIVERSE_SESSION_VERSION =
  1;


/* ============================================================
   CHECKPOINT 1
   Public session model
   ============================================================ */


export type UniverseSessionStatus =
  | "idle"
  | "initializing-renderer"
  | "initializing-runtime"
  | "loading-reality"
  | "starting-interaction"
  | "ready"
  | "failed"
  | "disposed";


export type UniverseViewMode =
  | "explore"
  | "science";


export type UniverseOverlayName =
  | "labels"
  | "orbits"
  | "knowledge"
  | "gravity"
  | "humanity";


export interface UniverseSessionError {
  stage:
    UniverseSessionStatus;

  message:
    string;

  cause:
    unknown;
}


export interface UniverseSessionCallbacks {
  onSnapshot?(
    snapshot:
      UniverseSessionSnapshot,
  ): void;

  onStatus?(
    status:
      UniverseSessionStatus,
  ): void;

  onError?(
    error:
      UniverseSessionError,
  ): void;

  onSelection?(
    entity:
      UniverseObjectView |
      null,
  ): void;

  onTravelStart?(
    entity:
      UniverseObjectView,
  ): void;

  onTravelComplete?(
    entity:
      UniverseObjectView,
  ): void;

  onSearchRequest?():
    void;

  onCatalogChange?(
    open:
      boolean,
  ): void;

  onModeChange?(
    mode:
      UniverseViewMode,
  ): void;
}


export interface UniverseSessionOptions {
  container:
    HTMLElement;

  callbacks?:
    UniverseSessionCallbacks;

  initialMode?:
    UniverseViewMode;

  initialSelectedId?:
    EntityId;

  initialFocusId?:
    EntityId;

  rendererBackground?:
    number;

  starCount?:
    number;

  detailedObjectLimit?:
    number;

  statsIntervalMs?:
    number;

  stateSyncIntervalMs?:
    number;

  pixelRatioLimit?:
    number;

  proceduralSeed?:
    string;
}


export interface UniverseObjectView {
  id:
    EntityId;

  name:
    string;

  kind:
    SpaceEntity["kind"];

  aliases:
    readonly string[];

  parentId:
    EntityId |
    null;

  parentName:
    string |
    null;

  summary:
    string;

  selected:
    boolean;

  focused:
    boolean;

  distanceFromOriginMeters:
    number |
    null;

  radiusMeters:
    number |
    null;

  massKg:
    number |
    null;

  spatialFrameId:
    string |
    null;

  spatialUnit:
    string |
    null;

  sourceIds:
    readonly string[];

  radiusEvidence:
    string;

  massEvidence:
    string;
}


export interface UniverseSearchResult {
  entity:
    UniverseObjectView;

  score:
    number;

  matchedName:
    boolean;

  matchedAlias:
    boolean;

  matchedKind:
    boolean;

  matchedSummary:
    boolean;
}


export interface UniverseScienceView {
  id:
    EntityId;

  name:
    string;

  kind:
    SpaceEntity["kind"];

  referenceFrame:
    string |
    null;

  coordinateUnit:
    string |
    null;

  position:
    readonly [
      number,
      number,
      number,
    ] |
    null;

  distanceFromOriginMeters:
    number |
    null;

  radiusMeters:
    number |
    null;

  radiusEvidence:
    string;

  massKg:
    number |
    null;

  massEvidence:
    string;

  semiMajorAxisMeters:
    number |
    null;

  eccentricity:
    number |
    null;

  inclinationDegrees:
    number |
    null;

  longitudeAscendingNodeDegrees:
    number |
    null;

  argumentPeriapsisDegrees:
    number |
    null;

  sourceIds:
    readonly string[];
}


export interface UniverseSessionMetrics {
  renderer:
    RendererStats;

  entityCount:
    number;

  selectedId:
    EntityId |
    null;

  focusedId:
    EntityId |
    null;

  simulationJulianDay:
    number;

  scaleMetersPerUnit:
    number;

  scaleBand:
    string;

  frameId:
    string;
}


export interface UniverseSessionSnapshot {
  version:
    number;

  revision:
    number;

  status:
    UniverseSessionStatus;

  mode:
    UniverseViewMode;

  catalogOpen:
    boolean;

  searchQuery:
    string;

  state:
    UniverseState;

  selected:
    UniverseObjectView |
    null;

  focused:
    UniverseObjectView |
    null;

  objects:
    readonly UniverseObjectView[];

  renderer:
    RendererStats;

  interaction:
    UniverseInteractionSnapshot |
    null;

  error:
    UniverseSessionError |
    null;

  simulationDate:
    Date;
}


export interface UniverseSessionDiagnostics {
  status:
    UniverseSessionStatus;

  disposed:
    boolean;

  runtimeReady:
    boolean;

  rendererReady:
    boolean;

  interactionReady:
    boolean;

  resizeObserverActive:
    boolean;

  statsTimerActive:
    boolean;

  subscriptionActive:
    boolean;

  entityCount:
    number;

  revision:
    number;
}


interface SearchRecord {
  id:
    EntityId;

  name:
    string;

  normalizedName:
    string;

  normalizedAliases:
    readonly string[];

  normalizedKind:
    string;

  normalizedSummary:
    string;

  tokens:
    ReadonlySet<string>;
}


const EMPTY_RENDERER_STATS:
  RendererStats = {
  backend:
    "three",

  drawCalls:
    0,

  triangles:
    0,

  points:
    0,

  lines:
    0,

  objects:
    0,

  sceneObjects:
    0,

  frameMs:
    0,

  visibleEntities:
    0,
};


const DEFAULT_STATS_INTERVAL_MS =
  300;


const DEFAULT_STATE_SYNC_INTERVAL_MS =
  90;


const DEFAULT_PIXEL_RATIO_LIMIT =
  2;


const DEFAULT_STAR_COUNT =
  8_000;


const DEFAULT_OBJECT_LIMIT =
  15_000;


const DEFAULT_SELECTED_ID:
  EntityId =
  "earth";


const DEFAULT_FOCUS_ID:
  EntityId =
  "sun";


/* ============================================================
   CHECKPOINT 2
   Shared helpers and derived scientific presentation
   ============================================================ */


function clampSessionNumber(
  value:
    number,

  minimum:
    number,

  maximum:
    number,
):
  number {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return minimum;
  }

  return Math.min(
    maximum,

    Math.max(
      minimum,
      value,
    ),
  );
}


function finiteOrNull(
  value:
    number |
    undefined,
):
  number |
  null {
  if (
    value ===
      undefined ||
    !Number.isFinite(
      value,
    )
  ) {
    return null;
  }

  return value;
}


function cloneRendererStats(
  stats:
    RendererStats,
):
  RendererStats {
  return {
    backend:
      stats.backend,

    drawCalls:
      stats.drawCalls,

    triangles:
      stats.triangles,

    points:
      stats.points,

    lines:
      stats.lines,

    objects:
      stats.objects,

    sceneObjects:
      stats.sceneObjects,

    frameMs:
      stats.frameMs,

    visibleEntities:
      stats.visibleEntities,
  };
}


function normalizeSearchText(
  value:
    string,
):
  string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      " ",
    )
    .trim();
}


function searchTokens(
  value:
    string,
):
  string[] {
  const normalized =
    normalizeSearchText(
      value,
    );

  if (
    normalized.length ===
    0
  ) {
    return [];
  }

  return normalized
    .split(/\s+/g)
    .filter(
      token =>
        token.length >
        0,
    );
}


function distanceFromOriginMeters(
  entity:
    SpaceEntity,
):
  number |
  null {
  const spatial =
    entity.spatial;

  if (
    !spatial
  ) {
    return null;
  }

  const distance =
    vectorLength(
      spatial.position,
    );

  const meters =
    convertDistance(
      distance,
      spatial.unit,
      "m",
    );

  return Number.isFinite(
    meters,
  )
    ? meters
    : null;
}


function entityRadiusMeters(
  entity:
    SpaceEntity,
):
  number |
  null {
  return finiteOrNull(
    entity
      .physical
      ?.radiusM
      ?.value,
  );
}


function entityMassKg(
  entity:
    SpaceEntity,
):
  number |
  null {
  return finiteOrNull(
    entity
      .physical
      ?.massKg
      ?.value,
  );
}


function evidenceName(
  value:
    string |
    undefined,
):
  string {
  return value ??
    "unknown";
}


function parentNameForEntity(
  entity:
    SpaceEntity,

  state:
    UniverseState,
):
  string |
  null {
  const parentId =
    entity.parentId;

  if (
    !parentId
  ) {
    return null;
  }

  return (
    state.entities.get(
      parentId,
    )?.name ??
    null
  );
}


function objectViewFromEntity(
  entity:
    SpaceEntity,

  state:
    UniverseState,
):
  UniverseObjectView {
  return {
    id:
      entity.id,

    name:
      entity.name,

    kind:
      entity.kind,

    aliases:
      entity.aliases
        ? [
            ...entity.aliases,
          ]
        : [],

    parentId:
      entity.parentId ??
      null,

    parentName:
      parentNameForEntity(
        entity,
        state,
      ),

    summary:
      entity.summary ??
      "",

    selected:
      state.selectedId ===
      entity.id,

    focused:
      state.focusId ===
      entity.id,

    distanceFromOriginMeters:
      distanceFromOriginMeters(
        entity,
      ),

    radiusMeters:
      entityRadiusMeters(
        entity,
      ),

    massKg:
      entityMassKg(
        entity,
      ),

    spatialFrameId:
      entity.spatial
        ?.frameId ??
      null,

    spatialUnit:
      entity.spatial
        ?.unit ??
      null,

    sourceIds: [
      ...entity.sourceIds,
    ],

    radiusEvidence:
      evidenceName(
        entity
          .physical
          ?.radiusM
          ?.evidence,
      ),

    massEvidence:
      evidenceName(
        entity
          .physical
          ?.massKg
          ?.evidence,
      ),
  };
}


function scienceViewFromEntity(
  entity:
    SpaceEntity,
):
  UniverseScienceView {
  const spatial =
    entity.spatial;

  const orbit =
    entity.orbit;

  return {
    id:
      entity.id,

    name:
      entity.name,

    kind:
      entity.kind,

    referenceFrame:
      spatial
        ?.frameId ??
      null,

    coordinateUnit:
      spatial
        ?.unit ??
      null,

    position:
      spatial
        ? [
            spatial.position[0],
            spatial.position[1],
            spatial.position[2],
          ]
        : null,

    distanceFromOriginMeters:
      distanceFromOriginMeters(
        entity,
      ),

    radiusMeters:
      entityRadiusMeters(
        entity,
      ),

    radiusEvidence:
      evidenceName(
        entity
          .physical
          ?.radiusM
          ?.evidence,
      ),

    massKg:
      entityMassKg(
        entity,
      ),

    massEvidence:
      evidenceName(
        entity
          .physical
          ?.massKg
          ?.evidence,
      ),

    semiMajorAxisMeters:
      finiteOrNull(
        orbit
          ?.semiMajorAxisM,
      ),

    eccentricity:
      finiteOrNull(
        orbit
          ?.eccentricity,
      ),

    inclinationDegrees:
      finiteOrNull(
        orbit
          ?.inclinationDeg,
      ),

    longitudeAscendingNodeDegrees:
      finiteOrNull(
        orbit
          ?.longitudeAscendingNodeDeg,
      ),

    argumentPeriapsisDegrees:
      finiteOrNull(
        orbit
          ?.argumentPeriapsisDeg,
      ),

    sourceIds: [
      ...entity.sourceIds,
    ],
  };
}


function createSearchRecord(
  entity:
    SpaceEntity,
):
  SearchRecord {
  const normalizedName =
    normalizeSearchText(
      entity.name,
    );

  const normalizedAliases =
    (
      entity.aliases ??
      []
    ).map(
      alias =>
        normalizeSearchText(
          alias,
        ),
    );

  const normalizedKind =
    normalizeSearchText(
      entity.kind,
    );

  const normalizedSummary =
    normalizeSearchText(
      entity.summary ??
        "",
    );

  const tokens =
    new Set<string>();

  for (
    const token
    of searchTokens(
      entity.name,
    )
  ) {
    tokens.add(
      token,
    );
  }

  for (
    const alias
    of normalizedAliases
  ) {
    for (
      const token
      of searchTokens(
        alias,
      )
    ) {
      tokens.add(
        token,
      );
    }
  }

  for (
    const token
    of searchTokens(
      entity.kind,
    )
  ) {
    tokens.add(
      token,
    );
  }

  return {
    id:
      entity.id,

    name:
      entity.name,

    normalizedName,

    normalizedAliases,

    normalizedKind,

    normalizedSummary,

    tokens,
  };
}


function containsAllTokens(
  source:
    string,

  tokens:
    readonly string[],
):
  boolean {
  for (
    const token
    of tokens
  ) {
    if (
      !source.includes(
        token,
      )
    ) {
      return false;
    }
  }

  return true;
}


function scoreSearchRecord(
  record:
    SearchRecord,

  query:
    string,

  queryTokens:
    readonly string[],
):
  number {
  if (
    query.length ===
    0
  ) {
    return 0;
  }

  let score =
    0;

  if (
    record.normalizedName ===
    query
  ) {
    score +=
      1_000;
  }

  if (
    record.normalizedName.startsWith(
      query,
    )
  ) {
    score +=
      600;
  } else if (
    record.normalizedName.includes(
      query,
    )
  ) {
    score +=
      360;
  }

  for (
    const alias
    of record.normalizedAliases
  ) {
    if (
      alias ===
      query
    ) {
      score +=
        520;
    } else if (
      alias.startsWith(
        query,
      )
    ) {
      score +=
        300;
    } else if (
      alias.includes(
        query,
      )
    ) {
      score +=
        180;
    }
  }

  if (
    record.normalizedKind ===
    query
  ) {
    score +=
      200;
  } else if (
    record.normalizedKind.includes(
      query,
    )
  ) {
    score +=
      90;
  }

  if (
    record.normalizedSummary.includes(
      query,
    )
  ) {
    score +=
      45;
  }

  if (
    queryTokens.length >
    0
  ) {
    let matchedTokens =
      0;

    for (
      const token
      of queryTokens
    ) {
      if (
        record.tokens.has(
          token,
        )
      ) {
        matchedTokens++;
      }
    }

    score +=
      matchedTokens *
      85;

    if (
      matchedTokens ===
      queryTokens.length
    ) {
      score +=
        150;
    }

    if (
      containsAllTokens(
        record.normalizedName,
        queryTokens,
      )
    ) {
      score +=
        120;
    }
  }

  const lengthDifference =
    Math.abs(
      record.normalizedName.length -
      query.length,
    );

  score -=
    Math.min(
      25,
      lengthDifference *
        0.25,
    );

  return score;
}


function createDefaultUniverseState():
  UniverseState {
  const base =
    createInitialUniverseState({
      julianDay:
        dateToJulianDay(
          new Date(),
        ),

      scale:
        "UTC",
    });

  return {
    ...base,

    selectedId:
      DEFAULT_SELECTED_ID,

    focusId:
      DEFAULT_FOCUS_ID,

    camera: {
      ...base.camera,

      mode:
        "orbit",

      frameId:
        FRAME_SOLAR_HELIOCENTRIC,

      position: [
        42,
        25,
        72,
      ],

      velocity: [
        0,
        0,
        0,
      ],

      targetId:
        DEFAULT_FOCUS_ID,

      fieldOfView:
        52,

      baseSpeed:
        12,
    },

    scale: {
      band:
        "system",

      metersPerUnit:
        50_000_000_000,

      frameId:
        FRAME_SOLAR_HELIOCENTRIC,
    },

    overlays: {
      ...base.overlays,

      labels:
        true,

      orbits:
        true,

      knowledge:
        true,
    },

    settings: {
      ...base.settings,

      graphics: {
        ...base.settings.graphics,

        atmosphere:
          true,

        orbitLines:
          true,

        maxVisibleObjects:
          15_000,
      },

      navigation: {
        ...base.settings.navigation,

        cinematicTravel:
          true,

        wasdMode:
          "free-flight",
      },
    },
  };
}


/* ============================================================
   CHECKPOINT 3
   UniverseSession
   ============================================================ */


export class UniverseSession {
  readonly container:
    HTMLElement;


  private readonly callbacks:
    UniverseSessionCallbacks;


  private readonly initialMode:
    UniverseViewMode;


  private readonly initialSelectedId:
    EntityId;


  private readonly initialFocusId:
    EntityId;


  private readonly rendererBackground:
    number;


  private readonly starCount:
    number;


  private readonly detailedObjectLimit:
    number;


  private readonly statsIntervalMs:
    number;


  private readonly stateSyncIntervalMs:
    number;


  private readonly pixelRatioLimit:
    number;


  private readonly proceduralSeed:
    string;


  private statusValue:
    UniverseSessionStatus =
    "idle";


  private modeValue:
    UniverseViewMode;


  private catalogOpenValue =
    false;


  private searchQueryValue =
    "";


  private errorValue:
    UniverseSessionError |
    null =
    null;


  private revisionValue =
    0;


  private runtimeValue:
    UniverseRuntime |
    null =
    null;


  private rendererValue:
    ThreeUniverseRenderer |
    null =
    null;


  private interactionValue:
    UniverseInteractionController |
    null =
    null;


  private proceduralStreamValue:
    WorldStreamManager |
    null =
    null;


  private proceduralBridgeValue:
    ProceduralEntityBridge |
    null =
    null;


  private stateValue:
    UniverseState =
    createDefaultUniverseState();


  private rendererStatsValue:
    RendererStats =
    cloneRendererStats(
      EMPTY_RENDERER_STATS,
    );


  private searchRecords =
    new Map<
      EntityId,
      SearchRecord
    >();


  private objectViewsValue:
    UniverseObjectView[] = [];


  private resizeObserver:
    ResizeObserver |
    null =
    null;


  private stateUnsubscribe:
    (() => void) |
    null =
    null;


  private statsTimer:
    number |
    null =
    null;


  private lastStateNotification =
    0;


  private initializationToken =
    0;


  private initializingPromise:
    Promise<void> |
    null =
    null;


  private disposedValue =
    false;


  /* === Phase 1: Exploration systems === */
  readonly discoveryLog: DiscoveryLog =
    DiscoveryLog.loadFromLocalStorage();

  readonly waypointSystem: WaypointSystem =
    new WaypointSystem();

  readonly lodController: LodController =
    new LodController();

  readonly notificationQueue: DiscoveryNotificationQueue =
    new DiscoveryNotificationQueue();

  readonly scaleTransition: ScaleTransitionController =
    new ScaleTransitionController("system");

  readonly atmosphericEntry: AtmosphericEntryController =
    new AtmosphericEntryController();

  /* === Phase 3+4: Extension systems === */
  readonly poiSystem: PoiSystem =
    PoiSystem.loadFromLocalStorage();

  readonly markerApi: MarkerApi =
    MarkerApi.loadFromLocalStorage();

  readonly photoMode: PhotoModeController =
    new PhotoModeController();

  readonly narrative: NarrativeLayer =
    new NarrativeLayer();

  readonly performanceBudget: PerformanceBudget =
    new PerformanceBudget();


  constructor(
    options:
      UniverseSessionOptions,
  ) {
    this.container =
      options.container;


    this.callbacks =
      options.callbacks ??
      {};


    this.initialMode =
      options.initialMode ??
      "explore";


    this.modeValue =
      this.initialMode;


    this.initialSelectedId =
      options.initialSelectedId ??
      DEFAULT_SELECTED_ID;


    this.initialFocusId =
      options.initialFocusId ??
      DEFAULT_FOCUS_ID;


    this.rendererBackground =
      options.rendererBackground ??
      0x10234b;


    this.starCount =
      Math.max(
        500,

        Math.floor(
          options.starCount ??
          DEFAULT_STAR_COUNT,
        ),
      );


    this.detailedObjectLimit =
      Math.max(
        100,

        Math.floor(
          options.detailedObjectLimit ??
          DEFAULT_OBJECT_LIMIT,
        ),
      );


    this.statsIntervalMs =
      Math.max(
        50,

        Math.floor(
          options.statsIntervalMs ??
          DEFAULT_STATS_INTERVAL_MS,
        ),
      );


    this.stateSyncIntervalMs =
      Math.max(
        16,

        Math.floor(
          options.stateSyncIntervalMs ??
          DEFAULT_STATE_SYNC_INTERVAL_MS,
        ),
      );


    this.pixelRatioLimit =
      clampSessionNumber(
        options.pixelRatioLimit ??
        DEFAULT_PIXEL_RATIO_LIMIT,

        0.5,

        4,
      );


    this.proceduralSeed =
      options.proceduralSeed ??
      "PROJECT UNIVERSE / PROCEDURAL HORIZON";
  }


  get status():
    UniverseSessionStatus {
    return this.statusValue;
  }


  get mode():
    UniverseViewMode {
    return this.modeValue;
  }


  get catalogOpen():
    boolean {
    return this.catalogOpenValue;
  }


  get searchQuery():
    string {
    return this.searchQueryValue;
  }


  get runtime():
    UniverseRuntime |
    null {
    return this.runtimeValue;
  }


  get renderer():
    ThreeUniverseRenderer |
    null {
    return this.rendererValue;
  }


  get interaction():
    UniverseInteractionController |
    null {
    return this.interactionValue;
  }


  get ready():
    boolean {
    return (
      this.statusValue ===
      "ready" &&
      this.runtimeValue !==
        null &&
      this.rendererValue !==
        null &&
      this.interactionValue !==
        null
    );
  }


  get disposed():
    boolean {
    return this.disposedValue;
  }


  private assertUsable():
    void {
    if (
      this.disposedValue
    ) {
      throw new Error(
        "UniverseSession has been disposed.",
      );
    }
  }


  private requireRuntime():
    UniverseRuntime {
    const runtime =
      this.runtimeValue;

    if (
      !runtime
    ) {
      throw new Error(
        "Universe runtime is not ready.",
      );
    }

    return runtime;
  }


  private requireRenderer():
    ThreeUniverseRenderer {
    const renderer =
      this.rendererValue;

    if (
      !renderer
    ) {
      throw new Error(
        "Universe renderer is not ready.",
      );
    }

    return renderer;
  }


  private requireInteraction():
    UniverseInteractionController {
    const interaction =
      this.interactionValue;

    if (
      !interaction
    ) {
      throw new Error(
        "Universe interaction controller is not ready.",
      );
    }

    return interaction;
  }


  private setStatus(
    status:
      UniverseSessionStatus,
  ): void {
    if (
      this.statusValue ===
      status
    ) {
      return;
    }

    this.statusValue =
      status;

    this.callbacks
      .onStatus?.(
        status,
      );

    this.bumpRevision(
      true,
    );
  }


  private fail(
    stage:
      UniverseSessionStatus,

    cause:
      unknown,
  ): void {
    const message =
      cause instanceof
      Error
        ? cause.message
        : String(
            cause,
          );

    const error:
      UniverseSessionError = {
      stage,

      message,

      cause,
    };

    this.errorValue =
      error;

    this.statusValue =
      "failed";

    this.callbacks
      .onStatus?.(
        "failed",
      );

    this.callbacks
      .onError?.(
        error,
      );

    this.bumpRevision(
      true,
    );
  }


  private bumpRevision(
    notify:
      boolean,
  ): void {
    this.revisionValue++;

    if (
      notify
    ) {
      this.emitSnapshot();
    }
  }


  private emitSnapshot():
    void {
    this.callbacks
      .onSnapshot?.(
        this.snapshot(),
      );
  }


  private rebuildDerivedState():
    void {
    const views:
      UniverseObjectView[] = [];

    const records =
      new Map<
        EntityId,
        SearchRecord
      >();


    for (
      const entity
      of this.stateValue
        .entities
        .values()
    ) {
      views.push(
        objectViewFromEntity(
          entity,
          this.stateValue,
        ),
      );

      records.set(
        entity.id,

        createSearchRecord(
          entity,
        ),
      );
    }


    views.sort(
      (
        left,
        right,
      ) => {
        if (
          left.id ===
          "sun"
        ) {
          return -1;
        }

        if (
          right.id ===
          "sun"
        ) {
          return 1;
        }


        const leftDistance =
          left
            .distanceFromOriginMeters ??
          Number.POSITIVE_INFINITY;

        const rightDistance =
          right
            .distanceFromOriginMeters ??
          Number.POSITIVE_INFINITY;


        if (
          leftDistance !==
          rightDistance
        ) {
          return (
            leftDistance -
            rightDistance
          );
        }


        return left.name.localeCompare(
          right.name,
        );
      },
    );


    this.objectViewsValue =
      views;

    this.searchRecords =
      records;
  }


  private updateState(
    state:
      UniverseState,

    forceNotification =
      false,
  ): void {
    const entitiesChanged =
      state.entities !==
      this.stateValue.entities;


    this.stateValue =
      state;


    if (
      entitiesChanged
    ) {
      this.rebuildDerivedState();
    } else {
      this.objectViewsValue =
        this.objectViewsValue.map(
          view => ({
            ...view,

            selected:
              state.selectedId ===
              view.id,

            focused:
              state.focusId ===
              view.id,
          }),
        );
    }


    const now =
      performance.now();


    if (
      !forceNotification &&
      now -
        this.lastStateNotification <
      this.stateSyncIntervalMs
    ) {
      return;
    }


    this.lastStateNotification =
      now;

    this.bumpRevision(
      true,
    );
  }


/* ============================================================
   CHECKPOINT 4
   Initialization and lifecycle
   ============================================================ */


  async initialize():
    Promise<void> {
    this.assertUsable();


    if (
      this.ready
    ) {
      return;
    }


    if (
      this.initializingPromise
    ) {
      return this.initializingPromise;
    }


    const token =
      ++this.initializationToken;


    const initialize =
      async () => {
        try {
          this.errorValue =
            null;


          this.setStatus(
            "initializing-renderer",
          );


          const renderer =
            new ThreeUniverseRenderer({
              background:
                this.rendererBackground,

              antialias:
                true,

              detailedObjectLimit:
                this.detailedObjectLimit,

              starCount:
                this.starCount,
            });


          this.rendererValue =
            renderer;


          await renderer.initialize(
            this.container,
          );


          if (
            token !==
              this.initializationToken ||
            this.disposedValue
          ) {
            renderer.dispose();

            return;
          }


          this.installResizeObserver();


          this.setStatus(
            "initializing-runtime",
          );


          const initialState =
            this.createInitialState();


          const runtime =
            new UniverseRuntime({
              state:
                initialState,

              renderer,
            });


          this.runtimeValue =
            runtime;


          const proceduralStream =
            createWorldStream(
              this.proceduralSeed,
              {
                loadRadiusSectors:
                  1,

                retainRadiusSectors:
                  2,

                maximumGenerationsPerTick:
                  4,
              },
            );


          this.proceduralStreamValue =
            proceduralStream;


          this.proceduralBridgeValue =
            new ProceduralEntityBridge(
              proceduralStream,
              runtime.store,
            );


          /* Wire DiscoveryLog — record every procedural system that streams in */
          proceduralStream.subscribe(event => {
            if (event.type === "system-ready") {
              const anomaly = classifyAnomalies(event.system);
              const star = event.system.stars[0];
              this.discoveryLog.visit({
                id: event.system.id,
                name: star?.name ?? event.system.id,
                kind: "star-system",
                origin: "procedural",
                anomalyScore: anomaly.score,
                seedKey: event.system.seedKey,
                tags: anomaly.classes as string[],
                coordinates: {
                  positionLy: event.system.positionLy,
                  label: star?.name ?? event.system.id,
                },
              });
            }
          });


          this.stateValue =
            initialState;


          this.rebuildDerivedState();


          this.installRuntimeSubscription();


          this.setStatus(
            "loading-reality",
          );


          await this.loadInitialReality(
            token,
          );


          if (
            token !==
              this.initializationToken ||
            this.disposedValue
          ) {
            return;
          }


          this.updateProceduralStreaming(
            runtime.store.getSnapshot(),
          );


          this.setStatus(
            "starting-interaction",
          );


          this.installInteraction();


          this.installStatsPolling();


          runtime.start();


          this.interactionValue
            ?.start();


          this.updateRendererStats();


          this.setStatus(
            "ready",
          );


          this.bumpRevision(
            true,
          );
        } catch (
          cause
        ) {
          if (
            token ===
              this.initializationToken &&
            !this.disposedValue
          ) {
            this.fail(
              this.statusValue,
              cause,
            );
          }

          throw cause;
        } finally {
          if (
            token ===
            this.initializationToken
          ) {
            this.initializingPromise =
              null;
          }
        }
      };


    this.initializingPromise =
      initialize();


    return this.initializingPromise;
  }


  private createInitialState():
    UniverseState {
    const state =
      createDefaultUniverseState();


    return {
      ...state,

      selectedId:
        this.initialSelectedId,

      focusId:
        this.initialFocusId,

      camera: {
        ...state.camera,

        targetId:
          this.initialFocusId,
      },
    };
  }


  private async loadInitialReality(
    token:
      number,
  ): Promise<void> {
    const runtime =
      this.requireRuntime();


    const state =
      runtime
        .store
        .getSnapshot();


    const entities =
      await createSolarSystemSnapshot(
        state
          .clock
          .time
          .julianDay,
      );


    if (
      token !==
        this.initializationToken ||
      this.disposedValue
    ) {
      return;
    }


    runtime.store.replaceEntities(
      entities,
    );


    const afterLoad =
      runtime
        .store
        .getSnapshot();


    const selectedId =
      afterLoad
        .entities
        .has(
          this.initialSelectedId,
        )
        ? this.initialSelectedId
        : afterLoad
            .entities
            .has(
              DEFAULT_SELECTED_ID,
            )
          ? DEFAULT_SELECTED_ID
          : undefined;


    const focusId =
      afterLoad
        .entities
        .has(
          this.initialFocusId,
        )
        ? this.initialFocusId
        : afterLoad
            .entities
            .has(
              DEFAULT_FOCUS_ID,
            )
          ? DEFAULT_FOCUS_ID
          : selectedId;


    if (
      selectedId
    ) {
      runtime.store.select(
        selectedId,
      );
    }


    if (
      focusId
    ) {
      runtime.store.focus(
        focusId,
      );
    }


    const loaded =
      runtime
        .store
        .getSnapshot();


    runtime.store.setCamera({
      ...loaded.camera,

      frameId:
        FRAME_SOLAR_HELIOCENTRIC,

      position: [
        42,
        25,
        72,
      ],

      velocity: [
        0,
        0,
        0,
      ],

      fieldOfView:
        52,

      targetId:
        focusId,
    });


    this.updateState(
      runtime
        .store
        .getSnapshot(),
      true,
    );
  }


  private installRuntimeSubscription():
    void {
    this.stateUnsubscribe?.();


    const runtime =
      this.requireRuntime();


    this.stateUnsubscribe =
      runtime.store.subscribe(
        state => {
          if (
            this.disposedValue
          ) {
            return;
          }


          this.updateState(
            state,
          );
        },
      );
  }


  private installResizeObserver():
    void {
    this.resizeObserver
      ?.disconnect();


    const renderer =
      this.requireRenderer();


    const resize =
      (
        width:
          number,

        height:
          number,
      ) => {
        const pixelRatio =
          typeof window ===
          "undefined"
            ? 1
            : clampSessionNumber(
                window
                  .devicePixelRatio ||
                  1,

                0.5,

                this.pixelRatioLimit,
              );


        renderer.resize(
          Math.max(
            1,
            width,
          ),

          Math.max(
            1,
            height,
          ),

          pixelRatio,
        );
      };


    resize(
      this.container
        .clientWidth ||
        1,

      this.container
        .clientHeight ||
        1,
    );


    if (
      typeof ResizeObserver ===
      "undefined"
    ) {
      return;
    }


    this.resizeObserver =
      new ResizeObserver(
        entries => {
          if (
            this.disposedValue
          ) {
            return;
          }


          const entry =
            entries[0];


          if (
            !entry
          ) {
            return;
          }


          resize(
            entry
              .contentRect
              .width,

            entry
              .contentRect
              .height,
          );
        },
      );


    this.resizeObserver.observe(
      this.container,
    );
  }


  private installInteraction():
    void {
    this.interactionValue
      ?.dispose();


    const runtime =
      this.requireRuntime();


    const renderer =
      this.requireRenderer();


    this.interactionValue =
      createUniverseInteraction({
        runtime,

        renderer,

        element:
          this.container,

        callbacks: {
          onStateChange:
            state => {
              this.updateState(
                state,
              );
            },

          onSelection:
            id => {
              const entity =
                id
                  ? this.objectById(
                      id,
                    )
                  : null;


              this.callbacks
                .onSelection?.(
                  entity,
                );
            },

          onTravelStart:
            id => {
              const entity =
                this.objectById(
                  id,
                );


              if (
                entity
              ) {
                this.callbacks
                  .onTravelStart?.(
                    entity,
                  );
              }
            },

          onTravelComplete:
            id => {
              const entity =
                this.objectById(
                  id,
                );


              if (
                entity
              ) {
                this.callbacks
                  .onTravelComplete?.(
                    entity,
                  );
              }


              this.bumpRevision(
                true,
              );
            },

          onSearchRequest:
            () => {
              this.callbacks
                .onSearchRequest?.();
            },

          onCatalogToggle:
            () => {
              this.toggleCatalog();
            },

          onEscape:
            () => {
              if (
                this.catalogOpenValue
              ) {
                this.setCatalogOpen(
                  false,
                );
              }
            },

          onHome:
            () => {
              this.bumpRevision(
                true,
              );
            },
        },
      });
  }


  private installStatsPolling():
    void {
    if (
      this.statsTimer !==
      null
    ) {
      window.clearInterval(
        this.statsTimer,
      );
    }


    this.statsTimer =
      window.setInterval(
        () => {
          if (
            this.disposedValue
          ) {
            return;
          }


          const runtime =
            this.runtimeValue;


          if (
            runtime
          ) {
            this.updateProceduralStreaming(
              runtime.store.getSnapshot(),
            );
          }


          this.updateRendererStats();
        },

        this.statsIntervalMs,
      );
  }


  private updateProceduralStreaming(
    state:
      UniverseState,
  ): void {
    const stream =
      this.proceduralStreamValue;


    if (
      !stream
    ) {
      return;
    }


    const metersPerUnit =
      state.scale.metersPerUnit;


    const positionLy =
      state.camera.position.map(
        value =>
          value *
          metersPerUnit /
          METERS_PER_UNIT.ly,
      ) as [number, number, number];


    const velocityLyPerSecond =
      state.camera.velocity.map(
        value =>
          value *
          metersPerUnit /
          METERS_PER_UNIT.ly,
      ) as [number, number, number];


    stream.updateObserver(
      {
        positionLy,
        velocityLyPerSecond,
      },
      4,
    );
  }


  private updateRendererStats():
    void {
    const renderer =
      this.rendererValue;


    if (
      !renderer
    ) {
      return;
    }


    this.rendererStatsValue =
      cloneRendererStats(
        renderer.getStats(),
      );


    this.bumpRevision(
      true,
    );
  }


/* ============================================================
   CHECKPOINT 5
   Search, catalog and selection
   ============================================================ */


  objects():
    readonly UniverseObjectView[] {
    return this.objectViewsValue.map(
      view => ({
        ...view,

        aliases: [
          ...view.aliases,
        ],

        sourceIds: [
          ...view.sourceIds,
        ],
      }),
    );
  }


  objectById(
    id:
      EntityId,
  ):
    UniverseObjectView |
    null {
    const entity =
      this.stateValue
        .entities
        .get(
          id,
        );


    if (
      !entity
    ) {
      return null;
    }


    return objectViewFromEntity(
      entity,
      this.stateValue,
    );
  }


  entityById(
    id:
      EntityId,
  ):
    SpaceEntity |
    null {
    return (
      this.stateValue
        .entities
        .get(
          id,
        ) ??
      null
    );
  }


  selectedObject():
    UniverseObjectView |
    null {
    const id =
      this.stateValue
        .selectedId;


    if (
      !id
    ) {
      return null;
    }


    return this.objectById(
      id,
    );
  }


  focusedObject():
    UniverseObjectView |
    null {
    const id =
      this.stateValue
        .focusId;


    if (
      !id
    ) {
      return null;
    }


    return this.objectById(
      id,
    );
  }


  scienceFor(
    id:
      EntityId,
  ):
    UniverseScienceView |
    null {
    const entity =
      this.entityById(
        id,
      );


    if (
      !entity
    ) {
      return null;
    }


    return scienceViewFromEntity(
      entity,
    );
  }


  selectedScience():
    UniverseScienceView |
    null {
    const id =
      this.stateValue
        .selectedId ??
      this.stateValue
        .focusId;


    if (
      !id
    ) {
      return null;
    }


    return this.scienceFor(
      id,
    );
  }


  setSearchQuery(
    query:
      string,
  ): void {
    const next =
      query;


    if (
      this.searchQueryValue ===
      next
    ) {
      return;
    }


    this.searchQueryValue =
      next;


    this.bumpRevision(
      true,
    );
  }


  clearSearch():
    void {
    this.setSearchQuery(
      "",
    );
  }


  search(
    query =
      this.searchQueryValue,

    limit =
      20,
  ):
    UniverseSearchResult[] {
    const normalizedQuery =
      normalizeSearchText(
        query,
      );


    const safeLimit =
      Math.max(
        1,
        Math.floor(
          limit,
        ),
      );


    if (
      normalizedQuery.length ===
      0
    ) {
      return this.objectViewsValue
        .slice(
          0,
          safeLimit,
        )
        .map(
          entity => ({
            entity: {
              ...entity,

              aliases: [
                ...entity.aliases,
              ],

              sourceIds: [
                ...entity.sourceIds,
              ],
            },

            score:
              0,

            matchedName:
              false,

            matchedAlias:
              false,

            matchedKind:
              false,

            matchedSummary:
              false,
          }),
        );
    }


    const queryTokens =
      searchTokens(
        normalizedQuery,
      );


    const results:
      UniverseSearchResult[] = [];


    for (
      const record
      of this.searchRecords
        .values()
    ) {
      const score =
        scoreSearchRecord(
          record,
          normalizedQuery,
          queryTokens,
        );


      if (
        score <=
        0
      ) {
        continue;
      }


      const entity =
        this.objectById(
          record.id,
        );


      if (
        !entity
      ) {
        continue;
      }


      results.push({
        entity,

        score,

        matchedName:
          record
            .normalizedName
            .includes(
              normalizedQuery,
            ),

        matchedAlias:
          record
            .normalizedAliases
            .some(
              alias =>
                alias.includes(
                  normalizedQuery,
                ),
            ),

        matchedKind:
          record
            .normalizedKind
            .includes(
              normalizedQuery,
            ),

        matchedSummary:
          record
            .normalizedSummary
            .includes(
              normalizedQuery,
            ),
      });
    }


    results.sort(
      (
        left,
        right,
      ) => {
        if (
          left.score !==
          right.score
        ) {
          return (
            right.score -
            left.score
          );
        }


        return left
          .entity
          .name
          .localeCompare(
            right
              .entity
              .name,
          );
      },
    );


    return results.slice(
      0,
      safeLimit,
    );
  }


  select(
    id:
      EntityId,
  ):
    boolean {
    this.assertUsable();


    if (
      !this.stateValue
        .entities
        .has(
          id,
        )
    ) {
      return false;
    }


    const interaction =
      this.interactionValue;


    if (
      interaction
    ) {
      interaction.select(
        id,
      );
    } else {
      this.requireRuntime()
        .store
        .select(
          id,
        );
    }


    this.updateState(
      this.requireRuntime()
        .store
        .getSnapshot(),
      true,
    );


    const selected =
      this.objectById(
        id,
      );


    this.callbacks
      .onSelection?.(
        selected,
      );


    return true;
  }


  travelTo(
    id:
      EntityId,
  ):
    boolean {
    this.assertUsable();


    if (
      !this.stateValue
        .entities
        .has(
          id,
        )
    ) {
      return false;
    }


    return this
      .requireInteraction()
      .travelTo(
        id,
      );
  }


  focusImmediately(
    id:
      EntityId,
  ):
    boolean {
    this.assertUsable();


    if (
      !this.stateValue
        .entities
        .has(
          id,
        )
    ) {
      return false;
    }


    return this
      .requireInteraction()
      .focusImmediately(
        id,
      );
  }


/* ============================================================
   CHECKPOINT 6
   View modes, overlays and navigation
   ============================================================ */


  setMode(
    mode:
      UniverseViewMode,
  ): void {
    if (
      this.modeValue ===
      mode
    ) {
      return;
    }


    this.modeValue =
      mode;


    this.callbacks
      .onModeChange?.(
        mode,
      );


    this.bumpRevision(
      true,
    );
  }


  toggleMode():
    UniverseViewMode {
    const next:
      UniverseViewMode =
      this.modeValue ===
      "explore"
        ? "science"
        : "explore";


    this.setMode(
      next,
    );


    return next;
  }


  setCatalogOpen(
    open:
      boolean,
  ): void {
    if (
      this.catalogOpenValue ===
      open
    ) {
      return;
    }


    this.catalogOpenValue =
      open;


    this.callbacks
      .onCatalogChange?.(
        open,
      );


    this.bumpRevision(
      true,
    );
  }


  toggleCatalog():
    boolean {
    const next =
      !this.catalogOpenValue;


    this.setCatalogOpen(
      next,
    );


    return next;
  }


  overlayEnabled(
    overlay:
      UniverseOverlayName,
  ):
    boolean {
    return this.stateValue
      .overlays[
      overlay
    ];
  }


  setOverlay(
    overlay:
      UniverseOverlayName,

    enabled:
      boolean,
  ): void {
    this.assertUsable();


    const runtime =
      this.requireRuntime();


    const current =
      runtime
        .store
        .getSnapshot();


    if (
      current
        .overlays[
        overlay
      ] ===
      enabled
    ) {
      return;
    }


    runtime.store.setOverlays({
      ...current.overlays,

      [overlay]:
        enabled,
    });


    this.updateState(
      runtime
        .store
        .getSnapshot(),
      true,
    );
  }


  toggleOverlay(
    overlay:
      UniverseOverlayName,
  ):
    boolean {
    const next =
      !this.overlayEnabled(
        overlay,
      );


    this.setOverlay(
      overlay,
      next,
    );


    return next;
  }


  home():
    void {
    this.assertUsable();


    this.requireInteraction()
      .home();


    this.updateState(
      this.requireRuntime()
        .store
        .getSnapshot(),
      true,
    );
  }


  scaleIn():
    void {
    this.assertUsable();


    this.requireInteraction()
      .changeScale(
        "in",
      );


    this.updateState(
      this.requireRuntime()
        .store
        .getSnapshot(),
      true,
    );
  }


  scaleOut():
    void {
    this.assertUsable();


    this.requireInteraction()
      .changeScale(
        "out",
      );


    this.updateState(
      this.requireRuntime()
        .store
        .getSnapshot(),
      true,
    );
  }


  cancelTravel():
    void {
    this.interactionValue
      ?.cancelFlight();


    this.bumpRevision(
      true,
    );
  }


/* ============================================================
   CHECKPOINT 7
   Reality refresh and scientific time
   ============================================================ */


  async refreshReality():
    Promise<void> {
    this.assertUsable();


    const runtime =
      this.requireRuntime();


    const state =
      runtime
        .store
        .getSnapshot();


    const selectedId =
      state.selectedId;


    const focusId =
      state.focusId;


    const entities =
      await createSolarSystemSnapshot(
        state
          .clock
          .time
          .julianDay,
      );


    if (
      this.disposedValue
    ) {
      return;
    }


    runtime.store.replaceEntities(
      entities,
    );


    const updated =
      runtime
        .store
        .getSnapshot();


    if (
      selectedId &&
      updated
        .entities
        .has(
          selectedId,
        )
    ) {
      runtime.store.select(
        selectedId,
      );
    }


    if (
      focusId &&
      updated
        .entities
        .has(
          focusId,
        )
    ) {
      runtime.store.focus(
        focusId,
      );
    }


    this.interactionValue
      ?.resync();


    this.updateState(
      runtime
        .store
        .getSnapshot(),
      true,
    );
  }


  simulationDate():
    Date {
    return julianDayToDate(
      this.stateValue
        .clock
        .time
        .julianDay,
    );
  }


  simulationJulianDay():
    number {
    return this.stateValue
      .clock
      .time
      .julianDay;
  }


/* ============================================================
   CHECKPOINT 8
   Formatting helpers for the future UI
   ============================================================ */


  formatDistance(
    meters:
      number |
      null,
  ):
    string {
    if (
      meters ===
        null ||
      !Number.isFinite(
        meters,
      )
    ) {
      return "Unknown";
    }


    const magnitude =
      Math.abs(
        meters,
      );


    if (
      magnitude >=
      METERS_PER_UNIT.ly *
        0.01
    ) {
      return `${convertDistance(
        meters,
        "m",
        "ly",
      ).toFixed(3)} ly`;
    }


    if (
      magnitude >=
      METERS_PER_UNIT.au *
        0.02
    ) {
      return `${convertDistance(
        meters,
        "m",
        "au",
      ).toFixed(4)} AU`;
    }


    if (
      magnitude >=
      1_000_000
    ) {
      return `${convertDistance(
        meters,
        "m",
        "km",
      ).toLocaleString(
        undefined,
        {
          maximumFractionDigits:
            0,
        },
      )} km`;
    }


    if (
      magnitude >=
      1_000
    ) {
      return `${convertDistance(
        meters,
        "m",
        "km",
      ).toLocaleString(
        undefined,
        {
          maximumFractionDigits:
            2,
        },
      )} km`;
    }


    return `${meters.toLocaleString(
      undefined,
      {
        maximumFractionDigits:
          2,
      },
    )} m`;
  }


  formatMass(
    kilograms:
      number |
      null,
  ):
    string {
    if (
      kilograms ===
        null ||
      !Number.isFinite(
        kilograms,
      )
    ) {
      return "Unknown";
    }


    if (
      kilograms ===
      0
    ) {
      return "0 kg";
    }


    if (
      Math.abs(
        kilograms,
      ) >=
      1e9
    ) {
      return `${kilograms.toExponential(
        4,
      )} kg`;
    }


    return `${kilograms.toLocaleString(
      undefined,
      {
        maximumFractionDigits:
          2,
      },
    )} kg`;
  }


  formatCoordinate(
    value:
      number |
      null,
  ):
    string {
    if (
      value ===
        null ||
      !Number.isFinite(
        value,
      )
    ) {
      return "Unknown";
    }


    const magnitude =
      Math.abs(
        value,
      );


    if (
      magnitude >=
        1e6 ||
      (
        magnitude >
          0 &&
        magnitude <
          0.001
      )
    ) {
      return value.toExponential(
        5,
      );
    }


    return value.toLocaleString(
      undefined,
      {
        maximumFractionDigits:
          6,
      },
    );
  }


/* ============================================================
   CHECKPOINT 9
   Snapshots and diagnostics
   ============================================================ */


  metrics():
    UniverseSessionMetrics {
    return {
      renderer:
        cloneRendererStats(
          this.rendererStatsValue,
        ),

      entityCount:
        this.stateValue
          .entities
          .size,

      selectedId:
        this.stateValue
          .selectedId ??
        null,

      focusedId:
        this.stateValue
          .focusId ??
        null,

      simulationJulianDay:
        this.stateValue
          .clock
          .time
          .julianDay,

      scaleMetersPerUnit:
        this.stateValue
          .scale
          .metersPerUnit,

      scaleBand:
        this.stateValue
          .scale
          .band,

      frameId:
        this.stateValue
          .scale
          .frameId,
    };
  }


  snapshot():
    UniverseSessionSnapshot {
    return {
      version:
        UNIVERSE_SESSION_VERSION,

      revision:
        this.revisionValue,

      status:
        this.statusValue,

      mode:
        this.modeValue,

      catalogOpen:
        this.catalogOpenValue,

      searchQuery:
        this.searchQueryValue,

      state:
        this.stateValue,

      selected:
        this.selectedObject(),

      focused:
        this.focusedObject(),

      objects:
        this.objects(),

      renderer:
        cloneRendererStats(
          this.rendererStatsValue,
        ),

      interaction:
        this.interactionValue
          ?.snapshot() ??
        null,

      error:
        this.errorValue,

      simulationDate:
        this.simulationDate(),
    };
  }


  diagnostics():
    UniverseSessionDiagnostics {
    return {
      status:
        this.statusValue,

      disposed:
        this.disposedValue,

      runtimeReady:
        this.runtimeValue !==
        null,

      rendererReady:
        this.rendererValue !==
        null,

      interactionReady:
        this.interactionValue !==
        null,

      resizeObserverActive:
        this.resizeObserver !==
        null,

      statsTimerActive:
        this.statsTimer !==
        null,

      subscriptionActive:
        this.stateUnsubscribe !==
        null,

      entityCount:
        this.stateValue
          .entities
          .size,

      revision:
        this.revisionValue,
    };
  }


/* ============================================================
   CHECKPOINT 10
   Cleanup
   ============================================================ */


  dispose():
    void {
    if (
      this.disposedValue
    ) {
      return;
    }


    this.disposedValue =
      true;


    this.initializationToken++;


    this.interactionValue
      ?.dispose();


    this.interactionValue =
      null;


    this.resizeObserver
      ?.disconnect();


    this.resizeObserver =
      null;


    this.stateUnsubscribe?.();


    this.stateUnsubscribe =
      null;


    this.proceduralBridgeValue
      ?.dispose();


    this.proceduralBridgeValue =
      null;


    this.proceduralStreamValue
      ?.dispose();


    this.proceduralStreamValue =
      null;


    if (
      this.statsTimer !==
      null
    ) {
      window.clearInterval(
        this.statsTimer,
      );


      this.statsTimer =
        null;
    }


    const runtime =
      this.runtimeValue;


    this.runtimeValue =
      null;


    if (
      runtime
    ) {
      runtime.dispose();
    } else {
      this.rendererValue
        ?.dispose();
    }


    this.rendererValue =
      null;


    this.searchRecords.clear();


    this.objectViewsValue =
      [];


    /* Persist exploration data on dispose */
    try {
      this.discoveryLog.saveToLocalStorage();
      this.poiSystem.saveToLocalStorage();
      this.markerApi.saveToLocalStorage();
    } catch { /* quota or SSR */ }


    this.statusValue =
      "disposed";


    this.callbacks
      .onStatus?.(
        "disposed",
      );


    this.revisionValue++;
  /* === Phase 1: Exploration API === */

  flyToEntity(entityId: EntityId): void {
    try {
      this.travelTo(entityId);
      const entity = this.entityById(entityId);
      if (entity) {
        this.discoveryLog.visit({
          id: entityId,
          name: entity.name,
          kind: entity.kind as "star-system" | "star" | "planet" | "moon" | "galaxy" | "asteroid-belt" | "anomaly" | "landmark",
          origin: entity.tags?.includes("procedural") ? "procedural" : "reality",
        });
      }
    } catch { /* entity may not be loaded yet */ }
  }

  addWaypointForEntity(entityId: EntityId): void {
    const entity = this.entityById(entityId);
    if (!entity) return;
    const ly: [number, number, number] = [0, 0, 0];
    if (entity.spatial) {
      const { position, unit } = entity.spatial;
      if (unit === "ly") {
        ly[0] = position[0]; ly[1] = position[1]; ly[2] = position[2];
      }
    }
    this.waypointSystem.addEntity(entityId, entity.name, ly);
  }

  activateWaypoint(waypointId: string): void {
    this.waypointSystem.activate(waypointId);
    const wp = this.waypointSystem.active;
    if (wp?.entityId) {
      this.flyToEntity(wp.entityId);
    }
  }
}


export function createUniverseSession(
  options:
    UniverseSessionOptions,
):
  UniverseSession {
  return new UniverseSession(
    options,
  );
}


export function universeSessionInfo() {
  return {
    version:
      UNIVERSE_SESSION_VERSION,

    responsibilities: [
      "renderer-lifecycle",
      "runtime-lifecycle",
      "scientific-reality-loading",
      "interaction-lifecycle",
      "resize-management",
      "renderer-statistics",
      "state-synchronization",
      "catalog-management",
      "search-ranking",
      "object-presentation",
      "science-presentation",
      "explore-science-mode",
      "overlay-management",
      "travel-management",
      "scale-navigation",
      "session-diagnostics",
      "cleanup",
    ] as const,
  };
}