<script setup lang="ts">
interface Props {
  variant?: "primary" | "secondary" | "success" | "warning" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  active?: boolean;
}

withDefaults(defineProps<Props>(), {
  variant: "primary",
  size: "md",
  disabled: false,
  active: false,
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const variantClasses: Record<string, string> = {
  primary:
    "bg-blue-600 hover:bg-blue-500 text-white border-blue-500",
  secondary:
    "bg-slate-700 hover:bg-slate-600 text-slate-200 border-transparent",
  success:
    "bg-green-600 hover:bg-green-500 text-white border-green-500",
  warning:
    "bg-amber-600 hover:bg-amber-500 text-white border-amber-500",
  danger:
    "bg-red-600 hover:bg-red-500 text-white border-red-500",
  ghost:
    "bg-transparent hover:bg-slate-700/50 text-slate-300 border-slate-600",
};

const sizeClasses: Record<string, string> = {
  sm: "px-3 py-1.5 text-sm rounded-md",
  md: "px-4 py-2.5 text-base rounded-lg",
  lg: "px-6 py-3 text-lg rounded-lg",
};
</script>

<template>
  <button
    :class="[
      'inline-flex items-center justify-center gap-2 font-semibold border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50',
      variantClasses[variant],
      sizeClasses[size],
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      active ? 'ring-2 ring-blue-400' : '',
    ]"
    :disabled="disabled"
    @click="emit('click', $event)"
  >
    <slot />
  </button>
</template>
