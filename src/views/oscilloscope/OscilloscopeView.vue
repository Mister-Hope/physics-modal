<script setup lang="ts">
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
let OrbitControlsClass: (new (...args: any[]) => any) | null = null;

async function loadThree() {
  const [t, o] = await Promise.all([
    import("three"),
    import("three/examples/jsm/controls/OrbitControls.js"),
  ]);
  THREE = t;
  OrbitControlsClass = o.OrbitControls;
}

// ============================================================
// Three.js objects
// ============================================================
let camera: any, orbit: any, renderer: any, scene: any;
let screenCtx: any, screenPlane: any, screenTexture: any, tubeMesh: any;
let plateXX_left: any, plateXX_right: any, plateYY_bot: any, plateYY_top: any;
let beamGroup: any;
let animFrame = 0;
const screenCanvasW = 512;
const screenCanvasH = 512;

// ============================================================
// Constants (from original)
// ============================================================
const GUN_X = 15;
const XX_E = 315,
  XX_S = 200,
  YY_E = 185,
  YY_S = 70;
const SCR_X = 430;
const PLATE_GAP = 24,
  PLATE_W = 40;
const AX_S = 0.12,
  AY_S = 0.075,
  VX = 6;
const SPAWN_INT = 4,
  TRAIL = 24,
  T_SCN = 180,
  T_SIG = 180;

interface Section {
  x: number;
  hw: number;
  hh: number;
}
const SECTIONS: Section[] = [
  { x: 0, hw: 15, hh: 15 },
  { x: 60, hw: 15, hh: 15 },
  { x: 65, hw: 46, hh: 46 },
  { x: 325, hw: 46, hh: 46 },
  { x: 360, hw: 100, hh: 100 },
  { x: 430, hw: 100, hh: 100 },
];

interface EState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  bp: number;
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
interface Scenario {
  name: string;
  sub: string;
  desc: string;
  Vy: (p: number) => number;
  Vx: (p: number) => number;
  vyI: string;
  vxI: string;
  isCustom?: boolean;
}

// ============================================================
// Physics state
// ============================================================
const customParams = { yMode: 0, xMode: 0, yAmp: 0.8, xAmp: 0.8 };
function customVy(p: number): number {
  if (customParams.yMode === 1) return customParams.yAmp;
  if (customParams.yMode === 2)
    return Math.abs(customParams.yAmp) * Math.sin((2 * Math.PI * p) / T_SIG);
  if (customParams.yMode === 3)
    return Math.abs(customParams.yAmp) * (2 * ((p % T_SCN) / T_SCN) - 1);
  return 0;
}
function customVx(p: number): number {
  if (customParams.xMode === 1) return customParams.xAmp;
  if (customParams.xMode === 2)
    return Math.abs(customParams.xAmp) * Math.sin((2 * Math.PI * p) / T_SIG);
  if (customParams.xMode === 3)
    return Math.abs(customParams.xAmp) * (2 * ((p % T_SCN) / T_SCN) - 1);
  return 0;
}

