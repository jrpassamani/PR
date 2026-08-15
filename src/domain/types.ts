/**
 * Tipos centrais do domínio.
 *
 * Regras de negócio consolidadas (ver README > Regras):
 * - Ano de Serviço: 01/set -> 31/ago.
 * - Meta padrão 600h (configurável), régua linear 50h/mês (configurável).
 * - 1h de qualquer atividade = 1h para a meta (peso igual). Categorias separadas
 *   apenas para análise.
 * - Duração armazenada SEMPRE em minutos (fonte da verdade).
 * - Atividade contabiliza no mês/ano da `activityDate` (data da atividade),
 *   independente de quando foi lançada (`createdAt`).
 */

/** Chaves fixas das categorias (v1). Editáveis no futuro via tabela `category`. */
export const CATEGORY_KEYS = [
  'pregacao',
  'estudo',
  'tpe',
  'tpl',
  'cartas',
  'credito',
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  pregacao: 'Pregação',
  estudo: 'Estudo Bíblico',
  tpe: 'TPE — Testemunho Público Especial',
  tpl: 'TPL — Testemunho Público Local',
  cartas: 'Cartas',
  credito: 'Crédito de Horas',
};

export const CATEGORY_SHORT_LABELS: Record<CategoryKey, string> = {
  pregacao: 'Pregação',
  estudo: 'Estudo',
  tpe: 'TPE',
  tpl: 'TPL',
  cartas: 'Cartas',
  credito: 'Crédito',
};

/** Data no formato ISO "YYYY-MM-DD" (apenas a data, sem hora). */
export type IsoDate = string;

/** Timestamp ISO completo (data + hora), usado em createdAt/updatedAt. */
export type IsoTimestamp = string;

/**
 * Configuração de um Ano de Serviço.
 * `pioneerStartDate` habilita a META PROPORCIONAL (DD-2): quando o pioneiro
 * inicia depois de 01/set, meta e linha ideal partem dessa data.
 */
export interface ServiceYear {
  id: string;
  /** Início do ano de serviço: sempre AAAA-09-01. */
  startDate: IsoDate;
  /** Fim do ano de serviço: sempre (AAAA+1)-08-31. */
  endDate: IsoDate;
  /** Data de início do serviço no ano (>= startDate). Base da proração. */
  pioneerStartDate: IsoDate;
  /** Meta anual em horas (padrão 600). */
  goalHours: number;
  /** Régua de referência mensal em horas (padrão 50). Apenas informativa. */
  monthlyReference: number;
  isActive: boolean;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  isDeleted: boolean;
}

/** Uma atividade registrada. */
export interface Activity {
  id: string;
  serviceYearId: string;
  category: CategoryKey;
  /** Data da atividade (contabiliza aqui). */
  activityDate: IsoDate;
  /** Duração em minutos (fonte da verdade). */
  durationMinutes: number;
  note: string | null;
  /** Momento do lançamento (retroativo distingue de activityDate). */
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  isDeleted: boolean;
}

/** Entrada mínima que o motor de cálculo precisa de cada atividade. */
export interface ActivityInput {
  category: CategoryKey;
  activityDate: IsoDate;
  durationMinutes: number;
}

export type StatusLevel = 'green' | 'yellow' | 'red' | 'neutral';
