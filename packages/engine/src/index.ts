import type {

  AstroTime,

  EntityId,

  FrameId,

  SpaceEntity,

  Vec3,

} from "@known-universe/core";



/* -------------------------------------------------------------------------- */

/* Engine identity                                                            */

/* -------------------------------------------------------------------------- */



export const ENGINE_VERSION = 3;

export const ENGINE_NAME = "UNIVERSE Engine";

export const ENGINE_ARCHITECTURE_VERSION = 3;



/* -------------------------------------------------------------------------- */

/* Basic numeric utilities                                                    */

/* -------------------------------------------------------------------------- */



function clamp(value: number, minimum: number, maximum: number): number {

  return Math.min(maximum, Math.max(minimum, value));

}



function finiteOr(value: number, fallback: number): number {

  return Number.isFinite(value) ? value : fallback;

}



function positiveOr(value: number, fallback: number): number {

  return Number.isFinite(value) && value > 0 ? value : fallback;

}



function addVec3(a: Vec3, b: Vec3): Vec3 {

  return [

    a[0] + b[0],

    a[1] + b[1],

    a[2] + b[2],

  ];

}



function subtractVec3(a: Vec3, b: Vec3): Vec3 {

  return [

    a[0] - b[0],

    a[1] - b[1],

    a[2] - b[2],

  ];

}



function multiplyVec3(vector: Vec3, amount: number): Vec3 {

  return [

    vector[0] * amount,

    vector[1] * amount,

    vector[2] * amount,

  ];

}



function lengthVec3(vector: Vec3): number {

  return Math.sqrt(

    vector[0] * vector[0] +

      vector[1] * vector[1] +

      vector[2] * vector[2],

  );

}



function distanceVec3(a: Vec3, b: Vec3): number {

  return lengthVec3(subtractVec3(a, b));

}



function normalizeVec3(vector: Vec3): Vec3 {

  const length = lengthVec3(vector);



  if (length <= Number.EPSILON) {

    return [0, 0, 0];

  }



  return [

    vector[0] / length,

    vector[1] / length,

    vector[2] / length,

  ];

}



function dotVec3(a: Vec3, b: Vec3): number {

  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

}



function crossVec3(a: Vec3, b: Vec3): Vec3 {

  return [

    a[1] * b[2] - a[2] * b[1],

    a[2] * b[0] - a[0] * b[2],

    a[0] * b[1] - a[1] * b[0],

  ];

}



function mixNumber(from: number, to: number, amount: number): number {

  const t = clamp(amount, 0, 1);

  return from + (to - from) * t;

}



function mixVec3(from: Vec3, to: Vec3, amount: number): Vec3 {

  const t = clamp(amount, 0, 1);



  return [

    mixNumber(from[0], to[0], t),

    mixNumber(from[1], to[1], t),

    mixNumber(from[2], to[2], t),

  ];

}



function smoothStep(amount: number): number {

  const t = clamp(amount, 0, 1);

  return t * t * (3 - 2 * t);

}



function smootherStep(amount: number): number {

  const t = clamp(amount, 0, 1);

  return t * t * t * (t * (t * 6 - 15) + 10);

}



function damp(

  current: number,

  target: number,

  smoothing: number,

  deltaSeconds: number,

): number {

  const rate = Math.max(0, smoothing);

  const factor = 1 - Math.exp(-rate * Math.max(0, deltaSeconds));



  return current + (target - current) * factor;

}



function dampVec3(

  current: Vec3,

  target: Vec3,

  smoothing: number,

  deltaSeconds: number,

): Vec3 {

  return [

    damp(current[0], target[0], smoothing, deltaSeconds),

    damp(current[1], target[1], smoothing, deltaSeconds),

    damp(current[2], target[2], smoothing, deltaSeconds),

  ];

}



function isFiniteVec3(vector: Vec3): boolean {

  return (

    Number.isFinite(vector[0]) &&

    Number.isFinite(vector[1]) &&

    Number.isFinite(vector[2])

  );

}



function cloneVec3(vector: Vec3): Vec3 {

  return [vector[0], vector[1], vector[2]];

}



/* -------------------------------------------------------------------------- */

/* Scale hierarchy                                                            */

/* -------------------------------------------------------------------------- */



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



export interface ScaleBandDefinition {

  band: ScaleBand;

  minimumMetersPerUnit: number;

  label: string;

  description: string;

}



export const SCALE_BANDS: readonly ScaleBandDefinition[] = [

  {

    band: "surface",

    minimumMetersPerUnit: 0,

    label: "Surface",

    description: "Human and local surface scale",

  },

  {

    band: "regional",

    minimumMetersPerUnit: 100,

    label: "Regional",

    description: "Local geographic and regional scale",

  },

  {

    band: "planet",

    minimumMetersPerUnit: 10_000,

    label: "Planet",

    description: "Planetary scale",

  },

  {

    band: "orbital",

    minimumMetersPerUnit: 1_000_000,

    label: "Orbital",

    description: "Low orbit through planetary neighborhood",

  },

  {

    band: "system",

    minimumMetersPerUnit: 100_000_000,

    label: "System",

    description: "Planetary system scale",

  },

  {

    band: "stellar",

    minimumMetersPerUnit: 100_000_000_000,

    label: "Stellar",

    description: "Interplanetary and stellar-neighborhood scale",

  },

  {

    band: "galactic",

    minimumMetersPerUnit: 1e15,

    label: "Galactic",

    description: "Galaxy scale",

  },

  {

    band: "intergalactic",

    minimumMetersPerUnit: 1e18,

    label: "Intergalactic",

    description: "Large-scale galaxy structures",

  },

  {

    band: "cosmic",

    minimumMetersPerUnit: 1e21,

    label: "Cosmic",

    description: "Cosmological scale",

  },

];



export function scaleBandFor(metersPerUnit: number): ScaleBand {

  const value = Math.max(0, finiteOr(metersPerUnit, 0));



  let result: ScaleBand = "surface";



  for (const definition of SCALE_BANDS) {

    if (value >= definition.minimumMetersPerUnit) {

      result = definition.band;

    }

  }



  return result;

}



export function scaleBandIndex(band: ScaleBand): number {

  const index = SCALE_BANDS.findIndex(

    (definition) => definition.band === band,

  );



  return index < 0 ? 0 : index;

}



export function nextScaleBand(band: ScaleBand): ScaleBand {

  const index = scaleBandIndex(band);



  return SCALE_BANDS[

    Math.min(SCALE_BANDS.length - 1, index + 1)

  ]?.band ?? "cosmic";

}



export function previousScaleBand(band: ScaleBand): ScaleBand {

  const index = scaleBandIndex(band);



  return SCALE_BANDS[

    Math.max(0, index - 1)

  ]?.band ?? "surface";

}



export function scaleForBand(

  band: ScaleBand,

  frameId: FrameId,

): ScaleState {

  const definition = SCALE_BANDS.find(

    (candidate) => candidate.band === band,

  );



  const minimum = definition?.minimumMetersPerUnit ?? 1;



  return {

    band,

    frameId,

    metersPerUnit:

      band === "surface"

        ? 1

        : Math.max(1, minimum),

  };

}



export function normalizeScale(scale: ScaleState): ScaleState {

  const metersPerUnit = clamp(

    positiveOr(scale.metersPerUnit, 1),

    1e-9,

    1e30,

  );



  return {

    ...scale,

    metersPerUnit,

    band: scaleBandFor(metersPerUnit),

  };

}



export function changeScale(

  scale: ScaleState,

  multiplier: number,

): ScaleState {

  if (!Number.isFinite(multiplier) || multiplier <= 0) {

    return scale;

  }



  const metersPerUnit = clamp(

    scale.metersPerUnit * multiplier,

    1e-9,

    1e30,

  );



  return {

    ...scale,

    metersPerUnit,

    band: scaleBandFor(metersPerUnit),

  };

}



export function semanticZoom(

  scale: ScaleState,

  wheelDelta: number,

  sensitivity = 1,

): ScaleState {

  if (

    wheelDelta === 0 ||

    !Number.isFinite(wheelDelta) ||

    !Number.isFinite(sensitivity)

  ) {

    return scale;

  }



  const direction = wheelDelta > 0 ? 1 : -1;

  const amount = Math.abs(wheelDelta);



  const normalizedAmount = Math.min(amount / 100, 5);

  const exponent =

    normalizedAmount * clamp(sensitivity, 0.01, 10);



  const multiplier = Math.pow(

    2,

    direction * exponent,

  );



  return changeScale(scale, multiplier);

}



export function interpolateScale(

  from: ScaleState,

  to: ScaleState,

  amount: number,

): ScaleState {

  const t = smootherStep(amount);

  const logFrom = Math.log10(

    Math.max(from.metersPerUnit, 1e-9),

  );

  const logTo = Math.log10(

    Math.max(to.metersPerUnit, 1e-9),

  );



  const metersPerUnit = Math.pow(

    10,

    mixNumber(logFrom, logTo, t),

  );



  return {

    frameId: t < 1 ? from.frameId : to.frameId,

    metersPerUnit,

    band: t < 1 ? scaleBandFor(metersPerUnit) : to.band,

  };

}



/* -------------------------------------------------------------------------- */

/* Camera modes                                                               */

/* -------------------------------------------------------------------------- */



export type CameraMode =

  | "orbit"

  | "free"

  | "surface"

  | "chase"

  | "cinematic"

  | "scale"

  | "observer";



export type CameraTransitionMode =

  | "linear"

  | "smooth"

  | "cinematic";



export interface CameraState {

  mode: CameraMode;

  frameId: FrameId;



  position: Vec3;

  velocity: Vec3;



  targetId?: EntityId;



  fieldOfView: number;

  baseSpeed: number;



  yaw?: number;

  pitch?: number;

  roll?: number;



  minDistance?: number;

  maxDistance?: number;

}



export interface CameraTransition {

  from: CameraState;

  to: CameraState;



  elapsedSeconds: number;

  durationSeconds: number;



  mode: CameraTransitionMode;

}



export function normalizeCamera(camera: CameraState): CameraState {

  return {

    ...camera,

    position: isFiniteVec3(camera.position)

      ? cloneVec3(camera.position)

      : [0, 0, 10],

    velocity: isFiniteVec3(camera.velocity)

      ? cloneVec3(camera.velocity)

      : [0, 0, 0],

    fieldOfView: clamp(

      finiteOr(camera.fieldOfView, 60),

      20,

      120,

    ),

    baseSpeed: clamp(

      positiveOr(camera.baseSpeed, 1),

      0.000001,

      1e12,

    ),

    yaw: finiteOr(camera.yaw ?? 0, 0),

    pitch: clamp(

      finiteOr(camera.pitch ?? 0, 0),

      -Math.PI * 0.499,

      Math.PI * 0.499,

    ),

    roll: finiteOr(camera.roll ?? 0, 0),

  };

}



export function cameraDistance(

  a: CameraState,

  b: CameraState,

): number {

  return distanceVec3(a.position, b.position);

}



export function cameraDistanceToPoint(

  camera: CameraState,

  point: Vec3,

): number {

  return distanceVec3(camera.position, point);

}



export function cameraForward(

  camera: CameraState,

): Vec3 {

  const yaw = camera.yaw ?? 0;

  const pitch = camera.pitch ?? 0;



  const cosPitch = Math.cos(pitch);



  return normalizeVec3([

    -Math.sin(yaw) * cosPitch,

    Math.sin(pitch),

    -Math.cos(yaw) * cosPitch,

  ]);

}



