/**
 * ANÁLISES (puro). Constrói os dados das telas Análises/Gráfico:
 *  - horas por mês, acumuladas, linha ideal por marco mensal
 *  - horas e % por categoria
 *  - maior/menor mês, dias com atividade, médias, total
 *
 * Observação: "maior/menor mês" considera apenas meses JÁ DECORRIDOS
 * (mês iniciado até "hoje"), para não classificar meses futuros vazios.
 */
import { CATEGORY_KEYS, type ActivityInput, type CategoryKey, type IsoDate } from '@/domain/types';
import { getServiceGeometry, type EngineConfig } from '@/domain/engine';
import {
  AVG_DAYS_PER_MONTH,
  daysInclusive,
  isoYear,
  lastDayOfMonth,
  makeIsoDate,
  minIso,
} from '@/utils/datecore';

const MONTH_LABELS_SERVICE_ORDER = [
  'Set', 'Out', 'Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago',
];

export interface MonthBucket {
  monthIndex: number; // 0 = Set ... 11 = Ago
  yearMonth: string; // "YYYY-MM"
  label: string; // "Set", "Out", ...
  monthStart: IsoDate;
  monthEnd: IsoDate;
  minutes: number;
  cumulativeMinutes: number;
  idealCumulativeMinutes: number;
  hasElapsed: boolean; // o mês já começou (monthStart <= hoje)
}

export interface CategoryBucket {
  category: CategoryKey;
  minutes: number;
  percent: number; // 0..100 do total realizado
}

export interface AnalyticsResult {
  totalMinutes: number;
  months: MonthBucket[];
  categories: CategoryBucket[];
  maxMonth: MonthBucket | null;
  minMonth: MonthBucket | null;
  daysWithActivity: number;
  avgPerActiveDayMinutes: number;
  avgMonthlyMinutes: number;
}

export function computeAnalytics(
  config: EngineConfig,
  activities: ActivityInput[],
  today: IsoDate,
): AnalyticsResult {
  const g = getServiceGeometry(config, today);
  const startYear = isoYear(config.startDate); // ano de setembro

  // 12 meses na ordem do ano de serviço (Set..Ago)
  const months: MonthBucket[] = [];
  for (let i = 0; i < 12; i++) {
    const month1to12 = ((9 - 1 + i) % 12) + 1; // Set=9
    const year = i <= 3 ? startYear : startYear + 1; // Set..Dez no 1º ano; Jan..Ago no 2º
    const monthStart = makeIsoDate(year, month1to12, 1);
    const monthEnd = makeIsoDate(year, month1to12, lastDayOfMonth(year, month1to12));
    months.push({
      monthIndex: i,
      yearMonth: `${year}-${String(month1to12).padStart(2, '0')}`,
      label: MONTH_LABELS_SERVICE_ORDER[i],
      monthStart,
      monthEnd,
      minutes: 0,
      cumulativeMinutes: 0,
      idealCumulativeMinutes: 0,
      hasElapsed: monthStart <= today,
    });
  }
  const byYearMonth = new Map(months.map((m) => [m.yearMonth, m]));

  // Distribui minutos por mês e por categoria; conta dias distintos.
  const perCategory = new Map<CategoryKey, number>();
  for (const k of CATEGORY_KEYS) perCategory.set(k, 0);
  const activeDays = new Set<IsoDate>();
  let totalMinutes = 0;

  for (const a of activities) {
    if (a.activityDate < g.serviceStart || a.activityDate > g.end) continue;
    const ym = a.activityDate.slice(0, 7);
    const bucket = byYearMonth.get(ym);
    if (bucket) bucket.minutes += a.durationMinutes;
    perCategory.set(a.category, (perCategory.get(a.category) ?? 0) + a.durationMinutes);
    activeDays.add(a.activityDate);
    totalMinutes += a.durationMinutes;
  }

  // Acumulado realizado + linha ideal por marco mensal (proração aplicada).
  let running = 0;
  for (const m of months) {
    running += m.minutes;
    m.cumulativeMinutes = running;
    const idealDays =
      m.monthEnd < g.serviceStart
        ? 0
        : Math.min(daysInclusive(g.serviceStart, minIso(m.monthEnd, g.end)), g.serviceDays);
    m.idealCumulativeMinutes =
      g.serviceDays > 0 ? (g.effectiveGoalMinutes * idealDays) / g.serviceDays : 0;
  }

  // Categorias com percentual.
  const categories: CategoryBucket[] = CATEGORY_KEYS.map((category) => {
    const minutes = perCategory.get(category) ?? 0;
    return {
      category,
      minutes,
      percent: totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0,
    };
  });

  // Maior/menor mês entre os meses já decorridos.
  const elapsed = months.filter((m) => m.hasElapsed);
  let maxMonth: MonthBucket | null = null;
  let minMonth: MonthBucket | null = null;
  for (const m of elapsed) {
    if (maxMonth === null || m.minutes > maxMonth.minutes) maxMonth = m;
    if (minMonth === null || m.minutes < minMonth.minutes) minMonth = m;
  }

  const daysWithActivity = activeDays.size;
  const avgPerActiveDayMinutes = daysWithActivity > 0 ? totalMinutes / daysWithActivity : 0;
  const avgMonthlyMinutes =
    g.elapsedDays > 0 ? totalMinutes / (g.elapsedDays / AVG_DAYS_PER_MONTH) : 0;

  return {
    totalMinutes,
    months,
    categories,
    maxMonth,
    minMonth,
    daysWithActivity,
    avgPerActiveDayMinutes,
    avgMonthlyMinutes,
  };
}
