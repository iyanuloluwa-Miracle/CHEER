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
        <li v-for="item in items" :key="item.id">
          <LandingTestimonialTile :testimonial="item" />
        </li>
      </ul>
    </UiRevealOnScroll>
  </section>
</template>

<script setup lang="ts">
import { testimonials, testimonialsSection } from '~/data/landing';

const section = testimonialsSection;
const items = testimonials;
</script>
