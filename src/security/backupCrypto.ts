/**
 * Criptografia de BACKUP (P1-01, Fase 2).
 *
 * Cifra autenticada moderna: AES-256-GCM com chave derivada da SENHA do
 * usuário via scrypt (KDF memory-hard). A senha do backup é INDEPENDENTE do
 * PIN e da chave do SQLCipher (Fase 8.1) — nunca é reutilizada nem persistida.
 *
 * O núcleo é PURO (recebe a fonte de aleatoriedade por injeção), o que permite
 * testá-lo no Node (`node:test`). No app, a aleatoriedade vem do CSPRNG do SO
 * via expo-crypto (ver backup.ts). NÃO implementamos cripto própria: usamos
 * @noble/ciphers e @noble/hashes (auditados, JS puro, sem código nativo).
 *
 * Formato do arquivo (versionado, validável, extensível):
 *   {
 *     format: 'horas-pioneiro-backup',
 *     version: 1,
 *     createdAt: ISO,
 *     encryption: { algorithm, kdf, kdfParams:{N,r,p,dkLen}, salt(hex), iv(hex) },
 *     payload: hex(ciphertext||tag GCM)
 *   }
 * O cabeçalho de `encryption` é ligado ao texto cifrado como AAD: qualquer
 * adulteração dos parâmetros invalida a decifragem (à prova de tampering).
 */
import { gcm } from '@noble/ciphers/aes';
import { scryptAsync } from '@noble/hashes/scrypt';
import { bytesToHex, hexToBytes, utf8ToBytes, bytesToUtf8 } from '@noble/hashes/utils';

export const BACKUP_FORMAT = 'horas-pioneiro-backup' as const;
export const BACKUP_ENVELOPE_VERSION = 1 as const;

/** Parâmetros do scrypt. Guardados no arquivo p/ compat futura. */
export interface KdfParams {
  N: number;
  r: number;
  p: number;
  dkLen: 32;
}
/** Balanceado p/ celular: ~16 MB, sub-segundo em nativo, poucos s em JS puro. */
export const DEFAULT_KDF_PARAMS: KdfParams = { N: 16384, r: 8, p: 1, dkLen: 32 };

export interface BackupEnvelope {
  format: typeof BACKUP_FORMAT;
  version: number;
  createdAt: string;
  encryption: {
    algorithm: 'AES-256-GCM';
    kdf: 'scrypt';
    kdfParams: KdfParams;
    salt: string; // hex
    iv: string; // hex (nonce de 12 bytes)
  };
  payload: string; // hex(ciphertext||tag)
}

export type BackupErrorCode =
  | 'format' // não é um envelope de backup deste app
  | 'version' // versão de envelope não suportada
  | 'params' // parâmetros de cripto inválidos/corrompidos
  | 'password'; // senha incorreta OU arquivo adulterado/truncado (GCM falhou)

export class BackupError extends Error {
  readonly code: BackupErrorCode;
  constructor(code: BackupErrorCode, message: string) {
    super(message);
    this.name = 'BackupError';
    this.code = code;
  }
}

/** Fonte de bytes aleatórios (injetada p/ testabilidade). */
export type RandomBytes = (n: number) => Uint8Array;

const MIN_PASSWORD_LENGTH = 6;

/** AAD que amarra o cabeçalho ao texto cifrado (à prova de adulteração). */
function buildAad(env: Pick<BackupEnvelope, 'format' | 'version' | 'encryption'>): Uint8Array {
  const e = env.encryption;
  const canonical = [
    env.format,
    env.version,
    e.algorithm,
    e.kdf,
    e.kdfParams.N,
    e.kdfParams.r,
    e.kdfParams.p,
    e.kdfParams.dkLen,
    e.salt,
    e.iv,
  ].join('|');
  return utf8ToBytes(canonical);
}

/**
 * Deriva a chave via scrypt ASSÍNCRONO (cede o thread da UI a cada tick),
 * evitando travar a interface / ANR em aparelhos mais fracos.
 */
