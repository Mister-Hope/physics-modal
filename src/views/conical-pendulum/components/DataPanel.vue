<script setup lang="ts">
import Latex from "@/components/Latex.vue";
import type { PendulumConfig } from "../types";

interface Props {
  height: number;
  angularVelocity: number;
  period: number;
  pendulums: PendulumConfig[];
}

defineProps<Props>();
</script>

<template>
  <div class="bg-slate-900 rounded-xl p-4 border border-slate-800 shadow-lg">
    <h3 class="text-xl font-bold mb-3 text-white flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-purple-400">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
      实时数据
    </h3>

    <div class="grid grid-cols-2 gap-3 mb-4">
      <div class="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
        <div class="text-sm text-slate-400 uppercase tracking-wider mb-1 font-bold">
          角速度 <Latex latex="\omega" />
        </div>
        <div class="text-2xl font-mono text-white font-bold">
          {{ angularVelocity.toFixed(2) }} <span class="text-base text-slate-500">rad/s</span>
        </div>
      </div>
      <div class="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
        <div class="text-sm text-slate-400 uppercase tracking-wider mb-1 font-bold">
          周期 <Latex latex="T" />
        </div>
        <div class="text-2xl font-mono text-white font-bold">
          {{ period.toFixed(2) }} <span class="text-base text-slate-500">s</span>
        </div>
      </div>
    </div>

    <div class="overflow-hidden rounded-lg border border-slate-800">
      <table class="w-full text-base text-left">
        <thead class="text-slate-300 uppercase bg-slate-800">
          <tr>
            <th class="px-3 py-2">对象</th>
            <th class="px-3 py-2">半径 <Latex latex="r" /></th>
            <th class="px-3 py-2">角度 <Latex latex="\theta" /></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800 bg-slate-900/50">
          <tr v-for="p in pendulums" :key="p.id" class="hover:bg-slate-800/30 transition-colors">
            <td class="px-3 py-2 font-bold flex items-center gap-2">
              <div class="w-3.5 h-3.5 rounded-full" :style="{ backgroundColor: p.color }" />
              <span class="text-slate-200">{{ p.label }}</span>
            </td>
            <td class="px-3 py-2 font-mono text-slate-300">
              {{ Math.sqrt(Math.max(0, p.length * p.length - height * height)).toFixed(2) }} m
            </td>
            <td class="px-3 py-2 font-mono text-slate-300">
              {{ (Math.acos(Math.min(1, height / p.length)) * 180 / Math.PI).toFixed(1) }}°
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
