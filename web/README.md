# Buscador — frontend (PWA)

App instalable (React + Vite + Tailwind + `vite-plugin-pwa`) para preguntar en lenguaje
natural dónde has guardado cada objeto de casa. Ver el README raíz del repositorio para
la visión general del proyecto y cómo desplegar frontend + backend juntos en Cloudflare.

## Desarrollo

```bash
npm install
cp .env.example .env   # ajusta VITE_API_URL si el backend no está en localhost:8787
npm run dev
```

## Build de producción

```bash
npm run build   # genera dist/ con el manifest y el service worker
npm run preview
```

## Despliegue en Cloudflare Pages

```bash
VITE_API_URL="https://tu-worker.workers.dev" npm run deploy
```

(o conecta el repo desde el dashboard de Cloudflare — ver README raíz).

## Variables de entorno

- `VITE_API_URL`: URL del backend (`server/`, un Cloudflare Worker). Por defecto
  `http://localhost:8787` en desarrollo.

La app nunca llama directamente a la API de IA: todas las peticiones de IA pasan por el
backend, que es quien guarda la clave de Anthropic.
