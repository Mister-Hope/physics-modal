<script setup lang="ts">
interface Props {
  modelValue: boolean;
  label?: string;
  disabled?: boolean;
}

const { label = "", disabled = false } = defineProps<Props>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();
</script>

<template>
  <div class="flex items-center justify-between">
    <span v-if="label" class="text-base font-medium text-slate-300">{{ label }}</span>
    <button
      type="button"
      :class="[
        'relative inline-flex h-6 w-10 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800',
        modelValue ? 'bg-blue-600' : 'bg-slate-600',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      ]"
      :disabled="disabled"
      role="switch"
      :aria-checked="modelValue"
      @click="emit('update:modelValue', !modelValue)"
    >
      <span
        :class="[
          'inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out',
          modelValue ? 'translate-x-5' : 'translate-x-1',
        ]"
      />
    </button>
  </div>
</template>
