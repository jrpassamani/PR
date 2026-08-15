/**
 * Gerência da CHAVE DE CRIPTOGRAFIA do banco (SQLCipher).
 * A chave é gerada uma única vez, guardada no SecureStore do SO
 * (Keychain no iOS / Keystore no Android) e nunca deixa o dispositivo.
 */
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const DB_KEY_NAME = 'db_encryption_key_v1';

function toHex(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return s;
}

/** Retorna a chave existente ou cria uma nova (256 bits) de forma segura. */
export async function getDatabaseKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DB_KEY_NAME);
  if (existing) return existing;
  const key = toHex(Crypto.getRandomBytes(32));
  await SecureStore.setItemAsync(DB_KEY_NAME, key, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return key;
}
