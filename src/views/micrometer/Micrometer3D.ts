import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { soundManager } from "./micrometerPhysics";
import type { ViewPreset, SampleObject } from "./micrometerPhysics";
import {
  createFrameLabelTexture,
  createSleeveTexture,
  createThimbleBevelTexture,
  createKnurlTexture,
  createRatchetKnurlTexture,
} from "./textureGenerator";

/**
 * Creates custom geometry for the sleeve (固定套管) with exact longitudinal scale alignment. Datum line
 * is at theta = 0 (facing front +Z). Upper ticks (integer mm) point upwards (+Y). Lower ticks (half
 * mm) point downwards (-Y). Scale starts at x = scaleStartX (0 mm) and ends at scaleStartX + 25
 * mm.
 */
function createCustomSleeveGeometry(
  radius: number,
  xStart: number,
  xEnd: number,
  scaleStartX: number,
  startU: number,
  endU: number,
  mmSpacing: number,
  canvasHeight: number,
): THREE.BufferGeometry {
  const radialSegments = 64;
  const xSegments = 40;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Physical height in mm of the texture canvas along the cylinder circumference
  const canvasHeightMm = canvasHeight / mmSpacing;

  for (let j = 0; j <= xSegments; j++) {
    const x = xStart + (j / xSegments) * (xEnd - xStart);
    const mm = x - scaleStartX;
    const u = THREE.MathUtils.clamp(startU + (mm / 25.0) * (endU - startU), 0.0, 1.0);

    for (let i = 0; i <= radialSegments; i++) {
      // theta goes from -PI to +PI.
      // theta = 0 corresponds to front center facing the camera (+Z).
      const theta = (i / radialSegments) * Math.PI * 2 - Math.PI;
      const y = radius * Math.sin(theta);
      const z = radius * Math.cos(theta);

      positions.push(x, y, z);
      normals.push(0, Math.sin(theta), Math.cos(theta));

      // Physical arc distance from datum line (theta = 0) in mm:
      const arcMm = radius * theta;

      // v = 0.5 at theta = 0 (datum line).
      // When theta > 0 (y > 0 in 3D), arcMm > 0, v > 0.5 (upper ticks / integer mm).
      // When theta < 0 (y < 0 in 3D), arcMm < 0, v < 0.5 (lower ticks / half mm).
      // This produces an exact 1:1 physical aspect ratio with the horizontal mm scale!
      const v = THREE.MathUtils.clamp(0.5 + arcMm / canvasHeightMm, 0.0, 1.0);
      uvs.push(u, v);
    }
  }

  const stride = radialSegments + 1;
  for (let j = 0; j < xSegments; j++) {
    for (let i = 0; i < radialSegments; i++) {
      const a = j * stride + i;
      const b = (j + 1) * stride + i;
      const c = (j + 1) * stride + (i + 1);
      const d = j * stride + (i + 1);

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  return geom;
}

/**
 * Creates custom geometry for the movable thimble bevel (微分筒圆锥面). localX = 0 is the left measuring
 * edge (radius rLeft). localX = bevelLen is the right edge meeting the knurled body (radius
 * rRight). At localX = 0, v = 1.0 (matching top of texture where division ticks begin). At localX =
 * bevelLen, v = 0.0.
 */
function createCustomThimbleBevelGeometry(
  rLeft: number,
  rRight: number,
  bevelLen: number,
): THREE.BufferGeometry {
  const radialSegments = 64;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= 1; j++) {
    const x = j * bevelLen;
    const r = j === 0 ? rLeft : rRight;
    const v = j === 0 ? 1.0 : 0.0;

    for (let i = 0; i <= radialSegments; i++) {
      const theta = (i / radialSegments) * Math.PI * 2;
      const y = r * Math.sin(theta);
      const z = r * Math.cos(theta);

      positions.push(x, y, z);
      normals.push((rLeft - rRight) / bevelLen, Math.sin(theta), Math.cos(theta));

      const u = i / radialSegments;
      uvs.push(u, v);
    }
  }

  const stride = radialSegments + 1;
  for (let i = 0; i < radialSegments; i++) {
    const a = i;
    const b = stride + i;
    const c = stride + (i + 1);
    const d = i + 1;

    indices.push(a, b, d);
    indices.push(b, c, d);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Creates precision forged U-frame geometry (尺架与亮色金属椭圆把手一体化精密锻压造型). - Thin, elegant profile: total
 * Z thickness is only 2.4 mm (beveled edges 0.4 mm). - Accurately aligned: * Right arm top meets
 * blue collar exactly between X = 24.5 and X = 30.5 (collar center X = 27.5). * Right outer flank
 * flushes smoothly down to X = 31.0 (aligning with right end of blue collar). * Bottom grip region
 * features an integrated smooth elliptical bulge whose major axis lies horizontally along the
 * measuring cylinder (spanning from X = -10.5 to X = 31.0, length 41.5 mm). * Left arm top meets
 * anvil base bottom (between X = -9.5 and X = -5.5, center X = -7.5).
 */
function createPrecisionFrameGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();

  // Top-left anchor: meets anvil base bottom (X = -7.5, width 4.0 mm, from -9.5 to -5.5)
  shape.moveTo(-9.5, -3.8);

  // Outer left arch descending smoothly to outer grip boundary at X = -10.5
  shape.bezierCurveTo(-11.5, -12.0, -11.5, -20.0, -8.0, -25.5);
  // Outer bottom contour of the elliptical grip (major axis along X, lowest point Y = -33.5)
  shape.bezierCurveTo(-2.0, -33.5, 23.0, -33.5, 29.0, -25.5);
  // Outer right arch ascending and aligning with blue collar right edge (X = 31.0)
  shape.bezierCurveTo(31.5, -19.0, 31.0, -10.0, 30.5, -4.5);

  // Right flat top meeting blue collar (from 30.5 to 24.5, width 6.0 mm, centered under collar at X = 27.5)
  shape.lineTo(24.5, -4.5);

  // Inner throat curve (clearance for workpiece between anvil and spindle)
  shape.bezierCurveTo(24.0, -11.0, 21.0, -18.0, 16.0, -20.5);
  shape.bezierCurveTo(12.0, -21.8, 8.0, -21.8, 4.0, -20.5);
  shape.bezierCurveTo(-1.0, -18.0, -4.0, -11.0, -5.5, -3.8);

  // Left flat top meeting anvil base (from -5.5 back to -9.5)
  shape.lineTo(-9.5, -3.8);

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: 1.6,
    bevelEnabled: true,
    bevelThickness: 0.4,
    bevelSize: 0.4,
    bevelSegments: 4,
    curveSegments: 48,
  };

  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  // Total Z thickness: 1.6 + 2 * 0.4 = 2.4 mm. Offset Z by -1.2 mm to center at Z = 0
  geom.translate(0, 0, -1.2);
  return geom;
}

/**
 * Creates the bottom handle (底下的扁平椭圆把手防滑/铭牌护块): Refined per user request: - Slim and thin: total Z
 * thickness only 3.0 mm (exceeding frame by only 0.3mm on each side for subtle tactile relief) -
 * Major axis strictly horizontal along measuring cylinder (X axis, length 41.5 mm, from X = -10.5
 * to X = 31.0) - Exactly aligned with blue collar right end at X = 31.0!
 */
function createEllipticalHandleGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  // Center at (X = 10.25, Y = -27.0)
  // Semi-major axis = 20.75 mm (X from -10.5 to 31.0, perfectly aligning with blue collar right end!)
  // Semi-minor axis = 6.2 mm
  shape.absellipse(10.25, -27.0, 20.75, 6.2, 0, Math.PI * 2, false, 0);

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: 2.2,
    bevelEnabled: true,
    bevelThickness: 0.4,
    bevelSize: 0.4,
    bevelSegments: 4,
    curveSegments: 48,
  };

  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  // Total Z thickness: 2.2 + 2 * 0.4 = 3.0 mm. Offset Z by -1.5 mm to center at Z = 0
  geom.translate(0, 0, -1.5);
  return geom;
}

