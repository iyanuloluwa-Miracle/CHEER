<template>
  <header class="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 sm:pt-5">
    <div
      class="pointer-events-auto w-fit max-w-[calc(100vw-2rem)] rounded-full border border-black/10 bg-white/80 shadow-sm shadow-black/[0.04] backdrop-blur-md transition-[border-radius,box-shadow] duration-200"
      :class="menuOpen ? 'rounded-3xl sm:rounded-full' : ''"
    >
      <div class="flex items-center justify-between gap-4 px-4 py-2.5 sm:gap-6 sm:px-5 sm:py-3">
        <NuxtLink
          to="/"
          aria-label="Cheer"
          class="shrink-0 inline-flex items-center gap-2 transition-opacity duration-200 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cheer-leaf)] focus-visible:ring-offset-2 focus-visible:ring-offset-white/80 rounded-sm"
          @click="closeMenu"
        >
          <img
            src="/cheers-logo-nav.png"
            alt=""
            aria-hidden="true"
            class="h-5 w-auto shrink-0 object-contain"
            width="17"
            height="24"
            decoding="async"
          />
          <span class="text-base font-bold leading-none tracking-tight text-[var(--cheer-ink)]">
            Cheer
          </span>
        </NuxtLink>

        <!-- Desktop navigation -->
        <nav
          class="hidden items-center gap-1 sm:flex"
          aria-label="Main navigation"
        >
          <NuxtLink
            v-for="link in sectionLinks"
            :key="link.to"
            :to="link.to"
            class="rounded-full px-3.5 py-1.5 text-sm font-medium text-[var(--cheer-ink)]/70 transition-colors duration-200 hover:text-[var(--cheer-leaf)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cheer-leaf)] focus-visible:ring-offset-2 focus-visible:ring-offset-white/80"
            :class="isLinkActive(link.to) ? 'text-[var(--cheer-leaf)]' : ''"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>

        <div class="hidden items-center gap-2 sm:flex">
          <NuxtLink
            :to="loginLink.to"
            class="rounded-full px-3.5 py-1.5 text-sm font-medium text-[var(--cheer-ink)]/70 transition-colors duration-200 hover:text-[var(--cheer-leaf)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cheer-leaf)] focus-visible:ring-offset-2 focus-visible:ring-offset-white/80"
            :class="isLinkActive(loginLink.to) ? 'text-[var(--cheer-leaf)]' : ''"
          >
            {{ loginLink.label }}
          </NuxtLink>
          <NuxtLink
            :to="signupLink.to"
            class="inline-flex items-center justify-center rounded-full bg-[var(--cheer-leaf)] px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cheer-leaf)] focus-visible:ring-offset-2 focus-visible:ring-offset-white/80"
          >
            {{ signupLink.label }}
          </NuxtLink>
        </div>

        <!-- Mobile menu toggle -->
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--cheer-ink)] transition-colors duration-200 hover:bg-black/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cheer-leaf)] focus-visible:ring-offset-2 focus-visible:ring-offset-white/80 sm:hidden"
          :aria-expanded="menuOpen"
          aria-controls="mobile-nav-menu"
          aria-label="Toggle navigation menu"
          @click="toggleMenu"
        >
          <svg
            v-if="!menuOpen"
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
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            class="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <!-- Mobile menu -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-1"
      >
        <nav
          v-if="menuOpen"
          id="mobile-nav-menu"
          class="border-t border-black/5 px-4 pb-4 pt-2 sm:hidden"
          aria-label="Main navigation"
        >
          <ul class="space-y-1">
            <li v-for="link in mobileLinks" :key="link.to">
              <NuxtLink
                :to="link.to"
                class="block rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--cheer-ink)]/70 transition-colors duration-200 hover:bg-black/[0.03] hover:text-[var(--cheer-leaf)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cheer-leaf)]"
                :class="isLinkActive(link.to) ? 'bg-black/[0.03] text-[var(--cheer-leaf)]' : ''"
                @click="closeMenu"
              >
                {{ link.label }}
              </NuxtLink>
            </li>
            <li class="pt-2">
              <NuxtLink
                :to="signupLink.to"
                class="flex w-full items-center justify-center rounded-full bg-[var(--cheer-leaf)] px-4 py-2.5 text-sm font-semibold text-white transition duration-200 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cheer-leaf)] focus-visible:ring-offset-2"
                @click="closeMenu"
              >
                {{ signupLink.label }}
              </NuxtLink>
            </li>
          </ul>
        </nav>
      </Transition>
    </div>
  </header>
</template>

<script setup lang="ts">
/**
 * Public marketing navbar. Authenticated dashboard navigation will be a separate component.
 */
const route = useRoute();

const sectionLinks = [
  { label: 'How it works', to: '/#how-it-works' },
  { label: 'For Creators', to: '/#for-creators' },
] as const;

const loginLink = { label: 'Log in', to: '/login' } as const;
const signupLink = { label: 'Get started', to: '/signup' } as const;

const mobileLinks = [...sectionLinks, loginLink];

const menuOpen = ref(false);

function isLinkActive(path: string) {
  if (path.includes('#')) {
    const hash = `#${path.split('#')[1]}`;
    return route.path === '/' && route.hash === hash;
  }
  return route.path === path;
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}

function closeMenu() {
  menuOpen.value = false;
}

function onEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeMenu();
  }
}

watch(
  () => route.path,
  () => {
    closeMenu();
  },
);

onMounted(() => {
  document.addEventListener('keydown', onEscape);
});

onUnmounted(() => {
  document.removeEventListener('keydown', onEscape);
});
</script>
