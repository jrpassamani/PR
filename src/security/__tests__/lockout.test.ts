import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  nextLockoutUntil,
  FAILURE_THRESHOLD,
  BASE_LOCKOUT_MS,
  MAX_LOCKOUT_MS,
} from '@/security/lockoutPolicy';

const NOW = 1_000_000;

test('abaixo do limite não bloqueia', () => {
  for (let a = 0; a < FAILURE_THRESHOLD; a++) {
    assert.equal(nextLockoutUntil(a, NOW), null, `attempts=${a}`);
  }
});

test('no limite aplica o lockout base (30s)', () => {
  assert.equal(nextLockoutUntil(FAILURE_THRESHOLD, NOW), NOW + BASE_LOCKOUT_MS);
});

test('lockout dobra a cada erro adicional', () => {
  assert.equal(nextLockoutUntil(FAILURE_THRESHOLD + 1, NOW), NOW + BASE_LOCKOUT_MS * 2);
  assert.equal(nextLockoutUntil(FAILURE_THRESHOLD + 2, NOW), NOW + BASE_LOCKOUT_MS * 4);
  assert.equal(nextLockoutUntil(FAILURE_THRESHOLD + 3, NOW), NOW + BASE_LOCKOUT_MS * 8);
});

test('lockout satura no máximo (5min)', () => {
  const until = nextLockoutUntil(FAILURE_THRESHOLD + 20, NOW);
  assert.equal(until, NOW + MAX_LOCKOUT_MS);
});
