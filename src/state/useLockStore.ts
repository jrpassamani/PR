/**
 * Estado do bloqueio do app (PIN/biometria) e auto-lock por inatividade.
 */
import { create } from 'zustand';

/** A partir desta quantidade de erros, começa o lockout progressivo. */
const FAILURE_THRESHOLD = 5;
const BASE_LOCKOUT_MS = 30_000; // 30s
const MAX_LOCKOUT_MS = 5 * 60_000; // 5min

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
  /** Registra um PIN incorreto e aplica lockout progressivo. */
  registerFailure: () => void;
}

export const useLockStore = create<LockState>((set, get) => ({
  hasPin: false,
  locked: false,
  backgroundAt: null,
  failedAttempts: 0,
  lockedUntil: null,

  setHasPin: (v) => set({ hasPin: v, locked: v ? get().locked : false }),
  unlock: () => set({ locked: false, backgroundAt: null, failedAttempts: 0, lockedUntil: null }),
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
    if (attempts < FAILURE_THRESHOLD) {
      set({ failedAttempts: attempts });
      return;
    }
    const over = attempts - FAILURE_THRESHOLD; // 0, 1, 2...
    const wait = Math.min(BASE_LOCKOUT_MS * 2 ** over, MAX_LOCKOUT_MS);
    set({ failedAttempts: attempts, lockedUntil: Date.now() + wait });
  },
}));
