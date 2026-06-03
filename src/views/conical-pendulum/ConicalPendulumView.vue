<script setup lang="ts">
import { computed, ref } from "vue";
import Controls from "./components/Controls.vue";
import Copyright from "@/components/Copyright.vue";
import NavBar from "@/components/NavBar.vue";
import DataPanel from "./components/DataPanel.vue";
import PendulumSimulation from "./components/PendulumSimulation.vue";
import Theory from "./components/Theory.vue";
import { GRAVITY, PENDULUM_PRESETS } from "./constants";
import type { PendulumConfig } from "./types";

const height = ref(1.2);
const isPlaying = ref(true);
const pendulums = ref<PendulumConfig[]>([{ ...PENDULUM_PRESETS[0] }]);

const angularVelocity = computed(() => Math.sqrt(GRAVITY / height.value));
const period = computed(() => (2 * Math.PI) / angularVelocity.value);

const minLength = computed(() => Math.min(...pendulums.value.map((p) => p.length)));
const maxHeight = computed(() => minLength.value * 0.99);

// Auto-correct height
const handleHeightChange = (newHeight: number): void => {
  const safe = Math.min(Math.max(0.1, newHeight), maxHeight.value);
  height.value = safe;

  // Auto-correct if height exceeds max
  if (newHeight > maxHeight.value) 
    height.value = maxHeight.value;
  
};

function handlePendulumUpdate(id: number, updates: Partial<PendulumConfig>): void {
  pendulums.value = pendulums.value.map((p) => (p.id === id ? { ...p, ...updates } : p));
}

function handleAddPendulum(): void {
  if (pendulums.value.length >= 3) return;
  const nextPresetIndex = pendulums.value.length;
  if (nextPresetIndex < PENDULUM_PRESETS.length)
    pendulums.value = [...pendulums.value, { ...PENDULUM_PRESETS[nextPresetIndex] }];
}

function handleRemovePendulum(): void {
  if (pendulums.value.length <= 1) return;
  pendulums.value = pendulums.value.slice(0, -1);
}
</script>

<template>
  <div class="h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden flex flex-col">
    <NavBar title="圆锥摆演示教学系统" :gradient="true" />

    <main class="flex-grow flex flex-row overflow-hidden h-[calc(100vh-4rem)] relative">
      <div class="w-[380px] shrink-0 flex flex-col bg-slate-900/50 border-r border-slate-800 overflow-y-auto custom-scrollbar p-3 gap-3">
        <Controls
          :height="height"
          :max-height="maxHeight"
          :is-playing="isPlaying"
          :pendulums="pendulums"
          @update:height="handleHeightChange"
          @update:is-playing="isPlaying = $event"
          @update:pendulum="handlePendulumUpdate"
          @add-pendulum="handleAddPendulum"
          @remove-pendulum="handleRemovePendulum"
        />
        <div class="mt-auto pt-4 text-xs text-slate-500 text-center">
          制作者：
          <a href="https://github.com/mister-hope" target="_blank" rel="noopener noreferrer" class="text-slate-400 hover:text-slate-300">
            Mister Hope
          </a>
        </div>
      </div>

      <div class="flex-grow relative bg-slate-950 overflow-hidden flex flex-col">
        <PendulumSimulation
          :height="height"
          :pendulums="pendulums"
          :is-playing="isPlaying"
          :angular-velocity="angularVelocity"
        />
      </div>

      <div class="w-[420px] shrink-0 bg-slate-900/50 border-l border-slate-800 overflow-y-auto custom-scrollbar p-3 gap-3">
        <DataPanel
          :height="height"
          :angular-velocity="angularVelocity"
          :period="period"
          :pendulums="pendulums"
        />
        <Theory />
      </div>

      <Copyright />
    </main>
  </div>
</template>

<style>
  .custom-scrollbar::-webkit-scrollbar { width: 8px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: #0f172a; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
</style>
