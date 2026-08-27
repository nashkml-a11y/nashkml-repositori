import { Hono } from "hono";
import { z } from "zod";
import type { Env, Variables } from "../types.js";
import { createRepository } from "../repository.js";
import { createAiClient } from "../ai.js";

export const itemsRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

itemsRouter.get("/", async (c) => {
  const repo = createRepository(c.env.DB, c.get("userId"));
  return c.json(await repo.items.all());
});

const ExtractBody = z.object({ text: z.string().min(1) });

itemsRouter.post("/extract", async (c) => {
  const repo = createRepository(c.env.DB, c.get("userId"));
  const parsed = ExtractBody.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "Falta el campo 'text'" }, 400);
  }

  try {
    const ai = createAiClient(c.env.ANTHROPIC_API_KEY);
    const allLocations = await repo.locations.all();
    const allItems = await repo.items.all();
    const extraction = await ai.extractItemFromText(
      parsed.data.text,
      allLocations.map((l) => ({ id: l.id, name: l.name })),
      allItems.map((i) => ({ id: i.id, name: i.name, location_name: i.location_name }))
    );

    // Re-verificamos la existencia real de la ubicación por si el modelo se equivoca
    const matchedLocation = await repo.locations.findByName(extraction.location_name);

    return c.json({
      object_name: extraction.object_name,
      object_description: extraction.object_description,
      location_name: matchedLocation?.name ?? extraction.location_name,
      location_is_new: !matchedLocation,
      position_detail: extraction.position_detail,
      existing_item_id: extraction.existing_item_id,
      is_location_update: extraction.is_location_update,
      original_text: parsed.data.text,
    });
  } catch (err) {
    console.error(err);
    return c.json({ error: "No se pudo interpretar el texto. Inténtalo de nuevo." }, 502);
  }
});

const ConfirmBody = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  location_name: z.string().min(1),
  location_is_new: z.boolean().optional(),
  position_detail: z.string().nullable().optional(),
  original_text: z.string().nullable().optional(),
  existing_item_id: z.number().nullable().optional(),
  is_location_update: z.boolean().optional(),
  photo: z.string().max(500_000).nullable().optional(),
});

itemsRouter.post("/", async (c) => {
  const repo = createRepository(c.env.DB, c.get("userId"));
  const parsed = ConfirmBody.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "Datos incompletos", details: parsed.error.flatten() }, 400);
  }
  const data = parsed.data;

  let location = await repo.locations.findByName(data.location_name);
  if (!location) {
    location = await repo.locations.create(data.location_name);
  }

  if (data.is_location_update && data.existing_item_id) {
    const updated = await repo.items.updateLocation(data.existing_item_id, {
      location_id: location.id,
      position_detail: data.position_detail ?? null,
      note: data.original_text ?? "Actualización de ubicación",
    });
    if (!updated) {
      return c.json({ error: "El objeto que se quería actualizar no existe" }, 404);
    }
    return c.json(updated, 200);
  }

  const created = await repo.items.create({
    name: data.name,
    description: data.description ?? null,
    location_id: location.id,
    position_detail: data.position_detail ?? null,
    original_text: data.original_text ?? null,
    photo: data.photo ?? null,
  });
  return c.json(created, 201);
});

itemsRouter.get("/:id/movements", async (c) => {
  const repo = createRepository(c.env.DB, c.get("userId"));
  const item = await repo.items.get(Number(c.req.param("id")));
  if (!item) {
    return c.json({ error: "No encontrado" }, 404);
  }
  return c.json(await repo.items.movements(item.id));
});

itemsRouter.delete("/:id", async (c) => {
  const repo = createRepository(c.env.DB, c.get("userId"));
  const id = Number(c.req.param("id"));
  const item = await repo.items.get(id);
  if (!item) {
    return c.json({ error: "No encontrado" }, 404);
  }
  await repo.items.remove(id);
  return c.body(null, 204);
});
