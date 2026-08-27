-- NO metas esto en migrations/ todavía: solo aplica DESPUÉS de haber
-- ejecutado scripts/backfill-owner.sql y comprobado que la consulta final de
-- ese script devuelve 0 filas huérfanas en las tres tablas.
--
-- Cuando esté confirmado: copia este fichero a
-- migrations/0004_users_not_null.sql y aplica con
-- `npm run db:migrate:remote` (o local para probar antes).
--
-- SQLite no permite ALTER COLUMN para añadir NOT NULL a una columna ya
-- existente, así que se recrea cada tabla. De paso corrijo una restricción
-- que se quedó mal desde antes de multiusuario: `locations.name` era
-- UNIQUE a nivel global (arrastrado del esquema monousuario original), lo
-- que impediría que dos usuarios distintos llamaran cada uno a una
-- ubicación suya, p.ej., "Trastero". Pasa a ser UNIQUE por usuario
-- (UNIQUE(user_id, name)).

PRAGMA foreign_keys = OFF;

CREATE TABLE locations_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, name)
);
INSERT INTO locations_new (id, name, description, user_id, created_at, updated_at)
  SELECT id, name, description, user_id, created_at, updated_at FROM locations;
DROP TABLE locations;
ALTER TABLE locations_new RENAME TO locations;

CREATE TABLE items_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  position_detail TEXT,
  original_text TEXT,
  embedding TEXT,
  photo TEXT,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO items_new (id, name, description, location_id, position_detail, original_text, embedding, photo, user_id, created_at, updated_at)
  SELECT id, name, description, location_id, position_detail, original_text, embedding, photo, user_id, created_at, updated_at FROM items;
DROP TABLE items;
ALTER TABLE items_new RENAME TO items;

CREATE TABLE item_movements_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  from_location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  to_location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  from_position_detail TEXT,
  to_position_detail TEXT,
  note TEXT,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO item_movements_new (id, item_id, from_location_id, to_location_id, from_position_detail, to_position_detail, note, user_id, created_at)
  SELECT id, item_id, from_location_id, to_location_id, from_position_detail, to_position_detail, note, user_id, created_at FROM item_movements;
DROP TABLE item_movements;
ALTER TABLE item_movements_new RENAME TO item_movements;

CREATE INDEX idx_items_location ON items(location_id);
CREATE INDEX idx_items_name ON items(name);
CREATE INDEX idx_movements_item ON item_movements(item_id);
CREATE INDEX idx_locations_user ON locations(user_id);
CREATE INDEX idx_items_user ON items(user_id);
CREATE INDEX idx_movements_user ON item_movements(user_id);

PRAGMA foreign_keys = ON;