export class Micrometer3D {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;

  // Key moving 3D nodes
  private spindleMesh!: THREE.Mesh;
  private thimbleGroup!: THREE.Group;
  private ratchetMesh!: THREE.Mesh;
  private sampleMesh: THREE.Mesh | null = null;
  private sleeveMesh!: THREE.Mesh;
  private lockLeverMesh!: THREE.Mesh;

  // Interaction & state
  private currentReading: number = 0.0;
  private targetReading: number = 0.0;
  private isLocked: boolean = false;
  private isDraggingThimble: boolean = false;
  private dragStartY: number = 0;
  private dragStartReading: number = 0;
  private onReadingChange?: (reading: number) => void;

  // Animation & Rendering
  private animationFrameId: number = 0;
  private container: HTMLElement;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  // Dimensions (enlarged throat clearance & exact proportions)
  public readonly SLEEVE_START_X = 40.0; // where 0 mm scale starts (moved rightward for clear distance from collar)
  public readonly SLEEVE_SCALE_LEN = 25.0; // 25 mm scale length

  constructor(container: HTMLElement, onReadingChange?: (reading: number) => void) {
    this.container = container;
    this.onReadingChange = onReadingChange;

    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#0b0f19"); // Elegant deep studio dark slate

    // 2. Camera setup
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 1000);
    this.camera.position.set(30, 15, 80);

