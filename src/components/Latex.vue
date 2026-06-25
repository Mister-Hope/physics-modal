<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

interface Props {
  latex?: string;
  block?: boolean;
  color?: string;
}

const props = withDefaults(defineProps<Props>(), {
  latex: "",
  block: false,
  color: "",
});

const content = computed(() => props.latex);

const containerRef = ref<HTMLSpanElement>();

let isMounted = true;

const renderMath = async (): Promise<void> => {
  const el = containerRef.value;
  if (!el) return;

  if (!globalThis.MathJax?.typesetPromise) {
    setTimeout(() => {
      if (isMounted) void renderMath();
    }, 200);
    return;
  }

  const delimiter = props.block ? "$$" : "$";
  el.textContent = `${delimiter}${content.value}${delimiter}`;
  el.style.visibility = "hidden";

  try {
    await globalThis.MathJax.typesetPromise([el]);
    if (!isMounted) return;

    el.style.visibility = "visible";

    const { color } = props;

    if (props.color) {
      const svg = el.querySelector("svg");
      if (svg) {
        svg.style.fill = color;
        svg.style.color = color;
        const paths = svg.querySelectorAll("path, rect, polygon");
        paths.forEach((path) => {
          (path as SVGElement).style.fill = color;
        });
      }
    }
  } catch {
    el.textContent = content.value;
    el.style.visibility = "visible";
  }
};

onMounted(() => {
  isMounted = true;

  watch(
    () => [props.color, props.latex],
    () => {
      void renderMath();
    },
  );

  void renderMath();
});

onBeforeUnmount(() => {
  isMounted = false;
});
</script>

<template>
  <span
    ref="containerRef"
    :style="{
      display: block ? 'block' : 'inline-block',
      color,
      verticalAlign: block ? undefined : 'middle',
      position: block ? undefined : 'relative',
      bottom: block ? undefined : '0.125em',
    }"
  />
</template>
