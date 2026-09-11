<template>
  <div class="mx-auto w-full max-w-xl px-4 py-10 sm:py-14">
    <header class="mb-8">
      <p class="text-sm font-semibold uppercase tracking-wide text-cheer-leaf">
        Creator setup
      </p>
      <h1 class="mt-2 text-3xl font-bold tracking-tight text-cheer-ink">
        {{ stepTitle }}
      </h1>
      <p class="mt-2 text-sm text-cheer-ink/65">
        {{ stepDescription }}
      </p>

      <ol class="mt-6 flex gap-2" aria-label="Onboarding progress">
        <li
          v-for="(label, index) in stepLabels"
          :key="label"
          class="h-1.5 flex-1 rounded-full transition-colors"
          :class="index <= stepIndex ? 'bg-cheer-leaf' : 'bg-black/10'"
          :aria-current="index === stepIndex ? 'step' : undefined"
          :title="label"
        />
      </ol>
      <p class="mt-2 text-xs text-cheer-ink/45">
        Step {{ stepIndex + 1 }} of {{ stepLabels.length }} — {{ stepLabels[stepIndex] }}
      </p>
    </header>

    <!-- Step: Username -->
    <section
      v-if="step === 'username'"
      class="rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8"
    >
      <label for="ob-username" class="block text-sm text-cheer-ink">Username</label>
      <div class="mt-1.5 flex items-center gap-2 rounded-xl border border-black/10 bg-[#f7f4ff] px-3.5 focus-within:border-cheer-leaf/40 focus-within:ring-2 focus-within:ring-cheer-leaf/30">
        <span class="shrink-0 text-sm text-cheer-ink/45">/</span>
        <input
          id="ob-username"
          v-model="username"
          type="text"
          autocomplete="username"
          maxlength="30"
          class="w-full bg-transparent py-2.5 text-base text-cheer-ink outline-none"
          placeholder="yourname"
          :disabled="pending"
          @input="onUsernameInput"
        >
      </div>
      <p
        v-if="claimPathPreview"
        class="mt-2 text-sm font-medium text-cheer-ink/70"
      >
        Your page will be
        <span class="font-semibold text-cheer-ink">{{ claimPathPreview }}</span>
      </p>
      <p class="mt-2 text-xs text-cheer-ink/50">
        Lowercase letters, numbers, underscores. 3–30 characters.
      </p>
      <p
        v-if="usernameStatus"
        class="mt-2 text-sm"
        :class="usernameAvailable ? 'text-cheer-leaf' : 'text-red-700'"
        role="status"
      >
        {{ usernameStatus }}
      </p>
      <p v-if="error" class="mt-3 text-sm text-red-700" role="alert">
        {{ error }}
      </p>
      <button
        type="button"
        class="mt-6 inline-flex w-full items-center justify-center rounded-full bg-cheer-leaf px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        :disabled="pending || !usernameAvailable"
        @click="goProfile"
      >
        Continue
      </button>
    </section>

    <!-- Step: Profile -->
    <section
      v-else-if="step === 'profile'"
      class="rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8"
    >
      <div class="space-y-4">
        <div>
          <label for="ob-display" class="block text-sm text-cheer-ink">Display name</label>
          <input
            id="ob-display"
            v-model="displayName"
            type="text"
            maxlength="80"
            required
            class="mt-1.5 w-full rounded-xl border border-black/10 bg-[#f7f4ff] px-3.5 py-2.5 text-base outline-none focus:border-cheer-leaf/40 focus:ring-2 focus:ring-cheer-leaf/30"
            placeholder="How supporters see you"
            :disabled="pending"
          >
        </div>
        <div>
          <div class="flex items-center justify-between gap-2">
            <label for="ob-bio" class="block text-sm text-cheer-ink">Bio</label>
            <button
              type="button"
              class="text-xs font-semibold text-cheer-leaf hover:underline disabled:opacity-50"
              :disabled="pending || aiBusy"
              @click="polishBio"
            >
              {{ aiBusy ? 'Polishing…' : 'Polish with AI' }}
            </button>
          </div>
          <textarea
            id="ob-bio"
            v-model="bio"
            rows="3"
            maxlength="500"
            class="mt-1.5 w-full rounded-xl border border-black/10 bg-[#f7f4ff] px-3.5 py-2.5 text-base outline-none focus:border-cheer-leaf/40 focus:ring-2 focus:ring-cheer-leaf/30"
            placeholder="A short line about your work"
            :disabled="pending"
          />
          <p
            v-if="aiHint"
            class="mt-1 text-xs text-cheer-ink/50"
          >
            {{ aiHint }}
          </p>
        </div>
        <div>
          <p class="block text-sm text-cheer-ink">Profile photo</p>
          <div class="mt-2">
            <CreatorAvatarUploader
              v-model="avatarUrl"
              :seed="username || displayName || 'creator'"
              :alt="displayName || 'Profile photo'"
              size="lg"
              :disabled="pending"
            />
          </div>
        </div>
      </div>
      <p v-if="error" class="mt-3 text-sm text-red-700" role="alert">
        {{ error }}
      </p>
      <div class="mt-6 flex gap-3">
        <button
          type="button"
          class="flex-1 rounded-full border border-black/10 px-4 py-2.5 text-sm font-semibold"
          :disabled="pending"
          @click="step = 'username'"
        >
          Back
        </button>
        <button
          type="button"
          class="flex-1 rounded-full bg-cheer-leaf px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          :disabled="pending || !displayName.trim()"
          @click="goSocial"
        >
          Continue
        </button>
      </div>
    </section>

    <!-- Step: Social -->
    <section
      v-else-if="step === 'social'"
      class="rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8"
    >
      <p class="text-sm text-cheer-ink/65">
        Optional — add up to a few links supporters can follow.
      </p>
      <div class="mt-4 space-y-3">
        <div
          v-for="(link, index) in socialLinks"
          :key="index"
          class="flex flex-col gap-2 sm:flex-row"
        >
          <select
            v-model="link.platform"
            class="rounded-xl border border-black/10 bg-[#f7f4ff] px-3 py-2.5 text-sm"
            :disabled="pending"
          >
            <option
              v-for="p in platforms"
              :key="p"
              :value="p"
            >
              {{ p }}
            </option>
          </select>
          <input
            v-model="link.url"
            type="url"
            placeholder="https://"
            class="min-w-0 flex-1 rounded-xl border border-black/10 bg-[#f7f4ff] px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cheer-leaf/30"
            :disabled="pending"
          >
          <button
            type="button"
            class="text-sm text-red-700"
            :disabled="pending"
            @click="removeSocial(index)"
          >
            Remove
          </button>
        </div>
      </div>
      <button
        type="button"
        class="mt-3 text-sm font-semibold text-cheer-leaf"
        :disabled="pending || socialLinks.length >= 5"
        @click="addSocial"
      >
        + Add link
      </button>
      <p v-if="error" class="mt-3 text-sm text-red-700" role="alert">
        {{ error }}
      </p>
      <div class="mt-6 flex gap-3">
        <button
          type="button"
          class="flex-1 rounded-full border border-black/10 px-4 py-2.5 text-sm font-semibold"
          :disabled="pending"
          @click="step = 'profile'"
        >
          Back
        </button>
        <button
          type="button"
          class="flex-1 rounded-full bg-cheer-leaf px-4 py-2.5 text-sm font-semibold text-white"
          :disabled="pending"
          @click="goSupport"
        >
          Continue
        </button>
      </div>
    </section>

    <!-- Step: Support settings -->
    <section
      v-else-if="step === 'support'"
      class="rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8"
    >
      <div class="space-y-4">
        <div>
          <label for="ob-currency" class="block text-sm text-cheer-ink">Preferred currency</label>
          <select
            id="ob-currency"
            v-model="currency"
            class="mt-1.5 w-full rounded-xl border border-black/10 bg-[#f7f4ff] px-3.5 py-2.5 text-base"
            :disabled="pending"
          >
            <option
              v-for="c in currencies"
              :key="c"
              :value="c"
            >
              {{ c }}
            </option>
          </select>
        </div>
        <div>
          <label for="ob-support" class="block text-sm text-cheer-ink">Support message</label>
          <textarea
            id="ob-support"
            v-model="supportMessage"
            rows="3"
            maxlength="500"
            class="mt-1.5 w-full rounded-xl border border-black/10 bg-[#f7f4ff] px-3.5 py-2.5 text-base outline-none focus:ring-2 focus:ring-cheer-leaf/30"
            placeholder="Thanks for supporting my work…"
            :disabled="pending"
          />
        </div>
        <div>
          <label class="block text-sm text-cheer-ink">Suggested tip amounts</label>
          <div class="mt-2 flex flex-wrap gap-2">
            <input
              v-for="(_, i) in tipAmounts"
              :key="i"
              v-model="tipAmounts[i]"
              type="text"
              inputmode="decimal"
              class="w-28 rounded-xl border border-black/10 bg-[#f7f4ff] px-3 py-2 text-sm"
              :disabled="pending"
            >
          </div>
          <p class="mt-1 text-xs text-cheer-ink/50">
            Decimal amounts (e.g. 1000.00). Payments wire up later.
          </p>
        </div>
      </div>
      <p v-if="error" class="mt-3 text-sm text-red-700" role="alert">
        {{ error }}
      </p>
      <div class="mt-6 flex gap-3">
        <button
          type="button"
          class="flex-1 rounded-full border border-black/10 px-4 py-2.5 text-sm font-semibold"
          :disabled="pending"
          @click="step = 'social'"
        >
          Back
        </button>
        <button
          type="button"
          class="flex-1 rounded-full bg-cheer-leaf px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          :disabled="pending"
          @click="submitOnboarding"
        >
          {{ pending ? 'Creating…' : 'Create Tippy page' }}
        </button>
      </div>
    </section>

    <!-- Step: Done -->
    <section v-else class="space-y-6">
      <div class="rounded-2xl border border-cheer-leaf/20 bg-cheer-mint/20 p-6 text-center">
        <p class="text-sm font-semibold text-cheer-leaf">
          You’re live
        </p>
        <h2 class="mt-2 text-2xl font-bold text-cheer-ink">
          Your Tippy page is ready
        </h2>
        <p class="mt-2 text-sm text-cheer-ink/65">
          Share
          <span class="font-semibold text-cheer-ink">{{ publicUrlLabel }}</span>
          with supporters.
        </p>
      </div>

      <CreatorPagePreview
        v-if="createdProfile"
        :profile="createdProfile"
        :app-origin="appOrigin"
      />

      <div class="flex flex-col gap-3 sm:flex-row">
        <NuxtLink
          v-if="createdProfile"
          :to="createdProfile.publicPath"
          class="inline-flex flex-1 items-center justify-center rounded-full bg-cheer-leaf px-6 py-2.5 text-sm font-semibold text-white"
        >
          Open Tippy page
        </NuxtLink>
        <NuxtLink
          to="/dashboard"
          class="inline-flex flex-1 items-center justify-center rounded-full border border-black/10 px-6 py-2.5 text-sm font-semibold text-cheer-ink"
        >
          Go to dashboard
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { CreatorProfile, SocialPlatform } from '~/types/api';
import { ApiClientError } from '~/services/api';
import { normalizeClaimUsername } from '~/utils/username-claim';

