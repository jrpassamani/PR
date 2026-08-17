import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes as nodeRandom } from 'node:crypto';

import {
  encryptBackup,
  decryptBackup,
  assertEnvelope,
  BackupError,
  BACKUP_FORMAT,
  type BackupEnvelope,
} from '@/security/backupCrypto';

const rng = (n: number) => new Uint8Array(nodeRandom(n));
// KDF leve só para os testes rodarem rápido (a validação de params aceita).
const fast = { N: 1024, r: 8, p: 1, dkLen: 32 as const };

const PWD = 'senha-forte-123';
const PAYLOAD = JSON.stringify({ app: 'pioneiro-horas', version: 1, activities: [1, 2, 3] });

const isCode = (code: string) => (e: unknown) => e instanceof BackupError && e.code === code;

test('roundtrip: decifra o que foi cifrado com a senha correta', async () => {
  const env = await encryptBackup(PAYLOAD, PWD, rng, { kdfParams: fast });
  assert.equal(env.format, BACKUP_FORMAT);
  assert.equal(env.version, 1);
  assert.equal(await decryptBackup(env, PWD), PAYLOAD);
});

test('senha incorreta falha com BackupError(password)', async () => {
  const env = await encryptBackup(PAYLOAD, PWD, rng, { kdfParams: fast });
  await assert.rejects(() => decryptBackup(env, 'senha-errada-000'), isCode('password'));
});

test('payload adulterado é detectado (GCM autenticado)', async () => {
  const env = await encryptBackup(PAYLOAD, PWD, rng, { kdfParams: fast });
  const bytes = env.payload.split('');
  bytes[bytes.length - 1] = bytes[bytes.length - 1] === '0' ? '1' : '0';
  const tampered: BackupEnvelope = { ...env, payload: bytes.join('') };
  await assert.rejects(() => decryptBackup(tampered, PWD), isCode('password'));
});

test('arquivo truncado falha', async () => {
  const env = await encryptBackup(PAYLOAD, PWD, rng, { kdfParams: fast });
  const truncated: BackupEnvelope = { ...env, payload: env.payload.slice(0, env.payload.length - 8) };
  await assert.rejects(() => decryptBackup(truncated, PWD), BackupError);
});

test('iv adulterado falha', async () => {
  const env = await encryptBackup(PAYLOAD, PWD, rng, { kdfParams: fast });
  const bad: BackupEnvelope = { ...env, encryption: { ...env.encryption, iv: '00'.repeat(12) } };
  await assert.rejects(() => decryptBackup(bad, PWD), isCode('password'));
});

test('formato desconhecido é rejeitado', () => {
  assert.throws(() => assertEnvelope({ format: 'outro-app', version: 1 }), isCode('format'));
  assert.throws(() => assertEnvelope(null), isCode('format'));
});

test('versão de envelope não suportada é rejeitada', async () => {
  const env = await encryptBackup(PAYLOAD, PWD, rng, { kdfParams: fast });
  const future = { ...env, version: 99 };
  await assert.rejects(() => decryptBackup(future, PWD), isCode('version'));
});

test('cabeçalho de cripto corrompido é rejeitado (params)', async () => {
  const env = await encryptBackup(PAYLOAD, PWD, rng, { kdfParams: fast });
  const bad = { ...env, encryption: { ...env.encryption, salt: 'ZZZZ-não-hex' } };
  await assert.rejects(() => decryptBackup(bad, PWD), isCode('params'));
});

test('senha muito curta é recusada na cifragem', async () => {
  await assert.rejects(() => encryptBackup(PAYLOAD, '123', rng, { kdfParams: fast }), isCode('password'));
});

test('dois backups da mesma origem usam salt/iv diferentes', async () => {
  const a = await encryptBackup(PAYLOAD, PWD, rng, { kdfParams: fast });
  const b = await encryptBackup(PAYLOAD, PWD, rng, { kdfParams: fast });
  assert.notEqual(a.encryption.salt, b.encryption.salt);
  assert.notEqual(a.encryption.iv, b.encryption.iv);
  assert.notEqual(a.payload, b.payload);
});
