import "dotenv/config";

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  anthropicApiKey: required("ANTHROPIC_API_KEY", process.env.ANTHROPIC_API_KEY),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  databasePath: process.env.DATABASE_PATH ?? "./data/buscador.db",
};
