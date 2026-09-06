/**
 * Protects creator routes. Redirects anonymous users to /login.
 * Creators without a profile are sent to onboarding (except when already there).
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore();

  if (auth.status === 'idle' || auth.status === 'loading') {
    await auth.fetchMe();
  }

  if (!auth.isAuthenticated) {
    return navigateTo({
      path: '/login',
      query: { next: to.fullPath },
    });
  }

  if (
    !auth.user?.hasCreatorProfile &&
    to.path !== '/onboarding' &&
    !to.path.startsWith('/onboarding/')
  ) {
    return navigateTo('/onboarding');
  }
});
