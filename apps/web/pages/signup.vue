<template>
  <div class="w-full max-w-md text-center">
    <p class="text-sm text-cheer-ink/65">Redirecting to email sign-in…</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'auth',
});

useHead({
  title: 'Sign up — TippyMe',
});

await navigateTo('/login', { replace: true });
</script>