export function cameraRight(

  camera: CameraState,

): Vec3 {

  const forward = cameraForward(camera);



  return normalizeVec3(

    crossVec3(forward, [0, 1, 0]),

  );

}



export function cameraUp(

  camera: CameraState,

): Vec3 {

  const right = cameraRight(camera);

  const forward = cameraForward(camera);



  return normalizeVec3(

    crossVec3(right, forward),

  );

}



export function lookAtCamera(

  camera: CameraState,

  target: Vec3,

): CameraState {

  const direction = normalizeVec3(

    subtractVec3(target, camera.position),

  );



  if (lengthVec3(direction) <= Number.EPSILON) {

    return camera;

  }



  const yaw = Math.atan2(

    -direction[0],

    -direction[2],

  );



  const pitch = Math.asin(

    clamp(direction[1], -1, 1),

  );



  return {

    ...camera,

    yaw,

    pitch,

    roll: 0,

  };

}



export function resetCamera(

  camera: CameraState,

): CameraState {

  const next: CameraState = {

    mode: camera.mode,

    frameId: camera.frameId,

    position: [0, 0, 10],

    velocity: [0, 0, 0],

    fieldOfView: 60,

    baseSpeed: 1,

    yaw: 0,

    pitch: 0,

    roll: 0,

  };



  if (camera.targetId !== undefined) {

    next.targetId = camera.targetId;

  }



  return next;

}



export function stopCamera(

  camera: CameraState,

): CameraState {

  return {

    ...camera,

    velocity: [0, 0, 0],

  };

}



/* -------------------------------------------------------------------------- */

/* Camera transitions                                                         */

/* -------------------------------------------------------------------------- */



export function createCameraTransition(

  from: CameraState,

  to: CameraState,

  durationSeconds: number,

  mode: CameraTransitionMode = "cinematic",

): CameraTransition {

  return {

    from: normalizeCamera(from),

    to: normalizeCamera(to),

    elapsedSeconds: 0,

    durationSeconds: Math.max(

      0.001,

      finiteOr(durationSeconds, 1),

    ),

    mode,

  };

}



export function transitionProgress(

  transition: CameraTransition,

): number {

  return clamp(

    transition.elapsedSeconds /

      transition.durationSeconds,

    0,

    1,

  );

}



export function transitionEasing(

  amount: number,

  mode: CameraTransitionMode,

): number {

  switch (mode) {

    case "linear":

      return clamp(amount, 0, 1);



    case "smooth":

      return smoothStep(amount);



    case "cinematic":

      return smootherStep(amount);



    default:

      return smoothStep(amount);

  }

}



export function interpolateCamera(

  from: CameraState,

  to: CameraState,

  amount: number,

): CameraState {

  const t = smootherStep(amount);



  const result: CameraState = {

    mode: t < 1 ? from.mode : to.mode,



    frameId:

      t < 1

        ? from.frameId

        : to.frameId,



    position: mixVec3(

      from.position,

      to.position,

      t,

    ),



    velocity: mixVec3(

      from.velocity,

      to.velocity,

      t,

    ),



    fieldOfView: mixNumber(

      from.fieldOfView,

      to.fieldOfView,

      t,

    ),



    baseSpeed: mixNumber(

      from.baseSpeed,

      to.baseSpeed,

      t,

    ),



    yaw: mixNumber(

      from.yaw ?? 0,

      to.yaw ?? 0,

      t,

    ),



    pitch: mixNumber(

      from.pitch ?? 0,

      to.pitch ?? 0,

      t,

    ),



    roll: mixNumber(

      from.roll ?? 0,

      to.roll ?? 0,

      t,

    ),

  };



  if (t < 0.5) {

    if (from.targetId !== undefined) {

      result.targetId = from.targetId;

    }

  } else if (to.targetId !== undefined) {

    result.targetId = to.targetId;

  }



  if (to.minDistance !== undefined) {

    result.minDistance = mixNumber(

      from.minDistance ?? to.minDistance,

      to.minDistance,

      t,

    );

  }



  if (to.maxDistance !== undefined) {

    result.maxDistance = mixNumber(

      from.maxDistance ?? to.maxDistance,

      to.maxDistance,

      t,

    );

  }



  return result;

}



export function advanceCameraTransition(

  transition: CameraTransition,

  deltaSeconds: number,

): CameraTransition {

  return {

    ...transition,

    elapsedSeconds: clamp(

      transition.elapsedSeconds +

        Math.max(0, deltaSeconds),

      0,

      transition.durationSeconds,

    ),

  };

}



export function transitionCamera(

  transition: CameraTransition,

): CameraState {

  const progress = transitionProgress(transition);

  const eased = transitionEasing(

    progress,

    transition.mode,

  );



  return interpolateCamera(

    transition.from,

    transition.to,

    eased,

  );

}



export function isCameraTransitionComplete(

  transition: CameraTransition,

): boolean {

  return (

    transition.elapsedSeconds >=

    transition.durationSeconds

  );

}



/* -------------------------------------------------------------------------- */

/* Controls and input                                                         */

/* -------------------------------------------------------------------------- */



export type ControlProfile =

  | "explorer"

  | "scientific"

  | "gaming"

  | "keyboard"

  | "custom";



export type WasdMode =

  | "free-flight"

  | "smart-navigation"

  | "object-selection"

  | "surface"

  | "custom";



export type GraphicsPreset =

  | "auto"

  | "low"

  | "medium"

  | "high"

  | "ultra"

  | "custom";



export type InputDevice =

  | "keyboard"

  | "mouse"

  | "touch"

  | "controller";



export type LodLevel =

  | 0

  | 1

  | 2

  | 3

  | 4

  | 5;



export const ACTIONS = [

  "move.forward",

  "move.backward",

  "move.left",

  "move.right",

  "move.up",

  "move.down",



  "camera.rollLeft",

  "camera.rollRight",

  "camera.brake",

  "camera.reset",



  "camera.orbitLeft",

  "camera.orbitRight",

  "camera.orbitUp",

  "camera.orbitDown",



  "navigation.parent",

  "navigation.child",

  "navigation.previous",

  "navigation.next",



  "focus",

  "inspect",

  "search",

  "commandPalette",



  "view.next",



  "orbit.toggle",

  "labels.toggle",

  "gravity.toggle",

  "humanity.toggle",

  "knowledge.toggle",



  "time.toggle",

  "time.faster",

  "time.slower",

  "time.realtime",

  "time.reverse",



  "scale.surface",

  "scale.planet",

  "scale.system",

  "scale.stellar",

  "scale.galactic",

  "scale.cosmic",



  "home",

  "back",

] as const;



export type ActionId =

  (typeof ACTIONS)[number];



export interface KeyBinding {

  action: ActionId;

  code: string;



  ctrl?: boolean;

  shift?: boolean;

  alt?: boolean;

  meta?: boolean;

}



export interface InputAction {

  action: ActionId;

  active: boolean;

  value: number;

  device: InputDevice;

}



export interface KeyboardLikeEvent {

  code: string;

  ctrlKey: boolean;

  shiftKey: boolean;

  altKey: boolean;

  metaKey?: boolean;

  repeat?: boolean;

}



export interface ShortcutTarget {

  tagName?: string;

  isContentEditable?: boolean;

}



export const DEFAULT_BINDINGS:

  readonly KeyBinding[] = [

    {

      action: "move.forward",

      code: "KeyW",

    },

    {

      action: "move.backward",

      code: "KeyS",

    },

    {

      action: "move.left",

      code: "KeyA",

    },

    {

      action: "move.right",

      code: "KeyD",

    },

    {

      action: "move.up",

      code: "Space",

    },

    {

      action: "move.down",

      code: "ShiftLeft",

    },



    {

      action: "camera.rollLeft",

      code: "KeyQ",

    },

    {

      action: "camera.rollRight",

      code: "KeyE",

    },

    {

      action: "camera.brake",

      code: "KeyX",

    },

    {

      action: "camera.reset",

      code: "KeyR",

    },



    {

      action: "camera.orbitLeft",

      code: "ArrowLeft",

    },

    {

      action: "camera.orbitRight",

      code: "ArrowRight",

    },

    {

      action: "camera.orbitUp",

      code: "ArrowUp",

    },

    {

      action: "camera.orbitDown",

      code: "ArrowDown",

    },



    {

      action: "navigation.parent",

      code: "BracketLeft",

    },

    {

      action: "navigation.child",

      code: "BracketRight",

    },



    {

      action: "navigation.previous",

      code: "ArrowLeft",

      shift: true,

    },

    {

      action: "navigation.next",

      code: "ArrowRight",

      shift: true,

    },



    {

      action: "focus",

      code: "KeyF",

    },

    {

      action: "inspect",

      code: "KeyI",

    },

    {

      action: "search",

      code: "Slash",

    },

    {

      action: "commandPalette",

      code: "KeyK",

      ctrl: true,

    },



    {

      action: "view.next",

      code: "KeyV",

    },



    {

      action: "orbit.toggle",

      code: "KeyO",

    },

    {

      action: "labels.toggle",

      code: "KeyL",

    },

    {

      action: "gravity.toggle",

      code: "KeyG",

    },

    {

      action: "humanity.toggle",

      code: "KeyH",

    },

    {

      action: "knowledge.toggle",

      code: "KeyK",

    },



    {

      action: "time.toggle",

      code: "KeyT",

    },

    {

      action: "time.faster",

      code: "Equal",

    },

    {

      action: "time.slower",

      code: "Minus",

    },

    {

      action: "time.realtime",

      code: "KeyT",

      shift: true,

    },

    {

      action: "time.reverse",

      code: "KeyJ",

    },



    {

      action: "scale.surface",

      code: "Digit1",

    },

    {

      action: "scale.planet",

      code: "Digit2",

    },

    {

      action: "scale.system",

      code: "Digit4",

    },

    {

      action: "scale.stellar",

      code: "Digit5",

    },

    {

      action: "scale.galactic",

      code: "Digit6",

    },

    {

      action: "scale.cosmic",

      code: "Digit9",

    },



    {

      action: "home",

      code: "Digit0",

    },

    {

      action: "back",

      code: "Backspace",

    },

  ];



/* -------------------------------------------------------------------------- */

/* Settings                                                                   */

/* -------------------------------------------------------------------------- */



export interface GraphicsSettings {

  preset: GraphicsPreset;



  targetFps: number;

  maxPixelRatio: number;



  starDensity: number;

  debrisDensity: number;



  atmosphere: boolean;

  orbitLines: boolean;

  shadows: boolean;

  bloom: boolean;



  maxVisibleObjects: number;

}



export interface NavigationSettings {

  wasdMode: WasdMode;



  mouseSensitivity: number;

  scrollSensitivity: number;



  movementSpeed: number;



  precisionMultiplier: number;

  fastMultiplier: number;



  invertZoom: boolean;

  cinematicTravel: boolean;



  acceleration: number;

  damping: number;



  orbitSensitivity: number;

}



export interface AccessibilitySettings {

  reducedMotion: boolean;

  highContrast: boolean;



  uiScale: number;



  discoveryOverlay: boolean;

  keyboardOnly: boolean;

}



export interface UserSettings {

  profile: ControlProfile;



  graphics: GraphicsSettings;

  navigation: NavigationSettings;

  accessibility: AccessibilitySettings;



  bindings: readonly KeyBinding[];

}



