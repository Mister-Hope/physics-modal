import { CanvasTexture, ClampToEdgeWrapping, RepeatWrapping } from "three";

const getCanvasContext = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法创建 2D Canvas 绘图上下文");
  return context;
};

/**
 * Creates a high-resolution procedural canvas texture for the fixed sleeve (固定套管主尺). Features: -
 * Satin chrome metallic background with horizontal brushed finish - Central horizontal datum line
 * (基准线) exactly in the middle - Upper ticks: integer millimeters (0, 1, 2, ... 25 mm) with bold
 * labels every 5 mm - Lower ticks: half millimeters (0.5, 1.5, ... 24.5 mm) - Ticks and numbers are
 * oriented along the sleeve length without angular wrapping
 *
 * @returns Sleeve texture and its physical scale mapping.
 */
export const createSleeveTexture = (): {
  texture: CanvasTexture;
  startU: number;
  endU: number;
  mmSpacing: number;
  canvasHeight: number;
} => {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = getCanvasContext(canvas);

  // 1. Anti-glare Satin Chrome metallic background (消光亚光无眩光工业镀铬)
  // Even, diffuse tone that eliminates harsh blinding reflections under directional lighting
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, "#bcc5cf");
  bgGrad.addColorStop(0.2, "#cfd6de");
  bgGrad.addColorStop(0.5, "#dfe5ec"); // Soft matte satin silver-grey, completely avoiding glare washout
  bgGrad.addColorStop(0.8, "#cfd6de");
  bgGrad.addColorStop(1, "#bcc5cf");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle brushed satin horizontal metallic grain
  ctx.fillStyle = "rgba(0,0,0,0.018)";
  for (let row = 0; row < height; row += 3) ctx.fillRect(0, row, width, 1.5);

  // Datum line coordinates:
  // Center is at datumY = height / 2 (512).
  // 0 mm mark is at startX, 25 mm mark is at endX.
  const datumY = height / 2;
  const startX = 160; // 0 mm mark position
  const endX = 1860; // 25 mm mark position
  const mmSpacing = (endX - startX) / 25; // 68 pixels per mm

  // 2. Central datum line (基准线) - Crisp, deep carbon black with high visibility
  ctx.strokeStyle = "#020617";
  ctx.lineWidth = 5.2;
  ctx.beginPath();
  ctx.moveTo(startX - 60, datumY);
  ctx.lineTo(endX + 80, datumY);
  ctx.stroke();

  // 3. Millimeter marks (0 to 25 mm) with 1:1 physical aspect ratio
  // Upper ticks: integer mm (pointed upwards)
  // Lower ticks: half mm (pointed downwards)
  ctx.fillStyle = "#020617";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.font = '700 68px "SF Pro Display", -apple-system, system-ui, sans-serif';

  for (let millimeters = 0; millimeters <= 25; millimeters++) {
    const x = startX + millimeters * mmSpacing;
    const isFive = millimeters % 5 === 0;
    // Upper tick length: 1.9 mm for 5mm marks, 1.2 mm for normal 1mm marks
    const tickLen = isFive ? Math.round(1.9 * mmSpacing) : Math.round(1.2 * mmSpacing);

    ctx.lineWidth = isFive ? 4.6 : 3.2;
    ctx.beginPath();
    ctx.moveTo(x, datumY);
    ctx.lineTo(x, datumY - tickLen);
    ctx.stroke();

    // Numerical labels for 0, 5, 10, 15, 20, 25 (upright, 1:1 aspect ratio)
    if (isFive) ctx.fillText(millimeters.toString(), x, datumY - tickLen - 12);

    // Lower tick (Half mm: 0.5, 1.5, ... 24.5) pointing downwards from datumY (1.2 mm length)
    if (millimeters < 25) {
      const halfX = x + mmSpacing * 0.5;
      const halfTickLen = Math.round(1.2 * mmSpacing);
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(halfX, datumY);
      ctx.lineTo(halfX, datumY + halfTickLen);
      ctx.stroke();
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.anisotropy = 8;
  texture.needsUpdate = true;

  return {
    texture,
    startU: startX / width,
    endU: endX / width,
    mmSpacing,
    canvasHeight: height,
  };
};

/**
 * Creates procedural canvas texture for the movable thimble bevel (微分筒锥形读数圈). - Circumference (U):
 * 50 divisions (0 to 49) - Length (V): 0 is the left measuring edge, 1 is the right edge meeting
 * the body. - Division tick lines start at the LEFT edge and extend to the right. - Numbers (0, 5,
 * 10, ... 45) are clearly legible and properly proportioned without squishing.
 *
 * @returns The generated thimble bevel texture.
 */
export const createThimbleBevelTexture = (): CanvasTexture => {
  const width = 2048; // wraps around 360 deg circumference (50 divisions)
  const height = 512; // along the bevel length (left to right)
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = getCanvasContext(canvas);

  // 1. Satin chrome metallic background with soft radial highlight
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, "#f8fafc");
  bgGrad.addColorStop(0.3, "#e2e8f0");
  bgGrad.addColorStop(0.8, "#cbd5e1");
  bgGrad.addColorStop(1, "#94a3b8");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle metallic brushing
  ctx.fillStyle = "rgba(0,0,0,0.015)";
  for (let y = 0; y < height; y += 2) ctx.fillRect(0, y, width, 1);

  // 2. 50 circumferential division lines
  const divSpacing = width / 50; // 40.96 px per division
  ctx.strokeStyle = "#0f172a";
  ctx.fillStyle = "#0f172a";

  for (let i = 0; i < 50; i++) {
    const x = i * divSpacing;
    const isFive = i % 5 === 0;
    // Ticks start at y = 0 (the left measuring edge) and extend downwards (to the right on the cylinder)
    const tickLen = isFive ? 140 : 80;

    ctx.lineWidth = isFive ? 3.8 : 2.4;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, tickLen);
    ctx.stroke();

    // Numerical labels for 0, 5, 10, 15, 20, 25, 30, 35, 40, 45
    if (isFive) {
      ctx.save();
      // Position label at y = 220, centered on division x
      ctx.translate(x, 220);
      // Rotate 90 deg so text reads along cylinder axis from left to right:
      ctx.rotate(Math.PI / 2);
      // Compensate for texture aspect ratio difference (Canvas Y density 128 px/mm vs Canvas X density 61 px/mm)
      // This guarantees the font in 3D is perfectly proportioned without horizontal squishing or stretching!
      const aspectCorrection = 512 / 4 / (2048 / 33.6); // ~2.10
      ctx.scale(aspectCorrection, 1);

      ctx.font = 'bold 22px "SF Pro Display", system-ui, sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(i.toString(), 0, 0);
      ctx.restore();
    }
  }

  // Crisp chamfer edge accent at y = 0
  ctx.strokeStyle = "rgba(15, 23, 42, 0.4)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 1.5);
  ctx.lineTo(width, 1.5);
  ctx.stroke();

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.anisotropy = 8;
  texture.needsUpdate = true;

  return texture;
};

