<template>
  <section class="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
    <div class="space-y-6">
      <p class="text-sm font-medium uppercase tracking-[0.2em] text-[var(--cheer-leaf)]">
        Cheer
      </p>
      <h1 class="max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
        One link for everyone who wants to support your work.
      </h1>
      <p class="max-w-lg text-base leading-relaxed text-[var(--cheer-ink)]/70 sm:text-lg">
        Cheer helps African creators and builders receive personal support —
        without sending a bank account to every fan.
      </p>
      <div class="flex flex-wrap gap-3">
        <NuxtLink
          to="/status"
          class="inline-flex items-center justify-center rounded-md bg-[var(--cheer-leaf)] px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
        >
          Check API status
        </NuxtLink>
      </div>
    </div>

    <div
      class="relative min-h-[240px] overflow-hidden rounded-2xl bg-[var(--cheer-ink)] p-6 text-[var(--cheer-mint)] shadow-lg shadow-black/10 sm:min-h-[320px]"
      aria-hidden="true"
    >
      <div
        class="absolute inset-0 opacity-40"
        style="
          background:
            radial-gradient(circle at 20% 20%, rgba(200, 240, 221, 0.35), transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(240, 162, 2, 0.35), transparent 35%);
        "
      />
      <div class="relative space-y-3">
        <p class="text-sm uppercase tracking-widest text-white/60">cheer.cash/you</p>
        <p class="text-2xl font-semibold text-white">Your public support page</p>
        <p class="max-w-xs text-sm text-white/70">
          Foundation ready. Creator onboarding and tipping land in later phases.
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
useHead({
  title: 'Cheer — Support African creators',
});
</script>
