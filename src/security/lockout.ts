/**
 * Lockout de PIN PERSISTENTE (P1-04, Fase 6).
 *
 * Antes, tentativas/tempo de bloqueio viviam só na memória do Zustand, então
 * um "force-close" zerava o lockout e permitia brute-force. Agora o estado é
 * gravado no SecureStore e re-hidratado no boot: o bloqueio progressivo
 * sobrevive ao encerramento do app.
 *
 * A MATEMÁTICA do backoff é pura (testável no Node); a persistência usa o
 * SecureStore do SO.
 */
import * as SecureStore from 'expo-secure-store';
import type { LockoutState } from '@/security/lockoutPolicy';

export {
  FAILURE_THRESHOLD,
  BASE_LOCKOUT_MS,
  MAX_LOCKOUT_MS,
  nextLockoutUntil,
  type LockoutState,
} from '@/security/lockoutPolicy';

const LOCKOUT_KEY = 'pin_lockout_v1';

export async function loadLockout(): Promise<LockoutState> {
  try {
    const raw = await SecureStore.getItemAsync(LOCKOUT_KEY);
    if (!raw) return { failedAttempts: 0, lockedUntil: null };
    const parsed = JSON.parse(raw) as Partial<LockoutState>;
    const failedAttempts = Number.isInteger(parsed.failedAttempts) ? (parsed.failedAttempts as number) : 0;
    const lockedUntil =
      typeof parsed.lockedUntil === 'number' && Number.isFinite(parsed.lockedUntil) ? parsed.lockedUntil : null;
    return { failedAttempts: Math.max(0, failedAttempts), lockedUntil };
  } catch {
    return { failedAttempts: 0, lockedUntil: null };
  }
}

export async function saveLockout(state: LockoutState): Promise<void> {
  try {
    await SecureStore.setItemAsync(LOCKOUT_KEY, JSON.stringify(state), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch {
    /* SecureStore indisponível: mantém ao menos o bloqueio em memória. */
  }
}

export async function clearLockout(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(LOCKOUT_KEY);
  } catch {
    /* ignore */
  }
}
