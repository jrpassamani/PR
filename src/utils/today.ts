/**
 * Data/hora "de hoje" segundo o RELÓGIO LOCAL do aparelho (Q12).
 * Isolado aqui para o motor de cálculo permanecer puro (recebe a data pronta).
 */
import type { IsoDate, IsoTimestamp } from '@/domain/types';

/** "YYYY-MM-DD" no fuso local. */
export function todayIso(): IsoDate {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Converte um Date local para "YYYY-MM-DD". */
export function toLocalIsoDate(d: Date): IsoDate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Timestamp ISO completo (UTC) para createdAt/updatedAt. */
export function nowTimestamp(): IsoTimestamp {
  return new Date().toISOString();
}
