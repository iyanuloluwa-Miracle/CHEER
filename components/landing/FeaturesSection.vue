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
        class="mt-10 grid grid-cols-1 gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3"
        role="list"
      >
        <li
          v-for="feature in features"
          :key="feature.id"
          class="flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm shadow-black/5"
        >
          <div class="bg-white px-4 pt-4 sm:px-5 sm:pt-5">
            <img
              :src="feature.illustration"
              :alt="feature.illustrationAlt"
              class="mx-auto h-auto w-full max-w-[240px] object-contain"
              width="240"
              height="180"
              loading="lazy"
              decoding="async"
            >
          </div>
          <div class="flex flex-1 flex-col p-5 sm:p-6">
            <h3 class="text-lg font-bold tracking-tight text-cheer-ink">
              {{ feature.title }}
            </h3>
            <p class="mt-2 text-sm font-semibold leading-relaxed text-cheer-ink/90 sm:text-base">
              {{ feature.description }}
            </p>
          </div>
        </li>
      </ul>
    </UiRevealOnScroll>
  </section>
</template>

<script setup lang="ts">
import { featureItems, featuresSection } from '~/data/landing';

const section = featuresSection;
const features = featureItems;
</script>
