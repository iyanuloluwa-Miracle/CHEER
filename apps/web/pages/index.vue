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
</script>
