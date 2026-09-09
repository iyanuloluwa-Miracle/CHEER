<template>
  <section class="flex flex-col items-center">
    <LandingHeroContent
      :title="content.title"
      :description="content.description"
      :primary-cta="content.primaryCta"
      :secondary-cta="content.secondaryCta"
    />
    <LandingHeroProductVisual />
  </section>
</template>

<script setup lang="ts">
import { heroContent } from '~/data/landing';

const content = heroContent;
</script>
