import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActiveContext, AuthUser } from "./auth-types";
import { fetchCaptcha, loginRequest, logoutRequest, meRequest } from "./auth-api";

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  permissions: string[];
  activeContext: ActiveContext | null;
  isHydrated: boolean;
  login: (input: {
    schoolCode?: string;
    userId: string;
    accessCode: string;
    captchaAnswer: string;
    captchaToken: string;
  }) => Promise<string>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  setContext: (ctx: ActiveContext | null) => void;
  getToken: () => string | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      permissions: [],
      activeContext: null,
      isHydrated: false,

      getToken: () => get().token,

      login: async (input) => {
        const result = await loginRequest(input);
        set({
          token: result.token,
          user: result.user,
          permissions: result.permissions,
          activeContext: result.activeContext,
          isHydrated: true,
        });
        return result.redirectPath;
      },

      logout: async () => {
        const token = get().token;
        if (token) {
          try {
            await logoutRequest(token);
          } catch {
            /* ignore network errors on logout */
          }
        }
        set({
          token: null,
          user: null,
          permissions: [],
          activeContext: null,
          isHydrated: true,
        });
      },

      hydrate: async () => {
        const token = get().token;
        if (!token) {
          set({ isHydrated: true, user: null, permissions: [] });
          return;
        }
        try {
          const session = await meRequest(token);
          const { permissions, ...user } = session;
          set({
            user,
            permissions,
            isHydrated: true,
          });
        } catch {
          set({
            token: null,
            user: null,
            permissions: [],
            activeContext: null,
            isHydrated: true,
          });
        }
      },

      setContext: (ctx) => set({ activeContext: ctx }),
    }),
    {
      name: "school-os-auth-v2",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        permissions: state.permissions,
        activeContext: state.activeContext,
      }),
      onRehydrateStorage: () => (state) => {
        state?.hydrate();
      },
    },
  ),
);

export { fetchCaptcha };
