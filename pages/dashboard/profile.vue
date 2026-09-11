<template>
  <div class="w-full px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
    <header class="mb-6 sm:mb-8">
      <p class="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-cheer-leaf">
        Workspace
      </p>
      <h1 class="mt-2 text-3xl font-bold tracking-tight text-cheer-ink sm:text-4xl">
        Edit profile
      </h1>
      <p class="mt-2 max-w-xl text-sm text-cheer-ink/65">
        Update how you appear on your Tippy page, your social links, and support settings.
      </p>
    </header>

    <p
      v-if="loadError"
      class="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
      role="alert"
    >
      {{ loadError }}
    </p>

    <div
      v-if="loading"
      class="space-y-4"
    >
      <div class="dash-shimmer h-48 rounded-[1.75rem] opacity-30" />
      <div class="dash-shimmer h-40 rounded-[1.75rem] opacity-25" />
      <div class="dash-shimmer h-40 rounded-[1.75rem] opacity-20" />
    </div>

    <div
      v-else-if="profile"
      class="mx-auto max-w-2xl space-y-5"
    >
      <!-- Identity -->
      <section
        class="rounded-[1.75rem] border border-black/6 bg-white/85 p-5 shadow-[0_1px_0_rgba(26, 18, 40,0.04)] backdrop-blur-md sm:p-7"
        aria-labelledby="identity-heading"
      >
        <h2
          id="identity-heading"
          class="text-lg font-bold tracking-tight text-cheer-ink"
        >
          Identity
        </h2>
        <p class="mt-1 text-sm text-cheer-ink/55">
          Name, bio, username, and photo on your public page.
        </p>

        <div class="mt-5 space-y-4">
          <div>
            <p class="block text-sm text-cheer-ink">
              Profile photo
            </p>
            <div class="mt-2">
              <CreatorAvatarUploader
                v-model="avatarUrl"
                :seed="username || displayName || 'creator'"
                :alt="displayName || 'Profile photo'"
                size="lg"
                persist
                hint="Click to change your photo"
                :disabled="identityPending"
                @uploaded="onAvatarUploaded"
              />
            </div>
          </div>

          <div>
            <label
              for="edit-display"
              class="block text-sm text-cheer-ink"
            >Display name</label>
            <input
              id="edit-display"
              v-model="displayName"
              type="text"
              maxlength="80"
              required
              class="mt-1.5 w-full rounded-xl border border-black/10 bg-[#f7f4ff] px-3.5 py-2.5 text-base outline-none focus:border-cheer-leaf/40 focus:ring-2 focus:ring-cheer-leaf/30"
              placeholder="How supporters see you"
              :disabled="identityPending"
            >
          </div>

          <div>
            <div class="flex items-center justify-between gap-2">
              <label
                for="edit-bio"
                class="block text-sm text-cheer-ink"
              >Bio</label>
              <button
                type="button"
                class="text-xs font-semibold text-cheer-leaf hover:underline disabled:opacity-50"
                :disabled="identityPending || aiBusy"
                @click="polishBio"
              >
                {{ aiBusy ? 'Polishing…' : 'Polish with AI' }}
              </button>
            </div>
            <textarea
              id="edit-bio"
              v-model="bio"
              rows="3"
              maxlength="500"
              class="mt-1.5 w-full rounded-xl border border-black/10 bg-[#f7f4ff] px-3.5 py-2.5 text-base outline-none focus:border-cheer-leaf/40 focus:ring-2 focus:ring-cheer-leaf/30"
              placeholder="A short line about your work"
              :disabled="identityPending"
            />
            <p
              v-if="aiHint"
              class="mt-1 text-xs text-cheer-ink/50"
            >
              {{ aiHint }}
            </p>
          </div>

          <div>
            <label
              for="edit-username"
              class="block text-sm text-cheer-ink"
            >Username</label>
            <div class="mt-1.5 flex items-center gap-2 rounded-xl border border-black/10 bg-[#f7f4ff] px-3.5 focus-within:border-cheer-leaf/40 focus-within:ring-2 focus-within:ring-cheer-leaf/30">
              <span class="shrink-0 text-sm text-cheer-ink/45">/</span>
              <input
                id="edit-username"
                v-model="username"
                type="text"
                autocomplete="username"
                maxlength="30"
                class="w-full bg-transparent py-2.5 text-base text-cheer-ink outline-none"
                placeholder="yourname"
                :disabled="identityPending"
                @input="onUsernameInput"
              >
            </div>
            <p
              v-if="usernameStatus"
              class="mt-2 text-sm"
              :class="usernameOk ? 'text-cheer-leaf' : 'text-red-700'"
              role="status"
            >
              {{ usernameStatus }}
            </p>
            <p class="mt-1 text-xs text-cheer-ink/50">
              Lowercase letters, numbers, underscores. 3–30 characters.
            </p>
          </div>
        </div>

        <p
          v-if="identityError"
          class="mt-3 text-sm text-red-700"
          role="alert"
        >
          {{ identityError }}
        </p>
        <p
          v-if="identitySuccess"
          class="mt-3 text-sm text-cheer-leaf"
          role="status"
        >
          {{ identitySuccess }}
        </p>

        <button
          type="button"
          class="mt-5 inline-flex items-center justify-center rounded-full bg-cheer-leaf px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          :disabled="identityPending || !canSaveIdentity"
          @click="saveIdentity"
        >
          {{ identityPending ? 'Saving…' : 'Save identity' }}
        </button>
      </section>

      <!-- Social -->
      <section
        class="rounded-[1.75rem] border border-black/6 bg-white/85 p-5 shadow-[0_1px_0_rgba(26, 18, 40,0.04)] backdrop-blur-md sm:p-7"
        aria-labelledby="social-heading"
      >
        <h2
          id="social-heading"
          class="text-lg font-bold tracking-tight text-cheer-ink"
        >
          Social links
        </h2>
        <p class="mt-1 text-sm text-cheer-ink/55">
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
              :disabled="socialPending"
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
              :disabled="socialPending"
            >
            <button
              type="button"
              class="text-sm text-red-700"
              :disabled="socialPending"
              @click="removeSocial(index)"
            >
              Remove
            </button>
          </div>
        </div>

        <button
          type="button"
          class="mt-3 text-sm font-semibold text-cheer-leaf disabled:opacity-50"
          :disabled="socialPending || socialLinks.length >= 5"
          @click="addSocial"
        >
          + Add link
        </button>

        <p
          v-if="socialError"
          class="mt-3 text-sm text-red-700"
          role="alert"
        >
          {{ socialError }}
        </p>
        <p
          v-if="socialSuccess"
          class="mt-3 text-sm text-cheer-leaf"
          role="status"
        >
          {{ socialSuccess }}
        </p>

        <button
          type="button"
          class="mt-5 inline-flex items-center justify-center rounded-full bg-cheer-leaf px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          :disabled="socialPending"
          @click="saveSocial"
        >
          {{ socialPending ? 'Saving…' : 'Save social links' }}
        </button>
      </section>

      <!-- Support -->
      <section
        class="rounded-[1.75rem] border border-black/6 bg-white/85 p-5 shadow-[0_1px_0_rgba(26, 18, 40,0.04)] backdrop-blur-md sm:p-7"
        aria-labelledby="support-heading"
      >
        <h2
          id="support-heading"
          class="text-lg font-bold tracking-tight text-cheer-ink"
        >
          Support settings
        </h2>
        <p class="mt-1 text-sm text-cheer-ink/55">
          Currency, message, and suggested tip amounts on your page.
        </p>

        <div class="mt-5 space-y-4">
          <div>
            <label
              for="edit-currency"
              class="block text-sm text-cheer-ink"
            >Preferred currency</label>
            <select
              id="edit-currency"
              v-model="currency"
              class="mt-1.5 w-full rounded-xl border border-black/10 bg-[#f7f4ff] px-3.5 py-2.5 text-base"
              :disabled="settingsPending"
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
            <label
              for="edit-support"
              class="block text-sm text-cheer-ink"
            >Support message</label>
            <textarea
              id="edit-support"
              v-model="supportMessage"
              rows="3"
              maxlength="500"
              class="mt-1.5 w-full rounded-xl border border-black/10 bg-[#f7f4ff] px-3.5 py-2.5 text-base outline-none focus:ring-2 focus:ring-cheer-leaf/30"
              placeholder="Thanks for supporting my work…"
              :disabled="settingsPending"
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
                :disabled="settingsPending"
              >
            </div>
            <p class="mt-1 text-xs text-cheer-ink/50">
              Decimal amounts (e.g. 1000.00). Up to 5 amounts.
            </p>
          </div>

          <div class="rounded-2xl border border-black/8 bg-cheer-sand/50 p-4">
            <label class="flex items-center gap-2 text-sm font-semibold text-cheer-ink">
              <input
                v-model="goalActive"
                type="checkbox"
                class="rounded border-black/20"
                :disabled="settingsPending"
              >
              Show a support goal on my public page
            </label>
            <div
              v-if="goalActive"
              class="mt-3 space-y-3"
            >
              <div>
                <label
                  for="edit-goal-title"
                  class="block text-sm text-cheer-ink"
                >Goal title</label>
                <input
                  id="edit-goal-title"
                  v-model="goalTitle"
                  type="text"
                  maxlength="80"
                  class="mt-1.5 w-full rounded-xl border border-black/10 bg-[#f7f4ff] px-3.5 py-2.5 text-base"
                  placeholder="e.g. Laptop fund"
                  :disabled="settingsPending"
                >
              </div>
              <div>
                <label
                  for="edit-goal-amount"
                  class="block text-sm text-cheer-ink"
                >Target amount</label>
                <input
                  id="edit-goal-amount"
                  v-model="goalTargetAmount"
                  type="text"
                  inputmode="decimal"
                  class="mt-1.5 w-full rounded-xl border border-black/10 bg-[#f7f4ff] px-3.5 py-2.5 text-base"
                  placeholder="50000.00"
                  :disabled="settingsPending"
                >
              </div>
            </div>
          </div>
        </div>

        <p
          v-if="settingsError"
          class="mt-3 text-sm text-red-700"
          role="alert"
        >
          {{ settingsError }}
        </p>
        <p
          v-if="settingsSuccess"
          class="mt-3 text-sm text-cheer-leaf"
          role="status"
        >
          {{ settingsSuccess }}
        </p>

        <button
          type="button"
          class="mt-5 inline-flex items-center justify-center rounded-full bg-cheer-leaf px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          :disabled="settingsPending"
          @click="saveSettings"
        >
          {{ settingsPending ? 'Saving…' : 'Save support settings' }}
        </button>
      </section>

      <p class="pb-4 text-center text-sm text-cheer-ink/50">
        <NuxtLink
          v-if="profile.publicPath"
          :to="profile.publicPath"
          class="font-semibold text-cheer-leaf hover:underline"
        >
          View public page
        </NuxtLink>
        <span class="mx-2 text-cheer-ink/25">·</span>
        <NuxtLink
          to="/dashboard"
          class="font-semibold text-cheer-ink/70 hover:underline"
        >
          Back to overview
        </NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CreatorProfile, SocialPlatform } from '~/types/api';
