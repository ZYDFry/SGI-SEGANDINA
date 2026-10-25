# SGI-SEGANDINA — Frontend

Next.js 16 (App Router) + TypeScript + Tailwind CSS + Axios. Consume la API REST del backend Spring Boot.

## Configuración

Copia `.env.example` a `.env.local` y define la URL de la API:

```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

El backend debe permitir el origen del frontend en `CORS_ORIGENES` (por defecto `http://localhost:3000`).

## Comandos

```
npm install
npm run dev     # http://localhost:3000
npm run lint
npm run build
```

## Pantallas

| Ruta | Roles |
|---|---|
| `/login` | público |
| `/incidencias/nueva` | Vigilante, Administrador |
| `/dashboard` | Administrador, Supervisor |

Tras el login, el Vigilante va a `/incidencias/nueva`; el Administrador y el Supervisor, a `/dashboard`.
La sesión (JWT) se guarda en `localStorage` y se cierra al vencer, al cerrar sesión o ante un 401 de la API.
