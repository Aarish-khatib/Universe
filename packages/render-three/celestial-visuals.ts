import {
  AmbientLight,
  Color,
  Group,
  LineBasicMaterial,
  LineLoop,
  Material,
  Mesh,
  PerspectiveCamera,
  PointLight,
  Points,
  Raycaster,
  REVISION,
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

import {
  calculateCelestialDisplayRadius,
  celestialLabelPriority,
  createCelestialBodyVisuals,
  createCelestialStarfield,
  disposeCelestialBodyVisuals,
  disposeCelestialStarfield,
  updateCelestialVisualRotation,
  type CelestialBodyVisuals,
} from "../celestial-visuals";

export const RENDER_THREE_VERSION = 5;

/* ------------------------------------------------------------------ */
/*  Utilities                                                          */
/* ------------------------------------------------------------------ */

function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}

function positiveFinite(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return value;
}

function degreesToRadians(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 0;
  return (value * Math.PI) / 180;
}

function spatialMeters(spatial: SpatialPosition): Vec3 {
  const multiplier = METERS_PER_UNIT[spatial.unit];
  return [
    spatial.position[0] * multiplier,
    spatial.position[1] * multiplier,
    spatial.position[2] * multiplier,
  ];
}

function disposeMaterial(material: Material | Material[]): void {
  if (Array.isArray(material)) {
    for (const item of material) item.dispose();
  } else {
    material.dispose();
  }
}

