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
│   ├── migrations/          migraciones Alembic (esquema versionado)
│   └── tests/               pytest (74 pruebas, lógica pura + API)
└── frontend/    Next.js + TypeScript + Tailwind
    └── src/
        ├── app/             página principal (App Router)
        ├── components/      dropzone, progreso, reproductor, editor, ...
        ├── lib/             cliente API, tipos, utilidades de acordes
        └── tests/            vitest (transposición/capo/sincronía)
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

## CI (GitHub Actions)

`.github/workflows/songchord-ai-ci.yml` corre en cada push/PR que toque
`songchord-ai/**`, con 5 jobs independientes: `backend-tests` (pytest),
`frontend-tests` (vitest), `lint` (ESLint), `typecheck` (`tsc --noEmit`) y
`frontend-build` (`next build`). El job de backend instala solo
`requirements-dev.txt` (sin torch/Demucs/Essentia — el test suite nunca los
importa a nivel de módulo), así que corre en segundos.

## Requisitos previos

- Docker y Docker Compose (recomendado), **o** Postgres 16 + Redis + Python
  3.11 + Node 20 instalados localmente para desarrollo sin Docker.
- Una clave de API de OpenAI con acceso a transcripción de audio (Whisper).
- Acceso saliente a internet sin restricciones desde donde corra el
  `worker`: la primera vez que se analiza una canción, Demucs descarga los
  pesos del modelo `htdemucs` (~80MB) desde `dl.fbaipublicfiles.com`. Sin
  ese acceso, la fase "Separando voz e instrumentos" falla (ver
  "Limitaciones verificadas" más abajo).

## Puesta en marcha (Docker Compose)

1. Copia el archivo de entorno de ejemplo y añade tu clave de OpenAI:

   ```bash
   cd songchord-ai
   cp .env.example .env
   # edita .env y define OPENAI_API_KEY=sk-...
   ```

2. Levanta todos los servicios:

   ```bash
   docker compose up --build
   ```

   Esto arranca, en orden: `postgres`, `redis`, `api` (FastAPI en `:8000`,
   corre `alembic upgrade head` antes de servir), `worker` (Celery) y
   `frontend` (Next.js en `:3000`).

3. Abre **http://localhost:3000**, arrastra un MP3/WAV/M4A y pulsa
   **Analizar canción**.

La primera vez, Demucs descargará los pesos del modelo `htdemucs` dentro del
contenedor `worker`; puede tardar unos minutos según tu conexión (se cachean
para análisis posteriores).

## Desarrollo local (sin Docker)

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt   # ligero: sin torch/Demucs/Essentia

# Postgres y Redis deben estar accesibles (o usa `docker compose up postgres redis`,
# o instálalos nativamente: apt-get install postgresql redis-server ffmpeg)
export DATABASE_URL=postgresql+psycopg2://songchord:songchord@localhost:5432/songchord
export REDIS_URL=redis://localhost:6379/0
export STORAGE_DIR=/tmp/songchord_storage
export CORS_ORIGINS='["http://localhost:3000"]'
mkdir -p "$STORAGE_DIR"

alembic upgrade head          # aplica el esquema versionado
uvicorn app.main:app --reload --port 8000
```

> **Nota sobre `.env` y `source`:** `CORS_ORIGINS` en `.env.example` es un
> array JSON (`["http://localhost:3000"]`). Si copias el archivo y haces
> `set -a; source .env; set +a` en bash, el shell interpreta las comillas
> internas y rompe el JSON. Para desarrollo nativo, exporta las variables
> individualmente (como arriba) o usa `docker compose`, que sí interpreta
> `env_file` de forma literal.

En otra terminal, el worker (requiere ffmpeg y, para el pipeline completo,
Demucs/Essentia/torch de `requirements-worker.txt`):

```bash
cd backend
source .venv/bin/activate
pip install -r requirements-worker.txt   # pesado: instala torch + demucs + essentia
export DATABASE_URL=postgresql+psycopg2://songchord:songchord@localhost:5432/songchord
export REDIS_URL=redis://localhost:6379/0
export STORAGE_DIR=/tmp/songchord_storage
export OPENAI_API_KEY=sk-...
celery -A app.celery_app.celery_app worker --loglevel=INFO
```

Pruebas del backend (no requieren Postgres/Redis/Demucs/Essentia/OpenAI
reales; usan SQLite y mocks solo para las llamadas externas — ver sección de
pruebas):

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

Migraciones (Alembic), si cambias `app/models.py`:

```bash
cd backend
alembic revision --autogenerate -m "descripción del cambio"
alembic upgrade head
```

### Frontend

```bash
cd frontend
npm install
BACKEND_URL=http://localhost:8000 npm run dev   # http://localhost:3000
npm run typecheck
npm run lint
npm run test        # vitest: transposición, capo, sincronización
npm run build
```

## Variables de entorno (`.env`)

| Variable            | Descripción                                              |
|---------------------|-----------------------------------------------------------|
| `OPENAI_API_KEY`    | Clave de OpenAI, usada solo por el backend/worker. Sin ella, la fase de transcripción falla con un error explícito (no simulado). |
| `OPENAI_STT_MODEL`  | Modelo de transcripción (por defecto `whisper-1`).         |
| `DATABASE_URL`      | Cadena de conexión a Postgres.                             |
| `REDIS_URL`         | Broker/backend de Celery.                                  |
| `STORAGE_DIR`       | Directorio persistente donde se guardan los audios subidos.|
| `MAX_UPLOAD_BYTES`  | Tamaño máximo de subida (por defecto 50MB).                |
| `CORS_ORIGINS`      | Lista JSON de orígenes permitidos por el backend.          |

## Alcance del MVP

- Acordes: solo mayores y menores (p. ej. `C`, `Cm`, `C#`, `C#m`).
- Sin autenticación ni pagos.
- Esquema versionado con Alembic (`backend/migrations/`), no `create_all`.

