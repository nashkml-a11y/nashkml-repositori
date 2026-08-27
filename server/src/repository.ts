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
  photo: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItemWithLocation extends Item {
  location_name: string;
}

// El aislamiento entre usuarios se resuelve aquí, en un único sitio: cada
// llamada a createRepository queda cerrada sobre un userId concreto, y toda
// consulta a locations/items/item_movements lleva "AND user_id = ?" — así
// ninguna ruta puede olvidarse de filtrar por error.
export function createRepository(db: D1Database, userId: string) {
  const locations = {
    async all(): Promise<Location[]> {
      const { results } = await db
        .prepare("SELECT * FROM locations WHERE user_id = ? ORDER BY name COLLATE NOCASE")
        .bind(userId)
        .all<Location>();
      return results;
    },
    async get(id: number): Promise<Location | undefined> {
      const row = await db
        .prepare("SELECT * FROM locations WHERE id = ? AND user_id = ?")
        .bind(id, userId)
        .first<Location>();
      return row ?? undefined;
    },
    async findByName(name: string): Promise<Location | undefined> {
      const row = await db
        .prepare("SELECT * FROM locations WHERE name = ? COLLATE NOCASE AND user_id = ?")
        .bind(name, userId)
        .first<Location>();
      return row ?? undefined;
    },
    async create(name: string, description: string | null = null): Promise<Location> {
      const row = await db
        .prepare("INSERT INTO locations (name, description, user_id) VALUES (?, ?, ?) RETURNING *")
        .bind(name, description, userId)
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
          "UPDATE locations SET name = ?, description = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ? RETURNING *"
        )
        .bind(name, description, id, userId)
        .first<Location>();
      return row ?? undefined;
    },
    async remove(id: number): Promise<{ ok: true } | { ok: false; status: 404 | 409; reason: string }> {
      const location = await locations.get(id);
      if (!location) {
        return { ok: false, status: 404, reason: "No encontrada" };
      }
      const count = await db
        .prepare("SELECT COUNT(*) as c FROM items WHERE location_id = ? AND user_id = ?")
        .bind(id, userId)
        .first<{ c: number }>();
      if (count && count.c > 0) {
        return {
          ok: false,
          status: 409,
          reason: "La ubicación tiene objetos guardados. Muévelos antes de eliminarla.",
        };
      }
      await db.prepare("DELETE FROM locations WHERE id = ? AND user_id = ?").bind(id, userId).run();
      return { ok: true };
    },
  };

  const items = {
    async all(): Promise<ItemWithLocation[]> {
      const { results } = await db
        .prepare(
          `SELECT items.*, locations.name as location_name
           FROM items JOIN locations ON locations.id = items.location_id
           WHERE items.user_id = ?
           ORDER BY items.updated_at DESC`
        )
        .bind(userId)
        .all<ItemWithLocation>();
      return results;
    },
    async byLocation(locationId: number): Promise<ItemWithLocation[]> {
      const { results } = await db
        .prepare(
          `SELECT items.*, locations.name as location_name
           FROM items JOIN locations ON locations.id = items.location_id
           WHERE items.location_id = ? AND items.user_id = ?
           ORDER BY items.name COLLATE NOCASE`
        )
        .bind(locationId, userId)
        .all<ItemWithLocation>();
      return results;
    },
    async get(id: number): Promise<ItemWithLocation | undefined> {
      const row = await db
        .prepare(
          `SELECT items.*, locations.name as location_name
           FROM items JOIN locations ON locations.id = items.location_id
           WHERE items.id = ? AND items.user_id = ?`
        )
        .bind(id, userId)
        .first<ItemWithLocation>();
      return row ?? undefined;
    },
    async create(data: {
      name: string;
      description?: string | null;
      location_id: number;
      position_detail?: string | null;
      original_text?: string | null;
      photo?: string | null;
    }): Promise<ItemWithLocation> {
      const inserted = await db
        .prepare(
          `INSERT INTO items (name, description, location_id, position_detail, original_text, photo, user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`
        )
        .bind(
          data.name,
          data.description ?? null,
          data.location_id,
          data.position_detail ?? null,
          data.original_text ?? null,
          data.photo ?? null,
          userId
        )
        .first<{ id: number }>();
      const created = (await items.get(inserted!.id))!;
      await db
        .prepare(
          `INSERT INTO item_movements (item_id, from_location_id, to_location_id, from_position_detail, to_position_detail, note, user_id)
           VALUES (?, NULL, ?, NULL, ?, 'Registro inicial', ?)`
        )
        .bind(created.id, created.location_id, created.position_detail, userId)
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
        .prepare(
          `UPDATE items SET location_id = ?, position_detail = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`
        )
        .bind(data.location_id, data.position_detail ?? null, id, userId)
        .run();
      await db
        .prepare(
          `INSERT INTO item_movements (item_id, from_location_id, to_location_id, from_position_detail, to_position_detail, note, user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          id,
          current.location_id,
          data.location_id,
          current.position_detail,
          data.position_detail ?? null,
          data.note ?? "Actualización de ubicación",
          userId
        )
        .run();
      return items.get(id);
    },
    async remove(id: number): Promise<void> {
      await db.prepare("DELETE FROM items WHERE id = ? AND user_id = ?").bind(id, userId).run();
    },
    async movements(itemId: number) {
      const { results } = await db
        .prepare(
          `SELECT m.*, fl.name as from_location_name, tl.name as to_location_name
           FROM item_movements m
           LEFT JOIN locations fl ON fl.id = m.from_location_id
           JOIN locations tl ON tl.id = m.to_location_id
           WHERE m.item_id = ? AND m.user_id = ?
           ORDER BY m.created_at DESC`
        )
        .bind(itemId, userId)
        .all();
      return results;
    },
  };

  return { locations, items };
}

export type Repository = ReturnType<typeof createRepository>;
