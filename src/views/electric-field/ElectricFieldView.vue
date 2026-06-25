<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, nextTick } from "vue";

import Copyright from "@/components/Copyright.vue";
import NavBar from "@/components/NavBar.vue";

// ============================================================
// Canvas container ref
// ============================================================
const containerRef = ref<HTMLDivElement | null>(null);

// ============================================================
// Lazy-load Three.js
// ============================================================
let THREE: typeof import("three") | null = null;
let OrbitControls: new (...args: unknown[]) => unknown | null = null;

const loadThree = async (): Promise<void> => {
  const [threeModule, orbitModule] = await Promise.all([
    import("three"),
    import("three/examples/jsm/controls/OrbitControls.js"),
  ]);
  THREE = threeModule;
  ({ OrbitControls } = orbitModule);
};

// ============================================================
// Scene objects (typed as any since Three types are lazily loaded)
// ============================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let scene: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let camera: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let renderer: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let orbitControls: any = null;
let animFrame = 0;
let needsUpdate = true;

// ============================================================
// Physics module (doesn't need Three types for logic)
// ============================================================
const Physics = {
  // 库仑常数 k = 1/(4πε₀) ≈ 8.99×10⁹ N·m²/C²（使用约化单位）
  k: 8.99,

  electricField(
    point: { distanceTo: (point: unknown) => number; clone: () => unknown },
    charges: { position: unknown; charge: number }[],
  ): THREE.Vector3 {
    if (!THREE) return new THREE.Vector3(0, 0, 0);
    // 叠加所有电荷在该点的电场贡献：E = Σ kqᵢ r̂ᵢ / rᵢ²
    const eField = new THREE.Vector3(0, 0, 0);
    for (const charge of charges) {
      const rVec = new THREE.Vector3().subVectors(
        point as THREE.Vector3,
        charge.position as THREE.Vector3,
      );
      const dist = rVec.length();
      if (dist < 0.3) continue;
      const magnitude = (this.k * charge.charge) / (dist * dist);
      rVec.normalize().multiplyScalar(magnitude);
      eField.add(rVec);
    }
    return eField;
  },

  potential(
    point: { distanceTo: (point: unknown) => number },
    charges: { position: unknown; charge: number }[],
  ): number {
    // 叠加所有电荷在该点的电势：V = Σ kqᵢ / rᵢ
    let potential = 0;
    for (const charge of charges) {
      const dist = (point as { distanceTo: (point: unknown) => number }).distanceTo(
        charge.position,
      );
      if (dist < 0.2) return charge.charge > 0 ? 1e6 : -1e6;
      potential += (this.k * charge.charge) / dist;
    }
    return potential;
  },

  // eslint-disable-next-line max-params -- 电场线追踪需要这5个独立参数
  traceFieldLine(
    startPos: unknown,
    charges: { position: unknown; charge: number }[],
    direction: number,
    maxSteps: number,
    stepSize: number,
  ): unknown[] {
    if (!THREE) return [];
    const points: unknown[] = [];
    const pos = (startPos as THREE.Vector3).clone();
    points.push(pos.clone());

    for (let i = 0; i < maxSteps; i++) {
      const eField = this.electricField(pos, charges);
      const eMag = eField.length();
      if (eMag < 0.001) break;
      eField.normalize().multiplyScalar(stepSize * direction);
      pos.add(eField);
      // 超出显示范围则停止追踪
      if (pos.length() > 20) break;
      let tooClose = false;
      for (const charge of charges) {
        if (pos.distanceTo(charge.position as THREE.Vector3) < 0.35) {
          tooClose = true;
          points.push(pos.clone());
          break;
        }
      }
      if (tooClose) break;
      points.push(pos.clone());
    }
    return points;
  },
};

// ============================================================
// 全局状态
// ============================================================
// 电荷数据（位置、电量）
const chargeData: { charge: number; position: unknown }[] = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chargeMeshes: any[] = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let fieldLineGroup: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let arrowGroup: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let equipGroup: any = null;

// 电场线组数（均匀分布方向数 = fieldLineCount²）
let fieldLineCount = 6;
// 是否显示方向箭头
let showArrows = true;
// 等势面数量
let equipCount = 6;
// 等势面透明度
let equipOpacity = 0.2;
// 是否显示等势面
let showEquipotential = true;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let draggedCharge: any = null;
// 是否正在拖拽电荷
let isDraggingCharge = false;
// 是否处于放置试探电荷模式
let placingTestCharge = false;
// 试探电荷是否活跃
let testChargeActive = false;
// 试探电荷电量
let testChargeQ = 1;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let testChargeMesh: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let testChargeTrail: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let testChargeData: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let testChargeVelocity: any = null;
const testChargeTrailPoints: unknown[] = [];

