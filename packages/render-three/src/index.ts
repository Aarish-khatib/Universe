import {

  AdditiveBlending,

  AmbientLight,

  BackSide,

  BufferAttribute,

  BufferGeometry,

  CanvasTexture,

  Color,

  DoubleSide,

  Group,

  LineBasicMaterial,

  LineLoop,

  Material,

  Mesh,

  MeshBasicMaterial,

  MeshStandardMaterial,

  PerspectiveCamera,

  PointLight,

  Points,

  PointsMaterial,

  Raycaster,

  RepeatWrapping,

  REVISION,

  RingGeometry,

  Scene,

  SphereGeometry,

  SRGBColorSpace,

  Vector2,

  Vector3,

  WebGLRenderer,

} from "three";



import { METERS_PER_UNIT } from "@known-universe/core";



import type {

  DistanceUnit,

  EntityId,

  EntityKind,

  FrameId,

  SpaceEntity,

  SpatialPosition,

  Vec3,

} from "@known-universe/core";



import type {

  RenderFrame,

  UniverseRenderer,

  UniverseState,

} from "@known-universe/engine";



export const RENDER_THREE_VERSION = 4;



function clamp(value: number, minimum: number, maximum: number): number {

  if (!Number.isFinite(value)) {

    return minimum;

  }



  return Math.min(maximum, Math.max(minimum, value));

}



function positiveFinite(value: number, fallback: number): number {

  if (!Number.isFinite(value) || value <= 0) {

    return fallback;

  }



  return value;

}



function degreesToRadians(value: number | undefined): number {

  if (value === undefined || !Number.isFinite(value)) {

    return 0;

  }



  return (value * Math.PI) / 180;

}



function hashString(value: string): number {

  let hash = 2166136261;



  for (let index = 0; index < value.length; index++) {

    hash ^= value.charCodeAt(index);

    hash = Math.imul(hash, 16777619);

  }



  return hash >>> 0;

}



class SeededRandom {

  private state: number;



  constructor(seed: number) {

    this.state = seed >>> 0;

  }



  next(): number {

    this.state += 0x6d2b79f5;



    let value = this.state;



    value = Math.imul(value ^ (value >>> 15), value | 1);



    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);



    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;

  }



  range(minimum: number, maximum: number): number {

    return minimum + (maximum - minimum) * this.next();

  }

}



interface BodyVisualStyle {

  base: string;

  secondary: string;

  accent: string;

  minimumRadius: number;

  roughness: number;

  emissive: string;

  emissiveIntensity: number;

  atmosphere: string | null;

  atmosphereOpacity: number;

}



const DEFAULT_STYLE: BodyVisualStyle = {

  base: "#7ea7d8",

  secondary: "#aec7e7",

  accent: "#45698f",

  minimumRadius: 0.22,

  roughness: 0.88,

  emissive: "#000000",

  emissiveIntensity: 0,

  atmosphere: null,

  atmosphereOpacity: 0,

};



const BODY_STYLES: Readonly<Record<string, BodyVisualStyle>> = {

  sun: {

    base: "#ffbd5b",

    secondary: "#ff793e",

    accent: "#fff0ad",

    minimumRadius: 0.95,

    roughness: 0.75,

    emissive: "#ff9a38",

    emissiveIntensity: 2.7,

    atmosphere: "#ffc566",

    atmosphereOpacity: 0.14,

  },



  mercury: {

    base: "#8c8882",

    secondary: "#aaa59c",

    accent: "#57534f",

    minimumRadius: 0.17,

    roughness: 1,

    emissive: "#000000",

    emissiveIntensity: 0,

    atmosphere: null,

    atmosphereOpacity: 0,

  },



  venus: {

    base: "#d9a55a",

    secondary: "#f2c87b",

    accent: "#9f6a35",

    minimumRadius: 0.235,

    roughness: 0.85,

    emissive: "#241507",

    emissiveIntensity: 0.08,

    atmosphere: "#efbc68",

    atmosphereOpacity: 0.1,

  },



  earth: {

    base: "#2768bd",

    secondary: "#3f975d",

    accent: "#d4d8bd",

    minimumRadius: 0.245,

    roughness: 0.72,

    emissive: "#031523",

    emissiveIntensity: 0.04,

    atmosphere: "#54b9ff",

    atmosphereOpacity: 0.17,

  },



  moon: {

    base: "#9b9b98",

    secondary: "#bdbbb5",

    accent: "#545552",

    minimumRadius: 0.125,

    roughness: 1,

    emissive: "#000000",

    emissiveIntensity: 0,

    atmosphere: null,

    atmosphereOpacity: 0,

  },



  mars: {

    base: "#a84f37",

    secondary: "#d1764f",

    accent: "#6c3027",

    minimumRadius: 0.205,

    roughness: 0.96,

    emissive: "#150403",

    emissiveIntensity: 0.03,

    atmosphere: "#d8805d",

    atmosphereOpacity: 0.045,

  },



  jupiter: {

    base: "#caa076",

    secondary: "#e6c49c",

    accent: "#9e634a",

    minimumRadius: 0.53,

    roughness: 0.81,

    emissive: "#160d08",

    emissiveIntensity: 0.025,

    atmosphere: "#d9b384",

    atmosphereOpacity: 0.045,

  },



  saturn: {

    base: "#d9bd82",

    secondary: "#eed7a5",

    accent: "#aa8c5c",

    minimumRadius: 0.47,

    roughness: 0.84,

    emissive: "#120e06",

    emissiveIntensity: 0.02,

    atmosphere: "#dec995",

    atmosphereOpacity: 0.04,

  },



  uranus: {

    base: "#85cdd2",

    secondary: "#b4e5e2",

    accent: "#5fa5b1",

    minimumRadius: 0.35,

    roughness: 0.73,

    emissive: "#071719",

    emissiveIntensity: 0.025,

    atmosphere: "#9de5e4",

    atmosphereOpacity: 0.08,

  },



  neptune: {

    base: "#3f67ce",

    secondary: "#6e8de1",

    accent: "#294795",

    minimumRadius: 0.345,

    roughness: 0.74,

    emissive: "#050b20",

    emissiveIntensity: 0.035,

    atmosphere: "#6286ff",

    atmosphereOpacity: 0.095,

  },

};



