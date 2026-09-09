<template>
  <div class="border-b border-black/10 last:border-b-0">
    <h3>
      <button
        type="button"
        class="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition-colors duration-200 hover:bg-black/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cheer-leaf sm:px-6"
        :aria-expanded="open"
        :aria-controls="panelId"
        :id="buttonId"
        @click="$emit('toggle')"
      >
        <span class="text-base font-semibold tracking-tight text-cheer-ink sm:text-lg">
          {{ item.question }}
        </span>
        <span
          class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-cheer-ink transition-colors duration-200"
          :class="open ? 'border-cheer-leaf/20 bg-cheer-leaf text-white' : ''"
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            class="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            :class="open ? 'rotate-45' : ''"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
      </button>
    </h3>

    <div
      :id="panelId"
      role="region"
      :aria-labelledby="buttonId"
      class="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
      :class="open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
    >
      <div class="overflow-hidden">
        <p class="px-5 pb-5 text-base leading-relaxed text-cheer-ink/70 sm:px-6">
          {{ item.answer }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FaqItem } from '~/types/landing';

const props = defineProps<{
  item: FaqItem;
  open: boolean;
}>();

defineEmits<{
  toggle: [];
}>();

const buttonId = computed(() => `faq-button-${props.item.id}`);
const panelId = computed(() => `faq-panel-${props.item.id}`);
</script>
