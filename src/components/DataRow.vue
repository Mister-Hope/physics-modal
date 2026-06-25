<script setup lang="ts">
import Latex from "./Latex.vue";

interface Props {
  title: string;
  symbol: string;
  value: number;
  unit: string;
  colorClass?: string;
  hexColor?: string;
  digits?: number;
}

// oxlint-disable-next-line vue/max-props
const { colorClass = "text-slate-100", hexColor = "", digits = 2 } = defineProps<Props>();
</script>

<template>
  <div class="flex items-center justify-between border-b border-slate-700 py-4 last:border-0">
    <div class="flex items-center gap-3">
      <div class="w-8 flex justify-center">
        <Latex :latex="symbol" class="text-xl" :color="hexColor" />
      </div>
      <span class="text-slate-300 text-lg">{{ title }}</span>
    </div>
    <div class="text-right">
      <span :class="['text-2xl font-mono font-bold', colorClass]">
        {{ value.toFixed(digits) }}
      </span>
      <span class="text-slate-500 ml-2 text-lg">{{ unit }}</span>
    </div>
  </div>
</template>
