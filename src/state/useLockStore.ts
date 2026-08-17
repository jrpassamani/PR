/**
 * Estado do bloqueio do app (PIN/biometria) e auto-lock por inatividade.
 *
 * As tentativas erradas e o tempo de bloqueio são PERSISTIDOS no SecureStore
 * (ver security/lockout.ts) e re-hidratados no boot, para o lockout progressivo
 * resistir a force-close (P1-04).
 */
import { create } from 'zustand';
import {
  loadLockout,
  saveLockout,
  clearLockout,
  nextLockoutUntil,
} from '@/security/lockout';

interface LockState {
  hasPin: boolean; // há PIN configurado?
  locked: boolean; // tela de bloqueio ativa?
  backgroundAt: number | null; // instante em que foi para background
  failedAttempts: number;
  lockedUntil: number | null; // timestamp ms até o qual a digitação fica bloqueada
  setHasPin: (v: boolean) => void;
  unlock: () => void;
  lock: () => void;
  markBackground: () => void;
  /** Ao voltar do background: bloqueia se passou do timeout. */
  resumeFromBackground: (timeoutSec: number) => void;
  /** Registra um PIN incorreto e aplica lockout progressivo (persistido). */
  registerFailure: () => void;
  /** Lê o lockout persistido no SecureStore e aplica ao estado (no boot). */
  hydrateLockout: () => Promise<void>;
}

export const useLockStore = create<LockState>((set, get) => ({
  hasPin: false,
  locked: false,
  backgroundAt: null,
  failedAttempts: 0,
  lockedUntil: null,

  setHasPin: (v) => set({ hasPin: v, locked: v ? get().locked : false }),

  unlock: () => {
    set({ locked: false, backgroundAt: null, failedAttempts: 0, lockedUntil: null });
    void clearLockout();
  },

  lock: () => set({ locked: true }),
  markBackground: () => set({ backgroundAt: Date.now() }),

  resumeFromBackground: (timeoutSec) => {
    const { backgroundAt, hasPin } = get();
    if (!hasPin) return;
    if (backgroundAt === null) return;
    const elapsedSec = (Date.now() - backgroundAt) / 1000;
    if (elapsedSec >= timeoutSec) set({ locked: true, backgroundAt: null });
    else set({ backgroundAt: null });
  },

  registerFailure: () => {
    const attempts = get().failedAttempts + 1;
    const lockedUntil = nextLockoutUntil(attempts, Date.now());
    set({ failedAttempts: attempts, lockedUntil });
    void saveLockout({ failedAttempts: attempts, lockedUntil });
  },

  async hydrateLockout() {
    const { failedAttempts, lockedUntil } = await loadLockout();
    set({ failedAttempts, lockedUntil });
  },
}));
