/**
 * Acesso central aos repositórios (singleton), já ligados ao banco cifrado.
 */
import { getDatabase } from '@/db/client';
import {
  SqliteActivityRepository,
  SqliteServiceYearRepository,
  SqliteSettingsRepository,
} from '@/data/sqliteRepositories';
import type {
  ActivityRepository,
  ServiceYearRepository,
  SettingsRepository,
} from '@/data/repositories';

export interface Repositories {
  activities: ActivityRepository;
  serviceYears: ServiceYearRepository;
  settings: SettingsRepository;
}

let _repos: Repositories | null = null;

export async function getRepositories(): Promise<Repositories> {
  if (_repos) return _repos;
  const db = await getDatabase();
  _repos = {
    activities: new SqliteActivityRepository(db),
    serviceYears: new SqliteServiceYearRepository(db),
    settings: new SqliteSettingsRepository(db),
  };
  return _repos;
}
