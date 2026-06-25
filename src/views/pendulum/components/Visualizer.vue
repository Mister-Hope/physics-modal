<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

import {
  COLORS,
  GRAVITY,
  PIXELS_PER_METER,
  SCALE_ACCEL,
  SCALE_FORCE,
  SCALE_VELOCITY,
} from "../constants";
import type { PhysicsParams, SimulationState, VectorConfig } from "../types";

interface Props {
  state: SimulationState;
  params: PhysicsParams;
  vectors: VectorConfig;
}

const { state, params, vectors } = defineProps<Props>();

const containerRef = ref<HTMLDivElement>();
const width = ref(800);
const height = ref(600);

let resizeHandler: (() => void) | null = null;

onMounted(() => {
  resizeHandler = (): void => {
    if (containerRef.value) {
      width.value = containerRef.value.clientWidth;
      height.value = containerRef.value.clientHeight;
    }
  };
  window.addEventListener("resize", resizeHandler);
  resizeHandler();
});

onBeforeUnmount(() => {
  if (resizeHandler) window.removeEventListener("resize", resizeHandler);
});

const pivotX = computed(() => width.value / 2);
const pivotY = 50;

const bobX = computed(
  () => pivotX.value + Math.sin(state.theta) * params.length * PIXELS_PER_METER,
);
const bobY = computed(() => pivotY + Math.cos(state.theta) * params.length * PIXELS_PER_METER);

const tanX = computed(() => Math.cos(state.theta));
const tanY = computed(() => -Math.sin(state.theta));
const radX = computed(() => -Math.sin(state.theta));
const radY = computed(() => -Math.cos(state.theta));

const vMag = computed(() => state.omega * params.length);
const atMag = computed(() => -GRAVITY * Math.sin(state.theta));
const anMag = computed(() => params.length * state.omega * state.omega);
const tensionMag = computed(() => params.mass * (GRAVITY * Math.cos(state.theta) + anMag.value));
const gravityMag = computed(() => params.mass * GRAVITY);

// Velocity vector
const vVec = computed(() => ({
  x: tanX.value * vMag.value * PIXELS_PER_METER * SCALE_VELOCITY,
  y: tanY.value * vMag.value * PIXELS_PER_METER * SCALE_VELOCITY,
}));

// Acceleration vectors
const atVec = computed(() => ({
  x: (tanX.value * atMag.value * PIXELS_PER_METER * SCALE_ACCEL) / 9.8,
  y: (tanY.value * atMag.value * PIXELS_PER_METER * SCALE_ACCEL) / 9.8,
}));
const anVec = computed(() => ({
  x: (radX.value * anMag.value * PIXELS_PER_METER * SCALE_ACCEL) / 9.8,
  y: (radY.value * anMag.value * PIXELS_PER_METER * SCALE_ACCEL) / 9.8,
}));
const aTotal = computed(() => ({
  x: atVec.value.x + anVec.value.x,
  y: atVec.value.y + anVec.value.y,
}));

// Force vectors
const tensionVec = computed(() => ({
  x: radX.value * tensionMag.value * PIXELS_PER_METER * SCALE_FORCE,
  y: radY.value * tensionMag.value * PIXELS_PER_METER * SCALE_FORCE,
}));
const gravityVec = computed(() => ({
  x: 0,
  y: gravityMag.value * PIXELS_PER_METER * SCALE_FORCE,
}));

// Gravity components
const GnMag = computed(() => gravityMag.value * Math.cos(state.theta));
const GnVec = computed(() => ({
  x: -radX.value * GnMag.value * PIXELS_PER_METER * SCALE_FORCE,
  y: -radY.value * GnMag.value * PIXELS_PER_METER * SCALE_FORCE,
}));
const GtVec = computed(() => ({
  x: gravityVec.value.x - GnVec.value.x,
  y: gravityVec.value.y - GnVec.value.y,
}));

const markerColors = computed(() =>
  [
    COLORS.velocity,
    COLORS.accelTotal,
    COLORS.accelRadial,
    COLORS.accelTangential,
    COLORS.forceTension,
    COLORS.forceGravity,
    COLORS.forceGravityComponent,
  ].map((color) => color.replace("#", "")),
);

const arrowEnd = (
  baseX: number,
  baseY: number,
  deltaX: number,
  deltaY: number,
): { x: number; y: number } => ({ x: baseX + deltaX, y: baseY + deltaY });
</script>