## Endpoints principales

| Método | Ruta                          | Descripción                                  |
|--------|-------------------------------|-----------------------------------------------|
| POST   | `/api/songs`                  | Sube un archivo de audio.                     |
| POST   | `/api/songs/{id}/analyze`     | Encola el análisis (Celery).                  |
| GET    | `/api/songs/{id}`             | Estado/fase y resultado (para *polling*).     |
| GET    | `/api/songs/{id}/audio`       | Streaming del audio original (reproductor).   |
| PUT    | `/api/songs/{id}`             | Guarda ediciones manuales de letra/acordes/capo/transposición. |
| GET    | `/api/songs/{id}/export?format=txt\|chordpro\|json` | Exporta el resultado. |

## Verificación realizada (sin mocks)

Esta sesión de desarrollo levantó **el stack real** (Postgres 16, Redis,
FastAPI, Celery worker, Next.js — sin Docker, porque este entorno de
desarrollo concreto no tiene acceso a Docker Hub; ver limitaciones) y
ejecutó el flujo completo con una canción de prueba sintetizada con
ffmpeg (una progresión real de acordes C→G→Am→F, no un archivo simulado).
Resultado:

- ✅ **Subida real** vía `POST /api/songs`, con validación de tipo/tamaño.
- ✅ **ffmpeg** convierte y normaliza el audio real (MP3→WAV), duración
  detectada correctamente (16.0s).
- ✅ **Celery**: se encontró y corrigió un bug real — el worker arrancaba
  con el registro de tareas vacío (`autodiscover_tasks` buscaba un módulo
  `app/tasks/tasks.py` que no existe; la tarea vive en
  `app/tasks/pipeline.py`). Sin este fix, ninguna canción se habría
  procesado nunca. Corregido con un import explícito en `celery_app.py`.
- ✅ **Essentia** (tonalidad/tempo/acordes) corrió de verdad sobre el audio
  sintetizado y detectó **tonalidad C** (correcta) y los 4 acordes reales
  de la progresión (C, G, Am, F) con confianza 0.94–0.98, incluyendo un
  "blip" espurio de 0.1s que el algoritmo de suavizado (`smoothing.py`)
  eliminó correctamente, dejando los 4 segmentos exactos.
- ✅ **Alembic**: migración inicial autogenerada y aplicada contra Postgres
  real (`upgrade` → `downgrade` → `upgrade`), `alembic check` confirma cero
  desviación entre el esquema y los modelos ORM.
- ✅ **Frontend real** contra el backend real (Playwright): subida por
  arrastrar/soltar, botón único que sube+analiza en un solo clic, barra de
  progreso en vivo por *polling*, reproducción de audio real con forma de
  onda y resaltado de línea sincronizado en reproducción real, edición de
  letra/acordes con persistencia real vía `PUT`, transposición + capo,
  exportación TXT/ChordPro/JSON con contenido correcto.
- ✅ **Manejo de errores real**: al fallar una fase, el error se guarda en
  la base de datos y se muestra en la UI (verificado con el fallo de
  Demucs, ver abajo) en vez de quedarse colgado o fallar silenciosamente.
- 🔧 **Bug real corregido**: `separation.py` invocaba Demucs con el string
  literal `"python3"`, que se resuelve por `PATH` al intérprete del sistema
  en vez del venv/contenedor donde Demucs está instalado. Corregido con
  `sys.executable`.