function styleForEntity(entity: SpaceEntity): BodyVisualStyle {

  return BODY_STYLES[entity.id.toLowerCase()] ?? DEFAULT_STYLE;

}



function entityRadiusMeters(entity: SpaceEntity): number {

  const radius = entity.physical?.radiusM?.value;



  if (radius !== undefined && Number.isFinite(radius) && radius > 0) {

    return radius;

  }



  return 1;

}



function minimumMarkerRadius(entity: SpaceEntity): number {

  const style = styleForEntity(entity);



  if (entity.kind === "star") {

    return Math.max(style.minimumRadius, 0.7);

  }



  return style.minimumRadius;

}



function entitySceneRadius(

  entity: SpaceEntity,

  metersPerSceneUnit: number,

): number {

  const physical =

    entityRadiusMeters(entity) /

    positiveFinite(metersPerSceneUnit, 1);



  const minimum = minimumMarkerRadius(entity);



  return clamp(

    Math.max(physical, minimum),

    minimum,

    100_000,

  );

}



function spatialMeters(spatial: SpatialPosition): Vec3 {

  const multiplier = METERS_PER_UNIT[spatial.unit];



  return [

    spatial.position[0] * multiplier,

    spatial.position[1] * multiplier,

    spatial.position[2] * multiplier,

  ];

}



export interface RendererStats {

  drawCalls: number;

  triangles: number;

  points: number;

  lines: number;

  objects: number;

  sceneObjects: number;

  frameMs: number;

  visibleEntities: number;

  backend: string;

}



export const rendererInfo = {

  backend: "three",

  revision: REVISION,

} as const;



export interface FrameTransformContext {

  entity: SpaceEntity;

  state: UniverseState;

  fromFrameId: FrameId;

  toFrameId: FrameId;

  sourceUnit: DistanceUnit;

  positionMeters: Vec3;

}



export interface FrameTransformProvider {

  transform(context: FrameTransformContext): Vec3 | null;

}



export class FrameSpace {

  private provider: FrameTransformProvider | null;



  constructor(provider: FrameTransformProvider | null = null) {

    this.provider = provider;

  }



  setTransformProvider(provider: FrameTransformProvider | null): void {

    this.provider = provider;

  }



  resolve(

    entity: SpaceEntity,

    state: UniverseState,

  ): Vector3 | null {

    const spatial = entity.spatial;



    if (!spatial) {

      return null;

    }



    let meters = spatialMeters(spatial);



    if (spatial.frameId !== state.scale.frameId) {

      if (!this.provider) {

        return null;

      }



      const transformed = this.provider.transform({

        entity,

        state,

        fromFrameId: spatial.frameId,

        toFrameId: state.scale.frameId,

        sourceUnit: spatial.unit,

        positionMeters: meters,

      });



      if (!transformed) {

        return null;

      }



      meters = transformed;

    }



    if (!meters.every((value) => Number.isFinite(value))) {

      return null;

    }



    const divisor = positiveFinite(

      state.scale.metersPerUnit,

      1,

    );



    return new Vector3(

      meters[0] / divisor,

      meters[1] / divisor,

      meters[2] / divisor,

    );

  }

}



export class FloatingOrigin {

  private readonly value = new Vector3();



  set(value: Vec3 | Vector3): void {

    if (value instanceof Vector3) {

      this.value.copy(value);

      return;

    }



    this.value.set(

      value[0],

      value[1],

      value[2],

    );

  }



  get origin(): Vector3 {

    return this.value.clone();

  }



  toLocal(

    absolute: Vector3,

    target = new Vector3(),

  ): Vector3 {

    return target

      .copy(absolute)

      .sub(this.value);

  }

}



function textureCanvas(): HTMLCanvasElement {

  const canvas = document.createElement("canvas");



  canvas.width = 1024;

  canvas.height = 512;



  return canvas;

}



function createRockTexture(

  entity: SpaceEntity,

  style: BodyVisualStyle,

): CanvasTexture {

  const canvas = textureCanvas();

  const context = canvas.getContext("2d");



  if (!context) {

    throw new Error("2D canvas context unavailable.");

  }



  context.fillStyle = style.base;

  context.fillRect(

    0,

    0,

    canvas.width,

    canvas.height,

  );



  const random = new SeededRandom(

    hashString(entity.id),

  );



  for (let index = 0; index < 850; index++) {

    const x = random.range(0, canvas.width);

    const y = random.range(0, canvas.height);

    const radius = random.range(1, 18);

    const alpha = random.range(0.015, 0.12);



    context.globalAlpha = alpha;



    context.fillStyle =

      random.next() > 0.52

        ? style.secondary

        : style.accent;



    context.beginPath();



    context.ellipse(

      x,

      y,

      radius * random.range(0.6, 1.8),

      radius,

      random.range(0, Math.PI),

      0,

      Math.PI * 2,

    );



    context.fill();

  }



  context.globalAlpha = 1;



  const texture = new CanvasTexture(canvas);



  texture.colorSpace = SRGBColorSpace;

  texture.wrapS = RepeatWrapping;

  texture.needsUpdate = true;



  return texture;

}



