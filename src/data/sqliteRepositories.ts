/**
 * Implementação SQLite dos repositórios (soft-delete via is_deleted).
 */
import type { Database } from '@/db/client';
import type { Activity, CategoryKey, ServiceYear } from '@/domain/types';
import { newId } from '@/utils/ids';
import { nowTimestamp } from '@/utils/today';
import type {
  ActivityFilter,
  ActivityRepository,
  NewActivity,
  NewServiceYear,
  ServiceYearRepository,
  SettingsRepository,
} from '@/data/repositories';

// ---- mapeadores linha -> domínio -----------------------------------------
interface ActivityRow {
  id: string;
  service_year_id: string;
  category_key: string;
  activity_date: string;
  duration_minutes: number;
  note: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: number;
}

function mapActivity(r: ActivityRow): Activity {
  return {
    id: r.id,
    serviceYearId: r.service_year_id,
    category: r.category_key as CategoryKey,
    activityDate: r.activity_date,
    durationMinutes: r.duration_minutes,
    note: r.note,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    isDeleted: r.is_deleted === 1,
  };
}

interface ServiceYearRow {
  id: string;
  start_date: string;
  end_date: string;
  pioneer_start_date: string;
  goal_hours: number;
  monthly_reference: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  is_deleted: number;
}

function mapServiceYear(r: ServiceYearRow): ServiceYear {
  return {
    id: r.id,
    startDate: r.start_date,
    endDate: r.end_date,
    pioneerStartDate: r.pioneer_start_date,
    goalHours: r.goal_hours,
    monthlyReference: r.monthly_reference,
    isActive: r.is_active === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    isDeleted: r.is_deleted === 1,
  };
}

// ---- Activity -------------------------------------------------------------
export class SqliteActivityRepository implements ActivityRepository {
  constructor(private db: Database) {}

  async create(data: NewActivity): Promise<Activity> {
    const now = nowTimestamp();
    const id = newId();
    this.db.run(
      `INSERT INTO activity
         (id, service_year_id, category_key, activity_date, duration_minutes, note, created_at, updated_at, is_deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0);`,
      [id, data.serviceYearId, data.category, data.activityDate, data.durationMinutes, data.note, now, now],
    );
    const created = await this.getById(id);
    if (!created) throw new Error('Falha ao criar atividade.');
    return created;
  }

  async update(
    id: string,
    patch: Partial<Pick<Activity, 'category' | 'activityDate' | 'durationMinutes' | 'note'>>,
  ): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (patch.category !== undefined) { fields.push('category_key = ?'); values.push(patch.category); }
    if (patch.activityDate !== undefined) { fields.push('activity_date = ?'); values.push(patch.activityDate); }
    if (patch.durationMinutes !== undefined) { fields.push('duration_minutes = ?'); values.push(patch.durationMinutes); }
    if (patch.note !== undefined) { fields.push('note = ?'); values.push(patch.note); }
    if (fields.length === 0) return;
    fields.push('updated_at = ?'); values.push(nowTimestamp());
    values.push(id);
    this.db.run(`UPDATE activity SET ${fields.join(', ')} WHERE id = ?;`, values);
  }

  async softDelete(id: string): Promise<void> {
    this.db.run('UPDATE activity SET is_deleted = 1, updated_at = ? WHERE id = ?;', [nowTimestamp(), id]);
  }

  async list(filter: ActivityFilter): Promise<Activity[]> {
    const where: string[] = ['is_deleted = 0', 'service_year_id = ?'];
    const params: unknown[] = [filter.serviceYearId];
    if (filter.category) { where.push('category_key = ?'); params.push(filter.category); }
    if (filter.from) { where.push('activity_date >= ?'); params.push(filter.from); }
    if (filter.to) { where.push('activity_date <= ?'); params.push(filter.to); }
    const rows = this.db.all<ActivityRow>(
      `SELECT * FROM activity WHERE ${where.join(' AND ')}
       ORDER BY activity_date DESC, created_at DESC;`,
      params,
    );
    return rows.map(mapActivity);
  }

  async getById(id: string): Promise<Activity | null> {
    const r = this.db.get<ActivityRow>('SELECT * FROM activity WHERE id = ? AND is_deleted = 0;', [id]);
    return r ? mapActivity(r) : null;
  }
}