definePageMeta({
  middleware: 'auth',
});

useHead({
  title: 'Set up your Tippy page — TippyMe',
});

const route = useRoute();
const api = useApi();
const auth = useAuthStore();
const config = useRuntimeConfig();

const stepLabels = ['Username', 'Profile', 'Social', 'Support', 'Done'] as const;
type Step = 'username' | 'profile' | 'social' | 'support' | 'done';

const step = ref<Step>('username');
const pending = ref(false);
const error = ref<string | null>(null);

const username = ref('');
const usernameAvailable = ref(false);
const usernameStatus = ref<string | null>(null);
let usernameTimer: ReturnType<typeof setTimeout> | null = null;

const displayName = ref('');
const bio = ref('');
const avatarUrl = ref<string | null>(null);
const supportMessage = ref('Thanks for supporting my work — every tip helps.');
const currency = ref('NGN');
const tipAmounts = ref(['1000.00', '2500.00', '5000.00']);
const socialLinks = ref<{ platform: SocialPlatform; url: string }[]>([]);
const createdProfile = ref<CreatorProfile | null>(null);
const aiBusy = ref(false);
const aiHint = ref<string | null>(null);

const platforms: SocialPlatform[] = [
  'X',
  'INSTAGRAM',
  'LINKEDIN',
  'GITHUB',
  'YOUTUBE',
  'TIKTOK',
  'WEBSITE',
  'OTHER',
];
const currencies = ['NGN', 'USD', 'GHS', 'KES', 'ZAR'];

