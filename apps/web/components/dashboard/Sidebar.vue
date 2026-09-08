<template>
  <aside
    class="flex h-full w-[16.5rem] shrink-0 flex-col border-r border-black/10 bg-white/70 backdrop-blur-md"
    aria-label="Dashboard sidebar"
  >
    <div class="flex h-16 items-center px-5">
      <NuxtLink
        to="/"
        aria-label="TippyMe home"
        class="inline-flex items-center gap-2 rounded-sm transition-opacity duration-200 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf focus-visible:ring-offset-2"
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
          TippyMe
        </span>
      </NuxtLink>
    </div>

    <nav class="flex flex-1 flex-col gap-1 px-3 pt-2" aria-label="Dashboard">
      <p class="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-cheer-ink/40">
        Workspace
      </p>
      <NuxtLink
        v-for="link in primaryLinks"
        :key="link.to"
        :to="link.to"
        class="rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf focus-visible:ring-offset-2"
        :class="
          isActive(link.to)
            ? 'bg-cheer-mint/50 text-cheer-leaf'
            : 'text-cheer-ink/70 hover:bg-black/[0.03] hover:text-cheer-leaf'
        "
        @click="emit('navigate')"
      >
        {{ link.label }}
      </NuxtLink>

      <NuxtLink
        v-if="publicPath"
        :to="publicPath"
        class="rounded-xl px-3 py-2.5 text-sm font-medium text-cheer-ink/70 transition-colors duration-200 hover:bg-black/[0.03] hover:text-cheer-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf focus-visible:ring-offset-2"
        @click="emit('navigate')"
      >
        Public page
      </NuxtLink>
    </nav>

    <div class="mt-auto border-t border-black/10 px-4 py-4">
      <p
        v-if="auth.user?.email"
        class="truncate text-sm text-cheer-ink/55"
        :title="auth.user.email"
      >
        {{ auth.user.email }}
      </p>
      <button
        type="button"
        class="mt-3 w-full rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-cheer-ink transition hover:border-cheer-leaf/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf focus-visible:ring-offset-2 disabled:opacity-60"
        :disabled="loggingOut"
        @click="onLogout"
      >
        {{ loggingOut ? 'Signing out…' : 'Sign out' }}
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { dashboardNavLinks } from '~/data/navigation';

defineProps<{
  publicPath?: string | null;
}>();

const emit = defineEmits<{
  navigate: [];
}>();

const route = useRoute();
const auth = useAuthStore();
const loggingOut = ref(false);

const primaryLinks = dashboardNavLinks;

function isActive(path: string) {
  return route.path === path || route.path.startsWith(`${path}/`);
}

async function onLogout() {
  loggingOut.value = true;
  try {
    await auth.logout();
    await navigateTo('/login');
  } finally {
    loggingOut.value = false;
  }
}
</script>
