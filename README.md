# Buscador de objetos — PWA

App instalable, pensada para móvil, cuya función principal es responder en lenguaje
natural (texto o voz) a la pregunta **"¿dónde tengo guardado esto?"**, a partir de
objetos y ubicaciones que tú mismo registras con frases naturales.

La búsqueda usa IA para entender sinónimos, descripciones aproximadas o distintas
formas de nombrar un objeto (p. ej. preguntar por "el aparato que hace niebla"
encuentra la "máquina de humo"). Guardar objetos y crear ubicaciones existe, pero
queda deliberadamente en segundo plano frente al buscador.

Este repositorio contiene dos proyectos independientes, pensados para desplegarse
en Cloudflare:

- **`server/`** — API backend: **Cloudflare Worker** (Hono) + **Cloudflare D1**
  (SQLite gestionado). Guarda ubicaciones, objetos e historial de movimientos, y
  es el único componente que llama a la API de Claude (Anthropic) — la clave
  nunca se expone al navegador.
- **`web/`** — Frontend PWA (React + Vite + Tailwind) desplegable en
  **Cloudflare Pages**, optimizado para móvil, instalable, con entrada de voz
  mediante la Web Speech API.

(`firmware/` y `hardware/` son contenido previo del repositorio, no relacionado con
esta app.)

## Desarrollo local

### 1. Backend (Worker + D1 local)

```bash
cd server
npm install
npm run db:migrate:local        # crea el esquema en una D1 local (SQLite en disco)
cp .dev.vars.example .dev.vars
# Edita .dev.vars: ANTHROPIC_API_KEY, APP_PASSWORD (la contraseña de entrada a
# la app) y AUTH_SECRET (clave aleatoria para firmar la sesión, no la contraseña)
npm run dev                     # wrangler dev, por defecto en http://localhost:8787
```

### 2. Frontend

En otra terminal:

```bash
cd web
npm install
cp .env.example .env            # por defecto apunta a http://localhost:8787
npm run dev
```

Abre `http://localhost:5173` en el móvil o el navegador. En Chrome/Android o
Safari/iOS puedes instalarla como app desde el menú del navegador.

## Despliegue en Cloudflare

Necesitas una cuenta de Cloudflare y `wrangler` autenticado (`npx wrangler login`
dentro de `server/` o `web/`).

### Backend — Worker + D1

```bash
cd server
npm run db:create                       # crea la base D1 y muestra su database_id
# copia ese database_id en wrangler.toml, sustituyendo REPLACE_WITH_YOUR_D1_DATABASE_ID
npm run db:migrate:remote               # aplica el esquema a la D1 real
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put APP_PASSWORD    # la contraseña con la que entrarás a la app
npx wrangler secret put AUTH_SECRET     # cadena aleatoria para firmar la sesión, p.ej. `openssl rand -base64 32`
npm run deploy                          # publica el Worker
```

La app entera queda detrás de esa contraseña: sin ella, la API rechaza cualquier
petición (salvo `/api/health` y el propio login) con `401`, así que aunque alguien
tenga la URL pública no puede ver ni usar tus datos.

Al desplegar, `wrangler` te da la URL pública del Worker (algo como
`https://buscador-api.<tu-subdominio>.workers.dev`). Edita `CORS_ORIGIN` en
`wrangler.toml` para incluir la URL de tu proyecto de Pages (puedes poner varias
separadas por comas) y vuelve a desplegar.

### Frontend — Pages

En el dashboard de Cloudflare (Workers & Pages → Create → Pages) conecta este
repositorio con:

- Directorio de la app: `web`
- Comando de build: `npm run build`
- Directorio de salida: `dist`
- Variable de entorno `VITE_API_URL` = URL pública del Worker del paso anterior

O bien despliega directamente desde la terminal:

```bash
cd web
VITE_API_URL="https://buscador-api.<tu-subdominio>.workers.dev" npm run deploy
```

## Cómo funciona

- **Buscar** (`POST /api/search`): compara la pregunta contra todos los objetos
  guardados usando el modelo de IA como motor de búsqueda semántica (sinónimos,
  erratas, descripciones aproximadas). Si hay una coincidencia clara, responde
  directamente con la ubicación; si hay varias razonables, pide al usuario que
  elija; si no encuentra nada, lo dice explícitamente — nunca inventa una ubicación.
- **Guardar objeto** (`POST /api/items/extract` + `POST /api/items`): la IA extrae
  objeto, ubicación y detalle de posición de una frase libre, se muestra una
  confirmación, y solo entonces se guarda. Si la frase describe un objeto ya
  existente que ha cambiado de sitio, actualiza su ubicación y conserva el
  historial de movimientos en vez de crear un duplicado.
- **Ubicaciones**: CRUD sencillo (`/api/locations`), con protección para no borrar
  una ubicación que todavía tiene objetos dentro.

## Datos (Cloudflare D1 — SQLite)

- `locations(id, name, description, created_at, updated_at)`
- `items(id, name, description, location_id, position_detail, original_text, embedding, created_at, updated_at)`
- `item_movements(...)` — historial de cambios de ubicación de cada objeto

La columna `embedding` en `items` está reservada para almacenar en el futuro un
vector de embeddings si se quisiera mover la búsqueda semántica a un backend
vectorial dedicado (p. ej. Cloudflare Vectorize); hoy el propio modelo de IA
(`claude-haiku-4-5`) resuelve la búsqueda semántica directamente sobre
`name` / `description` / `original_text`.
