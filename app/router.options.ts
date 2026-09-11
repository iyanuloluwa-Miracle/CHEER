import type { RouterConfig } from '@nuxt/schema';

// Keep marketing home at the top unless the user targeted a section hash.
export default {
  scrollBehavior(to, _from, savedPosition) {
    if (to.hash) {
      return {
        el: to.hash,
        top: 112,
        behavior: 'smooth',
      };
    }

    if (to.path === '/') {
      return { top: 0 };
    }

    if (savedPosition) {
      return savedPosition;
    }

    return { top: 0 };
  },
} satisfies RouterConfig;
