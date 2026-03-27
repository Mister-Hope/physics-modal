import type { FC } from "react";
import { useRef, useEffect } from "react";

import type { SimulationState, PhysicsResult } from "../types";

interface SimulationCanvasProps {
  state: SimulationState;
  physics: PhysicsResult;
}

const SimulationCanvas: FC<SimulationCanvasProps> = ({ state, physics }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const { width } = rect;
    const { height } = rect;

    ctx.clearRect(0, 0, width, height);

    // --- Configuration ---
    const centerX = width / 2;

    // Adjusted ground position to be higher (approx 2/3 down the screen)
    // Previously 0.85, now 0.70 to keep train visible on smaller screens
    const groundY = height * 0.7;

    const trackWidth = 240;
    const railHeight = 40;
    const railHeadWidth = 20;

    const trainBodyWidth = 320;
    const trainBodyHeight = 180;

    // Wheel Dimensions
    const wheelTreadRadius = 25;
    const wheelFlangeRadius = 35;
    const wheelTreadWidth = 35;
    const wheelFlangeWidth = 12;
    const axleDiameter = 20;

    // Forces
    const forceScale = 0.03;

    // --- Static Ground ---
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(0, groundY, width, height - groundY);
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.stroke();

    // --- Coordinate Transformation ---
    const pivotX = centerX - trackWidth / 2;
    const pivotY = groundY;
    const angleRad = (state.angle * Math.PI) / 180;

    // --- Sand Wedge (Ballast) ---
    // Calculate vertices of the sleeper bottom in Global Coordinates
    // Local Sleeper: x from -40 to trackWidth+40, y from 0 to 12.
    // We want the bottom corners (y=12).
    // Transformation: x' = x cos a + y sin a, y' = -x sin a + y cos a

    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);

    // Left Sleeper Bottom Corner (Local: -40, 12)
    const p1x = -40 * cosA + 12 * sinA;
    const p1y = 40 * sinA + 12 * cosA;

    // Right Sleeper Bottom Corner (Local: trackWidth+40, 12)
    const wExt = trackWidth + 40;
    const p2x = wExt * cosA + 12 * sinA;
    const p2y = -wExt * sinA + 12 * cosA;

    ctx.save();
    ctx.translate(pivotX, pivotY);

    // Draw polygon from P1 -> P2 -> Ground(P2x, 0) -> Ground(P1x, 0)
    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    ctx.lineTo(p2x, p2y);
    ctx.lineTo(p2x, 0);
    ctx.lineTo(p1x, 0);
    ctx.closePath();

    ctx.fillStyle = "#fdba74"; // Sand color
    ctx.fill();
    // No stroke

    // --- Rotate for Track System ---
    ctx.rotate(-angleRad);

    // Sleepers
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(-40, 0, trackWidth + 80, 12);

    // --- Rails ---
    const drawRail = (x: number): void => {
      ctx.fillStyle = "#cbd5e1";
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1;

      // Base
      ctx.fillRect(x - 15, -5, 30, 5);
      // Web
      ctx.fillRect(x - 6, -railHeight, 12, railHeight);
      // Head
      ctx.fillRect(x - railHeadWidth / 2, -railHeight, railHeadWidth, 10);
      ctx.strokeRect(x - railHeadWidth / 2, -railHeight, railHeadWidth, 10);
    };

    drawRail(0);
    drawRail(trackWidth);

    // --- Wheelset ---
    const axleCenterY = -railHeight - wheelTreadRadius;

    ctx.fillStyle = "#334155";
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;

    // Axle
    ctx.fillRect(0, axleCenterY - axleDiameter / 2, trackWidth, axleDiameter);
    ctx.strokeRect(0, axleCenterY - axleDiameter / 2, trackWidth, axleDiameter);

    // Wheels
    const drawWheel = (cx: number, isLeft: boolean): void => {
      const treadTop = axleCenterY - wheelTreadRadius;
      const treadBottom = axleCenterY + wheelTreadRadius;
      const flangeTop = axleCenterY - wheelFlangeRadius;
      const flangeBottom = axleCenterY + wheelFlangeRadius;

      ctx.fillStyle = "#475569";

      if (isLeft) {
        ctx.fillRect(cx - wheelTreadWidth / 2, treadTop, wheelTreadWidth, treadBottom - treadTop);
        ctx.strokeRect(cx - wheelTreadWidth / 2, treadTop, wheelTreadWidth, treadBottom - treadTop);
        const flangeX = cx + 10;

        ctx.fillRect(flangeX, flangeTop, wheelFlangeWidth, flangeBottom - flangeTop);
        ctx.strokeRect(flangeX, flangeTop, wheelFlangeWidth, flangeBottom - flangeTop);
      } else {
        ctx.fillRect(cx - wheelTreadWidth / 2, treadTop, wheelTreadWidth, treadBottom - treadTop);
        ctx.strokeRect(cx - wheelTreadWidth / 2, treadTop, wheelTreadWidth, treadBottom - treadTop);
        const flangeX = cx - 10 - wheelFlangeWidth;

        ctx.fillRect(flangeX, flangeTop, wheelFlangeWidth, flangeBottom - flangeTop);
        ctx.strokeRect(flangeX, flangeTop, wheelFlangeWidth, flangeBottom - flangeTop);
      }
    };

    drawWheel(0, true);
    drawWheel(trackWidth, false);

    // --- Train Body ---
    const bodyBottom = axleCenterY - 45;
    const bodyTop = bodyBottom - trainBodyHeight;

    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";

    ctx.beginPath();
    const bLeft = trackWidth / 2 - trainBodyWidth / 2;
    const bRight = trackWidth / 2 + trainBodyWidth / 2;

    // Body Shape
    ctx.moveTo(bLeft + 30, bodyBottom);
    ctx.lineTo(bRight - 30, bodyBottom);
    ctx.lineTo(bRight, bodyBottom - 40);
    ctx.lineTo(bRight, bodyTop + 60);
    ctx.quadraticCurveTo(bRight, bodyTop, bRight - 60, bodyTop);
    ctx.lineTo(bLeft + 60, bodyTop);
    ctx.quadraticCurveTo(bLeft, bodyTop, bLeft, bodyTop + 60);
    ctx.lineTo(bLeft, bodyBottom - 40);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();

    // Center of Mass
    const comX = trackWidth / 2;
    const comY = bodyBottom - trainBodyHeight / 2 + 20;

    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(comX, comY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // --- Forces ---
    if (state.forceMode !== "none") {
      const drawArrow = (
        from: { x: number; y: number },
        vec: { x: number; y: number },
        style: { color: string; label: string; isDashed?: boolean },
      ): void => {
        const headLength = 15;
        const toX = from.x + vec.x;
        const toY = from.y + vec.y;
        const angle = Math.atan2(vec.y, vec.x);
        const len = Math.hypot(vec.x, vec.y);
        const { color, label, isDashed = false } = style;

        if (len < 5 && !isDashed) return;

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 4;

        if (isDashed) ctx.setLineDash([6, 6]);
        else ctx.setLineDash([]);

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(
          toX - headLength * Math.cos(angle - Math.PI / 6),
          toY - headLength * Math.sin(angle - Math.PI / 6),
        );
        ctx.lineTo(
          toX - headLength * Math.cos(angle + Math.PI / 6),
          toY - headLength * Math.sin(angle + Math.PI / 6),
        );
        ctx.fill();

        ctx.font = "bold 20px sans-serif";
        const textMetrics = ctx.measureText(label);
        const textX = toX + (vec.x > 0 ? 10 : -10 - textMetrics.width);
        const textY = toY + (vec.y > 0 ? 25 : -10);

        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillRect(textX - 2, textY - 18, textMetrics.width + 4, 22);

        ctx.fillStyle = color;
        ctx.fillText(label, textX, textY);
      };

      const isConcurrent = state.forceMode === "concurrent";

      // 1. Normal Force
      const fnMag = physics.normalForce * forceScale;
      const fnOriginX = isConcurrent ? comX : trackWidth / 2;
      const fnOriginY = isConcurrent ? comY : axleCenterY;

      drawArrow(
        { x: fnOriginX, y: fnOriginY },
        { x: 0, y: -fnMag },
        { color: "#9333ea", label: "Fn" },
      );

      // 2. Gravity
      const gMag = physics.gravity * forceScale;
      const gX = gMag * -Math.sin(angleRad);
      const gY = gMag * Math.cos(angleRad);

      drawArrow({ x: comX, y: comY }, { x: gX, y: gY }, { color: "#000000", label: "G" });

      // 3. Flange Force
      const fNewtons = physics.flangeForce;

      if (Math.abs(fNewtons) > 100) {
        const fMag = Math.abs(fNewtons) * forceScale;
        const color = fNewtons > 0 ? "#ef4444" : "#f97316";

        let fOriginX = comX;
        let fOriginY = comY;
        const fVecX = fNewtons > 0 ? -fMag : fMag;

        if (isConcurrent) {
          fOriginX = comX;
          fOriginY = comY;
        } else {
          fOriginY = axleCenterY;
          fOriginX = fNewtons > 0 ? trackWidth : 0;
        }

        drawArrow({ x: fOriginX, y: fOriginY }, { x: fVecX, y: 0 }, { color, label: "F" });
      }

      // 4. Net Force
      const netMag = physics.netForce * forceScale;
      const netVecX = netMag * -Math.cos(angleRad);
      const netVecY = netMag * -Math.sin(angleRad);

      drawArrow(
        { x: comX, y: comY },
        { x: netVecX, y: netVecY },
        { color: "#22c55e", label: "F向", isDashed: true },
      );
    }

    // --- Plane Indicator ---
    if (state.showPlane) {
      ctx.save();
      ctx.strokeStyle = "#0f172a";
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 2;

      const lineLen = 1200;
      const targetX = comX + lineLen * -Math.cos(angleRad);
      const targetY = comY + lineLen * -Math.sin(angleRad);

      ctx.beginPath();
      ctx.moveTo(comX, comY);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();

      const textDist = 320;
      const localTextX = textDist * -Math.cos(angleRad);
      const localTextY = textDist * -Math.sin(angleRad);

      const drawTextX = comX + localTextX;
      const drawTextY = comY + localTextY;

      ctx.save();
      ctx.translate(drawTextX, drawTextY);
      ctx.rotate(angleRad);

      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 16px sans-serif";
      ctx.textBaseline = "middle";
      ctx.fillText("圆周平面", 0, -25);

      ctx.restore();
      ctx.restore();
    }

    ctx.restore();
  }, [state, physics]);

  return (
    <div className="w-full h-full bg-slate-50 rounded-xl overflow-hidden shadow-inner border border-slate-200">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};

export default SimulationCanvas;
