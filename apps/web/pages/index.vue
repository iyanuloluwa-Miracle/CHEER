<template>
  <section class="flex flex-col items-center text-center">
    <p class="text-sm font-medium uppercase tracking-[0.2em] text-[var(--cheer-leaf)]">
      Cheer
    </p>

    <h1
      class="mt-4 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-[var(--cheer-ink)] sm:text-5xl lg:text-6xl"
    >
      One link for everyone who wants to support your work.
    </h1>

    <p
      class="mt-5 max-w-2xl text-base leading-relaxed text-[var(--cheer-ink)]/70 sm:text-lg sm:leading-relaxed"
    >
      Cheer helps African creators and builders receive personal support —
      without sending a bank account to every fan.
    </p>

    <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
      <NuxtLink
        to="/signup"
        class="inline-flex items-center justify-center rounded-full bg-[var(--cheer-leaf)] px-6 py-2.5 text-sm font-semibold text-white transition duration-200 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cheer-leaf)] focus-visible:ring-offset-2"
      >
        Get started
      </NuxtLink>
      <NuxtLink
        to="/#how-it-works"
        class="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/60 px-6 py-2.5 text-sm font-semibold text-[var(--cheer-ink)] transition duration-200 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cheer-leaf)] focus-visible:ring-offset-2"
      >
        How it works
      </NuxtLink>
    </div>

    <!-- Product visual -->
    <div
      class="relative mt-12 w-full max-w-4xl overflow-hidden rounded-2xl border border-black/10 bg-[var(--cheer-ink)] shadow-lg shadow-black/10 sm:mt-16"
      aria-label="Preview of a Cheer creator tipping page"
    >
      <div
        class="absolute inset-0 opacity-40"
        style="
          background:
            radial-gradient(circle at 20% 20%, rgba(200, 240, 221, 0.35), transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(240, 162, 2, 0.35), transparent 35%);
        "
      />

      <div class="relative">
        <!-- Browser chrome -->
        <div
          class="flex items-center gap-2 border-b border-white/10 px-4 py-3 sm:px-5"
        >
          <span class="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span class="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span class="h-2.5 w-2.5 rounded-full bg-white/20" />
          <p class="mx-auto truncate text-xs font-medium tracking-wide text-white/50 sm:text-sm">
            cheer.cash/dina
          </p>
        </div>

        <!-- Page content -->
        <div class="space-y-6 px-5 py-8 text-left sm:px-8 sm:py-10">
          <div class="flex items-center gap-4">
            <div
              class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--cheer-leaf)] text-lg font-bold text-white sm:h-16 sm:w-16 sm:text-xl"
            >
              D
            </div>
            <div>
              <p class="text-xl font-semibold text-white sm:text-2xl">Dina Akinyemi</p>
              <p class="text-sm text-white/60">Builder &amp; creator</p>
            </div>
          </div>

          <div class="space-y-3">
            <p class="text-sm font-medium text-[var(--cheer-mint)]">Choose an amount</p>
            <div class="grid grid-cols-3 gap-2 sm:gap-3">
              <button
                type="button"
                tabindex="-1"
                class="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-semibold text-white transition sm:py-3.5 sm:text-base"
              >
                ₦500
              </button>
              <button
                type="button"
                tabindex="-1"
                class="rounded-xl border border-[var(--cheer-leaf)] bg-[var(--cheer-leaf)]/20 px-3 py-3 text-sm font-semibold text-white sm:py-3.5 sm:text-base"
              >
                ₦1,000
              </button>
              <button
                type="button"
                tabindex="-1"
                class="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-semibold text-white transition sm:py-3.5 sm:text-base"
              >
                ₦2,000
              </button>
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-[var(--cheer-mint)]">
              Add a message <span class="text-white/40">(optional)</span>
            </label>
            <div
              class="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/40"
            >
              Say something kind…
            </div>
          </div>

          <button
            type="button"
            tabindex="-1"
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--cheer-leaf)] px-5 py-3.5 text-sm font-semibold text-white sm:text-base"
          >
            Send tip
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
useHead({
  title: 'Cheer — Support African creators',
});
</script>