// ============================================================
// Marching Cubes 等值面提取查找表
// MC_EDGE_TABLE: 256 种立方体配置 → 12 条边上的交点位掩码
// ============================================================
const MC_EDGE_TABLE = [
  0x0, 0x109, 0x203, 0x30a, 0x406, 0x50f, 0x605, 0x70c, 0x80c, 0x905, 0xa0f, 0xb06, 0xc0a, 0xd03,
  0xe09, 0xf00, 0x190, 0x99, 0x393, 0x29a, 0x596, 0x49f, 0x795, 0x69c, 0x99c, 0x895, 0xb9f, 0xa96,
  0xd9a, 0xc93, 0xf99, 0xe90, 0x230, 0x339, 0x33, 0x13a, 0x636, 0x73f, 0x435, 0x53c, 0xa3c, 0xb35,
  0x83f, 0x936, 0xe3a, 0xf33, 0xc39, 0xd30, 0x3a0, 0x2a9, 0x1a3, 0xaa, 0x7a6, 0x6af, 0x5a5, 0x4ac,
  0xbac, 0xaa5, 0x9af, 0x8a6, 0xfaa, 0xea3, 0xda9, 0xca0, 0x460, 0x569, 0x663, 0x76a, 0x66, 0x16f,
  0x265, 0x36c, 0xc6c, 0xd65, 0xe6f, 0xf66, 0x86a, 0x963, 0xa69, 0xb60, 0x5f0, 0x4f9, 0x7f3, 0x6fa,
  0x1f6, 0xff, 0x3f5, 0x2fc, 0xdfc, 0xcf5, 0xfff, 0xef6, 0x9fa, 0x8f3, 0xbf9, 0xaf0, 0x650, 0x759,
  0x453, 0x55a, 0x256, 0x35f, 0x55, 0x15c, 0xe5c, 0xf55, 0xc5f, 0xd56, 0xa5a, 0xb53, 0x859, 0x950,
  0x7c0, 0x6c9, 0x5c3, 0x4ca, 0x3c6, 0x2cf, 0x1c5, 0xcc, 0xfcc, 0xec5, 0xdcf, 0xcc6, 0xbca, 0xac3,
  0x9c9, 0x8c0, 0x8c0, 0x9c9, 0xac3, 0xbca, 0xcc6, 0xdcf, 0xec5, 0xfcc, 0xcc, 0x1c5, 0x2cf, 0x3c6,
  0x4ca, 0x5c3, 0x6c9, 0x7c0, 0x950, 0x859, 0xb53, 0xa5a, 0xd56, 0xc5f, 0xf55, 0xe5c, 0x15c, 0x55,
  0x35f, 0x256, 0x55a, 0x453, 0x759, 0x650, 0xaf0, 0xbf9, 0x8f3, 0x9fa, 0xef6, 0xfff, 0xcf5, 0xdfc,
  0x2fc, 0x3f5, 0xff, 0x1f6, 0x6fa, 0x7f3, 0x4f9, 0x5f0, 0xb60, 0xa69, 0x963, 0x86a, 0xf66, 0xe6f,
  0xd65, 0xc6c, 0x36c, 0x265, 0x16f, 0x66, 0x76a, 0x663, 0x569, 0x460, 0xca0, 0xda9, 0xea3, 0xfaa,
  0x8a6, 0x9af, 0xaa5, 0xbac, 0x4ac, 0x5a5, 0x6af, 0x7a6, 0xaa, 0x1a3, 0x2a9, 0x3a0, 0xd30, 0xc39,
  0xf33, 0xe3a, 0x936, 0x83f, 0xb35, 0xa3c, 0x53c, 0x435, 0x73f, 0x636, 0x13a, 0x33, 0x339, 0x230,
  0xe90, 0xf99, 0xc93, 0xd9a, 0xa96, 0xb9f, 0x895, 0x99c, 0x69c, 0x795, 0x49f, 0x596, 0x29a, 0x393,
  0x99, 0x190, 0xf00, 0xe09, 0xd03, 0xc0a, 0xb06, 0xa0f, 0x905, 0x80c, 0x70c, 0x605, 0x50f, 0x406,
  0x30a, 0x203, 0x109, 0x0,
];

// MC_TRI_TABLE: 每种配置的三角形顶点索引列表（以 -1 结束）
const MC_TRI_TABLE: number[][] = Array.from({ length: 256 }, () => []);

// ============================================================
// Setup scene — 被调用者必须在调用者之前定义
// ============================================================
const createChargeMaterial = (chargeValue: number): THREE.MeshPhongMaterial | null => {
  if (!THREE) return null;
  if (chargeValue > 0) {
    return new THREE.MeshPhongMaterial({
      color: 0xdd4444,
      emissive: 0x330808,
      specular: 0x888888,
      shininess: 60,
      transparent: true,
      opacity: 0.92,
    });
  }
  if (chargeValue < 0) {
    return new THREE.MeshPhongMaterial({
      color: 0x4466dd,
      emissive: 0x081133,
      specular: 0x888888,
      shininess: 60,
      transparent: true,
      opacity: 0.92,
    });
  }
  return new THREE.MeshPhongMaterial({
    color: 0x888888,
    emissive: 0x222222,
    specular: 0x666666,
    shininess: 40,
    transparent: true,
    opacity: 0.92,
  });
};

const createChargeLabel = (chargeValue: number): THREE.Sprite | null => {
  if (!THREE) return null;
  // 标签画布：128×128，白色粗体
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, 128, 128);
  ctx.font = "bold 80px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(chargeValue > 0 ? "+" : chargeValue < 0 ? "−" : "0", 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(0.6, 0.6, 1);
  return sprite;
};

const buildChargeMeshes = (): void => {
  if (!THREE || !scene) return;
  chargeMeshes.forEach((mesh) => scene.remove(mesh));
  chargeMeshes.length = 0;

  // 电荷球体半径 0.35，32 段细分
  const chargeGeom = new THREE.SphereGeometry(0.35, 32, 32);

  for (let i = 0; i < chargeData.length; i++) {
    const charge = chargeData[i];
    const mesh = new THREE.Mesh(chargeGeom, createChargeMaterial(charge.charge));
    mesh.position.copy(charge.position as THREE.Vector3);
    mesh.userData.chargeIndex = i;
    scene.add(mesh);
    chargeMeshes.push(mesh);

    const label = createChargeLabel(charge.charge);
    label.position.set(0, 0, 0);
    mesh.add(label);
  }
};

