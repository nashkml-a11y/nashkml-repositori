# Buscador de objetos — PWA

App instalable, pensada para móvil, cuya función principal es responder en lenguaje
natural (texto o voz) a la pregunta **"¿dónde tengo guardado esto?"**, a partir de
objetos y ubicaciones que tú mismo registras con frases naturales.

La búsqueda usa IA para entender sinónimos, descripciones aproximadas o distintas
formas de nombrar un objeto (p. ej. preguntar por "el aparato que hace niebla"
encuentra la "máquina de humo"). Guardar objetos y crear ubicaciones existe, pero
queda deliberadamente en segundo plano frente al buscador.

Este repositorio contiene dos proyectos independientes:

- **`server/`** — API backend (Node + Express + TypeScript + SQLite). Guarda
  ubicaciones, objetos e historial de movimientos, y es el único componente que
  llama a la API de Claude (Anthropic) — la clave nunca se expone al navegador.
- **`web/`** — Frontend PWA (React + Vite + Tailwind), optimizado para móvil,
  instalable, con entrada de voz mediante la Web Speech API.

(`firmware/` y `hardware/` son contenido previo del repositorio, no relacionado con
esta app.)

## Puesta en marcha

### 1. Backend

```bash
cd server
npm install
cp .env.example .env
# Edita .env y añade tu ANTHROPIC_API_KEY (https://console.anthropic.com/settings/keys)
npm run dev
```

Escucha por defecto en `http://localhost:3001`. La base de datos SQLite se crea
automáticamente en `server/data/`.

### 2. Frontend

En otra terminal:

```bash
cd web
npm install
cp .env.example .env   # por defecto ya apunta a http://localhost:3001
npm run dev
```

Abre `http://localhost:5173` en el móvil o el navegador. En Chrome/Android o
Safari/iOS puedes instalarla como app desde el menú del navegador.

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

## Datos

- `locations(id, name, description, created_at, updated_at)`
- `items(id, name, description, location_id, position_detail, original_text, embedding, created_at, updated_at)`
- `item_movements(...)` — historial de cambios de ubicación de cada objeto

La columna `embedding` en `items` está reservada para almacenar en el futuro un
vector de embeddings si se quisiera mover la búsqueda semántica a un backend
vectorial dedicado; hoy el propio modelo de IA resuelve la búsqueda semántica
directamente sobre `name` / `description` / `original_text`.
