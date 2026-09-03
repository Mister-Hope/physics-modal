import type { BufferGeometry } from "three";
import {
  ACESFilmicToneMapping,
  AmbientLight,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  Shape,
  SphereGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import {
  createCustomSleeveGeometry,
  createCustomThimbleBevelGeometry,
  createEllipticalHandleGeometry,
  createPrecisionFrameGeometry,
} from "./micrometerGeometry";
import { soundManager } from "./micrometerPhysics";
import type { ViewPreset, SampleObject } from "./micrometerPhysics";
import {
  createFrameLabelTexture,
  createSleeveTexture,
  createThimbleBevelTexture,
  createKnurlTexture,
  createRatchetKnurlTexture,
} from "./textureGenerator";

export class Micrometer3D {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  controls: OrbitControls;

  // Key moving 3D nodes
  private spindleMesh!: Mesh;
  private thimbleGroup!: Group;
  private ratchetMesh!: Mesh;
  private sampleMesh: Mesh | null = null;
  private sleeveMesh!: Mesh;
  private lockLeverMesh!: Mesh;

  // Interaction & state
  private currentReading: number = 0;
  private targetReading: number = 0;
  private isLocked: boolean = false;
  private isDraggingThimble: boolean = false;
  private isDraggingRatchet: boolean = false;
  private sampleSize = 0;
  private dragStartY: number = 0;
  private dragStartReading: number = 0;

  // Animation & Rendering
  private animationFrameId: number = 0;
  private readonly raycaster = new Raycaster();
  private readonly mouse = new Vector2();

  // Dimensions (enlarged throat clearance & exact proportions)
  readonly SLEEVE_START_X = 32; // 0 mm scale starts about 1 mm after the collar edge at X = 31
  readonly SLEEVE_SCALE_LEN = 25; // 25 mm scale length

  constructor(
    private readonly container: HTMLElement,
    private readonly onReadingChange?: (reading: number) => void,
  ) {
    // 1. Scene setup
    this.scene = new Scene();
    this.scene.background = new Color("#0b0f19"); // Elegant deep studio dark slate

    // 2. Camera setup
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new PerspectiveCamera(40, aspect, 0.1, 1000);
    this.camera.position.set(30, 15, 80);

    // 3. Renderer setup
    this.renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    container.append(this.renderer.domElement);

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

  private setupLighting(): void {
    // Soft studio ambient
    const ambientLight = new AmbientLight("#ffffff", 1);
    this.scene.add(ambientLight);

    // Hemisphere light for natural top/bottom reflection
    const hemiLight = new HemisphereLight("#f8fafc", "#1e293b", 0.8);
    this.scene.add(hemiLight);

    // Key light (top-front-right)
    const keyLight = new DirectionalLight("#ffffff", 2);
    keyLight.position.set(50, 60, 50);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0001;
    this.scene.add(keyLight);

    // Fill light (front-left, reveals scale lines on sleeve & thimble)
    const fillLight = new DirectionalLight("#e2e8f0", 1.5);
    fillLight.position.set(10, 20, 60);
    this.scene.add(fillLight);

    // Rim light from behind (creates crisp metallic edge highlight)
    const rimLight = new DirectionalLight("#94a3b8", 1.2);
    rimLight.position.set(20, -30, -50);
    this.scene.add(rimLight);
  }

  private buildMicrometer(): void {
    // Materials
    const chromeMaterial = new MeshStandardMaterial({
      color: "#f1f5f9",
      metalness: 0.92,
      roughness: 0.18,
    });

    const satinSteelMaterial = new MeshStandardMaterial({
      color: "#e2e8f0",
      metalness: 0.82,
      roughness: 0.28,
    });

    // High School physics classic deep navy blue hammer-finish paint for the collar
    const framePaintMaterial = new MeshStandardMaterial({
      color: "#1e3a8a",
      metalness: 0.35,
      roughness: 0.4,
    });

    // Bright metal for the frame arms and handle
    const brightMetalMaterial = new MeshStandardMaterial({
      color: "#e2e8f0",
      metalness: 0.9,
      roughness: 0.18,
    });

    const plasticGripMaterial = new MeshStandardMaterial({
      color: "#0f172a",
      metalness: 0.1,
      roughness: 0.6,
    });

    // -------------------------------------------------------------
    // 1. U-SHAPED FRAME & BOTTOM HANDLE (尺架与亮色金属椭圆把手)
    // -------------------------------------------------------------
    const frameGroup = new Group();
    this.scene.add(frameGroup);

    // Precision forged U-frame arms with flat rectangular beveled beam geometry (not a round rubber hose)
    const frameGeo = createPrecisionFrameGeometry();
    const frameMesh = new Mesh(frameGeo, brightMetalMaterial);
    frameMesh.castShadow = true;
    frameMesh.receiveShadow = true;
    frameGroup.add(frameMesh);

    // Bottom Handle (底下的把手) - "扁的厚的椭圆金属块，长轴应该在测量筒上，使用亮色金属"
    const handleGeo = createEllipticalHandleGeometry();
    const handleMesh = new Mesh(handleGeo, brightMetalMaterial);
    handleMesh.castShadow = true;
    handleMesh.receiveShadow = true;
    frameGroup.add(handleMesh);

    // Specification label plate (Front and Back of the elliptical bright metal handle)
    const labelTex = createFrameLabelTexture();
    const labelMat = new MeshBasicMaterial({ map: labelTex });
    const labelPlane = new Mesh(new PlaneGeometry(28, 5.8), labelMat);
    labelPlane.position.set(10.25, -27, 1.55);
    frameGroup.add(labelPlane);

    const labelPlaneBack = labelPlane.clone();
    labelPlaneBack.position.set(10.25, -27, -1.55);
    labelPlaneBack.rotation.y = Math.PI;
    frameGroup.add(labelPlaneBack);

    // Left Anvil Mount (左测砧底座 - aligned with left arm of frame at X = -7.5)
    const anvilBaseGeo = new CylinderGeometry(3.6, 3.6, 6, 24);
    anvilBaseGeo.rotateZ(Math.PI / 2);
    const anvilBase = new Mesh(anvilBaseGeo, framePaintMaterial);
    anvilBase.position.set(-7.5, 0, 0);
    frameGroup.add(anvilBase);

    // Left Fixed Anvil (左固定测砧 - Slender precision cylinder)
    const anvilRadius = 2.2;
    const anvilGeo = new CylinderGeometry(anvilRadius, anvilRadius, 7, 32);
    anvilGeo.rotateZ(Math.PI / 2);
    const anvil = new Mesh(anvilGeo, chromeMaterial);
    anvil.position.set(-3.5, 0, 0); // tip face is at X = 0.0!
    frameGroup.add(anvil);

    // Carbide tip face
    const anvilFaceGeo = new CylinderGeometry(anvilRadius, anvilRadius, 0.3, 32);
    anvilFaceGeo.rotateZ(Math.PI / 2);
    const anvilFace = new Mesh(anvilFaceGeo, satinSteelMaterial);
    anvilFace.position.set(-0.15, 0, 0);
    frameGroup.add(anvilFace);

    // Right Sleeve Mount / Collar (蓝色套筒 - 精准对齐把手与尺架，中心在 X = 27.5)
    const sleeveBaseRadius = 5.1;
    const sleeveBaseLen = 7; // from X = 24.0 to X = 31.0
    const sleeveBaseGeo = new CylinderGeometry(
      sleeveBaseRadius,
      sleeveBaseRadius,
      sleeveBaseLen,
      32,
    );
    sleeveBaseGeo.rotateZ(Math.PI / 2);
    const sleeveBase = new Mesh(sleeveBaseGeo, framePaintMaterial);
    sleeveBase.position.set(27.5, 0, 0); // centered at 27.5, ending at 31.0
    frameGroup.add(sleeveBase);

    // Structural joint seamlessly bridging frame arm top (X = 27.5) and collar (X = 27.5)
    const collarJointGeo = new BoxGeometry(6, 3.5, 2.8);
    const collarJoint = new Mesh(collarJointGeo, framePaintMaterial);
    collarJoint.position.set(27.5, -3.2, 0);
    frameGroup.add(collarJoint);

    // Locking clamp ring & lever (锁紧装置)
    const lockNutGeo = new CylinderGeometry(3.6, 3.6, 3, 20);
    lockNutGeo.rotateZ(Math.PI / 2);
    const lockNut = new Mesh(lockNutGeo, satinSteelMaterial);
    lockNut.position.set(27.5, 0, 0);
    frameGroup.add(lockNut);

    // The lock is on the front face: a central screw pierces the wide root of
    // a flat, seed-shaped locking plate. The camera's default side is +Z.
    const screwGeo = new CylinderGeometry(0.85, 0.85, 0.7, 24);
    screwGeo.rotateX(Math.PI / 2);
    const screwMesh = new Mesh(screwGeo, chromeMaterial);
    screwMesh.position.set(27.5, 0, 5.25);
    frameGroup.add(screwMesh);

    const leverShape = new Shape();
    leverShape.moveTo(-1.55, 1.2);
    leverShape.bezierCurveTo(-1.4, 2.2, 1.4, 2.2, 1.55, 1.2);
    leverShape.bezierCurveTo(1.45, -0.1, 0.85, -1.25, 0.35, -4.9);
    leverShape.bezierCurveTo(0.2, -5.8, -0.2, -5.8, -0.35, -4.9);
    leverShape.bezierCurveTo(-0.85, -1.25, -1.45, -0.1, -1.55, 1.2);
    const leverGeo = new ExtrudeGeometry(leverShape, {
      depth: 0.55,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.12,
      bevelThickness: 0.08,
    });
    leverGeo.translate(0, 0, -0.275);
    this.lockLeverMesh = new Mesh(leverGeo, plasticGripMaterial);
    this.lockLeverMesh.position.set(27.5, 0, 5.55);
    frameGroup.add(this.lockLeverMesh);

    // -------------------------------------------------------------
    // 2. SLEEVE (固定套管主尺) - Exact longitudinal mapping
    // Collar ends at X = 31.0, with only about 1.0 mm before the 0 mm scale mark.
    // Sleeve ends at X = 66.5 mm (just past 25 mm mark at 65.0 mm), perfectly encapsulated by thimble!
    // -------------------------------------------------------------
    const sleeveRadius = 4.8;
    const sleeveStartX = 24; // starts securely inside collar
    const sleeveEndX = 66.5; // Ends right after 25 mm scale, completely prevents rightward clipping
    const { texture: sleeveTex, startU, endU, mmSpacing, canvasHeight } = createSleeveTexture();

    const sleeveGeo = createCustomSleeveGeometry({
      radius: sleeveRadius,
      xStart: sleeveStartX,
      xEnd: sleeveEndX,
      scaleStartX: this.SLEEVE_START_X,
      startU,
      endU,
      mmSpacing,
      canvasHeight,
    });

    // Anti-glare Satin Chrome finish: low metalness + high roughness prevents blinding specular wash
    const sleeveMat = new MeshStandardMaterial({
      map: sleeveTex,
      metalness: 0.12,
      roughness: 0.82,
    });
    this.sleeveMesh = new Mesh(sleeveGeo, sleeveMat);
    this.scene.add(this.sleeveMesh);

    // -------------------------------------------------------------
    // 3. MOVING GROUP: THIMBLE (微分筒) & RATCHET (棘轮)
    // -------------------------------------------------------------
    this.thimbleGroup = new Group();
    this.scene.add(this.thimbleGroup);

    // Scaled-down realistic proportions:
    const bevelLeftRadius = 4.95; // Snug clearance over sleeveRadius (4.8)
    const thimbleBodyRadius = 5.7; // Slender, elegant industrial proportion
    const bevelLen = 4;
    const bodyLen = 34; // Extended to 34.0 mm: total thimble length 38 mm completely covers sleeve at 0 mm

    // Bevel Geometry (Cone reading ring)
    const thimbleBevelTex = createThimbleBevelTexture();
    const bevelGeo = createCustomThimbleBevelGeometry({
      leftRadius: bevelLeftRadius,
      rightRadius: thimbleBodyRadius,
      bevelLength: bevelLen,
    });
    const bevelMat = new MeshStandardMaterial({
      map: thimbleBevelTex,
      metalness: 0.72,
      roughness: 0.32,
    });
    const bevelMesh = new Mesh(bevelGeo, bevelMat);
    this.thimbleGroup.add(bevelMesh);

    // Knurled Body Geometry (Diamond cross-hatch grip)
    const knurlTex = createKnurlTexture();
    const bodyGeo = new CylinderGeometry(thimbleBodyRadius, thimbleBodyRadius, bodyLen, 48);
    bodyGeo.rotateZ(-Math.PI / 2);
    const bodyMat = new MeshStandardMaterial({
      map: knurlTex,
      metalness: 0.78,
      roughness: 0.38,
    });
    const bodyMesh = new Mesh(bodyGeo, bodyMat);
    bodyMesh.position.set(bevelLen + bodyLen / 2, 0, 0);
    this.thimbleGroup.add(bodyMesh);

    // Transition Neck
    const neckGeo = new CylinderGeometry(3.6, 3.6, 3, 24);
    neckGeo.rotateZ(-Math.PI / 2);
    const neckMesh = new Mesh(neckGeo, satinSteelMaterial);
    neckMesh.position.set(bevelLen + bodyLen + 1.5, 0, 0);
    this.thimbleGroup.add(neckMesh);

    // Ratchet Knob (棘轮旋钮 - Precision ribbed fluting / knurl pattern)
    const ratchetTex = createRatchetKnurlTexture();
    const ratchetLen = 13;
    const ratchetRadius = 4.1;
    const ratchetGeo = new CylinderGeometry(ratchetRadius, ratchetRadius, ratchetLen, 36);
    ratchetGeo.rotateZ(-Math.PI / 2);
    const ratchetMat = new MeshStandardMaterial({
      map: ratchetTex,
      metalness: 0.82,
      roughness: 0.38,
    });
    this.ratchetMesh = new Mesh(ratchetGeo, ratchetMat);
    this.ratchetMesh.position.set(bevelLen + bodyLen + 3 + ratchetLen / 2, 0, 0);
    this.thimbleGroup.add(this.ratchetMesh);

    // Ratchet End Cap
    const capGeo = new SphereGeometry(ratchetRadius, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    capGeo.rotateZ(-Math.PI / 2);
    const capMesh = new Mesh(capGeo, satinSteelMaterial);
    capMesh.position.set(bevelLen + bodyLen + 3 + ratchetLen, 0, 0);
    this.thimbleGroup.add(capMesh);

    // -------------------------------------------------------------
    // 4. SPINDLE (测微螺杆) - Slender 2.2mm precision stainless steel
    // -------------------------------------------------------------
    const spindleLen = 85; // Extended to span the sleeve scale beginning at X = 32.0
    const spindleRadius = 2.2; // Slender radius matching anvil
    const spindleGeo = new CylinderGeometry(spindleRadius, spindleRadius, spindleLen, 32);
    spindleGeo.rotateZ(-Math.PI / 2);
    this.spindleMesh = new Mesh(spindleGeo, chromeMaterial);
    this.scene.add(this.spindleMesh);

    // Update positions for initial 0.0 reading
    this.update3DState(0);
  }

  /** Sets up mouse drag interaction directly on the 3D thimble and ratchet! */
  private setupEvents(): void {
    const dom = this.renderer.domElement;

    const getMouseNDC = (e: MouseEvent): { x: number; y: number } => {
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

      const intersects = this.raycaster.intersectObjects(this.thimbleGroup.children, true);
      if (intersects.length > 0) {
        const hitRatchet = intersects.some(({ object }) => object === this.ratchetMesh);
        this.isDraggingRatchet = hitRatchet;
        this.isDraggingThimble = true;
        this.dragStartY = e.clientY;
        this.dragStartReading = this.currentReading;
        this.controls.enabled = false; // Disable orbit camera during micrometer rotation
        dom.style.cursor = "ns-resize";
      }
    });

    globalThis.addEventListener("pointermove", (e: PointerEvent) => {
      if (!this.isDraggingThimble) return;

      // Dragging downwards on the front face (e.clientY > dragStartY) rotates counter-clockwise,
      // which unscrews/backs out the thimble, increasing reading towards 25mm.
      const deltaY = e.clientY - this.dragStartY;
      // Drag sensitivity: 120px = 0.5mm (one full turn)
      const deltaMm = (deltaY / 120) * 0.5;
      const newReading = Math.max(0, Math.min(25, this.dragStartReading + deltaMm));

      if (Math.abs(newReading - this.currentReading) > 0.0005) {
        this.setReading(newReading, false);
        soundManager.playRatchetClick();
        this.onReadingChange?.(newReading);
      }
    });

    globalThis.addEventListener("pointerup", () => {
      if (this.isDraggingThimble || this.isDraggingRatchet) {
        this.isDraggingThimble = false;
        this.isDraggingRatchet = false;
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
          this.onReadingChange?.(newReading);
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

  handleResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * Sets reading value (0 - 25 mm).
   *
   * @param millimeters The target reading in millimeters.
   * @param animate Whether to animate to the target.
   */
  setReading(millimeters: number, animate: boolean = false): void {
    const maxReading = this.sampleSize > 0 ? this.sampleSize : 25;
    const clamped = Math.max(0, Math.min(maxReading, millimeters));
    if (animate) {
      this.targetReading = clamped;
    } else {
      this.targetReading = clamped;
      this.currentReading = clamped;
      this.update3DState(clamped);
    }
  }

  getReading(): number {
    return this.currentReading;
  }

  setLocked(locked: boolean): void {
    this.isLocked = locked;
    this.lockLeverMesh.rotation.z = locked ? -Math.PI * 0.08 : Math.PI * 0.08;
  }

  /**
   * Updates physical 3D mesh transforms for given reading in millimeters.
   *
   * @param millimeters The reading used to position the meshes.
   */
  private update3DState(millimeters: number): void {
    // 1. Thimble linear position along X:
    // When mm = 0, bevel edge sits at SLEEVE_START_X (34.0).
    this.thimbleGroup.position.x = this.SLEEVE_START_X + millimeters;

    // 2. Thimble axial rotation:
    // Pitch is 0.5 mm per revolution.
    // In our coordinate system, rotating +around X moves ascending divisions (0, 5, 10, ... 45)
    // past the horizontal datum line in textbook ascending order!
    const revolutions = millimeters / 0.5;
    this.thimbleGroup.rotation.x = revolutions * Math.PI * 2;

    // 3. Spindle linear position:
    // Tip is at X = mm. Spindle length is 85mm.
    // Center is at X = mm + length / 2.
    const spindleLen = 85;
    this.spindleMesh.position.set(millimeters + spindleLen / 2, 0, 0);

    // 4. Update sample object position/clamping if present
    this.sampleMesh?.position.setX(millimeters / 2);
  }

  /**
   * Inserts or removes a standard physical sample object to measure.
   *
   * @param sample The sample to display, or null to remove it.
   */
  setSampleObject(sample: SampleObject | null): void {
    if (this.sampleMesh) {
      this.scene.remove(this.sampleMesh);
      this.sampleMesh.geometry.dispose();
      this.sampleMesh = null;
    }

    this.sampleSize = 0;
    if (!sample) return;

    this.sampleSize = sample.sizeMm;

    let geo: BufferGeometry;
    if (sample.type === "sphere") geo = new SphereGeometry(sample.sizeMm / 2, 32, 24);
    else if (sample.type === "wire")
      geo = new CylinderGeometry(sample.sizeMm / 2, sample.sizeMm / 2, 22, 24);
    else if (sample.type === "box") geo = new BoxGeometry(sample.sizeMm, 12, 12);
    else geo = new CylinderGeometry(sample.sizeMm / 2, sample.sizeMm / 2, 14, 32);

    const mat = new MeshStandardMaterial({
      color: sample.color,
      metalness: 0.65,
      roughness: 0.35,
    });

    this.sampleMesh = new Mesh(geo, mat);
    this.sampleMesh.position.set(sample.sizeMm / 2, 0, 0);
    this.sampleMesh.castShadow = true;
    this.scene.add(this.sampleMesh);
  }

  /**
   * Sets a preset camera position for the classroom demonstration.
   *
   * @param preset The camera preset to activate.
   */
  setViewPreset(preset: ViewPreset): void {
    const duration = 800;
    const startTime = performance.now();
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();

    let targetLookAt: Vector3, targetPos: Vector3;

    switch (preset) {
      case "closeup": {
        // High School Physics Reading View:
        // Direct, crisp perpendicular view of the alignment between sleeve datum line & thimble bevel!
        targetPos = new Vector3(this.SLEEVE_START_X + this.currentReading * 0.6, 1.2, 38);
        targetLookAt = new Vector3(this.SLEEVE_START_X + this.currentReading * 0.6, 0, 0);
        break;
      }
      case "anvil": {
        // Anvil measurement gap closeup
        targetPos = new Vector3(this.currentReading / 2, 2.5, 26);
        targetLookAt = new Vector3(this.currentReading / 2, 0, 0);
        break;
      }
      case "top": {
        // Top-down view
        targetPos = new Vector3(26, 70, 0);
        targetLookAt = new Vector3(26, 0, 0);
        break;
      }
      case "overview": {
        // Full instrument perspective
        targetPos = new Vector3(28, 15, 85);
        targetLookAt = new Vector3(22, -5, 0);
        break;
      }
      default: {
        targetPos = new Vector3(28, 15, 85);
        targetLookAt = new Vector3(22, -5, 0);
      }
    }

    const animateCamera = (): void => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Smooth cubic ease out
      const ease = 1 - (1 - progress) ** 3;

      this.camera.position.lerpVectors(startPos, targetPos, ease);
      this.controls.target.lerpVectors(startTarget, targetLookAt, ease);
      this.controls.update();

      if (progress < 1) requestAnimationFrame(animateCamera);
    };
    animateCamera();
  }

  private readonly animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    // Smooth lerp to target reading if animating
    if (Math.abs(this.targetReading - this.currentReading) > 0.0001) {
      const step = (this.targetReading - this.currentReading) * 0.2;
      this.currentReading += step;
      this.update3DState(this.currentReading);
      this.onReadingChange?.(this.currentReading);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  destroy(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