const updateChargeMaterials = (): void => {
  if (!THREE) return;
  for (let i = 0; i < chargeData.length; i++) {
    chargeMeshes[i].material = createChargeMaterial(chargeData[i].charge);
    if (chargeMeshes[i].children.length > 0) chargeMeshes[i].remove(chargeMeshes[i].children[0]);
    chargeMeshes[i].add(createChargeLabel(chargeData[i].charge));
  }
};

// ============================================================
// Field lines
// ============================================================
const buildFieldLines = (): void => {
  if (!THREE || !scene || !fieldLineGroup || !arrowGroup) return;
  // Dispose old
  while (fieldLineGroup.children.length > 0) {
    const [child] = fieldLineGroup.children;
    fieldLineGroup.remove(child);
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
  }
  while (arrowGroup.children.length > 0) {
    const [child] = arrowGroup.children;
    arrowGroup.remove(child);
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
  }

  const positiveCharges = chargeData.filter((charge) => charge.charge > 0);
  const negativeCharges = chargeData.filter((charge) => charge.charge < 0);
  if (positiveCharges.length === 0 && negativeCharges.length === 0) return;
  const startCharges = positiveCharges.length > 0 ? positiveCharges : negativeCharges;
  const lineDir = positiveCharges.length > 0 ? 1 : -1;
  const startRadius = 0.45;

  // 最大电荷量，用于按比例分配电场线数
  const maxQ = Math.max(...chargeData.map((charge) => Math.abs(charge.charge)), 1);
  // 基准线数 = fieldLineCount²，保证密度合理
  const baseLineCount = fieldLineCount * fieldLineCount;
  // 黄金角度 = π(3-√5)，用于 Fibonacci 球面均匀分布
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (const startCharge of startCharges) {
    // 电场线数与电荷量成正比（最少 4 条）
    const nLines = Math.max(4, Math.round((baseLineCount * Math.abs(startCharge.charge)) / maxQ));

    for (let i = 0; i < nLines; i++) {
      // Fibonacci sphere: 球面上均匀分布采样
      // y ∈ [-1, 1] 均匀分布，保证立体角均匀
      const y = 1 - (2 * (i + 0.5)) / nLines;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = goldenAngle * i;

      const chargePos = startCharge.position as THREE.Vector3;
      const startPos = new THREE.Vector3(
        chargePos.x + startRadius * radiusAtY * Math.cos(theta),
        chargePos.y + startRadius * y,
        chargePos.z + startRadius * radiusAtY * Math.sin(theta),
      );

      const points = Physics.traceFieldLine(startPos, chargeData, lineDir, 500, 0.12);
      if (points.length < 2) continue;
      const curve = new THREE.CatmullRomCurve3(points as THREE.Vector3[]);
      const tubePoints = curve.getPoints(Math.min(points.length * 2, 200));
      const geometry = new THREE.BufferGeometry().setFromPoints(tubePoints);
      const colors: number[] = [];
      for (const tubePoint of tubePoints) {
        const eField = Physics.electricField(tubePoint, chargeData);
        const mag = Math.min(eField.length() / 5, 1);
        colors.push(0.3 + mag * 0.7, 0.5 + mag * 0.3, 1 - mag * 0.3);
      }
      geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
      });
      fieldLineGroup.add(new THREE.Line(geometry, material));

      if (showArrows && tubePoints.length > 4) {
        const arrowSpacing = Math.max(Math.floor(tubePoints.length / 4), 3);
        for (
          let arrowIdx = arrowSpacing;
          arrowIdx < tubePoints.length - 2;
          arrowIdx += arrowSpacing
        ) {
          const pos = tubePoints[arrowIdx];
          const nextPos = tubePoints[Math.min(arrowIdx + 1, tubePoints.length - 1)];
          const arrowDir = new THREE.Vector3().subVectors(nextPos, pos).normalize();
          const arrowGeom = new THREE.ConeGeometry(0.08, 0.25, 6);
          const arrowMat = new THREE.MeshPhongMaterial({
            color: 0xffcc44,
            emissive: 0x664400,
            transparent: true,
            opacity: 0.9,
          });
          const arrow = new THREE.Mesh(arrowGeom, arrowMat);
          arrow.position.copy(pos);
          arrow.quaternion.copy(
            new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), arrowDir),
          );
          arrowGroup.add(arrow);
        }
      }
    }
  }
};

