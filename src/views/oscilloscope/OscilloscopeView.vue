<script setup lang="ts">
import { onKeyStroke, useEventListener, useRafFn } from "@vueuse/core";
import type {
  Camera,
  CanvasTexture,
  Group,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { onBeforeUnmount, onMounted, ref, nextTick } from "vue";

import Copyright from "@/components/Copyright.vue";
import NavBar from "@/components/NavBar.vue";

// ============================================================
// Canvas refs (for 2D overlays: screen inset + U-t charts)
// ============================================================
const containerRef = ref<HTMLDivElement | null>(null);
const screenInsetRef = ref<HTMLCanvasElement | null>(null);
const utYYRef = ref<HTMLCanvasElement | null>(null);
const utXXRef = ref<HTMLCanvasElement | null>(null);

// ============================================================
// Lazy-load Three.js
// ============================================================
let THREE: typeof import("three") | null = null;
type OrbitControlsConstructor = new (camera: Camera, domElement: HTMLElement) => OrbitControls;
let OrbitControlsCtor: OrbitControlsConstructor | null = null;

const loadThree = async (): Promise<void> => {
  const [threeModule, orbitModule] = await Promise.all([
    import("three"),
    import("three/examples/jsm/controls/OrbitControls.js"),
  ]);
  THREE = threeModule;
  OrbitControlsCtor = orbitModule.OrbitControls as OrbitControlsConstructor;
};

// ============================================================
// Three.js objects
// ============================================================
let camera: PerspectiveCamera | null = null;
let orbit: OrbitControls | null = null;
let renderer: WebGLRenderer | null = null;
let scene: Scene | null = null;
let screenCtx: CanvasRenderingContext2D | null = null;
let screenPlane: Mesh | null = null;
let screenTexture: CanvasTexture | null = null;
let tubeMesh: Group | null = null;
let plateXX_left: Mesh | null = null;
let plateXX_right: Mesh | null = null;
let plateYY_bot: Mesh | null = null;
let plateYY_top: Mesh | null = null;
let beamGroup: Group | null = null;
const screenCanvasW = 512;
const screenCanvasH = 512;

// ============================================================
// Constants (from original)
// ============================================================
const ELECTRON_GUN_X = 15;
const XX_PLATE_END = 315;
const XX_PLATE_START = 200;
const YY_PLATE_END = 185;
const YY_PLATE_START = 70;
const SCREEN_X = 430;
const PLATE_GAP = 24;
const PLATE_WIDTH = 40;
const XX_DEFLECTION_SENSITIVITY = 0.163934;
const YY_DEFLECTION_SENSITIVITY = 0.101215;
const INITIAL_VELOCITY_X = 6;
const SPAWN_INTERVAL = 1;
const TRAIL_LENGTH = 24;
const SCAN_PERIOD = 180;
const SIGNAL_PERIOD = 180;

interface Section {
  x: number;
  halfWidth: number;
  halfHeight: number;
}
const SECTIONS: Section[] = [
  { x: 0, halfWidth: 15, halfHeight: 15 },
  { x: 60, halfWidth: 15, halfHeight: 15 },
  { x: 65, halfWidth: 46, halfHeight: 46 },
  { x: 325, halfWidth: 46, halfHeight: 46 },
  { x: 360, halfWidth: 100, halfHeight: 100 },
  { x: 430, halfWidth: 100, halfHeight: 100 },
];

interface EState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  birthPhase: number;
  sVy: number | null;
  sVx: number;
  trail: { x: number; y: number; z: number }[];
  alive: boolean;
}

interface Impact {
  y: number;
  z: number;
  age: number;
}

// ============================================================
// Physics state (Adjustable parameters)
// ============================================================
const persistence = ref(90);
const persistenceVal = ref("90帧");
const isPaused = ref(false);

const cYMode = ref(0); // 0: 固定, 1: 正弦, 2: 锯齿, 3: 方波
const cYAmp = ref(0.0); // 默认0V (固定) 打到中心
const cYPeriodMult = ref<number>(1);

const cXMode = ref(0); // 0: 固定, 1: 锯齿, 2: 正弦, 3: 方波
const cXAmp = ref(0.0); // 默认0V (固定) 打到中心
const cXPeriodMult = ref<number>(1);

const periodOptions = [
  { label: "1/3", value: 1 / 3 },
  { label: "1/2", value: 0.5 },
  { label: "1x", value: 1 },
  { label: "2x", value: 2 },
  { label: "3x", value: 3 },
];

const getVoltageY = (phase: number): number => {
  const T = SIGNAL_PERIOD * cYPeriodMult.value;
  if (cYMode.value === 0) return cYAmp.value;
  if (cYMode.value === 1) return cYAmp.value * Math.sin((2 * Math.PI * phase) / T);
  if (cYMode.value === 2) return cYAmp.value * (2 * ((phase % T) / T) - 1);
  if (cYMode.value === 3) return cYAmp.value * (Math.sin((2 * Math.PI * phase) / T) >= 0 ? 1 : -1);
  return 0;
};

const getVoltageX = (phase: number): number => {
  const T = SIGNAL_PERIOD * cXPeriodMult.value;
  if (cXMode.value === 0) return cXAmp.value;
  if (cXMode.value === 1) return cXAmp.value * (2 * ((phase % T) / T) - 1);
  if (cXMode.value === 2) return cXAmp.value * Math.sin((2 * Math.PI * phase) / T);
  if (cXMode.value === 3) return cXAmp.value * (Math.sin((2 * Math.PI * phase) / T) >= 0 ? 1 : -1);
  return 0;
};