// ---- ServiceYear ----------------------------------------------------------
export class SqliteServiceYearRepository implements ServiceYearRepository {
  constructor(private db: Database) {}

  async getActive(): Promise<ServiceYear | null> {
    const r = this.db.get<ServiceYearRow>(
      'SELECT * FROM service_year WHERE is_active = 1 AND is_deleted = 0 LIMIT 1;',
    );
    return r ? mapServiceYear(r) : null;
  }

  async getById(id: string): Promise<ServiceYear | null> {
    const r = this.db.get<ServiceYearRow>('SELECT * FROM service_year WHERE id = ?;', [id]);
    return r ? mapServiceYear(r) : null;
  }

  async list(): Promise<ServiceYear[]> {
    const rows = this.db.all<ServiceYearRow>(
      'SELECT * FROM service_year WHERE is_deleted = 0 ORDER BY start_date DESC;',
    );
    return rows.map(mapServiceYear);
  }

  async create(data: NewServiceYear, makeActive: boolean): Promise<ServiceYear> {
    const now = nowTimestamp();
    const id = newId();
    this.db.transaction(() => {
      if (makeActive) this.db.run('UPDATE service_year SET is_active = 0 WHERE is_active = 1;');
      this.db.run(
        `INSERT INTO service_year
           (id, start_date, end_date, pioneer_start_date, goal_hours, monthly_reference, is_active, created_at, updated_at, is_deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0);`,
        [id, data.startDate, data.endDate, data.pioneerStartDate, data.goalHours, data.monthlyReference, makeActive ? 1 : 0, now, now],
      );
    });
    const created = await this.getById(id);
    if (!created) throw new Error('Falha ao criar ano de serviço.');
    return created;
  }

  async update(id: string, patch: Partial<NewServiceYear>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (patch.startDate !== undefined) { fields.push('start_date = ?'); values.push(patch.startDate); }
    if (patch.endDate !== undefined) { fields.push('end_date = ?'); values.push(patch.endDate); }
    if (patch.pioneerStartDate !== undefined) { fields.push('pioneer_start_date = ?'); values.push(patch.pioneerStartDate); }
    if (patch.goalHours !== undefined) { fields.push('goal_hours = ?'); values.push(patch.goalHours); }
    if (patch.monthlyReference !== undefined) { fields.push('monthly_reference = ?'); values.push(patch.monthlyReference); }
    if (fields.length === 0) return;
    fields.push('updated_at = ?'); values.push(nowTimestamp());
    values.push(id);
    this.db.run(`UPDATE service_year SET ${fields.join(', ')} WHERE id = ?;`, values);
  }

  async setActive(id: string): Promise<void> {
    this.db.transaction(() => {
      this.db.run('UPDATE service_year SET is_active = 0 WHERE is_active = 1;');
      this.db.run('UPDATE service_year SET is_active = 1, updated_at = ? WHERE id = ?;', [nowTimestamp(), id]);
    });
  }
}

// ---- Settings -------------------------------------------------------------
export class SqliteSettingsRepository implements SettingsRepository {
  constructor(private db: Database) {}

  async get(key: string): Promise<string | null> {
    const r = this.db.get<{ value: string | null }>('SELECT value FROM app_config WHERE key = ?;', [key]);
    return r ? r.value : null;
  }

  async set(key: string, value: string): Promise<void> {
    this.db.run(
      `INSERT INTO app_config (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
      [key, value],
    );
  }

  async getAll(): Promise<Record<string, string>> {
    const rows = this.db.all<{ key: string; value: string | null }>('SELECT key, value FROM app_config;');
    const out: Record<string, string> = {};
    for (const r of rows) if (r.value !== null) out[r.key] = r.value;
    return out;
  }
}
