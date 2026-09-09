<template>
  <header class="mx-auto max-w-2xl" :class="align === 'left' ? 'text-left' : 'text-center'">
    <p
      v-if="eyebrow"
      class="text-sm font-semibold uppercase tracking-widest text-cheer-leaf"
    >
      {{ eyebrow }}
    </p>
    <component
      :is="headingTag"
      :id="headingId"
      class="mt-3 text-3xl font-bold tracking-tight text-cheer-ink sm:text-4xl"
    >
      {{ title }}
    </component>
    <p
      v-if="description"
      class="mt-4 text-base leading-relaxed text-cheer-ink/70 sm:text-lg"
    >
      {{ description }}
    </p>
  </header>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    eyebrow?: string;
    title: string;
    description?: string;
    headingId?: string;
    headingTag?: 'h1' | 'h2' | 'h3';
    align?: 'center' | 'left';
  }>(),
  {
    headingTag: 'h2',
    align: 'center',
  },
);
</script>
