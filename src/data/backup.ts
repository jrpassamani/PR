/**
 * Backup manual (R19): exportar/importar arquivo. Sem nuvem.
 * JSON = backup completo (restaurável). CSV = leitura/planilha.
 *
 * ATENÇÃO: o arquivo exportado NÃO é criptografado — oriente o usuário a
 * guardá-lo em local seguro. (Criptografia opcional de backup fica para depois.)
 */
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDatabase } from '@/db/client';
import { nowTimestamp } from '@/utils/today';
import { CATEGORY_SHORT_LABELS, type CategoryKey } from '@/domain/types';

const BACKUP_VERSION = 1;

interface BackupFile {
  app: 'pioneiro-horas';
  version: number;
  exportedAt: string;
  serviceYears: Record<string, unknown>[];
  activities: Record<string, unknown>[];
  settings: Record<string, unknown>[];
}

async function buildBackup(): Promise<BackupFile> {
  const db = await getDatabase();
  return {
    app: 'pioneiro-horas',
    version: BACKUP_VERSION,
    exportedAt: nowTimestamp(),
    serviceYears: db.all('SELECT * FROM service_year;'),
    activities: db.all('SELECT * FROM activity;'),
    settings: db.all('SELECT * FROM app_config;'),
  };
}

async function writeAndShare(filename: string, content: string, mime: string) {
  const uri = FileSystem.cacheDirectory + filename;
  await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: mime, dialogTitle: 'Backup — Horas do Pioneiro' });
  }
  return uri;
}

/** Exporta backup completo em JSON e abre o compartilhamento. */
export async function exportBackupJson(): Promise<void> {
  const backup = await buildBackup();
  const stamp = backup.exportedAt.slice(0, 10);
  await writeAndShare(`horas-pioneiro-${stamp}.json`, JSON.stringify(backup, null, 2), 'application/json');
}

/** Exporta as atividades em CSV (para planilha). */
export async function exportActivitiesCsv(): Promise<void> {
  const db = await getDatabase();
  const rows = db.all<{
    activity_date: string;
    category_key: string;
    duration_minutes: number;
    note: string | null;
    created_at: string;
    is_deleted: number;
  }>('SELECT * FROM activity WHERE is_deleted = 0 ORDER BY activity_date;');

  const header = 'data;categoria;minutos;horas;observacao;lancado_em';
  const lines = rows.map((r) => {
    const horas = (r.duration_minutes / 60).toFixed(2).replace('.', ',');
    const cat = CATEGORY_SHORT_LABELS[r.category_key as CategoryKey] ?? r.category_key;
    const note = (r.note ?? '').replace(/[;\n\r]/g, ' ');
    return `${r.activity_date};${cat};${r.duration_minutes};${horas};${note};${r.created_at}`;
  });
  const csv = [header, ...lines].join('\n');
  const stamp = nowTimestamp().slice(0, 10);
  await writeAndShare(`horas-pioneiro-${stamp}.csv`, csv, 'text/csv');
}

/**
 * Importa um backup JSON (merge por id: insere o que não existe).
 * Retorna a quantidade de registros importados.
 */
export async function importBackupJson(): Promise<{ years: number; activities: number } | null> {
  const picked = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
  if (picked.canceled || !picked.assets?.[0]) return null;

  const content = await FileSystem.readAsStringAsync(picked.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
  const data = JSON.parse(content) as BackupFile;
  if (data.app !== 'pioneiro-horas' || !Array.isArray(data.serviceYears) || !Array.isArray(data.activities)) {
    throw new Error('Arquivo de backup inválido.');
  }

  const validYear = (y: Record<string, unknown>) =>
    typeof y.id === 'string' && typeof y.start_date === 'string' && typeof y.end_date === 'string';
  const validActivity = (a: Record<string, unknown>) =>
    typeof a.id === 'string' &&
    typeof a.service_year_id === 'string' &&
    typeof a.category_key === 'string' &&
    typeof a.activity_date === 'string' &&
    Number.isFinite(Number(a.duration_minutes));

  const db = await getDatabase();
  let years = 0;
  let activities = 0;

  db.transaction(() => {
    for (const y of data.serviceYears ?? []) {
      if (!validYear(y)) continue;
      db.run(
        `INSERT OR IGNORE INTO service_year
           (id, start_date, end_date, pioneer_start_date, goal_hours, monthly_reference, is_active, created_at, updated_at, is_deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [y.id, y.start_date, y.end_date, y.pioneer_start_date, y.goal_hours, y.monthly_reference, 0, y.created_at, y.updated_at, y.is_deleted ?? 0],
      );
      years++;
    }
    for (const a of data.activities ?? []) {
      if (!validActivity(a)) continue;
      db.run(
        `INSERT OR IGNORE INTO activity
           (id, service_year_id, category_key, activity_date, duration_minutes, note, created_at, updated_at, is_deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [a.id, a.service_year_id, a.category_key, a.activity_date, a.duration_minutes, a.note ?? null, a.created_at, a.updated_at, a.is_deleted ?? 0],
      );
      activities++;
    }
  });

  return { years, activities };
}
