<template>
  <div
    ref="targetRef"
    class="motion-reveal"
    :class="{ 'is-visible': isVisible }"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    threshold?: number;
    rootMargin?: string;
    immediate?: boolean;
  }>(),
  {
    threshold: 0.12,
    rootMargin: '0px 0px -4% 0px',
    immediate: false,
  },
);

const { targetRef, isVisible } = useRevealOnScroll({
  threshold: props.threshold,
  rootMargin: props.rootMargin,
  immediate: props.immediate,
});
</script>