import { ApiClientError } from '~/services/api';

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
});

useHead({
  title: 'Edit profile — TippyMe',
});

const auth = useAuthStore();
const api = useApi();
const publicPath = useState<string | null>('dashboardPublicPath', () => null);
const avatarUrlState = useState<string | null>('dashboardAvatarUrl', () => null);

const loading = ref(true);
const loadError = ref<string | null>(null);
const profile = ref<CreatorProfile | null>(null);

const displayName = ref('');
const bio = ref('');
const avatarUrl = ref<string | null>(null);
const username = ref('');
const originalUsername = ref('');
const usernameOk = ref(true);
const usernameStatus = ref<string | null>(null);
let usernameTimer: ReturnType<typeof setTimeout> | null = null;

const socialLinks = ref<{ platform: SocialPlatform; url: string }[]>([]);
const supportMessage = ref('');
const currency = ref('NGN');
const tipAmounts = ref(['1000.00', '2500.00', '5000.00']);
const goalActive = ref(false);
const goalTitle = ref('');
const goalTargetAmount = ref('');
const aiBusy = ref(false);
const aiHint = ref<string | null>(null);

const identityPending = ref(false);
const identityError = ref<string | null>(null);
const identitySuccess = ref<string | null>(null);

const socialPending = ref(false);
const socialError = ref<string | null>(null);
const socialSuccess = ref<string | null>(null);