let curSc = 11,
  gPhase = 0,
  spawnT = 0;
let electrons: EState[] = [],
  impacts: Impact[] = [];

const clearBeam = () => {
  electrons = [];
  impacts = [];
};

// ============================================================
// Build 3D tube geometry
// ============================================================
interface QuadVertex {
  posX: number;
  posY: number;
  posZ: number;
}
interface QuadNormal {
  nx: number;
  ny: number;
  nz: number;
}

const buildTubeMesh = (): Group | null => {
  if (!THREE) return null;
  const verts: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];

  const addQuad = (
    vertices: [QuadVertex, QuadVertex, QuadVertex, QuadVertex],
    normal: QuadNormal,
  ): void => {
    const base = verts.length / 3;
    const [v0, v1, v2, v3] = vertices;
    verts.push(
      v0.posX,
      v0.posY,
      v0.posZ,
      v1.posX,
      v1.posY,
      v1.posZ,
      v2.posX,
      v2.posY,
      v2.posZ,
      v3.posX,
      v3.posY,
      v3.posZ,
    );
    normals.push(
      normal.nx,
      normal.ny,
      normal.nz,
      normal.nx,
      normal.ny,
      normal.nz,
      normal.nx,
      normal.ny,
      normal.nz,
      normal.nx,
      normal.ny,
      normal.nz,
    );
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  for (let idx = 0; idx < SECTIONS.length - 1; idx++) {
    const secA = SECTIONS[idx];
    const secB = SECTIONS[idx + 1];
    addQuad(
      [
        { posX: secA.x, posY: secA.halfHeight, posZ: -secA.halfWidth },
        { posX: secB.x, posY: secB.halfHeight, posZ: -secB.halfWidth },
        { posX: secB.x, posY: secB.halfHeight, posZ: secB.halfWidth },
        { posX: secA.x, posY: secA.halfHeight, posZ: secA.halfWidth },
      ],
      { nx: 0, ny: 1, nz: 0 },
    );
    addQuad(
      [
        { posX: secA.x, posY: -secA.halfHeight, posZ: secA.halfWidth },
        { posX: secB.x, posY: -secB.halfHeight, posZ: secB.halfWidth },
        { posX: secB.x, posY: -secB.halfHeight, posZ: -secB.halfWidth },
        { posX: secA.x, posY: -secA.halfHeight, posZ: -secA.halfWidth },
      ],
      { nx: 0, ny: -1, nz: 0 },
    );
    addQuad(
      [
        { posX: secA.x, posY: -secA.halfHeight, posZ: secA.halfWidth },
        { posX: secB.x, posY: -secB.halfHeight, posZ: secB.halfWidth },
        { posX: secB.x, posY: secB.halfHeight, posZ: secB.halfWidth },
        { posX: secA.x, posY: secA.halfHeight, posZ: secA.halfWidth },
      ],
      { nx: 0, ny: 0, nz: 1 },
    );
    addQuad(
      [
        { posX: secA.x, posY: secA.halfHeight, posZ: -secA.halfWidth },
        { posX: secB.x, posY: secB.halfHeight, posZ: -secB.halfWidth },
        { posX: secB.x, posY: -secB.halfHeight, posZ: -secB.halfWidth },
        { posX: secA.x, posY: -secA.halfHeight, posZ: -secA.halfWidth },
      ],
      { nx: 0, ny: 0, nz: -1 },
    );
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  const mat = new THREE.MeshPhongMaterial({
    color: 0x1a3050,
    specular: 0x334466,
    shininess: 20,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geom, mat);

  // Edge wireframe for visible outline
  const edges = new THREE.EdgesGeometry(geom);
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x4a7090,
    transparent: true,
    opacity: 0.35,
    depthTest: false,
  });
  const wireframe = new THREE.LineSegments(edges, lineMat);

  const group = new THREE.Group();
  group.add(mesh);
  group.add(wireframe);
  return group;
};

// ============================================================
// Build screen plane with canvas texture
// ============================================================
const buildScreenPlane = (): Mesh | null => {
  if (!THREE) return null;
  const canvas = document.createElement("canvas");
  canvas.width = screenCanvasW;
  canvas.height = screenCanvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  screenCtx = ctx;
  screenTexture = new THREE.CanvasTexture(canvas);

  const geom = new THREE.PlaneGeometry(200, 200);
  const mat = new THREE.MeshBasicMaterial({ map: screenTexture, side: THREE.DoubleSide });
  const plane = new THREE.Mesh(geom, mat);
  plane.position.set(SCREEN_X, 0, 0);
  plane.rotation.y = -Math.PI / 2;
  return plane;
};

