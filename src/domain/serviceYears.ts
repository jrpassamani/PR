/**
 * Regras puras de visibilidade de Anos de Serviço (keepHistory, Fase 10/P2-06).
 *
 * O toggle "Manter anos anteriores" passa a ter efeito REAL: quando desligado,
 * apenas o ano ATIVO fica visível/consultável (troca de ano oculta) — os dados
 * dos anos anteriores permanecem no banco (não são apagados), então o backup e
 * a reativação continuam possíveis. Ligar de novo revela o histórico.
 */
import type { ServiceYear } from '@/domain/types';

/** Anos que devem aparecer nas telas de histórico/troca de ano. */
export function visibleServiceYears(all: ServiceYear[], keepHistory: boolean): ServiceYear[] {
  const live = all.filter((y) => !y.isDeleted);
  if (keepHistory) return live;
  return live.filter((y) => y.isActive);
}
