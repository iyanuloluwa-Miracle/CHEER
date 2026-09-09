<template>
  <div class="flex flex-col items-center text-center">
    <h1
      class="motion-animate motion-animate-delay-1 mt-4 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-cheer-ink sm:text-5xl lg:text-6xl"
    >
      {{ title }}
    </h1>

    <p
      class="motion-animate motion-animate-delay-2 mt-5 max-w-2xl text-base leading-relaxed text-cheer-ink/70 sm:text-lg"
    >
      {{ description }}
    </p>

    <div class="motion-animate motion-animate-delay-3 mt-8">
      <LandingHeroActions :primary-cta="primaryCta" :secondary-cta="secondaryCta" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CtaLink } from '~/types/landing';

defineProps<{
  title: string;
  description: string;
  primaryCta: CtaLink;
  secondaryCta: CtaLink;
}>();
</script>
