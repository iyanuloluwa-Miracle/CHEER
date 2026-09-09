<template>
  <OtpAuthForm @verified="onVerified" />
</template>

<script setup lang="ts">
import { normalizeClaimUsername } from '~/utils/username-claim';

definePageMeta({
  layout: 'auth',
});

useHead({
  title: 'Claim your link — TippyMe',
});

const route = useRoute();
const auth = useAuthStore();

const claimedUsername = computed(() => {
  const raw = route.query.username;
  if (typeof raw !== 'string') return null;
  const normalized = normalizeClaimUsername(raw);
  return normalized.length >= 3 ? normalized : null;
});

function onVerified() {
  if (typeof route.query.next === 'string') {
    return navigateTo(route.query.next);
  }
  if (auth.user?.hasCreatorProfile) {
    return navigateTo('/dashboard');
  }
  if (claimedUsername.value) {
    return navigateTo({
      path: '/onboarding',
      query: { username: claimedUsername.value },
    });
  }
  return navigateTo('/onboarding');
}
</script>