/* ------------------------------------------------------------------ */
/*  Stats & frame transform                                            */
/* ------------------------------------------------------------------ */

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

  resolve(entity: SpaceEntity, state: UniverseState): Vector3 | null {
    const spatial = entity.spatial;
    if (!spatial) return null;

    let meters = spatialMeters(spatial);

    if (spatial.frameId !== state.scale.frameId) {
      if (!this.provider) return null;

      const transformed = this.provider.transform({
        entity,
        state,
        fromFrameId: spatial.frameId,
        toFrameId: state.scale.frameId,
        sourceUnit: spatial.unit,
        positionMeters: meters,
      });

      if (!transformed) return null;
      meters = transformed;
    }

    if (!meters.every((value) => Number.isFinite(value))) return null;

    const divisor = positiveFinite(state.scale.metersPerUnit, 1);

    return new Vector3(
      meters[0] / divisor,
      meters[1] / divisor,
      meters[2] / divisor,
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Entity scene index                                                 */
/* ------------------------------------------------------------------ */

interface EntitySceneEntry {
  id: EntityId;
  entity: SpaceEntity;
  root: Group;
  visuals: CelestialBodyVisuals;
  position: Vector3;
  radius: number;
  pickables: Mesh[];
  label: HTMLDivElement | null;
}

export class EntitySceneIndex {
  private readonly entries = new Map<EntityId, EntitySceneEntry>();

  get(id: EntityId): EntitySceneEntry | undefined {
    return this.entries.get(id);
  }

  set(entry: EntitySceneEntry): void {
    this.entries.set(entry.id, entry);
  }

  delete(id: EntityId): boolean {
    return this.entries.delete(id);
  }

  clear(): void {
    this.entries.clear();
  }

  getPosition(id: EntityId): Vector3 | undefined {
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

/* ------------------------------------------------------------------ */
/*  Picking                                                            */
/* ------------------------------------------------------------------ */

export class PickingController {
  enabled = true;

  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private camera: PerspectiveCamera | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private index: EntitySceneIndex | null = null;

  configure(
    camera: PerspectiveCamera,
    canvas: HTMLCanvasElement,
    index: EntitySceneIndex,
  ): void {
    this.camera = camera;
    this.canvas = canvas;
    this.index = index;
  }

  pick(clientX: number, clientY: number): EntityId | undefined {
    if (!this.enabled || !this.camera || !this.canvas || !this.index) {
      return undefined;
    }

    const bounds = this.canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return undefined;

    this.pointer.set(
      ((clientX - bounds.left) / bounds.width) * 2 - 1,
      -(((clientY - bounds.top) / bounds.height) * 2 - 1),
    );

    this.raycaster.setFromCamera(this.pointer, this.camera);

    const meshes: Mesh[] = [];
    for (const entry of this.index.values()) {
      meshes.push(...entry.pickables);
    }

    const hits = this.raycaster.intersectObjects(meshes, false);

    for (const hit of hits) {
      const id = hit.object.userData["entityId"];
      if (typeof id === "string") return id;
    }

    return undefined;
  }

  dispose(): void {
    this.camera = null;
    this.canvas = null;
    this.index = null;
  }
}

/* ------------------------------------------------------------------ */
/*  Orbit helpers                                                      */
/* ------------------------------------------------------------------ */

interface OrbitEntry {
  line: LineLoop;
  signature: string;
}

function orbitSignature(
  entity: SpaceEntity,
  metersPerUnit: number,
): string {
  const orbit = entity.orbit;
  if (!orbit) return "";

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
  const semiMajorMeters = orbit?.semiMajorAxisM;

  if (
    orbit === undefined ||
    semiMajorMeters === undefined ||
    !Number.isFinite(semiMajorMeters) ||
    semiMajorMeters <= 0
  ) {
    return null;
  }

  const semiMajor = semiMajorMeters / positiveFinite(metersPerUnit, 1);
  const eccentricity = clamp(orbit.eccentricity ?? 0, 0, 0.999999);
  const semiMinor = semiMajor * Math.sqrt(1 - eccentricity * eccentricity);

  const inclination = degreesToRadians(orbit.inclinationDeg);
  const node = degreesToRadians(orbit.longitudeAscendingNodeDeg);
  const periapsis = degreesToRadians(orbit.argumentPeriapsisDeg);

  const samples = 180;
  const positions = new Float32Array(samples * 3);

  for (let index = 0; index < samples; index++) {
    const angle = (index / samples) * Math.PI * 2;

    const orbitalX = semiMajor * (Math.cos(angle) - eccentricity);
    const orbitalY = semiMinor * Math.sin(angle);

    const pX =
      Math.cos(periapsis) * orbitalX - Math.sin(periapsis) * orbitalY;
    const pY =
      Math.sin(periapsis) * orbitalX + Math.cos(periapsis) * orbitalY;

    const x =
      Math.cos(node) * pX - Math.sin(node) * Math.cos(inclination) * pY;
    const y =
      Math.sin(node) * pX + Math.cos(node) * Math.cos(inclination) * pY;
    const z = Math.sin(inclination) * pY;

    const offset = index * 3;
    positions[offset] = x;
    positions[offset + 1] = y;
    positions[offset + 2] = z;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  return geometry;
}

/* ------------------------------------------------------------------ */
/*  Main renderer                                                      */
/* ------------------------------------------------------------------ */

export interface ThreeUniverseRendererOptions {
  background?: number;
  antialias?: boolean;
  alpha?: boolean;
  detailedObjectLimit?: number;
  starCount?: number;
  frameTransformProvider?: FrameTransformProvider | null;
}

export class ThreeUniverseRenderer implements UniverseRenderer {
  readonly name = "UNIVERSE Cinematic Three Renderer";

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
  readonly index = new EntitySceneIndex();
  readonly picking = new PickingController();

  readonly worldRoot = new Group();
  readonly entityRoot = new Group();
  readonly orbitRoot = new Group();

  private readonly orbitEntries = new Map<EntityId, OrbitEntry>();
  private readonly sphere = new SphereGeometry(1, 64, 40);

  private rendererValue: WebGLRenderer | null = null;
  private cameraValue: PerspectiveCamera | null = null;
  private sceneValue: Scene | null = null;
  private starfield: Points | null = null;
  private ambientLight: AmbientLight | null = null;
  private sunLight: PointLight | null = null;
  private labelLayer: HTMLDivElement | null = null;
  private container: HTMLElement | null = null;

  private readonly background: number;
  private readonly antialias: boolean;
  private readonly alpha: boolean;
  private readonly objectLimit: number;
  private readonly starCount: number;

  constructor(options: ThreeUniverseRendererOptions = {}) {
    this.background = options.background ?? 0x071a36;
    this.antialias = options.antialias ?? true;
    this.alpha = options.alpha ?? false;
    this.objectLimit = Math.max(
      100,
      Math.floor(options.detailedObjectLimit ?? 20_000),
    );
    this.starCount = Math.max(
      500,
      Math.floor(options.starCount ?? 4_000),
    );

    this.frameSpace = new FrameSpace(
      options.frameTransformProvider ?? null,
    );

    this.worldRoot.name = "universe-world";
    this.entityRoot.name = "universe-entities";
    this.orbitRoot.name = "universe-orbits";

    this.worldRoot.add(this.orbitRoot);
    this.worldRoot.add(this.entityRoot);
  }

  async initialize(container: HTMLElement): Promise<void> {
    if (this.rendererValue) {
      throw new Error("Renderer already initialized.");
    }

    this.container = container;

    const style = window.getComputedStyle(container);
    if (style.position === "static") {
      container.style.position = "relative";
    }

    const renderer = new WebGLRenderer({
      antialias: this.antialias,
      alpha: this.alpha,
      logarithmicDepthBuffer: true,
      powerPreference: "high-performance",
    });

    renderer.outputColorSpace = SRGBColorSpace;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.outline = "none";

    const scene = new Scene();
    if (!this.alpha) {
      scene.background = new Color(this.background);
    }

    const camera = new PerspectiveCamera(52, 1, 0.001, 10_000);
    camera.position.set(40, 24, 70);

    const starfield = createCelestialStarfield({
      count: this.starCount,
    });
    scene.add(starfield);

    const ambient = new AmbientLight(0xa7c7ff, 0.43);
    scene.add(ambient);

    const sunLight = new PointLight(0xffd0a0, 5.2, 0, 0);
    scene.add(sunLight);

    scene.add(this.worldRoot);

    container.appendChild(renderer.domElement);

    const labelLayer = document.createElement("div");
    labelLayer.className = "universe-render-label-layer";
    Object.assign(labelLayer.style, {
      position: "absolute",
      inset: "0",
      pointerEvents: "none",
      overflow: "hidden",
      zIndex: "5",
    });
    container.appendChild(labelLayer);

    this.rendererValue = renderer;
    this.cameraValue = camera;
    this.sceneValue = scene;
    this.starfield = starfield;
    this.ambientLight = ambient;
    this.sunLight = sunLight;
    this.labelLayer = labelLayer;

    this.picking.configure(camera, renderer.domElement, this.index);

    this.resize(
      Math.max(1, container.clientWidth),
      Math.max(1, container.clientHeight),
      window.devicePixelRatio || 1,
    );
  }

  private requireRenderer(): WebGLRenderer {
    if (!this.rendererValue) {
      throw new Error("Renderer has not been initialized.");
    }
    return this.rendererValue;
  }

  private requireScene(): Scene {
    if (!this.sceneValue) {
      throw new Error("Renderer has not been initialized.");
    }
    return this.sceneValue;
  }

  private requireCamera(): PerspectiveCamera {
    if (!this.cameraValue) {
      throw new Error("Renderer has not been initialized.");
    }
    return this.cameraValue;
  }

  private desiredIds(frame: RenderFrame): Set<EntityId> {
    const ids = new Set<EntityId>();
    const state = frame.state;

    if (state.focusId && state.entities.has(state.focusId)) {
      ids.add(state.focusId);
    }

    if (state.selectedId && state.entities.has(state.selectedId)) {
      ids.add(state.selectedId);
    }

    for (const id of frame.visibleEntityIds) {
      if (ids.size >= this.objectLimit) break;
      if (state.entities.has(id)) ids.add(id);
    }

    return ids;
  }

  private createLabel(entity: SpaceEntity): HTMLDivElement | null {
    const layer = this.labelLayer;
    if (!layer) return null;

    const label = document.createElement("div");
    label.dataset["entityId"] = entity.id;

    Object.assign(label.style, {
      position: "absolute",
      transform: "translate(-50%, -50%)",
      color: "#f4f7ff",
      fontSize: "11px",
      fontWeight: "600",
      letterSpacing: "0.01em",
      whiteSpace: "nowrap",
      textShadow: "0 2px 8px rgba(0, 10, 30, 0.9)",
      opacity: "0",
      transition: "opacity 120ms ease",
    });

    label.textContent = entity.name;
    layer.appendChild(label);
    return label;
  }

  private createEntry(
    entity: SpaceEntity,
    position: Vector3,
    radius: number,
  ): EntitySceneEntry {
    const visuals = createCelestialBodyVisuals(entity, this.sphere);

    const root = new Group();
    root.name = `entity:${entity.id}`;
    root.position.copy(position);
    root.scale.setScalar(radius);

    root.add(visuals.body);
    if (visuals.atmosphere) root.add(visuals.atmosphere);
    if (visuals.clouds) root.add(visuals.clouds);
    if (visuals.rings) root.add(visuals.rings);
    if (visuals.glow) root.add(visuals.glow);

    const pickables: Mesh[] = [visuals.body];
    if (visuals.clouds) pickables.push(visuals.clouds);

    const entry: EntitySceneEntry = {
      id: entity.id,
      entity,
      root,
      visuals,
      position: position.clone(),
      radius,
      pickables,
      label: this.createLabel(entity),
    };

    this.entityRoot.add(root);
    this.index.set(entry);
    return entry;
  }

  private removeEntry(id: EntityId): void {
    const entry = this.index.get(id);
    if (!entry) return;

    disposeCelestialBodyVisuals(entry.visuals);
    entry.label?.remove();
    entry.root.removeFromParent();
    this.index.delete(id);
  }

  private syncEntities(frame: RenderFrame): void {
    const desired = this.desiredIds(frame);

    for (const id of [...this.index.keys()]) {
      if (!desired.has(id)) this.removeEntry(id);
    }

    const state = frame.state;

    for (const id of desired) {
      const entity = state.entities.get(id);
      if (!entity) continue;

      const position = this.frameSpace.resolve(entity, state);
      if (!position) {
        this.removeEntry(id);
        continue;
      }

      const radius = calculateCelestialDisplayRadius(
        entity,
        state.scale.metersPerUnit,
      );

      let entry = this.index.get(id);
      if (!entry) {
        entry = this.createEntry(entity, position, radius);
      }

      entry.entity = entity;
      entry.position.copy(position);
      entry.radius = radius;
      entry.root.position.copy(position);

      const selected = state.selectedId === entity.id;
      const focused = state.focusId === entity.id;
      const multiplier = focused ? 1.13 : selected ? 1.075 : 1;

      entry.root.scale.setScalar(radius * multiplier);

      updateCelestialVisualRotation(entry.visuals, frame.deltaSeconds);
    }

    const sun = this.index.get("sun");
    if (sun && this.sunLight) {
      this.sunLight.position.copy(sun.position);
    }
  }

  private removeOrbit(id: EntityId): void {
    const entry = this.orbitEntries.get(id);
    if (!entry) return;

    entry.line.geometry.dispose();
    disposeMaterial(entry.line.material);
    entry.line.removeFromParent();
    this.orbitEntries.delete(id);
  }

  private syncOrbits(frame: RenderFrame): void {
    const state = frame.state;

    if (!state.overlays.orbits || !state.settings.graphics.orbitLines) {
      for (const id of [...this.orbitEntries.keys()]) {
        this.removeOrbit(id);
      }
      return;
    }

    const desired = new Set<EntityId>();

    for (const entityEntry of this.index.values()) {
      const entity = entityEntry.entity;
      if (!entity.orbit || !entity.parentId) continue;

      const parent = this.index.getPosition(entity.parentId);
      if (!parent) continue;

      const signature = orbitSignature(
        entity,
        state.scale.metersPerUnit,
      );

      let orbit = this.orbitEntries.get(entity.id);

      if (!orbit || orbit.signature !== signature) {
        if (orbit) this.removeOrbit(entity.id);

        const geometry = createOrbitGeometry(
          entity,
          state.scale.metersPerUnit,
        );
        if (!geometry) continue;

        const selected =
          state.selectedId === entity.id || state.focusId === entity.id;

        const material = new LineBasicMaterial({
          color: selected ? 0x9fe6ff : 0x7795bd,
          transparent: true,
          opacity: selected ? 0.42 : 0.105,
          depthWrite: false,
        });

        const line = new LineLoop(geometry, material);
        line.name = `orbit:${entity.id}`;
        this.orbitRoot.add(line);

        orbit = { line, signature };
        this.orbitEntries.set(entity.id, orbit);
      }

      orbit.line.position.copy(parent);

      const material = orbit.line.material;
      if (material instanceof LineBasicMaterial) {
        const active =
          state.selectedId === entity.id || state.focusId === entity.id;
        material.opacity = active ? 0.42 : 0.105;
        material.color.setHex(active ? 0x9fe6ff : 0x7795bd);
      }

      desired.add(entity.id);
    }

    for (const id of [...this.orbitEntries.keys()]) {
      if (!desired.has(id)) this.removeOrbit(id);
    }
  }

  private syncCamera(frame: RenderFrame): void {
    const camera = this.requireCamera();
    const state = frame.state;

    camera.position.set(
      state.camera.position[0],
      state.camera.position[1],
      state.camera.position[2],
    );

    const fov = clamp(state.camera.fieldOfView, 20, 95);
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    const targetId = state.camera.targetId ?? state.focusId;
    const target = targetId
      ? this.index.getPosition(targetId)
      : undefined;

    if (target) {
      camera.lookAt(target);
    } else {
      camera.lookAt(0, 0, 0);
    }
  }

  private syncLabels(frame: RenderFrame): void {
    const camera = this.requireCamera();
    const container = this.container;
    if (!container) return;

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    const labels = frame.state.overlays.labels;

    const occupied: { x: number; y: number }[] = [];

    const entries = [...this.index.values()].sort((left, right) => {
      const leftPriority = celestialLabelPriority(
        left.entity,
        frame.state.selectedId === left.id,
        frame.state.focusId === left.id,
      );
      const rightPriority = celestialLabelPriority(
        right.entity,
        frame.state.selectedId === right.id,
        frame.state.focusId === right.id,
      );
      return rightPriority - leftPriority;
    });

    for (const entry of entries) {
      const label = entry.label;
      if (!label) continue;

      if (!labels) {
        label.style.opacity = "0";
        continue;
      }

      const projected = entry.position.clone().project(camera);

      const visible =
        projected.z > -1 &&
        projected.z < 1 &&
        Math.abs(projected.x) < 1.15 &&
        Math.abs(projected.y) < 1.15;

      if (!visible) {
        label.style.opacity = "0";
        continue;
      }

      const x = (projected.x * 0.5 + 0.5) * width;
      const y = (-projected.y * 0.5 + 0.5) * height;

      const important =
        frame.state.selectedId === entry.id ||
        frame.state.focusId === entry.id;

      const collision = occupied.some(
        (point) =>
          Math.abs(point.x - x) < 65 && Math.abs(point.y - y) < 24,
      );

      if (collision && !important) {
        label.style.opacity = "0";
        continue;
      }

      occupied.push({ x, y });

      label.style.left = `${x}px`;
      label.style.top = `${y - entry.radius * 7 - 10}px`;
      label.style.opacity = important ? "1" : "0.72";
      label.style.color = important ? "#ffffff" : "#d4e0f2";
      label.style.fontSize = important ? "12px" : "10px";
    }
  }

  private updateStats(milliseconds: number): void {
    const renderer = this.requireRenderer();
    const information = renderer.info.render;

    this.stats.drawCalls = information.calls;
    this.stats.triangles = information.triangles;
    this.stats.points = information.points;
    this.stats.lines = information.lines;
    this.stats.objects = this.index.size;
    this.stats.sceneObjects =
      this.index.size + this.orbitEntries.size + 4;
    this.stats.frameMs = milliseconds;
    this.stats.visibleEntities = this.index.size;
  }

  render(frame: RenderFrame): void {
    const renderer = this.requireRenderer();
    const scene = this.requireScene();
    const camera = this.requireCamera();

    const started = performance.now();

    this.syncEntities(frame);
    this.syncOrbits(frame);
    this.syncCamera(frame);
    this.syncLabels(frame);

    renderer.render(scene, camera);
    this.updateStats(performance.now() - started);
  }

  resize(width: number, height: number, pixelRatio: number): void {
    const renderer = this.rendererValue;
    const camera = this.cameraValue;
    if (!renderer || !camera) return;

    const safeWidth = Math.max(1, Math.floor(width));
    const safeHeight = Math.max(1, Math.floor(height));

    renderer.setPixelRatio(clamp(pixelRatio, 0.75, 2));
    renderer.setSize(safeWidth, safeHeight, false);
    camera.aspect = safeWidth / safeHeight;
    camera.updateProjectionMatrix();
  }

  setFrameTransformProvider(
    provider: FrameTransformProvider | null,
  ): void {
    this.frameSpace.setTransformProvider(provider);
  }

  getStats(): RendererStats {
    return { ...this.stats };
  }

  get camera(): PerspectiveCamera | null {
    return this.cameraValue;
  }

  get scene(): Scene | null {
    return this.sceneValue;
  }

  get threeRenderer(): WebGLRenderer | null {
    return this.rendererValue;
  }

  dispose(): void {
    for (const id of [...this.index.keys()]) {
      this.removeEntry(id);
    }

    for (const id of [...this.orbitEntries.keys()]) {
      this.removeOrbit(id);
    }

    this.picking.dispose();
    this.sphere.dispose();

    if (this.starfield) {
      disposeCelestialStarfield(this.starfield);
      this.starfield = null;
    }

    this.labelLayer?.remove();
    this.labelLayer = null;

    this.rendererValue?.domElement.remove();
    this.rendererValue?.dispose();
    this.sceneValue?.clear();

    this.rendererValue = null;
    this.cameraValue = null;
    this.sceneValue = null;
    this.ambientLight = null;
    this.sunLight = null;
    this.container = null;
  }
}