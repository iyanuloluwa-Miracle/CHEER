<template>
  <div class="w-full px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
    <header
      class="flex flex-col gap-6 border-b border-black/10 pb-8 lg:flex-row lg:items-end lg:justify-between"
    >
      <div class="min-w-0">
        <p class="text-sm font-semibold uppercase tracking-wide text-cheer-leaf">
          Creator dashboard
        </p>
        <h1 class="mt-2 text-3xl font-bold tracking-tight text-cheer-ink sm:text-4xl">
          {{ dashboard?.displayName || 'Your TippyMe' }}
        </h1>
        <p
          v-if="publicHostLabel"
          class="mt-2 text-sm text-cheer-ink/55"
        >
          {{ publicHostLabel }}
        </p>
      </div>

      <div
        v-if="dashboard"
        class="shrink-0"
      >
        <DashboardShareTippyLink
          :public-url="dashboard.publicUrl"
          :public-path="dashboard.publicPath"
          :display-name="dashboard.displayName"
        />
      </div>
    </header>

    <p
      v-if="loadError"
      class="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
      role="alert"
    >
      {{ loadError }}
    </p>

    <div
      v-else-if="loading"
      class="mt-12 text-sm text-cheer-ink/55"
    >
      Loading your support…
    </div>

    <template v-else-if="dashboard">
      <section
        class="mt-10 grid gap-8 border-b border-black/10 pb-10 sm:grid-cols-3"
        aria-label="Support totals"
      >
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-cheer-ink/45">
            Total successful support
          </p>
          <p class="mt-2 text-3xl font-bold tabular-nums tracking-tight text-cheer-ink">
            {{ formatMoney(dashboard.totals.successfulSupport, dashboard.currency) }}
          </p>
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-cheer-ink/45">
            Successful tips
          </p>
          <p class="mt-2 text-3xl font-bold tabular-nums tracking-tight text-cheer-ink">
            {{ dashboard.totals.successfulTipCount }}
          </p>
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-cheer-ink/45">
            {{ dashboard.totals.periodLabel }}
          </p>
          <p class="mt-2 text-3xl font-bold tabular-nums tracking-tight text-cheer-ink">
            {{ formatMoney(dashboard.totals.periodSupport, dashboard.currency) }}
          </p>
          <p class="mt-2 text-xs text-cheer-ink/45">
            {{ dashboard.totals.periodTipCount }}
            successful tip{{ dashboard.totals.periodTipCount === 1 ? '' : 's' }} this month (UTC)
          </p>
        </div>
      </section>

      <section
        class="mt-10 border-b border-black/10 pb-10"
        aria-label="Payout and settlement"
      >
        <h2 class="text-xl font-semibold tracking-tight text-cheer-ink">
          Payout &amp; settlement
        </h2>
        <p class="mt-2 max-w-3xl text-sm leading-relaxed text-cheer-ink/70">
          {{ dashboard.settlement.message }}
        </p>
        <dl class="mt-6 grid gap-6 text-sm sm:grid-cols-3">
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-cheer-ink/45">
              Status
            </dt>
            <dd class="mt-1 font-medium text-cheer-ink">
              {{ settlementLabel }}
            </dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-cheer-ink/45">
              TippyMe wallet
            </dt>
            <dd class="mt-1 font-medium text-cheer-ink">
              None — TippyMe is not a bank
            </dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-cheer-ink/45">
              Automatic Friday payout
            </dt>
            <dd class="mt-1 font-medium text-cheer-ink">
              Future capability
            </dd>
          </div>
        </dl>
      </section>

      <section
        v-if="isEmpty"
        class="mt-12 py-10 text-center"
      >
        <h2 class="text-2xl font-semibold tracking-tight text-cheer-ink">
          No support yet
        </h2>
        <p class="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-cheer-ink/65">
          Share your Tippy link to get your first supporter. Totals stay at zero until a payment succeeds.
        </p>
        <div class="mt-8 flex justify-center">
          <DashboardShareTippyLink
            :public-url="dashboard.publicUrl"
            :public-path="dashboard.publicPath"
            :display-name="dashboard.displayName"
          />
        </div>
      </section>

      <div
        v-else
        class="mt-10 grid gap-12 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] xl:gap-16"
      >
        <section>
          <div class="flex flex-wrap items-end justify-between gap-3">
            <h2 class="text-xl font-semibold tracking-tight text-cheer-ink">
              Recent support
            </h2>
            <div class="flex flex-wrap gap-2">
              <label class="sr-only" for="tip-status">Filter by status</label>
              <select
                id="tip-status"
                v-model="statusFilter"
                class="rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm text-cheer-ink"
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
            class="mt-4 border-y border-black/10"
          >
            <DashboardTipRow
              v-for="tip in tips"
              :key="tip.id"
              :tip="tip"
            />
          </ul>
          <p
            v-else
            class="mt-4 text-sm text-cheer-ink/55"
          >
            No tips match this filter.
          </p>

          <div
            v-if="tipsPage && tipsPage.totalPages > 1"
            class="mt-6 flex items-center justify-between gap-3 text-sm"
          >
            <button
              type="button"
              class="rounded-full border border-black/10 bg-white px-3 py-1.5 font-semibold disabled:opacity-40"
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
              class="rounded-full border border-black/10 bg-white px-3 py-1.5 font-semibold disabled:opacity-40"
              :disabled="page >= tipsPage.totalPages || tipsLoading"
              @click="goPage(page + 1)"
            >
              Next
            </button>
          </div>
        </section>

        <section>
          <h2 class="text-xl font-semibold tracking-tight text-cheer-ink">
            Recent messages
          </h2>
          <ul
            v-if="dashboard.recentMessages.length"
            class="mt-4 space-y-5"
          >
            <li
              v-for="msg in dashboard.recentMessages"
              :key="msg.id"
              class="border-l-2 border-cheer-leaf/40 pl-4"
            >
              <p class="text-sm leading-relaxed text-cheer-ink">
                “{{ msg.message }}”
              </p>
              <p class="mt-1 text-xs text-cheer-ink/45">
                {{ msg.isAnonymous ? 'Anonymous' : (msg.supporterName || 'Supporter') }}
                · {{ formatMoney(msg.amount, msg.currency) }}
              </p>
            </li>
          </ul>
          <p
            v-else
            class="mt-3 text-sm text-cheer-ink/55"
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

const loading = ref(true);
const tipsLoading = ref(false);
const loadError = ref<string | null>(null);
const dashboard = ref<CreatorDashboard | null>(null);
const tipsPage = ref<CreatorTipsPage | null>(null);
const tips = ref<CreatorTip[]>([]);
const page = ref(1);
const statusFilter = ref<TipStatus | ''>('');

const isEmpty = computed(
  () =>
    dashboard.value !== null &&
    dashboard.value.totals.successfulTipCount === 0 &&
    (tipsPage.value?.total ?? 0) === 0 &&
    !statusFilter.value,
);

const publicHostLabel = computed(() => {
  if (!dashboard.value) return '';
  try {
    return new URL(dashboard.value.publicUrl).href.replace(/^https?:\/\//, '');
  } catch {
    return dashboard.value.publicUrl;
  }
});

const settlementLabel = computed(() => {
  const readiness = dashboard.value?.settlement.readiness;
  if (readiness === 'CONNECTED') return 'Bachs Connect linked';
  return 'Not configured yet';
});

watch(
  () => dashboard.value?.publicPath ?? null,
  (path) => {
    publicPath.value = path;
  },
  { immediate: true },
);

onMounted(async () => {
  await loadAll();
});

onUnmounted(() => {
  publicPath.value = null;
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
