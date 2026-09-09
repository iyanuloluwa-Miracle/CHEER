<template>
  <li
    ref="targetRef"
    class="motion-reveal grid items-center gap-6 lg:grid-cols-2 lg:gap-10"
    :class="{ 'is-visible': isVisible }"
  >
    <div
      class="text-center lg:text-left"
      :class="reversed ? 'lg:order-2' : ''"
    >
      <span
        class="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cheer-leaf"
      >
        Step {{ stepNumber }}
      </span>
      <h3 class="mt-4 text-2xl font-bold tracking-tight text-cheer-ink sm:text-3xl">
        {{ step.title }}
      </h3>
      <p class="mt-3 text-base leading-relaxed text-cheer-ink/70 sm:text-lg">
        {{ step.description }}
      </p>
    </div>

    <figure :class="reversed ? 'lg:order-1' : ''">
      <img
        v-if="step.illustration"
        :src="step.illustration"
        :alt="step.visualCaption"
        class="mx-auto h-auto w-full max-w-sm object-contain sm:max-w-md lg:mx-0 lg:max-h-80 lg:max-w-lg"
        width="480"
        height="360"
        loading="lazy"
        decoding="async"
      />

      <div
        v-else
        class="overflow-hidden rounded-2xl border border-black/10 shadow-md shadow-black/5"
      >
        <div
          class="aspect-[4/3] w-full"
          :class="step.visualTheme === 'dark' ? 'bg-cheer-ink' : 'bg-[#faf8f4]'"
          aria-hidden="true"
        >
          <div class="flex h-full flex-col p-5 sm:p-6">
            <div class="flex items-center gap-2">
              <span
                v-for="dot in 3"
                :key="dot"
                class="h-2.5 w-2.5 rounded-full"
                :class="step.visualTheme === 'dark' ? 'bg-white/15' : 'bg-black/10'"
              />
            </div>

            <div class="mt-5 flex flex-1 flex-col justify-center">
              <LandingHowItWorksVisual :visual="step.visual" />
            </div>
          </div>
        </div>
      </div>

      <figcaption class="sr-only">{{ step.visualCaption }}</figcaption>
    </figure>
  </li>
</template>

<script setup lang="ts">
import type { HowItWorksStep } from '~/types/landing';

defineProps<{
  step: HowItWorksStep;
  stepNumber: number;
  reversed?: boolean;
}>();

const { targetRef, isVisible } = useRevealOnScroll();
</script>
