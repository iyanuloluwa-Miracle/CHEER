<template>
  <section
    :id="section.id"
    class="scroll-mt-28 mt-16 sm:mt-20"
    :aria-labelledby="`${section.id}-heading`"
  >
    <UiRevealOnScroll>
      <div
        class="rounded-2xl border border-cheer-leaf/20 px-6 py-10 text-center sm:px-10 sm:py-14"
        style="
          background:
            radial-gradient(ellipse 80% 70% at 50% 0%, rgba(200, 240, 221, 0.55), transparent 60%),
            #faf8f4;
        "
      >
        <h2
          :id="`${section.id}-heading`"
          class="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-cheer-ink sm:text-4xl"
        >
          {{ section.title }}
        </h2>
        <p class="mx-auto mt-4 max-w-xl text-base leading-relaxed text-cheer-ink/70 sm:text-lg">
          {{ section.description }}
        </p>
        <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
          <UiButtonLink
            :to="section.primaryCta.to"
            :label="section.primaryCta.label"
            variant="primary"
          />
          <UiButtonLink
            :to="section.secondaryCta.to"
            :label="section.secondaryCta.label"
            variant="secondary"
          />
        </div>
      </div>
    </UiRevealOnScroll>
  </section>
</template>

<script setup lang="ts">
import { finalCtaSection } from '~/data/landing';

const section = finalCtaSection;
</script>