/**
 * Creates high-detail diamond knurl texture for the thimble grip body (微分筒滚花身).
 *
 * @returns The generated knurl texture.
 */
export const createKnurlTexture = (): CanvasTexture => {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = getCanvasContext(canvas);

  // Satin steel base
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(0, 0, size, size);

  // Cross-hatch diamond knurling relief
  const step = 16;
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 2;

  ctx.beginPath();
  for (let k = -size; k < size * 2; k += step) {
    ctx.moveTo(k, 0);
    ctx.lineTo(k + size, size);

    ctx.moveTo(k, size);
    ctx.lineTo(k + size, 0);
  }
  ctx.stroke();

  // Highlight points on diamond tips
  ctx.fillStyle = "#f1f5f9";
  for (let x = 0; x < size; x += step)
    for (let y = 0; y < size; y += step) ctx.fillRect(x - 1, y - 1, 2, 2);

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(8, 2);
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
};

/**
 * Creates frame inscription texture ("0-25mm 0.01mm"). Brushed satin bright silver metallic face
 * with precision laser-engraved typography.
 *
 * @returns The generated frame label texture.
 */
export const createFrameLabelTexture = (): CanvasTexture => {
  const width = 1024;
  const height = 256;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = getCanvasContext(canvas);

  // Brushed satin bright silver metallic background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, "#cbd5e1");
  bgGrad.addColorStop(0.25, "#f1f5f9");
  bgGrad.addColorStop(0.5, "#ffffff");
  bgGrad.addColorStop(0.75, "#e2e8f0");
  bgGrad.addColorStop(1, "#94a3b8");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle brushed metallic noise
  ctx.fillStyle = "rgba(0,0,0,0.025)";
  for (let y = 0; y < height; y += 2) ctx.fillRect(0, y, width, 1);

  // Precision border bevel
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 5;
  ctx.strokeRect(8, 8, width - 16, height - 16);

  // Laser engraved text
  ctx.fillStyle = "#0f172a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = 'bold 56px "SF Pro Display", sans-serif';
  ctx.fillText("0 - 25 mm    0.01 mm", width / 2, height / 2 - 26);

  ctx.fillStyle = "#334155";
  ctx.font = "600 30px sans-serif";
  ctx.fillText("STAINLESS STEEL · 高中物理教学标准", width / 2, height / 2 + 36);

  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

/**
 * Creates straight ribbed knurling / fluted grip texture for the ratchet stop knob (棘轮旋钮花纹).
 * Features sharp metallic ridge highlights, dark recessed flute grooves, and chamfered edges.
 *
 * @returns The generated ratchet texture.
 */
export const createRatchetKnurlTexture = (): CanvasTexture => {
  const width = 512;
  const height = 256;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = getCanvasContext(canvas);

  // 1. Dark satin titanium base
  ctx.fillStyle = "#475569";
  ctx.fillRect(0, 0, width, height);

  // 2. High-precision longitudinal flutes (纵向直齿防滑槽)
  const fluteCount = 32;
  const fluteSpacing = width / fluteCount; // 16px per flute

  for (let i = 0; i < fluteCount; i++) {
    const x = i * fluteSpacing;

    // Deep recessed shadow line (凹槽阴影)
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(x, 0, 4, height);

    // Mid-tone transitional bevel
    ctx.fillStyle = "#64748b";
    ctx.fillRect(x + 4, 0, 4, height);

    // Bright metallic crest highlight (凸棱反光)
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(x + 8, 0, 5, height);

    // Soft bevel back to next shadow
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(x + 13, 0, 3, height);
  }

  // 3. Subtle micro-knurling cross noise
  ctx.fillStyle = "rgba(0,0,0,0.04)";
  for (let y = 0; y < height; y += 4) ctx.fillRect(0, y, width, 1.5);

  // 4. Edge bevel shadows at left and right boundaries
  const edgeGrad = ctx.createLinearGradient(0, 0, 0, height);
  edgeGrad.addColorStop(0, "rgba(15, 23, 42, 0.4)");
  edgeGrad.addColorStop(0.12, "rgba(15, 23, 42, 0)");
  edgeGrad.addColorStop(0.88, "rgba(15, 23, 42, 0)");
  edgeGrad.addColorStop(1, "rgba(15, 23, 42, 0.4)");
  ctx.fillStyle = edgeGrad;
  ctx.fillRect(0, 0, width, height);

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
};
