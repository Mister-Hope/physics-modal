<script setup lang="ts" generic="T extends string">
interface Props {
  modelValue: T;
  options: { value: T; label: string }[];
  disabled?: boolean;
}

const { disabled = false } = defineProps<Props>();

const emit = defineEmits<{
  "update:modelValue": [value: T];
}>();
</script>

<template>
  <div class="space-y-2">
    <div class="flex bg-slate-700 p-1 rounded-lg">
      <button
        v-for="option in options"
        :key="option.value"
        :class="[
          'flex-1 py-1.5 text-sm font-medium rounded-md transition-all',
          modelValue === option.value
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-slate-400 hover:text-slate-200',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ]"
        :disabled="disabled"
        @click="emit('update:modelValue', option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>
