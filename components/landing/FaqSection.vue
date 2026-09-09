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
      <div
        class="mx-auto mt-10 max-w-2xl overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm shadow-black/5 sm:mt-12"
      >
        <LandingFaqItem
          v-for="item in items"
          :key="item.id"
          :item="item"
          :open="openId === item.id"
          @toggle="toggle(item.id)"
        />
      </div>
    </UiRevealOnScroll>
  </section>
</template>

<script setup lang="ts">
import { faqItems, faqSection } from '~/data/landing';

const section = faqSection;
const items = faqItems;

const openId = ref<string | null>(null);

function toggle(id: string) {
  openId.value = openId.value === id ? null : id;
}
</script>
