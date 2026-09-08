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
        class="mt-10 grid grid-cols-1 gap-4 sm:mt-12 sm:grid-cols-2"
        role="list"
      >
        <li
          v-for="item in items"
          :key="item.id"
          class="rounded-2xl border border-black/10 bg-white p-5 shadow-sm shadow-black/5 sm:p-6"
        >
          <h3 class="text-lg font-bold tracking-tight text-cheer-ink">
            {{ item.title }}
          </h3>
          <p class="mt-2 text-sm leading-relaxed text-cheer-ink/70 sm:text-base">
            {{ item.description }}
          </p>
        </li>
      </ul>

      <p class="mt-8 text-center text-sm text-cheer-ink/60">
        Questions or support:
        <a
          href="mailto:hello@tippy.me"
          class="font-semibold text-cheer-leaf underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf"
        >hello@tippy.me</a>
        ·
        <NuxtLink
          to="/terms"
          class="font-semibold text-cheer-leaf underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf"
        >Terms</NuxtLink>
        ·
        <NuxtLink
          to="/privacy"
          class="font-semibold text-cheer-leaf underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf"
        >Privacy</NuxtLink>
      </p>
    </UiRevealOnScroll>
  </section>
</template>

<script setup lang="ts">
import { trustItems, trustSection } from '~/data/landing';

const section = trustSection;
const items = trustItems;
</script>
