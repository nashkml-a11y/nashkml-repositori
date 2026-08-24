import { db } from "./db.js";

export interface Location {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: number;
  name: string;
  description: string | null;
  location_id: number;
  position_detail: string | null;
  original_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItemWithLocation extends Item {
  location_name: string;
}

export const locations = {
  all(): Location[] {
    return db.prepare("SELECT * FROM locations ORDER BY name COLLATE NOCASE").all() as Location[];
  },
  get(id: number): Location | undefined {
    return db.prepare("SELECT * FROM locations WHERE id = ?").get(id) as Location | undefined;
  },
  findByName(name: string): Location | undefined {
    return db
      .prepare("SELECT * FROM locations WHERE name = ? COLLATE NOCASE")
      .get(name) as Location | undefined;
  },
  create(name: string, description?: string | null): Location {
    const stmt = db.prepare(
      "INSERT INTO locations (name, description) VALUES (?, ?)"
    );
    const info = stmt.run(name, description ?? null);
    return locations.get(info.lastInsertRowid as number)!;
  },
  update(id: number, data: { name?: string; description?: string | null }): Location | undefined {
    const current = locations.get(id);
    if (!current) return undefined;
    db.prepare(
      "UPDATE locations SET name = ?, description = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(data.name ?? current.name, data.description ?? current.description, id);
    return locations.get(id);
  },
  remove(id: number): { ok: boolean; reason?: string } {
    const itemCount = db
      .prepare("SELECT COUNT(*) as c FROM items WHERE location_id = ?")
      .get(id) as { c: number };
    if (itemCount.c > 0) {
      return { ok: false, reason: "La ubicación tiene objetos guardados. Muévelos antes de eliminarla." };
    }
    db.prepare("DELETE FROM locations WHERE id = ?").run(id);
    return { ok: true };
  },
};

export const items = {
  all(): ItemWithLocation[] {
    return db
      .prepare(
        `SELECT items.*, locations.name as location_name
         FROM items JOIN locations ON locations.id = items.location_id
         ORDER BY items.updated_at DESC`
      )
      .all() as ItemWithLocation[];
  },
  get(id: number): ItemWithLocation | undefined {
    return db
      .prepare(
        `SELECT items.*, locations.name as location_name
         FROM items JOIN locations ON locations.id = items.location_id
         WHERE items.id = ?`
      )
      .get(id) as ItemWithLocation | undefined;
  },
  create(data: {
    name: string;
    description?: string | null;
    location_id: number;
    position_detail?: string | null;
    original_text?: string | null;
  }): ItemWithLocation {
    const stmt = db.prepare(
      `INSERT INTO items (name, description, location_id, position_detail, original_text)
       VALUES (@name, @description, @location_id, @position_detail, @original_text)`
    );
    const info = stmt.run({
      name: data.name,
      description: data.description ?? null,
      location_id: data.location_id,
      position_detail: data.position_detail ?? null,
      original_text: data.original_text ?? null,
    });
    const created = items.get(info.lastInsertRowid as number)!;
    db.prepare(
      `INSERT INTO item_movements (item_id, from_location_id, to_location_id, from_position_detail, to_position_detail, note)
       VALUES (?, NULL, ?, NULL, ?, 'Registro inicial')`
    ).run(created.id, created.location_id, created.position_detail);
    return created;
  },
  updateLocation(
    id: number,
    data: { location_id: number; position_detail?: string | null; note?: string }
  ): ItemWithLocation | undefined {
    const current = items.get(id);
    if (!current) return undefined;
    db.prepare(
      `UPDATE items SET location_id = ?, position_detail = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(data.location_id, data.position_detail ?? null, id);
    db.prepare(
      `INSERT INTO item_movements (item_id, from_location_id, to_location_id, from_position_detail, to_position_detail, note)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      current.location_id,
      data.location_id,
      current.position_detail,
      data.position_detail ?? null,
      data.note ?? "Actualización de ubicación"
    );
    return items.get(id);
  },
  remove(id: number): void {
    db.prepare("DELETE FROM items WHERE id = ?").run(id);
  },
  movements(itemId: number) {
    return db
      .prepare(
        `SELECT m.*, fl.name as from_location_name, tl.name as to_location_name
         FROM item_movements m
         LEFT JOIN locations fl ON fl.id = m.from_location_id
         JOIN locations tl ON tl.id = m.to_location_id
         WHERE m.item_id = ?
         ORDER BY m.created_at DESC`
      )
      .all(itemId);
  },
};