// ============================================================
// Marching Cubes 等值面提取
// gridSize: 网格分辨率，extent: 空间范围，step: 网格步长
// ============================================================
// eslint-disable-next-line max-params -- Marching Cubes 需要这5个独立参数
const marchingCubes = (
  vertices: number[],
  isoVal: number,
  gridSize: number,
  extent: number,
  step: number,
): void => {
  if (!THREE) return;
  // 3D 标量场（电势值）
  const size = gridSize + 1;
  const field = new Float32Array(size * size * size);
  for (let ix = 0; ix < size; ix++) {
    for (let iy = 0; iy < size; iy++) {
      for (let iz = 0; iz < size; iz++) {
        const point = new THREE.Vector3(
          -extent + ix * step,
          -extent + iy * step,
          -extent + iz * step,
        );
        let potentialVal = Physics.potential(point, chargeData);
        // 钳位电势值避免极端值
        potentialVal = Math.max(-500, Math.min(500, potentialVal));
        field[ix * size * size + iy * size + iz] = potentialVal;
      }
    }
  }

  // 从标量场中读取 (ix, iy, iz) 处的值
  const getField = (ix: number, iy: number, iz: number): number =>
    field[ix * size * size + iy * size + iz];

  // 获取网格点 (ix, iy, iz) 的空间坐标
  const getPos = (ix: number, iy: number, iz: number): THREE.Vector3 =>
    new THREE.Vector3(-extent + ix * step, -extent + iy * step, -extent + iz * step);

  // 线性插值：在 point1(v1) 和 point2(v2) 之间找到等值点
  const interpolate = (
    point1: THREE.Vector3,
    point2: THREE.Vector3,
    v1: number,
    v2: number,
  ): THREE.Vector3 => {
    if (Math.abs(isoVal - v1) < 1e-10) return point1.clone();
    if (Math.abs(isoVal - v2) < 1e-10) return point2.clone();
    if (Math.abs(v1 - v2) < 1e-10) return point1.clone();
    const frac = (isoVal - v1) / (v2 - v1);
    return new THREE.Vector3(
      point1.x + frac * (point2.x - point1.x),
      point1.y + frac * (point2.y - point1.y),
      point1.z + frac * (point2.z - point1.z),
    );
  };

  for (let ix = 0; ix < gridSize; ix++) {
    for (let iy = 0; iy < gridSize; iy++) {
      for (let iz = 0; iz < gridSize; iz++) {
        // 立方体 8 个顶点的场值
        const vals = [
          getField(ix, iy, iz),
          getField(ix + 1, iy, iz),
          getField(ix + 1, iy, iz + 1),
          getField(ix, iy, iz + 1),
          getField(ix, iy + 1, iz),
          getField(ix + 1, iy + 1, iz),
          getField(ix + 1, iy + 1, iz + 1),
          getField(ix, iy + 1, iz + 1),
        ];
        // 立方体 8 个顶点的空间坐标
        const corners = [
          getPos(ix, iy, iz),
          getPos(ix + 1, iy, iz),
          getPos(ix + 1, iy, iz + 1),
          getPos(ix, iy, iz + 1),
          getPos(ix, iy + 1, iz),
          getPos(ix + 1, iy + 1, iz),
          getPos(ix + 1, iy + 1, iz + 1),
          getPos(ix, iy + 1, iz + 1),
        ];
        // 构建立方体配置索引（8位编码，每位表示对应顶点是否在等值面内）
        let cubeIndex = 0;
        for (let cornerIdx = 0; cornerIdx < 8; cornerIdx++)
          // eslint-disable-next-line no-bitwise -- Marching Cubes 算法需要位运算编码立方体配置
          if (vals[cornerIdx] < isoVal) cubeIndex |= 1 << cornerIdx;
        if (cubeIndex === 0 || cubeIndex === 255) continue;

        // 12 条边的端点对
        const edgePairs = [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 0],
          [4, 5],
          [5, 6],
          [6, 7],
          [7, 4],
          [0, 4],
          [1, 5],
          [2, 6],
          [3, 7],
        ];
        // 在需要插值的边上计算交点
        const edgeVertices = Array.from({ length: 12 }, () => null) as (THREE.Vector3 | null)[];
        const edgeBits = MC_EDGE_TABLE[cubeIndex];
        for (let edgeIdx = 0; edgeIdx < 12; edgeIdx++) {
          // eslint-disable-next-line no-bitwise -- Marching Cubes 算法需要位运算提取边标志
          if (edgeBits & (1 << edgeIdx)) {
            const [a, b] = edgePairs[edgeIdx];
            edgeVertices[edgeIdx] = interpolate(corners[a], corners[b], vals[a], vals[b]);
          }
        }
        // 根据三角形表生成三角形
        const triIndices = MC_TRI_TABLE[cubeIndex];
        for (let triIdx = 0; triIdx < triIndices.length; triIdx += 3) {
          if (triIndices[triIdx] === -1) break;
          const v0 = edgeVertices[triIndices[triIdx]],
            v1 = edgeVertices[triIndices[triIdx + 1]],
            v2 = edgeVertices[triIndices[triIdx + 2]];
          if (v0 && v1 && v2) vertices.push(v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
        }
      }
    }
  }
};

// ============================================================
// Equipotential surfaces
// ============================================================
const buildEquipotentialSurfaces = (): void => {
  if (!THREE || !scene || !equipGroup) return;
  while (equipGroup.children.length > 0) {
    const [child] = equipGroup.children;
    equipGroup.remove(child);
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
  }
  if (!showEquipotential) return;

  const gridSize = 40;
  const extent = 8;
  const step = (2 * extent) / gridSize;
  let vMax = -Infinity;
  let vMin = Infinity;

  for (let ix = 0; ix <= gridSize; ix++) {
    for (let iy = 0; iy <= gridSize; iy++) {
      for (let iz = 0; iz <= gridSize; iz++) {
        const x = -extent + ix * step,
          y = -extent + iy * step,
          z = -extent + iz * step;
        const point = new THREE.Vector3(x, y, z);
        let tooClose = false;
        for (const charge of chargeData) {
          if (point.distanceTo(charge.position as THREE.Vector3) < 0.8) {
            tooClose = true;
            break;
          }
        }

        if (tooClose) continue;
        const potential = Physics.potential(point, chargeData);
        if (Math.abs(potential) < 1e5) {
          if (potential < vMin) vMin = potential;
          if (potential > vMax) vMax = potential;
        }
      }
    }
  }

  const isoValues: number[] = [];
  const numSurfaces = equipCount;
  for (let i = 1; i <= Math.ceil(numSurfaces / 2); i++) {
    const frac = i / (Math.ceil(numSurfaces / 2) + 1);
    if (vMax > 0) isoValues.push(vMax * frac * 0.6);
    if (vMin < 0) isoValues.push(vMin * frac * 0.6);
  }
  if (numSurfaces > 2) isoValues.push(0);

  for (const isoVal of isoValues) {
    const vertices: number[] = [];
    marchingCubes(vertices, isoVal, gridSize, extent, step);
    if (vertices.length < 9) continue;
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geom.computeVertexNormals();
    let color: THREE.Color;
    if (isoVal > 0.1) color = new THREE.Color().setHSL(0, 0.7, 0.5);
    else if (isoVal < -0.1) color = new THREE.Color().setHSL(0.6, 0.7, 0.5);
    else color = new THREE.Color().setHSL(0.3, 0.5, 0.5);
    const mat = new THREE.MeshPhongMaterial({
      color,
      transparent: true,
      opacity: equipOpacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      shininess: 30,
      specular: 0x222244,
    });
    equipGroup.add(new THREE.Mesh(geom, mat));
  }
};

