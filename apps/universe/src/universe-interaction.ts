import {
  METERS_PER_UNIT,
} from "@known-universe/core";

import type {
  EntityId,
  SpaceEntity,
} from "@known-universe/core";

import {
  CinematicNavigationController,
  DEFAULT_NAVIGATION_TUNING,
  scaleBandFor,
} from "@known-universe/engine";

import type {
  CinematicCameraPose,
  NavigationMovementInput,
  NavigationTuning,
  NavigationVec3,
  UniverseRuntime,
  UniverseState,
} from "@known-universe/engine";

import type {
  ThreeUniverseRenderer,
} from "@known-universe/render-three";


export const UNIVERSE_INTERACTION_VERSION =
  1;


export interface UniverseInteractionCallbacks {
  onStateChange?(
    state:
      UniverseState,
  ): void;

  onSelection?(
    id:
      EntityId |
      null,
  ): void;

  onTravelStart?(
    id:
      EntityId,
  ): void;

  onTravelComplete?(
    id:
      EntityId,
  ): void;

  onSearchRequest?():
    void;

  onCatalogToggle?():
    void;

  onEscape?():
    void;

  onHome?():
    void;
}


export interface UniverseInteractionOptions {
  runtime:
    UniverseRuntime;

  renderer:
    ThreeUniverseRenderer;

  element:
    HTMLElement;

  callbacks?:
    UniverseInteractionCallbacks;

  tuning?:
    Partial<NavigationTuning>;

  minimumMetersPerUnit?:
    number;

  maximumMetersPerUnit?:
    number;

  scaleInFactor?:
    number;

  scaleOutFactor?:
    number;

  clickMovementTolerancePx?:
    number;

  doubleClickDelayMs?:
    number;

  uiSyncIntervalMs?:
    number;
}


export interface UniverseInteractionSnapshot {
  running:
    boolean;

  dragging:
    boolean;

  pointerCount:
    number;

  pressedKeys:
    readonly string[];

  selectedId:
    EntityId |
    null;

  focusedId:
    EntityId |
    null;

  flightActive:
    boolean;

  scaleMetersPerUnit:
    number;
}


interface PointerRecord {
  id:
    number;

  x:
    number;

  y:
    number;

  startX:
    number;

  startY:
    number;
}


interface PinchState {
  distance:
    number;

  centerX:
    number;

  centerY:
    number;
}


const DEFAULT_MINIMUM_METERS_PER_UNIT =
  500_000;


const DEFAULT_MAXIMUM_METERS_PER_UNIT =
  2e14;


const DEFAULT_SCALE_IN_FACTOR =
  0.76;


const DEFAULT_SCALE_OUT_FACTOR =
  1.32;


const DEFAULT_CLICK_TOLERANCE =
  5;


const DEFAULT_DOUBLE_CLICK_DELAY =
  280;


const DEFAULT_UI_SYNC_INTERVAL =
  100;


const ZERO_VECTOR:
  NavigationVec3 = [
  0,
  0,
  0,
];


