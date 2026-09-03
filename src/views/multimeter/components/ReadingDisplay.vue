<script setup lang="ts">
import type { ReadingDetail } from "../types";

defineProps<{
  reading: ReadingDetail;
  showReading: boolean;
}>();

const emit = defineEmits<{
  (e: "update:showReading", val: boolean): void;
}>();
</script>

<template>
  <div class="bg-white rounded-xl border border-stone-300 p-4 shadow-sm transition-all">
    <!-- Header with Toggle Button -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="font-medium text-stone-800 text-sm md:text-base">测量示数显示</span>
      </div>

      <button
        type="button"
        @click="emit('update:showReading', !showReading)"
        :class="[
          'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm',
          showReading
            ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
            : 'bg-stone-800 hover:bg-stone-700 text-white',
        ]"
      >
        <span v-if="showReading">隐藏示数</span>
        <span v-else>显示示数</span>
      </button>
    </div>

    <!-- Collapsed / Hidden State -->
    <div
      v-if="!showReading"
      class="mt-3 p-4 bg-stone-50 rounded-lg border border-dashed border-stone-300 text-center text-stone-500 text-sm"
    >
      <div class="font-medium text-stone-600">示数已隐藏</div>
    </div>

    <!-- Expanded / Revealed State -->
    <div v-else class="mt-3 space-y-3">
      <!-- Main Readout Highlight Card -->
      <div
        class="bg-stone-50 rounded-lg p-3 border border-stone-200 flex flex-wrap items-baseline justify-between gap-2"
      >
        <div>
          <span class="text-xs text-stone-500 block mb-0.5">测量最终读数：</span>
          <div class="flex items-baseline gap-1.5">
            <span class="text-2xl md:text-3xl font-bold font-mono text-stone-900">
              {{ reading.finalValueString }}
            </span>
            <span class="text-base font-semibold text-stone-700">
              {{ reading.unit }}
            </span>
          </div>
        </div>

        <div class="text-right">
          <span class="text-xs text-stone-500 block mb-0.5">当前档位：</span>
          <span
            class="text-sm font-semibold text-stone-800 bg-white px-2 py-0.5 rounded border border-stone-200"
          >
            {{ reading.gear.name }}
          </span>
        </div>
      </div>

      <!-- Detail specifications -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
        <div class="bg-stone-50/70 p-2.5 rounded border border-stone-200">
          <span class="font-semibold text-stone-700 block mb-1">所选刻度线</span>
          <span class="text-stone-600">{{ reading.scaleUsed }}</span>
        </div>

        <div class="bg-stone-50/70 p-2.5 rounded border border-stone-200">
          <span class="font-semibold text-stone-700 block mb-1">读数与换算过程</span>
          <span class="text-stone-600 font-mono">{{ reading.calculationFormula }}</span>
        </div>
      </div>

      <!-- Teaching / Accuracy Tip -->
      <div
        v-if="reading.accuracyNote"
        class="text-xs text-stone-500 bg-amber-50/50 p-2 rounded border border-amber-200/60"
      >
        <span class="font-semibold text-amber-900">读数要点：</span>
        <span>{{ reading.accuracyNote }}</span>
      </div>
    </div>
  </div>
</template>
