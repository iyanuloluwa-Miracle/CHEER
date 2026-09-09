<template>
  <component
    :is="href ? 'a' : 'div'"
    :href="href"
    :target="href ? '_blank' : undefined"
    :rel="href ? 'noopener noreferrer' : undefined"
    class="flex h-full flex-col rounded-2xl border border-black/10 bg-white p-5 shadow-sm shadow-black/5 transition-colors duration-200 sm:p-6"
    :class="href ? 'hover:border-cheer-leaf/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf' : ''"
  >
    <p class="text-xs font-semibold uppercase tracking-widest text-cheer-leaf">
      Partner
    </p>
    <h3 class="mt-3 text-xl font-bold tracking-tight text-cheer-ink sm:text-2xl">
      {{ name }}
    </h3>
    <p class="mt-2 text-sm leading-relaxed text-cheer-ink/70 sm:text-base">
      {{ role }}
    </p>
  </component>
</template>

<script setup lang="ts">
defineProps<{
  name: string;
  role: string;
  href?: string;
}>();
</script>
