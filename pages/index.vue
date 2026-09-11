<template>
  <div>
    <LandingHeroSection />
    <LandingProblemSection />
    <LandingHowItWorksSection />
    <LandingFeaturesSection />
    <LandingTestimonialsSection />
    <LandingTrustSection />
    <LandingStackSection />
    <LandingFaqSection />
  </div>
</template>

<script setup lang="ts">
const route = useRoute();

useHead({
  title: 'TippyMe — One link for support',
  meta: [
    {
      name: 'description',
      content:
        'Still posting your bank details when people want to support your work? TippyMe gives you one simple link to receive support and messages.',
    },
  ],
});

// Browser scroll restoration / leftover #faq can land visitors on FAQ.
onMounted(() => {
  if (route.hash) return;
  window.scrollTo({ top: 0, left: 0 });
});
</script>
