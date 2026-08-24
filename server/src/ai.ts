import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { config } from "./config.js";

const client = new Anthropic({ apiKey: config.anthropicApiKey });

const MODEL = "claude-opus-5";

// ---------------------------------------------------------------------------
// Extracción de "guardar objeto" a partir de una frase en lenguaje natural
// ---------------------------------------------------------------------------

const ExtractionSchema = z.object({
  object_name: z
    .string()
    .describe("Nombre corto y claro del objeto guardado, en español (p.ej. 'Máquina de humo')"),
  object_description: z
    .string()
    .nullable()
    .describe("Descripción adicional del objeto si el texto la aporta, o null"),
  location_name: z
    .string()
    .describe(
      "Nombre de la ubicación donde se guarda el objeto. Si coincide semánticamente con una " +
        "ubicación existente de la lista proporcionada, usa EXACTAMENTE ese nombre existente. " +
        "Si no existe, propone un nombre nuevo, claro y corto."
    ),
  location_is_new: z
    .boolean()
    .describe("true si location_name no coincide con ninguna ubicación existente de la lista"),
  position_detail: z
    .string()
    .nullable()
    .describe(
      "Detalle de posición dentro de la ubicación si el texto lo aporta y no forma ya parte del " +
        "nombre de la ubicación (p.ej. 'segunda capa', 'al fondo'). Si no hay detalle, null."
    ),
  existing_item_id: z
    .number()
    .nullable()
    .describe(
      "Si el texto se refiere a un objeto que YA existe en la lista de objetos guardados " +
        "(mismo objeto, aunque cambie de ubicación), su id. Si es un objeto nuevo, null."
    ),
  is_location_update: z
    .boolean()
    .describe(
      "true si el texto describe que un objeto ya guardado ha cambiado de ubicación " +
        "(p.ej. 'ahora está en...', 'lo he movido a...')"
    ),
});

export type ExtractionResult = z.infer<typeof ExtractionSchema>;

export interface ExistingLocation {
  id: number;
  name: string;
}

export interface ExistingItem {
  id: number;
  name: string;
  location_name: string;
}

export async function extractItemFromText(
  text: string,
  existingLocations: ExistingLocation[],
  existingItems: ExistingItem[]
): Promise<ExtractionResult> {
  const locationsList =
    existingLocations.length > 0
      ? existingLocations.map((l) => `- ${l.name}`).join("\n")
      : "(no hay ubicaciones todavía)";
  const itemsList =
    existingItems.length > 0
      ? existingItems.map((i) => `- id=${i.id}: ${i.name} (en ${i.location_name})`).join("\n")
      : "(no hay objetos guardados todavía)";

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 4096,
    system:
      "Eres el motor de interpretación de una app para encontrar objetos guardados en casa. " +
      "Extraes de una frase en español qué objeto se guarda, en qué ubicación y con qué detalle " +
      "de posición. Debes intentar reutilizar ubicaciones y objetos existentes cuando el texto " +
      "se refiera claramente a ellos, en vez de crear duplicados. Nunca inventes datos que el " +
      "texto no aporte: si no hay detalle de posición, deja position_detail en null.",
    messages: [
      {
        role: "user",
        content:
          `Ubicaciones existentes:\n${locationsList}\n\n` +
          `Objetos ya guardados:\n${itemsList}\n\n` +
          `Frase del usuario: "${text}"`,
      },
    ],
    output_config: {
      effort: "medium",
      format: zodOutputFormat(ExtractionSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error("No se pudo interpretar el texto");
  }
  return response.parsed_output;
}

// ---------------------------------------------------------------------------
// Búsqueda semántica: encontrar qué objeto(s) coinciden con una pregunta
// ---------------------------------------------------------------------------

const SearchMatchSchema = z.object({
  matches: z
    .array(
      z.object({
        item_id: z.number().describe("id del objeto que coincide"),
        confidence: z
          .number()
          .min(0)
          .max(1)
          .describe("confianza de que este objeto es al que se refiere la pregunta (0 a 1)"),
        reason: z.string().describe("breve razón de por qué coincide, en español"),
      })
    )
    .describe(
      "Lista de objetos candidatos que podrían ser lo que el usuario busca, ordenados de mayor " +
        "a menor confianza. Vacía si ningún objeto guardado coincide razonablemente."
    ),
});

export interface SearchableItem {
  id: number;
  name: string;
  description: string | null;
  original_text: string | null;
  position_detail: string | null;
  location_name: string;
}

export interface SearchMatch {
  item_id: number;
  confidence: number;
  reason: string;
}

export async function semanticSearchItems(
  query: string,
  candidateItems: SearchableItem[]
): Promise<SearchMatch[]> {
  if (candidateItems.length === 0) return [];

  const itemsList = candidateItems
    .map((i) => {
      const parts = [
        `id=${i.id}`,
        `nombre="${i.name}"`,
        i.description ? `descripción="${i.description}"` : null,
        i.original_text ? `texto_original="${i.original_text}"` : null,
        `ubicación="${i.location_name}"`,
        i.position_detail ? `posición="${i.position_detail}"` : null,
      ].filter(Boolean);
      return `- ${parts.join(", ")}`;
    })
    .join("\n");

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 4096,
    system:
      "Eres el motor de búsqueda semántica de una app para encontrar objetos guardados en casa. " +
      "Dada una pregunta del usuario y una lista de objetos guardados, decides cuáles objetos " +
      "coinciden con lo que el usuario busca, aunque use sinónimos, descripciones aproximadas, " +
      "nombres distintos, relaciones semánticas o tenga pequeñas erratas. " +
      "NUNCA inventes objetos ni ubicaciones que no estén en la lista: solo puedes devolver ids " +
      "que existan en ella. Si nada encaja razonablemente, devuelve una lista vacía.",
    messages: [
      {
        role: "user",
        content: `Objetos guardados:\n${itemsList}\n\nPregunta del usuario: "${query}"`,
      },
    ],
    output_config: {
      effort: "medium",
      format: zodOutputFormat(SearchMatchSchema),
    },
  });

  if (!response.parsed_output) return [];
  return response.parsed_output.matches
    .filter((m: SearchMatch) => candidateItems.some((c) => c.id === m.item_id))
    .sort((a: SearchMatch, b: SearchMatch) => b.confidence - a.confidence);
}