const appOrigin = computed(() => (config.public.appUrl as string) || '');

const stepIndex = computed(() => {
  const map: Record<Step, number> = {
    username: 0,
    profile: 1,
    social: 2,
    support: 3,
    done: 4,
  };
  return map[step.value];
});

const stepTitle = computed(() => {
  switch (step.value) {
    case 'username':
      return 'Claim your link';
    case 'profile':
      return 'Introduce yourself';
    case 'social':
      return 'Add social links';
    case 'support':
      return 'Support settings';
    case 'done':
      return 'All set';
    default:
      return 'Set up';
  }
});

const stepDescription = computed(() => {
  switch (step.value) {
    case 'username':
      return 'This becomes your public Tippy page path.';
    case 'profile':
      return 'Keep it short — supporters should get you in a glance.';
    case 'social':
      return 'Skip if you want. You can edit later.';
    case 'support':
      return 'Currency and suggested amounts for your page.';
    case 'done':
      return 'Preview below — payments come in a later phase.';
    default:
      return '';
  }
});

const publicUrlLabel = computed(() => {
  if (!createdProfile.value) return '';
  const path = createdProfile.value.publicPath;
  try {
    return `${new URL(appOrigin.value).host}${path}`;
  } catch {
    return path;
  }
});

const claimPathPreview = computed(() => {
  if (username.value.length < 3) return '';
  const path = `/${username.value}`;
  try {
    if (appOrigin.value) {
      return `${new URL(appOrigin.value).host}${path}`;
    }
  } catch {
    // fall through
  }
  return `tippy.me${path}`;
});

