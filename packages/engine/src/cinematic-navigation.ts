import type {
  EntityId,
  FrameId,
} from "@known-universe/core";


export const CINEMATIC_NAVIGATION_VERSION = 1;


export type NavigationVec3 = [
  number,
  number,
  number,
];


export type CinematicNavigationMode =
  | "orbit"
  | "free"
  | "flight";


export interface CinematicCameraPose {
  position: NavigationVec3;

  target: NavigationVec3;

  up: NavigationVec3;

  fovDeg: number;

  frameId: FrameId;

  targetId: EntityId | null;
}


export interface OrbitCoordinates {
  yawRad: number;

  pitchRad: number;

  distance: number;
}


export interface CameraBasis {
  forward: NavigationVec3;

  right: NavigationVec3;

  up: NavigationVec3;
}


export interface NavigationMovementInput {
  forward: number;

  right: number;

  up: number;

  boost: boolean;

  precision: boolean;
}


export interface NavigationTuning {
  minimumOrbitDistance: number;

  maximumOrbitDistance: number;

  minimumPitchRad: number;

  maximumPitchRad: number;

  orbitRadiansPerPixel: number;

  dollySensitivity: number;

  baseMoveSpeed: number;

  distanceMoveFactor: number;

  maximumMoveSpeed: number;

  boostMultiplier: number;

  precisionMultiplier: number;

  inertiaDamping: number;

  flightDurationMs: number;

  flightArcStrength: number;

  minimumFocusDistance: number;

  maximumFocusDistance: number;

  focusRadiusMultiplier: number;

  minimumFovDeg: number;

  maximumFovDeg: number;
}


export interface NavigationSnapshot {
  mode: CinematicNavigationMode;

  pose: CinematicCameraPose;

  orbit: OrbitCoordinates;

  velocity: NavigationVec3;

  flightActive: boolean;
}


export interface FlyToOptions {
  durationMs?: number;

  preferredDistance?: number;

  radius?: number;

  arcStrength?: number;

  targetId?: EntityId | null;
}


export interface FlyToPlan {
  from: CinematicCameraPose;

  to: CinematicCameraPose;

  startedAtMs: number;

  durationMs: number;

  arcStrength: number;

  arcDirection: NavigationVec3;
}


export interface FlyToSample {
  pose: CinematicCameraPose;

  progress: number;

  finished: boolean;
}


export interface DollyResult {
  orbit: OrbitCoordinates;

  reachedMinimum: boolean;

  reachedMaximum: boolean;
}


export const DEFAULT_NAVIGATION_TUNING:
  Readonly<NavigationTuning> = {
  minimumOrbitDistance: 1.3,

  maximumOrbitDistance: 240,

  minimumPitchRad: -1.43,

  maximumPitchRad: 1.43,

  orbitRadiansPerPixel: 0.0052,

  dollySensitivity: 0.00105,

  baseMoveSpeed: 1.3,

  distanceMoveFactor: 0.48,

  maximumMoveSpeed: 70,

  boostMultiplier: 4,

  precisionMultiplier: 0.16,

  inertiaDamping: 8,

  flightDurationMs: 900,

  flightArcStrength: 0.14,

  minimumFocusDistance: 3.4,

  maximumFocusDistance: 32,

  focusRadiusMultiplier: 9,

  minimumFovDeg: 24,

  maximumFovDeg: 85,
};


const WORLD_UP:
  NavigationVec3 = [
  0,
  1,
  0,
];


const FALLBACK_FORWARD:
  NavigationVec3 = [
  0,
  0,
  -1,
];


const FALLBACK_RIGHT:
  NavigationVec3 = [
  1,
  0,
  0,
];


function finiteOr(
  value: number,
  fallback: number,
): number {
  return Number.isFinite(value)
    ? value
    : fallback;
}


export function clampNavigationValue(
  value: number,
  minimum: number,
  maximum: number,
): number {
  const safeValue =
    finiteOr(value, minimum);

  const safeMinimum =
    finiteOr(minimum, 0);

  const safeMaximum =
    finiteOr(maximum, safeMinimum);

  if (safeMaximum < safeMinimum) {
    return clampNavigationValue(
      safeValue,
      safeMaximum,
      safeMinimum,
    );
  }

  return Math.min(
    safeMaximum,
    Math.max(
      safeMinimum,
      safeValue,
    ),
  );
}