export const DEFAULT_SETTINGS:

  UserSettings = {

    profile: "explorer",



    graphics: {

      preset: "auto",



      targetFps: 60,

      maxPixelRatio: 2,



      starDensity: 1,

      debrisDensity: 1,



      atmosphere: true,

      orbitLines: true,

      shadows: true,

      bloom: false,



      maxVisibleObjects: 250_000,

    },



    navigation: {

      wasdMode: "smart-navigation",



      mouseSensitivity: 1,

      scrollSensitivity: 1,



      movementSpeed: 1,



      precisionMultiplier: 0.1,

      fastMultiplier: 10,



      invertZoom: false,

      cinematicTravel: true,



      acceleration: 5,

      damping: 4,



      orbitSensitivity: 1,

    },



    accessibility: {

      reducedMotion: false,

      highContrast: false,



      uiScale: 1,



      discoveryOverlay: true,

      keyboardOnly: false,

    },



    bindings: DEFAULT_BINDINGS,

  };



export function cloneSettings(

  settings: UserSettings,

): UserSettings {

  return {

    profile: settings.profile,



    graphics: {

      ...settings.graphics,

    },



    navigation: {

      ...settings.navigation,

    },



    accessibility: {

      ...settings.accessibility,

    },



    bindings: settings.bindings.map(

      (binding) => ({

        ...binding,

      }),

    ),

  };

}



export function normalizeSettings(

  settings: UserSettings,

): UserSettings {

  return {

    profile: settings.profile,



    graphics: {

      ...settings.graphics,



      targetFps: Math.round(

        clamp(

          finiteOr(settings.graphics.targetFps, 60),

          30,

          240,

        ),

      ),



      maxPixelRatio: clamp(

        positiveOr(

          settings.graphics.maxPixelRatio,

          2,

        ),

        0.5,

        4,

      ),



      starDensity: clamp(

        finiteOr(settings.graphics.starDensity, 1),

        0,

        2,

      ),



      debrisDensity: clamp(

        finiteOr(

          settings.graphics.debrisDensity,

          1,

        ),

        0,

        2,

      ),



      maxVisibleObjects: Math.round(

        clamp(

          positiveOr(

            settings.graphics.maxVisibleObjects,

            250_000,

          ),

          1_000,

          5_000_000,

        ),

      ),

    },



    navigation: {

      ...settings.navigation,



      mouseSensitivity: clamp(

        positiveOr(

          settings.navigation.mouseSensitivity,

          1,

        ),

        0.05,

        10,

      ),



      scrollSensitivity: clamp(

        positiveOr(

          settings.navigation.scrollSensitivity,

          1,

        ),

        0.05,

        10,

      ),



      movementSpeed: clamp(

        positiveOr(

          settings.navigation.movementSpeed,

          1,

        ),

        0.01,

        10_000,

      ),



      precisionMultiplier: clamp(

        positiveOr(

          settings.navigation.precisionMultiplier,

          0.1,

        ),

        0.001,

        1,

      ),



      fastMultiplier: clamp(

        positiveOr(

          settings.navigation.fastMultiplier,

          10,

        ),

        1,

        1_000,

      ),



      acceleration: clamp(

        positiveOr(

          settings.navigation.acceleration,

          5,

        ),

        0.01,

        100_000,

      ),



      damping: clamp(

        positiveOr(

          settings.navigation.damping,

          4,

        ),

        0,

        100,

      ),



      orbitSensitivity: clamp(

        positiveOr(

          settings.navigation.orbitSensitivity,

          1,

        ),

        0.01,

        10,

      ),

    },



    accessibility: {

      ...settings.accessibility,



      uiScale: clamp(

        positiveOr(

          settings.accessibility.uiScale,

          1,

        ),

        0.5,

        3,

      ),

    },



    bindings: settings.bindings.map(

      (binding) => ({

        ...binding,

      }),

    ),

  };

}



/* -------------------------------------------------------------------------- */

/* Input matching                                                             */

/* -------------------------------------------------------------------------- */



export function bindingMatches(

  binding: KeyBinding,

  event: KeyboardLikeEvent,

): boolean {

  return (

    binding.code === event.code &&

    Boolean(binding.ctrl) === Boolean(event.ctrlKey) &&

    Boolean(binding.shift) === Boolean(event.shiftKey) &&

    Boolean(binding.alt) === Boolean(event.altKey) &&

    Boolean(binding.meta) === Boolean(event.metaKey)

  );

}



export function resolveKeyboardAction(

  event: KeyboardLikeEvent,

  bindings: readonly KeyBinding[],

): ActionId | undefined {

  return bindings.find(

    (binding) =>

      bindingMatches(binding, event),

  )?.action;

}



export function shouldHandleGlobalShortcut(

  target: ShortcutTarget | null,

): boolean {

  if (!target) {

    return true;

  }



  if (target.isContentEditable) {

    return false;

  }



  const tag = target.tagName?.toLowerCase();



  return (

    tag !== "input" &&

    tag !== "textarea" &&

    tag !== "select"

  );

}



export function findBindingConflict(

  candidate: KeyBinding,

  bindings: readonly KeyBinding[],

): KeyBinding | undefined {

  return bindings.find((binding) => {

    if (binding.action === candidate.action) {

      return false;

    }



    return (

      binding.code === candidate.code &&

      Boolean(binding.ctrl) ===

        Boolean(candidate.ctrl) &&

      Boolean(binding.shift) ===

        Boolean(candidate.shift) &&

      Boolean(binding.alt) ===

        Boolean(candidate.alt) &&

      Boolean(binding.meta) ===

        Boolean(candidate.meta)

    );

  });

}



export function replaceBinding(

  bindings: readonly KeyBinding[],

  replacement: KeyBinding,

): KeyBinding[] {

  const conflict = findBindingConflict(

    replacement,

    bindings,

  );



  if (conflict) {

    throw new Error(

      `${replacement.code} is already bound to ${conflict.action}`,

    );

  }



  const next = bindings.filter(

    (binding) =>

      binding.action !== replacement.action,

  );



  return [

    ...next,

    {

      ...replacement,

    },

  ];

}



/* -------------------------------------------------------------------------- */

/* Input state                                                                */

/* -------------------------------------------------------------------------- */



export class InputState {

  private readonly values =

    new Map<ActionId, number>();



  private readonly devices =

    new Map<ActionId, InputDevice>();



  set(

    action: ActionId,

    value: number,

    device: InputDevice = "keyboard",

  ): void {

    if (!Number.isFinite(value)) {

      return;

    }



    const normalized = clamp(value, -1, 1);



    if (normalized === 0) {

      this.values.delete(action);

      this.devices.delete(action);

      return;

    }



    this.values.set(action, normalized);

    this.devices.set(action, device);

  }



  press(

    action: ActionId,

    device: InputDevice = "keyboard",

  ): void {

    this.set(action, 1, device);

  }



  release(action: ActionId): void {

    this.values.delete(action);

    this.devices.delete(action);

  }



  value(action: ActionId): number {

    return this.values.get(action) ?? 0;

  }



  active(action: ActionId): boolean {

    return Math.abs(this.value(action)) > 0;

  }



  device(action: ActionId): InputDevice {

    return (

      this.devices.get(action) ??

      "keyboard"

    );

  }



  action(action: ActionId): InputAction {

    const value = this.value(action);



    return {

      action,

      active: Math.abs(value) > 0,

      value,

      device: this.device(action),

    };

  }



  actions(): InputAction[] {

    const result: InputAction[] = [];



    for (const action of ACTIONS) {

      const input = this.action(action);



      if (input.active) {

        result.push(input);

      }

    }



    return result;

  }



  reset(): void {

    this.values.clear();

    this.devices.clear();

  }



  snapshot(): ReadonlyMap<ActionId, number> {

    return new Map(this.values);

  }

}



/* -------------------------------------------------------------------------- */

/* Browser keyboard adapter                                                   */

/* -------------------------------------------------------------------------- */



export class BrowserKeyboardInput {

  private attached = false;



  constructor(

    private readonly input: InputState,



    private readonly getBindings: () =>

      readonly KeyBinding[],



    private readonly onAction?: (

      action: ActionId,

    ) => void,

  ) {}



  private readonly keyDown = (

    event: KeyboardEvent,

  ): void => {

    if (

      !shouldHandleGlobalShortcut(

        event.target as

          | ShortcutTarget

          | null,

      )

    ) {

      return;

    }



    const action =

      resolveKeyboardAction(

        event,

        this.getBindings(),

      );



    if (!action) {

      return;

    }



    event.preventDefault();



    if (

      action.startsWith("move.") ||

      action.startsWith("camera.orbit") ||

      action === "camera.rollLeft" ||

      action === "camera.rollRight" ||

      action === "camera.brake"

    ) {

      this.input.press(

        action,

        "keyboard",

      );



      return;

    }



    if (!event.repeat) {

      this.onAction?.(action);

    }

  };



  private readonly keyUp = (

    event: KeyboardEvent,

  ): void => {

    const action =

      resolveKeyboardAction(

        event,

        this.getBindings(),

      );



    if (!action) {

      return;

    }



    this.input.release(action);

  };



  attach(): void {

    if (this.attached) {

      return;

    }



    window.addEventListener(

      "keydown",

      this.keyDown,

    );



    window.addEventListener(

      "keyup",

      this.keyUp,

    );



    this.attached = true;

  }



  detach(): void {

    if (!this.attached) {

      return;

    }



    window.removeEventListener(

      "keydown",

      this.keyDown,

    );



    window.removeEventListener(

      "keyup",

      this.keyUp,

    );



    this.input.reset();

    this.attached = false;

  }



  get isAttached(): boolean {

    return this.attached;

  }

}



/* -------------------------------------------------------------------------- */

/* Camera input                                                               */

/* -------------------------------------------------------------------------- */



export interface CameraInput {

  forward: number;

  right: number;

  up: number;



  orbitHorizontal: number;

  orbitVertical: number;



  roll: number;



  fast: boolean;

  precision: boolean;

  braking: boolean;

}



export function readCameraInput(

  input: InputState,

): CameraInput {

  return {

    forward:

      input.value("move.forward") -

      input.value("move.backward"),



    right:

      input.value("move.right") -

      input.value("move.left"),



    up:

      input.value("move.up") -

      input.value("move.down"),



    orbitHorizontal:

      input.value("camera.orbitRight") -

      input.value("camera.orbitLeft"),



    orbitVertical:

      input.value("camera.orbitUp") -

      input.value("camera.orbitDown"),



    roll:

      input.value("camera.rollRight") -

      input.value("camera.rollLeft"),



    fast:

      input.active("camera.orbitRight") &&

      input.active("move.forward"),



    precision:

      input.active("camera.rollLeft") &&

      input.active("camera.rollRight"),



    braking:

      input.active("camera.brake"),

  };

}



/* -------------------------------------------------------------------------- */

/* Free-flight camera                                                         */

/* -------------------------------------------------------------------------- */



export function updateFreeCamera(

  camera: CameraState,

  input: CameraInput,

  settings: NavigationSettings,

  deltaSeconds: number,

): CameraState {

  if (

    deltaSeconds <= 0 ||

    !Number.isFinite(deltaSeconds)

  ) {

    return camera;

  }



  const safeDelta = clamp(

    deltaSeconds,

    0,

    0.25,

  );



  let speed =

    camera.baseSpeed *

    settings.movementSpeed;



  if (input.fast) {

    speed *= settings.fastMultiplier;

  }



  if (input.precision) {

    speed *= settings.precisionMultiplier;

  }



  const forward = cameraForward(camera);

  const right = cameraRight(camera);

  const up = cameraUp(camera);



  let direction = [0, 0, 0] as Vec3;



  direction = addVec3(

    direction,

    multiplyVec3(

      forward,

      input.forward,

    ),

  );



  direction = addVec3(

    direction,

    multiplyVec3(

      right,

      input.right,

    ),

  );



  direction = addVec3(

    direction,

    multiplyVec3(

      up,

      input.up,

    ),

  );



  direction = normalizeVec3(direction);



  const acceleration =

    settings.acceleration * speed;



  let velocity = addVec3(

    camera.velocity,

    multiplyVec3(

      direction,

      acceleration * safeDelta,

    ),

  );



  if (input.braking) {

    velocity = multiplyVec3(

      velocity,

      Math.pow(0.02, safeDelta),

    );

  } else {

    velocity = multiplyVec3(

      velocity,

      Math.pow(

        Math.max(

          0.0001,

          1 - settings.damping * 0.1,

        ),

        safeDelta,

      ),

    );

  }



  const position = addVec3(

    camera.position,

    multiplyVec3(

      velocity,

      safeDelta,

    ),

  );



  return {

    ...camera,

    position,

    velocity,

  };

}