function createEarthTexture(

  entity: SpaceEntity,

  style: BodyVisualStyle,

): CanvasTexture {

  const canvas = textureCanvas();

  const context = canvas.getContext("2d");



  if (!context) {

    throw new Error("2D canvas context unavailable.");

  }



  context.fillStyle = style.base;



  context.fillRect(

    0,

    0,

    canvas.width,

    canvas.height,

  );



  const random = new SeededRandom(

    hashString(entity.id),

  );



  for (let index = 0; index < 95; index++) {

    const x = random.range(

      -100,

      canvas.width + 100,

    );



    const y = random.range(

      35,

      canvas.height - 35,

    );



    const radius = random.range(10, 65);



    context.globalAlpha = random.range(

      0.35,

      0.88,

    );



    context.fillStyle =

      random.next() > 0.35

        ? style.secondary

        : style.accent;



    context.beginPath();



    context.ellipse(

      x,

      y,

      radius * random.range(1.2, 2.8),

      radius * random.range(0.45, 1.1),

      random.range(-0.8, 0.8),

      0,

      Math.PI * 2,

    );



    context.fill();

  }



  context.globalAlpha = 0.18;

  context.fillStyle = "#ffffff";



  for (let index = 0; index < 70; index++) {

    const x = random.range(

      0,

      canvas.width,

    );



    const y = random.range(

      0,

      canvas.height,

    );



    context.beginPath();



    context.ellipse(

      x,

      y,

      random.range(18, 80),

      random.range(2, 9),

      random.range(-0.2, 0.2),

      0,

      Math.PI * 2,

    );



    context.fill();

  }



  context.globalAlpha = 1;



  const texture = new CanvasTexture(canvas);



  texture.colorSpace = SRGBColorSpace;

  texture.wrapS = RepeatWrapping;

  texture.needsUpdate = true;



  return texture;

}



function createGasTexture(

  entity: SpaceEntity,

  style: BodyVisualStyle,

): CanvasTexture {

  const canvas = textureCanvas();

  const context = canvas.getContext("2d");



  if (!context) {

    throw new Error("2D canvas context unavailable.");

  }



  const random = new SeededRandom(

    hashString(entity.id),

  );



  context.fillStyle = style.base;



  context.fillRect(

    0,

    0,

    canvas.width,

    canvas.height,

  );



  let y = 0;



  while (y < canvas.height) {

    const height = random.range(5, 27);



    context.globalAlpha = random.range(

      0.14,

      0.72,

    );



    context.fillStyle =

      random.next() > 0.5

        ? style.secondary

        : style.accent;



    context.fillRect(

      0,

      y,

      canvas.width,

      height,

    );



    y += height;

  }



  if (entity.id === "jupiter") {

    context.globalAlpha = 0.7;

    context.fillStyle = "#b76447";



    context.beginPath();



    context.ellipse(

      745,

      315,

      82,

      29,

      -0.08,

      0,

      Math.PI * 2,

    );



    context.fill();

  }



  context.globalAlpha = 1;



  const texture = new CanvasTexture(canvas);



  texture.colorSpace = SRGBColorSpace;

  texture.wrapS = RepeatWrapping;

  texture.needsUpdate = true;



  return texture;

}



function createSunTexture(

  entity: SpaceEntity,

  style: BodyVisualStyle,

): CanvasTexture {

  const canvas = textureCanvas();

  const context = canvas.getContext("2d");



  if (!context) {

    throw new Error("2D canvas context unavailable.");

  }



  context.fillStyle = style.base;



  context.fillRect(

    0,

    0,

    canvas.width,

    canvas.height,

  );



  const random = new SeededRandom(

    hashString(entity.id),

  );



  for (let index = 0; index < 1500; index++) {

    context.globalAlpha = random.range(

      0.02,

      0.22,

    );



    context.fillStyle =

      random.next() > 0.5

        ? style.secondary

        : style.accent;



    const x = random.range(

      0,

      canvas.width,

    );



    const y = random.range(

      0,

      canvas.height,

    );



    const radius = random.range(2, 22);



    context.beginPath();



    context.arc(

      x,

      y,

      radius,

      0,

      Math.PI * 2,

    );



    context.fill();

  }



  context.globalAlpha = 1;



  const texture = new CanvasTexture(canvas);



  texture.colorSpace = SRGBColorSpace;

  texture.wrapS = RepeatWrapping;

  texture.needsUpdate = true;



  return texture;

}



function createEntityTexture(

  entity: SpaceEntity,

  style: BodyVisualStyle,

): CanvasTexture {

  switch (entity.id.toLowerCase()) {

    case "earth":

      return createEarthTexture(

        entity,

        style,

      );



    case "jupiter":

    case "saturn":

    case "uranus":

    case "neptune":

    case "venus":

      return createGasTexture(

        entity,

        style,

      );



    case "sun":

      return createSunTexture(

        entity,

        style,

      );



    default:

      return createRockTexture(

        entity,

        style,

      );

  }

}



interface EntitySceneEntry {

  id: EntityId;

  entity: SpaceEntity;

  root: Group;

  body: Mesh;

  position: Vector3;

  radius: number;

  pickables: Mesh[];

  texture: CanvasTexture | null;

  atmosphere: Mesh | null;

  rings: Mesh | null;

  label: HTMLDivElement | null;

}



export class EntitySceneIndex {

  private readonly entries =

    new Map<EntityId, EntitySceneEntry>();



  get(id: EntityId): EntitySceneEntry | undefined {

    return this.entries.get(id);

  }



  set(entry: EntitySceneEntry): void {

    this.entries.set(

      entry.id,

      entry,

    );

  }



  delete(id: EntityId): boolean {

    return this.entries.delete(id);

  }



  clear(): void {

    this.entries.clear();

  }



  getPosition(

    id: EntityId,

  ): Vector3 | undefined {

    return this.entries.get(id)?.position;

  }



  values(): IterableIterator<EntitySceneEntry> {

    return this.entries.values();

  }



  keys(): IterableIterator<EntityId> {

    return this.entries.keys();

  }



  get size(): number {

    return this.entries.size;

  }

}



export class PickingController {

  enabled = true;



  private readonly raycaster =

    new Raycaster();



  private readonly pointer =

    new Vector2();



  private camera:

    PerspectiveCamera | null = null;



  private canvas:

    HTMLCanvasElement | null = null;



  private index:

    EntitySceneIndex | null = null;



