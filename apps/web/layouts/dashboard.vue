<template>
  <div
    class="relative flex min-h-dvh"
    style="
      background-color: #f7f4ee;
      background-image:
        radial-gradient(ellipse 90% 55% at 15% -10%, rgba(200, 240, 221, 0.45), transparent 55%),
        radial-gradient(ellipse 70% 45% at 95% 0%, rgba(31, 107, 74, 0.07), transparent 50%),
        linear-gradient(180deg, #faf8f4 0%, #f3efe6 100%);
    "
  >
    <!-- Desktop sidebar -->
    <div class="hidden md:sticky md:top-0 md:flex md:h-dvh md:shrink-0">
      <DashboardSidebar :public-path="publicPath" />
    </div>

    <!-- Mobile drawer -->
    <Teleport to="body">
      <div
        v-if="mobileOpen"
        class="fixed inset-0 z-50 md:hidden"
      >
        <button
          type="button"
          class="absolute inset-0 bg-cheer-ink/25"
          aria-label="Close navigation"
          @click="mobileOpen = false"
        />
        <div class="absolute inset-y-0 left-0 shadow-xl">
          <DashboardSidebar
            :public-path="publicPath"
            @navigate="mobileOpen = false"
          />
        </div>
      </div>
    </Teleport>

    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-black/10 bg-[#f7f4ee]/90 px-4 backdrop-blur-md md:hidden"
      >
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-full text-cheer-ink transition hover:bg-black/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf"
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
        <span class="text-sm font-bold tracking-tight text-cheer-ink">
          Dashboard
        </span>
      </header>

      <main class="relative z-0 min-h-0 w-full flex-1 overflow-y-auto">
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
