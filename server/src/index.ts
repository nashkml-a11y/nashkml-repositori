import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types.js";
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

app.route("/api/search", searchRouter);
app.route("/api/items", itemsRouter);
app.route("/api/locations", locationsRouter);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Error interno del servidor" }, 500);
});

export default app;