  configure(

    camera: PerspectiveCamera,

    canvas: HTMLCanvasElement,

    index: EntitySceneIndex,

  ): void {

    this.camera = camera;

    this.canvas = canvas;

    this.index = index;

  }



  pick(

    clientX: number,

    clientY: number,

  ): EntityId | undefined {

    if (

      !this.enabled ||

      !this.camera ||

      !this.canvas ||

      !this.index

    ) {

      return undefined;

    }



    const bounds =

      this.canvas.getBoundingClientRect();



    if (

      bounds.width <= 0 ||

      bounds.height <= 0

    ) {

      return undefined;

    }



    this.pointer.set(

      ((clientX - bounds.left) /

        bounds.width) *

        2 -

        1,



      -(

        ((clientY - bounds.top) /

          bounds.height) *

          2 -

          1

      ),

    );



    this.raycaster.setFromCamera(

      this.pointer,

      this.camera,

    );



    const meshes: Mesh[] = [];



    for (const entry of this.index.values()) {

      meshes.push(

        ...entry.pickables,

      );

    }



    const hits =

      this.raycaster.intersectObjects(

        meshes,

        false,

      );



    for (const hit of hits) {

      const id =

        hit.object.userData[

          "entityId"

        ];



      if (typeof id === "string") {

        return id;

      }

    }



    return undefined;

  }



  dispose(): void {

    this.camera = null;

    this.canvas = null;

    this.index = null;

  }

}



export class PackedPointLayer {

  readonly geometry =

    new BufferGeometry();



  readonly material: PointsMaterial;



  readonly object:

    Points<

      BufferGeometry,

      PointsMaterial

    >;



  constructor(size = 1) {

    this.material =

      new PointsMaterial({

        color: 0xffffff,

        size,

        sizeAttenuation: false,

        transparent: true,

        opacity: 0.8,

        depthWrite: false,

      });



    this.object =

      new Points(

        this.geometry,

        this.material,

      );

  }



  replace(

    positions: Float32Array,

  ): void {

    const previous =

      this.geometry.getAttribute(

        "position",

      );



    this.geometry.setAttribute(

      "position",

      new BufferAttribute(

        positions,

        3,

      ),

    );



    if (previous) {

      previous.needsUpdate = false;

    }



    this.geometry.computeBoundingSphere();

  }



  setOpacity(

    value: number,

  ): void {

    this.material.opacity =

      clamp(value, 0, 1);

  }



  dispose(): void {

    this.object.removeFromParent();

    this.geometry.dispose();

    this.material.dispose();

  }

}



interface OrbitEntry {

  line: LineLoop;

  signature: string;

}



function orbitSignature(

  entity: SpaceEntity,

  metersPerUnit: number,

): string {

  const orbit = entity.orbit;



  if (!orbit) {

    return "";

  }



  return [

    orbit.semiMajorAxisM ?? "",

    orbit.eccentricity ?? "",

    orbit.inclinationDeg ?? "",

    orbit.longitudeAscendingNodeDeg ?? "",

    orbit.argumentPeriapsisDeg ?? "",

    metersPerUnit,

  ].join(":");

}



function createOrbitGeometry(

  entity: SpaceEntity,

  metersPerUnit: number,

): BufferGeometry | null {

  const orbit = entity.orbit;



  const semiMajorMeters =

    orbit?.semiMajorAxisM;



  if (

    orbit === undefined ||

    semiMajorMeters === undefined ||

    !Number.isFinite(

      semiMajorMeters,

    ) ||

    semiMajorMeters <= 0

  ) {

    return null;

  }



  const semiMajor =

    semiMajorMeters /

    positiveFinite(

      metersPerUnit,

      1,

    );



  const eccentricity = clamp(

    orbit.eccentricity ?? 0,

    0,

    0.999999,

  );



  const semiMinor =

    semiMajor *

    Math.sqrt(

      1 -

        eccentricity *

          eccentricity,

    );



  const inclination =

    degreesToRadians(

      orbit.inclinationDeg,

    );



  const node =

    degreesToRadians(

      orbit.longitudeAscendingNodeDeg,

    );



  const periapsis =

    degreesToRadians(

      orbit.argumentPeriapsisDeg,

    );



  const samples = 180;



  const positions =

    new Float32Array(

      samples * 3,

    );



  for (

    let index = 0;

    index < samples;

    index++

  ) {

    const angle =

      (index / samples) *

      Math.PI *

      2;



    const orbitalX =

      semiMajor *

      (Math.cos(angle) -

        eccentricity);



    const orbitalY =

      semiMinor *

      Math.sin(angle);



    const pX =

      Math.cos(periapsis) *

        orbitalX -

      Math.sin(periapsis) *

        orbitalY;



    const pY =

      Math.sin(periapsis) *

        orbitalX +

      Math.cos(periapsis) *

        orbitalY;



    const x =

      Math.cos(node) *

        pX -

      Math.sin(node) *

        Math.cos(inclination) *

        pY;



    const y =

      Math.sin(node) *

        pX +

      Math.cos(node) *

        Math.cos(inclination) *

        pY;



    const z =

      Math.sin(inclination) *

      pY;



    const offset =

      index * 3;



    positions[offset] = x;

    positions[offset + 1] = y;

    positions[offset + 2] = z;

  }



  const geometry =

    new BufferGeometry();



  geometry.setAttribute(

    "position",

    new BufferAttribute(

      positions,

      3,

    ),

  );



  return geometry;

}