const settingsPending = ref(false);
const settingsError = ref<string | null>(null);
const settingsSuccess = ref<string | null>(null);

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

const canSaveIdentity = computed(() => {
  return Boolean(displayName.value.trim()) && usernameOk.value && username.value.length >= 3;
});

onMounted(async () => {
  await loadProfile();
});

onUnmounted(() => {
  if (usernameTimer) clearTimeout(usernameTimer);
});

function applyProfile(p: CreatorProfile) {
  profile.value = p;
  displayName.value = p.displayName;
  bio.value = p.bio ?? '';
  avatarUrl.value = p.avatarUrl;
  username.value = p.username;
  originalUsername.value = p.username;
  usernameOk.value = true;
  usernameStatus.value = null;
  socialLinks.value = p.socialLinks.map((l) => ({
    platform: l.platform,
    url: l.url,
  }));
  supportMessage.value = p.supportMessage ?? '';
  currency.value = p.currency || 'NGN';
  tipAmounts.value =
    p.suggestedTipAmounts.length > 0
      ? [...p.suggestedTipAmounts]
      : ['1000.00', '2500.00', '5000.00'];
  while (tipAmounts.value.length < 3) {
    tipAmounts.value.push('');
  }
  if (tipAmounts.value.length > 5) {
    tipAmounts.value = tipAmounts.value.slice(0, 5);
  }

  goalActive.value = Boolean(p.goalActive);
  goalTitle.value = p.goalTitle ?? '';
  goalTargetAmount.value = p.goalTargetAmount ?? '';

  publicPath.value = p.publicPath;
  avatarUrlState.value = p.avatarUrl;
}

