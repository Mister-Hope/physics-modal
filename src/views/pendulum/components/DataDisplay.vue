<script setup lang="ts">
import DataRow from "@/components/DataRow.vue";
import Latex from "@/components/Latex.vue";
import { COLORS, GRAVITY } from "../constants";
import type { PhysicsParams, SimulationState } from "../types";

interface Props {
  state: SimulationState;
  params: PhysicsParams;
}

defineProps<Props>();

// Calculate exact period using Arithmetic-Geometric Mean (AGM)
function calculateExactPeriod(length: number, gravity: number, maxAngleDeg: number): number {
  if (maxAngleDeg === 0) return 2 * Math.PI * Math.sqrt(length / gravity);

  let a = 1;
  let b = Math.cos((maxAngleDeg * Math.PI) / 180 / 2);

  for (let i = 0; i < 10; i++) {
    const nextA = 0.5 * (a + b);
    const nextB = Math.sqrt(a * b);
    if (Math.abs(a - b) < 1e-9) break;
    a = nextA;
    b = nextB;
  }

  return (2 * Math.PI * Math.sqrt(length / gravity)) / a;
}
</script>

<template>
  <div class="h-full flex flex-col p-5 bg-slate-800 border-l border-slate-700 shadow-xl w-[380px] overflow-y-auto">
    <div class="pb-2 mb-2">
      <h2 class="text-2xl font-bold text-white">实时数据</h2>
    </div>

    <div class="flex-1">
      <DataRow
        title="摆角"
        symbol="\theta"
        :value="Math.abs(state.theta * 180 / Math.PI)"
        unit="°"
        color-class="text-slate-200"
        :digits="1"
      />
      <DataRow
        title="理论周期"
        symbol="T"
        :value="calculateExactPeriod(params.length, GRAVITY, params.initialAngle)"
        unit="s"
        color-class="text-white"
        hex-color="#ffffff"
      />
      <div class="h-6" />
      <h3 class="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-2">动力学</h3>
      <DataRow
        title="重力"
        symbol="G"
        :value="params.mass * GRAVITY"
        unit="N"
        color-class="text-blue-400"
        :hex-color="COLORS.forceGravity"
      />
      <DataRow
        title="绳拉力"
        symbol="F_{\text{T}}"
        :value="params.mass * (GRAVITY * Math.cos(state.theta) + params.length * state.omega * state.omega)"
        unit="N"
        color-class="text-pink-400"
        :hex-color="COLORS.forceTension"
      />
      <div class="h-6" />
      <h3 class="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-2">运动学</h3>
      <DataRow
        title="线速度"
        symbol="v"
        :value="Math.abs(state.omega * params.length)"
        unit="m/s"
        color-class="text-green-400"
        :hex-color="COLORS.velocity"
      />
      <DataRow
        title="合加速度"
        symbol="a"
        :value="Math.hypot(Math.abs(GRAVITY * Math.sin(state.theta)), params.length * state.omega * state.omega)"
        unit="m/s²"
        color-class="text-amber-400"
        :hex-color="COLORS.accelTotal"
      />
      <DataRow
        title="切向加速度"
        symbol="a_t"
        :value="Math.abs(GRAVITY * Math.sin(state.theta))"
        unit="m/s²"
        color-class="text-purple-400"
        :hex-color="COLORS.accelTangential"
      />
      <DataRow
        title="径向加速度"
        symbol="a_n"
        :value="params.length * state.omega * state.omega"
        unit="m/s²"
        color-class="text-red-400"
        :hex-color="COLORS.accelRadial"
      />
    </div>

    <div class="mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
      <h4 class="text-slate-400 text-sm mb-2 font-semibold">图例说明</h4>
      <div class="grid grid-cols-2 gap-y-3 gap-x-2">
        <div class="flex items-center gap-2 text-green-400">
          <div class="w-3 h-3 bg-green-400 rounded-full" />
          <span><Latex latex="v" /> 速度</span>
        </div>
        <div class="flex items-center gap-2 text-amber-400">
          <div class="w-3 h-3 bg-amber-400 rounded-full" />
          <span><Latex latex="a" /> 合加速度</span>
        </div>
        <div class="flex items-center gap-2 text-purple-400">
          <div class="w-3 h-3 bg-purple-400 rounded-full" />
          <span><Latex latex="a_t" /> 切向</span>
        </div>
        <div class="flex items-center gap-2 text-red-400">
          <div class="w-3 h-3 bg-red-400 rounded-full" />
          <span><Latex latex="a_n" /> 径向</span>
        </div>
        <div class="flex items-center gap-2 text-pink-400">
          <div class="w-3 h-3 bg-pink-400 rounded-full" />
          <span><Latex latex="F_T" /> 拉力</span>
        </div>
        <div class="flex items-center gap-2 text-blue-400">
          <div class="w-3 h-3 bg-blue-400 rounded-full" />
          <span><Latex latex="G" /> 重力</span>
        </div>
      </div>
    </div>
  </div>
</template>
