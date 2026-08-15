/**
 * Cliente de banco. Abstrai o driver para manter os repositórios independentes
 * (facilita testes e uma futura troca/sync). Implementação padrão: op-sqlite
 * com SQLCipher (criptografia em repouso — R18).
 */
import { open, type Scalar } from '@op-engineering/op-sqlite';
import { getDatabaseKey } from '@/security/keystore';
import { runMigrations } from '@/db/migrations';

type OpDB = ReturnType<typeof open>;

const DB_NAME = 'pioneiro.db';

/** Interface mínima usada por toda a camada de dados. */
export interface Database {
  run(sql: string, params?: unknown[]): void;
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[];
  get<T = Record<string, unknown>>(sql: string, params?: unknown[]): T | null;
  transaction(fn: () => void): void;
}

function wrap(op: OpDB): Database {
  const exec = (sql: string, params: unknown[] = []) => op.executeSync(sql, params as Scalar[]);
  return {
    run(sql, params = []) {
      exec(sql, params);
    },
    all<T>(sql: string, params: unknown[] = []) {
      return (exec(sql, params).rows ?? []) as T[];
    },
    get<T>(sql: string, params: unknown[] = []) {
      const rows = (exec(sql, params).rows ?? []) as T[];
      return rows.length ? rows[0] : null;
    },
    transaction(fn) {
      exec('BEGIN');
      try {
        fn();
        exec('COMMIT');
      } catch (e) {
        exec('ROLLBACK');
        throw e;
      }
    },
  };
}

let _db: Database | null = null;

/**
 * Abre (uma vez) o banco cifrado e aplica migrações.
 * A chave vem do SecureStore (Keychain/Keystore do SO).
 */
export async function getDatabase(): Promise<Database> {
  if (_db) return _db;
  const encryptionKey = await getDatabaseKey();
  const op = open({ name: DB_NAME, encryptionKey });
  const db = wrap(op);
  db.run('PRAGMA foreign_keys = ON;');
  runMigrations(db);
  _db = db;
  return db;
}

/** Fecha a referência em memória (usado ao bloquear/limpar). */
export function resetDatabaseHandle(): void {
  _db = null;
}
