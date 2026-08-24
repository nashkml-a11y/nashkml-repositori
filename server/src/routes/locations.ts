import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../types.js";
import { createRepository } from "../repository.js";

export const locationsRouter = new Hono<{ Bindings: Env }>();

locationsRouter.get("/", async (c) => {
  const repo = createRepository(c.env.DB);
  return c.json(await repo.locations.all());
});

const CreateBody = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
});

locationsRouter.post("/", async (c) => {
  const repo = createRepository(c.env.DB);
  const parsed = CreateBody.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "El nombre de la ubicación es obligatorio" }, 400);
  }
  if (await repo.locations.findByName(parsed.data.name)) {
    return c.json({ error: "Ya existe una ubicación con ese nombre" }, 409);
  }
  const created = await repo.locations.create(parsed.data.name, parsed.data.description ?? null);
  return c.json(created, 201);
});

const UpdateBody = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});

locationsRouter.put("/:id", async (c) => {
  const repo = createRepository(c.env.DB);
  const parsed = UpdateBody.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "Datos inválidos" }, 400);
  }
  const updated = await repo.locations.update(Number(c.req.param("id")), parsed.data);
  if (!updated) {
    return c.json({ error: "No encontrada" }, 404);
  }
  return c.json(updated);
});

locationsRouter.delete("/:id", async (c) => {
  const repo = createRepository(c.env.DB);
  const result = await repo.locations.remove(Number(c.req.param("id")));
  if (!result.ok) {
    return c.json({ error: result.reason }, 409);
  }
  return c.body(null, 204);
});
