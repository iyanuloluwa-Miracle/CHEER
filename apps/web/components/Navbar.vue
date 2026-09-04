<template>
  <header class="pointer-events-none fixed inset-x-0 top-0 z-50">
    <button
      v-if="menuOpen"
      type="button"
      class="pointer-events-auto absolute inset-0 h-dvh w-full cursor-default bg-cheer-ink/15 sm:hidden"
      aria-label="Close navigation menu"
      @click="closeMenu"
    />

    <div class="relative flex justify-center px-4 pt-4 sm:px-4 sm:pt-5">
      <div
        class="pointer-events-auto w-full border border-black/10 bg-white shadow-sm sm:w-fit sm:max-w-[calc(100vw-2rem)] sm:rounded-full"
        :class="menuOpen ? 'rounded-2xl' : 'rounded-full'"
      >
        <div
          class="flex items-center justify-between gap-4 px-4 py-2.5 sm:gap-6 sm:px-5 sm:py-3"
        >
          <NuxtLink
            to="/"
            aria-label="Cheer"
            class="inline-flex shrink-0 items-center gap-2 rounded-sm transition-opacity duration-200 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-white/80"
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
            <span class="text-base font-bold leading-none tracking-tight text-cheer-ink">
              Cheer
            </span>
          </NuxtLink>

          <nav
            class="hidden items-center gap-1 sm:flex"
            aria-label="Main navigation"
          >
            <NuxtLink
              v-for="link in sectionLinks"
              :key="link.to"
              :to="link.to"
              class="rounded-full px-3.5 py-1.5 text-sm font-medium text-cheer-ink/70 transition-colors duration-200 hover:text-cheer-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-white/80"
              :class="isLinkActive(link.to) ? 'text-cheer-leaf' : ''"
            >
              {{ link.label }}
            </NuxtLink>
          </nav>

          <div class="hidden items-center gap-2 sm:flex">
            <NuxtLink
              :to="loginLink.to"
              class="rounded-full px-3.5 py-1.5 text-sm font-medium text-cheer-ink/70 transition-colors duration-200 hover:text-cheer-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-white/80"
              :class="isLinkActive(loginLink.to) ? 'text-cheer-leaf' : ''"
            >
              {{ loginLink.label }}
            </NuxtLink>
            <UiButtonLink
              :to="signupLink.to"
              :label="signupLink.label"
              size="sm"
            />
          </div>

          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full text-cheer-ink transition-colors duration-200 hover:bg-black/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-white/80 sm:hidden"
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

        <nav
          v-show="menuOpen"
          id="mobile-nav-menu"
          class="border-t border-black/5 px-3 pb-4 pt-2 sm:hidden"
          aria-label="Main navigation"
        >
          <ul class="space-y-1">
            <li v-for="link in mobileNavLinks" :key="link.to">
              <NuxtLink
                :to="link.to"
                class="block rounded-xl px-3 py-3 text-base font-medium text-cheer-ink/70 transition-colors duration-200 hover:bg-black/[0.03] hover:text-cheer-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf"
                :class="isLinkActive(link.to) ? 'bg-black/[0.03] text-cheer-leaf' : ''"
                @click="closeMenu"
              >
                {{ link.label }}
              </NuxtLink>
            </li>
            <li class="px-1 pt-3">
              <UiButtonLink
                :to="signupLink.to"
                :label="signupLink.label"
                full-width
                @click="closeMenu"
              />
            </li>
          </ul>
        </nav>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
/**
 * Public marketing navbar. Authenticated dashboard navigation will be a separate component.
 */
import {
  loginLink,
  mobileNavLinks,
  sectionLinks,
  signupLink,
} from '~/data/navigation';

const route = useRoute();

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
  () => [route.path, route.hash],
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