const scenarios: Scenario[] = [
  {
    name: "零电压",
    sub: "基准状态",
    desc: "XX'、YY' 均不加电压。电子沿直线运动打在荧光屏正中心，呈现一个亮斑。",
    Vy: () => 0,
    Vx: () => 0,
    vyI: "0（不加电压）",
    vxI: "0（不加电压）",
  },
  {
    name: "Y 正偏",
    sub: "恒定偏转",
    desc: "XX'不加电压，YY'加恒定正压。电子向Y板上方偏转，亮斑在Y轴上方。",
    Vy: () => 1,
    Vx: () => 0,
    vyI: "Y>Y'（恒定正压）",
    vxI: "0（不加电压）",
  },
  {
    name: "Y 负偏",
    sub: "恒定偏转",
    desc: "XX'不加电压，YY'加恒定负压。电子向Y'板下方偏转。",
    Vy: () => -1,
    Vx: () => 0,
    vyI: "Y'>Y（恒定反压）",
    vxI: "0",
  },
  {
    name: "Y 交变",
    sub: "交变电压",
    desc: "XX'不加电压，YY'加正弦电压。竖直亮线。",
    Vy: (p) => Math.sin((2 * Math.PI * p) / T_SIG),
    Vx: () => 0,
    vyI: "正弦交变",
    vxI: "0",
  },
  {
    name: "X 正偏",
    sub: "恒定偏转",
    desc: "YY'不加电压，XX'加恒定正压。电子向X板右侧偏转。",
    Vy: () => 0,
    Vx: () => 1,
    vyI: "0",
    vxI: "X>X'",
  },
  {
    name: "X 负偏",
    sub: "恒定偏转",
    desc: "YY'不加电压，XX'加恒定负压。电子向X'板左侧偏转。",
    Vy: () => 0,
    Vx: () => -1,
    vyI: "0",
    vxI: "X'>X",
  },
  {
    name: "X 扫描",
    sub: "锯齿波",
    desc: "YY'不加电压，XX'加锯齿波。水平亮线。",
    Vy: () => 0,
    Vx: (p) => 2 * ((p % T_SCN) / T_SCN) - 1,
    vyI: "0",
    vxI: "锯齿波",
  },
  {
    name: "标准波形",
    sub: "波形成像",
    desc: "YY'正弦信号，XX'同周期锯齿波。显示正弦波形。",
    Vy: (p) => Math.sin((2 * Math.PI * p) / T_SIG),
    Vx: (p) => 2 * ((p % T_SCN) / T_SCN) - 1,
    vyI: "正弦",
    vxI: "同周期锯齿波",
  },
  {
    name: "双向偏转",
    sub: "恒定偏转",
    desc: "XX'和YY'均加恒定正压。亮斑在第一象限。",
    Vy: () => 1,
    Vx: () => 1,
    vyI: "Y>Y'",
    vxI: "X>X'",
  },
  {
    name: "X偏+Y交变",
    sub: "组合偏转",
    desc: "XX'恒定正压，YY'正弦电压。右侧竖直亮线。",
    Vy: (p) => Math.sin((2 * Math.PI * p) / T_SIG),
    Vx: () => 1,
    vyI: "正弦",
    vxI: "X>X'",
  },
  {
    name: "双周期扫描",
    sub: "完整波形",
    desc: "YY'正弦，XX'半周期锯齿波。完整正弦波。",
    Vy: (p) => Math.sin((2 * Math.PI * p) / T_SIG),
    Vx: (p) => 2 * ((p % (T_SCN / 2)) / (T_SCN / 2)) - 1,
    vyI: "正弦",
    vxI: "半周期锯齿波",
  },
  {
    name: "自定义",
    sub: "自由探索",
    desc: "手动调节电压类型、幅度和频率。恒定模式幅度可正可负。",
    Vy: (p) => customVy(p),
    Vx: (p) => customVx(p),
    vyI: "自定义",
    vxI: "自定义",
    isCustom: true,
  },
];

let curSc = 0,
  gPhase = 0,
  spawnT = 0;
let electrons: EState[] = [],
  impacts: Impact[] = [];
let persistence = 90;
let isPaused = false;

