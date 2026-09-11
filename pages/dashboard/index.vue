<template>
  <div class="w-full px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
    <p
      v-if="loadError"
      class="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
      role="alert"
    >
      {{ loadError }}
    </p>

    <div
      v-if="loading"
      class="overflow-hidden rounded-[2rem] border border-black/5 bg-cheer-ink p-8 sm:p-10"
    >
      <div class="dash-shimmer h-4 w-28 rounded-full opacity-40" />
      <div class="dash-shimmer mt-5 h-10 w-2/3 max-w-md rounded-2xl opacity-35" />
      <div class="dash-shimmer mt-8 h-16 w-48 rounded-2xl opacity-30" />
      <div class="mt-10 grid gap-3 sm:grid-cols-3">
        <div class="dash-shimmer h-24 rounded-2xl opacity-25" />
        <div class="dash-shimmer h-24 rounded-2xl opacity-25" />
        <div class="dash-shimmer h-24 rounded-2xl opacity-25" />
      </div>
    </div>

    <template v-else-if="dashboard">
      <!-- Hero composition -->
      <section
        class="motion-animate relative overflow-hidden rounded-[2rem] text-white shadow-[0_30px_80px_-40px_rgba(26, 18, 40,0.85)]"
        style="
          background:
            radial-gradient(ellipse 70% 80% at 100% 0%, rgba(238, 230, 255, 0.22), transparent 55%),
            radial-gradient(ellipse 50% 60% at 0% 100%, rgba(183, 148, 255, 0.12), transparent 50%),
            linear-gradient(145deg, #5b2db8 0%, #3b1d7a 40%, #1a1228 100%);
        "
        aria-label="Creator overview"
      >
        <div
          class="pointer-events-none absolute inset-0 opacity-[0.2]"
          style="
            background-image: radial-gradient(rgba(238, 230, 255, 0.4) 1px, transparent 1px);
            background-size: 20px 20px;
          "
          aria-hidden="true"
        />
        <div
          class="dash-float pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-cheer-mint/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          class="dash-float-delay pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-cheer-glow/15 blur-3xl"
          aria-hidden="true"
        />

        <div class="relative px-5 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
          <div class="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0">
              <div class="flex items-center gap-3">
                <CreatorAvatarUploader
                  v-model="dashboard.avatarUrl"
                  :seed="dashboard.username"
                  :alt="dashboard.displayName"
                  variant="dark"
                  persist
                  hint="Click to change your photo"
                  @uploaded="onAvatarUploaded"
                />
                <div>
                  <p class="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-cheer-mint/80">
                    Creator dashboard
                  </p>
                  <p class="mt-0.5 text-sm text-white/55">
                    {{ greeting }}
                  </p>
                </div>
              </div>

              <h1 class="mt-5 max-w-xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.35rem] lg:leading-[1.05]">
                {{ dashboard.displayName }}
              </h1>
              <NuxtLink
                to="/dashboard/profile"
                class="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-cheer-mint/90 transition hover:text-cheer-mint"
              >
                Edit profile
                <span aria-hidden="true">→</span>
              </NuxtLink>
            </div>

            <div class="motion-animate motion-animate-delay-1 shrink-0 lg:pt-2">
              <DashboardShareTippyLink
                variant="dark"
                :public-url="dashboard.publicUrl"
                :public-path="dashboard.publicPath"
                :display-name="dashboard.displayName"
                :goal-title="dashboard.supportGoal?.title"
                :goal-percent="dashboard.supportGoal?.percent"
              />
            </div>
          </div>

          <div class="motion-animate motion-animate-delay-2 mt-10 border-t border-white/10 pt-8">
            <p class="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-white/45">
              Total successful support
            </p>
            <p class="mt-2 text-5xl font-bold tabular-nums tracking-tight sm:text-6xl lg:text-[4.25rem] lg:leading-none">
              {{ formatMoney(dashboard.totals.successfulSupport, dashboard.currency) }}
            </p>
            <p class="mt-3 text-sm text-white/50">
              Across
              <span class="font-semibold text-cheer-mint">{{ dashboard.totals.successfulTipCount }}</span>
              successful tip{{ dashboard.totals.successfulTipCount === 1 ? '' : 's' }}
            </p>
          </div>

          <div
            class="motion-animate motion-animate-delay-3 mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
            aria-label="Support totals"
          >
            <div class="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm sm:p-5">
              <p class="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white/45">
                Successful tips
              </p>
              <p class="mt-2 text-3xl font-bold tabular-nums tracking-tight">
                {{ dashboard.totals.successfulTipCount }}
              </p>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm sm:p-5">
              <p class="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white/45">
                Link views
              </p>
              <p class="mt-2 text-3xl font-bold tabular-nums tracking-tight">
                {{ dashboard.linkViews?.lifetime ?? 0 }}
              </p>
              <p class="mt-1.5 text-xs text-white/45">
                {{ dashboard.linkViews?.thisWeek ?? 0 }} this week (UTC)
              </p>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm sm:p-5">
              <p class="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white/45">
                Views → tips
              </p>
              <p class="mt-2 text-3xl font-bold tabular-nums tracking-tight">
                {{
                  dashboard.conversion?.viewsToTipsPercent != null
                    ? `${dashboard.conversion.viewsToTipsPercent}%`
                    : '—'
                }}
              </p>
              <p class="mt-1.5 text-xs text-white/45">
                Conversion from link views
              </p>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm sm:p-5">
              <p class="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white/45">
                {{ dashboard.totals.periodLabel }}
              </p>
              <p class="mt-2 text-3xl font-bold tabular-nums tracking-tight">
                {{ formatMoney(dashboard.totals.periodSupport, dashboard.currency) }}
              </p>
              <p class="mt-1.5 text-xs text-white/45">
                {{ dashboard.totals.periodTipCount }} tip{{ dashboard.totals.periodTipCount === 1 ? '' : 's' }} (UTC)
              </p>
            </div>
            <div class="rounded-2xl border border-cheer-mint/25 bg-cheer-mint/15 p-4 backdrop-blur-sm sm:p-5">
              <p class="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-cheer-mint/80">
                Payout status
              </p>
              <p class="mt-2 text-lg font-bold tracking-tight text-cheer-mint sm:text-xl">
                {{ settlementLabel }}
              </p>
              <p class="mt-1.5 text-xs text-white/45">
                TippyMe is not a bank
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Payout detail -->
      <section
        class="motion-animate motion-animate-delay-3 mt-5 overflow-hidden rounded-[1.75rem] border border-black/6 bg-white/80 shadow-[0_1px_0_rgba(26, 18, 40,0.04)] backdrop-blur-md"
        aria-label="Payout and settlement"
      >
        <div class="flex flex-col gap-4 border-b border-black/6 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-7 sm:py-6">
          <div class="max-w-2xl">
            <div class="flex items-center gap-2.5">
              <span
                class="flex h-9 w-9 items-center justify-center rounded-xl bg-cheer-leaf/10 text-cheer-leaf"
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
                  <rect
                    x="3"
                    y="6"
                    width="18"
                    height="13"
                    rx="2"
                  />
                  <path d="M3 10h18" />
                  <path d="M7 15h3" />
                </svg>
              </span>
              <h2 class="text-xl font-bold tracking-tight text-cheer-ink">
                Payout &amp; settlement
              </h2>
            </div>
            <p class="mt-3 text-sm leading-relaxed text-cheer-ink/65">
              {{ dashboard.settlement.message }}
            </p>
            <div class="mt-4 flex flex-wrap gap-2.5">
              <button
                v-if="!settlementReady"
                type="button"
                class="motion-cta motion-cta-primary rounded-full bg-cheer-leaf px-4 py-2.5 text-sm font-semibold text-white hover:bg-cheer-ink disabled:opacity-60"
                :disabled="connectBusy"
                @click="startConnect"
              >
                {{ connectBusy ? 'Connecting…' : 'Connect Bachs payouts' }}
              </button>
              <button
                v-else-if="dashboard.settlement.automatedFridayPayout !== 'CONFIGURED'"
                type="button"
                class="motion-cta rounded-full border border-cheer-leaf/30 bg-cheer-mint/40 px-4 py-2.5 text-sm font-semibold text-cheer-ink hover:bg-cheer-mint/60 disabled:opacity-60"
                :disabled="connectBusy"
                @click="enableFriday"
              >
                {{ connectBusy ? 'Saving…' : 'Enable Friday payouts' }}
              </button>
              <button
                v-else
                type="button"
                class="motion-cta rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-cheer-ink hover:border-cheer-leaf/40 disabled:opacity-60"
                :disabled="connectBusy"
                @click="startConnect"
              >
                {{ connectBusy ? 'Opening…' : 'Open Bachs onboarding' }}
              </button>
            </div>
            <p
              v-if="connectError"
              class="mt-2 text-sm text-red-700"
              role="alert"
            >
              {{ connectError }}
            </p>
          </div>
          <span
            class="inline-flex w-fit items-center gap-2 self-start rounded-full border border-black/8 bg-cheer-sand/90 px-3.5 py-1.5 text-xs font-semibold text-cheer-ink/70"
          >
            <span
              class="h-1.5 w-1.5 rounded-full"
              :class="settlementReady ? 'bg-cheer-leaf' : 'bg-cheer-glow'"
              aria-hidden="true"
            />
            {{ settlementLabel }}
          </span>
        </div>
        <dl class="grid gap-0 sm:grid-cols-3">
          <div class="border-b border-black/6 px-5 py-5 sm:border-b-0 sm:border-r sm:px-7">
            <dt class="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-cheer-ink/40">
              Status
            </dt>
            <dd class="mt-2 text-base font-bold text-cheer-ink">
              {{ settlementLabel }}
            </dd>
          </div>
          <div class="border-b border-black/6 px-5 py-5 sm:border-b-0 sm:border-r sm:px-7">
            <dt class="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-cheer-ink/40">
              TippyMe wallet
            </dt>
            <dd class="mt-2 text-base font-bold text-cheer-ink">
              None — not a bank
            </dd>
          </div>
          <div class="px-5 py-5 sm:px-7">
            <dt class="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-cheer-ink/40">
              Automatic Friday payout
            </dt>
            <dd class="mt-2 text-base font-bold text-cheer-ink">
              {{ fridayLabel }}
            </dd>
          </div>
        </dl>
      </section>

      <section
        v-if="dashboard.supportGoal"
        class="motion-animate mt-5 overflow-hidden rounded-[1.75rem] border border-black/6 bg-white/80 p-5 shadow-[0_1px_0_rgba(26, 18, 40,0.04)] backdrop-blur-md sm:p-7"
        aria-label="Support goal"
      >
        <p class="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-cheer-leaf">
          Support goal
        </p>
        <h2 class="mt-1 text-xl font-bold tracking-tight text-cheer-ink">
          {{ dashboard.supportGoal.title }}
        </h2>
        <p class="mt-2 text-sm text-cheer-ink/65">
          {{ formatMoney(dashboard.supportGoal.raisedAmount, dashboard.supportGoal.currency) }}
          of
          {{ formatMoney(dashboard.supportGoal.targetAmount, dashboard.supportGoal.currency) }}
          ({{ dashboard.supportGoal.percent }}%)
        </p>
        <div class="mt-4 h-2.5 overflow-hidden rounded-full bg-cheer-sand">
          <div
            class="h-full rounded-full bg-cheer-leaf transition-all duration-500"
            :style="{ width: `${Math.min(100, dashboard.supportGoal.percent)}%` }"
          />
        </div>
      </section>

      <!-- Activity -->
      <div
        class="motion-animate motion-animate-delay-4 mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]"
      >
        <section
          class="rounded-[1.75rem] border border-black/6 bg-white/85 p-5 shadow-[0_1px_0_rgba(26, 18, 40,0.04)] backdrop-blur-md sm:p-7"
        >
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p class="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-cheer-leaf">
                Activity
              </p>
              <h2 class="mt-1 text-xl font-bold tracking-tight text-cheer-ink">
                Recent support
              </h2>
            </div>
            <div class="flex flex-wrap gap-2">
              <label class="sr-only" for="tip-status">Filter by status</label>
              <select
                id="tip-status"
                v-model="statusFilter"
                class="rounded-full border border-black/10 bg-white px-3.5 py-2 text-sm font-medium text-cheer-ink transition hover:border-cheer-leaf/30 focus:border-cheer-leaf focus:outline-none focus:ring-2 focus:ring-cheer-leaf/20"
                @change="onFilterChange"
              >
                <option value="">
                  All statuses
                </option>
                <option value="PAID">
                  Paid
                </option>
                <option value="CHECKOUT_PENDING">
                  Checkout pending
                </option>
                <option value="CREATED">
                  Created
                </option>
                <option value="FAILED">
                  Failed
                </option>
                <option value="EXPIRED">
                  Expired
                </option>
              </select>
            </div>
          </div>

          <ul
            v-if="tips.length"
            class="mt-5 divide-y divide-black/6"
          >
            <DashboardTipRow
              v-for="tip in tips"
              :key="tip.id"
              :tip="tip"
            />
          </ul>
          <p
            v-else
            class="mt-6 rounded-2xl bg-cheer-sand/70 px-4 py-8 text-center text-sm text-cheer-ink/55"
          >
            No tips match this filter.
          </p>

          <div
            v-if="tipsPage && tipsPage.totalPages > 1"
            class="mt-6 flex items-center justify-between gap-3 text-sm"
          >
            <button
              type="button"
              class="motion-cta rounded-full border border-black/10 bg-white px-4 py-2 font-semibold disabled:opacity-40"
              :disabled="page <= 1 || tipsLoading"
              @click="goPage(page - 1)"
            >
              Previous
            </button>
            <span class="text-cheer-ink/55">
              Page {{ page }} of {{ tipsPage.totalPages }}
            </span>
            <button
              type="button"
              class="motion-cta rounded-full border border-black/10 bg-white px-4 py-2 font-semibold disabled:opacity-40"
              :disabled="page >= tipsPage.totalPages || tipsLoading"
              @click="goPage(page + 1)"
            >
              Next
            </button>
          </div>
        </section>

        <section
          class="rounded-[1.75rem] border border-black/6 bg-white/85 p-5 shadow-[0_1px_0_rgba(26, 18, 40,0.04)] backdrop-blur-md sm:p-7"
        >
          <p class="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-cheer-leaf">
            From supporters
          </p>
          <h2 class="mt-1 text-xl font-bold tracking-tight text-cheer-ink">
            Recent messages
          </h2>
          <ul
            v-if="dashboard.recentMessages.length"
            class="mt-5 space-y-3"
          >
            <li
              v-for="msg in dashboard.recentMessages"
              :key="msg.id"
              class="rounded-2xl border border-black/5 bg-gradient-to-br from-cheer-sand/70 to-cheer-mint/20 px-4 py-3.5"
            >
              <p class="text-sm leading-relaxed text-cheer-ink">
                “{{ msg.message }}”
              </p>
              <p class="mt-2 text-xs font-semibold text-cheer-ink/45">
                {{ msg.isAnonymous ? 'Anonymous' : (msg.supporterName || 'Supporter') }}
                · {{ formatMoney(msg.amount, msg.currency) }}
              </p>
            </li>
          </ul>
          <p
            v-else
            class="mt-5 rounded-2xl bg-cheer-sand/70 px-4 py-8 text-center text-sm text-cheer-ink/55"
          >
            No messages on successful tips yet.
          </p>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type {
  CreatorDashboard,
  CreatorTip,
  CreatorTipsPage,
  TipStatus,
} from '~/types/api';
import { ApiClientError } from '~/services/api';

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
});

