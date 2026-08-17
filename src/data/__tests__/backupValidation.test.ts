import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isUuid,
  isRealIsoDate,
  assertInnerBackup,
  validateServiceYears,
  validateActivities,
  MAX_DURATION_MINUTES,
} from '@/data/backupValidation';

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';
const TS = '2025-09-01T10:00:00.000Z';

function year(over: Record<string, unknown> = {}) {
  return {
    id: UUID_A,
    start_date: '2025-09-01',
    end_date: '2026-08-31',
    pioneer_start_date: '2025-09-01',
    goal_hours: 600,
    monthly_reference: 50,
    created_at: TS,
    updated_at: TS,
    is_deleted: 0,
    ...over,
  };
}
function activity(over: Record<string, unknown> = {}) {
  return {
    id: UUID_B,
    service_year_id: UUID_A,
    category_key: 'pregacao',
    activity_date: '2025-09-15',
    duration_minutes: 120,
    note: null,
    created_at: TS,
    updated_at: TS,
    is_deleted: 0,
    ...over,
  };
}

test('isUuid aceita UUID válido e rejeita lixo', () => {
  assert.ok(isUuid(UUID_A));
  assert.ok(!isUuid('não-uuid'));
  assert.ok(!isUuid(123));
  assert.ok(!isUuid(''));
});

test('isRealIsoDate rejeita datas impossíveis e aceita bissexto', () => {
  assert.ok(isRealIsoDate('2024-02-29')); // 2024 é bissexto
  assert.ok(!isRealIsoDate('2025-02-29')); // 2025 não é
  assert.ok(!isRealIsoDate('2025-13-01'));
  assert.ok(!isRealIsoDate('2025-00-10'));
  assert.ok(!isRealIsoDate('2025-1-1'));
  assert.ok(!isRealIsoDate('ontem'));
});

test('assertInnerBackup exige app e versão suportada', () => {
  assert.doesNotThrow(() => assertInnerBackup({ app: 'pioneiro-horas', version: 1, serviceYears: [], activities: [] }));
  assert.throws(() => assertInnerBackup({ app: 'outro', version: 1, serviceYears: [], activities: [] }));
  assert.throws(() => assertInnerBackup({ app: 'pioneiro-horas', version: 99, serviceYears: [], activities: [] }));
  assert.throws(() => assertInnerBackup({ app: 'pioneiro-horas', version: 1 }));
});

test('validateServiceYears: linha boa passa, ruins são rejeitadas com motivo', () => {
  const r = validateServiceYears([
    year(),
    year({ id: 'x' }), // uuid ruim
    year({ start_date: '2026-01-01', end_date: '2025-01-01' }), // start > end
    year({ goal_hours: -5 }), // fora do limite
    year({ start_date: '2025-02-30' }), // data impossível
  ]);
  assert.equal(r.received, 5);
  assert.equal(r.valid.length, 1);
  assert.equal(r.rejected.length, 4);
});

test('validateActivities: rejeita órfã, categoria ruim, duração negativa/absurda', () => {
  const known = new Set([UUID_A]);
  const r = validateActivities(
    [
      activity(),
      activity({ id: '33333333-3333-4333-8333-333333333333', service_year_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff' }), // órfã
      activity({ id: '44444444-4444-4444-8444-444444444444', category_key: 'inexistente' }),
      activity({ id: '55555555-5555-4555-8555-555555555555', duration_minutes: -10 }),
      activity({ id: '66666666-6666-4666-8666-666666666666', duration_minutes: MAX_DURATION_MINUTES + 1 }),
      activity({ id: '77777777-7777-4777-8777-777777777777', duration_minutes: 0 }),
      activity({ id: '88888888-8888-4888-8888-888888888888', activity_date: 'xx' }),
    ],
    known,
  );
  assert.equal(r.received, 7);
  assert.equal(r.valid.length, 1);
  assert.equal(r.rejected.length, 6);
  // motivos legíveis
  assert.ok(r.rejected.some((x) => /órfã/.test(x.reason)));
  assert.ok(r.rejected.some((x) => /categoria/.test(x.reason)));
});

test('validateActivities: campos ausentes/tipos errados são rejeitados; extras ignorados', () => {
  const known = new Set([UUID_A]);
  const r = validateActivities(
    [
      activity({ campoExtra: 'ignorado' }), // extra não atrapalha
      { id: UUID_B }, // faltando quase tudo
      activity({ id: '99999999-9999-4999-8999-999999999999', duration_minutes: '120abc' }),
    ],
    known,
  );
  assert.equal(r.valid.length, 1);
  assert.equal(r.valid[0].note, null);
  assert.equal(r.rejected.length, 2);
});

test('is_deleted é coagido para 0/1', () => {
  const r = validateServiceYears([year({ is_deleted: '1' }), year({ id: UUID_B, is_deleted: true })]);
  assert.equal(r.valid.length, 2);
  assert.equal(r.valid[0].is_deleted, 1);
  assert.equal(r.valid[1].is_deleted, 1);
});
