import { Router } from "express";
import { z } from "zod";
import { locations as locationsRepo } from "../repository.js";

export const locationsRouter = Router();

locationsRouter.get("/", (_req, res) => {
  res.json(locationsRepo.all());
});

const CreateBody = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
});

locationsRouter.post("/", (req, res) => {
  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "El nombre de la ubicación es obligatorio" });
    return;
  }
  if (locationsRepo.findByName(parsed.data.name)) {
    res.status(409).json({ error: "Ya existe una ubicación con ese nombre" });
    return;
  }
  const created = locationsRepo.create(parsed.data.name, parsed.data.description ?? null);
  res.status(201).json(created);
});

const UpdateBody = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});

locationsRouter.put("/:id", (req, res) => {
  const parsed = UpdateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }
  const updated = locationsRepo.update(Number(req.params.id), parsed.data);
  if (!updated) {
    res.status(404).json({ error: "No encontrada" });
    return;
  }
  res.json(updated);
});

locationsRouter.delete("/:id", (req, res) => {
  const result = locationsRepo.remove(Number(req.params.id));
  if (!result.ok) {
    res.status(409).json({ error: result.reason });
    return;
  }
  res.status(204).end();
});
