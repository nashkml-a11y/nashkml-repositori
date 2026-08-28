export interface Env {
  DB: D1Database;
  ANTHROPIC_API_KEY: string;
  CORS_ORIGIN: string;
  AUTH_SECRET: string;
  // Código de invitación: hay que conocerlo para poder registrarte. Cierra
  // el registro público sin necesidad de gestionar invitaciones por persona.
  REGISTRATION_CODE: string;
}

// Variables de contexto de Hono (no bindings): el middleware de auth deja
// aquí el user_id ya verificado para que cualquier ruta lo lea sin volver a
// tocar el token.
export interface Variables {
  userId: string;
}
