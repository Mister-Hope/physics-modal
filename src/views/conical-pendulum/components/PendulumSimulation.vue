<script setup lang="ts">
import { useEventListener, useRafFn } from "@vueuse/core";
import { ref } from "vue";

import { GRAVITY } from "../constants";
import type { PendulumConfig } from "../types";

interface Props {
  height: number;
  pendulums: PendulumConfig[];
  isPlaying: boolean;
  angularVelocity: number;
}

const { height, pendulums, isPlaying, angularVelocity } = defineProps<Props>();

const canvasRef = ref<HTMLCanvasElement>();
const isDragging = ref(false);
const lastMousePos = ref({ x: 0, y: 0 });

let timeAccum = 0;
let lastFrameTime = 0;

const camera = {
  yaw: 0,
  pitch: 0.2,
  zoom: 1,
};

// eslint-disable-next-line max-params
const project = (
  x: number,
  y: number,
  z: number,
  centerX: number,
  centerY: number,
  metersToPixels: number,
): { x: number; y: number; scale: number; zDepth: number } => {
  const cosYaw = Math.cos(camera.yaw);
  const sinYaw = Math.sin(camera.yaw);
  const x1 = x * cosYaw - z * sinYaw;
  const z1 = x * sinYaw + z * cosYaw;

  const cosPitch = Math.cos(camera.pitch);
  const sinPitch = Math.sin(camera.pitch);
  const y2 = y * cosPitch - z1 * sinPitch;
  const z2 = y * sinPitch + z1 * cosPitch;

  const cameraDist = 2000;
  const scale = cameraDist / (cameraDist + z2 * metersToPixels);

  return {
    x: centerX + x1 * metersToPixels * scale,
    y: centerY + y2 * metersToPixels * scale,
    scale,
    zDepth: z2,
  };
};

