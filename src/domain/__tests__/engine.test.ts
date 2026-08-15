import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseDuration,
  formatHM,
  formatHuman,
  hoursMinutesToMinutes,
} from '@/utils/duration';
import { serviceYearBoundsFor } from '@/utils/datecore';
import { computeDashboard, getServiceGeometry, type EngineConfig } from '@/domain/engine';
import { computeAnalytics } from '@/domain/analytics';
import type { ActivityInput, CategoryKey } from '@/domain/types';

/** Ano de serviço padrão para os testes: 2025-09-01 .. 2026-08-31 (365 dias). */
const YEAR: EngineConfig = {
  startDate: '2025-09-01',
  endDate: '2026-08-31',
  pioneerStartDate: '2025-09-01',
  goalHours: 600,
  monthlyReference: 50,
};

function act(date: string, minutes: number, category: CategoryKey = 'pregacao'): ActivityInput {
  return { activityDate: date, durationMinutes: minutes, category };
}

function approx(actual: number, expected: number, tol: number, msg?: string) {
  assert.ok(Math.abs(actual - expected) <= tol, `${msg ?? ''} esperado ~${expected}, obtido ${actual}`);
}

// ---------------------------------------------------------------------------
test('duração: parse de formatos naturais', () => {
  assert.equal(parseDuration('1:30').minutes, 90);
  assert.equal(parseDuration('1h30').minutes, 90);
  assert.equal(parseDuration('1h').minutes, 60);
  assert.equal(parseDuration('2h15').minutes, 135);
  assert.equal(parseDuration('90min').minutes, 90);
  assert.equal(parseDuration('45').minutes, 45);
  assert.equal(parseDuration('1,5h').minutes, 90);
  assert.equal(hoursMinutesToMinutes(2, 5), 125);
});

test('duração: validações e formatação', () => {
  assert.equal(parseDuration('0:00').ok, false); // > 0
  assert.equal(parseDuration('1:75').ok, false); // minutos 0-59
  assert.equal(parseDuration('20:00').ok, false); // > 16h
  assert.equal(formatHM(90), '1:30');
  assert.equal(formatHM(5), '0:05');
  assert.equal(formatHuman(90), '1h30');
  assert.equal(formatHuman(45), '45min');
  assert.equal(formatHuman(120), '2h');
});

// ---------------------------------------------------------------------------
test('ano de serviço: limites corretos', () => {
  assert.deepEqual(serviceYearBoundsFor('2026-08-14'), {
    startDate: '2025-09-01',
    endDate: '2026-08-31',
  });
  assert.deepEqual(serviceYearBoundsFor('2025-09-01'), {
    startDate: '2025-09-01',
    endDate: '2026-08-31',
  });
  assert.deepEqual(serviceYearBoundsFor('2025-12-15').startDate, '2025-09-01');
});

// ---------------------------------------------------------------------------
test('linha ideal contínua: meio de setembro ≈ 25h', () => {
  const d = computeDashboard(YEAR, [], '2025-09-15');
  assert.equal(d.elapsedDays, 15);
  // 600h * 15/365 = 24,66h
  approx(d.idealMinutesToday / 60, 24.66, 0.2, 'ideal 15/set');
});

// ---------------------------------------------------------------------------
test('status: bandas 🟢/🟡/🔴 baseadas no acumulado ideal', () => {
  const today = '2026-03-01';
  const ideal = getServiceGeometry(YEAR, today);
  const idealMin =
    ideal.effectiveGoalMinutes * (ideal.elapsedDays / ideal.serviceDays);

  const green = computeDashboard(YEAR, [act('2025-10-10', Math.round(idealMin * 1.0))], today);
  const yellow = computeDashboard(YEAR, [act('2025-10-10', Math.round(idealMin * 0.9))], today);
  const red = computeDashboard(YEAR, [act('2025-10-10', Math.round(idealMin * 0.8))], today);

  assert.equal(green.status, 'green');
  assert.equal(yellow.status, 'yellow');
  assert.equal(red.status, 'red');
});

test('status: mês fraco NÃO derruba quem tem acumulado saudável', () => {
  // Acumulado forte no início; um mês recente fraco. Deve seguir verde.
  const today = '2026-03-01';
  const acts = [
    act('2025-09-15', 20000), // ~333h logo no começo
    act('2026-02-20', 300), // mês fraco recente
  ];
  const d = computeDashboard(YEAR, acts, today);
  assert.equal(d.status, 'green');
});

