<script setup lang="ts">
import type { PhysicsResult } from "../types";

interface Props {
  status: PhysicsResult["status"];
}

defineProps<Props>();

const config: Record<
  PhysicsResult["status"],
  {
    color: string;
    icon: string;
    title: string;
    desc: string;
  }
> = {
  perfect: {
    color: "bg-green-100 text-green-900 border-green-300",
    icon: "check-circle",
    title: "完美状态",
    desc: "轮缘无侧压，重力与支持力的合力提供向心力。",
  },
  fast: {
    color: "bg-red-100 text-red-900 border-red-300",
    icon: "alert-triangle",
    title: "速度过快",
    desc: "火车有离心趋势，轮缘挤压外轨 (外轨提供指向内侧的弹力)。",
  },
  slow: {
    color: "bg-orange-100 text-orange-900 border-orange-300",
    icon: "alert-octagon",
    title: "速度过慢",
    desc: "火车有近心趋势，轮缘挤压内轨 (内轨提供指向外侧的弹力)。",
  },
  stopped: {
    color: "bg-slate-200 text-slate-800 border-slate-400",
    icon: "pause-circle",
    title: "静止状态",
    desc: "火车有沿斜面下滑趋势，依靠内轨轮缘阻挡。",
  },
};
</script>

<template>
  <div
    :class="[
      'p-4 rounded-xl border-l-4 shadow-md flex items-start gap-4 transition-all duration-300',
      config[status].color,
    ]"
  >
    <div class="flex-shrink-0 mt-0.5">
      <!-- CheckCircle -->
      <svg
        v-if="status === 'perfect'"
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="m9 11 3 3L22 4" />
      </svg>
      <!-- AlertTriangle -->
      <svg
        v-else-if="status === 'fast'"
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <!-- AlertOctagon -->
      <svg
        v-else-if="status === 'slow'"
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <!-- PauseCircle -->
      <svg
        v-else
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="10" y1="15" x2="10" y2="9" />
        <line x1="14" y1="15" x2="14" y2="9" />
      </svg>
    </div>
    <div>
      <h3 class="text-xl font-bold mb-1">{{ config[status].title }}</h3>
      <p class="text-sm opacity-90 leading-snug">{{ config[status].desc }}</p>
    </div>
  </div>
</template>
