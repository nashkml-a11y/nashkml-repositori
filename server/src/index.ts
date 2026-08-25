import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types.js";
import { verifyToken } from "./auth.js";
import { authRouter } from "./routes/auth.js";
import { searchRouter } from "./routes/search.js";
import { itemsRouter } from "./routes/items.js";
import { locationsRouter } from "./routes/locations.js";

const app = new Hono<{ Bindings: Env }>();

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const allowed = c.env.CORS_ORIGIN.split(",").map((o: string) => o.trim());
      return allowed.includes(origin) ? origin : undefined;
    },
  })
);

app.get("/api/health", (c) => c.json({ ok: true }));

// Público: sin esto nadie podría iniciar sesión.
app.route("/api/auth", authRouter);

// A partir de aquí, toda /api/* exige un token de sesión válido.
app.use("/api/*", async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  if (!(await verifyToken(c.env.AUTH_SECRET, token))) {
    return c.json({ error: "No autenticado" }, 401);
  }
  await next();
});

app.route("/api/search", searchRouter);
app.route("/api/items", itemsRouter);
app.route("/api/locations", locationsRouter);

app.onError((err, c) => {
  console.error(err);
  // TEMPORAL: mensaje detallado para diagnosticar el 500 en producción.
  return c.json({ error: `DEBUG: ${err instanceof Error ? err.stack ?? err.message : String(err)}` }, 500);
});

export default app;