async function loadProfile() {
  loading.value = true;
  loadError.value = null;
  try {
    const { profile: me } = await api.getMyCreator();
    if (!me) {
      await navigateTo('/onboarding');
      return;
    }
    applyProfile(me);
  } catch (err) {
    if (err instanceof ApiClientError && err.statusCode === 401) {
      auth.setUser(null);
      await navigateTo('/login?next=/dashboard/profile');
      return;
    }
    if (err instanceof ApiClientError && err.statusCode === 404) {
      await navigateTo('/onboarding');
      return;
    }
    loadError.value =
      err instanceof Error ? err.message : 'Could not load profile.';
  } finally {
    loading.value = false;
  }
}

function onAvatarUploaded(url: string) {
  avatarUrl.value = url;
  avatarUrlState.value = url;
  if (profile.value) {
    profile.value.avatarUrl = url;
  }
}

function onUsernameInput() {
  username.value = username.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
  usernameOk.value = false;
  usernameStatus.value = null;
  identityError.value = null;
  identitySuccess.value = null;
  if (usernameTimer) clearTimeout(usernameTimer);
  usernameTimer = setTimeout(() => {
    void checkUsername();
  }, 350);
}

async function checkUsername() {
  if (username.value === originalUsername.value) {
    usernameOk.value = true;
    usernameStatus.value = null;
    return;
  }
  if (username.value.length < 3) {
    usernameStatus.value = 'At least 3 characters.';
    usernameOk.value = false;
    return;
  }
  try {
    const result = await api.checkUsername(username.value);
    if (result.available) {
      usernameOk.value = true;
      usernameStatus.value = 'Available';
    } else {
      usernameOk.value = false;
      usernameStatus.value =
        result.reason === 'RESERVED'
          ? 'Reserved — pick another'
          : result.reason === 'TAKEN'
            ? 'Already taken'
            : 'Invalid username';
    }
  } catch {
    usernameOk.value = false;
    usernameStatus.value = 'Could not check availability';
  }
}

