import * as Crypto from 'expo-crypto';

/** UUID v4 (usado como PK — sync-ready). */
export function newId(): string {
  return Crypto.randomUUID();
}