const rebuildAll = (): void => {
  buildFieldLines();
  buildEquipotentialSurfaces();
};

// ============================================================
// Pointer events
// ============================================================
const getMouseNDC = (event: PointerEvent): THREE.Vector2 | undefined => {
  if (!THREE || !renderer) return;
  const rect = renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  return mouse;
};

// ============================================================
// Test charge — 必须在指针事件之前定义
// ============================================================
const clearTestCharge = (): void => {
  if (!THREE || !scene) return;
  if (testChargeMesh) {
    scene.remove(testChargeMesh);
    testChargeMesh.geometry.dispose();
    testChargeMesh.material.dispose();
    testChargeMesh = null;
  }
  if (testChargeTrail) {
    scene.remove(testChargeTrail);
    testChargeTrail.geometry.dispose();
    testChargeTrail.material.dispose();
    testChargeTrail = null;
  }
  testChargeActive = false;
  testChargeData = null;
  testChargeVelocity = null;
  testChargeTrailPoints.length = 0;
};

const placeTestChargeAt = (position: unknown): void => {
  if (!THREE || !scene) return;
  clearTestCharge();
  testChargeData = { charge: testChargeQ, position: (position as THREE.Vector3).clone() };
  testChargeVelocity = new THREE.Vector3(0, 0, 0);
  testChargeTrailPoints.length = 0;
  testChargeTrailPoints.push((position as THREE.Vector3).clone());

  // 试探电荷球体半径 0.2
  const geom = new THREE.SphereGeometry(0.2, 16, 16);
  const color = testChargeQ > 0 ? 0xff8844 : testChargeQ < 0 ? 0x44aaff : 0xaaaaaa;
  const mat = new THREE.MeshPhongMaterial({
    color,
    emissive: testChargeQ > 0 ? 0x663311 : 0x113366,
    transparent: true,
    opacity: 0.9,
  });
  testChargeMesh = new THREE.Mesh(geom, mat);
  testChargeMesh.position.copy(position as THREE.Vector3);
  scene.add(testChargeMesh);

  const trailGeom = new THREE.BufferGeometry().setFromPoints([position as THREE.Vector3]);
  const trailMat = new THREE.LineBasicMaterial({
    color: 0xffaa44,
    transparent: true,
    opacity: 0.7,
  });
  testChargeTrail = new THREE.Line(trailGeom, trailMat);
  scene.add(testChargeTrail);
  testChargeActive = true;
};

// ============================================================
// Pointer events
// ============================================================
const onPointerDown = (event: PointerEvent): void => {
  if (!THREE || !renderer || !camera) return;
  const raycaster = new THREE.Raycaster();
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  if (placingTestCharge) {
    const mouse = getMouseNDC(event);
    if (!mouse) return;
    raycaster.setFromCamera(mouse, camera);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane, intersection);
    if (intersection) {
      placeTestChargeAt(intersection);
      placingTestCharge = false;
    }
    return;
  }

  const mouse = getMouseNDC(event);
  if (!mouse) return;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(chargeMeshes);
  if (intersects.length > 0) {
    isDraggingCharge = true;
    draggedCharge = intersects[0].object;
    if (orbitControls) orbitControls.enabled = false;
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane, intersection);
    (draggedCharge as { userData: { dragOffset: THREE.Vector3 } }).userData.dragOffset =
      new THREE.Vector3().subVectors((draggedCharge as THREE.Object3D).position, intersection);
  }
};

const onPointerMove = (event: PointerEvent): void => {
  if (!THREE || !camera) return;
  const raycaster = new THREE.Raycaster();
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  if (isDraggingCharge && draggedCharge) {
    const mouse = getMouseNDC(event);
    if (!mouse) return;
    raycaster.setFromCamera(mouse, camera);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane, intersection);
    if (intersection) {
      const offset = (draggedCharge as { userData: { dragOffset: THREE.Vector3 } }).userData
        .dragOffset;
      const newPos = intersection.add(offset);
      (draggedCharge as THREE.Object3D).position.copy(newPos);
      const idx = (draggedCharge as { userData: { chargeIndex: number } }).userData.chargeIndex;
      (chargeData[idx].position as THREE.Vector3).copy(newPos);
      needsUpdate = true;
    }
  }
};