useRafFn(({ timestamp }) => {
  const canvas = canvasRef.value;
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;

  // Ensure canvas matches parent on first frame
  const parent = canvas.parentElement;
  if (parent && (canvas.width !== parent.clientWidth || canvas.height !== parent.clientHeight)) {
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
  }

  if (!lastFrameTime) lastFrameTime = timestamp;
  const deltaTime = (timestamp - lastFrameTime) / 1000;
  lastFrameTime = timestamp;

  if (isPlaying) timeAccum += deltaTime;

  const currentAngle = timeAccum * angularVelocity;
  const { width } = canvas;
  const heightPx = canvas.height;
  const centerX = width / 2;
  const centerY = heightPx / 6;
  const metersToPixels = 220;

  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, width, heightPx);

  const origin = project(0, 0, 0, centerX, centerY, metersToPixels);
  const floorY = height;
  const floorCenter = project(0, floorY, 0, centerX, centerY, metersToPixels);

  // Central axis (dashed)
  ctx.beginPath();
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 2;
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(floorCenter.x, floorCenter.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Support point
  ctx.beginPath();
  ctx.fillStyle = "#94a3b8";
  ctx.arc(origin.x, origin.y, 8 * origin.scale, 0, Math.PI * 2);
  ctx.fill();

  const objectsToRender = pendulums.map((pendulum) => {
    const r = Math.sqrt(Math.max(0, pendulum.length * pendulum.length - height * height));
    const xPhys = r * Math.cos(currentAngle);
    const zPhys = r * Math.sin(currentAngle);
    const yPhys = height;

    const pos2D = project(xPhys, yPhys, zPhys, centerX, centerY, metersToPixels);

    const pathPoints: { x: number; y: number }[] = [];
    // Precompute orbit path for this radius
    const precomputed: { x: number; y: number }[] = [];
    for (let a = 0; a <= Math.PI * 2; a += 0.1) {
      precomputed.push({ x: a, y: a });
      pathPoints.push(
        project(r * Math.cos(a), height, r * Math.sin(a), centerX, centerY, metersToPixels),
      );
    }

    return {
      config: pendulum,
      pos: pos2D,
      path: pathPoints,
      precomputed,
      phys: { r, x: xPhys, y: yPhys, z: zPhys },
    };
  });

  objectsToRender.sort((a, b) => b.pos.zDepth - a.pos.zDepth);

  objectsToRender.forEach((obj) => {
    // Orbit path
    ctx.beginPath();
    ctx.strokeStyle = `${obj.config.color}44`;
    ctx.lineWidth = 3 * obj.pos.scale;
    obj.path.forEach((point, i) => {
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.stroke();

    // String
    ctx.beginPath();
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2 * obj.pos.scale;
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(obj.pos.x, obj.pos.y);
    ctx.stroke();

    // Bob
    const bobSize = (12 + obj.config.mass * 4) * obj.pos.scale;
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
    ctx.beginPath();
    ctx.fillStyle = grad;
    ctx.arc(obj.pos.x, obj.pos.y, bobSize, 0, Math.PI * 2);
    ctx.fill();

    // Force analysis for first pendulum
    if (obj.config.id === 1) {
      const { mass } = obj.config;
      const forceScale = 0.05;
      const vectorGMag = mass * GRAVITY * forceScale;
      const vectorYMag = mass * GRAVITY * forceScale;
      const distToCenter = Math.hypot(obj.phys.x, obj.phys.z);
      const FnMag = mass * angularVelocity ** 2 * obj.phys.r * forceScale;

      // Draw forces using 3D line projection
      // eslint-disable-next-line max-params
      const drawArrow3D = (
        startX: number,
        startY: number,
        startZ: number,
        deltaX: number,
        deltaY: number,
        deltaZ: number,
        color: string,
        label: string,
        dashed = false,
      ): void => {
        const pStart = project(startX, startY, startZ, centerX, centerY, metersToPixels);
        const pEnd = project(
          startX + deltaX,
          startY + deltaY,
          startZ + deltaZ,
          centerX,
          centerY,
          metersToPixels,
        );

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 5 * pStart.scale;
        if (dashed) ctx.setLineDash([5, 5]);
        else ctx.setLineDash([]);
        ctx.moveTo(pStart.x, pStart.y);
        ctx.lineTo(pEnd.x, pEnd.y);
        ctx.stroke();
        ctx.setLineDash([]);

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

        if (label) {
          ctx.font = `bold ${24 * pEnd.scale}px sans-serif`;
          ctx.fillStyle = color;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const labelX = pEnd.x + (headLen + 15) * Math.cos(angle);
          const labelY = pEnd.y + (headLen + 15) * Math.sin(angle);
          ctx.fillText(label, labelX, labelY);
        }
      };

      // eslint-disable-next-line max-params
      const drawDashed3D = (
        x1: number,
        y1: number,
        z1: number,
        x2: number,
        y2: number,
        z2: number,
        color: string,
      ): void => {
        const projStart = project(x1, y1, z1, centerX, centerY, metersToPixels);
        const projEnd = project(x2, y2, z2, centerX, centerY, metersToPixels);
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5 * projStart.scale;
        ctx.setLineDash([4, 4]);
        ctx.moveTo(projStart.x, projStart.y);
        ctx.lineTo(projEnd.x, projEnd.y);
        ctx.stroke();
        ctx.setLineDash([]);
      };

      drawArrow3D(obj.phys.x, obj.phys.y, obj.phys.z, 0, vectorGMag, 0, "#3b82f6", "mg");
      drawArrow3D(obj.phys.x, obj.phys.y, obj.phys.z, 0, -vectorYMag, 0, "#a78bfa", "", true);

      if (distToCenter > 0.001) {
        const dirX = -obj.phys.x / distToCenter;
        const dirZ = -obj.phys.z / distToCenter;
        drawArrow3D(
          obj.phys.x,
          obj.phys.y,
          obj.phys.z,
          dirX * FnMag,
          0,
          dirZ * FnMag,
          "#eab308",
          "Fn",
          true,
        );
        drawArrow3D(
          obj.phys.x,
          obj.phys.y,
          obj.phys.z,
          dirX * FnMag,
          -vectorYMag,
          dirZ * FnMag,
          "#ef4444",
          "FT",
        );

        const tipT = {
          x: obj.phys.x + dirX * FnMag,
          y: obj.phys.y - vectorYMag,
          z: obj.phys.z + dirZ * FnMag,
        };
        const tipTy = { x: obj.phys.x, y: obj.phys.y - vectorYMag, z: obj.phys.z };
        const tipFn = { x: obj.phys.x + dirX * FnMag, y: obj.phys.y, z: obj.phys.z + dirZ * FnMag };
        drawDashed3D(tipTy.x, tipTy.y, tipTy.z, tipT.x, tipT.y, tipT.z, "#94a3b8");
        drawDashed3D(tipFn.x, tipFn.y, tipFn.z, tipT.x, tipT.y, tipT.z, "#94a3b8");
      }
    }

    // Label
    ctx.font = `bold ${Math.max(20, 16 * obj.pos.scale)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const labelText = `m=${obj.config.mass}kg`;
    const metrics = ctx.measureText(labelText);
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(obj.pos.x - metrics.width / 2 - 4, obj.pos.y + bobSize + 5, metrics.width + 8, 20);
    ctx.fillStyle = "#fff";
    ctx.fillText(labelText, obj.pos.x, obj.pos.y + bobSize + 15);
  });
});

const handleResize = (): void => {
  if (canvasRef.value?.parentElement) {
    canvasRef.value.width = canvasRef.value.parentElement.clientWidth;
    canvasRef.value.height = canvasRef.value.parentElement.clientHeight;
  }
};

useEventListener(globalThis, "resize", handleResize);

const onMouseDown = (event: MouseEvent): void => {
  isDragging.value = true;
  lastMousePos.value = { x: event.clientX, y: event.clientY };
};

const onMouseMove = (event: MouseEvent): void => {
  if (!isDragging.value) return;
  const deltaX = event.clientX - lastMousePos.value.x;
  const deltaY = event.clientY - lastMousePos.value.y;
  camera.yaw += deltaX * 0.01;
  camera.pitch = Math.max(-0.5, Math.min(1.5, camera.pitch + deltaY * 0.01));
  lastMousePos.value = { x: event.clientX, y: event.clientY };
};

const onMouseUp = (): void => {
  isDragging.value = false;
};
</script>

<template>
  <div
    class="w-full h-full cursor-move relative bg-slate-950"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @mouseleave="onMouseUp"
  >
    <canvas ref="canvasRef" class="w-full h-full block touch-none" />
  </div>
</template>
