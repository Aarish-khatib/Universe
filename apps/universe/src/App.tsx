import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
  scaleBandFor,
  scaleForBand,
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
  UniverseHUD,
} from "./Components/UniverseHUD";

import SettingsPanel from "./Components/SettingsPanel";
import { DiscoveryPanel } from "./Components/DiscoveryPanel";
import { WaypointPanel } from "./Components/WaypointPanel";
import { DiscoveryToast } from "./Components/DiscoveryToast";
import { AtmosphericOverlay } from "./Components/AtmosphericOverlay";
import { PoiPanel } from "./Components/PoiPanel";
import { DiscoveryLog } from "@known-universe/engine";
import { WaypointSystem } from "@known-universe/engine";
import { PoiSystem } from "@known-universe/engine";
import { DiscoveryNotificationQueue } from "@known-universe/engine";


import "./App.css";

type BootState =
  | "booting"
  | "loading"
  | "ready"
  | "error";

type SceneVec =
  [number, number, number];

type ScaleBand =
  | "surface"
  | "regional"
  | "planet"
  | "orbital"
  | "system"
  | "stellar"
  | "galactic"
  | "intergalactic"
  | "cosmic";

type CameraMode =
  | "orbit"
  | "free"
  | "surface"
  | "chase"
  | "cinematic"
  | "scale"
  | "observer";

type OverlayKey =
  | "labels"
  | "orbits"
  | "gravity"
  | "humanity"
  | "knowledge";

interface HumanitySnapshot {
  civilizationName: string;
  estimatedKardashev: number;
  energyUseWatts: number;
  technologicalLevel: string;
  interstellarCapability: string;
  lightConeStatus: string;
}

const EMPTY_STATS: RendererStats = {
  backend: "three",

  drawCalls: 0,

  triangles: 0,

  points: 0,

  lines: 0,

  objects: 0,

  sceneObjects: 0,

  frameMs: 0,

  visibleEntities: 0,
};

const DISPLAY_RADIUS: Readonly<
  Record<string, number>
> = {
  sun: 1.05,

  mercury: 0.18,

  venus: 0.28,

  earth: 0.3,

  moon: 0.13,

  mars: 0.23,

  jupiter: 0.58,

  saturn: 0.54,

  uranus: 0.39,

  neptune: 0.39,
};

const SCALE_PRESETS: Readonly<
  Record<ScaleBand, number>
> = {
  surface: 1,

  regional: 1_000,

  planet: 10_000,

  orbital: 1_000_000,

  system: 50_000_000_000,

  stellar: 100_000_000_000,

  galactic: 1e15,

  intergalactic: 1e18,

  cosmic: 1e21,
};

const HUMANITY_STATUS: HumanitySnapshot = {
  civilizationName: "Human civilization",

  estimatedKardashev: 0.73,

  energyUseWatts: 2.1e13,

  technologicalLevel: "Planetary technological civilization",

  interstellarCapability: "Pre-interstellar",

  lightConeStatus: "One inhabited world known",
};

function clamp(
  value: number,

  minimum: number,

  maximum: number,
): number {
  return Math.min(
    maximum,

    Math.max(minimum, value),
  );
}

function add(
  left: SceneVec,

  right: SceneVec,
): SceneVec {
  return [
    left[0] + right[0],

    left[1] + right[1],

    left[2] + right[2],
  ];
}

function subtract(
  left: SceneVec,

  right: SceneVec,
): SceneVec {
  return [
    left[0] - right[0],

    left[1] - right[1],

    left[2] - right[2],
  ];
}

function multiply(
  value: SceneVec,

  scalar: number,
): SceneVec {
  return [
    value[0] * scalar,

    value[1] * scalar,

    value[2] * scalar,
  ];
}

function length(
  value: SceneVec,
): number {
  return Math.sqrt(
    value[0] * value[0] +
      value[1] * value[1] +
      value[2] * value[2],
  );
}

function normalize(
  value: SceneVec,

  fallback: SceneVec = [0, 0, -1],
): SceneVec {
  const magnitude = length(value);

  if (
    magnitude < 1e-9 ||
    !Number.isFinite(magnitude)
  ) {
    return [
      fallback[0],
      fallback[1],
      fallback[2],
    ];
  }

  return [
    value[0] / magnitude,

    value[1] / magnitude,

    value[2] / magnitude,
  ];
}

function cross(
  left: SceneVec,

  right: SceneVec,
): SceneVec {
  return [
    left[1] * right[2] -
      left[2] * right[1],

    left[2] * right[0] -
      left[0] * right[2],

    left[0] * right[1] -
      left[1] * right[0],
  ];
}

function mix(
  from: SceneVec,

  to: SceneVec,

  amount: number,
): SceneVec {
  return [
    from[0] +
      (to[0] - from[0]) * amount,

    from[1] +
      (to[1] - from[1]) * amount,

    from[2] +
      (to[2] - from[2]) * amount,
  ];
}

function smoothStep(
  amount: number,
): number {
  const value = clamp(
    amount,

    0,

    1,
  );

  return value *
    value *
    (3 - 2 * value);
}

function createApplicationState(): UniverseState {
  const base =
    createInitialUniverseState({
      julianDay:
        dateToJulianDay(
          new Date(),
        ),

      scale: "UTC",
    });

  return {
    ...base,

    selectedId: "earth",

    focusId: "sun",

    camera: {
      ...base.camera,

      mode: "orbit",

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

      targetId: "sun",

      fieldOfView: 52,

      baseSpeed: 12,
    },

    scale: {
      band: "system",

      frameId:
        FRAME_SOLAR_HELIOCENTRIC,

      metersPerUnit:
        SCALE_PRESETS.system,
    },

    overlays: {
      ...base.overlays,

      labels: true,

      orbits: true,

      knowledge: true,

      humanity: false,

      gravity: false,
    },

    settings: {
      ...base.settings,

      graphics: {
        ...base.settings.graphics,

        orbitLines: true,

        atmosphere: true,

        maxVisibleObjects: 10_000,
      },

      navigation: {
        ...base.settings.navigation,

        cinematicTravel: true,

        movementSpeed: 4,

        fastMultiplier: 4,

        precisionMultiplier: 0.18,
      },
    },
  };
}