export function updateCameraOrientation(

  camera: CameraState,

  input: CameraInput,

  settings: NavigationSettings,

  deltaSeconds: number,

): CameraState {

  const sensitivity =

    settings.mouseSensitivity *

    deltaSeconds;



  return {

    ...camera,



    yaw:

      (camera.yaw ?? 0) +

      input.orbitHorizontal *

        sensitivity,



    pitch: clamp(

      (camera.pitch ?? 0) +

        input.orbitVertical *

          sensitivity,

      -Math.PI * 0.49,

      Math.PI * 0.49,

    ),



    roll:

      (camera.roll ?? 0) +

      input.roll *

        sensitivity,

  };

}



export function updateCameraFromInput(

  camera: CameraState,

  input: CameraInput,

  settings: NavigationSettings,

  deltaSeconds: number,

): CameraState {

  let next = updateCameraOrientation(

    camera,

    input,

    settings,

    deltaSeconds,

  );



  if (

    camera.mode === "free" ||

    camera.mode === "observer" ||

    camera.mode === "cinematic"

  ) {

    next = updateFreeCamera(

      next,

      input,

      settings,

      deltaSeconds,

    );

  }



  return next;

}



/* -------------------------------------------------------------------------- */

/* Universe state                                                              */

/* -------------------------------------------------------------------------- */



export interface ScaleState {

  band: ScaleBand;

  metersPerUnit: number;

  frameId: FrameId;

}



export interface SimulationClock {

  time: AstroTime;

  rate: number;

  paused: boolean;

}



export interface OverlayState {

  labels: boolean;

  gravity: boolean;

  humanity: boolean;

  knowledge: boolean;

  orbits: boolean;

}



export interface UniverseState {

  entities: ReadonlyMap<

    EntityId,

    SpaceEntity

  >;



  selectedId?: EntityId;

  focusId?: EntityId;



  camera: CameraState;

  scale: ScaleState;



  clock: SimulationClock;



  overlays: OverlayState;



  settings: UserSettings;

}



export function createInitialUniverseState(

  time: AstroTime,

  settings: UserSettings =

    DEFAULT_SETTINGS,

): UniverseState {

  const normalized =

    normalizeSettings(settings);



  return {

    entities: new Map(),



    camera: {

      mode: "orbit",

      frameId: "root",

      position: [0, 0, 10],

      velocity: [0, 0, 0],

      fieldOfView: 60,

      baseSpeed: 1,

      yaw: 0,

      pitch: 0,

      roll: 0,

    },



    scale: {

      band: "planet",

      metersPerUnit: 10_000,

      frameId: "root",

    },



    clock: {

      time,

      rate: 1,

      paused: false,

    },



    overlays: {

      labels: true,

      gravity: false,

      humanity: false,

      knowledge: false,

      orbits: true,

    },



    settings: cloneSettings(

      normalized,

    ),

  };

}



/* -------------------------------------------------------------------------- */

/* Universe state store                                                       */

/* -------------------------------------------------------------------------- */



export type UniverseStateListener =

  (state: UniverseState) => void;



export interface StateTransaction {

  readonly previous: UniverseState;

  readonly next: UniverseState;

}



export type StateTransactionListener =

  (transaction: StateTransaction) => void;



export class UniverseStore {

  private state: UniverseState;



  private readonly listeners =

    new Set<UniverseStateListener>();



  private readonly transactionListeners =

    new Set<StateTransactionListener>();



  constructor(

    initialState: UniverseState,

  ) {

    this.state = {

      ...initialState,

      camera: normalizeCamera(

        initialState.camera,

      ),

      scale: normalizeScale(

        initialState.scale,

      ),

      settings: normalizeSettings(

        initialState.settings,

      ),

    };

  }



  getSnapshot(): UniverseState {

    return this.state;

  }



  subscribe(

    listener: UniverseStateListener,

  ): () => void {

    this.listeners.add(listener);



    return () => {

      this.listeners.delete(listener);

    };

  }



  subscribeTransactions(

    listener: StateTransactionListener,

  ): () => void {

    this.transactionListeners.add(

      listener,

    );



    return () => {

      this.transactionListeners.delete(

        listener,

      );

    };

  }



  private commit(

    next: UniverseState,

  ): void {

    if (Object.is(this.state, next)) {

      return;

    }



    const previous = this.state;



    this.state = next;



    const transaction = {

      previous,

      next,

    };



    for (

      const listener of

      this.transactionListeners

    ) {

      listener(transaction);

    }



    for (

      const listener of this.listeners

    ) {

      listener(this.state);

    }

  }



  update(

    updater: (

      state: UniverseState,

    ) => UniverseState,

  ): void {

    this.commit(

      updater(this.state),

    );

  }



  replaceEntities(

    entities: Iterable<SpaceEntity>,

  ): void {

    const map =

      new Map<

        EntityId,

        SpaceEntity

      >();



    for (const entity of entities) {

      map.set(entity.id, entity);

    }



    this.commit({

      ...this.state,

      entities: map,

    });

  }



  upsertEntity(

    entity: SpaceEntity,

  ): void {

    const entities =

      new Map(this.state.entities);



    entities.set(

      entity.id,

      entity,

    );



    this.commit({

      ...this.state,

      entities,

    });

  }



  upsertEntities(

    entities: Iterable<SpaceEntity>,

  ): void {

    const next =

      new Map(this.state.entities);



    for (const entity of entities) {

      next.set(

        entity.id,

        entity,

      );

    }



    this.commit({

      ...this.state,

      entities: next,

    });

  }



  removeEntity(

    id: EntityId,

  ): void {

    if (!this.state.entities.has(id)) {

      return;

    }



    const entities =

      new Map(this.state.entities);



    entities.delete(id);



    const next: UniverseState = {

      ...this.state,

      entities,

    };



    if (next.selectedId === id) {

      delete next.selectedId;

    }



    if (next.focusId === id) {

      delete next.focusId;

    }



    this.commit(next);

  }



  clearEntities(): void {

    const next: UniverseState = {

      ...this.state,

      entities: new Map(),

    };



    delete next.selectedId;

    delete next.focusId;



    this.commit(next);

  }



  select(

    id: EntityId | null,

  ): void {

    const next: UniverseState = {

      ...this.state,

    };



    if (id === null) {

      delete next.selectedId;

    } else if (

      this.state.entities.has(id)

    ) {

      next.selectedId = id;

    } else {

      return;

    }



    this.commit(next);

  }



  focus(

    id: EntityId | null,

  ): void {

    const next: UniverseState = {

      ...this.state,

    };



    if (id === null) {

      delete next.focusId;

    } else if (

      this.state.entities.has(id)

    ) {

      next.focusId = id;

    } else {

      return;

    }



    this.commit(next);

  }



  setCamera(

    camera: CameraState,

  ): void {

    this.commit({

      ...this.state,

      camera: normalizeCamera(camera),

    });

  }



  setScale(

    scale: ScaleState,

  ): void {

    this.commit({

      ...this.state,

      scale: normalizeScale(scale),

    });

  }



  setClock(

    clock: SimulationClock,

  ): void {

    this.commit({

      ...this.state,

      clock: normalizeClock(clock),

    });

  }



  setSettings(

    settings: UserSettings,

  ): void {

    this.commit({

      ...this.state,

      settings: normalizeSettings(settings),

    });

  }



  setOverlays(

    overlays: OverlayState,

  ): void {

    this.commit({

      ...this.state,

      overlays: {

        ...overlays,

      },

    });

  }



  updateSettings(

    updater: (

      settings: UserSettings,

    ) => UserSettings,

  ): void {

    this.setSettings(

      updater(

        cloneSettings(

          this.state.settings,

        ),

      ),

    );

  }

}



/* -------------------------------------------------------------------------- */

/* Entity hierarchy                                                           */

/* -------------------------------------------------------------------------- */



export function getEntity(

  state: UniverseState,

  id: EntityId,

): SpaceEntity | undefined {

  return state.entities.get(id);

}



export function getEntityChildren(

  state: UniverseState,

  parentId: EntityId,

): SpaceEntity[] {

  const children: SpaceEntity[] = [];



  for (

    const entity of

    state.entities.values()

  ) {

    if (entity.parentId === parentId) {

      children.push(entity);

    }

  }



  return children;

}



export function getEntityParent(

  state: UniverseState,

  id: EntityId,

): SpaceEntity | undefined {

  const entity =

    state.entities.get(id);



  if (!entity?.parentId) {

    return undefined;

  }



  return state.entities.get(

    entity.parentId,

  );

}



export function getEntitySiblings(

  state: UniverseState,

  id: EntityId,

): SpaceEntity[] {

  const entity =

    state.entities.get(id);



  if (!entity?.parentId) {

    return [];

  }



  return getEntityChildren(

    state,

    entity.parentId,

  );

}



export function getEntityAncestors(

  state: UniverseState,

  id: EntityId,

): SpaceEntity[] {

  const result: SpaceEntity[] = [];



  const visited =

    new Set<EntityId>();



  let current =

    state.entities.get(id);



  while (

    current?.parentId &&

    !visited.has(current.parentId)

  ) {

    visited.add(

      current.parentId,

    );



    const parent =

      state.entities.get(

        current.parentId,

      );



    if (!parent) {

      break;

    }



    result.push(parent);

    current = parent;

  }



  return result;

}



export function getEntityDepth(

  state: UniverseState,

  id: EntityId,

): number {

  return getEntityAncestors(

    state,

    id,

  ).length;

}



export function isEntityAncestor(

  state: UniverseState,

  ancestorId: EntityId,

  descendantId: EntityId,

): boolean {

  return getEntityAncestors(

    state,

    descendantId,

  ).some(

    (entity) =>

      entity.id === ancestorId,

  );

}



export function getEntityRoot(

  state: UniverseState,

  id: EntityId,

): SpaceEntity | undefined {

  const ancestors =

    getEntityAncestors(

      state,

      id,

    );



  return (

    ancestors[ancestors.length - 1] ??

    state.entities.get(id)

  );

}



/* -------------------------------------------------------------------------- */

/* Navigation history                                                         */

/* -------------------------------------------------------------------------- */



export class NavigationHistory {

  private readonly entries: EntityId[] =

    [];



  private position = -1;



  constructor(

    private readonly limit = 100,

  ) {}



  push(id: EntityId): void {

    if (

      this.entries[this.position] ===

      id

    ) {

      return;

    }



    if (

      this.position <

      this.entries.length - 1

    ) {

      this.entries.splice(

        this.position + 1,

      );

    }



    this.entries.push(id);



    while (

      this.entries.length >

      this.limit

    ) {

      this.entries.shift();

    }



    this.position =

      this.entries.length - 1;

  }



  back():