function createStarfield(

  count: number,

): Points {

  const positions =

    new Float32Array(

      count * 3,

    );



  const random =

    new SeededRandom(

      0x51a2cc91,

    );



  for (

    let index = 0;

    index < count;

    index++

  ) {

    const radius =

      random.range(

        650,

        2_200,

      );



    const theta =

      random.range(

        0,

        Math.PI * 2,

      );



    const u =

      random.range(-1, 1);



    const planar =

      Math.sqrt(

        1 - u * u,

      );



    const offset =

      index * 3;



    positions[offset] =

      radius *

      planar *

      Math.cos(theta);



    positions[offset + 1] =

      radius *

      planar *

      Math.sin(theta);



    positions[offset + 2] =

      radius * u;

  }



  const geometry =

    new BufferGeometry();



  geometry.setAttribute(

    "position",

    new BufferAttribute(

      positions,

      3,

    ),

  );



  const material =

    new PointsMaterial({

      color: 0xdceaff,

      size: 1.25,

      sizeAttenuation: false,

      transparent: true,

      opacity: 0.68,

      depthWrite: false,

    });



  const points =

    new Points(

      geometry,

      material,

    );



  points.name =

    "background-starfield";



  points.frustumCulled = false;



  return points;

}



function disposeMaterial(

  material: Material | Material[],

): void {

  if (Array.isArray(material)) {

    for (const item of material) {

      item.dispose();

    }



    return;

  }



  material.dispose();

}



export interface ThreeUniverseRendererOptions {

  background?: number;

  antialias?: boolean;

  alpha?: boolean;

  detailedObjectLimit?: number;

  starCount?: number;

  frameTransformProvider?: FrameTransformProvider;

}



export class ThreeUniverseRenderer

  implements UniverseRenderer

