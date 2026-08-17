/**
 * Backup manual (R19): exportar/importar arquivo. Sem nuvem.
 *
 * O backup JSON é CIFRADO (AES-256-GCM, senha do usuário — Fases 2/3). A senha
 * é independente do PIN e da chave do SQLCipher, informada no momento da
 * exportação/restauração e nunca persistida. O CSV é apenas leitura/planilha
 * (não cifrado, texto claro por natureza — o usuário decide compartilhar).
 *
 * Restore é validado (backupValidation) e transacional; arquivos temporários
 * em cache são removidos após uso (Fase 9).
 */
// SDK 54+ tornou a nova File API o padrão; a API clássica (cacheDirectory,
// read/writeAsStringAsync, deleteAsync) permanece em /legacy. Mantemos a
// clássica para não reescrever a E/S de backup já validada.
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Crypto from 'expo-crypto';
import { getDatabase } from '@/db/client';
import { nowTimestamp } from '@/utils/today';
import { CATEGORY_SHORT_LABELS, type CategoryKey } from '@/domain/types';
import { encryptBackup, decryptBackup, type RandomBytes } from '@/security/backupCrypto';
import {
  assertInnerBackup,
  validateActivities,
  validateServiceYears,
} from '@/data/backupValidation';

const INNER_VERSION = 1;

/** CSPRNG do SO (expo-crypto) como fonte de aleatoriedade da cifra. */
const rng: RandomBytes = (n) => Crypto.getRandomBytes(n);

interface InnerBackup {
  app: 'pioneiro-horas';
  version: number;
  exportedAt: string;
  serviceYears: Record<string, unknown>[];
  activities: Record<string, unknown>[];
  settings: Record<string, unknown>[];
}

export interface CollectionCount {
  received: number;
  valid: number;
  inserted: number;
  ignored: number; // válidas porém já existentes (INSERT OR IGNORE)
  rejected: number; // reprovadas na validação
}

export interface ImportReport {
  years: CollectionCount;
  activities: CollectionCount;
}

async function buildInner(): Promise<InnerBackup> {
  const db = await getDatabase();
  return {
    app: 'pioneiro-horas',
    version: INNER_VERSION,
    exportedAt: nowTimestamp(),
    serviceYears: db.all('SELECT * FROM service_year;'),
    activities: db.all('SELECT * FROM activity;'),
    settings: db.all('SELECT * FROM app_config;'),
  };
}

/** Escreve em cache, compartilha e REMOVE o arquivo temporário depois (Fase 9). */
async function writeShareAndCleanup(filename: string, content: string, mime: string) {
  const uri = FileSystem.cacheDirectory + filename;
  await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: mime, dialogTitle: 'Backup — Horas do Pioneiro' });
    }
  } finally {
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  }
}

/** Exporta backup completo CIFRADO (JSON envelope) e abre o compartilhamento. */
export async function exportEncryptedBackup(password: string): Promise<void> {
  const inner = await buildInner();
  const envelope = await encryptBackup(JSON.stringify(inner), password, rng, {
    createdAt: inner.exportedAt,
  });
  const stamp = inner.exportedAt.slice(0, 10);
  await writeShareAndCleanup(
    `horas-pioneiro-backup-${stamp}.json`,
    JSON.stringify(envelope),
    'application/json',
  );
}

/** Exporta as atividades em CSV (para planilha; texto claro). */
export async function exportActivitiesCsv(): Promise<void> {
  const db = await getDatabase();
  const rows = db.all<{
    activity_date: string;
    category_key: string;
    duration_minutes: number;
    note: string | null;
    created_at: string;
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
  await writeShareAndCleanup(`horas-pioneiro-${stamp}.csv`, csv, 'text/csv');
}

/**
 * Importa um backup CIFRADO. Fluxo (Fase 3): ler → decifrar → validar →
 * transação → contadores honestos. Retorna null se o usuário cancelar o
 * seletor. Lança em senha incorreta / arquivo inválido (mensagens tratadas na UI).
 */
export async function importEncryptedBackup(password: string): Promise<ImportReport | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (picked.canceled || !picked.assets?.[0]) return null;
  const tempUri = picked.assets[0].uri;

  try {
    const raw = await FileSystem.readAsStringAsync(tempUri, { encoding: FileSystem.EncodingType.UTF8 });

    // 1) Parse do envelope + 2) decifragem autenticada (senha/adulteração).
    let envelope: unknown;
    try {
      envelope = JSON.parse(raw);
    } catch {
      throw new Error('Arquivo de backup ilegível (JSON inválido).');
    }
    const decrypted = await decryptBackup(envelope, password); // lança BackupError

    // 3) Parse + validação do conteúdo interno.
    let inner: unknown;
    try {
      inner = JSON.parse(decrypted);
    } catch {
      throw new Error('Conteúdo do backup corrompido.');
    }
    assertInnerBackup(inner);
    const data = inner as InnerBackup;

    const yearsReport = validateServiceYears(data.serviceYears ?? []);

    // Integridade referencial: anos válidos do arquivo ∪ anos já no banco.
    const db = await getDatabase();
    const existingYearIds = db
      .all<{ id: string }>('SELECT id FROM service_year;')
      .map((r) => r.id);
    const knownYearIds = new Set<string>([
      ...existingYearIds,
      ...yearsReport.valid.map((y) => y.id),
    ]);
    const actsReport = validateActivities(data.activities ?? [], knownYearIds);

    // 4) Transação atômica: só as linhas VÁLIDAS entram (tolerante c/ relatório).
    let yearsInserted = 0;
    let actsInserted = 0;
    db.transaction(() => {
      for (const y of yearsReport.valid) {
        yearsInserted += db.run(
          `INSERT OR IGNORE INTO service_year
             (id, start_date, end_date, pioneer_start_date, goal_hours, monthly_reference, is_active, created_at, updated_at, is_deleted)
           VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?);`,
          [y.id, y.start_date, y.end_date, y.pioneer_start_date, y.goal_hours, y.monthly_reference, y.created_at, y.updated_at, y.is_deleted],
        );
      }
      for (const a of actsReport.valid) {
        actsInserted += db.run(
          `INSERT OR IGNORE INTO activity
             (id, service_year_id, category_key, activity_date, duration_minutes, note, created_at, updated_at, is_deleted)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [a.id, a.service_year_id, a.category_key, a.activity_date, a.duration_minutes, a.note, a.created_at, a.updated_at, a.is_deleted],
        );
      }
    });

    return {
      years: {
        received: yearsReport.received,
        valid: yearsReport.valid.length,
        inserted: yearsInserted,
        ignored: yearsReport.valid.length - yearsInserted,
        rejected: yearsReport.rejected.length,
      },
      activities: {
        received: actsReport.received,
        valid: actsReport.valid.length,
        inserted: actsInserted,
        ignored: actsReport.valid.length - actsInserted,
        rejected: actsReport.rejected.length,
      },
    };
  } finally {
    // Fase 9: remove a cópia temporária do arquivo importado.
    await FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {});
  }
}
