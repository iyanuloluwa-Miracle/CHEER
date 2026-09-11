<template>
  <div
    ref="targetRef"
    class="motion-reveal relative mt-12 w-full max-w-4xl sm:mt-16"
    :class="{ 'is-visible': isVisible }"
  >
    <figure
      class="relative overflow-hidden rounded-2xl border border-white/5 shadow-[0_28px_70px_-40px_rgba(0,0,0,0.55)]"
    >
      <div
        class="aspect-video w-full"
        style="
          background:
            radial-gradient(ellipse 70% 55% at 28% 42%, rgba(56, 90, 72, 0.45), transparent 58%),
            radial-gradient(ellipse 50% 40% at 70% 70%, rgba(20, 36, 28, 0.5), transparent 55%),
            linear-gradient(160deg, #0e1411 0%, #080b09 55%, #0a0f0c 100%);
        "
        aria-hidden="true"
      />
      <div
        class="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <span
          class="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#0a0f0c] shadow-lg shadow-black/30 sm:h-16 sm:w-16"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="ml-0.5 h-6 w-6 sm:h-7 sm:w-7"
            aria-hidden="true"
          >
            <path
              d="M8 5.14v14.72a1 1 0 0 0 1.5.86l11.04-7.36a1 1 0 0 0 0-1.72L9.5 4.28a1 1 0 0 0-1.5.86z"
            />
          </svg>
        </span>
      </div>
      <figcaption class="sr-only">
        TippyMe product demo video
      </figcaption>
    </figure>
  </div>
</template>

<script setup lang="ts">
const { targetRef, isVisible } = useRevealOnScroll({ immediate: true });
</script>