    // 3. Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    container.appendChild(this.renderer.domElement);

    // 4. Orbit controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(24, -4, 0);
    this.controls.minDistance = 15;
    this.controls.maxDistance = 180;
    this.controls.maxPolarAngle = Math.PI * 0.95;

    // 5. Lighting
    this.setupLighting();

    // 6. Build 3D Micrometer Geometry
    this.buildMicrometer();

    // 7. Event listeners
    this.setupEvents();

    // 8. Start render loop
    this.animate();
  }

  private setupLighting() {
    // Soft studio ambient
    const ambientLight = new THREE.AmbientLight("#ffffff", 1.0);
    this.scene.add(ambientLight);

    // Hemisphere light for natural top/bottom reflection
    const hemiLight = new THREE.HemisphereLight("#f8fafc", "#1e293b", 0.8);
    this.scene.add(hemiLight);

    // Key light (top-front-right)
    const keyLight = new THREE.DirectionalLight("#ffffff", 2.0);
    keyLight.position.set(50, 60, 50);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0001;
    this.scene.add(keyLight);

    // Fill light (front-left, reveals scale lines on sleeve & thimble)
    const fillLight = new THREE.DirectionalLight("#e2e8f0", 1.5);
    fillLight.position.set(10, 20, 60);
    this.scene.add(fillLight);

    // Rim light from behind (creates crisp metallic edge highlight)
    const rimLight = new THREE.DirectionalLight("#94a3b8", 1.2);
    rimLight.position.set(20, -30, -50);
    this.scene.add(rimLight);
  }

  private buildMicrometer() {
    // Materials
    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: "#f1f5f9",
      metalness: 0.92,
      roughness: 0.18,
    });

    const satinSteelMaterial = new THREE.MeshStandardMaterial({
      color: "#e2e8f0",
      metalness: 0.82,
      roughness: 0.28,
    });

    // High School physics classic deep navy blue hammer-finish paint for the collar
    const framePaintMaterial = new THREE.MeshStandardMaterial({
      color: "#1e3a8a",
      metalness: 0.35,
      roughness: 0.4,
    });

    // Bright metal for the frame arms and handle
    const brightMetalMaterial = new THREE.MeshStandardMaterial({
      color: "#e2e8f0",
      metalness: 0.9,
      roughness: 0.18,
    });

    const plasticGripMaterial = new THREE.MeshStandardMaterial({
      color: "#0f172a",
      metalness: 0.1,
      roughness: 0.6,
    });

    // -------------------------------------------------------------
    // 1. U-SHAPED FRAME & BOTTOM HANDLE (尺架与亮色金属椭圆把手)
    // -------------------------------------------------------------
    const frameGroup = new THREE.Group();
    this.scene.add(frameGroup);

    // Precision forged U-frame arms with flat rectangular beveled beam geometry (not a round rubber hose)
    const frameGeo = createPrecisionFrameGeometry();
    const frameMesh = new THREE.Mesh(frameGeo, brightMetalMaterial);
    frameMesh.castShadow = true;
    frameMesh.receiveShadow = true;
    frameGroup.add(frameMesh);

    // Bottom Handle (底下的把手) - "扁的厚的椭圆金属块，长轴应该在测量筒上，使用亮色金属"
    const handleGeo = createEllipticalHandleGeometry();
    const handleMesh = new THREE.Mesh(handleGeo, brightMetalMaterial);
    handleMesh.castShadow = true;
    handleMesh.receiveShadow = true;
    frameGroup.add(handleMesh);

    // Specification label plate (Front and Back of the elliptical bright metal handle)
    const labelTex = createFrameLabelTexture();
    const labelMat = new THREE.MeshBasicMaterial({ map: labelTex });
    const labelPlane = new THREE.Mesh(new THREE.PlaneGeometry(28, 5.8), labelMat);
    labelPlane.position.set(10.25, -27.0, 1.55);
    frameGroup.add(labelPlane);

    const labelPlaneBack = labelPlane.clone();
    labelPlaneBack.position.set(10.25, -27.0, -1.55);
    labelPlaneBack.rotation.y = Math.PI;
    frameGroup.add(labelPlaneBack);

    // Left Anvil Mount (左测砧底座 - aligned with left arm of frame at X = -7.5)
    const anvilBaseGeo = new THREE.CylinderGeometry(3.6, 3.6, 6.0, 24);
    anvilBaseGeo.rotateZ(Math.PI / 2);
    const anvilBase = new THREE.Mesh(anvilBaseGeo, framePaintMaterial);
    anvilBase.position.set(-7.5, 0, 0);
    frameGroup.add(anvilBase);

    // Left Fixed Anvil (左固定测砧 - Slender precision cylinder)
    const anvilRadius = 2.2;
    const anvilGeo = new THREE.CylinderGeometry(anvilRadius, anvilRadius, 7.0, 32);
    anvilGeo.rotateZ(Math.PI / 2);
    const anvil = new THREE.Mesh(anvilGeo, chromeMaterial);
    anvil.position.set(-3.5, 0, 0); // tip face is at X = 0.0!
    frameGroup.add(anvil);

    // Carbide tip face
    const anvilFaceGeo = new THREE.CylinderGeometry(anvilRadius, anvilRadius, 0.3, 32);
    anvilFaceGeo.rotateZ(Math.PI / 2);
    const anvilFace = new THREE.Mesh(anvilFaceGeo, satinSteelMaterial);
    anvilFace.position.set(-0.15, 0, 0);
    frameGroup.add(anvilFace);

    // Right Sleeve Mount / Collar (蓝色套筒 - 精准对齐把手与尺架，中心在 X = 27.5)
    const sleeveBaseRadius = 5.1;
    const sleeveBaseLen = 7.0; // from X = 24.0 to X = 31.0
    const sleeveBaseGeo = new THREE.CylinderGeometry(
      sleeveBaseRadius,
      sleeveBaseRadius,
      sleeveBaseLen,
      32,
    );
    sleeveBaseGeo.rotateZ(Math.PI / 2);
    const sleeveBase = new THREE.Mesh(sleeveBaseGeo, framePaintMaterial);
    sleeveBase.position.set(27.5, 0, 0); // centered at 27.5, ending at 31.0
    frameGroup.add(sleeveBase);

    // Structural joint seamlessly bridging frame arm top (X = 27.5) and collar (X = 27.5)
    const collarJointGeo = new THREE.BoxGeometry(6.0, 3.5, 2.8);
    const collarJoint = new THREE.Mesh(collarJointGeo, framePaintMaterial);
    collarJoint.position.set(27.5, -3.2, 0);
    frameGroup.add(collarJoint);

    // Locking clamp ring & lever (锁紧装置)
    const lockNutGeo = new THREE.CylinderGeometry(3.6, 3.6, 3.0, 20);
    lockNutGeo.rotateZ(Math.PI / 2);
    const lockNut = new THREE.Mesh(lockNutGeo, satinSteelMaterial);
    lockNut.position.set(25.5, 0, 0);
    frameGroup.add(lockNut);

    const leverGeo = new THREE.CylinderGeometry(0.7, 0.7, 5.5, 12);
    this.lockLeverMesh = new THREE.Mesh(leverGeo, plasticGripMaterial);
    this.lockLeverMesh.position.set(25.5, 4.2, 0);
    this.lockLeverMesh.rotation.x = Math.PI * 0.15;
    frameGroup.add(this.lockLeverMesh);

    // -------------------------------------------------------------
    // 2. SLEEVE (固定套管主尺) - Exact longitudinal mapping
    // Collar ends at X = 31.0, Scale starts at SLEEVE_START_X = 40.0
    // Providing a generous, clear 9.0 mm gap between the blue collar and the 0 mm mark!
    // Sleeve ends at X = 66.5 mm (just past 25 mm mark at 65.0 mm), perfectly encapsulated by thimble!
    // -------------------------------------------------------------
    const sleeveRadius = 4.8;
    const sleeveStartX = 24.0; // starts securely inside collar
    const sleeveEndX = 66.5; // Ends right after 25 mm scale, completely prevents rightward clipping
    const { texture: sleeveTex, startU, endU, mmSpacing, canvasHeight } = createSleeveTexture();

    const sleeveGeo = createCustomSleeveGeometry(
      sleeveRadius,
      sleeveStartX,
      sleeveEndX,
      this.SLEEVE_START_X,
      startU,
      endU,
      mmSpacing,
      canvasHeight,
    );

    // Anti-glare Satin Chrome finish: low metalness + high roughness prevents blinding specular wash
    const sleeveMat = new THREE.MeshStandardMaterial({
      map: sleeveTex,
      metalness: 0.12,
      roughness: 0.82,
    });
    this.sleeveMesh = new THREE.Mesh(sleeveGeo, sleeveMat);
    this.scene.add(this.sleeveMesh);

    // -------------------------------------------------------------
    // 3. MOVING GROUP: THIMBLE (微分筒) & RATCHET (棘轮)
    // -------------------------------------------------------------
    this.thimbleGroup = new THREE.Group();
    this.scene.add(this.thimbleGroup);

    // Scaled-down realistic proportions:
    const bevelLeftRadius = 4.95; // Snug clearance over sleeveRadius (4.8)
    const thimbleBodyRadius = 5.7; // Slender, elegant industrial proportion
    const bevelLen = 4.0;
    const bodyLen = 34.0; // Extended to 34.0 mm: total thimble length 38 mm completely covers sleeve at 0 mm

    // Bevel Geometry (Cone reading ring)
    const thimbleBevelTex = createThimbleBevelTexture();
    const bevelGeo = createCustomThimbleBevelGeometry(bevelLeftRadius, thimbleBodyRadius, bevelLen);
    const bevelMat = new THREE.MeshStandardMaterial({
      map: thimbleBevelTex,
      metalness: 0.72,
      roughness: 0.32,
    });
    const bevelMesh = new THREE.Mesh(bevelGeo, bevelMat);
    this.thimbleGroup.add(bevelMesh);

    // Knurled Body Geometry (Diamond cross-hatch grip)
    const knurlTex = createKnurlTexture();
    const bodyGeo = new THREE.CylinderGeometry(thimbleBodyRadius, thimbleBodyRadius, bodyLen, 48);
    bodyGeo.rotateZ(-Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      map: knurlTex,
      metalness: 0.78,
      roughness: 0.38,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.set(bevelLen + bodyLen / 2, 0, 0);
    this.thimbleGroup.add(bodyMesh);

    // Transition Neck
    const neckGeo = new THREE.CylinderGeometry(3.6, 3.6, 3.0, 24);
    neckGeo.rotateZ(-Math.PI / 2);
    const neckMesh = new THREE.Mesh(neckGeo, satinSteelMaterial);
    neckMesh.position.set(bevelLen + bodyLen + 1.5, 0, 0);
    this.thimbleGroup.add(neckMesh);

    // Ratchet Knob (棘轮旋钮 - Precision ribbed fluting / knurl pattern)
    const ratchetTex = createRatchetKnurlTexture();
    const ratchetLen = 13.0;
    const ratchetRadius = 4.1;
    const ratchetGeo = new THREE.CylinderGeometry(ratchetRadius, ratchetRadius, ratchetLen, 36);
    ratchetGeo.rotateZ(-Math.PI / 2);
    const ratchetMat = new THREE.MeshStandardMaterial({
      map: ratchetTex,
      metalness: 0.82,
      roughness: 0.38,
    });
    this.ratchetMesh = new THREE.Mesh(ratchetGeo, ratchetMat);
    this.ratchetMesh.position.set(bevelLen + bodyLen + 3.0 + ratchetLen / 2, 0, 0);
    this.thimbleGroup.add(this.ratchetMesh);

    // Ratchet End Cap
    const capGeo = new THREE.SphereGeometry(ratchetRadius, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    capGeo.rotateZ(-Math.PI / 2);
    const capMesh = new THREE.Mesh(capGeo, satinSteelMaterial);
    capMesh.position.set(bevelLen + bodyLen + 3.0 + ratchetLen, 0, 0);
    this.thimbleGroup.add(capMesh);

    // -------------------------------------------------------------
    // 4. SPINDLE (测微螺杆) - Slender 2.2mm precision stainless steel
    // -------------------------------------------------------------
    const spindleLen = 85.0; // Extended to span new SLEEVE_START_X = 40.0
    const spindleRadius = 2.2; // Slender radius matching anvil
    const spindleGeo = new THREE.CylinderGeometry(spindleRadius, spindleRadius, spindleLen, 32);
    spindleGeo.rotateZ(-Math.PI / 2);
    this.spindleMesh = new THREE.Mesh(spindleGeo, chromeMaterial);
    this.scene.add(this.spindleMesh);

    // Update positions for initial 0.0 reading
    this.update3DState(0.0);
  }

  /** Sets up mouse drag interaction directly on the 3D thimble and ratchet! */
  private setupEvents() {
    const dom = this.renderer.domElement;

    const getMouseNDC = (e: MouseEvent) => {
      const rect = dom.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
      };
    };

    dom.addEventListener("pointerdown", (e: PointerEvent) => {
      if (this.isLocked) return;
      const ndc = getMouseNDC(e);
      this.mouse.set(ndc.x, ndc.y);
      this.raycaster.setFromCamera(this.mouse, this.camera);

      // Check if clicked on thimble or ratchet
      const intersects = this.raycaster.intersectObjects(this.thimbleGroup.children, true);
      if (intersects.length > 0) {
        this.isDraggingThimble = true;
        this.dragStartY = e.clientY;
        this.dragStartReading = this.currentReading;
        this.controls.enabled = false; // Disable orbit camera during micrometer rotation
        dom.style.cursor = "ns-resize";
      }
    });

    window.addEventListener("pointermove", (e: PointerEvent) => {
      if (!this.isDraggingThimble) return;

      // Dragging downwards on the front face (e.clientY > dragStartY) rotates counter-clockwise,
      // which unscrews/backs out the thimble, increasing reading towards 25mm.
      const deltaY = e.clientY - this.dragStartY;
      // Drag sensitivity: 120px = 0.5mm (one full turn)
      const deltaMm = (deltaY / 120.0) * 0.5;
      const newReading = Math.max(0, Math.min(25, this.dragStartReading + deltaMm));

      if (Math.abs(newReading - this.currentReading) > 0.0005) {
        this.setReading(newReading, false);
        soundManager.playRatchetClick();
        if (this.onReadingChange) {
          this.onReadingChange(newReading);
        }
      }
    });

    window.addEventListener("pointerup", () => {
      if (this.isDraggingThimble) {
        this.isDraggingThimble = false;
        this.controls.enabled = true;
        dom.style.cursor = "default";
      }
    });

    // Mouse wheel support for fine precision adjustment
    dom.addEventListener(
      "wheel",
      (e: WheelEvent) => {
        const ndc = getMouseNDC(e);
        this.mouse.set(ndc.x, ndc.y);
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.thimbleGroup.children, true);

        // If hovering over micrometer thimble, adjust reading by 0.01mm
        // Rolling downward (deltaY > 0) turns the front face down, unscrewing / increasing reading
        if (intersects.length > 0 && !this.isLocked) {
          e.preventDefault();
          const step = e.shiftKey ? 0.001 : 0.01;
          const direction = e.deltaY > 0 ? 1 : -1;
          const newReading = Math.max(0, Math.min(25, this.currentReading + direction * step));
          this.setReading(newReading, true);
          soundManager.playRatchetClick();
          if (this.onReadingChange) {
            this.onReadingChange(newReading);
          }
        }
      },
      { passive: false },
    );

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    resizeObserver.observe(this.container);
  }

  public handleResize() {
    if (!this.container || !this.renderer) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /** Sets reading value (0 - 25 mm). */
  public setReading(mm: number, animate: boolean = false) {
    const clamped = Math.max(0, Math.min(25, mm));
    if (animate) {
      this.targetReading = clamped;
    } else {
      this.targetReading = clamped;
      this.currentReading = clamped;
      this.update3DState(clamped);
    }
  }

  public getReading(): number {
    return this.currentReading;
  }

  public setLocked(locked: boolean) {
    this.isLocked = locked;
    if (this.lockLeverMesh) {
      this.lockLeverMesh.rotation.x = locked ? -Math.PI * 0.15 : Math.PI * 0.15;
    }
  }

  /** Updates physical 3D mesh transforms for given reading in millimeters. */
  private update3DState(mm: number) {
    // 1. Thimble linear position along X:
    // When mm = 0, bevel edge sits at SLEEVE_START_X (34.0).
    this.thimbleGroup.position.x = this.SLEEVE_START_X + mm;

    // 2. Thimble axial rotation:
    // Pitch is 0.5 mm per revolution.
    // In our coordinate system, rotating +around X moves ascending divisions (0, 5, 10, ... 45)
    // past the horizontal datum line in textbook ascending order!
    const revolutions = mm / 0.5;
    this.thimbleGroup.rotation.x = revolutions * Math.PI * 2;

    // 3. Spindle linear position:
    // Tip is at X = mm. Spindle length is 85mm.
    // Center is at X = mm + length / 2.
    const spindleLen = 85.0;
    this.spindleMesh.position.set(mm + spindleLen / 2, 0, 0);

    // 4. Update sample object position/clamping if present
    if (this.sampleMesh) {
      this.sampleMesh.position.x = mm / 2;
    }
  }

  /** Inserts or removes a standard physical sample object to measure */
  public setSampleObject(sample: SampleObject | null) {
    if (this.sampleMesh) {
      this.scene.remove(this.sampleMesh);
      this.sampleMesh.geometry.dispose();
      this.sampleMesh = null;
    }

    if (!sample) return;

    let geo: THREE.BufferGeometry;
    if (sample.type === "sphere") {
      geo = new THREE.SphereGeometry(sample.sizeMm / 2, 32, 24);
    } else if (sample.type === "wire") {
      geo = new THREE.CylinderGeometry(sample.sizeMm / 2, sample.sizeMm / 2, 22, 24);
      geo.rotateZ(Math.PI / 2);
    } else if (sample.type === "box") {
      geo = new THREE.BoxGeometry(sample.sizeMm, 12, 12);
    } else {
      geo = new THREE.CylinderGeometry(sample.sizeMm / 2, sample.sizeMm / 2, 14, 32);
    }

    const mat = new THREE.MeshStandardMaterial({
      color: sample.color,
      metalness: 0.65,
      roughness: 0.35,
    });

    this.sampleMesh = new THREE.Mesh(geo, mat);
    this.sampleMesh.position.set(sample.sizeMm / 2, 0, 0);
    this.sampleMesh.castShadow = true;
    this.scene.add(this.sampleMesh);
  }

  /** Preset camera positions for High School physics classroom demonstration */
  public setViewPreset(preset: ViewPreset) {
    const duration = 800;
    const startTime = performance.now();
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();

    let targetPos: THREE.Vector3;
    let targetLookAt: THREE.Vector3;

    switch (preset) {
      case "closeup":
        // High School Physics Reading View:
        // Direct, crisp perpendicular view of the alignment between sleeve datum line & thimble bevel!
        targetPos = new THREE.Vector3(this.SLEEVE_START_X + this.currentReading * 0.6, 1.2, 38);
        targetLookAt = new THREE.Vector3(this.SLEEVE_START_X + this.currentReading * 0.6, 0, 0);
        break;
      case "anvil":
        // Anvil measurement gap closeup
        targetPos = new THREE.Vector3(this.currentReading / 2, 2.5, 26);
        targetLookAt = new THREE.Vector3(this.currentReading / 2, 0, 0);
        break;
      case "top":
        // Top-down view
        targetPos = new THREE.Vector3(26, 70, 0);
        targetLookAt = new THREE.Vector3(26, 0, 0);
        break;
      case "overview":
      default:
        // Full instrument perspective
        targetPos = new THREE.Vector3(28, 15, 85);
        targetLookAt = new THREE.Vector3(22, -5, 0);
        break;
    }

    const animateCamera = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Smooth cubic ease out
      const ease = 1 - Math.pow(1 - progress, 3);

      this.camera.position.lerpVectors(startPos, targetPos, ease);
      this.controls.target.lerpVectors(startTarget, targetLookAt, ease);
      this.controls.update();

      if (progress < 1) {
        requestAnimationFrame(animateCamera);
      }
    };
    animateCamera();
  }

  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    // Smooth lerp to target reading if animating
    if (Math.abs(this.targetReading - this.currentReading) > 0.0001) {
      const step = (this.targetReading - this.currentReading) * 0.2;
      this.currentReading += step;
      this.update3DState(this.currentReading);
      if (this.onReadingChange) {
        this.onReadingChange(this.currentReading);
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  public destroy() {
    cancelAnimationFrame(this.animationFrameId);
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