    EntityId | undefined {

    if (this.position <= 0) {

      return undefined;

    }



    this.position--;



    return this.entries[

      this.position

    ];

  }



  forward():

    EntityId | undefined {

    if (

      this.position >=

      this.entries.length - 1

    ) {

      return undefined;

    }



    this.position++;



    return this.entries[

      this.position

    ];

  }



  current():

    EntityId | undefined {

    if (this.position < 0) {

      return undefined;

    }



    return this.entries[

      this.position

    ];

  }



  canGoBack(): boolean {

    return this.position > 0;

  }



  canGoForward(): boolean {

    return (

      this.position >= 0 &&

      this.position <

        this.entries.length - 1

    );

  }



  snapshot(): readonly EntityId[] {

    return [...this.entries];

  }



  clear(): void {

    this.entries.length = 0;

    this.position = -1;

  }

}



/* -------------------------------------------------------------------------- */

/* Simulation clock                                                           */

/* -------------------------------------------------------------------------- */



export function normalizeClock(

  clock: SimulationClock,

): SimulationClock {

  return {

    ...clock,

    rate: clamp(

      finiteOr(clock.rate, 1),

      -1_000_000,

      1_000_000,

    ),

    paused: Boolean(clock.paused),

  };

}



export function advanceClock(

  clock: SimulationClock,

  realDeltaSeconds: number,

): SimulationClock {

  if (

    clock.paused ||

    clock.rate === 0 ||

    realDeltaSeconds === 0

  ) {

    return clock;

  }



  const delta =

    clamp(

      finiteOr(

        realDeltaSeconds,

        0,

      ),

      0,

      0.25,

    );



  const secondsPerDay = 86_400;



  const days =

    (delta * clock.rate) /

    secondsPerDay;



  return {

    ...clock,



    time: {

      ...clock.time,



      julianDay:

        clock.time.julianDay +

        days,

    },

  };

}



export function toggleClock(

  clock: SimulationClock,

): SimulationClock {

  return {

    ...clock,

    paused: !clock.paused,

  };

}



export function speedUpClock(

  clock: SimulationClock,

): SimulationClock {

  let rate = clock.rate;



  if (rate === 0) {

    rate = 1;

  }



  const direction =

    Math.sign(rate) || 1;



  rate =

    Math.min(

      Math.abs(rate) * 2,

      1_000_000,

    ) * direction;



  return {

    ...clock,

    rate,

    paused: false,

  };

}



export function slowDownClock(

  clock: SimulationClock,

): SimulationClock {

  let rate = clock.rate;



  if (rate === 0) {

    rate = 1;

  }



  rate /= 2;



  if (

    Math.abs(rate) <

    1 / 1024

  ) {

    rate =

      Math.sign(rate) *

      (1 / 1024);

  }



  return {

    ...clock,

    rate,

    paused: false,

  };

}



export function setRealtime(

  clock: SimulationClock,

): SimulationClock {

  return {

    ...clock,

    rate: 1,

    paused: false,

  };

}



export function reverseClock(

  clock: SimulationClock,

): SimulationClock {

  const rate =

    clock.rate === 0

      ? -1

      : -clock.rate;



  return {

    ...clock,

    rate,

    paused: false,

  };

}



/* -------------------------------------------------------------------------- */

/* LOD                                                                        */

/* -------------------------------------------------------------------------- */



export interface LodRequest {

  entityId: EntityId;



  level: LodLevel;



  priority: number;



  apparentSize: number;



  distanceMeters?: number;

}



export function clampLodLevel(

  value: number,

): LodLevel {

  const rounded =

    Math.round(

      finiteOr(value, 0),

    );



  if (rounded <= 0) {

    return 0;

  }



  if (rounded >= 5) {

    return 5;

  }



  return rounded as LodLevel;

}



export function apparentDiameterPixels(

  radiusMeters: number,

  distanceMeters: number,

  viewportHeight: number,

  fieldOfViewDegrees: number,

): number {

  if (

    radiusMeters <= 0 ||

    distanceMeters <= 0 ||

    viewportHeight <= 0

  ) {

    return 0;

  }



  const fovRadians =

    (fieldOfViewDegrees *

      Math.PI) /

    180;



  const angularDiameter =

    2 *

    Math.atan(

      radiusMeters /

        distanceMeters,

    );



  const pixelsPerRadian =

    viewportHeight /

    Math.max(

      fovRadians,

      Number.EPSILON,

    );



  return (

    angularDiameter *

    pixelsPerRadian

  );

}



export function chooseLodLevel(

  apparentPixels: number,

): LodLevel {

  if (apparentPixels >= 1_000) {

    return 5;

  }



  if (apparentPixels >= 500) {

    return 4;

  }



  if (apparentPixels >= 200) {

    return 3;

  }



  if (apparentPixels >= 50) {

    return 2;

  }



  if (apparentPixels >= 5) {

    return 1;

  }



  return 0;

}



export function createLodRequest(

  entityId: EntityId,

  radiusMeters: number,

  distanceMeters: number,

  viewportHeight: number,

  fieldOfViewDegrees: number,

): LodRequest {

  const apparentSize =

    apparentDiameterPixels(

      radiusMeters,

      distanceMeters,

      viewportHeight,

      fieldOfViewDegrees,

    );



  const level =

    chooseLodLevel(

      apparentSize,

    );



  const distanceWeight =

    1 /

    Math.max(

      distanceMeters,

      1,

    );



  const priority =

    apparentSize *

      (level + 1) +

    distanceWeight;



  return {

    entityId,

    level,

    priority,

    apparentSize,

    distanceMeters,

  };

}



export class VisibilityBudget {

  private maximumObjects: number;



  constructor(

    maximumObjects: number,

  ) {

    this.maximumObjects =

      Math.max(

        1,

        Math.floor(

          maximumObjects,

        ),

      );

  }



  setMaximum(

    value: number,

  ): void {

    this.maximumObjects =

      Math.max(

        1,

        Math.floor(

          finiteOr(

            value,

            this.maximumObjects,

          ),

        ),

      );

  }



  getMaximum(): number {

    return this.maximumObjects;

  }



  choose(

    requests: readonly LodRequest[],

  ): LodRequest[] {

    if (

      requests.length <=

      this.maximumObjects

    ) {

      return [...requests];

    }



    return [...requests]

      .sort(

        (a, b) =>

          b.priority -

          a.priority,

      )

      .slice(

        0,

        this.maximumObjects,

      );

  }

}



/* -------------------------------------------------------------------------- */

/* Streaming                                                                   */

/* -------------------------------------------------------------------------- */



export interface StreamRequest {

  key: string;



  frameId: FrameId;



  center: Vec3;



  radiusMeters: number;



  scale: ScaleBand;



  priority: number;



  generation?: number;

}



export interface StreamStats {

  queued: number;

  active: number;

  completed: number;

  failed: number;

}



export class StreamingQueue {

  private readonly queued =

    new Map<

      string,

      StreamRequest

    >();



  private readonly active =

    new Set<string>();



  private completed = 0;

  private failed = 0;



  enqueue(

    request: StreamRequest,

  ): void {

    if (

      this.active.has(

        request.key,

      )

    ) {

      return;

    }



    const current =

      this.queued.get(

        request.key,

      );



    if (

      !current ||

      request.priority >

        current.priority

    ) {

      this.queued.set(

        request.key,

        {

          ...request,

        },

      );

    }

  }



  cancel(

    key: string,

  ): boolean {

    return this.queued.delete(

      key,

    );

  }



  next():

    StreamRequest | undefined {

    let best:

      | StreamRequest

      | undefined;



    for (

      const request of

      this.queued.values()

    ) {

      if (

        !best ||

        request.priority >

          best.priority

      ) {

        best = request;

      }

    }



    if (!best) {

      return undefined;

    }



    this.queued.delete(

      best.key,

    );



    this.active.add(

      best.key,

    );



    return best;

  }



  finish(

    key: string,

  ): void {

    if (

      this.active.delete(key)

    ) {

      this.completed++;

    }

  }



  fail(

    key: string,

  ): void {

    if (

      this.active.delete(key)

    ) {

      this.failed++;

    }

  }



  clear(): void {

    this.queued.clear();

    this.active.clear();



    this.completed = 0;

    this.failed = 0;

  }



  has(

    key: string,

  ): boolean {

    return (

      this.queued.has(key) ||

      this.active.has(key)

    );

  }



  stats(): StreamStats {

    return {

      queued:

        this.queued.size,



      active:

        this.active.size,



      completed:

        this.completed,



      failed:

        this.failed,

    };

  }

}



/* -------------------------------------------------------------------------- */

/* Performance                                                                 */

/* -------------------------------------------------------------------------- */



export interface PerformanceSample {

  frameTimeMs: number;

  visibleObjects: number;



  cpuTimeMs?: number;

  renderTimeMs?: number;



  timestamp?: number;

}



export interface PerformanceState {

  averageFrameTimeMs: number;

  estimatedFps: number;



  minimumFrameTimeMs: number;

  maximumFrameTimeMs: number;



  visibleObjects: number;



  sampleCount: number;

}



export class PerformanceTracker {

  private readonly samples:

    PerformanceSample[] = [];



  constructor(

    private readonly sampleLimit = 120,

  ) {}



  push(

    sample: PerformanceSample,

  ): void {

    if (

      !Number.isFinite(

        sample.frameTimeMs,

      ) ||

      sample.frameTimeMs < 0

    ) {

      return;

    }



    this.samples.push({

      ...sample,

    });



    while (

      this.samples.length >

      this.sampleLimit

    ) {

      this.samples.shift();

    }

  }



  snapshot(): PerformanceState {

    if (

      this.samples.length === 0

    ) {

      return {

        averageFrameTimeMs: 0,

        estimatedFps: 0,



        minimumFrameTimeMs: 0,

        maximumFrameTimeMs: 0,



        visibleObjects: 0,

        sampleCount: 0,

      };

    }



    let totalTime = 0;



    let minimum =

      Number.POSITIVE_INFINITY;



    let maximum = 0;



    let visibleObjects = 0;



    for (

      const sample of

      this.samples

    ) {

      totalTime +=

        sample.frameTimeMs;



      minimum =

        Math.min(

          minimum,

          sample.frameTimeMs,

        );



      maximum =

        Math.max(

          maximum,

          sample.frameTimeMs,

        );



      visibleObjects =

        sample.visibleObjects;

    }



    const averageFrameTimeMs =

      totalTime /

      this.samples.length;



    const estimatedFps =

      averageFrameTimeMs > 0

        ? 1_000 /

          averageFrameTimeMs

        : 0;



    return {

      averageFrameTimeMs,

      estimatedFps,



      minimumFrameTimeMs:

        minimum,



      maximumFrameTimeMs:

        maximum,



      visibleObjects,



      sampleCount:

        this.samples.length,

    };

  }



  clear(): void {

    this.samples.length = 0;

  }



  get sampleCount(): number {

    return this.samples.length;

  }

}



/* -------------------------------------------------------------------------- */

/* Adaptive quality                                                            */

/* -------------------------------------------------------------------------- */



export interface AdaptiveQualityResult {

  starDensity: number;

  debrisDensity: number;

  pixelRatio: number;

}



