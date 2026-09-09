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
        class="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:mt-12 md:gap-5"
        role="list"
        aria-label="Africa Is Building partners"
      >
        <li v-for="partner in partners" :key="partner.id">
          <LandingStackPartnerCard
            :name="partner.name"
            :role="partner.role"
            :href="partner.href"
          />
        </li>
      </ul>
    </UiRevealOnScroll>
  </section>
</template>

<script setup lang="ts">
import { stackPartners, stackSection } from '~/data/landing';

const section = stackSection;
const partners = stackPartners;
</script>
