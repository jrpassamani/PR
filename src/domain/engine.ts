/**
 * MOTOR DE CÁLCULO (puro, sem I/O, sem relógio).
 *
 * Toda a matemática das regras validadas vive aqui:
 *  - Linha ideal CONTÍNUA: Ideal(hoje) = metaEfetiva × (diasDecorridos ÷ diasDoServiço)
 *  - Proração por dias (DD-2): metaEfetiva = meta × (diasDoServiço ÷ diasDoAno)
 *  - Status: R = realizado ÷ ideal → 🟢 R≥0,95 · 🟡 0,85≤R<0,95 · 🔴 R<0,85
 *  - Ritmo necessário = horasRestantes ÷ (diasRestantes ÷ ~30,44)
 *  - Ritmo atual HÍBRIDO: <30 dias usa média desde o início; depois, janela de 30 dias
 *  - Projeção = realizado + ritmoDiárioAtual × diasRestantes
 *
 * "hoje" é sempre um parâmetro → cálculos determinísticos e testáveis.
 */
import type { ActivityInput, IsoDate, StatusLevel } from '@/domain/types';
import {
  AVG_DAYS_PER_MONTH,
  addDays,
  daysInclusive,
  maxIso,
  minIso,
} from '@/utils/datecore';

export interface EngineConfig {
  startDate: IsoDate; // AAAA-09-01
  endDate: IsoDate; // (AAAA+1)-08-31
  pioneerStartDate: IsoDate; // base da proração (>= startDate)
  goalHours: number; // padrão 600
  monthlyReference: number; // padrão 50 (informativo)
}

export const STATUS_GREEN_MIN = 0.95;
export const STATUS_YELLOW_MIN = 0.85;

/** Geometria do ano de serviço numa data — base compartilhada dos cálculos. */
export interface ServiceGeometry {
  serviceStart: IsoDate;
  end: IsoDate;
  totalYearDays: number;
  serviceDays: number;
  elapsedDays: number;
  daysRemaining: number;
  goalMinutes: number;
  effectiveGoalMinutes: number;
  isProrated: boolean;
}

export function getServiceGeometry(config: EngineConfig, today: IsoDate): ServiceGeometry {
  const serviceStart = maxIso(config.pioneerStartDate, config.startDate);
  const end = config.endDate;
  const totalYearDays = daysInclusive(config.startDate, end);
  const serviceDays = daysInclusive(serviceStart, end);
  const isProrated = serviceStart !== config.startDate;

  const goalMinutes = Math.round(config.goalHours * 60);
  const effectiveGoalMinutes = isProrated
    ? Math.round(goalMinutes * (serviceDays / totalYearDays))
    : goalMinutes;

  let elapsedDays: number;
  if (today < serviceStart) {
    elapsedDays = 0;
  } else {
    elapsedDays = daysInclusive(serviceStart, minIso(today, end));
  }
  elapsedDays = Math.min(Math.max(elapsedDays, 0), serviceDays);
  const daysRemaining = serviceDays - elapsedDays;

  return {
    serviceStart,
    end,
    totalYearDays,
    serviceDays,
    elapsedDays,
    daysRemaining,
    goalMinutes,
    effectiveGoalMinutes,
    isProrated,
  };
}

/** Soma de minutos das atividades cuja data cai em [lo, hi] (inclusive). */
export function sumMinutesInRange(
  activities: ActivityInput[],
  lo: IsoDate,
  hi: IsoDate,
): number {
  let total = 0;
  for (const a of activities) {
    if (a.activityDate >= lo && a.activityDate <= hi) total += a.durationMinutes;
  }
  return total;
}

export type PaceBasis = 'sinceStart' | 'last30';

export interface DashboardResult {
  /** Meta efetiva (após proração) em minutos e horas. */
  effectiveGoalMinutes: number;
  goalMinutes: number;
  isProrated: boolean;

  realizedMinutes: number;
  remainingMinutes: number;
  percentOfGoal: number; // 0..100+

  serviceDays: number;
  elapsedDays: number;
  daysRemaining: number;

  idealMinutesToday: number;
  deltaMinutes: number; // realizado - ideal (>0 = acima da trajetória)
  ratio: number; // realizado / ideal
  status: StatusLevel;

  requiredPacePerMonthHours: number; // ritmo necessário para fechar a meta
  currentDailyMinutes: number; // base do ritmo atual (híbrido)
  currentPacePerMonthHours: number; // ritmo atual projetado por mês
  paceBasis: PaceBasis;

  projectedMinutes: number; // projeção de encerramento
  willReachGoal: boolean;
}

export function computeDashboard(
  config: EngineConfig,
  activities: ActivityInput[],
  today: IsoDate,
): DashboardResult {
  const g = getServiceGeometry(config, today);

  const realizedMinutes = sumMinutesInRange(activities, g.serviceStart, g.end);
  const remainingMinutes = Math.max(0, g.effectiveGoalMinutes - realizedMinutes);
  const percentOfGoal =
    g.effectiveGoalMinutes > 0 ? (realizedMinutes / g.effectiveGoalMinutes) * 100 : 0;

  const idealMinutesToday =
    g.serviceDays > 0 ? g.effectiveGoalMinutes * (g.elapsedDays / g.serviceDays) : 0;
  const deltaMinutes = realizedMinutes - idealMinutesToday;

  let ratio: number;
  if (idealMinutesToday > 0) ratio = realizedMinutes / idealMinutesToday;
  else ratio = realizedMinutes > 0 ? Number.POSITIVE_INFINITY : 1;

  let status: StatusLevel;
  if (g.elapsedDays === 0 || idealMinutesToday === 0) status = 'neutral';
  else if (ratio >= STATUS_GREEN_MIN) status = 'green';
  else if (ratio >= STATUS_YELLOW_MIN) status = 'yellow';
  else status = 'red';

  const requiredPacePerMonthHours =
    g.daysRemaining > 0
      ? remainingMinutes / 60 / (g.daysRemaining / AVG_DAYS_PER_MONTH)
      : 0;

  // Ritmo atual híbrido (Q7)
  let currentDailyMinutes: number;
  let paceBasis: PaceBasis;
  if (g.elapsedDays < 30) {
    paceBasis = 'sinceStart';
    currentDailyMinutes = g.elapsedDays > 0 ? realizedMinutes / g.elapsedDays : 0;
  } else {
    paceBasis = 'last30';
    const windowStart = maxIso(addDays(today, -29), g.serviceStart);
    const windowEnd = minIso(today, g.end);
    const windowDays = daysInclusive(windowStart, windowEnd);
    const windowMinutes = sumMinutesInRange(activities, windowStart, windowEnd);
    currentDailyMinutes = windowDays > 0 ? windowMinutes / windowDays : 0;
  }

  const currentPacePerMonthHours = (currentDailyMinutes * AVG_DAYS_PER_MONTH) / 60;
  const projectedMinutes = realizedMinutes + currentDailyMinutes * g.daysRemaining;
  const willReachGoal = projectedMinutes >= g.effectiveGoalMinutes;

  return {
    effectiveGoalMinutes: g.effectiveGoalMinutes,
    goalMinutes: g.goalMinutes,
    isProrated: g.isProrated,
    realizedMinutes,
    remainingMinutes,
    percentOfGoal,
    serviceDays: g.serviceDays,
    elapsedDays: g.elapsedDays,
    daysRemaining: g.daysRemaining,
    idealMinutesToday,
    deltaMinutes,
    ratio,
    status,
    requiredPacePerMonthHours,
    currentDailyMinutes,
    currentPacePerMonthHours,
    paceBasis,
    projectedMinutes,
    willReachGoal,
  };
}
