<script setup lang="ts">
interface Props {
  modelValue: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  unit?: string;
  digits?: number;
}

const props = withDefaults(defineProps<Props>(), {
  step: 1,
  unit: "",
  digits: 1,
});

const emit = defineEmits<{
  "update:modelValue": [value: number];
}>();

function onInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  emit("update:modelValue", Number.parseFloat(target.value));
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex justify-between items-center">
      <label class="text-base font-semibold text-slate-300">
        <slot name="label">{{ label }}</slot>
      </label>
      <span class="text-lg font-mono text-sky-400 font-bold">
        {{ modelValue.toFixed(digits) }}{{ unit }}
      </span>
    </div>
    <input
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      class="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-500"
      @input="onInput"
    />
    <div class="flex justify-between text-xs text-slate-500 px-1">
      <span>{{ min }}{{ unit }}</span>
      <span>{{ max }}{{ unit }}</span>
    </div>
  </div>
</template>