export function addNavigationVec3(
  left: NavigationVec3,
  right: NavigationVec3,
): NavigationVec3 {
  return [
    left[0] + right[0],
    left[1] + right[1],
    left[2] + right[2],
  ];
}


export function subtractNavigationVec3(
  left: NavigationVec3,
  right: NavigationVec3,
): NavigationVec3 {
  return [
    left[0] - right[0],
    left[1] - right[1],
    left[2] - right[2],
  ];
}


export function multiplyNavigationVec3(
  value: NavigationVec3,
  scalar: number,
): NavigationVec3 {
  return [
    value[0] * scalar,
    value[1] * scalar,
    value[2] * scalar,
  ];
}


export function divideNavigationVec3(
  value: NavigationVec3,
  scalar: number,
): NavigationVec3 {
  if (
    !Number.isFinite(scalar) ||
    Math.abs(scalar) < 1e-12
  ) {
    return [
      0,
      0,
      0,
    ];
  }

  return [
    value[0] / scalar,
    value[1] / scalar,
    value[2] / scalar,
  ];
}


export function dotNavigationVec3(
  left: NavigationVec3,
  right: NavigationVec3,
): number {
  return (
    left[0] * right[0] +
    left[1] * right[1] +
    left[2] * right[2]
  );
}


export function crossNavigationVec3(
  left: NavigationVec3,
  right: NavigationVec3,
): NavigationVec3 {
  return [
    left[1] * right[2] -
      left[2] * right[1],

    left[2] * right[0] -
      left[0] * right[2],

    left[0] * right[1] -
      left[1] * right[0],
  ];
}


export function navigationVec3LengthSquared(
  value: NavigationVec3,
): number {
  return dotNavigationVec3(
    value,
    value,
  );
}


export function navigationVec3Length(
  value: NavigationVec3,
): number {
  return Math.sqrt(
    navigationVec3LengthSquared(value),
  );
}


export function normalizeNavigationVec3(
  value: NavigationVec3,
  fallback: NavigationVec3 = FALLBACK_FORWARD,
): NavigationVec3 {
  const magnitude =
    navigationVec3Length(value);

  if (
    !Number.isFinite(magnitude) ||
    magnitude < 1e-10
  ) {
    return [
      fallback[0],
      fallback[1],
      fallback[2],
    ];
  }

  return divideNavigationVec3(
    value,
    magnitude,
  );
}


export function distanceNavigationVec3(
  left: NavigationVec3,
  right: NavigationVec3,
): number {
  return navigationVec3Length(
    subtractNavigationVec3(
      left,
      right,
    ),
  );
}


export function lerpNavigationValue(
  from: number,
  to: number,
  amount: number,
): number {
  return (
    from +
    (to - from) *
      amount
  );
}


export function lerpNavigationVec3(
  from: NavigationVec3,
  to: NavigationVec3,
  amount: number,
): NavigationVec3 {
  return [
    lerpNavigationValue(
      from[0],
      to[0],
      amount,
    ),

    lerpNavigationValue(
      from[1],
      to[1],
      amount,
    ),

    lerpNavigationValue(
      from[2],
      to[2],
      amount,
    ),
  ];
}


export function navigationSmoothStep(
  amount: number,
): number {
  const value =
    clampNavigationValue(
      amount,
      0,
      1,
    );

  return (
    value *
    value *
    (
      3 -
      2 * value
    )
  );
}


export function navigationSmootherStep(
  amount: number,
): number {
  const value =
    clampNavigationValue(
      amount,
      0,
      1,
    );

  return (
    value *
    value *
    value *
    (
      value *
      (
        value * 6 -
        15
      ) +
      10
    )
  );
}


