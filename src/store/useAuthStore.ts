import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { hashPassword, randomSalt, verifyPassword } from '@/src/lib/auth/crypto';
import {
  AuthSession,
  AuthUser,
  DEFAULT_REMINDER_PREFS,
  TaxReminderPrefs,
} from '@/src/types/auth';
import { uid } from '@/src/lib/format';

const SESSION_KEY = 'gbp_session_token';

async function saveToken(token: string | null) {
  // Prefer SecureStore on native; always fall back to AsyncStorage (Expo Go safe)
  if (Platform.OS !== 'web') {
    try {
      if (token) await SecureStore.setItemAsync(SESSION_KEY, token);
      else await SecureStore.deleteItemAsync(SESSION_KEY);
      return;
    } catch {
      // fall through
    }
  }
  try {
    if (token) await AsyncStorage.setItem(SESSION_KEY, token);
    else await AsyncStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore storage failures — app still works as guest
  }
}

async function readToken(): Promise<string | null> {
  if (Platform.OS !== 'web') {
    try {
      const v = await SecureStore.getItemAsync(SESSION_KEY);
      if (v) return v;
    } catch {
      // fall through
    }
  }
  try {
    return await AsyncStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

interface AuthState {
  hydrated: boolean;
  users: AuthUser[];
  session: AuthSession | null;
  /** Opaque token for optional remote sync Authorization header. */
  sessionToken: string | null;
  cloudSyncOptIn: boolean;
  lastSyncAt: string | null;
  lastSyncMessage: string | null;
  reminderPrefs: TaxReminderPrefs;

  setHydrated: (v: boolean) => void;
  continueAsGuest: (displayName?: string) => void;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setCloudSyncOptIn: (v: boolean) => void;
  setLastSync: (at: string | null, message: string | null) => void;
  updateReminderPrefs: (partial: Partial<TaxReminderPrefs>) => void;
  restoreSessionToken: () => Promise<void>;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      users: [],
      session: null,
      sessionToken: null,
      cloudSyncOptIn: false,
      lastSyncAt: null,
      lastSyncMessage: null,
      reminderPrefs: { ...DEFAULT_REMINDER_PREFS },

      setHydrated: (v) => set({ hydrated: v }),

      continueAsGuest: (displayName) => {
        set({
          session: {
            userId: 'guest',
            email: '',
            displayName: displayName?.trim() || 'Guest',
            mode: 'guest',
            signedInAt: new Date().toISOString(),
          },
          sessionToken: null,
        });
        void saveToken(null);
      },

      register: async (email, password, displayName) => {
        const e = normalizeEmail(email);
        if (!e.includes('@') || password.length < 8) {
          throw new Error('Use a valid email and a password of at least 8 characters.');
        }
        if (get().users.some((u) => u.email === e)) {
          throw new Error('An account with that email already exists on this device.');
        }
        const salt = await randomSalt();
        const passwordHash = await hashPassword(password, salt);
        const user: AuthUser = {
          id: uid('user'),
          email: e,
          displayName: displayName.trim() || e.split('@')[0],
          createdAt: new Date().toISOString(),
          passwordSalt: salt,
          passwordHash,
        };
        const token = await randomSalt(24);
        set((s) => ({
          users: [...s.users, user],
          session: {
            userId: user.id,
            email: user.email,
            displayName: user.displayName,
            mode: 'account',
            signedInAt: new Date().toISOString(),
          },
          sessionToken: token,
        }));
        await saveToken(token);
      },

      signIn: async (email, password) => {
        const e = normalizeEmail(email);
        const user = get().users.find((u) => u.email === e);
        if (!user) throw new Error('No account found for that email on this device.');
        const ok = await verifyPassword(password, user.passwordSalt, user.passwordHash);
        if (!ok) throw new Error('Incorrect password.');
        const token = await randomSalt(24);
        set({
          session: {
            userId: user.id,
            email: user.email,
            displayName: user.displayName,
            mode: 'account',
            signedInAt: new Date().toISOString(),
          },
          sessionToken: token,
        });
        await saveToken(token);
      },

      signOut: async () => {
        set({
          session: null,
          sessionToken: null,
        });
        await saveToken(null);
      },

      setCloudSyncOptIn: (v) => set({ cloudSyncOptIn: v }),

      setLastSync: (at, message) => set({ lastSyncAt: at, lastSyncMessage: message }),

      updateReminderPrefs: (partial) =>
        set((s) => ({ reminderPrefs: { ...s.reminderPrefs, ...partial } })),

      restoreSessionToken: async () => {
        const token = await readToken();
        if (token && get().session?.mode === 'account') {
          set({ sessionToken: token });
        }
      },
    }),
    {
      name: 'gbp-auth-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        users: s.users,
        session: s.session,
        cloudSyncOptIn: s.cloudSyncOptIn,
        lastSyncAt: s.lastSyncAt,
        lastSyncMessage: s.lastSyncMessage,
        reminderPrefs: s.reminderPrefs,
        // sessionToken kept in SecureStore primarily; also mirror for web
        sessionToken: s.sessionToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
        void state?.restoreSessionToken();
      },
    }
  )
);
