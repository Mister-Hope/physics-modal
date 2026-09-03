<script setup lang="ts">
const { modelValue } = defineProps<{
  modelValue: number;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", val: number): void;
}>();

const onInput = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  emit("update:modelValue", Number(target.value));
};

const step = (delta: number): void => {
  const next = Math.max(0, Math.min(1, modelValue + delta));
  emit("update:modelValue", Number(next.toFixed(4)));
};

const setPreset = (val: number): void => {
  emit("update:modelValue", val);
};

const setRandom = (): void => {
  // Generate random deflection between 0.08 and 0.92 rounded to 3 decimals
  const r = 0.08 + Math.random() * 0.84;
  emit("update:modelValue", Number(r.toFixed(3)));
};
</script>

<template>
  <div class="bg-white rounded-xl border border-stone-300 p-3 sm:p-4 shadow-sm select-none">
    <!-- Title and Micro-adjustment buttons -->
    <div class="flex items-center justify-between gap-2 mb-2">
      <div class="flex items-center gap-2">
        <span class="font-bold text-stone-900 text-sm md:text-base">指针偏转调节</span>
      </div>

      <!-- Quick Step Buttons -->
      <div class="flex items-center gap-1">
        <button
          type="button"
          @click="step(-0.02)"
          title="向左移动1大格 (1/50)"
          class="px-2 py-1 text-xs font-semibold bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-700 rounded border border-stone-200 transition"
        >
          -1格
        </button>
        <button
          type="button"
          @click="step(-0.002)"
          title="向左微调"
          class="px-1.5 py-1 text-xs font-semibold bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-700 rounded border border-stone-200 transition"
        >
          ◄
        </button>
        <button
          type="button"
          @click="step(0.002)"
          title="向右微调"
          class="px-1.5 py-1 text-xs font-semibold bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-700 rounded border border-stone-200 transition"
        >
          ►
        </button>
        <button
          type="button"
          @click="step(0.02)"
          title="向右移动1大格 (1/50)"
          class="px-2 py-1 text-xs font-semibold bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-700 rounded border border-stone-200 transition"
        >
          +1格
        </button>
      </div>
    </div>

    <!-- The Slider: Continuous, without displaying numerical coordinates -->
    <div class="relative py-1.5">
      <input
        type="range"
        min="0"
        max="1"
        step="0.001"
        :value="modelValue"
        @input="onInput"
        class="w-full h-3.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
      />
    </div>

    <!-- Positional indicators (Left 0 / Mid / Right Full) -->
    <div class="flex justify-between text-xs text-stone-500 px-0.5 select-none font-medium mb-2.5">
      <span>左端 (零位 / ∞)</span>
      <span class="text-stone-400 font-sans">半偏 (中值区)</span>
      <span>右端 (满偏 / 0Ω)</span>
    </div>

    <!-- Teaching Presets Bar: convenient for teachers to quickly set textbook questions -->
    <div class="flex items-center justify-between pt-2 border-t border-stone-100 gap-1 flex-wrap">
      <div class="flex items-center gap-1">
        <button
          type="button"
          @click="setPreset(0)"
          :class="[
            'px-2 py-0.5 text-xs rounded transition border',
            modelValue === 0
              ? 'bg-stone-900 text-white border-stone-900 font-bold'
              : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200',
          ]"
        >
          零刻度
        </button>
        <button
          type="button"
          @click="setPreset(0.25)"
          :class="[
            'px-2 py-0.5 text-xs rounded transition border',
            modelValue === 0.25
              ? 'bg-stone-900 text-white border-stone-900 font-bold'
              : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200',
          ]"
        >
          1/4偏
        </button>
        <button
          type="button"
          @click="setPreset(0.5)"
          :class="[
            'px-2 py-0.5 text-xs rounded transition border',
            modelValue === 0.5
              ? 'bg-stone-900 text-white border-stone-900 font-bold'
              : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200',
          ]"
        >
          半偏(中值)
        </button>
        <button
          type="button"
          @click="setPreset(0.75)"
          :class="[
            'px-2 py-0.5 text-xs rounded transition border',
            modelValue === 0.75
              ? 'bg-stone-900 text-white border-stone-900 font-bold'
              : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200',
          ]"
        >
          3/4偏
        </button>
        <button
          type="button"
          @click="setPreset(1.0)"
          :class="[
            'px-2 py-0.5 text-xs rounded transition border',
            modelValue === 1.0
              ? 'bg-stone-900 text-white border-stone-900 font-bold'
              : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200',
          ]"
        >
          满偏
        </button>
        <button
          type="button"
          @click="setRandom"
          class="px-2 py-0.5 text-xs rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-semibold transition"
          title="随机偏转角度以考核学生"
        >
          随机出题
        </button>
      </div>
    </div>
  </div>
</template>