// ============================================================
// Build 3D tube geometry
// ============================================================
function buildTubeMesh() {
  if (!THREE) return null;
  const verts: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];

  function addQuad(
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number,
    x3: number,
    y3: number,
    z3: number,
    nx: number,
    ny: number,
    nz: number,
  ) {
    const base = verts.length / 3;
    verts.push(x0, y0, z0, x1, y1, z1, x2, y2, z2, x3, y3, z3);
    normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz, nx, ny, nz);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  for (let i = 0; i < SECTIONS.length - 1; i++) {
    const s0 = SECTIONS[i],
      s1 = SECTIONS[i + 1];
    addQuad(
      s0.x,
      s0.hh,
      -s0.hw,
      s1.x,
      s1.hh,
      -s1.hw,
      s1.x,
      s1.hh,
      s1.hw,
      s0.x,
      s0.hh,
      s0.hw,
      0,
      1,
      0,
    );
    addQuad(
      s0.x,
      -s0.hh,
      s0.hw,
      s1.x,
      -s1.hh,
      s1.hw,
      s1.x,
      -s1.hh,
      -s1.hw,
      s0.x,
      -s0.hh,
      -s0.hw,
      0,
      -1,
      0,
    );
    addQuad(
      s0.x,
      -s0.hh,
      s0.hw,
      s1.x,
      -s1.hh,
      s1.hw,
      s1.x,
      s1.hh,
      s1.hw,
      s0.x,
      s0.hh,
      s0.hw,
      0,
      0,
      1,
    );
    addQuad(
      s0.x,
      s0.hh,
      -s0.hw,
      s1.x,
      s1.hh,
      -s1.hw,
      s1.x,
      -s1.hh,
      -s1.hw,
      s0.x,
      -s0.hh,
      -s0.hw,
      0,
      0,
      -1,
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
}

// ============================================================
// Build screen plane with canvas texture
// ============================================================
function buildScreenPlane() {
  if (!THREE) return null;
  const canvas = document.createElement("canvas");
  canvas.width = screenCanvasW;
  canvas.height = screenCanvasH;
  screenCtx = canvas.getContext("2d")!;
  screenTexture = new THREE.CanvasTexture(canvas);

  const geom = new THREE.PlaneGeometry(200, 200);
  const mat = new THREE.MeshBasicMaterial({ map: screenTexture, side: THREE.DoubleSide });
  const plane = new THREE.Mesh(geom, mat);
  plane.position.set(SCR_X, 0, 0);
  plane.rotation.y = -Math.PI / 2;
  return plane;
}

function updateScreenTexture() {
  if (!screenCtx || !screenTexture) return;
  const w = screenCanvasW,
    h = screenCanvasH;
  screenCtx.clearRect(0, 0, w, h);
  screenCtx.fillStyle = "#060a12";
  screenCtx.fillRect(0, 0, w, h);
  const margin = 0.08 * w,
    sw = w - 2 * margin,
    sh = h - 2 * margin;
  screenCtx.strokeStyle = "rgba(74,144,217,0.12)";
  screenCtx.lineWidth = 0.5;
  for (let i = 1; i < 8; i++) {
    const gx = margin + (sw / 8) * i,
      gy = margin + (sh / 8) * i;
    screenCtx.beginPath();
    screenCtx.moveTo(gx, margin);
    screenCtx.lineTo(gx, margin + sh);
    screenCtx.stroke();
    screenCtx.beginPath();
    screenCtx.moveTo(margin, gy);
    screenCtx.lineTo(margin + sw, gy);
    screenCtx.stroke();
  }
  screenCtx.strokeStyle = "rgba(138,180,248,0.25)";
  screenCtx.lineWidth = 0.8;
  screenCtx.beginPath();
  screenCtx.moveTo(w / 2, margin);
  screenCtx.lineTo(w / 2, margin + sh);
  screenCtx.stroke();
  screenCtx.beginPath();
  screenCtx.moveTo(margin, h / 2);
  screenCtx.lineTo(margin + sw, h / 2);
  screenCtx.stroke();
  const scaleX = sw / 200,
    scaleY = sh / 200;
  for (const imp of impacts) {
    const alpha = Math.max(0, 1 - imp.age / persistence);
    const px = w / 2 + imp.z * scaleX,
      py = h / 2 - imp.y * scaleY;
    const r = 4 + (1 - alpha) * 5;
    const glow = screenCtx.createRadialGradient(px, py, 0, px, py, r * 1.5);
    glow.addColorStop(0, `rgba(180,255,140,${Number(alpha)})`);
    glow.addColorStop(0.2, `rgba(60,255,60,${alpha * 0.8})`);
    glow.addColorStop(0.5, `rgba(0,200,30,${alpha * 0.35})`);
    glow.addColorStop(1, "rgba(0,200,30,0)");
    screenCtx.fillStyle = glow;
    screenCtx.beginPath();
    screenCtx.arc(px, py, r * 1.5, 0, Math.PI * 2);
    screenCtx.fill();
    screenCtx.fillStyle = `rgba(200,255,180,${alpha})`;
    screenCtx.beginPath();
    screenCtx.arc(px, py, r * 0.3, 0, Math.PI * 2);
    screenCtx.fill();
  }
  screenCtx.strokeStyle = "rgba(100,170,240,0.5)";
  screenCtx.lineWidth = 2;
  screenCtx.strokeRect(margin, margin, sw, sh);
  screenTexture.needsUpdate = true;
}

// ============================================================
// Build electrode plates
// ============================================================
function createPlateMaterial(polarity: number) {
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
    const r = 0.27 + intensity * 0.4;
    const g = 0.33 - intensity * 0.13;
    const b = 0.4 - intensity * 0.2;
    const er = intensity * 0.1;
    return new THREE.MeshPhongMaterial({
      color: new THREE.Color(r, g, b),
      emissive: new THREE.Color(er, 0, 0),
      specular,
      shininess,
      transparent: true,
      opacity,
      depthWrite: false,
    });
  }
  // Pastel blue for negative
  const r = 0.27 - intensity * 0.07;
  const g = 0.33 - intensity * 0.13;
  const bl = 0.4 + intensity * 0.3;
  const eb = intensity * 0.1;
  return new THREE.MeshPhongMaterial({
    color: new THREE.Color(r, g, bl),
    emissive: new THREE.Color(0, 0, eb),
    specular,
    shininess,
    transparent: true,
    opacity,
    depthWrite: false,
  });
}

