<template>
  <section
    :id="section.id"
    class="scroll-mt-28 mt-16 sm:mt-20"
    :aria-labelledby="`${section.id}-heading`"
  >
    <UiSectionHeader
      :eyebrow="section.eyebrow"
      :title="section.title"
      :description="section.description"
      :heading-id="`${section.id}-heading`"
    />

    <UiRevealOnScroll>
      <ul
        class="mt-10 grid grid-cols-1 gap-4 sm:mt-12 md:grid-cols-3 md:gap-5"
        role="list"
      >
        <li
          v-for="point in section.points"
          :key="point.id"
          class="flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm shadow-black/5"
        >
          <div class="bg-[#faf8f4] px-4 pt-4 sm:px-5 sm:pt-5">
            <img
              :src="point.illustration"
              :alt="point.illustrationAlt"
              class="mx-auto h-auto w-full max-w-[280px] object-contain"
              width="280"
              height="210"
              loading="lazy"
              decoding="async"
            >
          </div>
          <div class="flex flex-1 flex-col p-5 sm:p-6">
            <h3 class="text-lg font-bold tracking-tight text-cheer-ink">
              {{ point.title }}
            </h3>
            <p class="mt-2 text-sm leading-relaxed text-cheer-ink/70 sm:text-base">
              {{ point.description }}
            </p>
          </div>
        </li>
      </ul>
    </UiRevealOnScroll>
  </section>
</template>

<script setup lang="ts">
import { problemSection } from '~/data/landing';

const section = problemSection;
</script>
