/**
 * Validação de RESTORE (P1-02/03, Fase 3). PURO e testável (sem expo/DB).
 *
 * Antes de tocar no banco, o conteúdo decifrado é validado campo a campo:
 * formato, versão, UUID, datas reais, faixa de duração, categoria conhecida,
 * limites e integridade referencial (ano de serviço). Linhas inválidas são
 * REJEITADAS com motivo; as válidas são normalizadas. A política é tolerante
 * (importa válidas, ignora inválidas) com CONTADORES HONESTOS — o caller
 * distingue recebidos/válidos/inseridos/ignorados (Fase 3.2).
 */
import { CATEGORY_KEYS, type CategoryKey } from '@/domain/types';

export const INNER_APP_TAG = 'pioneiro-horas';
export const INNER_MAX_VERSION = 1;

/** Uma atividade não pode exceder 24h (1440 min) por lançamento. */
export const MAX_DURATION_MINUTES = 24 * 60;
export const MAX_GOAL_HOURS = 100_000;
export const MAX_MONTHLY_REFERENCE = 10_000;

const CATEGORY_SET = new Set<string>(CATEGORY_KEYS);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface ValidServiceYear {
  id: string;
  start_date: string;
  end_date: string;
  pioneer_start_date: string;
  goal_hours: number;
  monthly_reference: number;
  created_at: string;
  updated_at: string;
  is_deleted: number;
}

export interface ValidActivity {
  id: string;
  service_year_id: string;
  category_key: CategoryKey;
  activity_date: string;
  duration_minutes: number;
  note: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: number;
}

export interface Rejection {
  index: number;
  reason: string;
}

export interface CollectionReport<T> {
  received: number;
  valid: T[];
  rejected: Rejection[];
}

export interface InnerBackup {
  app?: unknown;
  version?: unknown;
  serviceYears?: unknown;
  activities?: unknown;
  settings?: unknown;
}

// ---- primitivos -----------------------------------------------------------

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

/** Data ISO "YYYY-MM-DD" que existe de fato no calendário (rejeita 2025-02-30). */
export function isRealIsoDate(v: unknown): v is string {
  if (typeof v !== 'string' || !ISO_DATE_RE.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function isIsoTimestamp(v: unknown): v is string {
  return typeof v === 'string' && v.length >= 10 && !Number.isNaN(Date.parse(v));
}

function coerceBit(v: unknown): number {
  return v === 1 || v === '1' || v === true ? 1 : 0;
}

// ---- validação do envelope interno ---------------------------------------

/** Valida o cabeçalho do JSON interno (após decifrar). Lança Error com msg. */
export function assertInnerBackup(data: unknown): asserts data is InnerBackup {
  const d = data as InnerBackup | null;
  if (!d || typeof d !== 'object') throw new Error('Conteúdo de backup inválido.');
  if (d.app !== INNER_APP_TAG) throw new Error('Este backup não pertence ao Horas do Pioneiro.');
  if (typeof d.version !== 'number' || d.version < 1 || d.version > INNER_MAX_VERSION) {
    throw new Error(`Versão de dados do backup não suportada (${String(d.version)}).`);
  }
  if (!Array.isArray(d.serviceYears) || !Array.isArray(d.activities)) {
    throw new Error('Estrutura do backup inválida (anos/atividades ausentes).');
  }
}

// ---- validação de linhas --------------------------------------------------

export function validateServiceYears(rows: unknown[]): CollectionReport<ValidServiceYear> {
  const valid: ValidServiceYear[] = [];
  const rejected: Rejection[] = [];
  rows.forEach((raw, index) => {
    const r = raw as Record<string, unknown>;
    const fail = (reason: string) => rejected.push({ index, reason });
    if (!r || typeof r !== 'object') return fail('linha não é objeto');
    if (!isUuid(r.id)) return fail('id não é UUID');
    if (!isRealIsoDate(r.start_date)) return fail('start_date inválida');
    if (!isRealIsoDate(r.end_date)) return fail('end_date inválida');
    if (!isRealIsoDate(r.pioneer_start_date)) return fail('pioneer_start_date inválida');
    if (r.start_date > r.end_date) return fail('start_date após end_date');
    const goal = Number(r.goal_hours);
    if (!Number.isInteger(goal) || goal < 1 || goal > MAX_GOAL_HOURS) return fail('goal_hours fora do limite');
    const monthly = Number(r.monthly_reference);
    if (!Number.isInteger(monthly) || monthly < 1 || monthly > MAX_MONTHLY_REFERENCE) {
      return fail('monthly_reference fora do limite');
    }
    if (!isIsoTimestamp(r.created_at) || !isIsoTimestamp(r.updated_at)) return fail('timestamps inválidos');
    valid.push({
      id: r.id,
      start_date: r.start_date,
      end_date: r.end_date,
      pioneer_start_date: r.pioneer_start_date,
      goal_hours: goal,
      monthly_reference: monthly,
      created_at: r.created_at,
      updated_at: r.updated_at,
      is_deleted: coerceBit(r.is_deleted),
    });
  });
  return { received: rows.length, valid, rejected };
}

/**
 * Valida atividades. `knownYearIds` é o conjunto de anos aceitáveis
 * (os válidos do arquivo ∪ os já existentes no banco) para checar integridade
 * referencial ANTES de inserir.
 */
export function validateActivities(
  rows: unknown[],
  knownYearIds: Set<string>,
): CollectionReport<ValidActivity> {
  const valid: ValidActivity[] = [];
  const rejected: Rejection[] = [];
  rows.forEach((raw, index) => {
    const r = raw as Record<string, unknown>;
    const fail = (reason: string) => rejected.push({ index, reason });
    if (!r || typeof r !== 'object') return fail('linha não é objeto');
    if (!isUuid(r.id)) return fail('id não é UUID');
    if (!isUuid(r.service_year_id)) return fail('service_year_id não é UUID');
    if (!knownYearIds.has(r.service_year_id as string)) return fail('ano de serviço inexistente (órfã)');
    if (typeof r.category_key !== 'string' || !CATEGORY_SET.has(r.category_key)) {
      return fail('categoria desconhecida');
    }
    if (!isRealIsoDate(r.activity_date)) return fail('activity_date inválida');
    const dur = Number(r.duration_minutes);
    if (!Number.isInteger(dur)) return fail('duração não é inteiro');
    if (dur <= 0) return fail('duração não positiva');
    if (dur > MAX_DURATION_MINUTES) return fail('duração absurda (> 24h)');
    if (r.note != null && typeof r.note !== 'string') return fail('note com tipo inválido');
    if (!isIsoTimestamp(r.created_at) || !isIsoTimestamp(r.updated_at)) return fail('timestamps inválidos');
    valid.push({
      id: r.id,
      service_year_id: r.service_year_id as string,
      category_key: r.category_key as CategoryKey,
      activity_date: r.activity_date,
      duration_minutes: dur,
      note: r.note == null ? null : (r.note as string),
      created_at: r.created_at,
      updated_at: r.updated_at,
      is_deleted: coerceBit(r.is_deleted),
    });
  });
  return { received: rows.length, valid, rejected };
}
