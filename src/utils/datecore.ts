/**
 * Aritmética de datas PURA e sem dependências (roda no Node para os testes).
 * Trabalha com strings "YYYY-MM-DD" em UTC para evitar problemas de fuso.
 *
 * IMPORTANTE: o motor de cálculo NUNCA lê o relógio; a data "hoje" é sempre
 * injetada. Assim os cálculos são determinísticos e testáveis.
 */
import type { IsoDate } from '@/domain/types';

const MS_PER_DAY = 86_400_000;

/** Converte "YYYY-MM-DD" para timestamp UTC (meia-noite). */
export function parseIsoDate(iso: IsoDate): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Formata um timestamp UTC como "YYYY-MM-DD". */
export function toIsoDate(utcMs: number): IsoDate {
  const dt = new Date(utcMs);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Constrói "YYYY-MM-DD" a partir de ano/mês(1-12)/dia. */
export function makeIsoDate(year: number, month1to12: number, day: number): IsoDate {
  return toIsoDate(Date.UTC(year, month1to12 - 1, day));
}

/** Ano (número) de uma data ISO. */
export function isoYear(iso: IsoDate): number {
  return Number(iso.slice(0, 4));
}

/** Mês 1-12 de uma data ISO. */
export function isoMonth(iso: IsoDate): number {
  return Number(iso.slice(5, 7));
}

/** Chave "YYYY-MM" de uma data ISO. */
export function isoYearMonth(iso: IsoDate): string {
  return iso.slice(0, 7);
}

/** Soma (ou subtrai) dias a uma data ISO. */
export function addDays(iso: IsoDate, days: number): IsoDate {
  return toIsoDate(parseIsoDate(iso) + days * MS_PER_DAY);
}

/**
 * Nº de dias INCLUSIVE entre início e fim (mesmo dia = 1).
 * Ex.: 01/09 a 30/09 = 30.
 */
export function daysInclusive(startIso: IsoDate, endIso: IsoDate): number {
  return Math.floor((parseIsoDate(endIso) - parseIsoDate(startIso)) / MS_PER_DAY) + 1;
}

/** Comparação simples de datas ISO (lexicográfica funciona por serem zero-padded). */
export function isBefore(a: IsoDate, b: IsoDate): boolean {
  return a < b;
}
export function isAfter(a: IsoDate, b: IsoDate): boolean {
  return a > b;
}
export function minIso(a: IsoDate, b: IsoDate): IsoDate {
  return a <= b ? a : b;
}
export function maxIso(a: IsoDate, b: IsoDate): IsoDate {
  return a >= b ? a : b;
}
export function clampIso(iso: IsoDate, lo: IsoDate, hi: IsoDate): IsoDate {
  return minIso(maxIso(iso, lo), hi);
}

/** Último dia do mês (28..31) para ano/mês(1-12). */
export function lastDayOfMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

/**
 * Determina os limites do Ano de Serviço que CONTÊM a data informada.
 * Set..Dez -> começa neste ano; Jan..Ago -> começou no ano anterior.
 */
export function serviceYearBoundsFor(iso: IsoDate): { startDate: IsoDate; endDate: IsoDate } {
  const y = isoYear(iso);
  const m = isoMonth(iso);
  const startYear = m >= 9 ? y : y - 1;
  return {
    startDate: makeIsoDate(startYear, 9, 1),
    endDate: makeIsoDate(startYear + 1, 8, 31),
  };
}

/** Média de dias por mês (365.25/12) — usada para converter dias em "meses". */
export const AVG_DAYS_PER_MONTH = 30.4375;
