/**
 * Conversão de duração. Fonte da verdade = MINUTOS (inteiros).
 * Entrada padrão da UI: seletor Horas + Minutos (H:MM). Também aceitamos
 * formatos "naturais" na importação/edição manual: "1:30", "1h30", "90min",
 * "1,5h", "45m", "2h".
 */

/** Limite de segurança por lançamento (R7): protege contra erro de digitação. */
export const MAX_DURATION_MINUTES = 16 * 60; // 16:00

export function hoursMinutesToMinutes(hours: number, minutes: number): number {
  return Math.round(hours) * 60 + Math.round(minutes);
}

export function minutesToHM(totalMinutes: number): { hours: number; minutes: number } {
  const m = Math.max(0, Math.round(totalMinutes));
  return { hours: Math.floor(m / 60), minutes: m % 60 };
}

/** Formato "H:MM" (ex.: 90 -> "1:30"). */
export function formatHM(totalMinutes: number): string {
  const { hours, minutes } = minutesToHM(totalMinutes);
  return `${hours}:${String(minutes).padStart(2, '0')}`;
}

/** Formato humano curto (ex.: 90 -> "1h30", 45 -> "45min", 120 -> "2h"). */
export function formatHuman(totalMinutes: number): string {
  const { hours, minutes } = minutesToHM(totalMinutes);
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h${String(minutes).padStart(2, '0')}`;
}

/** Minutos -> horas decimais (para cálculos/gráficos). */
export function minutesToDecimalHours(totalMinutes: number): number {
  return totalMinutes / 60;
}

export interface ParseResult {
  ok: boolean;
  minutes: number;
  error?: string;
}

/**
 * Interpreta uma string de duração em minutos.
 * Retorna { ok:false } com mensagem quando inválida ou fora do limite.
 */
export function parseDuration(raw: string): ParseResult {
  const input = raw.trim().toLowerCase().replace(/\s+/g, '');
  if (input === '') return { ok: false, minutes: 0, error: 'Informe a duração.' };

  let minutes: number | null = null;

  // "1:30" ou "1:5"
  let m = input.match(/^(\d{1,2}):(\d{1,2})$/);
  if (m) {
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (min > 59) return { ok: false, minutes: 0, error: 'Minutos devem ser 0–59.' };
    minutes = h * 60 + min;
  }

  // "1h30", "1h", "2h15", "1h05"
  if (minutes === null) {
    m = input.match(/^(\d{1,2})h(\d{1,2})?$/);
    if (m) {
      const h = Number(m[1]);
      const min = m[2] ? Number(m[2]) : 0;
      if (min > 59) return { ok: false, minutes: 0, error: 'Minutos devem ser 0–59.' };
      minutes = h * 60 + min;
    }
  }

  // "45min" / "45m"
  if (minutes === null) {
    m = input.match(/^(\d{1,4})m(in)?$/);
    if (m) minutes = Number(m[1]);
  }

  // "1,5h" / "1.5h" (horas decimais)
  if (minutes === null) {
    m = input.match(/^(\d+)[.,](\d+)h$/);
    if (m) minutes = Math.round(Number(`${m[1]}.${m[2]}`) * 60);
  }

  // só número -> assume minutos
  if (minutes === null) {
    m = input.match(/^(\d{1,4})$/);
    if (m) minutes = Number(m[1]);
  }

  if (minutes === null) {
    return { ok: false, minutes: 0, error: 'Formato inválido. Use, ex.: 1:30, 1h30, 90min.' };
  }
  if (minutes <= 0) {
    return { ok: false, minutes: 0, error: 'A duração deve ser maior que zero.' };
  }
  if (minutes > MAX_DURATION_MINUTES) {
    return { ok: false, minutes, error: `Máximo por lançamento: ${formatHM(MAX_DURATION_MINUTES)}.` };
  }
  return { ok: true, minutes };
}