export function calculateAdaptiveQuality(

  performance: PerformanceState,

  settings: GraphicsSettings,

): AdaptiveQualityResult {

  if (

    settings.preset !== "auto"

  ) {

    return {

      starDensity:

        settings.starDensity,



      debrisDensity:

        settings.debrisDensity,



      pixelRatio:

        settings.maxPixelRatio,

    };

  }



  if (

    performance.sampleCount < 20

  ) {

    return {

      starDensity: 1,

      debrisDensity: 1,

      pixelRatio:

        settings.maxPixelRatio,

    };

  }



  const targetFrameTime =

    1_000 /

    Math.max(

      settings.targetFps,

      1,

    );



  const ratio =

    performance.averageFrameTimeMs /

    targetFrameTime;



  if (ratio > 1.75) {

    return {

      starDensity: 0.25,

      debrisDensity: 0.15,

      pixelRatio: Math.min(

        settings.maxPixelRatio,

        0.75,

      ),

    };

  }



  if (ratio > 1.5) {

    return {

      starDensity: 0.35,

      debrisDensity: 0.25,

      pixelRatio: Math.min(

        settings.maxPixelRatio,

        1,

      ),

    };

  }



  if (ratio > 1.15) {

    return {

      starDensity: 0.65,

      debrisDensity: 0.5,

      pixelRatio: Math.min(

        settings.maxPixelRatio,

        1.5,

      ),

    };

  }



  return {

    starDensity: 1,

    debrisDensity: 1,

    pixelRatio:

      settings.maxPixelRatio,

  };

}



/* -------------------------------------------------------------------------- */

/* Fixed-step simulation                                                       */

/* -------------------------------------------------------------------------- */



export interface SimulationStep {

  deltaSeconds: number;

  elapsedSeconds: number;

  index: number;

}



export class FixedStepClock {

  private accumulator = 0;

  private elapsed = 0;

  private stepIndex = 0;



  constructor(

    readonly stepSeconds = 1 / 60,

    readonly maxStepsPerFrame = 5,

  ) {

    if (

      stepSeconds <= 0

    ) {

      throw new Error(

        "stepSeconds must be greater than zero",

      );

    }



    if (

      maxStepsPerFrame <= 0

    ) {

      throw new Error(

        "maxStepsPerFrame must be greater than zero",

      );

    }

  }



  advance(

    realDeltaSeconds: number,

    callback: (

      step: SimulationStep,

    ) => void,

  ): number {

    const delta = clamp(

      finiteOr(

        realDeltaSeconds,

        0,

      ),

      0,

      0.25,

    );



    this.accumulator += delta;



    let steps = 0;



    while (

      this.accumulator >=

        this.stepSeconds &&

      steps <

        this.maxStepsPerFrame

    ) {

      this.accumulator -=

        this.stepSeconds;



      this.elapsed +=

        this.stepSeconds;



      this.stepIndex++;



      callback({

        deltaSeconds:

          this.stepSeconds,



        elapsedSeconds:

          this.elapsed,



        index:

          this.stepIndex,

      });



      steps++;

    }



    if (

      steps ===

      this.maxStepsPerFrame

    ) {

      this.accumulator =

        Math.min(

          this.accumulator,

          this.stepSeconds,

        );

    }



    return steps;

  }



  reset(): void {

    this.accumulator = 0;

    this.elapsed = 0;

    this.stepIndex = 0;

  }



  get elapsedSeconds(): number {

    return this.elapsed;

  }



  get accumulatorSeconds(): number {

    return this.accumulator;

  }



  get stepIndexValue(): number {

    return this.stepIndex;

  }

}



/* -------------------------------------------------------------------------- */

/* Render contract                                                             */

/* -------------------------------------------------------------------------- */



export interface RenderFrame {

  deltaSeconds: number;



  state: UniverseState;



  visibleEntityIds:

    readonly EntityId[];



  alpha?: number;

}



export interface UniverseRenderer {

  readonly name: string;



  initialize(

    container: HTMLElement,

  ):

    | void

    | Promise<void>;



  resize(

    width: number,

    height: number,

    pixelRatio: number,

  ): void;



  render(

    frame: RenderFrame,

  ): void;



  dispose(): void;

}



/* -------------------------------------------------------------------------- */

/* Frame loop                                                                  */

/* -------------------------------------------------------------------------- */



export type FrameCallback =

  (deltaSeconds: number) => void;



export interface FrameLoopScheduler {

  request(

    callback: (

      timestamp: number,

    ) => void,

  ): number;



  cancel(

    handle: number,

  ): void;



  now(): number;

}



export const BROWSER_FRAME_SCHEDULER:

  FrameLoopScheduler = {

    request(callback) {

      return window.requestAnimationFrame(

        callback,

      );

    },



    cancel(handle) {

      window.cancelAnimationFrame(

        handle,

      );

    },



    now() {

      return performance.now();

    },

  };



export class FrameLoop {

  private running = false;



  private previousTime = 0;



  private frameHandle:

    number | null = null;



  constructor(

    private readonly callback: FrameCallback,



    private readonly scheduler:

      FrameLoopScheduler =

        BROWSER_FRAME_SCHEDULER,

  ) {}



  start(): void {

    if (this.running) {

      return;

    }



    this.running = true;



    this.previousTime =

      this.scheduler.now();



    const tick = (

      currentTime: number,

    ): void => {

      if (!this.running) {

        return;

      }



      const deltaSeconds = clamp(

        (

          currentTime -

          this.previousTime

        ) / 1_000,

        0,

        0.25,

      );



      this.previousTime =

        currentTime;



      this.callback(

        deltaSeconds,

      );



      if (this.running) {

        this.frameHandle =

          this.scheduler.request(

            tick,

          );

      }

    };



    this.frameHandle =

      this.scheduler.request(

        tick,

      );

  }



  stop(): void {

    if (!this.running) {

      return;

    }



    this.running = false;



    if (

      this.frameHandle !== null

    ) {

      this.scheduler.cancel(

        this.frameHandle,

      );

    }



    this.frameHandle = null;

  }



  get isRunning(): boolean {

    return this.running;

  }

}



/* -------------------------------------------------------------------------- */

/* Commands                                                                    */

/* -------------------------------------------------------------------------- */



export interface UniverseCommand {

  action: ActionId;



  value?: number;



  targetId?: EntityId;

}



export interface CommandResult {

  handled: boolean;



  message?: string;



  targetId?: EntityId;

}



export class CommandDispatcher {

  constructor(

    private readonly store:

      UniverseStore,



    private readonly history:

      NavigationHistory,

  ) {}



  dispatch(

    command: UniverseCommand,

  ): CommandResult {

    const state =

      this.store.getSnapshot();



    switch (

      command.action

    ) {

      case "focus": {

        const id =

          command.targetId ??

          state.selectedId;



        if (!id) {

          return {

            handled: false,

            message:

              "No entity selected",

          };

        }



        if (

          !state.entities.has(id)

        ) {

          return {

            handled: false,

            message:

              "Entity was not found",

          };

        }



        this.history.push(id);



        this.store.focus(id);



        return {

          handled: true,

          targetId: id,

        };

      }



      case "inspect": {

        const id =

          command.targetId ??

          state.selectedId;



        if (!id) {

          return {

            handled: false,

            message:

              "No entity selected",

          };

        }



        if (

          !state.entities.has(id)

        ) {

          return {

            handled: false,

            message:

              "Entity was not found",

          };

        }



        this.store.select(id);



        return {

          handled: true,

          targetId: id,

        };

      }



      case "navigation.parent": {

        const current =

          state.focusId ??

          state.selectedId;



        if (!current) {

          return {

            handled: false,

          };

        }



        const parent =

          getEntityParent(

            state,

            current,

          );



        if (!parent) {

          return {

            handled: false,

            message:

              "No parent entity",

          };

        }



        this.history.push(

          parent.id,

        );



        this.store.select(

          parent.id,

        );



        this.store.focus(

          parent.id,

        );



        return {

          handled: true,

          targetId:

            parent.id,

        };

      }



      case "navigation.child": {

        const current =

          state.focusId ??

          state.selectedId;



        if (!current) {

          return {

            handled: false,

          };

        }



        const children =

          getEntityChildren(

            state,

            current,

          );



        const child =

          children[0];



        if (!child) {

          return {

            handled: false,

            message:

              "No child entity",

          };

        }



        this.history.push(

          child.id,

        );



        this.store.select(

          child.id,

        );



        this.store.focus(

          child.id,

        );



        return {

          handled: true,

          targetId:

            child.id,

        };

      }



      case "navigation.previous":

      case "navigation.next": {

        const current =

          state.focusId ??

          state.selectedId;



        if (!current) {

          return {

            handled: false,

          };

        }



        const siblings =

          getEntitySiblings(

            state,

            current,

          );



        if (

          siblings.length < 2

        ) {

          return {

            handled: false,

          };

        }



        const index =

          siblings.findIndex(

            (entity) =>

              entity.id === current,

          );



        if (index < 0) {

          return {

            handled: false,

          };

        }



        const direction =

          command.action ===

          "navigation.next"

            ? 1

            : -1;



        const nextIndex =

          (index +

            direction +

            siblings.length) %

          siblings.length;



        const next =

          siblings[nextIndex];



        if (!next) {

          return {

            handled: false,

          };

        }



        this.history.push(

          next.id,

        );



        this.store.select(

          next.id,

        );



        this.store.focus(

          next.id,

        );



        return {

          handled: true,

          targetId:

            next.id,

        };

      }



      case "back": {

        const id =

          this.history.back();



        if (!id) {

          return {

            handled: false,

            message:

              "Navigation history is empty",

          };

        }



        this.store.select(id);

        this.store.focus(id);



        return {

          handled: true,

          targetId: id,

        };

      }



      case "camera.reset": {

        this.store.setCamera(

          resetCamera(

            state.camera,

          ),

        );



        return {

          handled: true,

        };

      }



      case "camera.brake": {

        this.store.setCamera(

          stopCamera(

            state.camera,

          ),

        );



        return {

          handled: true,

        };

      }



      case "time.toggle": {

        this.store.setClock(

          toggleClock(

            state.clock,

          ),

        );



        return {

          handled: true,

        };

      }



      case "time.faster": {

        this.store.setClock(

          speedUpClock(

            state.clock,

          ),

        );



        return {

          handled: true,

        };

      }



      case "time.slower": {

        this.store.setClock(

          slowDownClock(

            state.clock,

          ),

        );



        return {

          handled: true,

        };

      }



      case "time.realtime": {

        this.store.setClock(

          setRealtime(

            state.clock,

          ),

        );



        return {

          handled: true,

        };

      }



      case "time.reverse": {

        this.store.setClock(

          reverseClock(

            state.clock,

          ),

        );



        return {

          handled: true,

        };

      }



      case "labels.toggle": {

        this.store.setOverlays({

          ...state.overlays,

          labels:

            !state.overlays.labels,

        });



        return {

          handled: true,

        };

      }



      case "gravity.toggle": {

        this.store.setOverlays({

          ...state.overlays,

          gravity:

            !state.overlays.gravity,

        });



        return {

          handled: true,

        };

      }



      case "humanity.toggle": {

        this.store.setOverlays({

          ...state.overlays,

          humanity:

            !state.overlays.humanity,

        });



        return {

          handled: true,

        };

      }



      case "knowledge.toggle": {

        this.store.setOverlays({

          ...state.overlays,

          knowledge:

            !state.overlays.knowledge,

        });



        return {

          handled: true,

        };

      }



      case "orbit.toggle": {

        this.store.setOverlays({

          ...state.overlays,

          orbits:

            !state.overlays.orbits,

        });



        return {

          handled: true,

        };

      }



      case "scale.surface": {

        this.store.setScale(

          scaleForBand(

            "surface",

            state.scale.frameId,

          ),

        );



        return {

          handled: true,

        };

      }



      case "scale.planet": {

        this.store.setScale(

          scaleForBand(

            "planet",

            state.scale.frameId,

          ),

        );



        return {

          handled: true,

        };

      }



      case "scale.system": {

        this.store.setScale(

          scaleForBand(

            "system",

            state.scale.frameId,

          ),

        );



        return {

          handled: true,

        };

      }



      case "scale.stellar": {

        this.store.setScale(

          scaleForBand(

            "stellar",

            state.scale.frameId,

          ),

        );



        return {

          handled: true,

        };

      }



      case "scale.galactic": {

        this.store.setScale(

          scaleForBand(

            "galactic",

            state.scale.frameId,

          ),

        );



        return {

          handled: true,

        };

      }



      case "scale.cosmic": {

        this.store.setScale(

          scaleForBand(

            "cosmic",

            state.scale.frameId,

          ),

        );



        return {

          handled: true,

        };

      }



      case "home": {

        this.store.select(null);

        this.store.focus(null);



        this.store.setCamera({

          mode: "orbit",

          frameId: "root",

          position: [

            0,

            0,

            10,

          ],

          velocity: [

            0,

            0,

            0,

          ],

          fieldOfView: 60,

          baseSpeed: 1,

          yaw: 0,

          pitch: 0,

          roll: 0,

        });



        this.store.setScale({

          band: "planet",

          frameId: "root",

          metersPerUnit: 10_000,

        });



        return {

          handled: true,

        };

      }



      default:

        return {

          handled: false,

        };

    }

  }

}