const updateScreenTexture = (): void => {
  if (!screenCtx || !screenTexture) return;
  const h = screenCanvasH,
    w = screenCanvasW;
  screenCtx.clearRect(0, 0, w, h);
  screenCtx.fillStyle = "#060a12";
  screenCtx.fillRect(0, 0, w, h);
  const margin = 0.08 * w;
  const screenW = w - 2 * margin;
  const screenH = h - 2 * margin;
  screenCtx.strokeStyle = "rgba(74,144,217,0.12)";
  screenCtx.lineWidth = 0.5;
  for (let i = 1; i < 8; i++) {
    const gridX = margin + (screenW / 8) * i;
    const gridY = margin + (screenH / 8) * i;
    screenCtx.beginPath();
    screenCtx.moveTo(gridX, margin);
    screenCtx.lineTo(gridX, margin + screenH);
    screenCtx.stroke();
    screenCtx.beginPath();
    screenCtx.moveTo(margin, gridY);
    screenCtx.lineTo(margin + screenW, gridY);
    screenCtx.stroke();
  }
  screenCtx.strokeStyle = "rgba(138,180,248,0.25)";
  screenCtx.lineWidth = 0.8;
  screenCtx.beginPath();
  screenCtx.moveTo(w / 2, margin);
  screenCtx.lineTo(w / 2, margin + screenH);
  screenCtx.stroke();
  screenCtx.beginPath();
  screenCtx.moveTo(margin, h / 2);
  screenCtx.lineTo(margin + screenW, h / 2);
  screenCtx.stroke();
  const scaleX = screenW / 200;
  const scaleY = screenH / 200;
  for (const imp of impacts) {
    const alpha = Math.max(0, 1 - imp.age / persistence.value);
    const pixelX = w / 2 + imp.z * scaleX;
    const pixelY = h / 2 - imp.y * scaleY;
    const radius = 4 + (1 - alpha) * 5;
    const glow = screenCtx.createRadialGradient(pixelX, pixelY, 0, pixelX, pixelY, radius * 1.5);
    glow.addColorStop(0, `rgba(180,255,140,${Number(alpha)})`);
    glow.addColorStop(0.2, `rgba(60,255,60,${alpha * 0.8})`);
    glow.addColorStop(0.5, `rgba(0,200,30,${alpha * 0.35})`);
    glow.addColorStop(1, "rgba(0,200,30,0)");
    screenCtx.fillStyle = glow;
    screenCtx.beginPath();
    screenCtx.arc(pixelX, pixelY, radius * 1.5, 0, Math.PI * 2);
    screenCtx.fill();
    screenCtx.fillStyle = `rgba(200,255,180,${alpha})`;
    screenCtx.beginPath();
    screenCtx.arc(pixelX, pixelY, radius * 0.3, 0, Math.PI * 2);
    screenCtx.fill();
  }
  screenCtx.strokeStyle = "rgba(100,170,240,0.5)";
  screenCtx.lineWidth = 2;
  screenCtx.strokeRect(margin, margin, screenW, screenH);
  screenTexture.needsUpdate = true;
};

// ============================================================
// Build electrode plates
// ============================================================
const createPlateMaterial = (polarity: number): MeshPhongMaterial | null => {
  if (!THREE) return null;
  const intensity = Math.min(Math.abs(polarity), 1);
  const specular = 0x889999;
  const shininess = 60;
  const opacity = 0.75;
  // Neutral: dark blue-gray, barely visible
  if (intensity < 0.05) {
    return new THREE.MeshPhongMaterial({
      color: 0x445566,
      specular,
      shininess,
      transparent: true,
      opacity,
      depthWrite: false,
    });
  }
  // Pastel red for positive (max saturation ~50%)
  if (polarity > 0) {
    const redChannel = 0.27 + intensity * 0.4;
    const greenChannel = 0.33 - intensity * 0.13;
    const blueChannel = 0.4 - intensity * 0.2;
    const emissiveR = intensity * 0.1;
    return new THREE.MeshPhongMaterial({
      color: new THREE.Color(redChannel, greenChannel, blueChannel),
      emissive: new THREE.Color(emissiveR, 0, 0),
      specular,
      shininess,
      transparent: true,
      opacity,
      depthWrite: false,
    });
  }
  // Pastel blue for negative
  const redC = 0.27 - intensity * 0.07;
  const greenC = 0.33 - intensity * 0.13;
  const blueC = 0.4 + intensity * 0.3;
  const emissiveB = intensity * 0.1;
  return new THREE.MeshPhongMaterial({
    color: new THREE.Color(redC, greenC, blueC),
    emissive: new THREE.Color(0, 0, emissiveB),
    specular,
    shininess,
    transparent: true,
    opacity,
    depthWrite: false,
  });
};

const buildPlates = (): void => {
  if (!THREE) return;
  const plateWidth = PLATE_WIDTH * 2;
  const plateHeight = YY_PLATE_END - YY_PLATE_START;
  const plateDepth = 2;
  const yGeom = new THREE.BoxGeometry(plateHeight, plateDepth, plateWidth);
  plateYY_top = new THREE.Mesh(yGeom, createPlateMaterial(0));
  plateYY_top.position.set((YY_PLATE_START + YY_PLATE_END) / 2, PLATE_GAP, 0);
  plateYY_bot = new THREE.Mesh(yGeom, createPlateMaterial(0));
  plateYY_bot.position.set((YY_PLATE_START + YY_PLATE_END) / 2, -PLATE_GAP, 0);
  const xGeom = new THREE.BoxGeometry(XX_PLATE_END - XX_PLATE_START, plateWidth, plateDepth);
  plateXX_left = new THREE.Mesh(xGeom, createPlateMaterial(0));
  plateXX_left.position.set((XX_PLATE_START + XX_PLATE_END) / 2, 0, -PLATE_GAP);
  plateXX_right = new THREE.Mesh(xGeom, createPlateMaterial(0));
  plateXX_right.position.set((XX_PLATE_START + XX_PLATE_END) / 2, 0, PLATE_GAP);
};

