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

export function createRepository(db: D1Database) {
  const locations = {
    async all(): Promise<Location[]> {
      const { results } = await db
        .prepare("SELECT * FROM locations ORDER BY name COLLATE NOCASE")
        .all<Location>();
      return results;
    },
    async get(id: number): Promise<Location | undefined> {
      const row = await db.prepare("SELECT * FROM locations WHERE id = ?").bind(id).first<Location>();
      return row ?? undefined;
    },
    async findByName(name: string): Promise<Location | undefined> {
      const row = await db
        .prepare("SELECT * FROM locations WHERE name = ? COLLATE NOCASE")
        .bind(name)
        .first<Location>();
      return row ?? undefined;
    },
    async create(name: string, description: string | null = null): Promise<Location> {
      const row = await db
        .prepare("INSERT INTO locations (name, description) VALUES (?, ?) RETURNING *")
        .bind(name, description)
        .first<Location>();
      return row!;
    },
    async update(
      id: number,
      data: { name?: string; description?: string | null }
    ): Promise<Location | undefined> {
      const current = await locations.get(id);
      if (!current) return undefined;
      const name = data.name ?? current.name;
      const description = data.description !== undefined ? data.description : current.description;
      const row = await db
        .prepare(
          "UPDATE locations SET name = ?, description = ?, updated_at = datetime('now') WHERE id = ? RETURNING *"
        )
        .bind(name, description, id)
        .first<Location>();
      return row ?? undefined;
    },
    async remove(id: number): Promise<{ ok: boolean; reason?: string }> {
      const count = await db
        .prepare("SELECT COUNT(*) as c FROM items WHERE location_id = ?")
        .bind(id)
        .first<{ c: number }>();
      if (count && count.c > 0) {
        return { ok: false, reason: "La ubicación tiene objetos guardados. Muévelos antes de eliminarla." };
      }
      await db.prepare("DELETE FROM locations WHERE id = ?").bind(id).run();
      return { ok: true };
    },
  };

  const items = {
    async all(): Promise<ItemWithLocation[]> {
      const { results } = await db
        .prepare(
          `SELECT items.*, locations.name as location_name
           FROM items JOIN locations ON locations.id = items.location_id
           ORDER BY items.updated_at DESC`
        )
        .all<ItemWithLocation>();
      return results;
    },
    async get(id: number): Promise<ItemWithLocation | undefined> {
      const row = await db
        .prepare(
          `SELECT items.*, locations.name as location_name
           FROM items JOIN locations ON locations.id = items.location_id
           WHERE items.id = ?`
        )
        .bind(id)
        .first<ItemWithLocation>();
      return row ?? undefined;
    },
    async create(data: {
      name: string;
      description?: string | null;
      location_id: number;
      position_detail?: string | null;
      original_text?: string | null;
    }): Promise<ItemWithLocation> {
      const inserted = await db
        .prepare(
          `INSERT INTO items (name, description, location_id, position_detail, original_text)
           VALUES (?, ?, ?, ?, ?) RETURNING id`
        )
        .bind(
          data.name,
          data.description ?? null,
          data.location_id,
          data.position_detail ?? null,
          data.original_text ?? null
        )
        .first<{ id: number }>();
      const created = (await items.get(inserted!.id))!;
      await db
        .prepare(
          `INSERT INTO item_movements (item_id, from_location_id, to_location_id, from_position_detail, to_position_detail, note)
           VALUES (?, NULL, ?, NULL, ?, 'Registro inicial')`
        )
        .bind(created.id, created.location_id, created.position_detail)
        .run();
      return created;
    },
    async updateLocation(
      id: number,
      data: { location_id: number; position_detail?: string | null; note?: string }
    ): Promise<ItemWithLocation | undefined> {
      const current = await items.get(id);
      if (!current) return undefined;
      await db
        .prepare(`UPDATE items SET location_id = ?, position_detail = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(data.location_id, data.position_detail ?? null, id)
        .run();
      await db
        .prepare(
          `INSERT INTO item_movements (item_id, from_location_id, to_location_id, from_position_detail, to_position_detail, note)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(
          id,
          current.location_id,
          data.location_id,
          current.position_detail,
          data.position_detail ?? null,
          data.note ?? "Actualización de ubicación"
        )
        .run();
      return items.get(id);
    },
    async remove(id: number): Promise<void> {
      await db.prepare("DELETE FROM items WHERE id = ?").bind(id).run();
    },
    async movements(itemId: number) {
      const { results } = await db
        .prepare(
          `SELECT m.*, fl.name as from_location_name, tl.name as to_location_name
           FROM item_movements m
           LEFT JOIN locations fl ON fl.id = m.from_location_id
           JOIN locations tl ON tl.id = m.to_location_id
           WHERE m.item_id = ?
           ORDER BY m.created_at DESC`
        )
        .bind(itemId)
        .all();
      return results;
    },
  };

  return { locations, items };
}

export type Repository = ReturnType<typeof createRepository>;