/* -------------------------------------------------------------------------- */

/* Runtime                                                                     */

/* -------------------------------------------------------------------------- */



export interface RuntimeHooks {

  beforeFrame?: (

    state: UniverseState,

    deltaSeconds: number,

  ) => void;



  fixedStep?: (

    step: SimulationStep,

    state: UniverseState,

  ) => void;



  afterFrame?: (

    state: UniverseState,

    deltaSeconds: number,

  ) => void;



  resolveVisibleEntities?: (

    state: UniverseState,

  ) => readonly EntityId[];

}



export interface RuntimeOptions {

  state: UniverseState;



  renderer?: UniverseRenderer;



  hooks?: RuntimeHooks;



  frameScheduler?:

    FrameLoopScheduler;

}



export class UniverseRuntime {

  readonly store: UniverseStore;



  readonly input =

    new InputState();



  readonly history =

    new NavigationHistory();



  readonly performance =

    new PerformanceTracker();



  readonly fixedStep =

    new FixedStepClock();



  readonly visibility =

    new VisibilityBudget(

      DEFAULT_SETTINGS.graphics

        .maxVisibleObjects,

    );



  readonly streaming =

    new StreamingQueue();



  readonly commands:

    CommandDispatcher;



  private renderer:

    UniverseRenderer | undefined;



  private loop:

    FrameLoop | null = null;



  private transition:

    CameraTransition | null = null;



  private readonly hooks:

    RuntimeHooks;



  private disposed = false;



  constructor(

    options: RuntimeOptions,

  ) {

    this.store =

      new UniverseStore(

        options.state,

      );



    this.renderer =

      options.renderer;



    this.hooks =

      options.hooks ?? {};



    this.commands =

      new CommandDispatcher(

        this.store,

        this.history,

      );



    this.visibility.setMaximum(

      options.state.settings

        .graphics

        .maxVisibleObjects,

    );

  }



  attachRenderer(

    renderer: UniverseRenderer,

  ): void {

    if (this.disposed) {

      throw new Error(

        "Cannot attach a renderer after runtime disposal",

      );

    }



    this.renderer =

      renderer;

  }



  detachRenderer(): void {

    this.renderer =

      undefined;

  }



  start(): void {

    if (

      this.disposed ||

      this.loop

    ) {

      return;

    }



    this.loop =

      new FrameLoop(

        (deltaSeconds) => {

          this.frame(

            deltaSeconds,

          );

        },

      );



    this.loop.start();

  }



  stop(): void {

    this.loop?.stop();

    this.loop = null;

  }



  dispatch(

    action: ActionId,

    targetId?: EntityId,

  ): CommandResult {

    if (

      targetId === undefined

    ) {

      return this.commands.dispatch({

        action,

      });

    }



    return this.commands.dispatch({

      action,

      targetId,

    });

  }



  zoom(

    wheelDelta: number,

  ): void {

    const state =

      this.store.getSnapshot();



    const sensitivity =

      state.settings

        .navigation

        .scrollSensitivity;



    const direction =

      state.settings

        .navigation

        .invertZoom

        ? -wheelDelta

        : wheelDelta;



    this.store.setScale(

      semanticZoom(

        state.scale,

        direction,

        sensitivity,

      ),

    );

  }



  beginCameraTransition(

    target: CameraState,

    durationSeconds = 1.2,

    mode:

      CameraTransitionMode =

        "cinematic",

  ): void {

    const current =

      this.store

        .getSnapshot()

        .camera;



    this.transition =

      createCameraTransition(

        current,

        target,

        durationSeconds,

        mode,

      );

  }



  cancelCameraTransition(): void {

    this.transition = null;

  }



  frame(

    deltaSeconds: number,

  ): void {

    if (this.disposed) {

      return;

    }



    const startedAt =

      typeof performance !==

      "undefined"

        ? performance.now()

        : Date.now();



    const safeDelta =

      clamp(

        finiteOr(

          deltaSeconds,

          0,

        ),

        0,

        0.25,

      );



    let state =

      this.store.getSnapshot();



    this.hooks.beforeFrame?.(

      state,

      safeDelta,

    );



    const nextClock =

      advanceClock(

        state.clock,

        safeDelta,

      );



    if (

      nextClock !==

      state.clock

    ) {

      this.store.setClock(

        nextClock,

      );

    }



    state =

      this.store.getSnapshot();



    const cameraInput =

      readCameraInput(

        this.input,

      );



    let nextCamera =

      updateCameraFromInput(

        state.camera,

        cameraInput,

        state.settings

          .navigation,

        safeDelta,

      );



    if (this.transition) {

      this.transition =

        advanceCameraTransition(

          this.transition,

          safeDelta,

        );



      nextCamera =

        transitionCamera(

          this.transition,

        );



      if (

        isCameraTransitionComplete(

          this.transition,

        )

      ) {

        this.transition =

          null;

      }

    }



    if (

      nextCamera !==

      state.camera

    ) {

      this.store.setCamera(

        nextCamera,

      );

    }



    state =

      this.store.getSnapshot();



    this.fixedStep.advance(

      safeDelta,

      (step) => {

        const current =

          this.store.getSnapshot();



        this.hooks.fixedStep?.(

          step,

          current,

        );

      },

    );



    state =

      this.store.getSnapshot();



    this.visibility.setMaximum(

      state.settings

        .graphics

        .maxVisibleObjects,

    );



    let visibleEntityIds:

      readonly EntityId[];



    if (

      this.hooks

        .resolveVisibleEntities

    ) {

      visibleEntityIds =

        this.hooks

          .resolveVisibleEntities(

            state,

          );

    } else {

      visibleEntityIds =

        [

          ...state.entities.keys(),

        ].slice(

          0,

          state.settings

            .graphics

            .maxVisibleObjects,

        );

    }



    this.renderer?.render({

      deltaSeconds:

        safeDelta,



      state,



      visibleEntityIds,

    });



    const frameTimeMs =

      (

        typeof performance !==

        "undefined"

          ? performance.now()

          : Date.now()

      ) - startedAt;



    this.performance.push({

      frameTimeMs,



      visibleObjects:

        visibleEntityIds.length,



      timestamp:

        typeof performance !==

        "undefined"

          ? performance.now()

          : Date.now(),

    });



    this.hooks.afterFrame?.(

      state,

      safeDelta,

    );

  }



  dispose(): void {

    if (this.disposed) {

      return;

    }



    this.stop();



    this.input.reset();



    this.renderer?.dispose();



    this.renderer =

      undefined;



    this.history.clear();

    this.performance.clear();

    this.fixedStep.reset();

    this.streaming.clear();



    this.transition = null;



    this.disposed = true;

  }



  get isRunning(): boolean {

    return (

      this.loop?.isRunning ??

      false

    );

  }



  get isDisposed(): boolean {

    return this.disposed;

  }



  get cameraTransition():

    CameraTransition | null {

    return this.transition;

  }

}



/* -------------------------------------------------------------------------- */

/* Camera constraints                                                          */

/* -------------------------------------------------------------------------- */



export interface CameraConstraint {

  minimumDistance?: number;

  maximumDistance?: number;



  minimumFieldOfView?: number;

  maximumFieldOfView?: number;

}



export function constrainCamera(

  camera: CameraState,

  constraint:

    CameraConstraint,

): CameraState {

  const next = {

    ...camera,

  };



  if (

    constraint.minimumFieldOfView !==

    undefined ||

    constraint.maximumFieldOfView !==

    undefined

  ) {

    next.fieldOfView =

      clamp(

        camera.fieldOfView,

        constraint

          .minimumFieldOfView ??

          20,

        constraint

          .maximumFieldOfView ??

          120,

      );

  }



  const distance =

    lengthVec3(

      camera.position,

    );



  const minimum =

    constraint.minimumDistance ??

    0;



  const maximum =

    constraint.maximumDistance ??

    Number.POSITIVE_INFINITY;



  if (

    distance > 0 &&

    (

      distance < minimum ||

      distance > maximum

    )

  ) {

    const constrained =

      clamp(

        distance,

        minimum,

        maximum,

      );



    const direction =

      normalizeVec3(

        camera.position,

      );



    next.position =

      multiplyVec3(

        direction,

        constrained,

      );

  }



  return next;

}



/* -------------------------------------------------------------------------- */

/* Scale travel helpers                                                       */

/* -------------------------------------------------------------------------- */



export interface ScaleTravelTarget {

  scale: ScaleState;



  camera: CameraState;



  durationSeconds: number;

}



export function createScaleTravelTarget(

  state: UniverseState,

  targetBand: ScaleBand,

  targetDistance = 10,

): ScaleTravelTarget {

  const scale =

    scaleForBand(

      targetBand,

      state.scale.frameId,

    );



  const currentCamera =

    state.camera;



  const direction =

    normalizeVec3(

      currentCamera.position,

    );



  const safeDirection: Vec3 = lengthVec3(direction) > 0 ? direction : [0, 0, 1];



  const distance =

    Math.max(

      0.001,

      targetDistance,

    );



  const camera: CameraState =

    {

      ...currentCamera,



      position:

        multiplyVec3(

          safeDirection,

          distance,

        ),



      velocity: [

        0,

        0,

        0,

      ],

    };



  const currentIndex =

    scaleBandIndex(

      state.scale.band,

    );



  const targetIndex =

    scaleBandIndex(

      targetBand,

    );



  const difference =

    Math.abs(

      targetIndex -

      currentIndex,

    );



  return {

    scale,

    camera,



    durationSeconds:

      0.6 +

      difference * 0.35,

  };

}



/* -------------------------------------------------------------------------- */

/* Engine diagnostics                                                          */

/* -------------------------------------------------------------------------- */



export interface EngineDiagnostics {

  version: number;



  entityCount: number;



  selectedId?:

    EntityId;



  focusId?:

    EntityId;



  scaleBand:

    ScaleBand;



  metersPerUnit:

    number;



  cameraMode:

    CameraMode;



  frameId:

    FrameId;



  simulationRate:

    number;



  simulationPaused:

    boolean;



  performance:

    PerformanceState;



  streaming:

    StreamStats;



  runtimeRunning:

    boolean;

}



