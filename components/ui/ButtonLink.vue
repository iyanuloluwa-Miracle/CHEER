<template>
  <NuxtLink
    :to="to"
    class="inline-flex items-center justify-center rounded-full font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf focus-visible:ring-offset-2"
    :class="[variantClasses, sizeClasses, fullWidth ? 'w-full' : '']"
  >
    <slot>{{ label }}</slot>
  </NuxtLink>
</template>

<script setup lang="ts">
type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'sm';

const props = withDefaults(
  defineProps<{
    to: string;
    label?: string;
    variant?: Variant;
    size?: Size;
    fullWidth?: boolean;
  }>(),
  {
    variant: 'primary',
    size: 'md',
    fullWidth: false,
  },
);

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'secondary':
      return 'border border-black/10 bg-white text-cheer-ink hover:bg-cheer-sand motion-cta';
    case 'ghost':
      return 'text-cheer-ink/70 hover:text-cheer-leaf';
    default:
      return 'bg-cheer-leaf text-white hover:brightness-105 motion-cta motion-cta-primary';
  }
});

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'px-4 py-2 text-sm';
    default:
      return 'px-6 py-2.5 text-sm';
  }
});
</script>
