import { test } from 'node:test';
import assert from 'node:assert/strict';

import { visibleServiceYears } from '@/domain/serviceYears';
import type { ServiceYear } from '@/domain/types';

function sy(id: string, active: boolean, deleted = false): ServiceYear {
  return {
    id,
    startDate: '2025-09-01',
    endDate: '2026-08-31',
    pioneerStartDate: '2025-09-01',
    goalHours: 600,
    monthlyReference: 50,
    isActive: active,
    createdAt: '2025-09-01T00:00:00.000Z',
    updatedAt: '2025-09-01T00:00:00.000Z',
    isDeleted: deleted,
  };
}

const YEARS = [sy('a', true), sy('b', false), sy('c', false, true)];

test('keepHistory=true mostra todos os anos vivos (exclui apagados)', () => {
  const v = visibleServiceYears(YEARS, true);
  assert.deepEqual(v.map((y) => y.id), ['a', 'b']);
});

test('keepHistory=false mostra apenas o ano ativo', () => {
  const v = visibleServiceYears(YEARS, false);
  assert.deepEqual(v.map((y) => y.id), ['a']);
});

test('anos soft-deleted nunca aparecem, em qualquer modo', () => {
  assert.ok(!visibleServiceYears(YEARS, true).some((y) => y.id === 'c'));
  assert.ok(!visibleServiceYears(YEARS, false).some((y) => y.id === 'c'));
});