const onPointerUp = (_event: PointerEvent): void => {
  if (isDraggingCharge) {
    isDraggingCharge = false;
    draggedCharge = null;
    if (orbitControls) orbitControls.enabled = true;
    rebuildAll();
  }
};

// ============================================================
// Test charge — 物理更新
// ============================================================
const updateTestCharge = (dt: number): void => {
  if (!THREE || !testChargeActive || !testChargeData) return;
  const eField = Physics.electricField(testChargeData.position, chargeData);
  const force = eField.multiplyScalar(testChargeData.charge);
  const mass = 1;
  const accel = force.divideScalar(mass);
  testChargeVelocity.add(accel.multiplyScalar(dt));
  testChargeVelocity.multiplyScalar(0.995);
  const maxSpeed = 8;
  if (testChargeVelocity.length() > maxSpeed)
    testChargeVelocity.normalize().multiplyScalar(maxSpeed);
  testChargeData.position.add(testChargeVelocity.clone().multiplyScalar(dt));

  if ((testChargeData.position as THREE.Vector3).length() > 15) {
    testChargeActive = false;
    return;
  }
  for (const charge of chargeData) {
    if (
      (testChargeData.position as THREE.Vector3).distanceTo(charge.position as THREE.Vector3) < 0.6
    ) {
      testChargeActive = false;
      return;
    }
  }

  testChargeMesh.position.copy(testChargeData.position);
  testChargeTrailPoints.push((testChargeData.position as THREE.Vector3).clone());
  if (testChargeTrailPoints.length > 2000) testChargeTrailPoints.shift();
  if (testChargeTrail) {
    testChargeTrail.geometry.dispose();
    testChargeTrail.geometry = new THREE.BufferGeometry().setFromPoints(
      testChargeTrailPoints as THREE.Vector3[],
    );
  }
};

// ============================================================
// Animation
// ============================================================
const clock = { getDelta: (): number => 0 };

const animate = (): void => {
  animFrame = requestAnimationFrame(animate);
  if (!THREE || !renderer || !scene || !camera) return;

  const dt = Math.min(clock.getDelta ? clock.getDelta() : 0, 0.05);

  if (testChargeActive) {
    const substeps = 4;
    const subDt = dt / substeps;
    for (let subIdx = 0; subIdx < substeps; subIdx++) updateTestCharge(subDt);
  }

  if (isDraggingCharge && needsUpdate) {
    rebuildAll();
    needsUpdate = false;
  }

  if (orbitControls) orbitControls.update();
  renderer.render(scene, camera);
};

// ============================================================
// Init
// ============================================================
const initScene = async (): Promise<void> => {
  await loadThree();
  if (!THREE || !containerRef.value) return;

  // Clock
  const { Clock } = await import("three");
  const realClock = new Clock();
  clock.getDelta = (): number => realClock.getDelta();

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b111a);

  // Camera
  camera = new THREE.PerspectiveCamera(
    55,
    containerRef.value.clientWidth / containerRef.value.clientHeight,
    0.1,
    100,
  );
  camera.position.set(0, 8, 14);
  camera.lookAt(0, 0, 0);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(containerRef.value.clientWidth, containerRef.value.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  containerRef.value.append(renderer.domElement);

  // OrbitControls
  if (OrbitControls) {
    orbitControls = new OrbitControls(camera, renderer.domElement);
    (orbitControls as { enableDamping: boolean }).enableDamping = true;
    (orbitControls as { dampingFactor: number }).dampingFactor = 0.08;
    (orbitControls as { minDistance: number }).minDistance = 3;
    (orbitControls as { maxDistance: number }).maxDistance = 40;
  }

  // Lights
  scene.add(new THREE.AmbientLight(0x334466, 0.6));
  const dirLight = new THREE.DirectionalLight(0xaabbff, 0.8);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);
  const pointLight = new THREE.PointLight(0x5577cc, 0.4, 30);
  pointLight.position.set(-5, 5, -5);
  scene.add(pointLight);

  // Grid
  const gridHelper = new THREE.GridHelper(20, 20, 0x1a2844, 0x0f1a2e);
  gridHelper.position.y = -0.01;
  scene.add(gridHelper);

  // Groups
  fieldLineGroup = new THREE.Group();
  scene.add(fieldLineGroup);
  arrowGroup = new THREE.Group();
  scene.add(arrowGroup);
  equipGroup = new THREE.Group();
  scene.add(equipGroup);

  // Charges
  chargeData.push(
    { charge: 5, position: new THREE.Vector3(-3, 0, 0) },
    { charge: -5, position: new THREE.Vector3(3, 0, 0) },
  );
  buildChargeMeshes();
  rebuildAll();

  // Bind pointer events
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerup", onPointerUp);

  // Start animation
  animate();
};

const onResize = (): void => {
  if (!THREE || !camera || !renderer || !containerRef.value) return;
  camera.aspect = containerRef.value.clientWidth / containerRef.value.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(containerRef.value.clientWidth, containerRef.value.clientHeight);
};

// ============================================================
// Lifecycle
// ============================================================
onMounted(async () => {
  await nextTick();
  window.addEventListener("resize", onResize);
  initScene();
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", onResize);
  cancelAnimationFrame(animFrame);
  if (renderer) {
    renderer.domElement.removeEventListener("pointerdown", onPointerDown);
    renderer.domElement.removeEventListener("pointermove", onPointerMove);
    renderer.domElement.removeEventListener("pointerup", onPointerUp);
    renderer.dispose();
  }
});

