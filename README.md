# SGI-SEGANDINA

Sistema Web Interno de Gestión de Incidencias y Análisis de Seguridad para **Seguridad Andina S.A.C.**, empresa de
vigilancia privada de Lima. Proyecto del curso Integrador I (UTP).

## Índice

1. [Descripción](#descripción)
2. [Tecnologías](#tecnologías)
3. [Estructura de carpetas](#estructura-de-carpetas)
4. [Requisitos](#requisitos)
5. [Ejecución en local](#ejecución-en-local)
6. [Roles y pantallas](#roles-y-pantallas)
7. [Estado del proyecto](#estado-del-proyecto)
8. [Pruebas](#pruebas)
9. [Despliegue](#despliegue)

## Descripción

Hoy las incidencias de seguridad se anotan en cuadernos y hojas de Excel aisladas. SGI-SEGANDINA digitaliza ese
registro: los vigilantes reportan incidencias desde el celular (zona, tipo de evento, gravedad y descripción) y la
gerencia consulta un dashboard, el historial filtrable y reportes en Excel o PDF para decidir dónde reasignar
personal. Toda acción relevante queda registrada en una auditoría de solo inserción.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Backend | Java 21, Spring Boot 4.1.2 (Web MVC, Data JPA, Security, OAuth2 Resource Server para JWT, Validation), Maven Wrapper |
| Reportes | Apache POI 5.5.1 (Excel) y OpenPDF 2.4.0 (PDF) |
| Frontend | Next.js 16.4.3 (App Router), React 19.3.0, TypeScript 5, Tailwind CSS 4, Axios 1.20 |
| Base de datos | PostgreSQL en Supabase (H2 en memoria solo para los tests) |
| Seguridad | Login por DNI y contraseña (BCrypt), JWT, roles Administrador, Supervisor y Vigilante |

## Estructura de carpetas

```
backend/    API REST en Spring Boot (controller, service, dao, model, dto, config, export) y sus tests en src/test
frontend/   Aplicación Next.js: pantallas en src/app, componentes en src/components, cliente de la API en src/lib
docs/       Documentación del sistema
postman/    Colección Postman de la API (postman/collections/SGI-SEGANDINA)
```

Documentos en `docs/`:

| Archivo | Contenido |
|---|---|
| `requerimientos_funcionales.md` | Requerimientos RF-01 a RF-09, endpoints, reglas y criterios de aceptación |
| `stack_arquitectura.md` | Arquitectura y decisiones técnicas |
| `modelo_datos.sql` | Esquema de la base de datos (fuente de verdad) |
| `procesos_negocio.md` | Procesos AS-IS y TO-BE |
| `ui_pantallas.md` | Diseño de pantallas y rutas por rol |
| `referencia_clases.md` | Clases del backend y del frontend por fase, con su flujo y cómo probarlas |

El historial de cambios está en `CHANGELOG.md`.

## Requisitos

- JDK 21 (en Windows, `JAVA_HOME` debe apuntar a él).
- Node.js 20 o superior y npm.
- Una base PostgreSQL con el esquema de `docs/modelo_datos.sql` y un usuario con permisos de aplicación
  (en Supabase se usa el rol `app_sgi`).

## Ejecución en local

Ningún valor real se guarda en el repositorio: las plantillas `.env.example` listan las variables sin valores.

### Backend

1. Revisa `backend/.env.example` y define esas variables en tu entorno (o en un archivo local no versionado):
   `DB_URL`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET` (al menos 32 caracteres) y `CORS_ORIGENES`.
2. Arranca la API (queda en `http://localhost:8080`):
   ```
   cd backend
   ./mvnw spring-boot:run -Dspring-boot.run.profiles=local
   ```
   En Windows: `.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local`.
3. La primera vez, crea el Administrador inicial definiendo además `ADMIN_DNI`, `ADMIN_PASSWORD`, `ADMIN_NOMBRES` y
   `ADMIN_APELLIDO_PATERNO`, y arrancando con el perfil `seed`:
   ```
   ./mvnw spring-boot:run "-Dspring-boot.run.profiles=local,seed"
   ```
   Cuando el log muestre que el Administrador fue creado, detén la aplicación y vuelve a arrancarla solo con `local`.

### Frontend

1. Copia `frontend/.env.example` a `frontend/.env.local` y define `NEXT_PUBLIC_API_URL` (por ejemplo
   `http://localhost:8080`).
2. Instala y arranca (queda en `http://localhost:3000`):
   ```
   cd frontend
   npm install
   npm run dev
   ```

## Roles y pantallas

| Ruta | Pantalla | Roles |
|---|---|---|
| `/login` | Inicio de sesión | Público |
| `/cambiar-contrasena` | Cambio obligatorio de la contraseña temporal | Cualquier usuario con contraseña temporal |
| `/incidencias/nueva` | Registro de incidencias (pensado para celular) | Vigilante, Administrador |
| `/dashboard` | Dashboard gerencial | Administrador, Supervisor |
| `/historial` | Historial, exportación y auditoría | Administrador, Supervisor (auditoría solo Administrador) |
| `/personal` | Gestión de personal | Administrador |

Tras iniciar sesión, el Vigilante entra a `/incidencias/nueva`; el Administrador y el Supervisor, a `/dashboard`.

## Estado del proyecto

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Proyecto Spring Boot, entidades y DAO | Hecho |
| 2 | Seguridad, login con JWT, auditoría base y Administrador inicial | Hecho |
| 3 | Catálogos y registro de incidencias | Hecho |
| 4 | Gestión de usuarios y de catálogos | Hecho |
| 5 | Historial, dashboard y despliegue de vigilantes por zona | Hecho |
| 6 | Exportación de reportes en Excel y PDF | Hecho |
| 7 | Frontend base: login, rutas por rol y formulario de incidencias | Hecho |
| 8 | Frontend: dashboard, historial, auditoría, personal y catálogos; plan de pruebas y evidencias | En curso |
| 9 | Despliegue en Vercel, Render o Railway y Supabase | Pendiente |

En la Fase 8 ya están el cambio obligatorio de contraseña, los ajustes del login y este README. El dashboard
(`/dashboard`) aún es una pantalla provisional, y `/historial` y `/personal` todavía no existen.

## Pruebas

Tests unitarios y de integración del backend:

```
cd backend
./mvnw test
```

La colección Postman de `postman/collections/SGI-SEGANDINA` prueba la API con variables de entorno y sin
credenciales guardadas. Esta sección se completará con las pruebas extremo a extremo del frontend, la ejecución de
la colección por línea de comandos y la generación del reporte de evidencias.

## Despliegue

Se documentará en la Fase 9: frontend en Vercel, backend en Render o Railway y base de datos en Supabase. En
producción el backend necesita `CORS_ORIGENES` con el dominio del frontend, y el frontend `NEXT_PUBLIC_API_URL` con
la URL del backend.