export function cloneNavigationPose(
  pose: CinematicCameraPose,
): CinematicCameraPose {
  return {
    position: [
      pose.position[0],
      pose.position[1],
      pose.position[2],
    ],

    target: [
      pose.target[0],
      pose.target[1],
      pose.target[2],
    ],

    up: [
      pose.up[0],
      pose.up[1],
      pose.up[2],
    ],

    fovDeg:
      pose.fovDeg,

    frameId:
      pose.frameId,

    targetId:
      pose.targetId,
  };
}


export function validateNavigationPose(
  pose: CinematicCameraPose,
): string[] {
  const issues:
    string[] = [];

  const vectors = [
    [
      "position",
      pose.position,
    ],

    [
      "target",
      pose.target,
    ],

    [
      "up",
      pose.up,
    ],
  ] as const;

  for (
    const [
      name,
      vector,
    ] of vectors
  ) {
    if (
      vector.length !== 3 ||
      !vector.every(
        value =>
          Number.isFinite(value),
      )
    ) {
      issues.push(
        `${name} must contain three finite values.`,
      );
    }
  }

  if (
    !Number.isFinite(
      pose.fovDeg,
    ) ||
    pose.fovDeg <= 0 ||
    pose.fovDeg >= 180
  ) {
    issues.push(
      "fovDeg must be between 0 and 180 degrees.",
    );
  }

  if (
    navigationVec3Length(
      pose.up,
    ) < 1e-8
  ) {
    issues.push(
      "Camera up vector cannot be zero.",
    );
  }

  if (
    distanceNavigationVec3(
      pose.position,
      pose.target,
    ) < 1e-8
  ) {
    issues.push(
      "Camera position and target cannot be identical.",
    );
  }

  return issues;
}


export function cameraBasisFromPose(
  pose: CinematicCameraPose,
): CameraBasis {
  const forward =
    normalizeNavigationVec3(
      subtractNavigationVec3(
        pose.target,
        pose.position,
      ),
    );

  let right =
    crossNavigationVec3(
      forward,
      pose.up,
    );

  if (
    navigationVec3LengthSquared(
      right,
    ) < 1e-8
  ) {
    right =
      crossNavigationVec3(
        forward,
        WORLD_UP,
      );
  }

  if (
    navigationVec3LengthSquared(
      right,
    ) < 1e-8
  ) {
    right = [
      FALLBACK_RIGHT[0],
      FALLBACK_RIGHT[1],
      FALLBACK_RIGHT[2],
    ];
  }

  right =
    normalizeNavigationVec3(
      right,
      FALLBACK_RIGHT,
    );

  const up =
    normalizeNavigationVec3(
      crossNavigationVec3(
        right,
        forward,
      ),
      WORLD_UP,
    );

  return {
    forward,
    right,
    up,
  };
}


export function orbitCoordinatesFromPose(
  pose: CinematicCameraPose,
  tuning: NavigationTuning =
    DEFAULT_NAVIGATION_TUNING,
): OrbitCoordinates {
  const offset =
    subtractNavigationVec3(
      pose.position,
      pose.target,
    );

  const distance =
    clampNavigationValue(
      navigationVec3Length(
        offset,
      ),
      tuning.minimumOrbitDistance,
      tuning.maximumOrbitDistance,
    );

  const direction =
    normalizeNavigationVec3(
      offset,
      [
        0.55,
        0.24,
        0.8,
      ],
    );

  const yawRad =
    Math.atan2(
      direction[0],
      direction[2],
    );

  const pitchRad =
    clampNavigationValue(
      Math.asin(
        clampNavigationValue(
          direction[1],
          -1,
          1,
        ),
      ),
      tuning.minimumPitchRad,
      tuning.maximumPitchRad,
    );

  return {
    yawRad,
    pitchRad,
    distance,
  };
}


export function positionFromOrbitCoordinates(
  target: NavigationVec3,
  orbit: OrbitCoordinates,
): NavigationVec3 {
  const horizontal =
    Math.cos(
      orbit.pitchRad,
    ) *
    orbit.distance;

  return [
    target[0] +
      Math.sin(
        orbit.yawRad,
      ) *
        horizontal,

    target[1] +
      Math.sin(
        orbit.pitchRad,
      ) *
        orbit.distance,

    target[2] +
      Math.cos(
        orbit.yawRad,
      ) *
        horizontal,
  ];
}


