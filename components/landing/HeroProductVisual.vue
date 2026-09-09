<template>
  <div
    ref="targetRef"
    class="motion-reveal relative mt-12 w-full max-w-4xl sm:mt-16"
    :class="{ 'is-visible': isVisible }"
  >
    <figure
      class="relative overflow-hidden rounded-2xl border border-black/10 bg-cheer-ink shadow-md shadow-black/5"
    >
      <div
        class="aspect-video w-full bg-cheer-ink"
        style="
          background:
            radial-gradient(circle at 20% 20%, rgba(200, 240, 221, 0.06), transparent 40%),
            var(--cheer-ink);
        "
        aria-hidden="true"
      />
      <div
        class="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <span
          class="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white text-cheer-ink shadow-md sm:h-16 sm:w-16"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="ml-0.5 h-6 w-6 sm:h-7 sm:w-7"
          >
            <path
              d="M8 5.14v14.72a1 1 0 0 0 1.5.86l11.04-7.36a1 1 0 0 0 0-1.72L9.5 4.28a1 1 0 0 0-1.5.86z"
            />
          </svg>
        </span>
      </div>
      <figcaption class="sr-only">Product demo video coming soon</figcaption>
    </figure>
  </div>
</template>

<script setup lang="ts">
const { targetRef, isVisible } = useRevealOnScroll({ immediate: true });
</script>