function scenePosition(
  entity: SpaceEntity,

  state: UniverseState,
): SceneVec | null {
  const spatial =
    entity.spatial;

  if (
    !spatial ||
    spatial.frameId !== state.scale.frameId
  ) {
    return null;
  }

  const unit =
    METERS_PER_UNIT[
      spatial.unit
    ];

  const divisor =
    state.scale.metersPerUnit;

  if (
    !Number.isFinite(divisor) ||
    divisor <= 0
  ) {
    return null;
  }

  return [
    (spatial.position[0] * unit) /
      divisor,

    (spatial.position[1] * unit) /
      divisor,

    (spatial.position[2] * unit) /
      divisor,
  ];
}

function targetCenter(
  state: UniverseState,
): SceneVec {
  const id =
    state.camera.targetId ??
    state.focusId ??
    state.selectedId;

  if (!id) {
    return [
      0,
      0,
      0,
    ];
  }

  const entity =
    state.entities.get(id);

  if (!entity) {
    return [
      0,
      0,
      0,
    ];
  }

  return (
    scenePosition(
      entity,
      state,
    ) ?? [
      0,
      0,
      0,
    ]
  );
}

function visualRadius(
  entity: SpaceEntity,

  state: UniverseState,
): number {
  const physical =
    entity.physical?.radiusM?.value;

  const physicalScene =
    physical !== undefined
      ? physical /
        state.scale.metersPerUnit
      : 0;

  return Math.max(
    physicalScene,

    DISPLAY_RADIUS[
      entity.id
    ] ?? 0.24,
  );
}

function distanceFromOrigin(
  entity: SpaceEntity,
): number | undefined {
  const spatial =
    entity.spatial;

  if (!spatial) {
    return undefined;
  }

  return convertDistance(
    vectorLength(
      spatial.position,
    ),

    spatial.unit,

    "m",
  );
}

function formatDistance(
  meters: number | undefined,
): string {
  if (
    meters === undefined ||
    !Number.isFinite(meters)
  ) {
    return "Unknown";
  }

  const magnitude =
    Math.abs(meters);

  if (
    magnitude >=
    METERS_PER_UNIT.ly * 0.01
  ) {
    return `${convertDistance(
      meters,
      "m",
      "ly",
    ).toFixed(3)} ly`;
  }

  if (
    magnitude >=
    METERS_PER_UNIT.au * 0.02
  ) {
    return `${convertDistance(
      meters,
      "m",
      "au",
    ).toFixed(4)} AU`;
  }

  if (
    magnitude >= 1_000
  ) {
    return `${convertDistance(
      meters,
      "m",
      "km",
    ).toLocaleString(
      undefined,
      {
        maximumFractionDigits: 1,
      },
    )} km`;
  }

  return `${meters.toFixed(1)} m`;
}

function formatMass(
  value: number | undefined,
): string {
  if (
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "Unknown";
  }

  return `${value.toExponential(4)} kg`;
}

function bodyGlyph(
  entity: SpaceEntity,
): string {
  switch (entity.id) {
    case "sun":
      return "â˜€";

    case "earth":
      return "â—‰";

    case "moon":
      return "â—";

    case "saturn":
      return "â—";

    default:
      return "â—";
  }
}

// Module-level exploration singletons — survive React re-renders
const _discoveryLog = DiscoveryLog.loadFromLocalStorage();
const _waypointSystem = new WaypointSystem();
const _poiSystem = PoiSystem.loadFromLocalStorage();
const _notificationQueue = new DiscoveryNotificationQueue();

