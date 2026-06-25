<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { RouterLink } from "vue-router";

const demos = [
  {
    path: "/pendulum",
    title: "单摆",
    description: "经典单摆模型，展示简谐运动、能量转换与周期公式。",
    icon: "mdi:circle-slice-8",
    iconColor: "text-blue-400",
  },
  {
    path: "/conical-pendulum",
    title: "圆锥摆",
    description: "演示圆锥摆的圆周运动，分析向心力、张力与角速度的关系。",
    icon: "mdi:orbit",
    iconColor: "text-purple-400",
  },
  {
    path: "/train-turn",
    title: "火车转弯",
    description: "模拟火车转弯时的倾斜轨道，理解向心力与外轨超高的设计原理。",
    icon: "mdi:train",
    iconColor: "text-amber-400",
  },
  {
    path: "/oscilloscope",
    title: "示波管",
    description: "示波管工作原理的3D教学演示，支持11种预设情景与自定义波形。",
    icon: "mdi:waveform",
    iconColor: "text-green-400",
  },
  {
    path: "/electric-field",
    title: "电场与等势面",
    description: "异号电荷的电场线、等势面3D交互模型，支持拖拽电荷与试探电荷。",
    icon: "mdi:lightning-bolt",
    iconColor: "text-yellow-400",
  },
];
</script>

<template>
  <div
    class="min-h-screen flex flex-col items-center px-6 py-12"
    style="background: linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)"
  >
    <header class="text-center mb-12">
      <h1
        class="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4"
      >
        物理模型演示
      </h1>
      <p class="text-slate-400 text-xl">交互式物理模拟集合</p>
    </header>

    <main class="w-full max-w-3xl">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <RouterLink
          v-for="demo in demos"
          :key="demo.path"
          :to="demo.path"
          class="block p-6 rounded-xl border transition-all duration-200 hover:border-blue-400 hover:bg-slate-800/95 hover:-translate-y-0.5"
          style="background: rgba(30, 41, 59, 0.7); border-color: rgba(71, 85, 105, 0.5)"
        >
          <Icon :icon="demo.icon" :class="['w-10 h-10 mb-3', demo.iconColor]" />
          <h2 class="text-lg font-semibold text-slate-100 mb-2">{{ demo.title }}</h2>
          <p class="text-sm text-slate-400 leading-relaxed">{{ demo.description }}</p>
        </RouterLink>
      </div>
    </main>

    <footer class="mt-auto pt-16 flex flex-col items-center gap-3 text-sm text-slate-500">
      <a
        href="https://github.com/mister-hope/physics-modal"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"
          />
          <path d="M9 18c-4.51 2-5-2-7-2" />
        </svg>
        mister-hope/physics-modal
      </a>
      <span>版权所有 东北育才 张伯望</span>
    </footer>
  </div>
</template>
