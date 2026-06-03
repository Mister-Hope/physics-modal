<script setup lang="ts">
import type { PhysicsParams, VectorConfig } from "../types";
import { SimulationMode } from "../types";
import AppButton from "@/components/AppButton.vue";
import AppSlider from "@/components/AppSlider.vue";

interface Props {
  params: PhysicsParams;
  mode: SimulationMode;
  vectors: VectorConfig;
}

defineProps<Props>();

const emit = defineEmits<{
  "update:params": [params: PhysicsParams];
  "update:mode": [mode: SimulationMode];
  "update:vectors": [vectors: VectorConfig];
  reset: [];
}>();

const isRunning = (mode: SimulationMode): boolean =>
  mode === SimulationMode.Running ||
  mode === SimulationMode.PauseAtBottom ||
  mode === SimulationMode.PauseAtTop;

// SVG icons
const PlayIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
const PauseIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
</script>

<template>
  <div class="h-full flex flex-col gap-6 p-5 bg-slate-800 border-r border-slate-700 shadow-xl overflow-y-auto w-72 z-10">
    <!-- Sliders -->
    <div>
      <h2 class="text-xl font-bold text-white mb-3">参数调节</h2>
      <div class="space-y-5">
        <AppSlider
          :model-value="params.mass"
          :min="0.1"
          :max="5"
          :step="0.1"
          label="摆球质量 m (kg)"
          unit=" kg"
          :digits="1"
          @update:model-value="emit('update:params', { ...params, mass: $event })"
        />
        <AppSlider
          :model-value="params.length"
          :min="0.5"
          :max="4"
          :step="0.1"
          label="摆绳长度 L (m)"
          unit=" m"
          :digits="1"
          @update:model-value="emit('update:params', { ...params, length: $event })"
        />
        <AppSlider
          :model-value="params.initialAngle"
          :min="0"
          :max="30"
          :step="1"
          label="最大摆角 (振幅)"
          unit="°"
          :digits="0"
          @update:model-value="emit('update:params', { ...params, initialAngle: $event })"
        />
      </div>
    </div>

    <!-- Playback Controls -->
    <div class="space-y-3 pt-4 border-t border-slate-600">
      <h3 class="text-lg font-semibold text-slate-300">播放控制</h3>

      <AppButton
        :variant="isRunning(mode) ? 'warning' : 'success'"
        size="lg"
        class="w-full !justify-start"
        @click="emit('update:mode', isRunning(mode) ? SimulationMode.Paused : SimulationMode.Running)"
      >
        <span v-html="isRunning(mode) ? PauseIcon : PlayIcon" class="flex items-center" />
        {{ isRunning(mode) ? '暂停' : '开始 / 继续' }}
      </AppButton>

      <AppButton
        :variant="mode === SimulationMode.PauseAtBottom ? 'primary' : 'secondary'"
        :active="mode === SimulationMode.PauseAtBottom"
        size="lg"
        class="w-full !justify-start"
        @click="emit('update:mode', SimulationMode.PauseAtBottom)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
        最低点暂停
      </AppButton>

      <AppButton
        :variant="mode === SimulationMode.PauseAtTop ? 'primary' : 'secondary'"
        :active="mode === SimulationMode.PauseAtTop"
        size="lg"
        class="w-full !justify-start"
        @click="emit('update:mode', SimulationMode.PauseAtTop)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        最高点暂停 (右)
      </AppButton>

      <AppButton variant="secondary" size="lg" class="w-full !justify-start" @click="emit('reset')">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        重置模型
      </AppButton>
    </div>

    <!-- Vector Toggles -->
    <div class="space-y-3 pt-4 border-t border-slate-600">
      <h3 class="text-lg font-semibold text-slate-300">矢量显示</h3>

      <button
        :class="[
          'w-full flex items-center justify-between px-4 py-3 rounded-lg border text-base transition-all',
          vectors.showForces
            ? 'bg-slate-700 border-slate-500 text-white'
            : 'bg-slate-800 border-slate-700 text-slate-400',
        ]"
        @click="emit('update:vectors', { ...vectors, showForces: !vectors.showForces })"
      >
        <div class="flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="vectors.showForces ? 'text-pink-400' : ''"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
          <span>受力分析</span>
        </div>
        <div :class="['w-3 h-3 rounded-full', vectors.showForces ? 'bg-green-500' : 'bg-slate-600']" />
      </button>

      <button
        :class="[
          'w-full flex items-center justify-between px-4 py-3 rounded-lg border text-base transition-all',
          vectors.showVelocity
            ? 'bg-slate-700 border-slate-500 text-white'
            : 'bg-slate-800 border-slate-700 text-slate-400',
        ]"
        @click="emit('update:vectors', { ...vectors, showVelocity: !vectors.showVelocity })"
      >
        <div class="flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="vectors.showVelocity ? 'text-green-400' : ''"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span>速度</span>
        </div>
        <div :class="['w-3 h-3 rounded-full', vectors.showVelocity ? 'bg-green-500' : 'bg-slate-600']" />
      </button>

      <button
        :class="[
          'w-full flex items-center justify-between px-4 py-3 rounded-lg border text-base transition-all',
          vectors.showAcceleration
            ? 'bg-slate-700 border-slate-500 text-white'
            : 'bg-slate-800 border-slate-700 text-slate-400',
        ]"
        @click="emit('update:vectors', { ...vectors, showAcceleration: !vectors.showAcceleration })"
      >
        <div class="flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="vectors.showAcceleration ? 'text-amber-400' : ''"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          <span>加速度</span>
        </div>
        <div :class="['w-3 h-3 rounded-full', vectors.showAcceleration ? 'bg-green-500' : 'bg-slate-600']" />
      </button>
    </div>

    <div class="mt-auto pt-4 text-xs text-slate-500 text-center">
      制作者：
      <a href="https://github.com/mister-hope" target="_blank" rel="noopener noreferrer" class="text-slate-400 hover:text-slate-300">
        Mister Hope
      </a>
    </div>
  </div>
</template>