// ============================================================
// Reactive controls
// ============================================================
const chargeA = ref(5);
const chargeB = ref(-5);
const fieldLineCountVal = ref(6);
const showArrowsVal = ref(true);
const showEquipVal = ref(true);
const equipCountVal = ref(6);
const equipOpacityVal = ref(0.2);
const testChargeQVal = ref(1);

const formatCharge = (value: number): string => (value >= 0 ? "+" : "") + value.toFixed(1);

const onChargeAChange = (val: number): void => {
  chargeData[0].charge = val;
  updateChargeMaterials();
  rebuildAll();
};
const onChargeBChange = (val: number): void => {
  chargeData[1].charge = val;
  updateChargeMaterials();
  rebuildAll();
};
const onFieldLineCountChange = (val: number): void => {
  fieldLineCount = val;
  buildFieldLines();
};
const onShowArrowsChange = (val: boolean): void => {
  showArrows = val;
  buildFieldLines();
};
const onShowEquipChange = (val: boolean): void => {
  showEquipotential = val;
  buildEquipotentialSurfaces();
};
const onEquipCountChange = (val: number): void => {
  equipCount = val;
  buildEquipotentialSurfaces();
};
const onEquipOpacityChange = (val: number): void => {
  equipOpacity = val;
  if (equipGroup) {
    equipGroup.children.forEach((child: { material?: { opacity: number } }) => {
      if (child.material) child.material.opacity = val;
    });
  }
};
const onTestChargeQChange = (val: number): void => {
  testChargeQ = val;
};
const onPlaceTestCharge = (): void => {
  placingTestCharge = true;
};
const onClearTestCharge = (): void => {
  clearTestCharge();
  placingTestCharge = false;
};
</script>

