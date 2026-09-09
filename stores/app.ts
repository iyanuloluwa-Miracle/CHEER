import { defineStore } from 'pinia';

/**
 * App-level UI state. Auth/session stores come in Phase 4.
 */
export const useAppStore = defineStore('app', {
  state: () => ({
    lastHealthCheckAt: null as string | null,
  }),
  actions: {
    markHealthChecked(isoTimestamp: string) {
      this.lastHealthCheckAt = isoTimestamp;
    },
  },
});
