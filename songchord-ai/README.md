# SongChord AI

MVP funcional: sube una canción (MP3/WAV/M4A), pulsa **Analizar canción** y
obtén letra transcrita y sincronizada, acordes de guitarra con tiempos,
tonalidad, tempo y nivel de confianza por acorde. Incluye reproductor con
forma de onda, edición manual de letra/acordes, transposición, capo y
exportación a TXT / ChordPro / JSON.

## Arquitectura

```
songchord-ai/
├── backend/     FastAPI (API) + Celery (worker) — Python
│   ├── app/
│   │   ├── api/            endpoints REST (songs, export)
│   │   ├── services/       ffmpeg, Demucs, Essentia, OpenAI STT, smoothing,
│   │   │                   sync, transpose, exporters, validación
│   │   └── tasks/          pipeline de análisis (tarea Celery)
│   └── tests/               pytest (77+ pruebas, lógica pura + API)
└── frontend/    Next.js + TypeScript + Tailwind
    └── src/
        ├── app/             página principal (App Router)
        ├── components/      dropzone, progreso, reproductor, editor, ...
        ├── lib/             cliente API, tipos, utilidades de acordes
        └── tests/            vitest (lógica de transposición/sincronía)
```

El frontend nunca ve la clave de OpenAI: Next.js reescribe `/api/*` hacia el
backend (`next.config.js`), y el backend es el único que lee `OPENAI_API_KEY`.

## Flujo de análisis (tarea Celery, una por canción)

`validar → convertir a WAV → separar con Demucs (voz/bajo/batería/otros) →
transcribir voz (OpenAI STT con timestamps) → detectar tonalidad/tempo/acordes
(Essentia) → suavizar cambios de acorde muy cortos → unificar acordes
consecutivos iguales → sincronizar acorde↔palabra más cercana → guardar
resultado`. Cada fase actualiza el campo `phase` de la canción en la base de
datos, y el frontend hace *polling* cada 2s para mostrar el progreso. Los
archivos temporales de cada fase (WAV convertido, stems de Demucs, mezcla de
acompañamiento) se crean en un directorio temporal por trabajo y se eliminan
siempre al finalizar (éxito o error).

## Requisitos previos

- Docker y Docker Compose.
- Una clave de API de OpenAI con acceso a transcripción de audio (Whisper).

## Puesta en marcha

1. Copia el archivo de entorno de ejemplo y añade tu clave de OpenAI:

   ```bash
   cp .env.example .env
   # edita .env y define OPENAI_API_KEY=sk-...
   ```

2. Levanta todos los servicios:

   ```bash
   docker compose up --build
   ```

   Esto arranca: `postgres`, `redis`, `api` (FastAPI en `:8000`), `worker`
   (Celery) y `frontend` (Next.js en `:3000`).

3. Abre `http://localhost:3000`, arrastra un MP3/WAV/M4A y pulsa
   **Analizar canción**.

La primera vez, Demucs descargará los pesos del modelo `htdemucs`
(~80–300MB) dentro del contenedor `worker`; puede tardar unos minutos según tu
conexión.

## Desarrollo local (sin Docker)

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt   # incluye pytest
cp ../.env.example ../.env            # o exporta las variables a mano

# Requiere Postgres y Redis accesibles (o usa docker compose up postgres redis)
uvicorn app.main:app --reload --port 8000
```

En otra terminal, el worker (requiere ffmpeg, y para el pipeline completo
Demucs/Essentia instalados vía `requirements-worker.txt`):

```bash
celery -A app.celery_app.celery_app worker --loglevel=INFO
```

Pruebas del backend (no requieren Postgres/Redis/Demucs/Essentia reales; usan
SQLite y mocks para las dependencias externas):

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000, usa BACKEND_URL (por defecto :8000)
npm run typecheck
npm run test        # vitest: transposición, capo, sincronización
npm run build
```

## Variables de entorno (`.env`)

| Variable            | Descripción                                              |
|---------------------|-----------------------------------------------------------|
| `OPENAI_API_KEY`    | Clave de OpenAI, usada solo por el backend/worker.         |
| `OPENAI_STT_MODEL`  | Modelo de transcripción (por defecto `whisper-1`).         |
| `DATABASE_URL`      | Cadena de conexión a Postgres.                             |
| `REDIS_URL`         | Broker/backend de Celery.                                  |
| `STORAGE_DIR`       | Directorio persistente donde se guardan los audios subidos.|
| `MAX_UPLOAD_BYTES`  | Tamaño máximo de subida (por defecto 50MB).                |
| `CORS_ORIGINS`      | Lista JSON de orígenes permitidos por el backend.          |

## Alcance del MVP

- Acordes: solo mayores y menores (p. ej. `C`, `Cm`, `C#`, `C#m`).
- Sin autenticación ni pagos.
- Sin migraciones (el esquema se crea automáticamente al arrancar la API).

## Endpoints principales

| Método | Ruta                          | Descripción                                  |
|--------|-------------------------------|-----------------------------------------------|
| POST   | `/api/songs`                  | Sube un archivo de audio.                     |
| POST   | `/api/songs/{id}/analyze`     | Encola el análisis (Celery).                  |
| GET    | `/api/songs/{id}`             | Estado/fase y resultado (para *polling*).     |
| GET    | `/api/songs/{id}/audio`       | Streaming del audio original (reproductor).   |
| PUT    | `/api/songs/{id}`             | Guarda ediciones manuales de letra/acordes/capo/transposición. |
| GET    | `/api/songs/{id}/export?format=txt\|chordpro\|json` | Exporta el resultado. |
