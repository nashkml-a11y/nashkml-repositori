import { Router } from "express";
import { z } from "zod";
import { items as itemsRepo, locations as locationsRepo } from "../repository.js";
import { extractItemFromText } from "../ai.js";

export const itemsRouter = Router();

itemsRouter.get("/", (_req, res) => {
  res.json(itemsRepo.all());
});

const ExtractBody = z.object({ text: z.string().min(1) });

itemsRouter.post("/extract", async (req, res) => {
  const parsed = ExtractBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Falta el campo 'text'" });
    return;
  }

  try {
    const allLocations = locationsRepo.all();
    const allItems = itemsRepo.all();
    const extraction = await extractItemFromText(
      parsed.data.text,
      allLocations.map((l) => ({ id: l.id, name: l.name })),
      allItems.map((i) => ({ id: i.id, name: i.name, location_name: i.location_name }))
    );

    // Re-verificamos la existencia real de la ubicación por si el modelo se equivoca
    const matchedLocation = locationsRepo.findByName(extraction.location_name);

    res.json({
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
    res.status(502).json({ error: "No se pudo interpretar el texto. Inténtalo de nuevo." });
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
});

itemsRouter.post("/", (req, res) => {
  const parsed = ConfirmBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos incompletos", details: parsed.error.flatten() });
    return;
  }
  const data = parsed.data;

  let location = locationsRepo.findByName(data.location_name);
  if (!location) {
    location = locationsRepo.create(data.location_name);
  }

  if (data.is_location_update && data.existing_item_id) {
    const updated = itemsRepo.updateLocation(data.existing_item_id, {
      location_id: location.id,
      position_detail: data.position_detail ?? null,
      note: data.original_text ?? "Actualización de ubicación",
    });
    if (!updated) {
      res.status(404).json({ error: "El objeto que se quería actualizar no existe" });
      return;
    }
    res.status(200).json(updated);
    return;
  }

  const created = itemsRepo.create({
    name: data.name,
    description: data.description ?? null,
    location_id: location.id,
    position_detail: data.position_detail ?? null,
    original_text: data.original_text ?? null,
  });
  res.status(201).json(created);
});

itemsRouter.get("/:id/movements", (req, res) => {
  const item = itemsRepo.get(Number(req.params.id));
  if (!item) {
    res.status(404).json({ error: "No encontrado" });
    return;
  }
  res.json(itemsRepo.movements(item.id));
});

itemsRouter.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const item = itemsRepo.get(id);
  if (!item) {
    res.status(404).json({ error: "No encontrado" });
    return;
  }
  itemsRepo.remove(id);
  res.status(204).end();
});
