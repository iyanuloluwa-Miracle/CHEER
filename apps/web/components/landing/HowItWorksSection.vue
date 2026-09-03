<template>
  <section
    :id="section.id"
    class="scroll-mt-28 mt-24 sm:mt-32"
    :aria-labelledby="`${section.id}-heading`"
  >
    <UiSectionHeader
      :eyebrow="section.eyebrow"
      :title="section.title"
      :description="section.description"
      :heading-id="`${section.id}-heading`"
    />

    <ol class="mt-16 space-y-20 sm:mt-20 sm:space-y-24">
      <LandingHowItWorksStep
        v-for="(step, index) in steps"
        :key="step.title"
        :step="step"
        :step-number="index + 1"
        :reversed="index % 2 === 1"
      />
    </ol>
  </section>
</template>

<script setup lang="ts">
import { howItWorksSection, howItWorksSteps } from '~/data/landing';

const section = howItWorksSection;
const steps = howItWorksSteps;
</script>