// ---------------------------------------------------------------------------
test('proração por dias (DD-2): início em 01/12 ≈ 450h', () => {
  const prorated: EngineConfig = { ...YEAR, pioneerStartDate: '2025-12-01' };
  const g = getServiceGeometry(prorated, '2026-01-01');
  assert.equal(g.isProrated, true);
  approx(g.effectiveGoalMinutes / 60, 450.4, 1, 'meta proporcional');
});

// ---------------------------------------------------------------------------
test('ritmo necessário: exemplo do briefing (327h30 → 272h30)', () => {
  const today = '2026-02-28';
  const acts = [act('2025-10-01', 9825), act('2025-11-01', 9825)]; // 19650 min = 327h30
  const d = computeDashboard(YEAR, acts, today);

  assert.equal(d.realizedMinutes, 19650);
  assert.equal(d.remainingMinutes, 16350); // 272h30
  approx(d.remainingMinutes / 60, 272.5, 0.001, 'restante');
  // 184 dias restantes ÷ 30,4375 ≈ 6,05 meses → 272,5 / 6,05 ≈ 45,08 h/mês
  // (o briefing usou 6 meses exatos → 45h25; nosso cálculo é por dias, mais preciso)
  assert.equal(d.daysRemaining, 184);
  approx(d.requiredPacePerMonthHours, 45.08, 0.2, 'ritmo necessário');
});

// ---------------------------------------------------------------------------
test('ritmo atual híbrido: <30 dias usa média desde o início', () => {
  const d = computeDashboard(YEAR, [act('2025-09-05', 1200)], '2025-09-10');
  assert.equal(d.paceBasis, 'sinceStart');
  assert.equal(d.elapsedDays, 10);
  assert.equal(d.currentDailyMinutes, 120); // 1200/10
});

test('ritmo atual híbrido: ≥30 dias usa janela de 30 dias', () => {
  const acts = [
    act('2025-10-01', 5000), // fora da janela
    act('2026-02-15', 3000), // dentro dos últimos 30 dias
  ];
  const d = computeDashboard(YEAR, acts, '2026-03-01');
  assert.equal(d.paceBasis, 'last30');
  assert.equal(d.currentDailyMinutes, 100); // 3000/30
});

test('projeção: mantém o ritmo até o fim do ano', () => {
  const d = computeDashboard(YEAR, [act('2025-09-05', 1200)], '2025-09-10');
  // 1200 + 120/dia * 355 dias restantes = 43800 min = 730h
  assert.equal(d.daysRemaining, 355);
  assert.equal(d.projectedMinutes, 43800);
  assert.equal(d.willReachGoal, true);
});

// ---------------------------------------------------------------------------
test('análises: meses, categorias, médias e linha ideal', () => {
  const acts = [
    act('2025-09-10', 6000, 'pregacao'),
    act('2025-10-05', 3000, 'estudo'),
    act('2026-01-05', 3000, 'pregacao'),
    act('2026-02-02', 1200, 'cartas'),
  ];
  const a = computeAnalytics(YEAR, acts, '2026-08-31'); // fim do ano: 12 meses decorridos

  assert.equal(a.months.length, 12);
  assert.equal(a.months[0].label, 'Set');
  assert.equal(a.months[11].label, 'Ago');
  assert.equal(a.totalMinutes, 13200);

  // Set = 6000, Out = 3000, Jan = 3000, Fev = 1200
  assert.equal(a.months[0].minutes, 6000);
  assert.equal(a.months[1].minutes, 3000);
  assert.equal(a.months[4].minutes, 3000); // Jan
  assert.equal(a.months[5].minutes, 1200); // Fev

  // acumulado final e ideal final = meta cheia
  assert.equal(a.months[11].cumulativeMinutes, 13200);
  approx(a.months[11].idealCumulativeMinutes, 36000, 1, 'ideal acumulado final');

  // categorias
  const pregacao = a.categories.find((c) => c.category === 'pregacao')!;
  assert.equal(pregacao.minutes, 9000);
  approx(pregacao.percent, 68.18, 0.1, '% pregação');

  // maior/menor mês (todos decorridos): maior = Set; menor = mês vazio (0)
  assert.equal(a.maxMonth?.label, 'Set');
  assert.equal(a.minMonth?.minutes, 0);

  assert.equal(a.daysWithActivity, 4);
  approx(a.avgPerActiveDayMinutes, 3300, 0.5, 'média por dia ativo'); // 13200/4
});
