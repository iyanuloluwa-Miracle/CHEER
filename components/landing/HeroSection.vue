<template>
  <section class="flex flex-col items-center">
    <div class="relative w-full overflow-hidden px-2 sm:px-4 lg:min-h-[22rem] lg:px-8">
      <LandingHeroAudienceScatter />
      <div class="relative z-10 mx-auto max-w-3xl">
        <LandingHeroContent
          :title="content.title"
          :description="content.description"
          :primary-cta="content.primaryCta"
        />
        <LandingHeroAudienceMobile />
      </div>
    </div>
    <LandingHeroProductVisual />
  </section>
</template>

<script setup lang="ts">
import { heroContent } from '~/data/landing';

const content = heroContent;
</script>