const updatePlateColor = (material: MeshPhongMaterial, polarity: number): void => {
  if (!material || !THREE) return;
  const intensity = Math.min(Math.abs(polarity), 1);
  material.opacity = 0.75;
  if (intensity < 0.05) {
    material.color.setRGB(0.27, 0.33, 0.4);
    material.emissive?.setRGB(0, 0, 0);
  } else if (polarity > 0) {
    material.color.setRGB(0.27 + intensity * 0.4, 0.33 - intensity * 0.13, 0.4 - intensity * 0.2);
    material.emissive?.setRGB(intensity * 0.1, 0, 0);
  } else {
    material.color.setRGB(0.27 - intensity * 0.07, 0.33 - intensity * 0.13, 0.4 + intensity * 0.3);
    material.emissive?.setRGB(0, 0, intensity * 0.1);
  }
};

const updatePlateColors = (): void => {
  if (!THREE) return;
  const voltageY = getVoltageY(gPhase);
  const voltageX = getVoltageX(gPhase);
  if (plateYY_top) updatePlateColor(plateYY_top.material as MeshPhongMaterial, voltageY);
  if (plateYY_bot) updatePlateColor(plateYY_bot.material as MeshPhongMaterial, -voltageY);
  if (plateXX_left) updatePlateColor(plateXX_left.material as MeshPhongMaterial, voltageX);
  if (plateXX_right) updatePlateColor(plateXX_right.material as MeshPhongMaterial, -voltageX);
};

// ============================================================
// Electron gun
// ============================================================
const buildGunMesh = (): Group | null => {
  if (!THREE) return null;
  const group = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const geom = new THREE.CylinderGeometry(8, 8, 1, 16);
    const mat = new THREE.MeshPhongMaterial({ color: 0x8899aa, specular: 0xaabbcc, shininess: 60 });
    const disk = new THREE.Mesh(geom, mat);
    disk.rotation.z = Math.PI / 2;
    disk.position.set(20 + i * 8, 0, 0);
    group.add(disk);
  }
  const baseGeom = new THREE.BoxGeometry(4, 10, 10);
  const baseMat = new THREE.MeshPhongMaterial({
    color: 0x667788,
    specular: 0x8899aa,
    shininess: 40,
  });
  const base = new THREE.Mesh(baseGeom, baseMat);
  base.position.set(48, 0, 0);
  group.add(base);
  return group;
};

// ============================================================
// Beam rendering
// ============================================================
// Pre-allocate reusable materials
let beamGlowMat: LineBasicMaterial | null = null;
let beamCoreMat: LineBasicMaterial | null = null;
let beamGlowSphereGeom: SphereGeometry | null = null;
let beamGlowSphereMat: MeshBasicMaterial | null = null;
let beamCoreSphereGeom: SphereGeometry | null = null;
let beamCoreSphereMat: MeshBasicMaterial | null = null;

const initBeamMaterials = (): void => {
  if (!THREE) return;
  beamGlowMat = new THREE.LineBasicMaterial({
    color: 0x20ff40,
    transparent: true,
    opacity: 0.25,
    depthTest: false,
  });
  beamCoreMat = new THREE.LineBasicMaterial({
    color: 0x80ff60,
    transparent: true,
    opacity: 0.85,
    depthTest: false,
  });
  beamGlowSphereGeom = new THREE.SphereGeometry(5 / 3, 8, 8);
  beamGlowSphereMat = new THREE.MeshBasicMaterial({
    color: 0x30ff40,
    transparent: true,
    opacity: 0.25,
    depthTest: false,
  });
  beamCoreSphereGeom = new THREE.SphereGeometry(2 / 3, 8, 8);
  beamCoreSphereMat = new THREE.MeshBasicMaterial({
    color: 0xb0ffb0,
    transparent: true,
    opacity: 1,
    depthTest: false,
  });
};

const updateBeamGroup = (): void => {
  if (!THREE || !beamGroup) return;
  // Dispose old children properly
  for (const child of beamGroup.children) {
    if (child instanceof THREE.Line || child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (
        child instanceof THREE.Line &&
        child.material !== beamGlowMat &&
        child.material !== beamCoreMat
      )
        child.material.dispose();

      if (
        child instanceof THREE.Mesh &&
        child.material !== beamGlowSphereMat &&
        child.material !== beamCoreSphereMat
      )
        child.material.dispose();
    }
  }
  beamGroup.clear();

  for (const e of electrons) {
    if (e.trail.length < 2) continue;
    const points: Vector3[] = [];
    for (const trailPoint of e.trail)
      points.push(new THREE.Vector3(trailPoint.x, trailPoint.y, trailPoint.z));

    // Glow line
    const glowGeom = new THREE.BufferGeometry().setFromPoints(points);
    beamGroup.add(new THREE.Line(glowGeom, beamGlowMat));

    // Core line
    const coreGeom = new THREE.BufferGeometry().setFromPoints(points);
    beamGroup.add(new THREE.Line(coreGeom, beamCoreMat));

    // Electron core
    const sphere = new THREE.Mesh(beamCoreSphereGeom, beamCoreSphereMat);
    sphere.position.set(e.x, e.y, e.z);
    beamGroup.add(sphere);
  }
};

