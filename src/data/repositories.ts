/**
 * Interfaces dos repositórios. A UI/estado dependem SOMENTE destas interfaces,
 * nunca do SQLite diretamente — este é o ponto de plugue para um futuro
 * repositório remoto/sync sem reescrever o app.
 */
import type { Activity, CategoryKey, IsoDate, ServiceYear } from '@/domain/types';

export interface NewActivity {
  serviceYearId: string;
  category: CategoryKey;
  activityDate: IsoDate;
  durationMinutes: number;
  note: string | null;
}

export interface ActivityFilter {
  serviceYearId: string;
  category?: CategoryKey;
  from?: IsoDate;
  to?: IsoDate;
}

export interface ActivityRepository {
  create(data: NewActivity): Promise<Activity>;
  update(
    id: string,
    patch: Partial<Pick<Activity, 'category' | 'activityDate' | 'durationMinutes' | 'note'>>,
  ): Promise<void>;
  softDelete(id: string): Promise<void>;
  list(filter: ActivityFilter): Promise<Activity[]>;
  getById(id: string): Promise<Activity | null>;
}

export interface NewServiceYear {
  startDate: IsoDate;
  endDate: IsoDate;
  pioneerStartDate: IsoDate;
  goalHours: number;
  monthlyReference: number;
}

export interface ServiceYearRepository {
  getActive(): Promise<ServiceYear | null>;
  getById(id: string): Promise<ServiceYear | null>;
  list(): Promise<ServiceYear[]>;
  create(data: NewServiceYear, makeActive: boolean): Promise<ServiceYear>;
  update(id: string, patch: Partial<NewServiceYear>): Promise<void>;
  setActive(id: string): Promise<void>;
}

export interface SettingsRepository {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  getAll(): Promise<Record<string, string>>;
}
