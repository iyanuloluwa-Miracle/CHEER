import { defineStore } from 'pinia';
import type { PublicUser } from '~/types/api';
import { ApiClientError } from '~/services/api';

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'anonymous';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as PublicUser | null,
    status: 'idle' as AuthStatus,
  }),
  getters: {
    isAuthenticated: (state) => state.status === 'authenticated' && !!state.user,
  },
  actions: {
    async fetchMe() {
      const api = useApi();
      this.status = 'loading';
      try {
        const { user } = await api.getMe();
        this.user = user;
        this.status = user ? 'authenticated' : 'anonymous';
      } catch (err) {
        if (err instanceof ApiClientError && err.statusCode === 401) {
          this.user = null;
          this.status = 'anonymous';
          return;
        }
        this.user = null;
        this.status = 'anonymous';
      }
    },
    setUser(user: PublicUser | null) {
      this.user = user;
      this.status = user ? 'authenticated' : 'anonymous';
    },
    async logout() {
      const api = useApi();
      try {
        await api.logout();
      } finally {
        this.user = null;
        this.status = 'anonymous';
      }
    },
  },
});