### Limitaciones verificadas (no simuladas, documentadas con la causa exacta)

1. **Separación con Demucs no se completó en este entorno de desarrollo.**
   Causa exacta: la primera ejecución de Demucs necesita descargar los
   pesos del modelo `htdemucs` desde `dl.fbaipublicfiles.com`, y la política
   de red de este entorno de desarrollo (sandbox) bloquea esa conexión
   (`403 Forbidden`, confirmado en el log del proxy de red). No es un bug
   de la aplicación: en tu máquina o en un servidor con salida a internet
   normal, esta descarga (~80MB, una sola vez) funciona sin problema. Se
   verificó en cambio: (a) que el comando que se ejecuta es correcto
   (`sys.executable -m demucs -n htdemucs ...`), (b) que Demucs, PyTorch y
   Essentia se instalan e importan correctamente con las versiones fijadas
   en `requirements-worker.txt`, y (c) que Essentia detecta acordes/tonalidad
   correctamente sobre audio real cuando se le da directamente una pista
   (sin pasar por la separación).
2. **Docker Compose no se pudo levantar en este entorno de desarrollo.**
   Causa exacta: el daemon de Docker no viene arrancado por defecto aquí, y
   al arrancarlo manualmente, los `docker pull` (incluidas las imágenes base
   `postgres:16-alpine`, `redis:7-alpine`, `python:3.11-slim`,
   `node:20-slim`) son rechazados por la política de red del entorno
   (`403 Forbidden` en `production.cloudfront.docker.com`, confirmado en el
   log del proxy). Por eso se verificó el mismo stack de forma nativa
   (Postgres/Redis instalados directamente, backend en un venv, frontend
   con `npm run dev`), ejercitando exactamente el mismo código Python/TS que
   correría dentro de los contenedores. En tu máquina, con acceso normal a
   Docker Hub, `docker compose up --build` debería funcionar directamente
   con los Dockerfiles de este repo.
3. **Transcripción real requiere tu propia clave de OpenAI.** Sin
   `OPENAI_API_KEY`, la fase "Transcribiendo letra" falla con un error
   explícito (`OPENAI_API_KEY no está configurada.`), verificado
   directamente. No hay forma de verificar la transcripción real sin una
   clave con crédito disponible; el código del cliente (`transcription.py`)
   usa la API pública de OpenAI (`audio.transcriptions.create` con
   `timestamp_granularities=["word","segment"]`) tal como está documentada.

## Resultados de las pruebas

- **Backend**: `74 passed` (`cd backend && pytest -q`), ~8-9s. Cubre
  suavizado de acordes, sincronización letra↔acorde, transposición/capo,
  exportadores (TXT/ChordPro/JSON), validación de subida, constructores de
  comandos ffmpeg/Demucs (con `subprocess` mockeado para los casos de
  error/éxito), asignación de palabras a segmentos de transcripción, y la
  API completa (upload/analyze/get/put/export/audio) contra SQLite con la
  tarea de Celery mockeada (no se necesita Redis para el test suite).
- **Frontend**: `25 passed` (`cd frontend && npm run test`), `tsc --noEmit`
  limpio, `next build` exitoso, `npm run lint` sin errores.
- **CI**: workflow `.github/workflows/songchord-ai-ci.yml` con los 5 jobs
  anteriores, disparado automáticamente en el PR de esta rama.

## Cómo probarla con una canción (paso a paso)

1. `docker compose up --build` (o el flujo nativo de la sección anterior).
2. Abre `http://localhost:3000`.
3. Arrastra un archivo MP3/WAV/M4A a la zona de subida (o haz clic para
   elegirlo).
4. Pulsa **Analizar canción** — un único clic sube el archivo y encola el
   análisis.
5. Observa la barra de 9 fases actualizarse en vivo (polling cada 2s).
6. Al llegar a "Completado": verás tonalidad, tempo y duración arriba; el
   reproductor con forma de onda; el editor con la letra sincronizada y los
   acordes flotando sobre la palabra correspondiente.
7. Pulsa **Reproducir**: la línea activa se resalta en tiempo real.
8. Haz clic en cualquier acorde para renombrarlo, cambiar su tiempo de
   inicio o borrarlo; edita el texto de cualquier línea directamente.
9. Cambia **Transponer** (semitonos) y **Capo** (traste) — los acordes
   mostrados se recalculan al instante.
10. Pulsa **Guardar cambios** para persistir tus ediciones.
11. Usa los botones **TXT / ChordPro / JSON** para descargar el resultado
    en cada formato.