export function poseFromOrbitCoordinates(
  pose: CinematicCameraPose,
  orbit: OrbitCoordinates,
): CinematicCameraPose {
  return {
    ...cloneNavigationPose(pose),

    position:
      positionFromOrbitCoordinates(
        pose.target,
        orbit,
      ),
  };
}


export function applyOrbitGesture(
  pose: CinematicCameraPose,
  deltaPixelsX: number,
  deltaPixelsY: number,
  tuning: NavigationTuning =
    DEFAULT_NAVIGATION_TUNING,
): CinematicCameraPose {
  const current =
    orbitCoordinatesFromPose(
      pose,
      tuning,
    );

  const next:
    OrbitCoordinates = {
    yawRad:
      current.yawRad -
      deltaPixelsX *
        tuning.orbitRadiansPerPixel,

    pitchRad:
      clampNavigationValue(
        current.pitchRad +
          deltaPixelsY *
            tuning.orbitRadiansPerPixel,

        tuning.minimumPitchRad,

        tuning.maximumPitchRad,
      ),

    distance:
      current.distance,
  };

  return poseFromOrbitCoordinates(
    pose,
    next,
  );
}


export function dollyOrbit(
  pose: CinematicCameraPose,
  wheelDelta: number,
  tuning: NavigationTuning =
    DEFAULT_NAVIGATION_TUNING,
): DollyResult {
  const orbit =
    orbitCoordinatesFromPose(
      pose,
      tuning,
    );

  const factor =
    Math.exp(
      wheelDelta *
        tuning.dollySensitivity,
    );

  const requestedDistance =
    orbit.distance *
    factor;

  const distance =
    clampNavigationValue(
      requestedDistance,
      tuning.minimumOrbitDistance,
      tuning.maximumOrbitDistance,
    );

  return {
    orbit: {
      ...orbit,

      distance,
    },

    reachedMinimum:
      requestedDistance <=
      tuning.minimumOrbitDistance,

    reachedMaximum:
      requestedDistance >=
      tuning.maximumOrbitDistance,
  };
}


export function applyDollyGesture(
  pose: CinematicCameraPose,
  wheelDelta: number,
  tuning: NavigationTuning =
    DEFAULT_NAVIGATION_TUNING,
): CinematicCameraPose {
  const result =
    dollyOrbit(
      pose,
      wheelDelta,
      tuning,
    );

  return poseFromOrbitCoordinates(
    pose,
    result.orbit,
  );
}


export function movementSpeedForPose(
  pose: CinematicCameraPose,
  input: NavigationMovementInput,
  tuning: NavigationTuning =
    DEFAULT_NAVIGATION_TUNING,
): number {
  const distance =
    distanceNavigationVec3(
      pose.position,
      pose.target,
    );

  let speed =
    Math.max(
      tuning.baseMoveSpeed,
      distance *
        tuning.distanceMoveFactor,
    );

  speed =
    Math.min(
      speed,
      tuning.maximumMoveSpeed,
    );

  if (input.boost) {
    speed *=
      tuning.boostMultiplier;
  }

  if (input.precision) {
    speed *=
      tuning.precisionMultiplier;
  }

  return speed;
}


export function movementDirectionFromPose(
  pose: CinematicCameraPose,
  input: NavigationMovementInput,
): NavigationVec3 {
  const basis =
    cameraBasisFromPose(
      pose,
    );

  let direction:
    NavigationVec3 = [
    0,
    0,
    0,
  ];

  direction =
    addNavigationVec3(
      direction,

      multiplyNavigationVec3(
        basis.forward,
        input.forward,
      ),
    );

  direction =
    addNavigationVec3(
      direction,

      multiplyNavigationVec3(
        basis.right,
        input.right,
      ),
    );

  direction =
    addNavigationVec3(
      direction,

      multiplyNavigationVec3(
        basis.up,
        input.up,
      ),
    );

  if (
    navigationVec3LengthSquared(
      direction,
    ) < 1e-10
  ) {
    return [
      0,
      0,
      0,
    ];
  }

  return normalizeNavigationVec3(
    direction,
  );
}


