/**
 * Helpers de formatação para a UI (labels em pt-BR).
 */
import type { StatusLevel } from '@/domain/types';
import { formatHuman, minutesToHM } from '@/utils/duration';

/** Minutos -> "327h30" / "45min". */
export function hoursLabel(minutes: number): string {
  return formatHuman(Math.round(minutes));
}

/** Horas decimais -> "45h05" (usado em ritmos). */
export function paceLabel(hoursDecimal: number): string {
  return formatHuman(Math.round(hoursDecimal * 60));
}

/** Diferença assinada em relação à trajetória: "+12h30" / "−3h". */
export function signedHoursLabel(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '−';
  const { hours, minutes: m } = minutesToHM(Math.abs(minutes));
  if (hours === 0) return `${sign}${m}min`;
  if (m === 0) return `${sign}${hours}h`;
  return `${sign}${hours}h${String(m).padStart(2, '0')}`;
}

export function percentLabel(value: number, digits = 0): string {
  return `${value.toFixed(digits)}%`;
}

export interface StatusMeta {
  label: string;
  emoji: string;
  tone: 'green' | 'yellow' | 'red' | 'neutral';
  description: string;
}

export function statusMeta(status: StatusLevel): StatusMeta {
  switch (status) {
    case 'green':
      return { label: 'No ritmo', emoji: '🟢', tone: 'green', description: 'Você está na trajetória ou acima dela.' };
    case 'yellow':
      return { label: 'Atenção', emoji: '🟡', tone: 'yellow', description: 'Um pouco abaixo da trajetória ideal.' };
    case 'red':
      return { label: 'Abaixo do ritmo', emoji: '🔴', tone: 'red', description: 'Acumulado abaixo da trajetória — ajuste o ritmo.' };
    default:
      return { label: 'Começando', emoji: '⚪', tone: 'neutral', description: 'Registre atividades para acompanhar a trajetória.' };
  }
}

/** "14/08/2026" a partir de "2026-08-14". */
export function formatIsoBr(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** "14/08" (curto). */
export function formatIsoBrShort(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

const MONTH_NAMES_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/** "agosto de 2026" a partir de "2026-08". */
export function formatYearMonthBr(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  return `${MONTH_NAMES_PT[m - 1]} de ${y}`;
}
