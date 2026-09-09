<template>
  <div
    class="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-1 text-xs"
  >
    <span
      class="h-2 w-2 rounded-full"
      :class="ok ? 'bg-[var(--cheer-leaf)]' : 'bg-amber-500'"
    />
    <span>{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  ok: boolean;
  label: string;
}>();
</script>
