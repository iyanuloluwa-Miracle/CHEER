<template>
  <OtpAuthForm @verified="onVerified" />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'auth',
});

useHead({
  title: 'Sign up — TippyMe',
});

const route = useRoute();
const auth = useAuthStore();

function onVerified() {
  if (typeof route.query.next === 'string') {
    return navigateTo(route.query.next);
  }
  if (auth.user?.hasCreatorProfile) {
    return navigateTo('/dashboard');
  }
  return navigateTo('/onboarding');
}
</script>
