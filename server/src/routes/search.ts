import { Router } from "express";
import { z } from "zod";
import { items as itemsRepo } from "../repository.js";
import { semanticSearchItems } from "../ai.js";

export const searchRouter = Router();

const SearchBody = z.object({ query: z.string().min(1) });

function formatAnswer(name: string, locationName: string, positionDetail: string | null): string {
  const positionPart = positionDetail ? `, ${positionDetail}` : "";
  return `${name} está en ${locationName}${positionPart}.`;
}

searchRouter.post("/", async (req, res) => {
  const parsed = SearchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Falta el campo 'query'" });
    return;
  }
  const { query } = parsed.data;

  const allItems = itemsRepo.all();
  if (allItems.length === 0) {
    res.json({
      status: "not_found",
      answer: "Todavía no has guardado ningún objeto.",
    });
    return;
  }

  try {
    const matches = await semanticSearchItems(
      query,
      allItems.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        original_text: i.original_text,
        position_detail: i.position_detail,
        location_name: i.location_name,
      }))
    );

    if (matches.length === 0 || matches[0].confidence < 0.4) {
      res.json({
        status: "not_found",
        answer: "No he encontrado ningún objeto guardado que coincida con tu búsqueda.",
      });
      return;
    }

    const top = matches[0];
    const second = matches[1];
    const isClear = !second || top.confidence - second.confidence >= 0.25;

    if (isClear) {
      const item = allItems.find((i) => i.id === top.item_id)!;
      res.json({
        status: "found",
        answer: formatAnswer(item.name, item.location_name, item.position_detail),
        item: {
          id: item.id,
          name: item.name,
          description: item.description,
          location_name: item.location_name,
          position_detail: item.position_detail,
        },
      });
      return;
    }

    const candidates = matches.slice(0, 4).map((m) => {
      const item = allItems.find((i) => i.id === m.item_id)!;
      return {
        id: item.id,
        name: item.name,
        location_name: item.location_name,
        position_detail: item.position_detail,
        reason: m.reason,
      };
    });

    res.json({
      status: "ambiguous",
      answer: "He encontrado varias coincidencias. ¿Cuál de estas es?",
      candidates,
    });
  } catch (err) {
    console.error(err);
    res.status(502).json({
      status: "error",
      answer: "No he podido completar la búsqueda. Inténtalo de nuevo.",
    });
  }
});

searchRouter.get("/item/:id", (req, res) => {
  const item = itemsRepo.get(Number(req.params.id));
  if (!item) {
    res.status(404).json({ error: "No encontrado" });
    return;
  }
  res.json({
    status: "found",
    answer: formatAnswer(item.name, item.location_name, item.position_detail),
    item: {
      id: item.id,
      name: item.name,
      description: item.description,
      location_name: item.location_name,
      position_detail: item.position_detail,
    },
  });
});