function clampInteraction(
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


function cloneVector(
  value:
    NavigationVec3,
):
  NavigationVec3 {
  return [
    value[0],
    value[1],
    value[2],
  ];
}


function addVector(
  left:
    NavigationVec3,

  right:
    NavigationVec3,
):
  NavigationVec3 {
  return [
    left[0] +
      right[0],

    left[1] +
      right[1],

    left[2] +
      right[2],
  ];
}


function subtractVector(
  left:
    NavigationVec3,

  right:
    NavigationVec3,
):
  NavigationVec3 {
  return [
    left[0] -
      right[0],

    left[1] -
      right[1],

    left[2] -
      right[2],
  ];
}


function multiplyVector(
  value:
    NavigationVec3,

  scalar:
    number,
):
  NavigationVec3 {
  return [
    value[0] *
      scalar,

    value[1] *
      scalar,

    value[2] *
      scalar,
  ];
}


function vectorLength(
  value:
    NavigationVec3,
):
  number {
  return Math.sqrt(
    value[0] *
      value[0] +
    value[1] *
      value[1] +
    value[2] *
      value[2],
  );
}


function normalizeVector(
  value:
    NavigationVec3,

  fallback:
    NavigationVec3 = [
      0.55,
      0.24,
      0.8,
    ],
):
  NavigationVec3 {
  const magnitude =
    vectorLength(
      value,
    );

  if (
    !Number.isFinite(
      magnitude,
    ) ||
    magnitude <
      1e-10
  ) {
    return cloneVector(
      fallback,
    );
  }

  return [
    value[0] /
      magnitude,

    value[1] /
      magnitude,

    value[2] /
      magnitude,
  ];
}


function pointerDistance(
  left:
    PointerRecord,

  right:
    PointerRecord,
):
  number {
  const x =
    right.x -
    left.x;

  const y =
    right.y -
    left.y;

  return Math.sqrt(
    x *
      x +
    y *
      y,
  );
}


function pointerCenter(
  left:
    PointerRecord,

  right:
    PointerRecord,
):
  [
    number,
    number,
  ] {
  return [
    (
      left.x +
      right.x
    ) /
      2,

    (
      left.y +
      right.y
    ) /
      2,
  ];
}


function isEditableTarget(
  target:
    EventTarget |
    null,
):
  boolean {
  if (
    !(target instanceof
      HTMLElement)
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
}


function scenePositionForEntity(
  entity:
    SpaceEntity,

  state:
    UniverseState,
):
  NavigationVec3 |
  null {
  const spatial =
    entity.spatial;

  if (
    !spatial ||
    spatial.frameId !==
      state.scale.frameId
  ) {
    return null;
  }

  const unit =
    METERS_PER_UNIT[
      spatial.unit
    ];

  const metersPerUnit =
    state.scale
      .metersPerUnit;

  if (
    !Number.isFinite(
      metersPerUnit,
    ) ||
    metersPerUnit <=
      0
  ) {
    return null;
  }

  return [
    spatial.position[0] *
      unit /
      metersPerUnit,

    spatial.position[1] *
      unit /
      metersPerUnit,

    spatial.position[2] *
      unit /
      metersPerUnit,
  ];
}


function visualRadiusForEntity(
  entity:
    SpaceEntity,

  state:
    UniverseState,
):
  number {
  const physicalRadius =
    entity
      .physical
      ?.radiusM
      ?.value;

  const physicalSceneRadius =
    physicalRadius !==
      undefined &&
    Number.isFinite(
      physicalRadius,
    ) &&
    physicalRadius >
      0
      ? physicalRadius /
        state.scale
          .metersPerUnit
      : 0;


  let minimum =
    0.25;


  switch (
    entity.id
  ) {
    case "sun":
      minimum =
        1.15;

      break;

    case "mercury":
      minimum =
        0.18;

      break;

    case "venus":
      minimum =
        0.29;

      break;

    case "earth":
      minimum =
        0.31;

      break;

    case "moon":
      minimum =
        0.14;

      break;

    case "mars":
      minimum =
        0.235;

      break;

    case "jupiter":
      minimum =
        0.62;

      break;

    case "saturn":
      minimum =
        0.55;

      break;

    case "uranus":
      minimum =
        0.41;

      break;

    case "neptune":
      minimum =
        0.405;

      break;
  }


  return Math.max(
    minimum,
    physicalSceneRadius,
  );
}


function poseFromUniverseState(
  state:
    UniverseState,
):
  CinematicCameraPose {
  const targetId =
    state.camera
      .targetId ??
    state.focusId ??
    state.selectedId ??
    null;


  let target:
    NavigationVec3 = [
    0,
    0,
    0,
  ];


  if (
    targetId
  ) {
    const entity =
      state.entities.get(
        targetId,
      );

    if (
      entity
    ) {
      target =
        scenePositionForEntity(
          entity,
          state,
        ) ??
        target;
    }
  }


  const position:
    NavigationVec3 = [
    state.camera
      .position[0],

    state.camera
      .position[1],

    state.camera
      .position[2],
  ];


  if (
    vectorLength(
      subtractVector(
        position,
        target,
      ),
    ) <
    1e-5
  ) {
    position[0] =
      target[0] +
      8;

    position[1] =
      target[1] +
      4;

    position[2] =
      target[2] +
      12;
  }


  return {
    position,

    target,

    up:
      [
        0,
        1,
        0,
      ],

    fovDeg:
      state.camera
        .fieldOfView,

    frameId:
      state.camera
        .frameId,

    targetId,
  };
}


export class UniverseInteractionController {
  readonly runtime:
    UniverseRuntime;

  readonly renderer:
    ThreeUniverseRenderer;

  readonly element:
    HTMLElement;


  private readonly callbacks:
    UniverseInteractionCallbacks;


  private readonly navigation:
    CinematicNavigationController;


  private readonly pointers =
    new Map<
      number,
      PointerRecord
    >();


  private readonly pressedKeys =
    new Set<string>();


  private readonly minimumMetersPerUnit:
    number;


  private readonly maximumMetersPerUnit:
    number;


  private readonly scaleInFactor:
    number;


  private readonly scaleOutFactor:
    number;


  private readonly clickTolerance:
    number;


  private readonly doubleClickDelay:
    number;


  private readonly uiSyncInterval:
    number;


  private runningValue =
    false;


  private disposed =
    false;


  private dragging =
    false;


  private pinch:
    PinchState |
    null =
    null;


  private animationFrame =
    0;


  private previousFrameTime =
    0;


  private lastUiSyncTime =
    0;


  private lastClickTime =
    -Infinity;


  private lastClickId:
    EntityId |
    null =
    null;


  private queuedSingleClick:
    number |
    null =
    null;


  private activeFlightId:
    EntityId |
    null =
    null;


  constructor(
    options:
      UniverseInteractionOptions,
  ) {
    this.runtime =
      options.runtime;

    this.renderer =
      options.renderer;

    this.element =
      options.element;


    this.callbacks =
      options.callbacks ??
      {};


    this.minimumMetersPerUnit =
      Math.max(
        1,
        options
          .minimumMetersPerUnit ??
        DEFAULT_MINIMUM_METERS_PER_UNIT,
      );


    this.maximumMetersPerUnit =
      Math.max(
        this.minimumMetersPerUnit,

        options
          .maximumMetersPerUnit ??
        DEFAULT_MAXIMUM_METERS_PER_UNIT,
      );


    this.scaleInFactor =
      clampInteraction(
        options.scaleInFactor ??
        DEFAULT_SCALE_IN_FACTOR,
        0.05,
        0.99,
      );


    this.scaleOutFactor =
      Math.max(
        1.01,
        options.scaleOutFactor ??
        DEFAULT_SCALE_OUT_FACTOR,
      );


    this.clickTolerance =
      Math.max(
        1,
        options
          .clickMovementTolerancePx ??
        DEFAULT_CLICK_TOLERANCE,
      );


    this.doubleClickDelay =
      Math.max(
        100,
        options.doubleClickDelayMs ??
        DEFAULT_DOUBLE_CLICK_DELAY,
      );


    this.uiSyncInterval =
      Math.max(
        16,
        options.uiSyncIntervalMs ??
        DEFAULT_UI_SYNC_INTERVAL,
      );


    const initialPose =
      poseFromUniverseState(
        this.runtime
          .store
          .getSnapshot(),
      );


    this.navigation =
      new CinematicNavigationController(
        initialPose,
        {
          ...DEFAULT_NAVIGATION_TUNING,
          ...options.tuning,
        },
      );
  }


  get running():
    boolean {
    return this.runningValue;
  }


  get flightActive():
    boolean {
    return this.navigation
      .flightActive;
  }


  private notifyState(
    force =
      false,
  ): void {
    const now =
      performance.now();


    if (
      !force &&
      now -
        this.lastUiSyncTime <
      this.uiSyncInterval
    ) {
      return;
    }


    this.lastUiSyncTime =
      now;


    this.callbacks
      .onStateChange?.(
        this.runtime
          .store
          .getSnapshot(),
      );
  }


  private applyPose(
    pose:
      CinematicCameraPose,

    notify =
      false,
  ): void {
    const state =
      this.runtime
        .store
        .getSnapshot();


    this.runtime.store.setCamera({
      ...state.camera,

      frameId:
        pose.frameId,

      position:
        [
          pose.position[0],
          pose.position[1],
          pose.position[2],
        ],

      velocity:
        [
          0,
          0,
          0,
        ],

      targetId:
        pose.targetId ??
        undefined,

      fieldOfView:
        pose.fovDeg,
    });


    if (
      notify
    ) {
      this.notifyState();
    }
  }


  private synchronizeNavigation():
    void {
    const state =
      this.runtime
        .store
        .getSnapshot();


    this.navigation.setPose(
      poseFromUniverseState(
        state,
      ),
    );
  }


  private setSelected(
    id:
      EntityId |
      null,
  ): void {
    if (
      id ===
      null
    ) {
      return;
    }


    const state =
      this.runtime
        .store
        .getSnapshot();


    if (
      !state.entities.has(
        id,
      )
    ) {
      return;
    }


    this.runtime.store.select(
      id,
    );


    this.callbacks
      .onSelection?.(
        id,
      );


    this.notifyState(
      true,
    );
  }


  private entityForId(
    id:
      EntityId,
  ):
    SpaceEntity |
    null {
    return (
      this.runtime
        .store
        .getSnapshot()
        .entities
        .get(
          id,
        ) ??
      null
    );
  }


  private pickEntity(
    clientX:
      number,

    clientY:
      number,
  ):
    EntityId |
    null {
    return (
      this.renderer
        .picking
        .pick(
          clientX,
          clientY,
        ) ??
      null
    );
  }


  private targetPositionForId(
    id:
      EntityId,

    state:
      UniverseState,
  ):
    NavigationVec3 |
    null {
    const entity =
      state.entities.get(
        id,
      );


    if (
      !entity
    ) {
      return null;
    }


    return scenePositionForEntity(
      entity,
      state,
    );
  }


  private rebuildNavigationAfterScale(
    previousState:
      UniverseState,

    previousPose:
      CinematicCameraPose,
  ): void {
    const nextState =
      this.runtime
        .store
        .getSnapshot();


    const targetId =
      previousPose.targetId ??
      nextState.camera
        .targetId ??
      nextState.focusId ??
      nextState.selectedId ??
      null;


    let nextTarget:
      NavigationVec3 = [
      0,
      0,
      0,
    ];


    if (
      targetId
    ) {
      nextTarget =
        this.targetPositionForId(
          targetId,
          nextState,
        ) ??
        nextTarget;
    }


    let previousTarget:
      NavigationVec3 = [
      0,
      0,
      0,
    ];


    if (
      targetId
    ) {
      previousTarget =
        this.targetPositionForId(
          targetId,
          previousState,
        ) ??
        previousPose.target;
    }


    const previousOffset =
      subtractVector(
        previousPose.position,
        previousTarget,
      );


    const direction =
      normalizeVector(
        previousOffset,
      );


    const oldDistance =
      Math.max(
        2,
        vectorLength(
          previousOffset,
        ),
      );


    const ratio =
      previousState.scale
        .metersPerUnit /
      nextState.scale
        .metersPerUnit;


    const scaledDistance =
      clampInteraction(
        oldDistance *
          ratio,
        3,
        120,
      );


    const nextPose:
      CinematicCameraPose = {
      ...previousPose,

      target:
        nextTarget,

      targetId,

      frameId:
        nextState.scale
          .frameId,

      position:
        addVector(
          nextTarget,

          multiplyVector(
            direction,
            scaledDistance,
          ),
        ),
    };


    this.navigation.setPose(
      nextPose,
    );


    this.applyPose(
      nextPose,
      true,
    );
  }


  changeScale(
    direction:
      "in" |
      "out",
  ): void {
    this.navigation
      .cancelFlight();


    const previousState =
      this.runtime
        .store
        .getSnapshot();


    const previousPose =
      this.navigation.pose;


    const factor =
      direction ===
      "in"
        ? this.scaleInFactor
        : this.scaleOutFactor;


    const nextMetersPerUnit =
      clampInteraction(
        previousState
          .scale
          .metersPerUnit *
          factor,

        this.minimumMetersPerUnit,

        this.maximumMetersPerUnit,
      );


    if (
      nextMetersPerUnit ===
      previousState
        .scale
        .metersPerUnit
    ) {
      return;
    }


    this.runtime.store.setScale({
      frameId:
        previousState
          .scale
          .frameId,

      metersPerUnit:
        nextMetersPerUnit,

      band:
        scaleBandFor(
          nextMetersPerUnit,
        ),
    });


    this.rebuildNavigationAfterScale(
      previousState,
      previousPose,
    );
  }


  travelTo(
    id:
      EntityId,

    now =
      performance.now(),
  ): boolean {
    const state =
      this.runtime
        .store
        .getSnapshot();


    const entity =
      state.entities.get(
        id,
      );


    if (
      !entity
    ) {
      return false;
    }


    const position =
      scenePositionForEntity(
        entity,
        state,
      );


    if (
      !position
    ) {
      return false;
    }


    this.runtime.store.select(
      id,
    );


    this.runtime.store.focus(
      id,
    );


    const radius =
      visualRadiusForEntity(
        entity,
        state,
      );


    this.navigation
      .beginFlight(
        position,
        id,
        radius,
        now,
      );


    this.activeFlightId =
      id;


    this.callbacks
      .onTravelStart?.(
        id,
      );


    this.notifyState(
      true,
    );


    return true;
  }


  focusImmediately(
    id:
      EntityId,
  ): boolean {
    const state =
      this.runtime
        .store
        .getSnapshot();


    const entity =
      state.entities.get(
        id,
      );


    if (
      !entity
    ) {
      return false;
    }


    const position =
      scenePositionForEntity(
        entity,
        state,
      );


    if (
      !position
    ) {
      return false;
    }


    const radius =
      visualRadiusForEntity(
        entity,
        state,
      );


    this.runtime.store.select(
      id,
    );


    this.runtime.store.focus(
      id,
    );


    const pose =
      this.navigation
        .focusImmediately(
          position,
          id,
          radius,
        );


    this.applyPose(
      pose,
      true,
    );


    return true;
  }


  cancelFlight():
    void {
    this.activeFlightId =
      null;


    this.navigation
      .cancelFlight();
  }


  home():
    void {
    this.cancelFlight();


    this.callbacks
      .onHome?.();


    const state =
      this.runtime
        .store
        .getSnapshot();


    this.runtime.store.setScale({
      band:
        "system",

      frameId:
        state.scale
          .frameId,

      metersPerUnit:
        50_000_000_000,
    });


    const nextState =
      this.runtime
        .store
        .getSnapshot();


    const sun =
      nextState.entities.get(
        "sun",
      );


    const target =
      sun
        ? scenePositionForEntity(
            sun,
            nextState,
          ) ??
          ZERO_VECTOR
        : ZERO_VECTOR;


    const pose:
      CinematicCameraPose = {
      position: [
        target[0] +
          42,

        target[1] +
          25,

        target[2] +
          72,
      ],

      target,

      up:
        [
          0,
          1,
          0,
        ],

      fovDeg:
        52,

      frameId:
        nextState.scale
          .frameId,

      targetId:
        sun
          ? "sun"
          : null,
    };


    this.navigation
      .setPose(
        pose,
      );


    if (
      sun
    ) {
      this.runtime
        .store
        .focus(
          "sun",
        );
    }


    this.applyPose(
      pose,
      true,
    );
  }


  private movementInput():
    NavigationMovementInput {
    let forward =
      0;

    let right =
      0;

    let up =
      0;


    if (
      this.pressedKeys.has(
        "w",
      )
    ) {
      forward +=
        1;
    }


    if (
      this.pressedKeys.has(
        "s",
      )
    ) {
      forward -=
        1;
    }


    if (
      this.pressedKeys.has(
        "d",
      )
    ) {
      right +=
        1;
    }


    if (
      this.pressedKeys.has(
        "a",
      )
    ) {
      right -=
        1;
    }


    if (
      this.pressedKeys.has(
        "e",
      )
    ) {
      up +=
        1;
    }


    if (
      this.pressedKeys.has(
        "q",
      )
    ) {
      up -=
        1;
    }


    return {
      forward,

      right,

      up,

      boost:
        this.pressedKeys.has(
          "shift",
        ),

      precision:
        this.pressedKeys.has(
          "alt",
        ),
    };
  }


  private hasMovementInput():
    boolean {
    const input =
      this.movementInput();


    return (
      input.forward !==
        0 ||
      input.right !==
        0 ||
      input.up !==
        0
    );
  }


  private handleKeyDown =
    (
      event:
        KeyboardEvent,
    ) => {
      if (
        this.disposed
      ) {
        return;
      }


      if (
        isEditableTarget(
          event.target,
        )
      ) {
        if (
          event.key ===
          "Escape"
        ) {
          this.callbacks
            .onEscape?.();
        }

        return;
      }


      const key =
        event.key.toLowerCase();


      if (
        key ===
        "/"
      ) {
        event.preventDefault();

        this.callbacks
          .onSearchRequest?.();

        return;
      }


      if (
        key ===
        "escape"
      ) {
        this.cancelFlight();

        this.callbacks
          .onEscape?.();

        return;
      }


      if (
        key ===
        "c"
      ) {
        this.callbacks
          .onCatalogToggle?.();

        return;
      }


      if (
        key ===
        "h"
      ) {
        this.home();

        return;
      }


      this.pressedKeys.add(
        key,
      );
    };


  private handleKeyUp =
    (
      event:
        KeyboardEvent,
    ) => {
      this.pressedKeys.delete(
        event.key.toLowerCase(),
      );
    };


  private handleBlur =
    () => {
      this.pressedKeys.clear();

      this.pointers.clear();

      this.dragging =
        false;

      this.pinch =
        null;
    };


  private createPointerRecord(
    event:
      PointerEvent,
  ):
    PointerRecord {
    return {
      id:
        event.pointerId,

      x:
        event.clientX,

      y:
        event.clientY,

      startX:
        event.clientX,

      startY:
        event.clientY,
    };
  }


  private updatePointer(
    event:
      PointerEvent,
  ):
    PointerRecord |
    null {
    const pointer =
      this.pointers.get(
        event.pointerId,
      );


    if (
      !pointer
    ) {
      return null;
    }


    pointer.x =
      event.clientX;

    pointer.y =
      event.clientY;


    return pointer;
  }


  private resetPinch():
    void {
    if (
      this.pointers.size !==
      2
    ) {
      this.pinch =
        null;

      return;
    }


    const pointers =
      [
        ...this.pointers.values(),
      ];


    const first =
      pointers[0];

    const second =
      pointers[1];


    if (
      !first ||
      !second
    ) {
      this.pinch =
        null;

      return;
    }


    const [
      centerX,
      centerY,
    ] =
      pointerCenter(
        first,
        second,
      );


    this.pinch = {
      distance:
        pointerDistance(
          first,
          second,
        ),

      centerX,

      centerY,
    };
  }


  private handlePointerDown =
    (
      event:
        PointerEvent,
    ) => {
      if (
        event.pointerType ===
          "mouse" &&
        event.button !==
          0
      ) {
        return;
      }


      this.cancelFlight();


      this.pointers.set(
        event.pointerId,

        this.createPointerRecord(
          event,
        ),
      );


      this.element
        .setPointerCapture(
          event.pointerId,
        );


      if (
        this.pointers.size ===
        1
      ) {
        this.dragging =
          true;
      }


      this.resetPinch();
    };


  private handlePointerMove =
    (
      event:
        PointerEvent,
    ) => {
      const pointer =
        this.pointers.get(
          event.pointerId,
        );


      if (
        !pointer
      ) {
        return;
      }


      const previousX =
        pointer.x;

      const previousY =
        pointer.y;


      this.updatePointer(
        event,
      );


      if (
        this.pointers.size ===
        1
      ) {
        const deltaX =
          event.clientX -
          previousX;

        const deltaY =
          event.clientY -
          previousY;


        if (
          Math.abs(
            deltaX,
          ) +
            Math.abs(
              deltaY,
            ) <
          0.01
        ) {
          return;
        }


        const pose =
          this.navigation.orbit(
            deltaX,
            deltaY,
          );


        this.applyPose(
          pose,
        );


        return;
      }


      if (
        this.pointers.size !==
        2
      ) {
        return;
      }


      const pointers =
        [
          ...this.pointers.values(),
        ];


      const first =
        pointers[0];

      const second =
        pointers[1];


      if (
        !first ||
        !second
      ) {
        return;
      }


      const distance =
        pointerDistance(
          first,
          second,
        );


      const [
        centerX,
        centerY,
      ] =
        pointerCenter(
          first,
          second,
        );


      if (
        !this.pinch
      ) {
        this.pinch = {
          distance,

          centerX,

          centerY,
        };

        return;
      }


      const previousDistance =
        Math.max(
          1,
          this.pinch
            .distance,
        );


      const ratio =
        distance /
        previousDistance;


      const syntheticWheel =
        -Math.log(
          Math.max(
            0.01,
            ratio,
          ),
        ) *
        850;


      const result =
        this.navigation.dolly(
          syntheticWheel,
        );


      this.applyPose(
        this.navigation.pose,
      );


      if (
        result.reachedMinimum &&
        ratio >
          1.02
      ) {
        this.changeScale(
          "in",
        );
      }


      if (
        result.reachedMaximum &&
        ratio <
          0.98
      ) {
        this.changeScale(
          "out",
        );
      }


      this.pinch = {
        distance,

        centerX,

        centerY,
      };
    };


  private pointerMovedTooFar(
    pointer:
      PointerRecord,
  ):
    boolean {
    const x =
      pointer.x -
      pointer.startX;

    const y =
      pointer.y -
      pointer.startY;


    return (
      Math.sqrt(
        x *
          x +
        y *
          y,
      ) >
      this.clickTolerance
    );
  }


  private commitSingleClick(
    id:
      EntityId |
      null,
  ): void {
    if (
      !id
    ) {
      return;
    }


    this.setSelected(
      id,
    );
  }


  private processClick(
    clientX:
      number,

    clientY:
      number,
  ): void {
    const id =
      this.pickEntity(
        clientX,
        clientY,
      );


    if (
      !id
    ) {
      return;
    }


    const now =
      performance.now();


    const isDouble =
      this.lastClickId ===
        id &&
      now -
        this.lastClickTime <=
      this.doubleClickDelay;


    this.lastClickTime =
      now;

    this.lastClickId =
      id;


    if (
      isDouble
    ) {
      if (
        this.queuedSingleClick !==
        null
      ) {
        window.clearTimeout(
          this.queuedSingleClick,
        );

        this.queuedSingleClick =
          null;
      }


      this.travelTo(
        id,
        now,
      );


      return;
    }


    if (
      this.queuedSingleClick !==
      null
    ) {
      window.clearTimeout(
        this.queuedSingleClick,
      );
    }


    this.queuedSingleClick =
      window.setTimeout(
        () => {
          this.queuedSingleClick =
            null;

          this.commitSingleClick(
            id,
          );
        },

        this.doubleClickDelay,
      );
  }


  private finishPointer(
    event:
      PointerEvent,
  ): void {
    const pointer =
      this.pointers.get(
        event.pointerId,
      );


    if (
      !pointer
    ) {
      return;
    }


    this.updatePointer(
      event,
    );


    const moved =
      this.pointerMovedTooFar(
        pointer,
      );


    this.pointers.delete(
      event.pointerId,
    );


    if (
      this.element
        .hasPointerCapture(
          event.pointerId,
        )
    ) {
      this.element
        .releasePointerCapture(
          event.pointerId,
        );
    }


    if (
      !moved &&
      this.pointers.size ===
        0
    ) {
      this.processClick(
        event.clientX,
        event.clientY,
      );
    }


    this.dragging =
      this.pointers.size >
      0;


    this.resetPinch();
  }


  private handlePointerUp =
    (
      event:
        PointerEvent,
    ) => {
      this.finishPointer(
        event,
      );
    };


  private handlePointerCancel =
    (
      event:
        PointerEvent,
    ) => {
      this.pointers.delete(
        event.pointerId,
      );


      this.dragging =
        this.pointers.size >
        0;


      this.resetPinch();
    };


  private handleWheel =
    (
      event:
        WheelEvent,
    ) => {
      event.preventDefault();


      this.cancelFlight();


      const result =
        this.navigation.dolly(
          event.deltaY,
        );


      this.applyPose(
        this.navigation.pose,
      );


      if (
        result.reachedMinimum &&
        event.deltaY <
          0
      ) {
        this.changeScale(
          "in",
        );
      }


      if (
        result.reachedMaximum &&
        event.deltaY >
          0
      ) {
        this.changeScale(
          "out",
        );
      }
    };


  private handleContextMenu =
    (
      event:
        MouseEvent,
    ) => {
      event.preventDefault();
    };


  private updateFlight(
    now:
      number,
  ): boolean {
    const sample =
      this.navigation
        .updateFlight(
          now,
        );


    if (
      !sample
    ) {
      return false;
    }


    this.applyPose(
      sample.pose,
    );


    if (
      sample.finished
    ) {
      const completedId =
        this.activeFlightId;


      this.activeFlightId =
        null;


      if (
        completedId
      ) {
        this.callbacks
          .onTravelComplete?.(
            completedId,
          );
      }


      this.notifyState(
        true,
      );
    }


    return true;
  }


  private frame =
    (
      now:
        number,
    ) => {
      if (
        !this.runningValue ||
        this.disposed
      ) {
        return;
      }


      const previous =
        this.previousFrameTime >
        0
          ? this.previousFrameTime
          : now;


      const deltaSeconds =
        clampInteraction(
          (
            now -
            previous
          ) /
            1_000,

          0,

          0.05,
        );


      this.previousFrameTime =
        now;


      const flightUpdated =
        this.updateFlight(
          now,
        );


      if (
        !flightUpdated
      ) {
        if (
          this.hasMovementInput()
        ) {
          const pose =
            this.navigation.move(
              this.movementInput(),
              deltaSeconds,
              true,
            );


          this.applyPose(
            pose,
          );
        } else {
          const before =
            this.navigation.pose;


          const pose =
            this.navigation.coast(
              deltaSeconds,
              true,
            );


          const movement =
            vectorLength(
              subtractVector(
                pose.position,
                before.position,
              ),
            );


          if (
            movement >
            1e-8
          ) {
            this.applyPose(
              pose,
            );
          }
        }
      }


      this.notifyState();


      this.animationFrame =
        requestAnimationFrame(
          this.frame,
        );
    };


  start():
    void {
    if (
      this.disposed
    ) {
      throw new Error(
        "Cannot start a disposed UniverseInteractionController.",
      );
    }


    if (
      this.runningValue
    ) {
      return;
    }


    this.runningValue =
      true;


    this.previousFrameTime =
      performance.now();


    this.element.style.touchAction =
      "none";


    this.element.addEventListener(
      "pointerdown",
      this.handlePointerDown,
    );


    this.element.addEventListener(
      "pointermove",
      this.handlePointerMove,
    );


    this.element.addEventListener(
      "pointerup",
      this.handlePointerUp,
    );


    this.element.addEventListener(
      "pointercancel",
      this.handlePointerCancel,
    );


    this.element.addEventListener(
      "wheel",
      this.handleWheel,
      {
        passive:
          false,
      },
    );


    this.element.addEventListener(
      "contextmenu",
      this.handleContextMenu,
    );


    window.addEventListener(
      "keydown",
      this.handleKeyDown,
    );


    window.addEventListener(
      "keyup",
      this.handleKeyUp,
    );


    window.addEventListener(
      "blur",
      this.handleBlur,
    );


    this.animationFrame =
      requestAnimationFrame(
        this.frame,
      );
  }


  stop():
    void {
    if (
      !this.runningValue
    ) {
      return;
    }


    this.runningValue =
      false;


    cancelAnimationFrame(
      this.animationFrame,
    );


    this.animationFrame =
      0;


    this.element.removeEventListener(
      "pointerdown",
      this.handlePointerDown,
    );


    this.element.removeEventListener(
      "pointermove",
      this.handlePointerMove,
    );


    this.element.removeEventListener(
      "pointerup",
      this.handlePointerUp,
    );


    this.element.removeEventListener(
      "pointercancel",
      this.handlePointerCancel,
    );


    this.element.removeEventListener(
      "wheel",
      this.handleWheel,
    );


    this.element.removeEventListener(
      "contextmenu",
      this.handleContextMenu,
    );


    window.removeEventListener(
      "keydown",
      this.handleKeyDown,
    );


    window.removeEventListener(
      "keyup",
      this.handleKeyUp,
    );


    window.removeEventListener(
      "blur",
      this.handleBlur,
    );


    this.pressedKeys.clear();


    this.pointers.clear();


    this.dragging =
      false;


    this.pinch =
      null;


    this.navigation.stop();


    if (
      this.queuedSingleClick !==
      null
    ) {
      window.clearTimeout(
        this.queuedSingleClick,
      );


      this.queuedSingleClick =
        null;
    }
  }


  resync():
    void {
    this.cancelFlight();


    this.synchronizeNavigation();


    this.notifyState(
      true,
    );
  }


  select(
    id:
      EntityId,
  ): void {
    this.setSelected(
      id,
    );
  }


  snapshot():
    UniverseInteractionSnapshot {
    const state =
      this.runtime
        .store
        .getSnapshot();


    return {
      running:
        this.runningValue,

      dragging:
        this.dragging,

      pointerCount:
        this.pointers.size,

      pressedKeys:
        [
          ...this.pressedKeys,
        ],

      selectedId:
        state.selectedId ??
        null,

      focusedId:
        state.focusId ??
        null,

      flightActive:
        this.navigation
          .flightActive,

      scaleMetersPerUnit:
        state.scale
          .metersPerUnit,
    };
  }


  dispose():
    void {
    if (
      this.disposed
    ) {
      return;
    }


    this.stop();


    this.disposed =
      true;
  }
}


export function createUniverseInteraction(
  options:
    UniverseInteractionOptions,
):
  UniverseInteractionController {
  return new UniverseInteractionController(
    options,
  );
}


export function universeInteractionInfo() {
  return {
    version:
      UNIVERSE_INTERACTION_VERSION,

    controls: {
      pointerDrag:
        "orbit",

      pointerClick:
        "select",

      pointerDoubleClick:
        "travel",

      wheel:
        "dolly-and-scale",

      touchDrag:
        "orbit",

      pinch:
        "dolly-and-scale",

      wasd:
        "view-relative-flight",

      qAndE:
        "vertical-flight",

      shift:
        "boost",

      alt:
        "precision",

      slash:
        "search",

      c:
        "catalog",

      h:
        "home",

      escape:
        "cancel",
    },
  } as const;
}
