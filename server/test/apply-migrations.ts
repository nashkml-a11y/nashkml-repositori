import { applyD1Migrations, env } from "cloudflare:test";

// @ts-expect-error TEST_MIGRATIONS es un binding inyectado solo en tests, no
// forma parte del tipo Env de la app real.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
