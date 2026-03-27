import type { FC, MouseEvent } from "react";
import { useEffect, useRef } from "react";

import { GRAVITY } from "../constants.js";
import type { PendulumConfig } from "../types.js";

interface PendulumSimulationProps {
  height: number;
  pendulums: PendulumConfig[];
  isPlaying: boolean;
  angularVelocity: number;
}

export const PendulumSimulation: FC<PendulumSimulationProps> = ({
  height,
  pendulums,
  isPlaying,
  angularVelocity,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>();
  const timeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);

  // Camera State
  const cameraRef = useRef({
    yaw: 0, // Rotation around Y axis
    pitch: 0.2, // Rotation around X axis (initial tilt)
    zoom: 1,
  });

  // Mouse Interaction State
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const render = (timestamp: number): void => {
      if (!lastFrameTimeRef.current) lastFrameTimeRef.current = timestamp;
      const deltaTime = (timestamp - lastFrameTimeRef.current) / 1000;

      lastFrameTimeRef.current = timestamp;

      if (isPlaying) timeRef.current += deltaTime;

      // Physics State
      const currentAngle = timeRef.current * angularVelocity;

      // Setup Canvas
      const { width } = canvas;
      const heightPx = canvas.height;
      const centerX = width / 2;
      const centerY = heightPx / 6;
      const metersToPixels = 220; // Scale up for large screen

      // Clear Canvas
      ctx.fillStyle = "#020617"; // slate-950
      ctx.fillRect(0, 0, width, heightPx);

      // --- 3D Projection Logic ---
      const project = (
        x: number,
        y: number,
        z: number,
      ): {
        x: number;
        y: number;
        scale: number;
        zDepth: number;
      } => {
        // 1. Rotate around Y axis (Yaw)
        const cosYaw = Math.cos(cameraRef.current.yaw);
        const sinYaw = Math.sin(cameraRef.current.yaw);
        const x1 = x * cosYaw - z * sinYaw;
        const z1 = x * sinYaw + z * cosYaw;

        // 2. Rotate around X axis (Pitch)
        const cosPitch = Math.cos(cameraRef.current.pitch);
        const sinPitch = Math.sin(cameraRef.current.pitch);
        const y2 = y * cosPitch - z1 * sinPitch;
        const z2 = y * sinPitch + z1 * cosPitch;

        // 3. Perspective Projection
        // Camera distance acts as the focal length
        const cameraDist = 2000;
        const scale = cameraDist / (cameraDist + z2 * metersToPixels);

        return {
          x: centerX + x1 * metersToPixels * scale,
          y: centerY + y2 * metersToPixels * scale,
          scale: scale,
          zDepth: z2, // Used for sorting
        };
      };

      // Helper to draw 3D Arrow
      const drawArrow3D = (
        startX: number,
        startY: number,
        startZ: number,
        vecX: number,
        vecY: number,
        vecZ: number,
        color: string,
        label: string,
        isDashed = false,
      ): void => {
        const endX = startX + vecX;
        const endY = startY + vecY;
        const endZ = startZ + vecZ;

        const pStart = project(startX, startY, startZ);
        const pEnd = project(endX, endY, endZ);

        // Line
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 5 * pStart.scale;
        if (isDashed) ctx.setLineDash([5, 5]);
        else ctx.setLineDash([]);
        ctx.moveTo(pStart.x, pStart.y);
        ctx.lineTo(pEnd.x, pEnd.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrowhead
        const headLen = 15 * pEnd.scale;
        const angle = Math.atan2(pEnd.y - pStart.y, pEnd.x - pStart.x);

        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.moveTo(pEnd.x, pEnd.y);
        ctx.lineTo(
          pEnd.x - headLen * Math.cos(angle - Math.PI / 6),
          pEnd.y - headLen * Math.sin(angle - Math.PI / 6),
        );
        ctx.lineTo(
          pEnd.x - headLen * Math.cos(angle + Math.PI / 6),
          pEnd.y - headLen * Math.sin(angle + Math.PI / 6),
        );
        ctx.fill();

        // Label
        if (label) {
          ctx.font = `bold ${24 * pEnd.scale}px sans-serif`;
          ctx.fillStyle = color;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          // Offset label slightly past arrow tip
          const labelX = pEnd.x + (headLen + 15) * Math.cos(angle);
          const labelY = pEnd.y + (headLen + 15) * Math.sin(angle);

          ctx.fillText(label, labelX, labelY);
        }
      };

      // Helper to draw dashed connecting line (no arrow)
      const drawDashedLine3D = (
        x1: number,
        y1: number,
        z1: number,
        x2: number,
        y2: number,
        z2: number,
        color: string,
      ): void => {
        const p1 = project(x1, y1, z1);
        const p2 = project(x2, y2, z2);

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5 * p1.scale;
        ctx.setLineDash([4, 4]);
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.setLineDash([]);
      };

      // --- Draw Scene Elements ---

      // 1. Suspension Point (Origin)
      const origin = project(0, 0, 0);

      // 2. Floor / Reference Plane (at y = height)
      // Draw a grid or circle on the floor
      const floorY = height;

      // Draw Central Axis Line
      const floorCenter = project(0, floorY, 0);

      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = "#334155"; // slate-700
      ctx.lineWidth = 2;
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(floorCenter.x, floorCenter.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Ceiling / Support structure
      ctx.beginPath();
      ctx.fillStyle = "#94a3b8";
      ctx.arc(origin.x, origin.y, 8 * origin.scale, 0, Math.PI * 2);
      ctx.fill();

      // --- Pendulums ---
      const objectsToRender = pendulums.map((p) => {
        const r = Math.sqrt(Math.max(0, p.length * p.length - height * height));

        // Physics coordinates (Right-handed: Y down, Z forward/back)
        // Pos: x = r*cos(angle), y = height, z = r*sin(angle)
        const xPhys = r * Math.cos(currentAngle);
        const zPhys = r * Math.sin(currentAngle);
        const yPhys = height;

        const pos2D = project(xPhys, yPhys, zPhys);

        // Orbit Path (Trail)
        const pathPoints = [];

        for (let a = 0; a <= Math.PI * 2; a += 0.1) {
          const px = r * Math.cos(a);
          const pz = r * Math.sin(a);

          pathPoints.push(project(px, height, pz));
        }

        return {
          config: p,
          pos: pos2D,
          path: pathPoints,
          phys: { r, x: xPhys, y: yPhys, z: zPhys },
        };
      });

      // Sort by Z depth (Painter's algorithm) - render furthest first
      objectsToRender.sort((a, b) => b.pos.zDepth - a.pos.zDepth);

      objectsToRender.forEach((obj) => {
        // Draw Orbit Path
        ctx.beginPath();
        ctx.strokeStyle = `${obj.config.color}44`; // Transparent
        ctx.lineWidth = 3 * obj.pos.scale;
        obj.path.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.closePath();
        ctx.stroke();

        // Draw String
        ctx.beginPath();
        ctx.strokeStyle = "#cbd5e1"; // slate-300
        ctx.lineWidth = 2 * obj.pos.scale;
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(obj.pos.x, obj.pos.y);
        ctx.stroke();

        // Draw Bob
        // Mass affects visual size
        const bobBaseSize = 12;
        const bobSize = (bobBaseSize + obj.config.mass * 4) * obj.pos.scale;

        ctx.beginPath();
        const grad = ctx.createRadialGradient(
          obj.pos.x - bobSize / 3,
          obj.pos.y - bobSize / 3,
          bobSize / 4,
          obj.pos.x,
          obj.pos.y,
          bobSize,
        );

        grad.addColorStop(0, "#fff");
        grad.addColorStop(0.5, obj.config.color);
        grad.addColorStop(1, "#000");
        ctx.fillStyle = grad;

        ctx.arc(obj.pos.x, obj.pos.y, bobSize, 0, Math.PI * 2);
        ctx.fill();

        // --- Force Analysis for Blue Ball (ID=1) ---
        if (obj.config.id === 1) {
          const m = obj.config.mass;
          const { r } = obj.phys;

          // Scale factor for vectors (pixels per Newton approx, adjust for visibility)
          const forceScale = 0.05; // Visual scaling factor

          // Gravity: mg (Downwards +Y)
          // Color: Blue (#3b82f6)
          const vectorGMagnitude = m * GRAVITY * forceScale;

          drawArrow3D(obj.phys.x, obj.phys.y, obj.phys.z, 0, vectorGMagnitude, 0, "#3b82f6", "mg");

          // Tension Components
          // Ty balances gravity: magnitude mg, Direction Up (-Y)
          // Color: Light Blue / Purple (#a78bfa) - Neutral balance color
          const vectorYMagnitude = m * GRAVITY * forceScale;

          drawArrow3D(
            obj.phys.x,
            obj.phys.y,
            obj.phys.z,
            0,
            -vectorYMagnitude,
            0,
            "#a78bfa",
            "",
            true,
          ); // Dashed

          // Tx provides centripetal force: Fn = m * omega^2 * r
          // Direction: Towards center (0, y, 0)
          // Color: Yellow (#eab308)
          const distToCenter = Math.sqrt(obj.phys.x ** 2 + obj.phys.z ** 2);
          const Fn_mag = m * angularVelocity ** 2 * r * forceScale;

          if (distToCenter > 0.001) {
            const dirX = -obj.phys.x / distToCenter;
            const dirZ = -obj.phys.z / distToCenter;

            // Draw Fn (Tx)
            drawArrow3D(
              obj.phys.x,
              obj.phys.y,
              obj.phys.z,
              dirX * Fn_mag,
              0,
              dirZ * Fn_mag,
              "#eab308",
              "Fn",
              true, // Dashed
            );

            // Total Tension T = Vector Sum
            // Color: Red (#ef4444)
            drawArrow3D(
              obj.phys.x,
              obj.phys.y,
              obj.phys.z,
              dirX * Fn_mag,
              -vectorYMagnitude,
              dirZ * Fn_mag,
              "#ef4444",
              "FT",
            );

            // --- Decomposition Dashed Lines (Parallelogram) ---
            // Calculate Tip Positions
            const tipT = {
              x: obj.phys.x + dirX * Fn_mag,
              y: obj.phys.y - vectorYMagnitude,
              z: obj.phys.z + dirZ * Fn_mag,
            };

            const tipTy = {
              x: obj.phys.x,
              y: obj.phys.y - vectorYMagnitude,
              z: obj.phys.z,
            };

            const tipFn = {
              x: obj.phys.x + dirX * Fn_mag,
              y: obj.phys.y,
              z: obj.phys.z + dirZ * Fn_mag,
            };

            // Line from Tip of Ty -> Tip of T (Parallel to Fn)
            drawDashedLine3D(tipTy.x, tipTy.y, tipTy.z, tipT.x, tipT.y, tipT.z, "#94a3b8");

            // Line from Tip of Fn -> Tip of T (Parallel to Ty)
            drawDashedLine3D(tipFn.x, tipFn.y, tipFn.z, tipT.x, tipT.y, tipT.z, "#94a3b8");
          }
        }

        // Labels (High contrast for projector)
        ctx.font = `bold ${Math.max(20, 16 * obj.pos.scale)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Label Background
        const labelText = `m=${obj.config.mass}kg`;
        const metrics = ctx.measureText(labelText);
        const pad = 4;

        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(
          obj.pos.x - metrics.width / 2 - pad,
          obj.pos.y + bobSize + 5,
          metrics.width + pad * 2,
          20,
        );

        ctx.fillStyle = "#fff";
        ctx.fillText(labelText, obj.pos.x, obj.pos.y + bobSize + 15);
      });

      animationRef.current = requestAnimationFrame(render);
    };

    // Resize handler
    const resize = (): void => {
      if (canvasRef.current?.parentElement) {
        canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
        canvasRef.current.height = canvasRef.current.parentElement.clientHeight;
      }
    };

    window.addEventListener("resize", resize);
    resize();

    animationRef.current = requestAnimationFrame(render);

    return (): void => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [height, pendulums, isPlaying, angularVelocity]);

  // Interaction Handlers
  const handleMouseDown = (e: MouseEvent): void => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: MouseEvent): void => {
    if (!isDragging.current) return;

    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;

    // Update camera angles
    cameraRef.current.yaw += deltaX * 0.01;
    // Limit pitch to avoid flipping over or going under floor too much
    cameraRef.current.pitch = Math.max(
      -0.5,
      Math.min(1.5, cameraRef.current.pitch + deltaY * 0.01),
    );

    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = (): void => {
    isDragging.current = false;
  };

  return (
    <div className="w-full h-full cursor-move relative bg-slate-950">
      <canvas
        ref={canvasRef}
        className="w-full h-full block touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
};
