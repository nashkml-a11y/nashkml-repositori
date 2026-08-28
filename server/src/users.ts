export interface User {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export function createUsersRepository(db: D1Database) {
  return {
    async findByEmail(email: string): Promise<User | undefined> {
      const row = await db
        .prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE")
        .bind(email)
        .first<User>();
      return row ?? undefined;
    },
    async get(id: string): Promise<User | undefined> {
      const row = await db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<User>();
      return row ?? undefined;
    },
    async create(data: { email: string; passwordHash: string; displayName?: string | null }): Promise<User> {
      const id = crypto.randomUUID();
      const row = await db
        .prepare(
          `INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?) RETURNING *`
        )
        .bind(id, data.email, data.passwordHash, data.displayName ?? null)
        .first<User>();
      return row!;
    },
  };
}
