/**
 * Migrações versionadas via PRAGMA user_version.
 * Sempre adicionar novos passos ao final para não quebrar bancos existentes.
 */
import type { Database } from '@/db/client';
import { SCHEMA_STATEMENTS, CATEGORY_SEED } from '@/db/schema';

const MIGRATIONS: Array<(db: Database) => void> = [
  // v1 -> cria schema base + seed de categorias
  (db) => {
    for (const stmt of SCHEMA_STATEMENTS) db.run(stmt);
    for (const c of CATEGORY_SEED) {
      db.run(
        `INSERT OR IGNORE INTO category (key, label, sort, active) VALUES (?, ?, ?, 1);`,
        [c.key, c.label, c.sort],
      );
    }
  },
];

export function runMigrations(db: Database): void {
  const row = db.get<{ user_version: number }>('PRAGMA user_version;');
  const current = row?.user_version ?? 0;
  db.transaction(() => {
    for (let v = current; v < MIGRATIONS.length; v++) {
      MIGRATIONS[v](db);
    }
    // PRAGMA não aceita bind param; valor vem do length (inteiro controlado).
    db.run(`PRAGMA user_version = ${MIGRATIONS.length};`);
  });
}
