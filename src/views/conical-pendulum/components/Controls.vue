<script setup lang="ts">
import AppButton from "@/components/AppButton.vue";
import AppSlider from "@/components/AppSlider.vue";
import Latex from "@/components/Latex.vue";

import type { PendulumConfig } from "../types";

interface Props {
  height: number;
  maxHeight: number;
  isPlaying: boolean;
  pendulums: PendulumConfig[];
}

defineProps<Props>();

const emit = defineEmits<{
  "update:height": [value: number];
  "update:isPlaying": [value: boolean];
  "update:pendulum": [id: number, updates: Partial<PendulumConfig>];
  "add-pendulum": [];
  "remove-pendulum": [];
}>();
</script>

<template>
  <div class="bg-slate-900 rounded-xl p-3 border border-slate-800 shadow-lg">
    <div class="flex items-center justify-between mb-5">
      <h2 class="text-xl font-bold text-white flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-blue-400"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        全局控制
      </h2>
      <AppButton
        :variant="isPlaying ? 'warning' : 'success'"
        size="md"
        @click="emit('update:isPlaying', !isPlaying)"
      >
        <template v-if="isPlaying">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
          暂停
        </template>
        <template v-else>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          演示
        </template>
      </AppButton>
    </div>

    <div class="space-y-6">
      <!-- Height Control -->
      <div>
        <div class="flex justify-between items-end mb-2">
          <label class="text-base text-slate-300 font-bold flex items-center gap-1">
            垂直高度 <Latex latex="h" />
          </label>
          <span class="text-2xl text-blue-400 font-bold">{{ height.toFixed(2) }}m</span>
        </div>
        <input
          type="range"
          :min="0.1"
          :max="maxHeight"
          :step="0.01"
          :value="height"
          class="w-full h-4 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          @input="
            emit('update:height', Number.parseFloat(($event.target as HTMLInputElement).value))
          "
        />
        <div class="flex justify-between text-xs text-slate-500 mt-1">
          <span>0.10m</span>
          <span>Max (L限制): {{ maxHeight.toFixed(2) }}m</span>
        </div>
      </div>

      <!-- Individual Pendulum Controls -->
      <div class="border-t border-slate-700 pt-5">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-base font-bold text-slate-200">对象参数调节</h3>
          <div class="flex gap-1.5">
            <button
              class="w-7 h-7 flex items-center justify-center rounded bg-slate-800 text-slate-200 hover:bg-red-900/50 hover:text-red-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              :disabled="pendulums.length <= 1"
              title="减少小球"
              @click="emit('remove-pendulum')"
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
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button
              class="w-7 h-7 flex items-center justify-center rounded bg-slate-800 text-slate-200 hover:bg-green-900/50 hover:text-green-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              :disabled="pendulums.length >= 3"
              title="增加小球"
              @click="emit('add-pendulum')"
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
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>

        <div class="space-y-3">
          <div
            v-for="pendulum in pendulums"
            :key="pendulum.id"
            class="bg-slate-950/60 p-3 rounded-lg border border-slate-800"
          >
            <div class="flex items-center gap-2 mb-3">
              <div class="w-3.5 h-3.5 rounded-full" :style="{ backgroundColor: pendulum.color }" />
              <span class="font-bold text-slate-200">{{ pendulum.label }}</span>
            </div>

            <div class="space-y-3">
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span>绳长 <Latex latex="L" /></span>
                  <span class="font-mono text-slate-200"
                    >{{ pendulum.length.toFixed(2) }}<span class="font-serif">m</span></span
                  >
                </div>
                <input
                  type="range"
                  :min="0.5"
                  :max="4"
                  :step="0.1"
                  :value="pendulum.length"
                  class="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-400"
                  @input="
                    emit('update:pendulum', pendulum.id, {
                      length: Number.parseFloat(($event.target as HTMLInputElement).value),
                    })
                  "
                />
              </div>
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span>质量 <Latex latex="m" /></span>
                  <span class="font-mono text-slate-200"
                    >{{ pendulum.mass.toFixed(1) }}<span class="font-serif">kg</span></span
                  >
                </div>
                <input
                  type="range"
                  :min="0.1"
                  :max="5"
                  :step="0.1"
                  :value="pendulum.mass"
                  class="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-400"
                  @input="
                    emit('update:pendulum', pendulum.id, {
                      mass: Number.parseFloat(($event.target as HTMLInputElement).value),
                    })
                  "
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
