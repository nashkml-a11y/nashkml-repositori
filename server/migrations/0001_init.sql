-- `embedding` guarda la representación semántica del item (JSON con el vector
-- y su metadata: modelo, dimensiones...) para permitir en el futuro búsqueda
-- por similitud de vectores sin migrar el esquema. Hoy la búsqueda semántica
-- la resuelve directamente el modelo de IA sobre `name`/`description`/`original_text`.

CREATE TABLE locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  position_detail TEXT,
  original_text TEXT,
  embedding TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE item_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  from_location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  to_location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  from_position_detail TEXT,
  to_position_detail TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_items_location ON items(location_id);
CREATE INDEX idx_items_name ON items(name);
CREATE INDEX idx_movements_item ON item_movements(item_id);
