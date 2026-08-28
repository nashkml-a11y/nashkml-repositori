CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Nullable a propósito: SQLite no permite añadir una columna NOT NULL a una
-- tabla con filas existentes sin un valor por defecto. Se endurece a NOT NULL
-- en la migración 0004, una vez confirmado que el backfill del propietario
-- original (ver README-migracion-usuarios.md) no deja ninguna fila huérfana.
ALTER TABLE locations ADD COLUMN user_id TEXT REFERENCES users(id);
ALTER TABLE items ADD COLUMN user_id TEXT REFERENCES users(id);
ALTER TABLE item_movements ADD COLUMN user_id TEXT REFERENCES users(id);

CREATE INDEX idx_locations_user ON locations(user_id);
CREATE INDEX idx_items_user ON items(user_id);
CREATE INDEX idx_movements_user ON item_movements(user_id);
