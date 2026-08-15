/**
 * Atividades do ano de serviço ativo. Mantém a lista completa em memória
 * (volume anual é pequeno) e expõe ações de CRUD + refresh.
 */
import { create } from 'zustand';
import { getRepositories } from '@/data';
import type { Activity, CategoryKey, IsoDate } from '@/domain/types';
import type { ActivityInput } from '@/domain/types';

interface EditableActivity {
  category: CategoryKey;
  activityDate: IsoDate;
  durationMinutes: number;
  note: string | null;
}

interface ActivityState {
  serviceYearId: string | null;
  items: Activity[];
  loading: boolean;
  load: (serviceYearId: string) => Promise<void>;
  refresh: () => Promise<void>;
  add: (data: EditableActivity) => Promise<void>;
  edit: (id: string, patch: Partial<EditableActivity>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Projeção das atividades para o motor de cálculo. */
  asInputs: () => ActivityInput[];
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  serviceYearId: null,
  items: [],
  loading: false,

  async load(serviceYearId) {
    set({ loading: true, serviceYearId });
    const repos = await getRepositories();
    const items = await repos.activities.list({ serviceYearId });
    set({ items, loading: false });
  },

  async refresh() {
    const id = get().serviceYearId;
    if (id) await get().load(id);
  },

  async add(data) {
    const id = get().serviceYearId;
    if (!id) throw new Error('Nenhum ano de serviço ativo.');
    const repos = await getRepositories();
    await repos.activities.create({ serviceYearId: id, ...data });
    await get().refresh();
  },

  async edit(id, patch) {
    const repos = await getRepositories();
    await repos.activities.update(id, patch);
    await get().refresh();
  },

  async remove(id) {
    const repos = await getRepositories();
    await repos.activities.softDelete(id);
    await get().refresh();
  },

  asInputs() {
    return get().items.map((a) => ({
      category: a.category,
      activityDate: a.activityDate,
      durationMinutes: a.durationMinutes,
    }));
  },
}));
