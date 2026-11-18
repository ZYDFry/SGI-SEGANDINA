# Evidencias de pruebas — SGI-SEGANDINA

Esta carpeta guarda el resultado de la última corrida automática de pruebas:

| Archivo | Contenido |
|---|---|
| `index.html` | Portada (proyecto, curso, fecha de ejecución, rama y commit), resumen de pruebas aprobadas, fallidas y omitidas por tipo, enlaces a los reportes detallados y galería por tipo y por caso (`CP-xx`) con RF, descripción, resultado esperado, resultado obtenido, estado y capturas. |
| `reporte_pruebas.pdf` | El mismo contenido en A4: portada, índice (con marcadores del PDF), resumen, una sección por tipo de prueba, capturas sin cortar entre páginas y numeración "Página X de Y". |
| `capturas/CP-xx_descripcion.png` | Capturas que toma Playwright en cada paso clave, nombradas con el ID del caso del plan de pruebas (`docs/plan_pruebas_integrales.md`). Si una prueba falla, se guarda además `CP-xx_fallo.png` con la pantalla en el momento del fallo. |

Las pruebas fallidas aparecen como **Fallido** con el error real; una prueba que no se pudo ejecutar (por falta de
credenciales o porque el servidor no estaba corriendo) aparece como **No ejecutado** u omitida, nunca como aprobada.

## Qué se ejecuta

| Paso | Herramienta | Qué prueba | Dónde queda el reporte detallado (no se versiona) |
|---|---|---|---|
| 1 | JUnit 5 + Surefire + JaCoCo | Los tests unitarios y de integración del backend (H2) y su cobertura. | `backend/target/reports/surefire.html`, `backend/target/site/jacoco/index.html` |
| 2 | Newman + htmlextra | La colección `postman/collections/SGI-SEGANDINA` contra el backend en ejecución. Por defecto solo Login y consultas (GET); con `--completo` también altas, ediciones y bajas. "Usuarios Mi Contrasena" nunca se ejecuta (cambiaría la contraseña del Administrador). | `pruebas/reportes/newman/newman.html` |
| 3 | Playwright (Chromium) | Login por rol y redirección, login con DNI con letras, con 7 dígitos y con credenciales incorrectas, avisos de validación (login, cambio de contraseña, incidencias, personal y catálogos), registro de una incidencia en 360 px, acceso a rutas de otro rol, dashboard, historial, exportación Excel y PDF, auditoría, personal y catálogos. | `pruebas/reportes/playwright/html/index.html` |
| 4 | `pruebas/scripts/reporte.mjs` | Junta los resultados y genera `index.html` y `reporte_pruebas.pdf`. | — |

Datos que escribe cada paso en la base:

- Newman en modo por defecto: solo un registro `LOGIN_OK` en auditoría por la petición "Login".
- Newman en modo por defecto, con `E2E_SUPERVISOR_*`: además inicia sesión como Supervisor y prueba CP-123 (reasignar
  a un Supervisor, crear un usuario y desactivar uno); el backend las rechaza (400 y 403) y no cambia nada.
- Newman con `--reasignacion`: lo mismo que el modo por defecto más CP-121 y CP-125: mueve al Vigilante de prueba
  (`E2E_VIGILANTE_*`) a otra zona activa, comprueba que las incidencias por zona no cambian y lo devuelve a la suya. Quedan dos registros `REASIGNAR_ZONA` en la
  auditoría (A → B y B → A) y ningún otro cambio. Necesita que la zona del Vigilante esté activa; si la devolución
  falla, hay que reasignarlo a mano desde Personal o desde la pantalla de la zona.
- Newman con `--correccion`: lo mismo que el modo por defecto más CP-26 y CP-129 a CP-131 (corrección de la incidencia
  por su autor, RF-03). Es el modo pensado para la base real, porque escribe lo mínimo: **una incidencia de prueba del
  Administrador** ("Prueba CP-129: descripción corregida", en la primera zona, tipo y nivel activos), que queda para
  siempre porque no hay borrado físico y cuenta una vez en el dashboard y el historial, y **dos registros de
  auditoría** (`REGISTRAR_INCIDENCIA` y `EDITAR_INCIDENCIA`). CP-130 (fuera de plazo) y CP-131 (incidencia ajena) los
  rechaza el backend y no cambian nada. No toca usuarios, zonas, tipos ni niveles. CP-130 necesita alguna incidencia
  propia del Administrador o del Vigilante registrada hace más de 15 minutos; CP-131 necesita `E2E_VIGILANTE_*`.
- Newman con `--completo`: crea un usuario con un DNI ficticio aleatorio (`7xxxxxxx`), la zona "Sede Surco" y el tipo
  "Incendio"; edita y desactiva el usuario 2, la zona 1 y el tipo 1; restablece la contraseña del usuario 2 y edita el
  nivel 1. **Úsalo solo con una base de prueba que se pueda restaurar**, y nunca si el usuario 2 es uno de los usuarios
  de Playwright.
- Playwright: una incidencia con la descripción "Prueba E2E Playwright &lt;fecha&gt;" registrada por el Vigilante de
  prueba y un intento de login fallido. Las pruebas de personal y catálogos no crean ni modifican registros.