<template>
  <div class="h-screen flex flex-col bg-[#0a0a1a] text-[#e0e0e0] overflow-hidden">
    <NavBar title="电荷电场与等势面" :gradient="true" />

    <div ref="containerRef" class="flex-1 min-h-0 relative">
      <!-- Control panel overlay -->
      <div
        class="absolute top-3 right-4 w-75 bg-[#0c0e1e]/92 border border-indigo-500/25 rounded-xl z-50 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.5)] max-h-[calc(100%-24px)] overflow-y-auto"
      >
        <!-- Main charge control -->
        <div class="px-4 py-3.5 border-b border-indigo-500/15">
          <h3
            class="text-[13px] font-semibold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"
          >
            <span
              class="inline-block w-[3px] h-3.5 bg-gradient-to-b from-blue-400 to-blue-600 rounded-sm"
            />
            主电荷控制
          </h3>
          <div class="flex items-center justify-between mb-2.5 min-h-7">
            <label class="text-xs text-slate-300 shrink-0 min-w-20">
              <span
                class="inline-block w-2.5 h-2.5 rounded-full mr-1 align-middle bg-red-500 shadow-[0_0_4px_rgba(255,68,68,0.5)]"
              />
              电荷 A
            </label>
            <input
              type="range"
              min="-10"
              max="10"
              step="0.5"
              :value="chargeA"
              class="flex-1 h-1 mx-2 appearance-none bg-indigo-500/20 rounded-sm outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-blue-400 [&::-webkit-slider-thumb]:to-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(90,140,240,0.4)]"
              @input="
                onChargeAChange(Number(($event.target as HTMLInputElement).value));
                chargeA = Number(($event.target as HTMLInputElement).value);
              "
            />
            <span class="text-[11px] text-blue-400 min-w-11 text-right font-mono">{{
              formatCharge(chargeA)
            }}</span>
          </div>
          <div class="flex items-center justify-between min-h-7">
            <label class="text-xs text-slate-300 shrink-0 min-w-20">
              <span
                class="inline-block w-2.5 h-2.5 rounded-full mr-1 align-middle bg-blue-500 shadow-[0_0_4px_rgba(68,136,255,0.5)]"
              />
              电荷 B
            </label>
            <input
              type="range"
              min="-10"
              max="10"
              step="0.5"
              :value="chargeB"
              class="flex-1 h-1 mx-2 appearance-none bg-indigo-500/20 rounded-sm outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-blue-400 [&::-webkit-slider-thumb]:to-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(90,140,240,0.4)]"
              @input="
                onChargeBChange(Number(($event.target as HTMLInputElement).value));
                chargeB = Number(($event.target as HTMLInputElement).value);
              "
            />
            <span class="text-[11px] text-blue-400 min-w-11 text-right font-mono">{{
              formatCharge(chargeB)
            }}</span>
          </div>
        </div>

        <!-- Field line settings -->
        <div class="px-4 py-3.5 border-b border-indigo-500/15">
          <h3
            class="text-[13px] font-semibold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"
          >
            <span
              class="inline-block w-[3px] h-3.5 bg-gradient-to-b from-blue-400 to-blue-600 rounded-sm"
            />
            电场线设置
          </h3>
          <div class="flex items-center justify-between mb-2.5 min-h-7">
            <label class="text-xs text-slate-300 shrink-0 min-w-20">电场线组数</label>
            <input
              type="range"
              min="3"
              max="20"
              step="1"
              :value="fieldLineCountVal"
              class="flex-1 h-1 mx-2 appearance-none bg-indigo-500/20 rounded-sm outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-blue-400 [&::-webkit-slider-thumb]:to-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(90,140,240,0.4)]"
              @input="
                onFieldLineCountChange(Number(($event.target as HTMLInputElement).value));
                fieldLineCountVal = Number(($event.target as HTMLInputElement).value);
              "
            />
            <span class="text-[11px] text-blue-400 min-w-11 text-right font-mono">{{
              fieldLineCountVal
            }}</span>
          </div>
          <div class="flex items-center justify-between min-h-7">
            <label class="text-xs text-slate-300">方向箭头</label>
            <input
              type="checkbox"
              :checked="showArrowsVal"
              class="w-9 h-[18px] rounded-[9px] bg-indigo-500/20 relative cursor-pointer transition-all appearance-none after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-3.5 after:h-3.5 after:rounded-full after:bg-slate-500 after:transition-all checked:bg-indigo-500/50 checked:after:left-5 checked:after:bg-blue-400 checked:after:shadow-[0_0_6px_rgba(90,140,240,0.5)]"
              @change="
                onShowArrowsChange(($event.target as HTMLInputElement).checked);
                showArrowsVal = ($event.target as HTMLInputElement).checked;
              "
            />
          </div>
        </div>

        <!-- Equipotential settings -->
        <div class="px-4 py-3.5 border-b border-indigo-500/15">
          <h3
            class="text-[13px] font-semibold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"
          >
            <span
              class="inline-block w-[3px] h-3.5 bg-gradient-to-b from-blue-400 to-blue-600 rounded-sm"
            />
            等势面设置
          </h3>
          <div class="flex items-center justify-between mb-2.5 min-h-7">
            <label class="text-xs text-slate-300">显示等势面</label>
            <input
              type="checkbox"
              :checked="showEquipVal"
              class="w-9 h-[18px] rounded-[9px] bg-indigo-500/20 relative cursor-pointer transition-all appearance-none after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-3.5 after:h-3.5 after:rounded-full after:bg-slate-500 after:transition-all checked:bg-indigo-500/50 checked:after:left-5 checked:after:bg-blue-400 checked:after:shadow-[0_0_6px_rgba(90,140,240,0.5)]"
              @change="
                onShowEquipChange(($event.target as HTMLInputElement).checked);
                showEquipVal = ($event.target as HTMLInputElement).checked;
              "
            />
          </div>
          <div class="flex items-center justify-between mb-2.5 min-h-7">
            <label class="text-xs text-slate-300 shrink-0 min-w-20">等势面数量</label>
            <input
              type="range"
              min="2"
              max="24"
              step="1"
              :value="equipCountVal"
              class="flex-1 h-1 mx-2 appearance-none bg-indigo-500/20 rounded-sm outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-blue-400 [&::-webkit-slider-thumb]:to-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(90,140,240,0.4)]"
              @input="
                onEquipCountChange(Number(($event.target as HTMLInputElement).value));
                equipCountVal = Number(($event.target as HTMLInputElement).value);
              "
            />
            <span class="text-[11px] text-blue-400 min-w-11 text-right font-mono">{{
              equipCountVal
            }}</span>
          </div>
          <div class="flex items-center justify-between min-h-7">
            <label class="text-xs text-slate-300 shrink-0 min-w-20">透明度</label>
            <input
              type="range"
              min="0.05"
              max="0.6"
              step="0.05"
              :value="equipOpacityVal"
              class="flex-1 h-1 mx-2 appearance-none bg-indigo-500/20 rounded-sm outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-blue-400 [&::-webkit-slider-thumb]:to-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(90,140,240,0.4)]"
              @input="
                onEquipOpacityChange(Number(($event.target as HTMLInputElement).value));
                equipOpacityVal = Number(($event.target as HTMLInputElement).value);
              "
            />
            <span class="text-[11px] text-blue-400 min-w-11 text-right font-mono">{{
              equipOpacityVal.toFixed(2)
            }}</span>
          </div>
        </div>

        <!-- Test charge -->
        <div class="px-4 py-3.5">
          <h3
            class="text-[13px] font-semibold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"
          >
            <span
              class="inline-block w-[3px] h-3.5 bg-gradient-to-b from-blue-400 to-blue-600 rounded-sm"
            />
            试探电荷
          </h3>
          <div class="flex items-center justify-between mb-2.5 min-h-7">
            <label class="text-xs text-slate-300 shrink-0 min-w-20">试探电荷量</label>
            <input
              type="range"
              min="-3"
              max="3"
              step="0.5"
              :value="testChargeQVal"
              class="flex-1 h-1 mx-2 appearance-none bg-indigo-500/20 rounded-sm outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-blue-400 [&::-webkit-slider-thumb]:to-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(90,140,240,0.4)]"
              @input="
                onTestChargeQChange(Number(($event.target as HTMLInputElement).value));
                testChargeQVal = Number(($event.target as HTMLInputElement).value);
              "
            />
            <span class="text-[11px] text-blue-400 min-w-11 text-right font-mono">{{
              formatCharge(testChargeQVal)
            }}</span>
          </div>
          <div class="flex gap-2 mt-1">
            <button
              class="flex-1 py-1.5 px-3.5 border border-indigo-500/30 rounded-md bg-indigo-900/30 text-blue-300 text-xs cursor-pointer transition-all hover:bg-indigo-800/40 hover:border-indigo-400/50 hover:shadow-[0_0_10px_rgba(80,130,240,0.2)]"
              @click="onPlaceTestCharge"
            >
              放置试探电荷
            </button>
            <button
              class="flex-1 py-1.5 px-3.5 border border-red-500/30 rounded-md bg-transparent text-red-400 text-xs cursor-pointer transition-all hover:bg-red-900/30 hover:border-red-400/50"
              @click="onClearTestCharge"
            >
              清除试探电荷
            </button>
          </div>
        </div>
      </div>
    </div>

    <Copyright />
  </div>
</template>
