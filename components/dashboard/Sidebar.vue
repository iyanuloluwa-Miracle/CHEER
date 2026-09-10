<template>
  <aside
    class="relative flex h-full w-[17.5rem] shrink-0 flex-col overflow-hidden text-white"
    style="
      background:
        radial-gradient(ellipse 90% 60% at 0% 0%, rgba(200, 240, 221, 0.16), transparent 55%),
        radial-gradient(ellipse 70% 50% at 100% 100%, rgba(31, 107, 74, 0.45), transparent 55%),
        linear-gradient(165deg, #132920 0%, #0f1c17 48%, #0c1713 100%);
    "
    aria-label="Dashboard sidebar"
  >
    <div
      class="pointer-events-none absolute inset-0 opacity-[0.18]"
      style="
        background-image: radial-gradient(rgba(200, 240, 221, 0.35) 1px, transparent 1px);
        background-size: 18px 18px;
      "
      aria-hidden="true"
    />

    <div class="relative flex h-[4.5rem] items-center px-5">
      <NuxtLink
        to="/"
        aria-label="TippyMe home"
        class="inline-flex items-center gap-2.5 rounded-sm transition-opacity duration-200 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-mint focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1c17]"
      >
        <span
          class="flex h-9 w-9 items-center justify-center rounded-xl bg-cheer-mint/15 ring-1 ring-cheer-mint/25"
        >
          <img
            src="/cheers-logo-nav.png"
            alt=""
            aria-hidden="true"
            class="h-5 w-auto brightness-0 invert"
            width="17"
            height="24"
            decoding="async"
          />
        </span>
        <span class="text-lg font-bold leading-none tracking-tight">
          TippyMe
        </span>
      </NuxtLink>
    </div>

    <nav class="relative flex flex-1 flex-col gap-1.5 px-3 pt-2" aria-label="Dashboard">
      <p class="px-3 pb-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/35">
        Workspace
      </p>

      <NuxtLink
        v-for="link in primaryLinks"
        :key="link.to"
        :to="link.to"
        class="group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-mint focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1c17]"
        :class="
          isActive(link.to)
            ? 'bg-cheer-mint text-cheer-ink shadow-[0_8px_24px_-10px_rgba(200,240,221,0.7)]'
            : 'text-white/65 hover:bg-white/[0.06] hover:text-white'
        "
        @click="emit('navigate')"
      >
        <span
          class="flex h-8 w-8 items-center justify-center rounded-xl transition-colors"
          :class="
            isActive(link.to)
              ? 'bg-cheer-ink/10 text-cheer-ink'
              : 'bg-white/[0.06] text-white/50 group-hover:text-cheer-mint'
          "
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-4 w-4"
          >
            <path
              v-if="link.to === '/dashboard'"
              d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-5H10v5H5a1 1 0 0 1-1-1v-9.5Z"
            />
            <template v-else>
              <circle
                cx="12"
                cy="8"
                r="3.25"
              />
              <path d="M5.5 19.5c1.6-3.2 4-4.75 6.5-4.75s4.9 1.55 6.5 4.75" />
            </template>
          </svg>
        </span>
        {{ link.label }}
      </NuxtLink>

      <NuxtLink
        v-if="publicPath"
        :to="publicPath"
        class="group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-white/65 transition-all duration-200 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-mint focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1c17]"
        @click="emit('navigate')"
      >
        <span
          class="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.06] text-white/50 transition-colors group-hover:text-cheer-mint"
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-4 w-4"
          >
            <path d="M10 6H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3" />
            <path d="M14 4h6v6" />
            <path d="M10 14 20 4" />
          </svg>
        </span>
        Public page
      </NuxtLink>
    </nav>

    <div class="relative mt-auto border-t border-white/10 px-4 py-5">
      <div
        v-if="auth.user?.email"
        class="flex items-center gap-3"
      >
        <img
          :src="avatarSrc"
          alt=""
          aria-hidden="true"
          class="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-white/10"
          width="40"
          height="40"
          decoding="async"
        >
        <div class="min-w-0">
          <p class="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white/35">
            Signed in
          </p>
          <p
            class="truncate text-sm font-medium text-white/75"
            :title="auth.user.email"
          >
            {{ auth.user.email }}
          </p>
        </div>
      </div>
      <button
        type="button"
        class="motion-cta mt-4 w-full rounded-full border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white transition hover:border-cheer-mint/40 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-mint focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1c17] disabled:opacity-60"
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
import { resolveAvatarUrl } from '~/utils/avatar';

const props = defineProps<{
  publicPath?: string | null;
}>();

const emit = defineEmits<{
  navigate: [];
}>();

const route = useRoute();
const auth = useAuthStore();
const loggingOut = ref(false);
const avatarUrlState = useState<string | null>('dashboardAvatarUrl', () => null);

const primaryLinks = dashboardNavLinks;

const avatarSrc = computed(() => {
  const username = props.publicPath?.replace(/^\//, '').trim();
  const seed = username || auth.user?.email?.split('@')[0] || 'user';
  return resolveAvatarUrl(avatarUrlState.value, seed);
});

function isActive(path: string) {
  // Exact match for /dashboard so nested routes (e.g. /dashboard/profile)
  // do not keep Overview highlighted.
  if (path === '/dashboard') {
    return route.path === '/dashboard';
  }
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