<template>
  <div ref="containerRef" class="flex-1 bg-slate-900 relative overflow-hidden select-none">
    <div class="absolute top-4 left-4 text-slate-500 text-sm pointer-events-none">
      Scale: {{ PIXELS_PER_METER }}px/m
    </div>

    <svg width="100%" height="100%" class="absolute top-0 left-0">
      <defs>
        <marker
          v-for="mc in markerColors"
          :key="mc"
          :id="`arrowhead-${mc}`"
          markerWidth="3.3"
          markerHeight="2.3"
          refX="0"
          refY="1.15"
          orient="auto"
        >
          <polygon points="0 0, 3.3 1.15, 0 2.3" :fill="`#${mc}`" />
        </marker>
      </defs>

      <!-- Pivot Point -->
      <circle :cx="pivotX" :cy="pivotY" r="6" fill="#94a3b8" />
      <rect :x="pivotX - 50" :y="pivotY - 4" width="100" height="4" fill="#64748b" rx="2" />

      <!-- String -->
      <line
        :x1="pivotX"
        :y1="pivotY"
        :x2="bobX"
        :y2="bobY"
        :stroke="COLORS.string"
        stroke-width="3"
      />

      <!-- Vertical Reference -->
      <line
        :x1="pivotX"
        :y1="pivotY"
        :x2="pivotX"
        :y2="pivotY + params.length * PIXELS_PER_METER + 50"
        stroke="#475569"
        stroke-width="2"
        stroke-dasharray="8,8"
      />

      <!-- Bob -->
      <circle
        :cx="bobX"
        :cy="bobY"
        :r="6 * params.mass ** (1 / 3)"
        :fill="COLORS.bob"
        stroke="#0ea5e9"
        stroke-width="2"
      />

      <!-- Acceleration Vectors -->
      <template v-if="vectors.showAcceleration">
        <line
          :x1="bobX + anVec.x"
          :y1="bobY + anVec.y"
          :x2="bobX + aTotal.x"
          :y2="bobY + aTotal.y"
          :stroke="COLORS.projectionLine"
          stroke-width="2"
          stroke-dasharray="4,4"
        />
        <line
          :x1="bobX + atVec.x"
          :y1="bobY + atVec.y"
          :x2="bobX + aTotal.x"
          :y2="bobY + aTotal.y"
          :stroke="COLORS.projectionLine"
          stroke-width="2"
          stroke-dasharray="4,4"
        />
        <line
          :x1="bobX"
          :y1="bobY"
          :x2="bobX + anVec.x"
          :y2="bobY + anVec.y"
          :stroke="COLORS.accelRadial"
          stroke-width="4"
          stroke-dasharray="5,5"
          :marker-end="`url(#arrowhead-${COLORS.accelRadial.replace('#', '')})`"
        />
        <text
          :x="bobX + anVec.x + (anVec.x > 0 ? 10 : -30)"
          :y="bobY + anVec.y + (anVec.y > 0 ? 20 : -10)"
          :fill="COLORS.accelRadial"
          font-size="30"
          font-weight="bold"
          style="text-shadow: 0px 0px 4px #000"
        >
          an
        </text>
        <line
          :x1="bobX"
          :y1="bobY"
          :x2="bobX + atVec.x"
          :y2="bobY + atVec.y"
          :stroke="COLORS.accelTangential"
          stroke-width="4"
          stroke-dasharray="5,5"
          :marker-end="`url(#arrowhead-${COLORS.accelTangential.replace('#', '')})`"
        />
        <text
          :x="bobX + atVec.x + (atVec.x > 0 ? 10 : -30)"
          :y="bobY + atVec.y + (atVec.y > 0 ? 20 : -10)"
          :fill="COLORS.accelTangential"
          font-size="30"
          font-weight="bold"
          style="text-shadow: 0px 0px 4px #000"
        >
          at
        </text>
        <line
          :x1="bobX"
          :y1="bobY"
          :x2="bobX + aTotal.x"
          :y2="bobY + aTotal.y"
          :stroke="COLORS.accelTotal"
          stroke-width="4"
          :marker-end="`url(#arrowhead-${COLORS.accelTotal.replace('#', '')})`"
        />
        <text
          :x="bobX + aTotal.x + (aTotal.x > 0 ? 10 : -30)"
          :y="bobY + aTotal.y + (aTotal.y > 0 ? 20 : -10)"
          :fill="COLORS.accelTotal"
          font-size="30"
          font-weight="bold"
          style="text-shadow: 0px 0px 4px #000"
        >
          a
        </text>
      </template>

      <!-- Velocity Vector -->
      <template v-if="vectors.showVelocity">
        <line
          :x1="bobX"
          :y1="bobY"
          :x2="bobX + vVec.x"
          :y2="bobY + vVec.y"
          :stroke="COLORS.velocity"
          stroke-width="4"
          :marker-end="`url(#arrowhead-${COLORS.velocity.replace('#', '')})`"
        />
        <text
          :x="bobX + vVec.x + (vVec.x > 0 ? 10 : -30)"
          :y="bobY + vVec.y + (vVec.y > 0 ? 20 : -10)"
          :fill="COLORS.velocity"
          font-size="30"
          font-weight="bold"
          style="text-shadow: 0px 0px 4px #000"
        >
          v
        </text>
      </template>

      <!-- Force Vectors -->
      <template v-if="vectors.showForces">
        <line
          :x1="bobX + GnVec.x"
          :y1="bobY + GnVec.y"
          :x2="bobX + gravityVec.x"
          :y2="bobY + gravityVec.y"
          :stroke="COLORS.projectionLine"
          stroke-width="2"
          stroke-dasharray="4,4"
        />
        <line
          :x1="bobX + GtVec.x"
          :y1="bobY + GtVec.y"
          :x2="bobX + gravityVec.x"
          :y2="bobY + gravityVec.y"
          :stroke="COLORS.projectionLine"
          stroke-width="2"
          stroke-dasharray="4,4"
        />
        <line
          :x1="bobX"
          :y1="bobY"
          :x2="bobX + GnVec.x"
          :y2="bobY + GnVec.y"
          :stroke="COLORS.forceGravityComponent"
          stroke-width="4"
          stroke-dasharray="5,5"
          :marker-end="`url(#arrowhead-${COLORS.forceGravityComponent.replace('#', '')})`"
        />
        <text
          :x="bobX + GnVec.x + (GnVec.x > 0 ? 10 : -30)"
          :y="bobY + GnVec.y + (GnVec.y > 0 ? 20 : -10)"
          :fill="COLORS.forceGravityComponent"
          font-size="30"
          font-weight="bold"
          style="text-shadow: 0px 0px 4px #000"
        >
          Gn
        </text>
        <line
          :x1="bobX"
          :y1="bobY"
          :x2="bobX + GtVec.x"
          :y2="bobY + GtVec.y"
          :stroke="COLORS.forceGravityComponent"
          stroke-width="4"
          stroke-dasharray="5,5"
          :marker-end="`url(#arrowhead-${COLORS.forceGravityComponent.replace('#', '')})`"
        />
        <text
          :x="bobX + GtVec.x + (GtVec.x > 0 ? 10 : -30)"
          :y="bobY + GtVec.y + (GtVec.y > 0 ? 20 : -10)"
          :fill="COLORS.forceGravityComponent"
          font-size="30"
          font-weight="bold"
          style="text-shadow: 0px 0px 4px #000"
        >
          Gt
        </text>
        <line
          :x1="bobX"
          :y1="bobY"
          :x2="bobX + gravityVec.x"
          :y2="bobY + gravityVec.y"
          :stroke="COLORS.forceGravity"
          stroke-width="4"
          :marker-end="`url(#arrowhead-${COLORS.forceGravity.replace('#', '')})`"
        />
        <text
          :x="bobX + gravityVec.x + (gravityVec.x > 0 ? 10 : -30)"
          :y="bobY + gravityVec.y + (gravityVec.y > 0 ? 20 : -10)"
          :fill="COLORS.forceGravity"
          font-size="30"
          font-weight="bold"
          style="text-shadow: 0px 0px 4px #000"
        >
          G
        </text>
        <line
          :x1="bobX"
          :y1="bobY"
          :x2="bobX + tensionVec.x"
          :y2="bobY + tensionVec.y"
          :stroke="COLORS.forceTension"
          stroke-width="4"
          :marker-end="`url(#arrowhead-${COLORS.forceTension.replace('#', '')})`"
        />
        <text
          :x="bobX + tensionVec.x + (tensionVec.x > 0 ? 10 : -30)"
          :y="bobY + tensionVec.y + (tensionVec.y > 0 ? 20 : -10)"
          :fill="COLORS.forceTension"
          font-size="30"
          font-weight="bold"
          style="text-shadow: 0px 0px 4px #000"
        >
          T
        </text>
      </template>
    </svg>
  </div>
</template>