useHead({
  title: 'Dashboard — TippyMe',
});

const auth = useAuthStore();
const api = useApi();
const publicPath = useState<string | null>('dashboardPublicPath', () => null);
const avatarUrlState = useState<string | null>('dashboardAvatarUrl', () => null);

const loading = ref(true);
const tipsLoading = ref(false);
const loadError = ref<string | null>(null);
const dashboard = ref<CreatorDashboard | null>(null);
const tipsPage = ref<CreatorTipsPage | null>(null);
const tips = ref<CreatorTip[]>([]);
const page = ref(1);
const statusFilter = ref<TipStatus | ''>('');

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
});

const settlementReady = computed(
  () => dashboard.value?.settlement.readiness === 'CONNECTED',
);

const settlementLabel = computed(() => {
  if (settlementReady.value) return 'Bachs Connect linked';
  return 'Not configured yet';
});

const fridayLabel = computed(() => {
  const status = dashboard.value?.settlement.automatedFridayPayout;
  if (status === 'CONFIGURED') return 'Configured via Bachs';
  if (status === 'NOT_ENABLED') return 'Available — enable above';
  return 'Coming via Bachs Connect';
});

const connectBusy = ref(false);
const connectError = ref<string | null>(null);

async function startConnect() {
  connectBusy.value = true;
  connectError.value = null;
  try {
    const result = await api.startConnectOnboarding();
    if (dashboard.value) {
      dashboard.value.settlement = result.settlement;
    }
    if (result.onboardingUrl) {
      window.location.href = result.onboardingUrl;
      return;
    }
    if (result.settlement.automatedFridayPayout !== 'CONFIGURED') {
      const friday = await api.enableFridayPayout();
      if (dashboard.value) {
        dashboard.value.settlement = friday.settlement;
      }
    }
  } catch (err) {
    connectError.value =
      err instanceof ApiClientError
        ? err.message
        : 'Could not start Bachs Connect.';
  } finally {
    connectBusy.value = false;
  }
}

