<template>
  <div
    ref="targetRef"
    class="motion-reveal relative mt-12 w-full max-w-4xl sm:mt-16"
    :class="{ 'is-visible': isVisible }"
  >
    <figure
      class="relative overflow-hidden rounded-2xl border border-cheer-leaf/15 bg-white shadow-[0_28px_70px_-40px_rgba(147,98,255,0.45)]"
    >
      <img
        src="/illustrations/hero.png"
        alt="African creator sharing a TippyMe support link on their phone"
        class="aspect-video w-full object-cover object-center"
        width="1280"
        height="720"
        decoding="async"
        fetchpriority="high"
      >
      <figcaption class="sr-only">
        TippyMe — one purple link for support, no bank details in chat
      </figcaption>
    </figure>
  </div>
</template>

<script setup lang="ts">
const { targetRef, isVisible } = useRevealOnScroll({ immediate: true });
</script>
