/**
 * Liga o ano de serviço ativo + atividades ao motor de cálculo puro.
 * Recalcula a cada mudança de dados; a data "hoje" vem do relógio local.
 */
import { useMemo } from 'react';
import { useServiceYearStore } from '@/state/useServiceYearStore';
import { useActivityStore } from '@/state/useActivityStore';
import { computeDashboard, type DashboardResult, type EngineConfig } from '@/domain/engine';
import { computeAnalytics, type AnalyticsResult } from '@/domain/analytics';
import { todayIso } from '@/utils/today';

export function useEngineConfig(): EngineConfig | null {
  const active = useServiceYearStore((s) => s.active);
  return useMemo(() => {
    if (!active) return null;
    return {
      startDate: active.startDate,
      endDate: active.endDate,
      pioneerStartDate: active.pioneerStartDate,
      goalHours: active.goalHours,
      monthlyReference: active.monthlyReference,
    };
  }, [active]);
}

export function useDashboard(): DashboardResult | null {
  const config = useEngineConfig();
  const items = useActivityStore((s) => s.items);
  return useMemo(() => {
    if (!config) return null;
    const inputs = items.map((a) => ({
      category: a.category,
      activityDate: a.activityDate,
      durationMinutes: a.durationMinutes,
    }));
    return computeDashboard(config, inputs, todayIso());
  }, [config, items]);
}

export function useAnalytics(): AnalyticsResult | null {
  const config = useEngineConfig();
  const items = useActivityStore((s) => s.items);
  return useMemo(() => {
    if (!config) return null;
    const inputs = items.map((a) => ({
      category: a.category,
      activityDate: a.activityDate,
      durationMinutes: a.durationMinutes,
    }));
    return computeAnalytics(config, inputs, todayIso());
  }, [config, items]);
}
