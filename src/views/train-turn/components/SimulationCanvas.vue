<script setup lang="ts">
import { useEventListener, watchImmediate } from "@vueuse/core";
import { ref } from "vue";

import type { PhysicsResult, SimulationState } from "../types";

interface Props {
  state: SimulationState;
  physics: PhysicsResult;
  darkMode?: boolean;
}

const { state, physics, darkMode = false } = defineProps<Props>();

const canvasRef = ref<HTMLCanvasElement>();
const draw = (): void => {
  const canvas = canvasRef.value;
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

  const isDark = darkMode;
  const bgColor = isDark ? "#0f172a" : "#f8fafc";
  const groundColor = isDark ? "#334155" : "#e2e8f0";

  const centerX = width / 2;
  const groundY = height * 0.7;
  const trackWidth = 240;
  const railHeight = 40;
  const railHeadWidth = 20;
  const trainBodyWidth = 320;
  const trainBodyHeight = 180;
  const wheelTreadRadius = 25;
  const wheelFlangeRadius = 35;
  const wheelTreadWidth = 35;
  const wheelFlangeWidth = 12;
  const axleDiameter = 20;
  const forceScale = 0.03;

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // Ground
  ctx.fillStyle = groundColor;
  ctx.fillRect(0, groundY, width, height - groundY);
  ctx.strokeStyle = isDark ? "#64748b" : "#94a3b8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(width, groundY);
  ctx.stroke();

  const pivotX = centerX - trackWidth / 2;
  const pivotY = groundY;
  const angleRad = (state.angle * Math.PI) / 180;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  const p1x = -40 * cosA + 12 * sinA;
  const p1y = 40 * sinA + 12 * cosA;
  const wExt = trackWidth + 40;
  const p2x = wExt * cosA + 12 * sinA;
  const p2y = -wExt * sinA + 12 * cosA;

  ctx.save();
  ctx.translate(pivotX, pivotY);

  // Ballast wedge
  ctx.beginPath();
  ctx.moveTo(p1x, p1y);
  ctx.lineTo(p2x, p2y);
  ctx.lineTo(p2x, 0);
  ctx.lineTo(p1x, 0);
  ctx.closePath();
  ctx.fillStyle = "#fdba74";
  ctx.fill();

  ctx.rotate(-angleRad);

  // Sleepers
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(-40, 0, trackWidth + 80, 12);

  // Rails
  const drawRail = (x: number): void => {
    ctx.fillStyle = "#cbd5e1";
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1;
    ctx.fillRect(x - 15, -5, 30, 5);
    ctx.fillRect(x - 6, -railHeight, 12, railHeight);
    ctx.fillRect(x - railHeadWidth / 2, -railHeight, railHeadWidth, 10);
    ctx.strokeRect(x - railHeadWidth / 2, -railHeight, railHeadWidth, 10);
  };
  drawRail(0);
  drawRail(trackWidth);

  const axleCenterY = -railHeight - wheelTreadRadius;

  // Axle
  ctx.fillStyle = "#334155";
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1;
  ctx.fillRect(0, axleCenterY - axleDiameter / 2, trackWidth, axleDiameter);
  ctx.strokeRect(0, axleCenterY - axleDiameter / 2, trackWidth, axleDiameter);

  // Wheels
  const drawWheel = (wheelCenterX: number, isLeft: boolean): void => {
    const treadTop = axleCenterY - wheelTreadRadius;
    const treadBottom = axleCenterY + wheelTreadRadius;
    const flangeTop = axleCenterY - wheelFlangeRadius;
    const flangeBottom = axleCenterY + wheelFlangeRadius;
    ctx.fillStyle = "#475569";
    ctx.fillRect(
      wheelCenterX - wheelTreadWidth / 2,
      treadTop,
      wheelTreadWidth,
      treadBottom - treadTop,
    );
    ctx.strokeRect(
      wheelCenterX - wheelTreadWidth / 2,
      treadTop,
      wheelTreadWidth,
      treadBottom - treadTop,
    );
    const flangeX = isLeft ? wheelCenterX + 10 : wheelCenterX - 10 - wheelFlangeWidth;
    ctx.fillRect(flangeX, flangeTop, wheelFlangeWidth, flangeBottom - flangeTop);
    ctx.strokeRect(flangeX, flangeTop, wheelFlangeWidth, flangeBottom - flangeTop);
  };
  drawWheel(0, true);
  drawWheel(trackWidth, false);

  // Train body
  const bodyBottom = axleCenterY - 45;
  const bodyTop = bodyBottom - trainBodyHeight;
  ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.beginPath();
  const bLeft = trackWidth / 2 - trainBodyWidth / 2;
  const bRight = trackWidth / 2 + trainBodyWidth / 2;
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

  const comX = trackWidth / 2;
  const comY = bodyBottom - trainBodyHeight / 2 + 20;

  // Center of mass
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(comX, comY, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Forces
  if (state.forceMode !== "none") {
    // eslint-disable-next-line max-params
    const drawArrow = (
      fromX: number,
      fromY: number,
      vecX: number,
      vecY: number,
      color: string,
      label: string,
      isDashed = false,
    ): void => {
      const headLength = 15;
      const toX = fromX + vecX;
      const toY = fromY + vecY;
      const angle = Math.atan2(vecY, vecX);
      const len = Math.hypot(vecX, vecY);
      if (len < 5 && !isDashed) return;

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 4;
      if (isDashed) ctx.setLineDash([6, 6]);
      else ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
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
      const textX = toX + (vecX > 0 ? 10 : -10 - textMetrics.width);
      const textY = toY + (vecY > 0 ? 25 : -10);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillRect(textX - 2, textY - 18, textMetrics.width + 4, 22);
      ctx.fillStyle = color;
      ctx.fillText(label, textX, textY);
    };

    const isConcurrent = state.forceMode === "concurrent";

    const fnMag = physics.normalForce * forceScale;
    const fnOriginX = isConcurrent ? comX : trackWidth / 2;
    const fnOriginY = isConcurrent ? comY : axleCenterY;
    drawArrow(fnOriginX, fnOriginY, 0, -fnMag, "#9333ea", "Fn");

    const gMag = physics.gravity * forceScale;
    const gravityX = gMag * -Math.sin(angleRad);
    const gravityY = gMag * Math.cos(angleRad);
    drawArrow(comX, comY, gravityX, gravityY, "#000000", "G");

    const fNewtons = physics.flangeForce;
    if (Math.abs(fNewtons) > 100) {
      const fMag = Math.abs(fNewtons) * forceScale;
      const color = fNewtons > 0 ? "#ef4444" : "#f97316";
      const fVecX = fNewtons > 0 ? -fMag : fMag;
      let fOriginX = comX;
      let fOriginY = comY;
      if (!isConcurrent) {
        fOriginY = axleCenterY;
        fOriginX = fNewtons > 0 ? trackWidth : 0;
      }
      drawArrow(fOriginX, fOriginY, fVecX, 0, color, "F");
    }

    const netMag = physics.netForce * forceScale;
    const netVecX = netMag * -Math.cos(angleRad);
    const netVecY = netMag * -Math.sin(angleRad);
    drawArrow(comX, comY, netVecX, netVecY, "#22c55e", "F向", true);
  }

  // Plane indicator
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
    ctx.save();
    ctx.translate(comX + localTextX, comY + localTextY);
    ctx.rotate(angleRad);
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 16px sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText("圆周平面", 0, -25);
    ctx.restore();
    ctx.restore();
  }

  ctx.restore();
};

const handleResize = (): void => {
  draw();
};

useEventListener(globalThis, "resize", handleResize);

// Re-draw on mount and whenever props change
watchImmediate(
  () => [state, physics],
  () => {
    requestAnimationFrame(() => draw());
  },
  { deep: true },
);
</script>

<template>
  <div
    class="w-full h-full bg-slate-50 rounded-xl overflow-hidden shadow-inner border border-slate-200"
  >
    <canvas ref="canvasRef" class="w-full h-full block" />
  </div>
</template>
