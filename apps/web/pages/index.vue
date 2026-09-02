<template>
  <section class="flex flex-col items-center text-center">
    <h1
      class="hero-animate hero-animate-delay-1 mt-4 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-[var(--cheer-ink)] sm:text-5xl lg:text-6xl"
    >
      One link for everyone who wants to support your work.
    </h1>

    <p
      class="hero-animate hero-animate-delay-2 mt-5 max-w-2xl text-base leading-relaxed text-[var(--cheer-ink)]/70 sm:text-lg sm:leading-relaxed"
    >
      Cheer helps African creators and builders receive personal support —
      without sending a bank account to every fan.
    </p>

    <div
      class="hero-animate hero-animate-delay-3 mt-8 flex flex-wrap items-center justify-center gap-3"
    >
      <NuxtLink
        to="/signup"
        class="hero-cta hero-cta-primary inline-flex items-center justify-center rounded-full bg-[var(--cheer-leaf)] px-6 py-2.5 text-sm font-semibold text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cheer-leaf)] focus-visible:ring-offset-2"
      >
        Get started
      </NuxtLink>
      <NuxtLink
        to="/#how-it-works"
        class="hero-cta hero-cta-secondary inline-flex items-center justify-center rounded-full border border-black/10 bg-white/60 px-6 py-2.5 text-sm font-semibold text-[var(--cheer-ink)] hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cheer-leaf)] focus-visible:ring-offset-2"
      >
        How it works
      </NuxtLink>
    </div>

    <div
      ref="visualRef"
      class="hero-visual relative mt-12 w-full max-w-4xl sm:mt-16"
      :class="{ 'is-visible': visualVisible }"
    >
      <div class="hero-glow" aria-hidden="true" />

      <figure
        class="hero-screenshot relative overflow-hidden rounded-2xl border border-black/10 bg-[var(--cheer-ink)] shadow-lg shadow-black/10"
      >
        <div
          class="aspect-video w-full bg-[var(--cheer-ink)]"
          style="
            background:
              radial-gradient(circle at 20% 20%, rgba(200, 240, 221, 0.08), transparent 40%),
              radial-gradient(circle at 80% 70%, rgba(240, 162, 2, 0.06), transparent 35%),
              var(--cheer-ink);
          "
          aria-hidden="true"
        />
        <div
          class="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden="true"
        >
          <span
            class="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/90 text-[var(--cheer-ink)] shadow-lg shadow-black/20 backdrop-blur-sm sm:h-16 sm:w-16"
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
  </section>
</template>

<script setup lang="ts">
useHead({
  title: 'Cheer — Support African creators',
});

const visualRef = ref<HTMLElement | null>(null);
const visualVisible = ref(false);

let visualObserver: IntersectionObserver | null = null;

onMounted(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    visualVisible.value = true;
    return;
  }

  const el = visualRef.value;
  if (!el) {
    visualVisible.value = true;
    return;
  }

  visualObserver = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) {
        visualVisible.value = true;
        visualObserver?.disconnect();
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -4% 0px' },
  );

  visualObserver.observe(el);
});

onUnmounted(() => {
  visualObserver?.disconnect();
});
</script>