export function translateCameraPose(
  pose: CinematicCameraPose,
  translation: NavigationVec3,
  translateTarget: boolean,
): CinematicCameraPose {
  const next =
    cloneNavigationPose(
      pose,
    );

  next.position =
    addNavigationVec3(
      pose.position,
      translation,
    );

  if (translateTarget) {
    next.target =
      addNavigationVec3(
        pose.target,
        translation,
      );
  }

  return next;
}


export function moveCameraViewRelative(
  pose: CinematicCameraPose,
  input: NavigationMovementInput,
  deltaSeconds: number,
  tuning: NavigationTuning =
    DEFAULT_NAVIGATION_TUNING,
  translateTarget = true,
): CinematicCameraPose {
  if (
    !Number.isFinite(
      deltaSeconds,
    ) ||
    deltaSeconds <= 0
  ) {
    return cloneNavigationPose(
      pose,
    );
  }

  const direction =
    movementDirectionFromPose(
      pose,
      input,
    );

  if (
    navigationVec3LengthSquared(
      direction,
    ) < 1e-10
  ) {
    return cloneNavigationPose(
      pose,
    );
  }

  const speed =
    movementSpeedForPose(
      pose,
      input,
      tuning,
    );

  const translation =
    multiplyNavigationVec3(
      direction,
      speed *
        deltaSeconds,
    );

  return translateCameraPose(
    pose,
    translation,
    translateTarget,
  );
}


export function focusDistanceForRadius(
  radius: number,
  tuning: NavigationTuning =
    DEFAULT_NAVIGATION_TUNING,
): number {
  const safeRadius =
    Number.isFinite(radius) &&
    radius > 0
      ? radius
      : 1;

  return clampNavigationValue(
    safeRadius *
      tuning.focusRadiusMultiplier,

    tuning.minimumFocusDistance,

    tuning.maximumFocusDistance,
  );
}


export function createFocusedPose(
  current: CinematicCameraPose,
  target: NavigationVec3,
  targetId: EntityId | null,
  radius: number,
  tuning: NavigationTuning =
    DEFAULT_NAVIGATION_TUNING,
  preferredDistance?: number,
): CinematicCameraPose {
  const currentOffset =
    subtractNavigationVec3(
      current.position,
      current.target,
    );

  let direction =
    normalizeNavigationVec3(
      currentOffset,
      [
        0.58,
        0.25,
        0.77,
      ],
    );

  if (
    Math.abs(
      direction[1],
    ) < 0.08
  ) {
    direction =
      normalizeNavigationVec3([
        direction[0],
        0.2,
        direction[2],
      ]);
  }

  const calculatedDistance =
    focusDistanceForRadius(
      radius,
      tuning,
    );

  const distance =
    preferredDistance ===
      undefined
      ? calculatedDistance
      : clampNavigationValue(
          preferredDistance,
          tuning.minimumFocusDistance,
          tuning.maximumFocusDistance,
        );

  const next =
    cloneNavigationPose(
      current,
    );

  next.target = [
    target[0],
    target[1],
    target[2],
  ];

  next.targetId =
    targetId;

  next.position =
    addNavigationVec3(
      target,

      multiplyNavigationVec3(
        direction,
        distance,
      ),
    );

  next.fovDeg =
    clampNavigationValue(
      current.fovDeg,
      tuning.minimumFovDeg,
      tuning.maximumFovDeg,
    );

  return next;
}


function chooseFlightArcDirection(
  from: CinematicCameraPose,
  to: CinematicCameraPose,
): NavigationVec3 {
  const travel =
    subtractNavigationVec3(
      to.position,
      from.position,
    );

  const averageForward =
    normalizeNavigationVec3(
      addNavigationVec3(
        subtractNavigationVec3(
          from.target,
          from.position,
        ),

        subtractNavigationVec3(
          to.target,
          to.position,
        ),
      ),
    );

  let side =
    crossNavigationVec3(
      travel,
      averageForward,
    );

  if (
    navigationVec3LengthSquared(
      side,
    ) < 1e-8
  ) {
    side =
      crossNavigationVec3(
        travel,
        WORLD_UP,
      );
  }

  if (
    navigationVec3LengthSquared(
      side,
    ) < 1e-8
  ) {
    side = [
      0,
      1,
      0,
    ];
  }

  const normalizedSide =
    normalizeNavigationVec3(
      side,
      WORLD_UP,
    );

  const upward =
    addNavigationVec3(
      normalizedSide,

      multiplyNavigationVec3(
        WORLD_UP,
        0.35,
      ),
    );

  return normalizeNavigationVec3(
    upward,
    WORLD_UP,
  );
}


