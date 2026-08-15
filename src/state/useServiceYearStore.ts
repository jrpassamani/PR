/**
 * Ano de serviço ativo + criação/virada de ano (DD-3).
 */
import { create } from 'zustand';
import { getRepositories } from '@/data';
import type { ServiceYear } from '@/domain/types';
import type { NewServiceYear } from '@/data/repositories';
import { serviceYearBoundsFor } from '@/utils/datecore';
import { todayIso } from '@/utils/today';

interface ServiceYearState {
  active: ServiceYear | null;
  all: ServiceYear[];
  load: () => Promise<void>;
  /** Cria o ano de serviço que contém `pioneerStartDate` e o ativa. */
  createForStart: (pioneerStartDate: string, goalHours: number, monthlyReference: number) => Promise<ServiceYear>;
  updateConfig: (id: string, patch: Partial<NewServiceYear>) => Promise<void>;
  setActive: (id: string) => Promise<void>;
  /** Existe um ano de serviço mais recente que o ativo? (para sugerir virada) */
  needsRollover: () => boolean;
}

export const useServiceYearStore = create<ServiceYearState>((set, get) => ({
  active: null,
  all: [],

  async load() {
    const repos = await getRepositories();
    const [active, all] = await Promise.all([
      repos.serviceYears.getActive(),
      repos.serviceYears.list(),
    ]);
    set({ active, all });
  },

  async createForStart(pioneerStartDate, goalHours, monthlyReference) {
    const repos = await getRepositories();
    const bounds = serviceYearBoundsFor(pioneerStartDate);
    const data: NewServiceYear = {
      startDate: bounds.startDate,
      endDate: bounds.endDate,
      pioneerStartDate,
      goalHours,
      monthlyReference,
    };
    const created = await repos.serviceYears.create(data, true);
    await get().load();
    return created;
  },

  async updateConfig(id, patch) {
    const repos = await getRepositories();
    await repos.serviceYears.update(id, patch);
    await get().load();
  },

  async setActive(id) {
    const repos = await getRepositories();
    await repos.serviceYears.setActive(id);
    await get().load();
  },

  needsRollover() {
    const { active } = get();
    if (!active) return false;
    const currentBounds = serviceYearBoundsFor(todayIso());
    return currentBounds.startDate > active.startDate;
  },
}));