onMounted(async () => {
  if (auth.user?.hasCreatorProfile) {
    await navigateTo('/dashboard');
    return;
  }
  try {
    const { profile } = await api.getMyCreator();
    if (profile) {
      auth.setUser({
        ...(auth.user as NonNullable<typeof auth.user>),
        hasCreatorProfile: true,
      });
      await navigateTo('/dashboard');
      return;
    }
  } catch {
    // stay on onboarding
  }

  const raw = route.query.username;
  if (typeof raw === 'string') {
    const normalized = normalizeClaimUsername(raw);
    if (normalized.length >= 3) {
      username.value = normalized;
      await checkUsername();
    }
  }
});

function onUsernameInput() {
  username.value = username.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
  usernameAvailable.value = false;
  usernameStatus.value = null;
  error.value = null;
  if (usernameTimer) clearTimeout(usernameTimer);
  usernameTimer = setTimeout(() => {
    void checkUsername();
  }, 350);
}

async function checkUsername() {
  if (username.value.length < 3) {
    usernameStatus.value = 'At least 3 characters.';
    usernameAvailable.value = false;
    return;
  }
  try {
    const result = await api.checkUsername(username.value);
    if (result.available) {
      usernameAvailable.value = true;
      usernameStatus.value = 'Available';
    } else {
      usernameAvailable.value = false;
      usernameStatus.value =
        result.reason === 'RESERVED'
          ? 'Reserved — pick another'
          : result.reason === 'TAKEN'
            ? 'Already taken'
            : 'Invalid username';
    }
  } catch {
    usernameAvailable.value = false;
    usernameStatus.value = 'Could not check availability';
  }
}

function goProfile() {
  error.value = null;
  if (!displayName.value) {
    displayName.value = username.value;
  }
  step.value = 'profile';
}

function goSocial() {
  error.value = null;
  if (!displayName.value.trim()) {
    error.value = 'Display name is required.';
    return;
  }
  step.value = 'social';
}

function addSocial() {
  socialLinks.value.push({ platform: 'WEBSITE', url: '' });
}

function removeSocial(index: number) {
  socialLinks.value.splice(index, 1);
}

function goSupport() {
  error.value = null;
  for (const link of socialLinks.value) {
    if (link.url && !/^https?:\/\//i.test(link.url)) {
      error.value = 'Social links must start with http:// or https://';
      return;
    }
  }
  step.value = 'support';
}

async function polishBio() {
  aiBusy.value = true;
  aiHint.value = null;
  try {
    const result = await api.polishBio({
      displayName: displayName.value.trim() || username.value,
      draft: bio.value,
    });
    bio.value = result.bio;
    if (result.supportCta) {
      supportMessage.value = result.supportCta;
    }
    aiHint.value =
      result.source === 'cencori'
        ? 'Polished with Cencori AI.'
        : 'Local AI assist used (add CENCORI_API_KEY for live Cencori).';
  } catch (err) {
    aiHint.value = mapError(err);
  } finally {
    aiBusy.value = false;
  }
}

function mapError(err: unknown): string {
  if (err instanceof ApiClientError) {
    if (err.errorCode === 'USERNAME_TAKEN' || err.errorCode === 'RESERVED') {
      return err.message;
    }
    if (err.statusCode >= 500) {
      return 'Something went wrong. Please try again.';
    }
    return err.message || 'Unable to continue.';
  }
  return 'Something went wrong. Please try again.';
}

async function submitOnboarding() {
  pending.value = true;
  error.value = null;
  try {
    const links = socialLinks.value
      .filter((l) => l.url.trim())
      .map((l, i) => ({
        platform: l.platform,
        url: l.url.trim(),
        sortOrder: i,
      }));

    const { profile } = await api.createCreator({
      username: username.value,
      displayName: displayName.value.trim(),
      bio: bio.value.trim() || undefined,
      avatarUrl: avatarUrl.value?.trim() || undefined,
      supportMessage: supportMessage.value.trim() || undefined,
      currency: currency.value,
      suggestedTipAmounts: tipAmounts.value.filter(Boolean),
      socialLinks: links,
    });

    createdProfile.value = profile;
    if (auth.user) {
      auth.setUser({ ...auth.user, hasCreatorProfile: true });
    }
    await navigateTo(profile.publicPath);
  } catch (err) {
    error.value = mapError(err);
  } finally {
    pending.value = false;
  }
}
</script>