export function createFlyToPlan(
  from: CinematicCameraPose,
  target: NavigationVec3,
  targetId: EntityId | null,
  radius: number,
  startedAtMs: number,
  options: FlyToOptions = {},
  tuning: NavigationTuning =
    DEFAULT_NAVIGATION_TUNING,
): FlyToPlan {
  const to =
    createFocusedPose(
      from,
      target,
      targetId,
      radius,
      tuning,
      options.preferredDistance,
    );

  const durationMs =
    clampNavigationValue(
      options.durationMs ??
        tuning.flightDurationMs,
      100,
      10_000,
    );

  const arcStrength =
    clampNavigationValue(
      options.arcStrength ??
        tuning.flightArcStrength,
      0,
      1,
    );

  return {
    from:
      cloneNavigationPose(
        from,
      ),

    to,

    startedAtMs,

    durationMs,

    arcStrength,

    arcDirection:
      chooseFlightArcDirection(
        from,
        to,
      ),
  };
}


export function sampleFlyToPlan(
  plan: FlyToPlan,
  nowMs: number,
): FlyToSample {
  const elapsed =
    Math.max(
      0,
      nowMs -
        plan.startedAtMs,
    );

  const progress =
    clampNavigationValue(
      elapsed /
        plan.durationMs,
      0,
      1,
    );

  const eased =
    navigationSmootherStep(
      progress,
    );

  const basePosition =
    lerpNavigationVec3(
      plan.from.position,
      plan.to.position,
      eased,
    );

  const travelDistance =
    distanceNavigationVec3(
      plan.from.position,
      plan.to.position,
    );

  const arcEnvelope =
    Math.sin(
      Math.PI *
        progress,
    );

  const arcOffset =
    multiplyNavigationVec3(
      plan.arcDirection,

      travelDistance *
        plan.arcStrength *
        arcEnvelope,
    );

  const position =
    addNavigationVec3(
      basePosition,
      arcOffset,
    );

  const target =
    lerpNavigationVec3(
      plan.from.target,
      plan.to.target,
      eased,
    );

  const up =
    normalizeNavigationVec3(
      lerpNavigationVec3(
        plan.from.up,
        plan.to.up,
        eased,
      ),
      WORLD_UP,
    );

  const fovDeg =
    lerpNavigationValue(
      plan.from.fovDeg,
      plan.to.fovDeg,
      eased,
    );

  return {
    pose: {
      position,

      target,

      up,

      fovDeg,

      frameId:
        plan.to.frameId,

      targetId:
        plan.to.targetId,
    },

    progress,

    finished:
      progress >= 1,
  };
}


export function dampNavigationVelocity(
  velocity: NavigationVec3,
  damping: number,
  deltaSeconds: number,
): NavigationVec3 {
  if (
    deltaSeconds <= 0
  ) {
    return [
      velocity[0],
      velocity[1],
      velocity[2],
    ];
  }

  const safeDamping =
    Math.max(
      0,
      damping,
    );

  const factor =
    Math.exp(
      -safeDamping *
        deltaSeconds,
    );

  return multiplyNavigationVec3(
    velocity,
    factor,
  );
}


export function integrateNavigationVelocity(
  pose: CinematicCameraPose,
  velocity: NavigationVec3,
  deltaSeconds: number,
  translateTarget: boolean,
): CinematicCameraPose {
  if (
    deltaSeconds <= 0
  ) {
    return cloneNavigationPose(
      pose,
    );
  }

  return translateCameraPose(
    pose,

    multiplyNavigationVec3(
      velocity,
      deltaSeconds,
    ),

    translateTarget,
  );
}


