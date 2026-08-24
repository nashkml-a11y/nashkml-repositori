# Buscador — frontend (PWA)

App instalable (React + Vite + Tailwind + `vite-plugin-pwa`) para preguntar en lenguaje
natural dónde has guardado cada objeto de casa. Ver el README raíz del repositorio para
la visión general del proyecto y cómo levantar frontend + backend juntos.

## Desarrollo

```bash
npm install
cp .env.example .env   # ajusta VITE_API_URL si el backend no está en localhost:3001
npm run dev
```

## Build de producción

```bash
npm run build   # genera dist/ con el manifest y el service worker
npm run preview
```

## Variables de entorno

- `VITE_API_URL`: URL del backend (`server/`). Por defecto `http://localhost:3001`.

La app nunca llama directamente a la API de IA: todas las peticiones de IA pasan por el
backend, que es quien guarda la clave de Anthropic.