// ============================================================
// Labels
// ============================================================
const buildLabels = (): Group | null => {
  if (!THREE) return null;
  const group = new THREE.Group();

  const addLabel = (
    text: string,
    labelX: number,
    labelY: number,
    labelZ: number,
    labelColor: string,
  ): void => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const context2d = canvas.getContext("2d");
    if (!context2d) return;
    context2d.fillStyle = labelColor;
    context2d.font = "bold 64px Arial";
    context2d.textAlign = "center";
    context2d.textBaseline = "middle";
    context2d.fillText(text, 128, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(labelX, labelY, labelZ);
    sprite.scale.set(24, 12, 1);
    group.add(sprite);
  };

  const yMid = (YY_PLATE_START + YY_PLATE_END) / 2;
  const xMid = (XX_PLATE_START + XX_PLATE_END) / 2;
  addLabel("Y", yMid, PLATE_GAP + 18, 0, "#8ab4f8");
  addLabel("Y'", yMid, -PLATE_GAP - 18, 0, "#8ab4f8");
  addLabel("X'", xMid, 0, PLATE_GAP + 18, "#8ab4f8");
  addLabel("X", xMid, 0, -PLATE_GAP - 18, "#8ab4f8");
  addLabel("电子枪", 40, -16, 0, "#6a8aa8");
  addLabel("荧光屏", SCREEN_X, -112, 0, "#5a7a9c");
  return group;
};

// ============================================================
// Physics simulation
// ============================================================
const spawnElectron = (offsetSubFrame = 0): void => {
  electrons.push({
    x: ELECTRON_GUN_X,
    y: 0,
    z: 0,
    vx: INITIAL_VELOCITY_X,
    vy: 0,
    vz: 0,
    birthPhase: gPhase + offsetSubFrame,
    sVy: null,
    sVx: 0,
    trail: [],
    alive: true,
  });
};

const updateElectrons = (): void => {
  for (const e of electrons) {
    if (!e.alive) continue;
    if (e.sVy == null) {
      e.sVy = getVoltageY(e.birthPhase);
      e.sVx = getVoltageX(e.birthPhase);
    }
    e.trail.push({ x: e.x, y: e.y, z: e.z });
    if (e.trail.length > TRAIL_LENGTH) e.trail.shift();
    if (e.x >= YY_PLATE_START && e.x <= YY_PLATE_END) e.vy += e.sVy * YY_DEFLECTION_SENSITIVITY;
    if (e.x >= XX_PLATE_START && e.x <= XX_PLATE_END) e.vz -= e.sVx * XX_DEFLECTION_SENSITIVITY;
    e.x += e.vx;
    e.y += e.vy;
    e.z += e.vz;
    if (e.x >= SCREEN_X) {
      impacts.push({ y: e.y, z: e.z, age: 0 });
      e.alive = false;
    }
    if (Math.abs(e.y) > 150 || Math.abs(e.z) > 150) e.alive = false;
  }
  electrons = electrons.filter((electron) => electron.alive);
  for (const imp of impacts) imp.age += 1;
  impacts = impacts.filter((imp) => imp.age < persistence.value);
};