{

  readonly name =

    "UNIVERSE Cinematic Three Renderer";



  readonly stats: RendererStats = {

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



  readonly frameSpace: FrameSpace;



  readonly index =

    new EntitySceneIndex();



  readonly picking =

    new PickingController();



  readonly worldRoot =

    new Group();



  readonly entityRoot =

    new Group();



  readonly orbitRoot =

    new Group();



  private readonly orbitEntries =

    new Map<EntityId, OrbitEntry>();



  private readonly sphere =

    new SphereGeometry(

      1,

      64,

      40,

    );



  private rendererValue:

    WebGLRenderer | null = null;



  private cameraValue:

    PerspectiveCamera | null = null;



  private sceneValue:

    Scene | null = null;



  private starfield:

    Points | null = null;



  private ambientLight:

    AmbientLight | null = null;



  private sunLight:

    PointLight | null = null;



  private labelLayer:

    HTMLDivElement | null = null;



  private container:

    HTMLElement | null = null;



  private readonly background: number;

  private readonly antialias: boolean;

  private readonly alpha: boolean;

  private readonly objectLimit: number;

  private readonly starCount: number;



  constructor(

    options: ThreeUniverseRendererOptions = {},

  ) {

    this.background =

      options.background ??

      0x071a36;



    this.antialias =

      options.antialias ??

      true;



    this.alpha =

      options.alpha ??

      false;



    this.objectLimit =

      Math.max(

        100,

        Math.floor(

          options.detailedObjectLimit ??

            20_000,

        ),

      );



    this.starCount =

      Math.max(

        500,

        Math.floor(

          options.starCount ??

            4_000,

        ),

      );



    this.frameSpace =

      new FrameSpace(

        options.frameTransformProvider ??

          null,

      );



    this.worldRoot.name =

      "universe-world";



    this.entityRoot.name =

      "universe-entities";



    this.orbitRoot.name =

      "universe-orbits";



    this.worldRoot.add(

      this.orbitRoot,

    );



    this.worldRoot.add(

      this.entityRoot,

    );

  }



  async initialize(

    container: HTMLElement,

  ): Promise<void> {

    if (this.rendererValue) {

      throw new Error(

        "Renderer already initialized.",

      );

    }



    this.container =

      container;



    const style =

      window.getComputedStyle(

        container,

      );



    if (

      style.position === "static"

    ) {

      container.style.position =

        "relative";

    }



    const renderer =

      new WebGLRenderer({

        antialias:

          this.antialias,



        alpha: this.alpha,



        logarithmicDepthBuffer:

          true,



        powerPreference:

          "high-performance",

      });



    renderer.outputColorSpace =

      SRGBColorSpace;



    renderer.domElement.style.display =

      "block";



    renderer.domElement.style.width =

      "100%";



    renderer.domElement.style.height =

      "100%";



    renderer.domElement.style.touchAction =

      "none";



    renderer.domElement.style.outline =

      "none";



    const scene =

      new Scene();



    if (!this.alpha) {

      scene.background =

        new Color(

          this.background,

        );

    }



    const camera =

      new PerspectiveCamera(

        52,

        1,

        0.001,

        10_000,

      );



    camera.position.set(

      40,

      24,

      70,

    );



    const starfield =

      createStarfield(

        this.starCount,

      );



    scene.add(starfield);



    const ambient =

      new AmbientLight(

        0xa7c7ff,

        0.43,

      );



    scene.add(ambient);



    const sunLight =

      new PointLight(

        0xffd0a0,

        5.2,

        0,

        0,

      );



    scene.add(sunLight);



    scene.add(

      this.worldRoot,

    );



    container.appendChild(

      renderer.domElement,

    );



    const labelLayer =

      document.createElement(

        "div",

      );



    labelLayer.className =

      "universe-render-label-layer";



    Object.assign(

      labelLayer.style,

      {

        position: "absolute",

        inset: "0",

        pointerEvents: "none",

        overflow: "hidden",

        zIndex: "5",

      },

    );



    container.appendChild(

      labelLayer,

    );



    this.rendererValue =

      renderer;



    this.cameraValue =

      camera;



    this.sceneValue =

      scene;



    this.starfield =

      starfield;



    this.ambientLight =

      ambient;



    this.sunLight =

      sunLight;



    this.labelLayer =

      labelLayer;



    this.picking.configure(

      camera,

      renderer.domElement,

      this.index,

    );



    this.resize(

      Math.max(

        1,

        container.clientWidth,

      ),



      Math.max(

        1,

        container.clientHeight,

      ),



      window.devicePixelRatio ||

        1,

    );

  }



  private requireRenderer():

    WebGLRenderer {

    if (!this.rendererValue) {

      throw new Error(

        "Renderer has not been initialized.",

      );

    }



    return this.rendererValue;

  }



  private requireScene():

    Scene {

    if (!this.sceneValue) {

      throw new Error(

        "Renderer has not been initialized.",

      );

    }



    return this.sceneValue;

  }



  private requireCamera():

    PerspectiveCamera {

    if (!this.cameraValue) {

      throw new Error(

        "Renderer has not been initialized.",

      );

    }



    return this.cameraValue;

  }



  private desiredIds(

    frame: RenderFrame,

  ): Set<EntityId> {

    const ids =

      new Set<EntityId>();



    const state =

      frame.state;



    if (

      state.focusId &&

      state.entities.has(

        state.focusId,

      )

    ) {

      ids.add(

        state.focusId,

      );

    }



    if (

      state.selectedId &&

      state.entities.has(

        state.selectedId,

      )

    ) {

      ids.add(

        state.selectedId,

      );

    }



    for (

      const id of frame.visibleEntityIds

    ) {

      if (

        ids.size >=

        this.objectLimit

      ) {

        break;

      }



      if (

        state.entities.has(id)

      ) {

        ids.add(id);

      }

    }



    return ids;

  }



  private createAtmosphere(

    entry: EntitySceneEntry,

    style: BodyVisualStyle,

  ): void {

    if (

      !style.atmosphere ||

      style.atmosphereOpacity <= 0

    ) {

      return;

    }



    const material =

      new MeshBasicMaterial({

        color:

          style.atmosphere,



        transparent: true,



        opacity:

          style.atmosphereOpacity,



        side: BackSide,



        depthWrite: false,



        blending:

          AdditiveBlending,

      });



    const atmosphere =

      new Mesh(

        this.sphere,

        material,

      );



    atmosphere.scale.setScalar(

      1.075,

    );



    entry.root.add(

      atmosphere,

    );



    entry.atmosphere =

      atmosphere;

  }



  private createSaturnRings(

    entry: EntitySceneEntry,

  ): void {

    if (

      entry.entity.id !==

      "saturn"

    ) {

      return;

    }



    const geometry =

      new RingGeometry(

        1.35,

        2.35,

        128,

        4,

      );



    const material =

      new MeshBasicMaterial({

        color: 0xd7c39b,

        transparent: true,

        opacity: 0.55,

        side: DoubleSide,

        depthWrite: false,

      });



    const rings =

      new Mesh(

        geometry,

        material,

      );



    rings.rotation.x =

      0.46;



    rings.rotation.y =

      -0.18;



    entry.root.add(rings);



    entry.rings = rings;

  }



  private createSunGlow(

    entry: EntitySceneEntry,

  ): void {

    if (

      entry.entity.id !==

      "sun"

    ) {

      return;

    }



    const inner =

      new Mesh(

        this.sphere,

        new MeshBasicMaterial({

          color: 0xffb85c,

          transparent: true,

          opacity: 0.16,

          depthWrite: false,

          blending:

            AdditiveBlending,

          side: BackSide,

        }),

      );



    inner.scale.setScalar(

      1.19,

    );



    entry.root.add(inner);



    const outer =

      new Mesh(

        this.sphere,

        new MeshBasicMaterial({

          color: 0xff7b45,

          transparent: true,

          opacity: 0.07,

          depthWrite: false,

          blending:

            AdditiveBlending,

          side: BackSide,

        }),

      );



    outer.scale.setScalar(

      1.48,

    );



    entry.root.add(outer);

  }



  private createLabel(

    entity: SpaceEntity,

  ): HTMLDivElement | null {

    const layer =

      this.labelLayer;



    if (!layer) {

      return null;

    }



    const label =

      document.createElement(

        "div",

      );



    label.dataset[

      "entityId"

    ] = entity.id;



    Object.assign(

      label.style,

      {

        position: "absolute",



        transform:

          "translate(-50%, -50%)",



        color: "#f4f7ff",



        fontSize: "11px",



        fontWeight: "600",



        letterSpacing: "0.01em",



        whiteSpace: "nowrap",



        textShadow:

          "0 2px 8px rgba(0, 10, 30, 0.9)",



        opacity: "0",



        transition:

          "opacity 120ms ease",

      },

    );



    label.textContent =

      entity.name;



    layer.appendChild(label);



    return label;

  }



  private createEntry(

    entity: SpaceEntity,

    position: Vector3,

    radius: number,

  ): EntitySceneEntry {

    const style =

      styleForEntity(entity);



    const texture =

      createEntityTexture(

        entity,

        style,

      );



    let bodyMaterial: Material;



    if (

      entity.id === "sun"

    ) {

      bodyMaterial =

        new MeshBasicMaterial({

          map: texture,

          color: style.base,

        });

    } else {

      bodyMaterial =

        new MeshStandardMaterial({

          map: texture,

          color: 0xffffff,

          roughness:

            style.roughness,

          metalness: 0,

          emissive:

            new Color(

              style.emissive,

            ),

          emissiveIntensity:

            style.emissiveIntensity,

        });

    }



    const body =

      new Mesh(

        this.sphere,

        bodyMaterial,

      );



    body.userData[

      "entityId"

    ] = entity.id;



    body.userData[

      "entityKind"

    ] = entity.kind;



    const root =

      new Group();



    root.name =

      `entity:${entity.id}`;



    root.position.copy(

      position,

    );



    root.scale.setScalar(

      radius,

    );



    root.add(body);



    const entry:

      EntitySceneEntry = {

      id: entity.id,

      entity,

      root,

      body,

      position:

        position.clone(),

      radius,

      pickables: [body],

      texture,

      atmosphere: null,

      rings: null,

      label:

        this.createLabel(

          entity,

        ),

    };



    this.createAtmosphere(

      entry,

      style,

    );



    this.createSaturnRings(

      entry,

    );



    this.createSunGlow(

      entry,

    );



    this.entityRoot.add(

      root,

    );



    this.index.set(

      entry,

    );



    return entry;

  }



  private removeEntry(

    id: EntityId,

  ): void {

    const entry =

      this.index.get(id);



    if (!entry) {

      return;

    }



    entry.root.traverse(

      (object) => {

        if (

          object instanceof Mesh

        ) {

          disposeMaterial(

            object.material,

          );



          if (

            object.geometry !==

            this.sphere

          ) {

            object.geometry.dispose();

          }

        }

      },

    );



    entry.texture?.dispose();



    entry.label?.remove();



    entry.root.removeFromParent();



    this.index.delete(id);

  }



  private syncEntities(

    frame: RenderFrame,

  ): void {

    const desired =

      this.desiredIds(frame);



    for (

      const id of [

        ...this.index.keys(),

      ]

    ) {

      if (

        !desired.has(id)

      ) {

        this.removeEntry(

          id,

        );

      }

    }



    const state =

      frame.state;



    for (

      const id of desired

    ) {

      const entity =

        state.entities.get(id);



      if (!entity) {

        continue;

      }



      const position =

        this.frameSpace.resolve(

          entity,

          state,

        );



      if (!position) {

        this.removeEntry(

          id,

        );



        continue;

      }



      const radius =

        entitySceneRadius(

          entity,

          state.scale

            .metersPerUnit,

        );



      let entry =

        this.index.get(id);



      if (!entry) {

        entry =

          this.createEntry(

            entity,

            position,

            radius,

          );

      }



      entry.entity =

        entity;



      entry.position.copy(

        position,

      );



      entry.radius =

        radius;



      entry.root.position.copy(

        position,

      );



      const selected =

        state.selectedId ===

        entity.id;



      const focused =

        state.focusId ===

        entity.id;



      const multiplier =

        focused

          ? 1.13

          : selected

            ? 1.075

            : 1;



      entry.root.scale.setScalar(

        radius *

          multiplier,

      );



      entry.body.rotation.y +=

        frame.deltaSeconds *

        (

          entity.id ===

          "jupiter"

            ? 0.12

            : 0.045

        );

    }



    const sun =

      this.index.get(

        "sun",

      );



    if (

      sun &&

      this.sunLight

    ) {

      this.sunLight.position.copy(

        sun.position,

      );

    }

  }



  private removeOrbit(

    id: EntityId,

  ): void {

    const entry =

      this.orbitEntries.get(

        id,

      );



    if (!entry) {

      return;

    }



    entry.line.geometry.dispose();



    disposeMaterial(

      entry.line.material,

    );



    entry.line.removeFromParent();



    this.orbitEntries.delete(

      id,

    );

  }



  private syncOrbits(

    frame: RenderFrame,

  ): void {

    const state =

      frame.state;



    if (

      !state.overlays.orbits ||

      !state.settings.graphics

        .orbitLines

    ) {

      for (

        const id of [

          ...this.orbitEntries.keys(),

        ]

      ) {

        this.removeOrbit(

          id,

        );

      }



      return;

    }



    const desired =

      new Set<EntityId>();



    for (

      const entityEntry of

        this.index.values()

    ) {

      const entity =

        entityEntry.entity;



      if (

        !entity.orbit ||

        !entity.parentId

      ) {

        continue;

      }



      const parent =

        this.index.getPosition(

          entity.parentId,

        );



      if (!parent) {

        continue;

      }



      const signature =

        orbitSignature(

          entity,

          state.scale

            .metersPerUnit,

        );



      let orbit =

        this.orbitEntries.get(

          entity.id,

        );



      if (

        !orbit ||

        orbit.signature !==

          signature

      ) {

        if (orbit) {

          this.removeOrbit(

            entity.id,

          );

        }



        const geometry =

          createOrbitGeometry(

            entity,

            state.scale

              .metersPerUnit,

          );



        if (!geometry) {

          continue;

        }



        const selected =

          state.selectedId ===

            entity.id ||

          state.focusId ===

            entity.id;



        const material =

          new LineBasicMaterial({

            color: selected

              ? 0x9fe6ff

              : 0x7795bd,



            transparent: true,



            opacity: selected

              ? 0.42

              : 0.105,



            depthWrite: false,

          });



        const line =

          new LineLoop(

            geometry,

            material,

          );



        line.name =

          `orbit:${entity.id}`;



        this.orbitRoot.add(

          line,

        );



        orbit = {

          line,

          signature,

        };



        this.orbitEntries.set(

          entity.id,

          orbit,

        );

      }



      orbit.line.position.copy(

        parent,

      );



      const material =

        orbit.line.material;



      if (

        material instanceof

        LineBasicMaterial

      ) {

        const active =

          state.selectedId ===

            entity.id ||

          state.focusId ===

            entity.id;



        material.opacity =

          active

            ? 0.42

            : 0.105;



        material.color.setHex(

          active

            ? 0x9fe6ff

            : 0x7795bd,

        );

      }



      desired.add(

        entity.id,

      );

    }



    for (

      const id of [

        ...this.orbitEntries.keys(),

      ]

    ) {

      if (

        !desired.has(id)

      ) {

        this.removeOrbit(

          id,

        );

      }

    }

  }



  private syncCamera(

    frame: RenderFrame,

  ): void {

    const camera =

      this.requireCamera();



    const state =

      frame.state;



    camera.position.set(

      state.camera.position[0],

      state.camera.position[1],

      state.camera.position[2],

    );



    const fov =

      clamp(

        state.camera

          .fieldOfView,

        20,

        95,

      );



    if (

      camera.fov !== fov

    ) {

      camera.fov = fov;

      camera.updateProjectionMatrix();

    }



    const targetId =

      state.camera.targetId ??

      state.focusId;



    const target =

      targetId

        ? this.index.getPosition(

            targetId,

          )

        : undefined;



    if (target) {

      camera.lookAt(

        target,

      );

    } else {

      camera.lookAt(

        0,

        0,

        0,

      );

    }

  }



  private syncLabels(

    frame: RenderFrame,

  ): void {

    const camera =

      this.requireCamera();



    const container =

      this.container;



    if (!container) {

      return;

    }



    const width =

      Math.max(

        1,

        container.clientWidth,

      );



    const height =

      Math.max(

        1,

        container.clientHeight,

      );



    const labels =

      frame.state.overlays

        .labels;



    const occupied: {

      x: number;

      y: number;

    }[] = [];



    const entries =

      [

        ...this.index.values(),

      ].sort(

        (left, right) => {

          const leftPriority =

            (frame.state

              .selectedId ===

            left.id

              ? 100

              : 0) +

            (frame.state

              .focusId ===

            left.id

              ? 80

              : 0) +

            (left.id ===

            "sun"

              ? 20

              : 0);



          const rightPriority =

            (frame.state

              .selectedId ===

            right.id

              ? 100

              : 0) +

            (frame.state

              .focusId ===

            right.id

              ? 80

              : 0) +

            (right.id ===

            "sun"

              ? 20

              : 0);



          return (

            rightPriority -

            leftPriority

          );

        },

      );



    for (

      const entry of entries

    ) {

      const label =

        entry.label;



      if (!label) {

        continue;

      }



      if (!labels) {

        label.style.opacity =

          "0";



        continue;

      }



      const projected =

        entry.position

          .clone()

          .project(camera);



      const visible =

        projected.z > -1 &&

        projected.z < 1 &&

        Math.abs(

          projected.x,

        ) < 1.15 &&

        Math.abs(

          projected.y,

        ) < 1.15;



      if (!visible) {

        label.style.opacity =

          "0";



        continue;

      }



      const x =

        (projected.x *

          0.5 +

          0.5) *

        width;



      const y =

        (-projected.y *

          0.5 +

          0.5) *

        height;



      const important =

        frame.state

          .selectedId ===

          entry.id ||

        frame.state

          .focusId ===

          entry.id;



      const collision =

        occupied.some(

          (point) =>

            Math.abs(

              point.x - x,

            ) < 65 &&

            Math.abs(

              point.y - y,

            ) < 24,

        );



      if (

        collision &&

        !important

      ) {

        label.style.opacity =

          "0";



        continue;

      }



      occupied.push({

        x,

        y,

      });



      label.style.left =

        `${x}px`;



      label.style.top =

        `${

          y -

          entry.radius * 7 -

          10

        }px`;



      label.style.opacity =

        important

          ? "1"

          : "0.72";



      label.style.color =

        important

          ? "#ffffff"

          : "#d4e0f2";



      label.style.fontSize =

        important

          ? "12px"

          : "10px";

    }

  }



  private updateStats(

    milliseconds: number,

  ): void {

    const renderer =

      this.requireRenderer();



    const information =

      renderer.info.render;



    this.stats.drawCalls =

      information.calls;



    this.stats.triangles =

      information.triangles;



    this.stats.points =

      information.points;



    this.stats.lines =

      information.lines;



    this.stats.objects =

      this.index.size;



    this.stats.sceneObjects =

      this.index.size +

      this.orbitEntries.size +

      4;



    this.stats.frameMs =

      milliseconds;



    this.stats.visibleEntities =

      this.index.size;

  }



  render(

    frame: RenderFrame,

  ): void {

    const renderer =

      this.requireRenderer();



    const scene =

      this.requireScene();



    const camera =

      this.requireCamera();



    const started =

      performance.now();



    this.syncEntities(

      frame,

    );



    this.syncOrbits(

      frame,

    );



    this.syncCamera(

      frame,

    );



    this.syncLabels(

      frame,

    );



    renderer.render(

      scene,

      camera,

    );



    this.updateStats(

      performance.now() -

        started,

    );

  }



  resize(

    width: number,

    height: number,

    pixelRatio: number,

  ): void {

    const renderer =

      this.rendererValue;



    const camera =

      this.cameraValue;



    if (

      !renderer ||

      !camera

    ) {

      return;

    }



    const safeWidth =

      Math.max(

        1,

        Math.floor(width),

      );



    const safeHeight =

      Math.max(

        1,

        Math.floor(height),

      );



    renderer.setPixelRatio(

      clamp(

        pixelRatio,

        0.75,

        2,

      ),

    );



    renderer.setSize(

      safeWidth,

      safeHeight,

      false,

    );



    camera.aspect =

      safeWidth /

      safeHeight;



    camera.updateProjectionMatrix();

  }



  setFrameTransformProvider(

    provider:

      FrameTransformProvider |

      null,

  ): void {

    this.frameSpace.setTransformProvider(

      provider,

    );

  }



  getStats(): RendererStats {

    return {

      ...this.stats,

    };

  }



  get camera():

    PerspectiveCamera | null {

    return this.cameraValue;

  }



  get scene():

    Scene | null {

    return this.sceneValue;

  }



  get threeRenderer():

    WebGLRenderer | null {

    return this.rendererValue;

  }



  dispose(): void {

    for (

      const id of [

        ...this.index.keys(),

      ]

    ) {

      this.removeEntry(

        id,

      );

    }



    for (

      const id of [

        ...this.orbitEntries.keys(),

      ]

    ) {

      this.removeOrbit(

        id,

      );

    }



    this.picking.dispose();



    this.sphere.dispose();



    if (this.starfield) {

      this.starfield.geometry.dispose();



      disposeMaterial(

        this.starfield.material,

      );



      this.starfield.removeFromParent();



      this.starfield =

        null;

    }



    this.labelLayer?.remove();



    this.labelLayer =

      null;



    this.rendererValue

      ?.domElement.remove();



    this.rendererValue?.dispose();



    this.sceneValue?.clear();



    this.rendererValue =

      null;



    this.cameraValue =

      null;



    this.sceneValue =

      null;



    this.ambientLight =

      null;



    this.sunLight =

      null;



    this.container =

      null;

  }

}