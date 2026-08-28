import path from "node:path";
import { defineConfig } from "vitest/config";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";

export default defineConfig(async () => {
  const migrationsPath = path.join(import.meta.dirname, "migrations");
  const migrations = await readD1Migrations(migrationsPath);

  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            // AUTH_SECRET no debe faltar para poder firmar tokens en los
            // tests; ANTHROPIC_API_KEY no se usa en estos tests de
            // aislamiento (no tocan /api/search ni /api/items/extract).
            AUTH_SECRET: "test-secret-solo-para-vitest",
            CORS_ORIGIN: "http://localhost:5173",
            REGISTRATION_CODE: "test-registration-code",
          },
        },
      }),
    ],
    test: {
      setupFiles: ["./test/apply-migrations.ts"],
    },
  };
});
