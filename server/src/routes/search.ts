import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../types.js";
import { createRepository } from "../repository.js";
import { createAiClient } from "../ai.js";

export const searchRouter = new Hono<{ Bindings: Env }>();

const SearchBody = z.object({ query: z.string().min(1) });

function formatAnswer(name: string, locationName: string, positionDetail: string | null): string {
  const positionPart = positionDetail ? `, ${positionDetail}` : "";
  return `${name} está en ${locationName}${positionPart}.`;
}

searchRouter.post("/", async (c) => {
  const repo = createRepository(c.env.DB);
  const parsed = SearchBody.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "Falta el campo 'query'" }, 400);
  }
  const { query } = parsed.data;

  const allItems = await repo.items.all();
  if (allItems.length === 0) {
    return c.json({
      status: "not_found",
      answer: "Todavía no has guardado ningún objeto.",
    });
  }

  try {
    const ai = createAiClient(c.env.ANTHROPIC_API_KEY);
    const matches = await ai.semanticSearchItems(
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
      return c.json({
        status: "not_found",
        answer: "No he encontrado ningún objeto guardado que coincida con tu búsqueda.",
      });
    }

    const top = matches[0];
    const second = matches[1];
    const isClear = !second || top.confidence - second.confidence >= 0.25;

    if (isClear) {
      const item = allItems.find((i) => i.id === top.item_id)!;
      return c.json({
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

    return c.json({
      status: "ambiguous",
      answer: "He encontrado varias coincidencias. ¿Cuál de estas es?",
      candidates,
    });
  } catch (err) {
    console.error(err);
    return c.json(
      { status: "error", answer: "No he podido completar la búsqueda. Inténtalo de nuevo." },
      502
    );
  }
});

searchRouter.get("/item/:id", async (c) => {
  const repo = createRepository(c.env.DB);
  const item = await repo.items.get(Number(c.req.param("id")));
  if (!item) {
    return c.json({ error: "No encontrado" }, 404);
  }
  return c.json({
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