export function createEngineDiagnostics(

  runtime: UniverseRuntime,

): EngineDiagnostics {

  const state =

    runtime.store

      .getSnapshot();



  return {

    version:

      ENGINE_VERSION,



    entityCount:

      state.entities.size,



    ...(state.selectedId !== undefined ? { selectedId: state.selectedId } : {}),



    ...(state.focusId !== undefined ? { focusId: state.focusId } : {}),



    scaleBand:

      state.scale.band,



    metersPerUnit:

      state.scale

        .metersPerUnit,



    cameraMode:

      state.camera.mode,



    frameId:

      state.camera.frameId,



    simulationRate:

      state.clock.rate,



    simulationPaused:

      state.clock.paused,



    performance:

      runtime.performance

        .snapshot(),



    streaming:

      runtime.streaming

        .stats(),



    runtimeRunning:

      runtime.isRunning,

  };

}



/* -------------------------------------------------------------------------- */

/* Renderer-safe visibility helpers                                            */

/* -------------------------------------------------------------------------- */



export function limitVisibleEntities(

  state: UniverseState,

  candidates:

    readonly EntityId[],

): EntityId[] {

  const maximum =

    state.settings

      .graphics

      .maxVisibleObjects;



  const result: EntityId[] = [];



  for (

    const id of candidates

  ) {

    if (

      !state.entities.has(id)

    ) {

      continue;

    }



    result.push(id);



    if (

      result.length >=

      maximum

    ) {

      break;

    }

  }



  return result;

}



export function sortEntitiesByDistance(

  state: UniverseState,

  cameraPosition: Vec3,

  ids:

    readonly EntityId[],

): EntityId[] {

  const distances =

    new Map<

      EntityId,

      number

    >();



  for (const id of ids) {

    const entity =

      state.entities.get(id);



    if (!entity) {

      continue;

    }



    const position =

      entity.spatial?.position;



    if (!position) {

      distances.set(

        id,

        Number.POSITIVE_INFINITY,

      );



      continue;

    }



    distances.set(

      id,

      distanceVec3(

        cameraPosition,

        position,

      ),

    );

  }



  return [...ids].sort(

    (a, b) =>

      (

        distances.get(a) ??

        Number.POSITIVE_INFINITY

      ) -

      (

        distances.get(b) ??

        Number.POSITIVE_INFINITY

      ),

  );

}



/* -------------------------------------------------------------------------- */

/* Reference-frame transition helpers                                          */

/* -------------------------------------------------------------------------- */



export interface FrameTransition {

  from: FrameId;

  to: FrameId;



  elapsedSeconds: number;

  durationSeconds: number;

}



export function createFrameTransition(

  from: FrameId,

  to: FrameId,

  durationSeconds = 0.5,

): FrameTransition {

  return {

    from,

    to,



    elapsedSeconds: 0,



    durationSeconds:

      Math.max(

        0.001,

        durationSeconds,

      ),

  };

}



export function advanceFrameTransition(

  transition: FrameTransition,

  deltaSeconds: number,

): FrameTransition {

  return {

    ...transition,



    elapsedSeconds:

      clamp(

        transition

          .elapsedSeconds +

          Math.max(

            0,

            deltaSeconds,

          ),

        0,

        transition

          .durationSeconds,

      ),

  };

}



export function frameTransitionProgress(

  transition: FrameTransition,

): number {

  return clamp(

    transition.elapsedSeconds /

      transition.durationSeconds,

    0,

    1,

  );

}



export function frameTransitionComplete(

  transition: FrameTransition,

): boolean {

  return (

    transition.elapsedSeconds >=

    transition.durationSeconds

  );

}



/* -------------------------------------------------------------------------- */

/* Camera orbit math                                                          */

/* -------------------------------------------------------------------------- */



export interface OrbitCameraParameters {

  target: Vec3;



  distance: number;



  yaw: number;

  pitch: number;

}



export function cameraFromOrbit(

  current: CameraState,

  parameters:

    OrbitCameraParameters,

): CameraState {

  const pitch =

    clamp(

      parameters.pitch,

      -Math.PI * 0.49,

      Math.PI * 0.49,

    );



  const cosPitch =

    Math.cos(pitch);



  const offset: Vec3 = [

    Math.sin(

      parameters.yaw,

    ) *

      cosPitch *

      parameters.distance,



    Math.sin(pitch) *

      parameters.distance,



    Math.cos(

      parameters.yaw,

    ) *

      cosPitch *

      parameters.distance,

  ];



  const position =

    addVec3(

      parameters.target,

      offset,

    );



  const camera: CameraState =

    {

      ...current,



      position,



      velocity: [

        0,

        0,

        0,

      ],



      yaw:

        parameters.yaw +

        Math.PI,



      pitch:

        -parameters.pitch,



      roll: 0,

    };



  return lookAtCamera(

    camera,

    parameters.target,

  );

}



export function orbitCamera(

  camera: CameraState,

  target: Vec3,

  horizontalDelta: number,

  verticalDelta: number,

  distanceMultiplier = 1,

): CameraState {

  const offset =

    subtractVec3(

      camera.position,

      target,

    );



  const distance =

    Math.max(

      0.001,

      lengthVec3(offset),

    );



  const yaw =

    Math.atan2(

      offset[0],

      offset[2],

    );



  const pitch =

    Math.asin(

      clamp(

        offset[1] /

          distance,

        -1,

        1,

      ),

    );



  return cameraFromOrbit(

    camera,

    {

      target,



      distance:

        clamp(

          distance *

            distanceMultiplier,

          camera.minDistance ??

            0.001,

          camera.maxDistance ??

            Number.POSITIVE_INFINITY,

        ),



      yaw:

        yaw + horizontalDelta,



      pitch:

        clamp(

          pitch +

            verticalDelta,

          -Math.PI * 0.49,

          Math.PI * 0.49,

        ),

    },

  );

}



/* -------------------------------------------------------------------------- */

/* Runtime state helpers                                                       */

/* -------------------------------------------------------------------------- */



export function setCameraTarget(

  store: UniverseStore,

  targetId: EntityId | null,

): void {

  const state =

    store.getSnapshot();



  const camera = {

    ...state.camera,

  };



  if (

    targetId === null

  ) {

    delete camera.targetId;

  } else {

    camera.targetId =

      targetId;

  }



  store.setCamera(

    camera,

  );

}



export function focusEntity(

  store: UniverseStore,

  history: NavigationHistory,

  id: EntityId,

): CommandResult {

  const state =

    store.getSnapshot();



  if (

    !state.entities.has(id)

  ) {

    return {

      handled: false,

      message:

        "Entity was not found",

    };

  }



  history.push(id);



  store.select(id);

  store.focus(id);



  return {

    handled: true,

    targetId: id,

  };

}



export function clearSelection(

  store: UniverseStore,

): void {

  store.select(null);

  store.focus(null);

}



/* -------------------------------------------------------------------------- */

/* Runtime visibility resolver                                                */

/* -------------------------------------------------------------------------- */



export interface VisibilityResolverOptions {

  maximumObjects: number;



  cameraPosition:

    Vec3;



  viewportHeight:

    number;



  fieldOfViewDegrees:

    number;

}



export function resolveVisibleEntityIds(

  state: UniverseState,

  options:

    VisibilityResolverOptions,

): EntityId[] {

  const requests:

    LodRequest[] = [];



  for (

    const entity of

    state.entities.values()

  ) {

    const position =

      entity.spatial?.position;



    if (!position) {

      continue;

    }



    const distance =

      distanceVec3(

        options.cameraPosition,

        position,

      );



    const radius =

      entity.physical?.radiusM?.value ??

      1;



    requests.push(

      createLodRequest(

        entity.id,

        Math.max(

          radius,

          0.001,

        ),

        Math.max(

          distance,

          0.001,

        ),

        options.viewportHeight,

        options.fieldOfViewDegrees,

      ),

    );

  }



  const budget =

    new VisibilityBudget(

      options.maximumObjects,

    );



  return budget

    .choose(requests)

    .map(

      (request) =>

        request.entityId,

    );

}



/* -------------------------------------------------------------------------- */

/* Engine invariants                                                           */

/* -------------------------------------------------------------------------- */



export interface EngineInvariantResult {

  valid: boolean;



  errors:

    readonly string[];

}



export function validateUniverseState(

  state: UniverseState,

): EngineInvariantResult {

  const errors: string[] = [];



  if (

    !Number.isFinite(

      state.scale

        .metersPerUnit,

    ) ||

    state.scale

      .metersPerUnit <= 0

  ) {

    errors.push(

      "Scale metersPerUnit must be positive and finite.",

    );

  }



  if (

    state.selectedId !==

      undefined &&

    !state.entities.has(

      state.selectedId,

    )

  ) {

    errors.push(

      "selectedId does not reference an existing entity.",

    );

  }



  if (

    state.focusId !==

      undefined &&

    !state.entities.has(

      state.focusId,

    )

  ) {

    errors.push(

      "focusId does not reference an existing entity.",

    );

  }



  if (

    !isFiniteVec3(

      state.camera.position,

    )

  ) {

    errors.push(

      "Camera position contains non-finite values.",

    );

  }



  if (

    !isFiniteVec3(

      state.camera.velocity,

    )

  ) {

    errors.push(

      "Camera velocity contains non-finite values.",

    );

  }



  if (

    !Number.isFinite(

      state.camera.fieldOfView,

    )

  ) {

    errors.push(

      "Camera field of view is not finite.",

    );

  }



  return {

    valid:

      errors.length === 0,



    errors,

  };

}



/* -------------------------------------------------------------------------- */

/* Engine-level navigation API                                                */

/* -------------------------------------------------------------------------- */



export interface NavigationTarget {

  entityId: EntityId;



  durationSeconds?: number;



  mode?:

    CameraTransitionMode;

}



export function navigateToEntity(

  runtime: UniverseRuntime,

  target:

    NavigationTarget,

): CommandResult {

  const state =

    runtime.store

      .getSnapshot();



  const entity =

    state.entities.get(

      target.entityId,

    );



  if (!entity) {

    return {

      handled: false,

      message:

        "Entity was not found",

    };

  }



  const position =

    entity.spatial?.position;



  if (!position) {

    return {

      handled: false,

      message:

        "Entity has no spatial position",

    };

  }



  const current =

    state.camera;



  const offset =

    subtractVec3(

      current.position,

      position,

    );



  const distance =

    Math.max(

      1,

      lengthVec3(offset),

    );



  const direction =

    normalizeVec3(offset);



  const nextCamera: CameraState =

    {

      ...current,



      mode:

        "cinematic",



      position:

        addVec3(

          position,

          multiplyVec3(

            direction,

            distance,

          ),

        ),



      velocity: [

        0,

        0,

        0,

      ],



      targetId:

        target.entityId,

    };



  runtime.store.select(

    target.entityId,

  );



  runtime.store.focus(

    target.entityId,

  );



  runtime.history.push(

    target.entityId,

  );



  runtime.beginCameraTransition(

    nextCamera,

    target.durationSeconds ??

      1.4,

    target.mode ??

      "cinematic",

  );



  return {

    handled: true,

    targetId:

      target.entityId,

  };

}



/* -------------------------------------------------------------------------- */

/* Public engine exports                                                      */

/* -------------------------------------------------------------------------- */



export * from "./procedural";

export * from "./procedural-entities";

export * from "./world-stream";

export * from "./unified-universe";

export * from "./cinematic-navigation";
export * from "./discovery-log";
export * from "./waypoint-system";
export * from "./atmosphere-profile";
export * from "./anomaly-generator";
export * from "./lod-controller";
export * from "./scale-transition";
export * from "./atmospheric-entry";
export * from "./discovery-notification";