async function enableFriday() {
  connectBusy.value = true;
  connectError.value = null;
  try {
    const result = await api.enableFridayPayout();
    if (dashboard.value) {
      dashboard.value.settlement = result.settlement;
    }
  } catch (err) {
    connectError.value =
      err instanceof ApiClientError
        ? err.message
        : 'Could not enable Friday payouts.';
  } finally {
    connectBusy.value = false;
  }
}

watch(
  () => dashboard.value?.publicPath ?? null,
  (path) => {
    publicPath.value = path;
  },
  { immediate: true },
);

watch(
  () => dashboard.value?.avatarUrl ?? null,
  (url) => {
    avatarUrlState.value = url;
  },
  { immediate: true },
);

function onAvatarUploaded(url: string) {
  avatarUrlState.value = url;
  if (dashboard.value) {
    dashboard.value.avatarUrl = url;
  }
}

onMounted(async () => {
  await loadAll();
});

onUnmounted(() => {
  publicPath.value = null;
  avatarUrlState.value = null;
});

async function loadAll() {
  loading.value = true;
  loadError.value = null;
  try {
    const result = await api.getMyDashboard();
    dashboard.value = result.dashboard;
    await loadTips();
  } catch (err) {
    if (err instanceof ApiClientError && err.statusCode === 401) {
      auth.setUser(null);
      await navigateTo('/login?next=/dashboard');
      return;
    }
    if (err instanceof ApiClientError && err.statusCode === 404) {
      await navigateTo('/onboarding');
      return;
    }
    loadError.value =
      err instanceof Error ? err.message : 'Could not load dashboard.';
  } finally {
    loading.value = false;
  }
}

async function loadTips() {
  tipsLoading.value = true;
  try {
    tipsPage.value = await api.listMyTips({
      page: page.value,
      pageSize: 10,
      status: statusFilter.value || undefined,
    });
    tips.value = tipsPage.value.tips;
  } catch (err) {
    loadError.value =
      err instanceof Error ? err.message : 'Could not load tips.';
  } finally {
    tipsLoading.value = false;
  }
}

function onFilterChange() {
  page.value = 1;
  void loadTips();
}

function goPage(next: number) {
  page.value = next;
  void loadTips();
}

function formatMoney(amount: string, currency: string) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `${currency} ${amount}`;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${amount}`;
  }
}
</script>
