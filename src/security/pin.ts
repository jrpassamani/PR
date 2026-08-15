/**
 * PIN de acesso. NUNCA armazenamos o PIN em texto puro: guardamos apenas
 * um hash SHA-256 com salt aleatório, ambos no SecureStore.
 */
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const PIN_HASH = 'pin_hash_v1';
const PIN_SALT = 'pin_salt_v1';

function toHex(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return s;
}

async function hash(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

/** Comparação de strings em tempo constante (evita timing side-channel). */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hasPin(): Promise<boolean> {
  return (await SecureStore.getItemAsync(PIN_HASH)) !== null;
}

export async function setPin(pin: string): Promise<void> {
  const salt = toHex(Crypto.getRandomBytes(16));
  const h = await hash(pin, salt);
  await SecureStore.setItemAsync(PIN_SALT, salt);
  await SecureStore.setItemAsync(PIN_HASH, h);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const salt = await SecureStore.getItemAsync(PIN_SALT);
  const stored = await SecureStore.getItemAsync(PIN_HASH);
  if (!salt || !stored) return false;
  const h = await hash(pin, salt);
  return constantTimeEqual(h, stored);
}
