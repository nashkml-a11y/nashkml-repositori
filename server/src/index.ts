import express from "express";
import cors from "cors";
import { config } from "./config.js";
import "./db.js";
import { searchRouter } from "./routes/search.js";
import { itemsRouter } from "./routes/items.js";
import { locationsRouter } from "./routes/locations.js";

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/search", searchRouter);
app.use("/api/items", itemsRouter);
app.use("/api/locations", locationsRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
});

app.listen(config.port, () => {
  console.log(`API escuchando en http://localhost:${config.port}`);
});