export class CinematicNavigationController {
  private poseValue:
    CinematicCameraPose;

  private modeValue:
    CinematicNavigationMode =
    "orbit";

  private velocityValue:
    NavigationVec3 = [
    0,
    0,
    0,
  ];

  private flightValue:
    FlyToPlan |
    null =
    null;

  private readonly tuningValue:
    NavigationTuning;


  constructor(
    initialPose: CinematicCameraPose,
    tuning: Partial<NavigationTuning> = {},
  ) {
    const issues =
      validateNavigationPose(
        initialPose,
      );

    if (
      issues.length >
      0
    ) {
      throw new Error(
        `Invalid cinematic camera pose: ${issues.join(" ")}`,
      );
    }

    this.poseValue =
      cloneNavigationPose(
        initialPose,
      );

    this.tuningValue = {
      ...DEFAULT_NAVIGATION_TUNING,
      ...tuning,
    };
  }


  get tuning():
    Readonly<NavigationTuning> {
    return this.tuningValue;
  }


  get mode():
    CinematicNavigationMode {
    return this.modeValue;
  }


  get pose():
    CinematicCameraPose {
    return cloneNavigationPose(
      this.poseValue,
    );
  }


  get velocity():
    NavigationVec3 {
    return [
      this.velocityValue[0],
      this.velocityValue[1],
      this.velocityValue[2],
    ];
  }


  get flightActive():
    boolean {
    return this.flightValue !==
      null;
  }


  setPose(
    pose: CinematicCameraPose,
  ): void {
    const issues =
      validateNavigationPose(
        pose,
      );

    if (
      issues.length >
      0
    ) {
      throw new Error(
        `Invalid cinematic camera pose: ${issues.join(" ")}`,
      );
    }

    this.poseValue =
      cloneNavigationPose(
        pose,
      );

    this.flightValue =
      null;

    this.velocityValue = [
      0,
      0,
      0,
    ];
  }


  setMode(
    mode: CinematicNavigationMode,
  ): void {
    this.modeValue =
      mode;

    if (
      mode !==
      "flight"
    ) {
      this.flightValue =
        null;
    }
  }


  setTarget(
    target: NavigationVec3,
    targetId: EntityId | null,
  ): void {
    this.poseValue = {
      ...this.poseValue,

      target: [
        target[0],
        target[1],
        target[2],
      ],

      targetId,
    };
  }


  orbit(
    deltaPixelsX: number,
    deltaPixelsY: number,
  ): CinematicCameraPose {
    this.cancelFlight();

    this.modeValue =
      "orbit";

    this.poseValue =
      applyOrbitGesture(
        this.poseValue,
        deltaPixelsX,
        deltaPixelsY,
        this.tuningValue,
      );

    return this.pose;
  }


  dolly(
    wheelDelta: number,
  ): DollyResult {
    this.cancelFlight();

    this.modeValue =
      "orbit";

    const result =
      dollyOrbit(
        this.poseValue,
        wheelDelta,
        this.tuningValue,
      );

    this.poseValue =
      poseFromOrbitCoordinates(
        this.poseValue,
        result.orbit,
      );

    return result;
  }


  move(
    input: NavigationMovementInput,
    deltaSeconds: number,
    translateTarget = true,
  ): CinematicCameraPose {
    this.cancelFlight();

    this.modeValue =
      "free";

    const direction =
      movementDirectionFromPose(
        this.poseValue,
        input,
      );

    if (
      navigationVec3LengthSquared(
        direction,
      ) <
      1e-10
    ) {
      return this.pose;
    }

    const speed =
      movementSpeedForPose(
        this.poseValue,
        input,
        this.tuningValue,
      );

    const desiredVelocity =
      multiplyNavigationVec3(
        direction,
        speed,
      );

    const response =
      1 -
      Math.exp(
        -12 *
          Math.max(
            0,
            deltaSeconds,
          ),
      );

    this.velocityValue =
      lerpNavigationVec3(
        this.velocityValue,
        desiredVelocity,
        response,
      );

    this.poseValue =
      integrateNavigationVelocity(
        this.poseValue,
        this.velocityValue,
        deltaSeconds,
        translateTarget,
      );

    return this.pose;
  }