// ============================================================
// 2D Screen inset
// ============================================================
const drawScreenInset = (): void => {
  const canvas = screenInsetRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const h = canvas.height,
    w = canvas.width;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#060a12";
  ctx.fillRect(0, 0, w, h);
  const margin = 50;
  const screenW = w - 2 * margin;
  const screenH = h - 2 * margin;
  const centerX = w / 2;
  const centerY = h / 2;
  ctx.strokeStyle = "rgba(74,144,217,0.18)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 8; i++) {
    const gridX = margin + (screenW / 8) * i;
    const gridY = margin + (screenH / 8) * i;
    ctx.beginPath();
    ctx.moveTo(gridX, margin);
    ctx.lineTo(gridX, margin + screenH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(margin, gridY);
    ctx.lineTo(margin + screenW, gridY);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(138,180,248,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX, margin);
  ctx.lineTo(centerX, margin + screenH);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(margin, centerY);
  ctx.lineTo(margin + screenW, centerY);
  ctx.stroke();
  const scaleX = screenW / 200;
  const scaleY = screenH / 200;
  for (const imp of impacts) {
    const alpha = Math.max(0, 1 - imp.age / persistence.value);
    const pixelX = centerX - imp.z * scaleX;
    const pixelY = centerY - imp.y * scaleY;
    const radius = 4 + (1 - alpha) * 5;
    const glow = ctx.createRadialGradient(pixelX, pixelY, 0, pixelX, pixelY, radius * 2);
    glow.addColorStop(0, `rgba(180,255,140,${Number(alpha)})`);
    glow.addColorStop(0.2, `rgba(60,255,60,${alpha * 0.8})`);
    glow.addColorStop(0.5, `rgba(0,200,30,${alpha * 0.35})`);
    glow.addColorStop(1, "rgba(0,200,30,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(pixelX, pixelY, radius * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(200,255,180,${alpha})`;
    ctx.beginPath();
    ctx.arc(pixelX, pixelY, radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(100,170,240,0.4)";
  ctx.lineWidth = 2;
  ctx.strokeRect(margin, margin, screenW, screenH);
};

// ============================================================
// 2D U-t charts
// ============================================================
const drawUtChart = (
  canvasRef: HTMLCanvasElement | null,
  voltageFunc: (phase: number) => number,
  color: string,
  currentPhase: number,
): void => {
  if (!canvasRef) return;
  const rect = canvasRef.getBoundingClientRect();
  const displayW = Math.floor(rect.width);
  const displayH = Math.floor(rect.height);
  if (displayW <= 0 || displayH <= 0) return;
  if (canvasRef.width !== displayW || canvasRef.height !== displayH) {
    canvasRef.width = displayW;
    canvasRef.height = displayH;
  }
  const h = canvasRef.height,
    w = canvasRef.width;
  const ctx = canvasRef.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  const pad = { top: 16, bottom: 16, left: 4, right: 4 };
  const graphW = w - pad.left - pad.right;
  const graphH = h - pad.top - pad.bottom;
  const centerY = pad.top + graphH / 2;
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 0.8;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(pad.left, centerY);
  ctx.lineTo(w - pad.right, centerY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = '10px "Consolas", monospace';
  ctx.textAlign = "left";
  ctx.fillText("+1", 1, pad.top + 8);
  ctx.fillText(" 0", 1, centerY + 3);
  ctx.fillText("-1", 1, h - pad.bottom + 1);
  const maxAmp = graphH / 2 - 4;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  const step = Math.max(1, Math.floor(graphW / 180));
  let first = true;
  for (let i = 0; i < graphW; i += step) {
    const voltage = voltageFunc(currentPhase - (graphW - i) * 1.5);
    const lineX = pad.left + i;
    const lineY = centerY - voltage * maxAmp;
    if (first) {
      ctx.moveTo(lineX, lineY);
      first = false;
    } else {
      ctx.lineTo(lineX, lineY);
    }
  }
  ctx.stroke();
};

// ============================================================
// Scene init
// ============================================================
const initScene = async (): Promise<void> => {
  await loadThree();
  if (!THREE || !containerRef.value) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b121f);

  camera = new THREE.PerspectiveCamera(
    45,
    containerRef.value.clientWidth / containerRef.value.clientHeight,
    1,
    2000,
  );
  camera.position.set(640, 80, -320);
  camera.lookAt(220, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(containerRef.value.clientWidth, containerRef.value.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  containerRef.value.append(renderer.domElement);

  orbit = new OrbitControlsCtor(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.08;
  orbit.target.set(220, 0, 0);
  orbit.update();

  scene.add(new THREE.AmbientLight(0x8899aa, 1.2));
  // Six directional lights covering all angles
  const lights: [number, number, number, number][] = [
    [-100, 200, 300, 0.6],
    [500, -50, 100, 0.4],
    [200, 100, -200, 0.4],
    [200, -100, 200, 0.3],
    [200, 100, 300, 0.3],
    [300, 0, -300, 0.3],
  ];
  for (const [lightX, lightY, lightZ, intensity] of lights) {
    const dirLight = new THREE.DirectionalLight(0xccddff, intensity);
    dirLight.position.set(lightX, lightY, lightZ);
    scene.add(dirLight);
  }

  const gridHelper = new THREE.GridHelper(600, 30, 0x1a2844, 0x111a2e);
  gridHelper.position.set(300, -120, 0);
  scene.add(gridHelper);

  tubeMesh = buildTubeMesh();
  if (tubeMesh) scene.add(tubeMesh);

  screenPlane = buildScreenPlane();
  if (screenPlane) scene.add(screenPlane);

  buildPlates();
  if (plateYY_top) {
    scene.add(plateYY_top);
    scene.add(plateYY_bot);
  }
  if (plateXX_left) {
    scene.add(plateXX_left);
    scene.add(plateXX_right);
  }

  const gun = buildGunMesh();
  if (gun) scene.add(gun);

  const labels = buildLabels();
  if (labels) scene.add(labels);

  beamGroup = new THREE.Group();
  scene.add(beamGroup);
  initBeamMaterials();
};

// ============================================================
// Animation loop
// ============================================================
useRafFn(() => {
  if (!THREE || !renderer || !scene || !camera) return;

  if (!isPaused.value) {
    spawnT += 1;
    if (spawnT >= SPAWN_INTERVAL) {
      spawnElectron(0);
      spawnElectron(0.33);
      spawnElectron(0.66);
      spawnT = 0;
    }
    updateElectrons();
    gPhase += 1;
  }

  updatePlateColors();
  updateBeamGroup();
  updateScreenTexture();
  drawScreenInset();

  drawUtChart(utYYRef.value, getVoltageY, "#ff8a80", gPhase);
  drawUtChart(utXXRef.value, getVoltageX, "#82b1ff", gPhase);

  if (orbit) orbit.update();
  renderer.render(scene, camera);
});

const onResize = (): void => {
  if (!THREE || !camera || !renderer || !containerRef.value) return;
  camera.aspect = containerRef.value.clientWidth / containerRef.value.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(containerRef.value.clientWidth, containerRef.value.clientHeight);
};
useEventListener(globalThis, "resize", onResize);

const resetView = (): void => {
  if (!orbit || !camera) return;
  orbit.target.set(220, 0, 0);
  camera.position.set(640, 80, -320);
  camera.lookAt(220, 0, 0);
  orbit.update();
};
const viewFront = (): void => {
  if (!orbit || !camera) return;
  orbit.target.set(220, 0, 0);
  camera.position.set(750, 0, 0);
  camera.lookAt(220, 0, 0);
  orbit.update();
};
const viewSide = (): void => {
  if (!orbit || !camera) return;
  orbit.target.set(220, 0, 0);
  camera.position.set(640, 80, -320);
  camera.lookAt(220, 0, 0);
  orbit.update();
};
const viewTop = (): void => {
  if (!orbit || !camera) return;
  orbit.target.set(220, 0, 0);
  camera.position.set(220, 500, 1);
  camera.lookAt(220, 0, 0);
  orbit.update();
};

// ============================================================
// Keyboard
// ============================================================
onKeyStroke(" ", (event) => {
  event.preventDefault();
  isPaused.value = !isPaused.value;
});

// ============================================================
// Lifecycle
// ============================================================
onMounted(async () => {
  await nextTick();
  if (screenInsetRef.value) {
    screenInsetRef.value.width = 460;
    screenInsetRef.value.height = 460;
  }
  await initScene();
});

onBeforeUnmount(() => {
  if (renderer) renderer.dispose();
  if (beamGlowMat) beamGlowMat.dispose();
  if (beamCoreMat) beamCoreMat.dispose();
  if (beamGlowSphereGeom) beamGlowSphereGeom.dispose();
  if (beamGlowSphereMat) beamGlowSphereMat.dispose();
  if (beamCoreSphereGeom) beamCoreSphereGeom.dispose();
  if (beamCoreSphereMat) beamCoreSphereMat.dispose();
});
</script>

<template>
  <div class="h-screen flex flex-col bg-[#0b111a] text-[#d0dce8] overflow-hidden select-none">
    <NavBar title="示波管工作原理" :gradient="true" />

    <main class="flex-1 flex gap-3 px-5 py-3 min-h-0">
      <!-- 3D view with floating overlays -->
      <div
        ref="containerRef"
        class="flex-1 relative bg-[#0a0f19]/60 rounded-xl border border-blue-400/15 overflow-hidden min-w-0"
      >
        <!-- Persistence overlay: top-left (Moved from bottom-left) -->
        <div
          class="absolute top-3 left-3 z-20 bg-[#0c121c]/92 border border-blue-400/20 rounded-xl p-3.5 backdrop-blur-md w-72 shadow-2xl flex flex-col gap-2 select-text"
        >
          <div class="flex items-center justify-between text-xs">
            <span class="text-emerald-400 font-bold flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              荧光屏余晖
            </span>
            <span class="text-emerald-400 font-mono text-right">{{ persistence }}帧</span>
          </div>
          <div class="flex items-center gap-2 text-xs">
            <input
              type="range"
              min="20"
              max="1000"
              step="10"
              v-model.number="persistence"
              class="flex-1 h-1 appearance-none bg-emerald-400/10 rounded-sm outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-400 [&::-webkit-slider-thumb]:cursor-pointer"
            />
          </div>
        </div>

        <!-- Controls overlay: bottom-left -->
        <div
          class="absolute bottom-3 left-3 z-20 bg-[#0c121c]/92 border border-blue-400/20 rounded-xl p-4 backdrop-blur-md w-[38rem] max-w-[calc(100%-1.5rem)] shadow-2xl select-text"
        >
          <div class="grid grid-cols-2 gap-4">
            <!-- X-axis settings (先X后Y) -->
            <div class="flex flex-col gap-2.5 pr-4 border-r border-blue-400/10">
              <div class="flex items-center justify-between">
                <span class="text-blue-400 font-bold text-xs flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  X轴信号 (水平偏转 XX')
                </span>
              </div>

              <!-- X Mode Select -->
              <div class="flex items-center gap-2 text-xs">
                <span class="text-slate-400 w-14 shrink-0 whitespace-nowrap">波形选择:</span>
                <div
                  class="flex-1 grid grid-cols-4 gap-1 bg-black/40 p-0.5 rounded border border-blue-400/10"
                >
                  <button
                    v-for="(name, idx) in ['固定', '锯齿', '正弦', '方波']"
                    :key="idx"
                    type="button"
                    :class="[
                      'py-1 text-center rounded transition-all text-[11px] cursor-pointer whitespace-nowrap',
                      cXMode === idx
                        ? 'bg-blue-500/25 text-blue-200 border border-blue-500/30 font-semibold'
                        : 'text-slate-400 hover:text-slate-200',
                    ]"
                    @click="cXMode = idx"
                  >
                    {{ name }}
                  </button>
                </div>
              </div>

              <!-- X Voltage Amplitude -->
              <div class="flex items-center gap-2 text-xs">
                <span class="text-slate-400 w-14 shrink-0 whitespace-nowrap">最大电压:</span>
                <input
                  type="range"
                  min="-1.0"
                  max="1.0"
                  step="0.02"
                  v-model.number="cXAmp"
                  class="flex-1 h-1 appearance-none bg-blue-400/10 rounded-sm outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-400 [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <span class="text-blue-300 font-mono w-10 text-right shrink-0"
                  >{{ cXAmp.toFixed(2) }}V</span
                >
              </div>

              <!-- X Period Multiplier -->
              <div
                class="flex items-center gap-2 text-xs"
                :class="{ 'opacity-40 pointer-events-none select-none': cXMode === 0 }"
              >
                <span class="text-slate-400 w-14 shrink-0 whitespace-nowrap">周期倍率:</span>
                <div
                  class="flex-1 grid grid-cols-5 gap-1 bg-black/40 p-0.5 rounded border border-blue-400/10"
                >
                  <button
                    v-for="opt in periodOptions"
                    :key="opt.value"
                    type="button"
                    :disabled="cXMode === 0"
                    :class="[
                      'py-1 text-center rounded transition-all text-[10px] whitespace-nowrap',
                      cXMode === 0
                        ? 'text-slate-600 bg-transparent cursor-not-allowed'
                        : cXPeriodMult === opt.value
                          ? 'bg-blue-500/25 text-blue-200 border border-blue-500/30 font-semibold cursor-pointer'
                          : 'text-slate-400 hover:text-slate-200 cursor-pointer',
                    ]"
                    @click="cXPeriodMult = opt.value"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Y-axis settings -->
            <div class="flex flex-col gap-2.5">
              <div class="flex items-center justify-between">
                <span class="text-red-400 font-bold text-xs flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  Y轴信号 (垂直偏转 YY')
                </span>
              </div>

              <!-- Y Mode Select -->
              <div class="flex items-center gap-2 text-xs">
                <span class="text-slate-400 w-14 shrink-0 whitespace-nowrap">波形选择:</span>
                <div
                  class="flex-1 grid grid-cols-4 gap-1 bg-black/40 p-0.5 rounded border border-blue-400/10"
                >
                  <button
                    v-for="(name, idx) in ['固定', '正弦', '锯齿', '方波']"
                    :key="idx"
                    type="button"
                    :class="[
                      'py-1 text-center rounded transition-all text-[11px] cursor-pointer whitespace-nowrap',
                      cYMode === idx
                        ? 'bg-red-500/25 text-red-200 border border-red-500/30 font-semibold'
                        : 'text-slate-400 hover:text-slate-200',
                    ]"
                    @click="cYMode = idx"
                  >
                    {{ name }}
                  </button>
                </div>
              </div>

              <!-- Y Voltage Amplitude -->
              <div class="flex items-center gap-2 text-xs">
                <span class="text-slate-400 w-14 shrink-0 whitespace-nowrap">最大电压:</span>
                <input
                  type="range"
                  min="-1.0"
                  max="1.0"
                  step="0.02"
                  v-model.number="cYAmp"
                  class="flex-1 h-1 appearance-none bg-blue-400/10 rounded-sm outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-400 [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <span class="text-red-300 font-mono w-10 text-right shrink-0"
                  >{{ cYAmp.toFixed(2) }}V</span
                >
              </div>

              <!-- Y Period Multiplier -->
              <div
                class="flex items-center gap-2 text-xs"
                :class="{ 'opacity-40 pointer-events-none select-none': cYMode === 0 }"
              >
                <span class="text-slate-400 w-14 shrink-0 whitespace-nowrap">周期倍率:</span>
                <div
                  class="flex-1 grid grid-cols-5 gap-1 bg-black/40 p-0.5 rounded border border-blue-400/10"
                >
                  <button
                    v-for="opt in periodOptions"
                    :key="opt.value"
                    type="button"
                    :disabled="cYMode === 0"
                    :class="[
                      'py-1 text-center rounded transition-all text-[10px] whitespace-nowrap',
                      cYMode === 0
                        ? 'text-slate-600 bg-transparent cursor-not-allowed'
                        : cYPeriodMult === opt.value
                          ? 'bg-red-500/25 text-red-200 border border-red-500/30 font-semibold cursor-pointer'
                          : 'text-slate-400 hover:text-slate-200 cursor-pointer',
                    ]"
                    @click="cYPeriodMult = opt.value"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- View buttons: top-right -->
        <div class="absolute top-3 right-3 flex gap-1.5 z-20">
          <button
            class="px-3 py-2 rounded-md text-sm font-medium bg-blue-400/10 border border-blue-400/25 text-blue-300 hover:bg-blue-400/20 hover:border-blue-400/40 transition-all cursor-pointer"
            @click="resetView"
          >
            ⟲ 重置
          </button>
          <button
            class="px-3 py-2 rounded-md text-sm font-medium bg-blue-400/10 border border-blue-400/25 text-blue-300 hover:bg-blue-400/20 hover:border-blue-400/40 transition-all cursor-pointer"
            @click="viewFront"
          >
            正面
          </button>
          <button
            class="px-3 py-2 rounded-md text-sm font-medium bg-blue-400/10 border border-blue-400/25 text-blue-300 hover:bg-blue-400/20 hover:border-blue-400/40 transition-all cursor-pointer"
            @click="viewSide"
          >
            侧面
          </button>
          <button
            class="px-3 py-2 rounded-md text-sm font-medium bg-blue-400/10 border border-blue-400/25 text-blue-300 hover:bg-blue-400/20 hover:border-blue-400/40 transition-all cursor-pointer"
            @click="viewTop"
          >
            俯视
          </button>
        </div>
      </div>

      <!-- Right panel: larger -->
      <div class="flex-1 flex flex-col gap-3 min-w-72 max-w-[32rem] min-h-0">
        <div
          class="flex-[1.1] flex flex-col bg-[#0a0f19]/60 rounded-xl border border-blue-400/15 p-3 items-center min-h-0"
        >
          <canvas
            ref="screenInsetRef"
            class="flex-1 w-full rounded-lg bg-[#060a12] border-2 border-blue-400/20 object-contain min-h-0"
          />
        </div>
        <div
          class="flex-[1.2] flex gap-2 bg-[#0a0f19]/60 rounded-xl border border-blue-400/15 p-3 min-h-0"
        >
          <div class="flex-1 relative min-w-0 flex flex-col min-h-0">
            <span
              class="absolute top-1.5 left-2 z-10 text-xs font-bold bg-[#060a12]/90 rounded px-2 py-0.5 pointer-events-none text-red-300"
              >YY' U-t</span
            >
            <canvas
              ref="utYYRef"
              class="flex-1 w-full rounded-lg bg-[#060a12] border border-blue-400/15 block min-h-0"
            />
          </div>
          <div class="flex-1 relative min-w-0 flex flex-col min-h-0">
            <span
              class="absolute top-1.5 left-2 z-10 text-xs font-bold bg-[#060a12]/90 rounded px-2 py-0.5 pointer-events-none text-blue-300"
              >XX' U-t</span
            >
            <canvas
              ref="utXXRef"
              class="flex-1 w-full rounded-lg bg-[#060a12] border border-blue-400/15 block min-h-0"
            />
          </div>
        </div>
      </div>
    </main>

    <Copyright />
  </div>
</template>
