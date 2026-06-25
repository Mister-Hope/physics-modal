<script setup lang="ts">
import AppSegmentedControl from "@/components/AppSegmentedControl.vue";
import AppSlider from "@/components/AppSlider.vue";
import AppToggle from "@/components/AppToggle.vue";
import Latex from "@/components/Latex.vue";

import type { ForceMode, PhysicsResult, SimulationState } from "../types";

interface Props {
  state: SimulationState;
  physics: PhysicsResult;
}

defineProps<Props>();

const emit = defineEmits<{
  "update:state": [value: Partial<SimulationState>];
}>();

const MS_TO_KMH = 3.6;
const MAX_KMH = 300;

const forceModeOptions: { value: ForceMode; label: string }[] = [
  { value: "none", label: "不显示" },
  { value: "real", label: "真实位置" },
  { value: "concurrent", label: "共点(重心)" },
];

const legendItems = [
  { color: "bg-black/80", latex: "G", label: "重力" },
  { color: "bg-purple-600", latex: "F_N", label: "支持力" },
  { color: "bg-red-500", latex: "F", label: "轮缘弹力" },
];
</script>

<template>
  <div
    class="bg-white p-4 rounded-xl shadow-lg border border-slate-200 h-full flex flex-col gap-4 overflow-y-auto"
  >
    <div class="flex items-center gap-2 border-b pb-3 mb-1">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="text-slate-700"
      >
        <circle cx="12" cy="12" r="3" />
        <path
          d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        />
      </svg>
      <h2 class="text-xl font-bold text-slate-800">控制面板</h2>
    </div>

    <!-- Angle -->
    <AppSlider
      :model-value="state.angle"
      :min="0"
      :max="30"
      :step="1"
      label="轨道倾角"
      unit="°"
      :digits="0"
      @update:model-value="emit('update:state', { angle: $event })"
    >
      <template #label> 轨道倾角 <Latex latex="\theta" /> </template>
    </AppSlider>

    <!-- Radius -->
    <AppSlider
      :model-value="state.radius"
      :min="100"
      :max="4000"
      :step="50"
      label="转弯半径"
      unit=" m"
      :digits="0"
      @update:model-value="emit('update:state', { radius: $event })"
    >
      <template #label> 转弯半径 <Latex latex="r" /> </template>
    </AppSlider>

    <!-- Velocity -->
    <div class="space-y-2">
      <div class="flex justify-between items-end">
        <label class="text-base font-semibold text-slate-600 flex items-center gap-2">
          火车速度 <Latex latex="v" />
        </label>
        <div class="text-right flex flex-col items-end">
          <span class="text-blue-600 font-mono font-bold text-lg">
            {{ Math.round(state.velocity * MS_TO_KMH) }} km/h
          </span>
          <span
            class="text-xs text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded cursor-pointer hover:bg-green-100 transition-colors"
            title="点击应用规定速度"
            @click="emit('update:state', { velocity: physics.idealVelocity })"
          >
            规定: {{ (physics.idealVelocity * MS_TO_KMH).toFixed(1) }} km/h
          </span>
        </div>
      </div>
      <div class="relative pt-6 pb-2">
        <div
          class="absolute top-1 transform -translate-x-1/2 flex flex-col items-center pointer-events-none z-0"
          :style="{
            left: `${Math.min(((physics.idealVelocity * MS_TO_KMH) / MAX_KMH) * 100, 100)}%`,
          }"
        >
          <div
            class="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-green-600"
          />
        </div>
        <input
          type="range"
          :min="0"
          :max="MAX_KMH"
          :step="1"
          :value="Math.round(state.velocity * MS_TO_KMH)"
          class="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer relative z-10"
          @input="
            emit('update:state', {
              velocity: Number(($event.target as HTMLInputElement).value) / MS_TO_KMH,
            })
          "
        />
        <div class="absolute top-[30px] left-0 w-full h-3 bg-slate-200 rounded-lg -z-10" />
      </div>
      <div class="flex justify-between text-xs text-slate-500 px-1">
        <span>0 km/h</span>
        <span>300 km/h</span>
      </div>
    </div>

    <!-- Settings -->
    <div class="bg-slate-50 p-4 rounded-lg space-y-4 border border-slate-100">
      <div class="space-y-2">
        <label class="text-base font-medium text-slate-700 block">受力分析模式</label>
        <AppSegmentedControl
          :model-value="state.forceMode"
          :options="forceModeOptions"
          @update:model-value="emit('update:state', { forceMode: $event })"
        />
      </div>
      <AppToggle
        :model-value="state.showPlane"
        label="显示圆周运动平面"
        @update:model-value="emit('update:state', { showPlane: $event })"
      />
    </div>

    <!-- Legend -->
    <div v-if="state.forceMode !== 'none'" class="mt-auto pt-4 border-t text-sm">
      <h3 class="font-semibold text-slate-600 mb-3">图例</h3>
      <div class="flex flex-wrap gap-x-4 gap-y-2">
        <div
          v-for="item in legendItems"
          :key="item.latex"
          class="flex items-center gap-2 flex-shrink-0"
        >
          <div :class="['w-6 h-1 flex-shrink-0', item.color]" />
          <div class="flex items-center whitespace-nowrap">
            <span class="mr-1">{{ item.label }}</span>
            <Latex :latex="item.latex" />
          </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <div
            class="w-6 h-1 bg-green-500 border-b-2 border-green-500 flex-shrink-0"
            style="border-style: dashed"
          />
          <div class="flex items-center whitespace-nowrap">
            <span class="mr-1">向心力</span>
            <Latex latex="F_{向}" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