## Requisitos

- JDK 21 con `JAVA_HOME` apuntando a él.
- Node.js 24 y `curl` (incluido en Windows 10 y 11).
- Dependencias: `npm ci` en `pruebas/` y en `frontend/`, y el navegador de Playwright: `cd frontend && npx playwright install chromium`
  (`ejecutar-todo.cmd` lo hace si falta).
- Backend corriendo: `cd backend && .\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local`.
- Frontend corriendo: `cd frontend && npm run dev` (o `npm run build && npm run start`).
- Un usuario de prueba activo por rol, sin contraseña temporal, con DNI ficticio. El Vigilante debe tener zona
  asignada y deben existir al menos un tipo de evento y un nivel de gravedad activos.

## Variables de entorno

| Variable | Uso | Por defecto |
|---|---|---|
| `BASE_URL` | URL de la API. | `http://localhost:8080` |
| `FRONTEND_URL` | URL del frontend. | `http://localhost:3000` |
| `E2E_ADMIN_DNI`, `E2E_ADMIN_PASSWORD` | Administrador de prueba (Newman y Playwright). | — |
| `E2E_SUPERVISOR_DNI`, `E2E_SUPERVISOR_PASSWORD` | Supervisor de prueba (Playwright y CP-123 en Newman). | — |
| `E2E_VIGILANTE_DNI`, `E2E_VIGILANTE_PASSWORD` | Vigilante de prueba con zona asignada (Playwright). | — |
| `PRUEBAS_CONTRASENA_TEMPORAL` | Solo con `--completo`: contraseña de 8 a 72 caracteres para el usuario que se crea y para el restablecimiento. | — |

Las credenciales no se escriben en ningún archivo. Se definen en la ventana de `cmd` antes de ejecutar y se pierden al
cerrarla:

```
set E2E_ADMIN_DNI=10000001
set /p E2E_ADMIN_PASSWORD=Contraseña del Administrador: 
set E2E_SUPERVISOR_DNI=10000002
set /p E2E_SUPERVISOR_PASSWORD=Contraseña del Supervisor: 
set E2E_VIGILANTE_DNI=10000003
set /p E2E_VIGILANTE_PASSWORD=Contraseña del Vigilante: 
```

En PowerShell: `$env:E2E_ADMIN_DNI = "10000001"` y `$env:E2E_ADMIN_PASSWORD = Read-Host "Contraseña"`.

## Cómo ejecutar

Todo en orden, desde la raíz del repositorio:

```
pruebas\ejecutar-todo.cmd              rem solo lectura en la API
pruebas\ejecutar-todo.cmd --reasignacion   rem solo lectura más CP-121 y CP-125 (mueve al Vigilante y lo devuelve)
pruebas\ejecutar-todo.cmd --correccion     rem solo lectura más CP-129 a CP-131 (deja 1 incidencia de prueba)
pruebas\ejecutar-todo.cmd --completo       rem también las escrituras de la colección (base de prueba)
```

El script avisa si el backend o el frontend no responden y en ese caso omite Newman y Playwright (los tests del
backend y el reporte se generan igual). Termina con código 1 si alguna prueba falló o no se pudo ejecutar.

Por partes:

| Qué | Comando |
|---|---|
| Backend con reportes | `cd backend && .\mvnw.cmd verify surefire-report:report-only` |
| Peticiones que correrá Newman | `cd pruebas && npm run coleccion` |
| Newman | `cd pruebas && npm run newman` (o `npm run newman:reasignacion`, `npm run newman:correccion`, `npm run newman:completo`) |
| Playwright | `cd frontend && npx playwright test` (una sola: `npx playwright test login.spec.ts`) |
| Índice y PDF | `cd pruebas && npm run reporte` |

## Cómo abrir el reporte

- `docs/evidencias/pruebas/index.html`: abrirlo con doble clic en el navegador. Los enlaces a Surefire, JaCoCo,
  Newman y Playwright funcionan en la máquina donde se ejecutaron las pruebas (esos reportes no se versionan).
- `docs/evidencias/pruebas/reporte_pruebas.pdf`: cualquier lector de PDF; el panel de marcadores lleva a cada sección.
- Reporte de Playwright con el detalle de cada paso: `cd frontend && npx playwright show-report ..\pruebas\reportes\playwright\html`.

## Protección de datos

- Las capturas tapan los campos de contraseña, los campos de DNI con datos reales, la búsqueda por DNI y cualquier
  texto de 8 dígitos (DNIs en tablas).
- Las pruebas escriben DNI y contraseñas reales sin dejar su valor en el reporte de Playwright, y las sesiones de cada
  rol se guardan en `frontend/e2e/.auth/` (fuera de git).
- El reporte de Newman no incluye variables de entorno, la cabecera `Authorization` ni los cuerpos de login y de
  contraseñas.
- Al final, `reporte.mjs` busca en lo generado las contraseñas y los DNIs de las variables `E2E_*` y tokens JWT: si
  aparecen en `index.html`, no genera el PDF y termina con error; si aparecen en un reporte local, lo avisa.
