/**
 * Preferências do app (persistidas em app_config via SettingsRepository).
 */
import { create } from 'zustand';
import { getRepositories } from '@/data';

export type ThemePref = 'light' | 'dark' | 'system';

export const SETTINGS_KEYS = {
  onboarded: 'onboarded',
  theme: 'theme',
  keepHistory: 'keep_history',
  biometricEnabled: 'biometric_enabled',
  lockTimeoutSec: 'lock_timeout_sec',
} as const;

interface SettingsState {
  loaded: boolean;
  onboarded: boolean;
  theme: ThemePref;
  keepHistory: boolean;
  biometricEnabled: boolean;
  lockTimeoutSec: number;
  load: () => Promise<void>;
  setOnboarded: (v: boolean) => Promise<void>;
  setTheme: (v: ThemePref) => Promise<void>;
  setKeepHistory: (v: boolean) => Promise<void>;
  setBiometricEnabled: (v: boolean) => Promise<void>;
  setLockTimeoutSec: (v: number) => Promise<void>;
}

async function persist(key: string, value: string) {
  const repos = await getRepositories();
  await repos.settings.set(key, value);
}

export const useSettingsStore = create<SettingsState>((set) => ({
  loaded: false,
  onboarded: false,
  theme: 'system',
  keepHistory: true,
  biometricEnabled: false,
  lockTimeoutSec: 60,

  async load() {
    const repos = await getRepositories();
    const all = await repos.settings.getAll();
    set({
      loaded: true,
      onboarded: all[SETTINGS_KEYS.onboarded] === '1',
      theme: (all[SETTINGS_KEYS.theme] as ThemePref) ?? 'system',
      keepHistory: all[SETTINGS_KEYS.keepHistory] !== '0',
      biometricEnabled: all[SETTINGS_KEYS.biometricEnabled] === '1',
      lockTimeoutSec: all[SETTINGS_KEYS.lockTimeoutSec]
        ? Number(all[SETTINGS_KEYS.lockTimeoutSec])
        : 60,
    });
  },

  async setOnboarded(v) {
    await persist(SETTINGS_KEYS.onboarded, v ? '1' : '0');
    set({ onboarded: v });
  },
  async setTheme(v) {
    await persist(SETTINGS_KEYS.theme, v);
    set({ theme: v });
  },
  async setKeepHistory(v) {
    await persist(SETTINGS_KEYS.keepHistory, v ? '1' : '0');
    set({ keepHistory: v });
  },
  async setBiometricEnabled(v) {
    await persist(SETTINGS_KEYS.biometricEnabled, v ? '1' : '0');
    set({ biometricEnabled: v });
  },
  async setLockTimeoutSec(v) {
    await persist(SETTINGS_KEYS.lockTimeoutSec, String(v));
    set({ lockTimeoutSec: v });
  },
}));