function buildPlates() {
  if (!THREE) return;
  const pw = PLATE_W * 2,
    ph = YY_E - YY_S,
    pd = 2;
  const yGeom = new THREE.BoxGeometry(ph, pd, pw);
  plateYY_top = new THREE.Mesh(yGeom, createPlateMaterial(0));
  plateYY_top.position.set((YY_S + YY_E) / 2, PLATE_GAP, 0);
  plateYY_bot = new THREE.Mesh(yGeom, createPlateMaterial(0));
  plateYY_bot.position.set((YY_S + YY_E) / 2, -PLATE_GAP, 0);
  const xGeom = new THREE.BoxGeometry(XX_E - XX_S, pw, pd);
  plateXX_left = new THREE.Mesh(xGeom, createPlateMaterial(0));
  plateXX_left.position.set((XX_S + XX_E) / 2, 0, -PLATE_GAP);
  plateXX_right = new THREE.Mesh(xGeom, createPlateMaterial(0));
  plateXX_right.position.set((XX_S + XX_E) / 2, 0, PLATE_GAP);
}

function updatePlateColor(material: any, polarity: number): void {
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
}

function updatePlateColors() {
  if (!THREE) return;
  const s = scenarios[curSc];
  const vy = s.Vy(gPhase),
    vx = s.Vx(gPhase);
  updatePlateColor(plateYY_top.material, vy);
  updatePlateColor(plateYY_bot.material, -vy);
  updatePlateColor(plateXX_left.material, vx);
  updatePlateColor(plateXX_right.material, -vx);
}

// ============================================================
// Electron gun
// ============================================================
function buildGunMesh() {
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
}

// ============================================================
// Beam rendering
// ============================================================
// Pre-allocate reusable materials
let beamGlowMat: any = null;
let beamCoreMat: any = null;
let beamGlowSphereGeom: any = null;
let beamGlowSphereMat: any = null;
let beamCoreSphereGeom: any = null;
let beamCoreSphereMat: any = null;

function initBeamMaterials() {
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
  beamGlowSphereGeom = new THREE.SphereGeometry(5, 8, 8);
  beamGlowSphereMat = new THREE.MeshBasicMaterial({
    color: 0x30ff40,
    transparent: true,
    opacity: 0.25,
    depthTest: false,
  });
  beamCoreSphereGeom = new THREE.SphereGeometry(2, 8, 8);
  beamCoreSphereMat = new THREE.MeshBasicMaterial({
    color: 0xb0ffb0,
    transparent: true,
    opacity: 1,
    depthTest: false,
  });
}