function addSocial() {
  socialLinks.value.push({ platform: 'WEBSITE', url: '' });
}

function removeSocial(index: number) {
  socialLinks.value.splice(index, 1);
}

function mapError(err: unknown): string {
  if (err instanceof ApiClientError) {
    if (err.statusCode >= 500) {
      return 'Something went wrong. Please try again.';
    }
    return err.message || 'Unable to save.';
  }
  return 'Something went wrong. Please try again.';
}

async function saveIdentity() {
  identityPending.value = true;
  identityError.value = null;
  identitySuccess.value = null;
  try {
    if (!displayName.value.trim()) {
      identityError.value = 'Display name is required.';
      return;
    }
    if (!usernameOk.value) {
      identityError.value = 'Choose an available username.';
      return;
    }
    const { profile: updated } = await api.updateMyCreator({
      displayName: displayName.value.trim(),
      bio: bio.value.trim() || null,
      username: username.value,
      avatarUrl: avatarUrl.value?.trim() || null,
    });
    applyProfile(updated);
    identitySuccess.value = 'Identity saved.';
  } catch (err) {
    identityError.value = mapError(err);
  } finally {
    identityPending.value = false;
  }
}

async function saveSocial() {
  socialPending.value = true;
  socialError.value = null;
  socialSuccess.value = null;
  try {
    for (const link of socialLinks.value) {
      if (link.url.trim() && !/^https?:\/\//i.test(link.url.trim())) {
        socialError.value = 'Social links must start with http:// or https://';
        return;
      }
    }
    const links = socialLinks.value
      .filter((l) => l.url.trim())
      .map((l, i) => ({
        platform: l.platform,
        url: l.url.trim(),
        sortOrder: i,
      }));
    const { profile: updated } = await api.replaceMySocialLinks(links);
    applyProfile(updated);
    socialSuccess.value = 'Social links saved.';
  } catch (err) {
    socialError.value = mapError(err);
  } finally {
    socialPending.value = false;
  }
}

async function saveSettings() {
  settingsPending.value = true;
  settingsError.value = null;
  settingsSuccess.value = null;
  try {
    const amounts = tipAmounts.value.map((a) => a.trim()).filter(Boolean);
    if (amounts.length === 0) {
      settingsError.value = 'Add at least one suggested tip amount.';
      return;
    }
    const { profile: updated } = await api.updateMyCreatorSettings({
      supportMessage: supportMessage.value.trim() || null,
      currency: currency.value,
      suggestedTipAmounts: amounts,
      goalActive: goalActive.value,
      goalTitle: goalActive.value ? goalTitle.value.trim() || null : null,
      goalTargetAmount: goalActive.value
        ? goalTargetAmount.value.trim() || null
        : null,
    });
    applyProfile(updated);
    settingsSuccess.value = 'Support settings saved.';
  } catch (err) {
    settingsError.value = mapError(err);
  } finally {
    settingsPending.value = false;
  }
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
    if (result.supportCta && !supportMessage.value.trim()) {
      supportMessage.value = result.supportCta;
    }
    aiHint.value =
      result.source === 'cencori'
        ? 'Polished with Cencori AI — review before saving.'
        : 'Local AI assist used (add CENCORI_API_KEY for live Cencori).';
  } catch (err) {
    aiHint.value = mapError(err);
  } finally {
    aiBusy.value = false;
  }
}
</script>