function App() {
  const viewportRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const searchInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const runtimeRef =
    useRef<UniverseRuntime | null>(
      null,
    );

  const rendererRef =
    useRef<ThreeUniverseRenderer | null>(
      null,
    );

  const flyTokenRef =
    useRef(0);

  const [mode, setMode] =
    useState<
      "explore" | "science"
    >(
      "explore",
    );

  const [boot, setBoot] =
    useState<BootState>(
      "booting",
    );

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [state, setState] =
    useState<UniverseState>(
      () =>
        createApplicationState(),
    );

  const [stats, setStats] =
    useState<RendererStats>(
      EMPTY_STATS,
    );

  const refresh = () => {
    const runtime =
      runtimeRef.current;

    if (!runtime) {
      return;
    }

    setState(
      runtime.store.getSnapshot(),
    );
  };

  const cancelFlight = () => {
    flyTokenRef.current++;
  };

  const flyTo = (
    id: EntityId,

    duration = 920,
  ) => {
    const runtime =
      runtimeRef.current;

    if (!runtime) {
      return;
    }

    const original =
      runtime.store.getSnapshot();

    const entity =
      original.entities.get(id);

    if (!entity) {
      return;
    }

    cancelFlight();

    runtime.history.push(id);

    runtime.store.select(id);

    runtime.store.focus(id);

    const next =
      runtime.store.getSnapshot();

    const center =
      scenePosition(
        entity,
        next,
      );

    if (!center) {
      runtime.store.setCamera({
        ...next.camera,

        targetId: id,

        velocity: [
          0,
          0,
          0,
        ],
      });

      refresh();

      return;
    }

    const start: SceneVec = [
      next.camera.position[0],

      next.camera.position[1],

      next.camera.position[2],
    ];

    let direction =
      normalize(
        subtract(
          start,
          center,
        ),
        [
          0.56,
          0.24,
          0.79,
        ],
      );

    if (
      Math.abs(
        direction[1],
      ) < 0.08
    ) {
      direction =
        normalize(
          [
            direction[0],
            0.22,
            direction[2],
          ],
        );
    }

    const radius =
      visualRadius(
        entity,
        next,
      );

    const distance =
      clamp(
        radius *
          (
            entity.id === "sun"
              ? 7
              : 10
          ),

        entity.id === "sun"
          ? 8
          : 3.7,

        24,
      );

    const destination =
      add(
        center,
        multiply(
          direction,
          distance,
        ),
      );

    const token =
      ++flyTokenRef.current;

    const started =
      performance.now();

    const animate = (
      now: number,
    ) => {
      if (
        token !==
        flyTokenRef.current
      ) {
        return;
      }

      const progress =
        clamp(
          (now - started) /
            duration,

          0,

          1,
        );

      const eased =
        smoothStep(
          progress,
        );

      const position =
        mix(
          start,

          destination,

          eased,
        );

      const snapshot =
        runtime.store.getSnapshot();

      runtime.store.setCamera({
        ...snapshot.camera,

        mode:
          snapshot.camera.mode ===
          "orbit"
            ? "cinematic"
            : snapshot.camera.mode,

        frameId:
          snapshot.scale.frameId,

        targetId: id,

        position,

        velocity: [
          0,
          0,
          0,
        ],
      });

      if (
        progress < 1
      ) {
        requestAnimationFrame(
          animate,
        );
      } else {
        const completed =
          runtime.store.getSnapshot();

        runtime.store.setCamera({
          ...completed.camera,

          mode: "orbit",

          targetId: id,

          velocity: [
            0,
            0,
            0,
          ],
        });

        refresh();
      }
    };

    requestAnimationFrame(
      animate,
    );
  };

  const goHome = () => {
    const runtime =
      runtimeRef.current;

    if (!runtime) {
      return;
    }

    cancelFlight();

    runtime.dispatch(
      "home",
    );

    const current =
      runtime.store.getSnapshot();

    runtime.store.setScale({
      band: "system",

      frameId:
        FRAME_SOLAR_HELIOCENTRIC,

      metersPerUnit:
        SCALE_PRESETS.system,
    });

    runtime.store.select(
      "earth",
    );

    runtime.store.focus(
      "sun",
    );

    runtime.store.setCamera({
      ...current.camera,

      mode: "orbit",

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

      targetId: "sun",

      fieldOfView: 52,
    });

    refresh();
  };

  const goBack = () => {
    const runtime =
      runtimeRef.current;

    if (!runtime) {
      return;
    }

    const id =
      runtime.history.back();

    if (!id) {
      return;
    }

    const current =
      runtime.store.getSnapshot();

    runtime.store.select(id);

    runtime.store.focus(id);

    runtime.store.setCamera({
      ...current.camera,

      targetId: id,

      velocity: [
        0,
        0,
        0,
      ],
    });

    refresh();
  };

  const navigate = (
    direction:
      | "parent"
      | "child"
      | "previous"
      | "next",
  ) => {
    const runtime =
      runtimeRef.current;

    if (!runtime) {
      return;
    }

    let action:
      | "navigation.parent"
      | "navigation.child"
      | "navigation.previous"
      | "navigation.next";

    switch (
      direction
    ) {
      case "parent":
        action =
          "navigation.parent";
        break;

      case "child":
        action =
          "navigation.child";
        break;

      case "previous":
        action =
          "navigation.previous";
        break;

      case "next":
        action =
          "navigation.next";
        break;
    }

    runtime.dispatch(
      action,
    );

    const snapshot =
      runtime.store.getSnapshot();

    const id =
      snapshot.selectedId ??
      snapshot.focusId;

    if (id) {
      flyTo(
        id,
        620,
      );
    } else {
      refresh();
    }
  };

  const focus = (
    id:
      | EntityId
      | null,
  ) => {
    const runtime =
      runtimeRef.current;

    if (!runtime) {
      return;
    }

    if (!id) {
      runtime.store.focus(
        null,
      );

      refresh();

      return;
    }

    flyTo(
      id,
      760,
    );
  };

  const select = (
    id:
      | EntityId
      | null,
  ) => {
    const runtime =
      runtimeRef.current;

    if (!runtime) {
      return;
    }

    runtime.store.select(
      id,
    );

    refresh();
  };

  const setScaleBand = (
    band: ScaleBand,
  ) => {
    const runtime =
      runtimeRef.current;

    if (!runtime) {
      return;
    }

    cancelFlight();

    const current =
      runtime.store.getSnapshot();

    const targetId =
      current.camera.targetId ??
      current.focusId ??
      current.selectedId;

    const previousCenter =
      targetCenter(
        current,
      );

    const previousPosition: SceneVec = [
      current.camera.position[0],

      current.camera.position[1],

      current.camera.position[2],
    ];

    const direction =
      normalize(
        subtract(
          previousPosition,
          previousCenter,
        ),
        [
          0.56,
          0.24,
          0.79,
        ],
      );

    const metersPerUnit =
      SCALE_PRESETS[
        band
      ];

    runtime.store.setScale({
      ...current.scale,

      band,

      frameId:
        current.scale.frameId,

      metersPerUnit,
    });

    const scaled =
      runtime.store.getSnapshot();

    let newCenter:
      SceneVec = [
        0,
        0,
        0,
      ];

    if (targetId) {
      const target =
        scaled.entities.get(
          targetId,
        );

      if (target) {
        newCenter =
          scenePosition(
            target,
            scaled,
          ) ?? newCenter;
      }
    }

    const distance =
      band === "surface"
        ? 4
        : band === "regional"
          ? 7
          : band === "planet"
            ? 12
            : band === "orbital"
              ? 32
              : band === "system"
                ? 72
                : 95;

    runtime.store.setCamera({
      ...scaled.camera,

      mode:
        scaled.camera.mode ===
        "cinematic"
          ? "orbit"
          : scaled.camera.mode,

      position:
        add(
          newCenter,
          multiply(
            direction,
            distance,
          ),
        ),

      velocity: [
        0,
        0,
        0,
      ],
    });

    refresh();
  };

  const alterScale = (
    multiplier: number,
  ) => {
    const runtime =
      runtimeRef.current;

    if (!runtime) {
      return;
    }

    const current =
      runtime.store.getSnapshot();

    const nextMeters =
      clamp(
        current.scale
          .metersPerUnit *
          multiplier,

        1,

        1e30,
      );

    setScaleBand(
      scaleBandFor(
        nextMeters,
      ),
    );
  };

  const semanticZoom = (
    direction: -1 | 1,
  ) => {
    if (direction < 0) {
      alterScale(
        0.72,
      );

      return;
    }

    alterScale(
      1.38,
    );
  };

  const toggleOverlay = (
    key: OverlayKey,
    value?: boolean,
  ) => {
    const runtime =
      runtimeRef.current;

    if (!runtime) {
      return;
    }

    const current =
      runtime.store.getSnapshot();

    const nextValue =
      value ??
      !current.overlays[
        key
      ];

    runtime.store.setOverlays({
      ...current.overlays,

      [key]:
        nextValue,
    });

    refresh();
  };

  const pauseChange = (
    paused: boolean,
  ) => {
    const runtime =
      runtimeRef.current;

    if (!runtime) {
      return;
    }

    const current =
      runtime.store.getSnapshot();

    runtime.store.setClock({
      ...current.clock,

      paused,
    });

    refresh();
  };

  const clockRateChange = (
    rate: number,
  ) => {
    const runtime =
      runtimeRef.current;

    if (!runtime) {
      return;
    }

    const current =
      runtime.store.getSnapshot();

    runtime.store.setClock({
      ...current.clock,

      rate: clamp(
        rate,
        0,
        1_000_000,
      ),
    });

    refresh();
  };

  const cameraModeChange = (
    cameraMode: CameraMode,
  ) => {
    const runtime =
      runtimeRef.current;

    if (!runtime) {
      return;
    }

    const current =
      runtime.store.getSnapshot();

    runtime.store.setCamera({
      ...current.camera,

      mode: cameraMode,

      velocity: [
        0,
        0,
        0,
      ],
    });

    refresh();
  };

  const openSettings = () => {
      setMode(
        "science",
      );
    };

  const discoveryMode = () => {
    window.dispatchEvent(
      new CustomEvent(
        "universe:discovery",
      ),
    );
  };

  /* === Phase 1: Exploration panel state === */
  const [discoveryLogOpen, setDiscoveryLogOpen] = useState(false);
  const [waypointsOpen, setWaypointsOpen] = useState(false);
  const [poiOpen, setPoiOpen] = useState(false);

  const handleFlyToFromLog = (entityId: string) => {
    flyTo(entityId, 1000);
    setDiscoveryLogOpen(false);
  };

  const handleWaypointActivate = (wp: { entityId?: string }) => {
    if (wp.entityId) {
      flyTo(wp.entityId, 1000);
    }
    setWaypointsOpen(false);
  };

  const compareScale = () => {
    window.dispatchEvent(
      new CustomEvent(
        "universe:compare-scale",
        { detail: { fromBand: scaleBandFor(1), toBand: scaleBandFor(5) } }
      ),
    );
  };

  const issueSearch = (
    query: string,
  ) => {
    const normalized =
      query
        .trim()
        .toLowerCase();

    if (!normalized) {
      return;
    }

    const candidates =
      entitiesMemo.filter(
        (entity) =>
          entity.name
            .toLowerCase()
            .includes(
              normalized,
            ) ||
          entity.id
            .toLowerCase()
            .includes(
              normalized,
            ) ||
          entity.kind
            .toLowerCase()
            .includes(
              normalized,
            ) ||
          (
            entity.aliases
              ?.some(
                (alias) =>
                  alias
                    .toLowerCase()
                    .includes(
                      normalized,
                    ),
              ) ??
            false
          ),
      );

    const first =
      candidates[0];

    if (first) {
      flyTo(
        first.id,
      );
    }
  };

  useEffect(() => {
    const container =
      viewportRef.current;

    if (!container) {
      return;
    }

    let cancelled =
      false;

    let runtime:
      UniverseRuntime | null =
      null;

    let proceduralStream:
      ReturnType<typeof createWorldStream> | null =
      null;

    let proceduralBridge:
      ProceduralEntityBridge | null =
      null;

    let renderer:
      ThreeUniverseRenderer | null =
      null;

    let resizeObserver:
      ResizeObserver | null =
      null;

    let unsubscribe:
      (() => void) | null =
      null;

    let statsTimer:
      number | null =
      null;

    let cleanupPointer:
      (() => void) | null =
      null;

    let cleanupKeyboard:
      (() => void) | null =
      null;

    const pressed =
      new Set<string>();

    let movementFrame =
      0;

    let previousMovementTime =
      performance.now();

    const setup =
      async () => {
        try {
          setBoot(
            "booting",
          );

          setError("");

          renderer =
            new ThreeUniverseRenderer(
              {
                background:
                  0x10234b,

                antialias:
                  true,

                detailedObjectLimit:
                  10_000,

                starCount:
                  7_500,
              },
            );

          rendererRef.current =
            renderer;

          await renderer.initialize(
            container,
          );

          if (
            cancelled
          ) {
            renderer.dispose();

            return;
          }

          const initial =
            createApplicationState();

          runtime =
            new UniverseRuntime({
              state:
                initial,

              renderer,
            });

          runtimeRef.current =
            runtime;

          proceduralStream =
            createWorldStream(
              "PROJECT UNIVERSE / PROCEDURAL HORIZON",
              {
                loadRadiusSectors: 1,
                retainRadiusSectors: 2,
                maximumGenerationsPerTick: 4,
              },
            );

          proceduralBridge =
            new ProceduralEntityBridge(
              proceduralStream,
              runtime.store,
            );

          setState(
            initial,
          );

          setBoot(
            "loading",
          );

          const entities =
            await createSolarSystemSnapshot(
              initial.clock
                .time
                .julianDay,
            );

          if (
            cancelled ||
            !runtime ||
            !renderer
          ) {
            return;
          }

          runtime.store
            .replaceEntities(
              entities,
            );

          runtime.store.select(
            "earth",
          );

          runtime.store.focus(
            "sun",
          );

          const loaded =
            runtime.store
              .getSnapshot();

          runtime.store
            .setCamera({
              ...loaded.camera,

              mode: "orbit",

              targetId: "sun",

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
            });

          const updateProceduralStreaming =
            () => {
              if (!proceduralStream || !runtime) {
                return;
              }

              const snapshot =
                runtime.store.getSnapshot();

              const metersPerUnit =
                snapshot.scale.metersPerUnit;

              const positionLy =
                snapshot.camera.position.map(
                  (value) =>
                    value *
                    metersPerUnit /
                    METERS_PER_UNIT.ly,
                ) as SceneVec;

              const velocityLyPerSecond =
                snapshot.camera.velocity.map(
                  (value) =>
                    value *
                    metersPerUnit /
                    METERS_PER_UNIT.ly,
                ) as SceneVec;

              proceduralStream.updateObserver(
                {
                  positionLy,
                  velocityLyPerSecond,
                },
                4,
              );
            };

          updateProceduralStreaming();

          setState(
            runtime.store
              .getSnapshot(),
          );

          let lastUiSync =
            0;

          unsubscribe =
            runtime.store.subscribe(
              (
                snapshot,
              ) => {
                const now =
                  performance.now();

                if (
                  now -
                    lastUiSync <
                  120
                ) {
                  return;
                }

                lastUiSync =
                  now;

                setState(
                  snapshot,
                );
              },
            );

          resizeObserver =
            new ResizeObserver(
              (
                entries,
              ) => {
                const entry =
                  entries[0];

                if (
                  !entry ||
                  !renderer
                ) {
                  return;
                }

                renderer.resize(
                  Math.max(
                    1,
                    entry
                      .contentRect
                      .width,
                  ),

                  Math.max(
                    1,
                    entry
                      .contentRect
                      .height,
                  ),

                  window.devicePixelRatio ||
                    1,
                );
              },
            );

          resizeObserver.observe(
            container,
          );

          statsTimer =
            window.setInterval(
              () => {
                if (
                  renderer
                ) {
                  setStats(
                    renderer.getStats(),
                  );
                }

                updateProceduralStreaming();
              },

              300,
            );

          let dragging =
            false;

          let dragged =
            false;

          let activePointer =
            -1;

          let previousX =
            0;

          let previousY =
            0;

          const handlePointerDown =
            (
              event: PointerEvent,
            ) => {
              if (
                event.button !==
                0
              ) {
                return;
              }

              cancelFlight();

              dragging =
                true;

              dragged =
                false;

              activePointer =
                event.pointerId;

              previousX =
                event.clientX;

              previousY =
                event.clientY;

              container.setPointerCapture(
                event.pointerId,
              );
            };

          const handlePointerMove =
            (
              event: PointerEvent,
            ) => {
              if (
                !dragging ||
                event.pointerId !==
                  activePointer ||
                !runtime
              ) {
                return;
              }

              const dx =
                event.clientX -
                previousX;

              const dy =
                event.clientY -
                previousY;

              previousX =
                event.clientX;

              previousY =
                event.clientY;

              if (
                Math.abs(dx) +
                  Math.abs(dy) >
                1
              ) {
                dragged =
                  true;
              }

              const current =
                runtime.store
                  .getSnapshot();

              const center =
                targetCenter(
                  current,
                );

              const position:
                SceneVec = [
                  current.camera
                    .position[0],

                  current.camera
                    .position[1],

                  current.camera
                    .position[2],
                ];

              const offset =
                subtract(
                  position,
                  center,
                );

              const radius =
                Math.max(
                  0.5,
                  length(
                    offset,
                  ),
                );

              let yaw =
                Math.atan2(
                  offset[0],
                  offset[2],
                );

              let pitch =
                Math.asin(
                  clamp(
                    offset[1] /
                      radius,

                    -1,

                    1,
                  ),
                );

              yaw -=
                dx *
                0.006;

              pitch =
                clamp(
                  pitch +
                    dy *
                    0.0045,

                  -1.35,

                  1.35,
                );

              const planar =
                Math.cos(
                  pitch,
                ) *
                radius;

              const next:
                SceneVec = [
                  center[0] +
                    Math.sin(
                      yaw,
                    ) *
                    planar,

                  center[1] +
                    Math.sin(
                      pitch,
                    ) *
                    radius,

                  center[2] +
                    Math.cos(
                      yaw,
                    ) *
                    planar,
                ];

              runtime.store
                .setCamera({
                  ...current.camera,

                  position:
                    next,

                  velocity: [
                    0,
                    0,
                    0,
                  ],
                });
            };

          const finishPointer =
            (
              event: PointerEvent,
            ) => {
              if (
                event.pointerId !==
                activePointer
              ) {
                return;
              }

              dragging =
                false;

              activePointer =
                -1;

              if (
                container.hasPointerCapture(
                  event.pointerId,
                )
              ) {
                container.releasePointerCapture(
                  event.pointerId,
                );
              }

              if (
                dragged ||
                !renderer ||
                !runtime
              ) {
                return;
              }

              const id =
                renderer.picking.pick(
                  event.clientX,

                  event.clientY,
                );

              if (!id) {
                return;
              }

              runtime.store.select(
                id,
              );

              setState(
                runtime.store
                  .getSnapshot(),
              );
            };

          const handleDoubleClick =
            (
              event: MouseEvent,
            ) => {
              if (
                !renderer
              ) {
                return;
              }

              const id =
                renderer.picking.pick(
                  event.clientX,

                  event.clientY,
                );

              if (id) {
                flyTo(
                  id,
                  920,
                );
              }
            };

          const handleWheel =
            (
              event: WheelEvent,
            ) => {
              if (
                !runtime
              ) {
                return;
              }

              event.preventDefault();

              cancelFlight();

              const current =
                runtime.store
                  .getSnapshot();

              const center =
                targetCenter(
                  current,
                );

              const position:
                SceneVec = [
                  current.camera
                    .position[0],

                  current.camera
                    .position[1],

                  current.camera
                    .position[2],
                ];

              const offset =
                subtract(
                  position,
                  center,
                );

              const distance =
                Math.max(
                  0.001,
                  length(
                    offset,
                  ),
                );

              const direction =
                normalize(
                  offset,
                  [
                    0.56,
                    0.24,
                    0.79,
                  ],
                );

              const factor =
                Math.exp(
                  event.deltaY *
                    0.00115,
                );

              const wanted =
                distance *
                factor;

              if (
                wanted >=
                  2.1 &&
                wanted <=
                  170
              ) {
                runtime.store
                  .setCamera({
                    ...current.camera,

                    position:
                      add(
                        center,
                        multiply(
                          direction,
                          wanted,
                        ),
                      ),

                    velocity: [
                      0,
                      0,
                      0,
                    ],
                  });

                return;
              }

              const scaleFactor =
                event.deltaY >
                0
                  ? 1.32
                  : 0.76;

              const nextMeters =
                clamp(
                  current.scale
                      .metersPerUnit *
                    scaleFactor,

                  1,

                  1e30,
                );

              const band =
                scaleBandFor(
                  nextMeters,
                );

              runtime.store
                .setScale({
                  ...current.scale,

                  band,

                  metersPerUnit:
                    nextMeters,
                });

              const scaled =
                runtime.store
                  .getSnapshot();

              const targetId =
                scaled.camera
                  .targetId ??
                scaled.focusId ??
                scaled.selectedId;

              let newCenter:
                SceneVec = [
                  0,
                  0,
                  0,
                ];

              if (
                targetId
              ) {
                const entity =
                  scaled.entities.get(
                    targetId,
                  );

                if (entity) {
                  newCenter =
                    scenePosition(
                      entity,
                      scaled,
                    ) ??
                    newCenter;
                }
              }

              const newDistance =
                event.deltaY >
                0
                  ? 110
                  : 3.5;

              runtime.store
                .setCamera({
                  ...scaled.camera,

                  position:
                    add(
                      newCenter,
                      multiply(
                        direction,
                        newDistance,
                      ),
                    ),

                  velocity: [
                    0,
                    0,
                    0,
                  ],
                });

              refresh();
            };

          const handleContextMenu =
            (
              event: MouseEvent,
            ) => {
              event.preventDefault();
            };

          container.addEventListener(
            "pointerdown",
            handlePointerDown,
          );

          container.addEventListener(
            "pointermove",
            handlePointerMove,
          );

          container.addEventListener(
            "pointerup",
            finishPointer,
          );

          container.addEventListener(
            "pointercancel",
            finishPointer,
          );

          container.addEventListener(
            "dblclick",
            handleDoubleClick,
          );

          container.addEventListener(
            "wheel",
            handleWheel,
            {
              passive:
                false,
            },
          );

          container.addEventListener(
            "contextmenu",
            handleContextMenu,
          );

          cleanupPointer =
            () => {
              container.removeEventListener(
                "pointerdown",
                handlePointerDown,
              );

              container.removeEventListener(
                "pointermove",
                handlePointerMove,
              );

              container.removeEventListener(
                "pointerup",
                finishPointer,
              );

              container.removeEventListener(
                "pointercancel",
                finishPointer,
              );

              container.removeEventListener(
                "dblclick",
                handleDoubleClick,
              );

              container.removeEventListener(
                "wheel",
                handleWheel,
              );

              container.removeEventListener(
                "contextmenu",
                handleContextMenu,
              );
            };

          const isTyping =
            (
              target:
                EventTarget | null,
            ): boolean => {
              if (
                !(
                  target instanceof
                  HTMLElement
                )
              ) {
                return false;
              }

              return (
                target.tagName ===
                  "INPUT" ||
                target.tagName ===
                  "TEXTAREA" ||
                target.tagName ===
                  "SELECT" ||
                target.isContentEditable
              );
            };

          const handleKeyDown =
            (
              event: KeyboardEvent,
            ) => {
              if (
                isTyping(
                  event.target,
                )
              ) {
                return;
              }

              const key =
                event.key.toLowerCase();

              if (
                key ===
                "/"
              ) {
                event.preventDefault();

                searchInputRef.current?.focus();

                return;
              }

              if (
                key ===
                "escape"
              ) {
                searchInputRef.current?.blur();

                setSearch("");

                return;
              }

              if (
                key ===
                "h"
              ) {
                goHome();

                return;
              }

              if (
                key ===
                "backspace"
              ) {
                goBack();

                return;
              }

              if (
                key ===
                "f"
              ) {
                focus(
                  runtime?.store
                    .getSnapshot()
                    .selectedId ??
                    null,
                );

                return;
              }

              if (
                key ===
                "c"
              ) {
                setMode(
                  mode ===
                    "science"
                    ? "explore"
                    : "science",
                );

                return;
              }

              if (
                key ===
                "p"
              ) {
                const current =
                  runtimeRef
                    .current
                    ?.store
                    .getSnapshot();

                if (
                  current
                ) {
                  pauseChange(
                    !current
                      .clock
                      .paused,
                  );
                }

                return;
              }

              pressed.add(
                key,
              );
            };

          const handleKeyUp =
            (
              event: KeyboardEvent,
            ) => {
              pressed.delete(
                event.key.toLowerCase(),
              );
            };

          window.addEventListener(
            "keydown",
            handleKeyDown,
          );

          window.addEventListener(
            "keyup",
            handleKeyUp,
          );

          window.addEventListener(
            "universe:open-settings",
            openSettings
          );

          const movementTick =
            (
              now: number,
            ) => {
              if (
                cancelled
              ) {
                return;
              }

              const delta =
                clamp(
                  (now -
                    previousMovementTime) /
                    1_000,

                  0,

                  0.05,
                );

              previousMovementTime =
                now;

              if (
                runtime &&
                pressed.size >
                  0
              ) {
                const current =
                  runtime.store
                    .getSnapshot();

                const center =
                  targetCenter(
                    current,
                  );

                const position:
                  SceneVec = [
                  current.camera
                    .position[0],

                  current.camera
                    .position[1],

                  current.camera
                    .position[2],
                ];

                const forward =
                  normalize(
                    subtract(
                      center,
                      position,
                    ),
                  );

                let right =
                  normalize(
                    cross(
                      forward,
                      [
                        0,
                        1,
                        0,
                      ],
                    ),
                    [
                      1,
                      0,
                      0,
                    ],
                  );

                if (
                  length(
                    right,
                  ) < 0.01
                ) {
                  right = [
                    1,
                    0,
                    0,
                  ];
                }

                const localUp =
                  normalize(
                    cross(
                      right,
                      forward,
                    ),
                    [
                      0,
                      1,
                      0,
                    ],
                  );

                let movement:
                  SceneVec = [
                    0,
                    0,
                    0,
                  ];

                if (
                  pressed.has(
                    "w",
                  )
                ) {
                  movement =
                    add(
                      movement,
                      forward,
                    );
                }

                if (
                  pressed.has(
                    "s",
                  )
                ) {
                  movement =
                    subtract(
                      movement,
                      forward,
                    );
                }

                if (
                  pressed.has(
                    "d",
                  )
                ) {
                  movement =
                    add(
                      movement,
                      right,
                    );
                }

                if (
                  pressed.has(
                    "a",
                  )
                ) {
                  movement =
                    subtract(
                      movement,
                      right,
                    );
                }

                if (
                  pressed.has(
                    "e",
                  )
                ) {
                  movement =
                    add(
                      movement,
                      localUp,
                    );
                }

                if (
                  pressed.has(
                    "q",
                  )
                ) {
                  movement =
                    subtract(
                      movement,
                      localUp,
                    );
                }

                if (
                  length(
                    movement,
                  ) > 0
                ) {
                  const distance =
                    length(
                      subtract(
                        center,
                        position,
                      ),
                    );

                  let speed =
                    clamp(
                      distance *
                        0.6,

                      0.8,

                      42,
                    );

                  if (
                    pressed.has(
                      "shift",
                    )
                  ) {
                    speed *= 4;
                  }

                  if (
                    pressed.has(
                      "alt",
                    )
                  ) {
                    speed *=
                      0.18;
                  }

                  const step =
                    multiply(
                      normalize(
                        movement,
                      ),

                      speed *
                        delta,
                    );

                  runtime.store
                    .setCamera({
                      ...current.camera,

                      mode:
                        current
                          .camera
                          .mode ===
                        "cinematic"
                          ? "free"
                          : current
                              .camera
                              .mode,

                      position:
                        add(
                          position,
                          step,
                        ),

                      velocity: [
                        0,
                        0,
                        0,
                      ],
                    });
                }
              }

              movementFrame =
                requestAnimationFrame(
                  movementTick,
                );
            };

          movementFrame =
            requestAnimationFrame(
              movementTick,
            );

          cleanupKeyboard =
            () => {
              window.removeEventListener(
                "keydown",
                handleKeyDown,
              );

              window.removeEventListener(
                "keyup",
                handleKeyUp,
              );

              cancelAnimationFrame(
                movementFrame,
              );

              pressed.clear();
            };

          runtime.start();

          setStats(
            renderer.getStats(),
          );

          setBoot(
            "ready",
          );
        } catch (
          cause
        ) {
          const message =
            cause instanceof Error
              ? cause.message
              : String(cause);

          setError(
            message,
          );

          setBoot(
            "error",
          );
        }
      };

    void setup();

    return () => {
      cancelled = true;

      cancelFlight();

      cleanupKeyboard?.();

      cleanupPointer?.();

      proceduralBridge?.dispose();

      proceduralStream?.dispose();

      resizeObserver?.disconnect();

      unsubscribe?.();

      if (
        statsTimer !==
        null
      ) {
        window.clearInterval(
          statsTimer,
        );
      }

      runtimeRef.current =
        null;

      rendererRef.current =
        null;

      if (runtime) {
        runtime.dispose();
      } else {
        renderer?.dispose();
      }
    };
  }, []);

  const entitiesMemo =
    useMemo(
      () =>
        [
          ...state.entities.values(),
        ].sort(
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

            return left.name.localeCompare(
              right.name,
            );
          },
        ),

      [state.entities],
    );

  const results =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        if (!query) {
          return entitiesMemo;
        }

        return entitiesMemo.filter(
          (
            entity,
          ) =>
            entity.name
              .toLowerCase()
              .includes(
                query,
              ) ||
            entity.id
              .toLowerCase()
              .includes(
                query,
              ) ||
            entity.kind
              .toLowerCase()
              .includes(
                query,
              ) ||
            (
              entity.aliases?.some(
                (
                  alias,
                ) =>
                  alias
                    .toLowerCase()
                    .includes(
                      query,
                    ),
              ) ??
              false
            ),
        );
      },

      [
        entitiesMemo,
        search,
      ],
    );

  const selected =
    state.entities.get(
      state.selectedId ??
        state.focusId ??
        "",
    );

  const selectedKnowledgeClass =
    (
      selected as SpaceEntity & {
        knowledge?: {
          class?: string;
        };
      }
    )?.knowledge?.class ??
    undefined;

  const selectedConfidence =
    (
      selected as SpaceEntity & {
        knowledge?: {
          confidence?: number;
        };
      }
    )?.knowledge?.confidence;

  const simulationDate =
    julianDayToDate(
      state.clock.time
        .julianDay,
    );

  const coordinateLabel =
    selected?.spatial
      ? `${selected.spatial.frameId} Â· ${selected.spatial.unit}`
      : `${state.scale.frameId}`;

  const locationLabel =
    selected?.name ??
    "Observable universe";

  const temporalLabel =
    simulationDate.toLocaleString(
      "en-GB",
      {
        year: "numeric",

        month: "short",

        day: "2-digit",

        hour: "2-digit",

        minute: "2-digit",

        second: "2-digit",

        hour12: false,
      },
    );

  const selectedDescription =
    selected?.summary ??
    "Scientific object in the currently loaded universe.";

  const rendererPerformance =
    {
      fps:
        stats.frameMs >
        0
          ? 1_000 /
            stats.frameMs
          : 0,

      frameMs:
        stats.frameMs,

      visibleObjects:
        stats.visibleEntities,

      drawCalls:
        stats.drawCalls,

      quality:
        state.settings
          .graphics
          .preset,
    };

  return (
    <main
      className="universe"
      data-mode={mode}
      data-boot={boot}
      data-reality={
        selectedKnowledgeClass ??
        "known"
      }
      data-camera={
        state.camera.mode
      }
      data-scale={
        state.scale.band
      }
    >
      <div
        className="space-viewport"
        ref={viewportRef}
        aria-label="Three dimensional universe viewport"
      />
      {mode === "science" && (
              <SettingsPanel
                isOpen={true}
                onClose={() => setMode("explore")}
                onSettingsChange={(settings) => {
                  // Handle settings change if needed
                }}
              />
            )}
      <div className="ambient-overlay" />

      <UniverseHUD
        state={state}
        mode={mode}
        onModeChange={setMode}
        onSelect={select}
        onFocus={focus}
        onNavigate={navigate}
        onHome={goHome}
        onBack={goBack}
        onScaleChange={
          setScaleBand
        }
        onSemanticZoom={
          semanticZoom
        }
        onPauseChange={
          pauseChange
        }
        onClockRateChange={
          clockRateChange
        }
        onCameraModeChange={
          cameraModeChange
        }
        onToggleOverlay={
          toggleOverlay
        }
        onSearch={
          issueSearch
        }
        onSearchSelect={
          (id) => {
            setSearch("");

            flyTo(
              id,
              900,
            );
          }
        }
        onOpenSettings={
          openSettings
        }
        onDiscoveryMode={
          discoveryMode
        }
        onCompareScale={
          compareScale
        }
        onOpenDiscoveryLog={() => setDiscoveryLogOpen(v => !v)}
        onOpenWaypoints={() => setWaypointsOpen(v => !v)}
        onOpenPoi={() => setPoiOpen(v => !v)}
        humanity={
          state.overlays.humanity
            ? HUMANITY_STATUS
            : undefined
        }
        performance={
          rendererPerformance
        }
        locationLabel={
          locationLabel
        }
        coordinateLabel={
          coordinateLabel
        }
        temporalLabel={
          temporalLabel
        }
      />

      {/* === Phase 2: Atmospheric Overlay === */}
      <AtmosphericOverlay entry={null} />

      {/* === Phase 2: Discovery Toasts === */}
      <DiscoveryToast
        queue={_notificationQueue}
        onFlyTo={handleFlyToFromLog}
      />

      {/* === Phase 3: POI Panel === */}
      {poiOpen && (
        <PoiPanel
          system={_poiSystem}
          onFlyTo={handleFlyToFromLog}
          onClose={() => setPoiOpen(false)}
        />
      )}

      {/* === Phase 1: Exploration Panels === */}
      {discoveryLogOpen && (
        <DiscoveryPanel
          log={_discoveryLog}
          onFlyTo={handleFlyToFromLog}
          onClose={() => setDiscoveryLogOpen(false)}
        />
      )}

      {waypointsOpen && (
        <WaypointPanel
          system={_waypointSystem}
          onActivate={handleWaypointActivate}
          onClose={() => setWaypointsOpen(false)}
        />
      )}


      <div
        className="universe-accessibility"
        aria-live="polite"
      >
        {boot ===
          "loading" &&
          "Loading scientific universe data."}

        {boot ===
          "ready" &&
          selected &&
          `Selected ${selected.name}. ${selectedDescription}`}

        {boot ===
          "error" &&
          `Universe initialization failed. ${error}`}
      </div>

      {selectedConfidence !==
        undefined && (
        <div
          className="universe-knowledge-meta"
          data-knowledge={
            selectedKnowledgeClass ??
            "unknown"
          }
        >
          <span>
            Knowledge class
          </span>

          <strong>
            {selectedKnowledgeClass ??
              "Unspecified"}
          </strong>

          <span>
            Confidence{" "}
            {Math.round(
              (
                selectedConfidence >
                1
                  ? selectedConfidence /
                    100
                  : selectedConfidence
              ) * 100,
            )}
            %
          </span>
        </div>
      )}

      {search.trim() &&
        results.length ===
          0 && (
          <div className="universe-search-fallback">
            No loaded entity matches "
            {search.trim()}
            ".
          </div>
        )}
    </main>
  );
}

export default App;