function updateBeamGroup() {
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
    const points: import("three").Vector3[] = [];
    for (const t of e.trail) points.push(new THREE.Vector3(t.x, t.y, t.z));

    // Glow line
    const glowGeom = new THREE.BufferGeometry().setFromPoints(points);
    beamGroup.add(new THREE.Line(glowGeom, beamGlowMat));

    // Core line
    const coreGeom = new THREE.BufferGeometry().setFromPoints(points);
    beamGroup.add(new THREE.Line(coreGeom, beamCoreMat));

    // Electron head glow
    const glowSphere = new THREE.Mesh(beamGlowSphereGeom, beamGlowSphereMat);
    glowSphere.position.set(e.x, e.y, e.z);
    beamGroup.add(glowSphere);

    // Electron core
    const sphere = new THREE.Mesh(beamCoreSphereGeom, beamCoreSphereMat);
    sphere.position.set(e.x, e.y, e.z);
    beamGroup.add(sphere);
  }
}

// ============================================================
// Labels
// ============================================================
function buildLabels() {
  if (!THREE) return null;
  const group = new THREE.Group();

  function addLabel(text: string, x: number, y: number, z: number, color: string) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.font = "bold 64px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(x, y, z);
    sprite.scale.set(24, 12, 1);
    group.add(sprite);
  }

  const ym = (YY_S + YY_E) / 2,
    xm = (XX_S + XX_E) / 2;
  addLabel("Y", ym, PLATE_GAP + 18, 0, "#8ab4f8");
  addLabel("Y'", ym, -PLATE_GAP - 18, 0, "#8ab4f8");
  addLabel("X'", xm, 0, PLATE_GAP + 18, "#8ab4f8");
  addLabel("X", xm, 0, -PLATE_GAP - 18, "#8ab4f8");
  addLabel("电子枪", 40, -16, 0, "#6a8aa8");
  addLabel("荧光屏", SCR_X, -112, 0, "#5a7a9c");
  return group;
}

// ============================================================
// Physics simulation
// ============================================================
function spawnElectron() {
  electrons.push({
    x: GUN_X,
    y: 0,
    z: 0,
    vx: VX,
    vy: 0,
    vz: 0,
    bp: gPhase,
    sVy: null,
    sVx: 0,
    trail: [],
    alive: true,
  });
}

function updateElectrons() {
  for (const e of electrons) {
    if (!e.alive) continue;
    if (e.sVy == null) {
      e.sVy = scenarios[curSc].Vy(e.bp);
      e.sVx = scenarios[curSc].Vx(e.bp);
    }
    e.trail.push({ x: e.x, y: e.y, z: e.z });
    if (e.trail.length > TRAIL) e.trail.shift();
    if (e.x >= YY_S && e.x <= YY_E) e.vy += e.sVy * AY_S;
    if (e.x >= XX_S && e.x <= XX_E) e.vz -= e.sVx * AX_S;
    e.x += e.vx;
    e.y += e.vy;
    e.z += e.vz;
    if (e.x >= SCR_X) {
      impacts.push({ y: e.y, z: e.z, age: 0 });
      e.alive = false;
    }
    if (Math.abs(e.y) > 150 || Math.abs(e.z) > 150) e.alive = false;
  }
  electrons = electrons.filter((e) => e.alive);
  for (const imp of impacts) imp.age += 1;
  impacts = impacts.filter((imp) => imp.age < persistence);
}

