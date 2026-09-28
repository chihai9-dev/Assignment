import { create } from 'zustand';

export interface AuthUser {
  id: number;
  email: string;
}

interface AuthStore {
  token: string | null;
  user: AuthUser | null;
  hydrated: boolean; // đã đọc localStorage xong chưa
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  hydrate: () => void;
}

const STORAGE_KEY = 'brewlite-auth';

export const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  user: null,
  hydrated: false,

  login: (token, user) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ token: null, user: null });
  },

  // Gọi 1 lần khi app tải để khôi phục đăng nhập sau khi F5
  hydrate: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const { token, user } = JSON.parse(raw);
        set({ token, user, hydrated: true });
        return;
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    set({ hydrated: true });
  },
}));
