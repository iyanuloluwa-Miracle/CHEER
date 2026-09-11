<template>
  <div class="cheer-page-atmosphere relative flex min-h-dvh">
    <div
      class="pointer-events-none absolute inset-0 opacity-[0.22]"
      style="
        background-image: radial-gradient(rgba(147, 98, 255, 0.12) 1px, transparent 1px);
        background-size: 22px 22px;
      "
      aria-hidden="true"
    />

    <div class="relative z-10 hidden md:sticky md:top-0 md:flex md:h-dvh md:shrink-0">
      <DashboardSidebar :public-path="publicPath" />
    </div>

    <Teleport to="body">
      <div
        v-if="mobileOpen"
        class="fixed inset-0 z-50 md:hidden"
      >
        <button
          type="button"
          class="absolute inset-0 bg-cheer-ink/40 backdrop-blur-[3px]"
          aria-label="Close navigation"
          @click="mobileOpen = false"
        />
        <div class="absolute inset-y-0 left-0 shadow-2xl shadow-black/40">
          <DashboardSidebar
            :public-path="publicPath"
            @navigate="mobileOpen = false"
          />
        </div>
      </div>
    </Teleport>

    <div class="relative z-0 flex min-w-0 flex-1 flex-col">
      <header
        class="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-cheer-leaf/10 bg-white/90 px-4 backdrop-blur-md md:hidden"
      >
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-full text-cheer-ink transition hover:bg-cheer-mint/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf"
          aria-label="Open navigation"
          @click="mobileOpen = true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            class="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <div class="inline-flex items-center gap-2">
          <img
            src="/cheers-logo-nav.png"
            alt=""
            aria-hidden="true"
            class="h-5 w-auto shrink-0 object-contain"
            width="14"
            height="20"
            decoding="async"
          >
          <span class="text-sm font-bold leading-none tracking-tight text-cheer-ink">
            TippyMe
          </span>
        </div>
      </header>

      <main class="relative min-h-0 w-full flex-1 overflow-y-auto">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const publicPath = useState<string | null>('dashboardPublicPath', () => null);
const mobileOpen = ref(false);
const route = useRoute();

watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false;
  },
);

onUnmounted(() => {
  publicPath.value = null;
});
</script>
