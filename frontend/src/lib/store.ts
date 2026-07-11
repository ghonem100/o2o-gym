import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  isOwner: () => boolean;
  isSuperAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('o2o-token', token);
          // Plain key so the axios interceptor (non-React) can build slug URLs
          if (user.gymSlug) localStorage.setItem('o2o-slug', user.gymSlug);
        }
        set({ user, token });
      },
      clearAuth: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('o2o-token');
        }
        set({ user: null, token: null });
      },
      isOwner: () => get().user?.role === 'owner',
      isSuperAdmin: () => get().user?.role === 'super_admin',
    }),
    { name: 'o2o-auth' }
  )
);