// ============================================================
// 2D Screen inset
// ============================================================
function drawScreenInset() {
  const canvas = screenInsetRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width,
    h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#060a12";
  ctx.fillRect(0, 0, w, h);
  const margin = 50,
    sw = w - 2 * margin,
    sh = h - 2 * margin,
    cx = w / 2,
    cy = h / 2;
  ctx.strokeStyle = "rgba(74,144,217,0.18)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 8; i++) {
    const gx = margin + (sw / 8) * i,
      gy = margin + (sh / 8) * i;
    ctx.beginPath();
    ctx.moveTo(gx, margin);
    ctx.lineTo(gx, margin + sh);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(margin, gy);
    ctx.lineTo(margin + sw, gy);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(138,180,248,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, margin);
  ctx.lineTo(cx, margin + sh);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(margin, cy);
  ctx.lineTo(margin + sw, cy);
  ctx.stroke();
  const scaleX = sw / 200,
    scaleY = sh / 200;
  for (const imp of impacts) {
    const alpha = Math.max(0, 1 - imp.age / persistence);
    const px = cx - imp.z * scaleX,
      py = cy - imp.y * scaleY;
    const r = 4 + (1 - alpha) * 5;
    const glow = ctx.createRadialGradient(px, py, 0, px, py, r * 2);
    glow.addColorStop(0, `rgba(180,255,140,${Number(alpha)})`);
    glow.addColorStop(0.2, `rgba(60,255,60,${alpha * 0.8})`);
    glow.addColorStop(0.5, `rgba(0,200,30,${alpha * 0.35})`);
    glow.addColorStop(1, "rgba(0,200,30,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(px, py, r * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(200,255,180,${alpha})`;
    ctx.beginPath();
    ctx.arc(px, py, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(100,170,240,0.4)";
  ctx.lineWidth = 2;
  ctx.strokeRect(margin, margin, sw, sh);
}

// ============================================================
// 2D U-t charts
// ============================================================
function drawUtChart(
  canvasRef: HTMLCanvasElement | null,
  voltageFunc: (p: number) => number,
  color: string,
  currentPhase: number,
) {
  if (!canvasRef) return;
  const rect = canvasRef.getBoundingClientRect();
  const dw = Math.floor(rect.width),
    dh = Math.floor(rect.height);
  if (dw <= 0 || dh <= 0) return;
  if (canvasRef.width !== dw || canvasRef.height !== dh) {
    canvasRef.width = dw;
    canvasRef.height = dh;
  }
  const w = canvasRef.width,
    h = canvasRef.height;
  const ctx = canvasRef.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  const pad = { top: 16, bottom: 16, left: 4, right: 4 };
  const gw = w - pad.left - pad.right,
    gh = h - pad.top - pad.bottom;
  const centerY = pad.top + gh / 2;
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
  const maxAmp = gh / 2 - 4;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  const step = Math.max(1, Math.floor(gw / 180));
  let first = true;
  for (let i = 0; i < gw; i += step) {
    const v = voltageFunc(currentPhase - (gw - i) * 1.5);
    const x = pad.left + i,
      y = centerY - v * maxAmp;
    if (first) {
      ctx.moveTo(x, y);
      first = false;
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}

// ============================================================
// Scene init
// ============================================================
async function initScene() {
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
  camera.position.set(-200, 80, 320);
  camera.lookAt(220, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(containerRef.value.clientWidth, containerRef.value.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  containerRef.value.append(renderer.domElement);

  orbit = new OrbitControlsClass(camera, renderer.domElement);
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
  for (const [x, y, z, i] of lights) {
    const l = new THREE.DirectionalLight(0xccddff, i);
    l.position.set(x, y, z);
    scene.add(l);
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
}

// ============================================================
// Animation loop
// ============================================================
function animate() {
  animFrame = requestAnimationFrame(animate);
  if (!THREE || !renderer || !scene || !camera) return;

  if (!isPaused) {
    spawnT += 1;
    if (spawnT >= SPAWN_INT) {
      spawnElectron();
      spawnT = 0;
    }
    updateElectrons();
    gPhase += 1;
  }

  updatePlateColors();
  updateBeamGroup();
  updateScreenTexture();
  drawScreenInset();

  const s = scenarios[curSc];
  drawUtChart(utYYRef.value, s.Vy, "#ff8a80", gPhase);
  drawUtChart(utXXRef.value, s.Vx, "#82b1ff", gPhase);

  if (orbit) orbit.update();
  renderer.render(scene, camera);
}

function onResize() {
  if (!THREE || !camera || !renderer || !containerRef.value) return;
  camera.aspect = containerRef.value.clientWidth / containerRef.value.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(containerRef.value.clientWidth, containerRef.value.clientHeight);
}

// ============================================================
// Reactive state
// ============================================================
const scenarioName = ref(scenarios[0].name);
const scenarioSub = ref(scenarios[0].sub);
const scenarioDesc = ref(scenarios[0].desc);
const showCustomControls = ref(false);
const showVoltageDisplay = ref(true);
const vyLabel = ref(scenarios[0].vyI);
const vxLabel = ref(scenarios[0].vxI);
const persistenceVal = ref("90帧");
const cYMode = ref(0),
  cYAmp = ref(0.8),
  cYAmpValDisplay = ref("0.8");
const cXMode = ref(0),
  cXAmp = ref(0.8),
  cXAmpValDisplay = ref("0.8");

function setScenario(i: number): void {
  curSc = i;
  electrons = [];
  impacts = [];
  gPhase = 0;
  const s = scenarios[i];
  scenarioName.value = s.name;
  scenarioSub.value = s.sub;
  scenarioDesc.value = s.desc;
  if (s.isCustom) {
    showVoltageDisplay.value = false;
    showCustomControls.value = true;
  } else {
    showVoltageDisplay.value = true;
    showCustomControls.value = false;
    vyLabel.value = s.vyI;
    vxLabel.value = s.vxI;
  }
}
function updatePersistence(val: number): void {
  persistence = val;
  persistenceVal.value = `${val}帧`;
}
function updateCustomParams(): void {
  customParams.yMode = cYMode.value;
  customParams.xMode = cXMode.value;
  customParams.yAmp = cYAmp.value;
  customParams.xAmp = cXAmp.value;
  cYAmpValDisplay.value = cYAmp.value.toFixed(1);
  cXAmpValDisplay.value = cXAmp.value.toFixed(1);
  electrons = [];
  impacts = [];
}
function resetView(): void {
  orbit.target.set(220, 0, 0);
  camera.position.set(-200, 80, 320);
  camera.lookAt(220, 0, 0);
  orbit.update();
}
function viewFront(): void {
  orbit.target.set(220, 0, 0);
  camera.position.set(220, 0, 500);
  camera.lookAt(220, 0, 0);
  orbit.update();
}
function viewSide(): void {
  orbit.target.set(220, 0, 0);
  camera.position.set(220, 500, 0);
  camera.lookAt(220, 0, 0);
  orbit.update();
}
function viewTop(): void {
  orbit.target.set(220, 0, 0);
  camera.position.set(220, 500, 1);
  camera.lookAt(220, 0, 0);
  orbit.update();
}

// ============================================================
// Keyboard
// ============================================================
function onKeydown(e: KeyboardEvent): void {
  if (e.key === "ArrowRight" || e.key === "ArrowDown") {
    setScenario((curSc + 1) % 12);
  } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
    setScenario((curSc - 1 + 12) % 12);
  } else if (e.key === " ") {
    e.preventDefault();
    isPaused = !isPaused;
  }
}

// ============================================================
// Lifecycle
// ============================================================
onMounted(async () => {
  await nextTick();
  document.addEventListener("keydown", onKeydown);
  window.addEventListener("resize", onResize);
  if (screenInsetRef.value) {
    screenInsetRef.value.width = 460;
    screenInsetRef.value.height = 460;
  }
  setScenario(0);
  initScene().then(() => animate());
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown);
  window.removeEventListener("resize", onResize);
  cancelAnimationFrame(animFrame);
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

    <nav
      class="px-5 py-2 flex flex-wrap gap-1.5 bg-[#0c121c]/95 border-b border-blue-900/10 shrink-0 z-10"
    >
      <button
        v-for="(s, i) in scenarios"
        :key="i"
        :class="[
          'px-3.5 py-2 rounded-2xl text-sm cursor-pointer transition-all whitespace-nowrap border',
          curSc === i
            ? s.isCustom
              ? 'bg-gradient-to-br from-amber-600 to-amber-700 border-amber-500 text-white font-semibold shadow-[0_0_12px_rgba(245,158,11,0.35)]'
              : 'bg-gradient-to-br from-blue-600 to-blue-700 border-blue-500 text-white font-semibold shadow-[0_0_12px_rgba(37,99,235,0.35)]'
            : s.isCustom
              ? 'bg-blue-950/75 border-amber-500/35 text-amber-400 hover:bg-blue-900/80 hover:text-white hover:border-amber-500/50'
              : 'bg-blue-950/75 border-blue-400/20 text-slate-400 hover:bg-blue-900/80 hover:text-white hover:border-blue-400/35',
        ]"
        @click="setScenario(i)"
      >
        {{ i + 1 }}. {{ s.name }}
      </button>
    </nav>

    <main class="flex-1 flex gap-3 px-5 py-3 min-h-0">
      <!-- 3D view with floating overlays -->
      <div
        ref="containerRef"
        class="flex-1 relative bg-[#0a0f19]/60 rounded-xl border border-blue-400/15 overflow-hidden min-w-0"
      >
        <!-- Info overlay: top-left -->
        <div class="absolute top-3 left-3 z-20 max-w-[55%] pointer-events-none">
          <div class="text-amber-400 text-xl font-bold leading-tight">{{ scenarioName }}</div>
          <div class="text-slate-400 text-sm mt-0.5">{{ scenarioSub }}</div>
          <div class="text-slate-400 text-sm mt-1 leading-snug max-w-md">{{ scenarioDesc }}</div>
        </div>

        <!-- Controls overlay: bottom-left -->
        <div
          class="absolute bottom-3 left-3 z-20 bg-[#0c121c]/92 border border-blue-400/20 rounded-xl p-4 backdrop-blur-md min-w-72"
        >
          <div v-if="showVoltageDisplay" class="flex flex-col gap-2 mb-3">
            <div class="flex items-center gap-3 text-sm">
              <span class="text-slate-400 font-semibold w-14 shrink-0">YY' 电极</span>
              <span
                class="font-semibold font-mono bg-blue-400/10 px-3 py-1 rounded border text-red-300 border-red-300/30"
                >{{ vyLabel }}</span
              >
            </div>
            <div class="flex items-center gap-3 text-sm">
              <span class="text-slate-400 font-semibold w-14 shrink-0">XX' 电极</span>
              <span
                class="font-semibold font-mono bg-blue-400/10 px-3 py-1 rounded border text-blue-300 border-blue-300/30"
                >{{ vxLabel }}</span
              >
            </div>
          </div>

          <div class="flex items-center gap-3 text-sm">
            <span class="text-slate-400 font-semibold w-14 shrink-0">余晖</span>
            <input
              type="range"
              min="20"
              max="300"
              :value="persistence"
              step="10"
              class="flex-1 h-1.5 appearance-none bg-blue-400/20 rounded-sm outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#4a90d9] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
              @input="updatePersistence(Number(($event.target as HTMLInputElement).value))"
            />
            <span class="text-amber-400 text-sm min-w-12 text-right font-mono">{{
              persistenceVal
            }}</span>
          </div>

          <div
            v-if="showCustomControls"
            class="flex flex-col gap-2 mt-3 pt-3 border-t border-blue-400/15"
          >
            <div class="flex items-center gap-2">
              <span class="text-slate-400 font-semibold text-sm w-10 shrink-0">YY'</span>
              <select
                v-model.number="cYMode"
                class="bg-[#0a0f1a]/80 border border-blue-400/30 text-slate-300 px-2 py-1 rounded text-sm outline-none"
                @change="updateCustomParams()"
              >
                <option :value="0">关闭</option>
                <option :value="1">恒定</option>
                <option :value="2">正弦</option>
                <option :value="3">锯齿</option>
              </select>
              <span class="text-slate-500 text-xs w-8">幅度</span>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.1"
                v-model.number="cYAmp"
                class="flex-1 min-w-12 h-1.5 appearance-none bg-blue-400/20 rounded-sm outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#4a90d9] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
                @input="updateCustomParams()"
              />
              <span class="text-slate-400 text-xs w-8 font-mono">{{ cYAmpValDisplay }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-slate-400 font-semibold text-sm w-10 shrink-0">XX'</span>
              <select
                v-model.number="cXMode"
                class="bg-[#0a0f1a]/80 border border-blue-400/30 text-slate-300 px-2 py-1 rounded text-sm outline-none"
                @change="updateCustomParams()"
              >
                <option :value="0">关闭</option>
                <option :value="1">恒定</option>
                <option :value="2">正弦</option>
                <option :value="3">锯齿</option>
              </select>
              <span class="text-slate-500 text-xs w-8">幅度</span>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.1"
                v-model.number="cXAmp"
                class="flex-1 min-w-12 h-1.5 appearance-none bg-blue-400/20 rounded-sm outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#4a90d9] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
                @input="updateCustomParams()"
              />
              <span class="text-slate-400 text-xs w-8 font-mono">{{ cXAmpValDisplay }}</span>
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