  coast(
    deltaSeconds: number,
    translateTarget = true,
  ): CinematicCameraPose {
    if (
      this.flightValue
    ) {
      return this.pose;
    }

    this.velocityValue =
      dampNavigationVelocity(
        this.velocityValue,
        this.tuningValue
          .inertiaDamping,
        deltaSeconds,
      );

    if (
      navigationVec3LengthSquared(
        this.velocityValue,
      ) <
      1e-8
    ) {
      this.velocityValue = [
        0,
        0,
        0,
      ];

      return this.pose;
    }

    this.poseValue =
      integrateNavigationVelocity(
        this.poseValue,
        this.velocityValue,
        deltaSeconds,
        translateTarget,
      );

    return this.pose;
  }


  beginFlight(
    target: NavigationVec3,
    targetId: EntityId | null,
    radius: number,
    nowMs: number,
    options: FlyToOptions = {},
  ): FlyToPlan {
    this.velocityValue = [
      0,
      0,
      0,
    ];

    this.flightValue =
      createFlyToPlan(
        this.poseValue,
        target,
        targetId,
        radius,
        nowMs,
        options,
        this.tuningValue,
      );

    this.modeValue =
      "flight";

    return {
      ...this.flightValue,

      from:
        cloneNavigationPose(
          this.flightValue.from,
        ),

      to:
        cloneNavigationPose(
          this.flightValue.to,
        ),

      arcDirection: [
        this.flightValue
          .arcDirection[0],

        this.flightValue
          .arcDirection[1],

        this.flightValue
          .arcDirection[2],
      ],
    };
  }


  updateFlight(
    nowMs: number,
  ): FlyToSample | null {
    const flight =
      this.flightValue;

    if (
      !flight
    ) {
      return null;
    }

    const sample =
      sampleFlyToPlan(
        flight,
        nowMs,
      );

    this.poseValue =
      cloneNavigationPose(
        sample.pose,
      );

    if (
      sample.finished
    ) {
      this.flightValue =
        null;

      this.modeValue =
        "orbit";
    }

    return sample;
  }


  cancelFlight():
    void {
    if (
      !this.flightValue
    ) {
      return;
    }

    this.flightValue =
      null;

    this.modeValue =
      "orbit";
  }


  stop():
    void {
    this.velocityValue = [
      0,
      0,
      0,
    ];

    this.cancelFlight();
  }


  focusImmediately(
    target: NavigationVec3,
    targetId: EntityId | null,
    radius: number,
    preferredDistance?: number,
  ): CinematicCameraPose {
    this.stop();

    this.modeValue =
      "orbit";

    this.poseValue =
      createFocusedPose(
        this.poseValue,
        target,
        targetId,
        radius,
        this.tuningValue,
        preferredDistance,
      );

    return this.pose;
  }


  changeFrame(
    frameId: FrameId,
  ): void {
    this.stop();

    this.poseValue = {
      ...this.poseValue,

      frameId,
    };
  }


  setFieldOfView(
    fovDeg: number,
  ): void {
    this.poseValue = {
      ...this.poseValue,

      fovDeg:
        clampNavigationValue(
          fovDeg,
          this.tuningValue
            .minimumFovDeg,
          this.tuningValue
            .maximumFovDeg,
        ),
    };
  }


  snapshot():
    NavigationSnapshot {
    return {
      mode:
        this.modeValue,

      pose:
        this.pose,

      orbit:
        orbitCoordinatesFromPose(
          this.poseValue,
          this.tuningValue,
        ),

      velocity:
        this.velocity,

      flightActive:
        this.flightActive,
    };
  }
}


export function cinematicNavigationInfo() {
  return {
    version:
      CINEMATIC_NAVIGATION_VERSION,

    features: [
      "orbit-camera",
      "smooth-dolly",
      "view-relative-movement",
      "boost-and-precision",
      "camera-inertia",
      "cinematic-fly-to",
      "focus-distance",
      "browser-independent",
    ] as const,
  };
}