/**
 * POLÍTICA de lockout do PIN — matemática pura, sem dependências nativas
 * (testável no Node). A persistência fica em lockout.ts.
 */

/** A partir deste nº de erros, começa o lockout progressivo. */
export const FAILURE_THRESHOLD = 5;
export const BASE_LOCKOUT_MS = 30_000; // 30s
export const MAX_LOCKOUT_MS = 5 * 60_000; // 5min

export interface LockoutState {
  failedAttempts: number;
  lockedUntil: number | null; // epoch ms
}

/**
 * Dado o total de falhas acumuladas e o instante atual, calcula até quando a
 * digitação fica bloqueada. Puro — sem efeitos colaterais.
 */
export function nextLockoutUntil(attempts: number, now: number): number | null {
  if (attempts < FAILURE_THRESHOLD) return null;
  const over = attempts - FAILURE_THRESHOLD; // 0, 1, 2...
  const wait = Math.min(BASE_LOCKOUT_MS * 2 ** over, MAX_LOCKOUT_MS);
  return now + wait;
}