async function deriveKey(password: string, salt: Uint8Array, params: KdfParams): Promise<Uint8Array> {
  return scryptAsync(utf8ToBytes(password.normalize('NFKC')), salt, {
    N: params.N,
    r: params.r,
    p: params.p,
    dkLen: params.dkLen,
    asyncTick: 10,
  });
}

/**
 * Cifra `plaintext` com uma senha. `rng` fornece salt (16B) e iv (12B).
 * Núcleo puro: no app, passe o CSPRNG do SO (expo-crypto).
 */
export async function encryptBackup(
  plaintext: string,
  password: string,
  rng: RandomBytes,
  opts?: { createdAt?: string; kdfParams?: KdfParams },
): Promise<BackupEnvelope> {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new BackupError('password', `A senha do backup deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }
  const kdfParams = opts?.kdfParams ?? DEFAULT_KDF_PARAMS;
  const salt = rng(16);
  const iv = rng(12);
  const key = await deriveKey(password, salt, kdfParams);

  const header = {
    format: BACKUP_FORMAT,
    version: BACKUP_ENVELOPE_VERSION,
    encryption: {
      algorithm: 'AES-256-GCM' as const,
      kdf: 'scrypt' as const,
      kdfParams,
      salt: bytesToHex(salt),
      iv: bytesToHex(iv),
    },
  };
  const ciphertext = gcm(key, iv, buildAad(header)).encrypt(utf8ToBytes(plaintext));

  return {
    ...header,
    createdAt: opts?.createdAt ?? '',
    payload: bytesToHex(ciphertext),
  };
}

/** Valida a forma do envelope sem tentar decifrar. Lança BackupError. */
export function assertEnvelope(input: unknown): asserts input is BackupEnvelope {
  const env = input as Partial<BackupEnvelope> | null;
  if (!env || typeof env !== 'object') {
    throw new BackupError('format', 'Arquivo de backup inválido.');
  }
  if (env.format !== BACKUP_FORMAT) {
    throw new BackupError('format', 'Este arquivo não é um backup do Horas do Pioneiro.');
  }
  if (env.version !== BACKUP_ENVELOPE_VERSION) {
    throw new BackupError('version', `Versão de backup não suportada (${String(env.version)}).`);
  }
  const e = env.encryption;
  if (
    !e ||
    e.algorithm !== 'AES-256-GCM' ||
    e.kdf !== 'scrypt' ||
    !e.kdfParams ||
    !Number.isInteger(e.kdfParams.N) ||
    !Number.isInteger(e.kdfParams.r) ||
    !Number.isInteger(e.kdfParams.p) ||
    e.kdfParams.dkLen !== 32 ||
    typeof e.salt !== 'string' ||
    typeof e.iv !== 'string' ||
    typeof env.payload !== 'string'
  ) {
    throw new BackupError('params', 'Cabeçalho de criptografia do backup inválido ou corrompido.');
  }
}

/**
 * Decifra um envelope com a senha. Lança BackupError('password') se a senha
 * estiver errada OU se o arquivo tiver sido adulterado/truncado (GCM autentica).
 */
export async function decryptBackup(input: unknown, password: string): Promise<string> {
  assertEnvelope(input);
  const env = input;
  let salt: Uint8Array;
  let iv: Uint8Array;
  let ct: Uint8Array;
  try {
    salt = hexToBytes(env.encryption.salt);
    iv = hexToBytes(env.encryption.iv);
    ct = hexToBytes(env.payload);
  } catch {
    throw new BackupError('params', 'Dados do backup corrompidos (codificação inválida).');
  }
  if (iv.length !== 12 || salt.length === 0 || ct.length === 0) {
    throw new BackupError('params', 'Dados do backup corrompidos.');
  }
  const key = await deriveKey(password, salt, env.encryption.kdfParams);
  try {
    const plain = gcm(key, iv, buildAad(env)).decrypt(ct);
    return bytesToUtf8(plain);
  } catch {
    throw new BackupError('password', 'Senha incorreta ou arquivo de backup adulterado.');
  }
}
