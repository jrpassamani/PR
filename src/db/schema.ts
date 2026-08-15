/**
 * DDL do banco. Campos "sync-ready" (uuid, updated_at, is_deleted) já presentes
 * para permitir backup/sincronização futura SEM alterar o schema.
 */
export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS service_year (
     id                  TEXT PRIMARY KEY NOT NULL,
     start_date          TEXT NOT NULL,          -- AAAA-09-01
     end_date            TEXT NOT NULL,          -- (AAAA+1)-08-31
     pioneer_start_date  TEXT NOT NULL,          -- base da proração
     goal_hours          INTEGER NOT NULL DEFAULT 600,
     monthly_reference   INTEGER NOT NULL DEFAULT 50,
     is_active           INTEGER NOT NULL DEFAULT 1,
     created_at          TEXT NOT NULL,
     updated_at          TEXT NOT NULL,
     is_deleted          INTEGER NOT NULL DEFAULT 0
   );`,

  `CREATE TABLE IF NOT EXISTS category (
     key      TEXT PRIMARY KEY NOT NULL,
     label    TEXT NOT NULL,
     sort     INTEGER NOT NULL DEFAULT 0,
     active   INTEGER NOT NULL DEFAULT 1
   );`,

  `CREATE TABLE IF NOT EXISTS activity (
     id                TEXT PRIMARY KEY NOT NULL,
     service_year_id   TEXT NOT NULL,
     category_key      TEXT NOT NULL,
     activity_date     TEXT NOT NULL,           -- YYYY-MM-DD (contabiliza aqui)
     duration_minutes  INTEGER NOT NULL,        -- fonte da verdade
     note              TEXT,
     created_at        TEXT NOT NULL,           -- momento do lançamento
     updated_at        TEXT NOT NULL,
     is_deleted        INTEGER NOT NULL DEFAULT 0,
     FOREIGN KEY (service_year_id) REFERENCES service_year (id),
     FOREIGN KEY (category_key)    REFERENCES category (key)
   );`,

  `CREATE INDEX IF NOT EXISTS idx_activity_year_date
     ON activity (service_year_id, activity_date);`,

  `CREATE INDEX IF NOT EXISTS idx_activity_category
     ON activity (category_key);`,

  `CREATE TABLE IF NOT EXISTS app_config (
     key    TEXT PRIMARY KEY NOT NULL,
     value  TEXT
   );`,
];

/** Seed das 6 categorias fixas da v1 (editáveis no futuro). */
export const CATEGORY_SEED: { key: string; label: string; sort: number }[] = [
  { key: 'pregacao', label: 'Pregação', sort: 1 },
  { key: 'estudo', label: 'Estudo Bíblico', sort: 2 },
  { key: 'tpe', label: 'TPE', sort: 3 },
  { key: 'tpl', label: 'TPL', sort: 4 },
  { key: 'cartas', label: 'Cartas', sort: 5 },
  { key: 'credito', label: 'Crédito de Horas', sort: 6 },
];
