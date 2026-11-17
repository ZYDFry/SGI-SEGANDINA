# CHANGELOG

Registro de avances de SGI-SEGANDINA. Se agrega una entrada al terminar cada tarea (la más reciente arriba).

Formato de cada entrada:

```
## [AAAA-MM-DD] Fase / RF — título corto
- Qué se hizo
- Archivos clave
- Cómo probarlo
- Pendientes o problemas conocidos
```

## [2026-11-17] Fase 8 / RF-05 — usabilidad del filtrado cruzado del dashboard
- Qué se hizo:
  - Barra de filtros activos siempre visible justo encima de los KPI y gráficos, fija al desplazar en pantallas
    grandes: chips con "×", botón "Quitar filtros" (antes "Quitar todo") y "Mostrando todo" cuando no hay filtros.
    Cada cambio se anuncia con `aria-live`.
  - Aviso "Filtrado por <valor> · Ver todo" en el encabezado de las barras, el anillo y la serie cuando otro
    filtro los afecta; "Ver todo" quita ese filtro.
  - Más formas de quitar un filtro: clic en el espacio vacío a la derecha de una barra o en el centro del anillo,
    y Escape con el foco en el dashboard (quita todos; no actúa dentro de campos ni selectores). "Atrás" ya
    restauraba el estado anterior porque los filtros viven en la URL.
  - Indicación de uso bajo el título: "Haz clic en un gráfico para filtrar. Quita los filtros con × o con Quitar
    filtros".
  - En las barras, el clic ya no responde en toda la fila: solo desde el inicio hasta el extremo de la barra (al
    menos 24 px), para dejar espacio vacío donde quitar el filtro. El tooltip sigue en toda la fila.
- Archivos clave: `frontend/src/components/ChipsFiltros.tsx`, `frontend/src/app/(privado)/dashboard/PanelDashboard.tsx`,
  `frontend/src/components/graficos/{GraficoBarras,GraficoAnillo}.tsx`, `frontend/src/components/graficos/registro.ts`,
  `frontend/e2e/dashboard-filtros.spec.ts`, `pruebas/casos.mjs`, `docs/ui_pantallas.md`,
  `docs/plan_pruebas_integrales.md`, `docs/referencia_clases.md`.
- Cómo probarlo: `cd frontend && npx playwright test e2e/dashboard-filtros.spec.ts` (CP-110 a CP-116, 7 de 7
  aprobadas el 17/11/2026); a mano, los pasos de CP-115 y CP-116.
- Corrida completa del 17/11 (11:30): 287 pruebas aprobadas, 0 fallidas y 0 omitidas (backend 215, Newman 27,
  Playwright 45); índice y PDF de evidencias regenerados con CP-115 y CP-116. Pruebas manuales del dashboard
  aprobadas.
- Pendientes: revisar el anuncio `aria-live` con NVDA.

## [2026-11-17] Mantenimiento — Next.js 16.4.6 por aviso de seguridad
- Qué se hizo:
  - `next` y `eslint-config-next` pasan de 16.4.3 a 16.4.6 (versión exacta), porque 16.4.3 está afectada por un
    aviso de seguridad publicado. Es una actualización dentro de la misma versión mayor: sin codemods ni cambios
    en el código de la aplicación.
  - `next.config.ts`: se agrega `experimental.agentUpgrade: "security"`; el resto de la configuración no cambia.
- Archivos clave: `frontend/package.json`, `frontend/package-lock.json`, `frontend/next.config.ts`.
- Cómo probarlo: `cd frontend && npm install && npx next --version` (debe decir 16.4.6), `npm run lint` y
  `npm run build`; luego `npm run dev` y revisar el login y el dashboard.
- Pendientes o problemas conocidos: `next build` falla en `/_global-error` ("Cannot read properties of null
  (reading 'useContext')") si la terminal tiene `NODE_ENV=development`; con `NODE_ENV=production` o sin la variable
  compila bien. Conviene revisarlo antes del despliegue (Fase 9).

## [2026-11-17] Fase 8 — corrida completa de pruebas y ajuste de CP-84
- Qué se hizo:
  - Corrida de `pruebas\ejecutar-todo.cmd` del 17/11: backend 215 de 215 tests aprobados, Newman 27 de 27
    aserciones aprobadas y Playwright 45 de 46 aprobadas. CP-110 a CP-114 (filtros del dashboard) aprobados y anotados
    en el plan de pruebas.
  - CP-84 fallaba porque buscaba cualquier elemento `role="alert"` en la página y encontraba el anunciador de rutas
    de Next (`next-route-announcer`, vacío y fuera de `<main>`). La prueba ahora busca los avisos solo dentro de
    `<main>`; repetida sola, aprobada. No era un fallo de la aplicación.
- Archivos clave: `frontend/e2e/login.spec.ts`, `docs/plan_pruebas_integrales.md`.
- Cómo probarlo: `cd frontend && npx playwright test e2e/login.spec.ts -g "CP-84"`.
- Corrida completa repetida el 17/11 (10:38): backend 215 de 215, Newman 27 de 27 y Playwright 46 de 46 aprobadas;
  índice y PDF de evidencias regenerados, sin capturas de fallo.
- Pendientes: ninguno.

## [2026-11-16] Fase 8 / RF-05 — dashboard con filtros globales y filtrado cruzado
- Qué se hizo (solo frontend; el backend ya aceptaba los filtros):
  - Barra de filtros global en el dashboard (periodo, zona, tipo y gravedad) que afecta a KPI, barras, anillo y serie.
  - Filtrado cruzado: clic en una barra de zona, un sector del anillo (o su leyenda) o una tarjeta de gravedad aplica
    o quita el filtro. Cada gráfico se consulta sin su propio filtro y resalta lo elegido (el resto atenuado).
    Alternativa con teclado: botones "Filtrar por …" en la tabla de datos de cada gráfico, visible al enfocarla.
  - Chips de filtros activos con "×" y "Quitar todo".
  - Filtros en la URL (`?periodo=&desde=&hasta=&idZona=&idTipoEvento=&idNivelGravedad=`) en el dashboard y el
    historial: enlaces compartibles y "Atrás" funcional. Botón "Ver en historial" con los mismos parámetros.
  - Diseño preparado para el filtro "Estado actual" (`DIMENSIONES` en `filtrosUrl.ts`) y la sección "Atención de
    casos" (bloques separados en `PanelDashboard`).
  - Casos CP-110 a CP-114 en el plan de pruebas, `pruebas/casos.mjs` y `e2e/dashboard-filtros.spec.ts` (respuestas
    simuladas con datos ficticios).
- Archivos clave: `frontend/src/lib/filtrosUrl.ts`, `frontend/src/lib/useFiltroUrl.ts`,
  `frontend/src/components/ChipsFiltros.tsx`, `frontend/src/app/(privado)/dashboard/PanelDashboard.tsx`,
  `frontend/src/app/(privado)/historial/HistorialIncidencias.tsx`, `frontend/src/components/graficos/*`,
  `frontend/src/components/FiltrosIncidencia.tsx`, `frontend/src/components/Tarjeta.tsx`.
- Cómo probarlo: `cd frontend && npm run lint && npm run build` (sin errores el 16/11);
  `npx playwright test e2e/dashboard-filtros.spec.ts` (5 de 5 aprobadas el 16/11 con una sesión de prueba local, sin
  backend; falta la corrida con las sesiones reales y sus capturas). A mano: "Cómo probar" de la sección RF-05 en
  `docs/referencia_clases.md`.
- Pendientes: corrida completa de Playwright con backend (incluye `paneles.spec.ts`: CP-45, CP-38 y CP-51), resultados
  de CP-110 a CP-114 en el plan y regenerar el índice y el PDF de evidencias. El filtro "Estado actual" y la sección
  "Atención de casos" quedan para después.

## [2026-11-14] Fase 8 — revisión de la corrida de Playwright: DEF-01 cerrado y CP-106
- Qué se hizo:
  - Corrida del 14/11: 37 de 41 aprobadas; CP-107 a CP-109 (menú por rol) aprobadas. Fallaban CP-90, CP-96, CP-99
    (DEF-01) y CP-106; ninguno por el menú.
  - DEF-01: la causa era el efecto de `Modal` ejecutado dos veces en desarrollo (modo estricto de React): la limpieza
    devolvía el foco al botón que abrió el modal, el primer campo mostraba su aviso y el botón de envío quedaba
    desactivado antes del clic. `Modal` guarda el elemento que lo abrió una sola vez y solo le devuelve el foco al
    cerrarse de verdad. Defecto cerrado.
  - CP-106: el indicador flotante de Next (`npm run dev`) interceptaba los clics en la hoja de zonas a 360 px; la
    prueba lo oculta al abrir la pantalla. No era un fallo de la aplicación.
  - Plan de pruebas: resultados de CP-90, CP-96, CP-99, CP-106 y CP-107 a CP-109 (Aprobado) y DEF-01 cerrado. Se
    borran las capturas `CP-90_fallo.png`, `CP-96_fallo.png`, `CP-99_fallo.png` y `CP-106_fallo.png`.
- Archivos clave: `frontend/src/components/Modal.tsx`, `frontend/e2e/incidencia.spec.ts`,
  `docs/plan_pruebas_integrales.md`, `docs/referencia_clases.md`.
- Cómo probarlo: `npx playwright test e2e/validaciones.spec.ts e2e/incidencia.spec.ts e2e/navegacion.spec.ts`
  (21 aprobadas el 14/11); después `pruebas\ejecutar-todo.cmd` para regenerar el índice y el PDF.
- Pendientes: `docs/evidencias/pruebas/index.html` y `reporte_pruebas.pdf` aún reflejan la corrida anterior.

## [2026-11-13] Fase 8 — menú de navegación claro por rol
- Qué se hizo:
  - Íconos SVG en línea (sin dependencias) para cada opción del menú y grupos titulados "Gestión", "Administración"
    y "Mi cuenta"; `OpcionMenu` gana `grupo`, `icono`, `etiquetaCorta` y `disponible`. "Mis incidencias" del
    Vigilante queda preparada (`disponible: false`) hasta que exista su pantalla.
  - Encabezado con el título de la pantalla actual; botón "Menú" con ícono, `aria-expanded` y `aria-controls`.
  - Panel deslizable (tablet y celular): foco al primer enlace al abrir, Tab dentro del panel, Escape para cerrar y
    foco de vuelta al botón; "Cerrar sesión" dentro de "Mi cuenta". Escritorio: barra lateral con los mismos íconos y grupos.
  - Vigilante en el celular (< 640 px): barra inferior fija con "Registrar" y "Mi cuenta" (hoja con "Cambiar mi
    contraseña" y "Cerrar sesión"), opción activa con `aria-current`. El botón fijo "Registrar incidencia" se ubica
    encima de la barra (variable CSS `--alto-barra-inferior`).
  - En el celular, "Cerrar sesión" sale del encabezado y queda en "Mi cuenta". La lógica de acceso por rol no cambia.
- Archivos clave: `frontend/src/lib/roles.ts`, `frontend/src/components/IconoMenu.tsx` (nuevo),
  `BarraInferior.tsx` (nuevo), `MenuLateral.tsx`, `Encabezado.tsx`, `MarcoPrivado.tsx`,
  `app/(privado)/incidencias/nueva/FormularioIncidencia.tsx`, `frontend/e2e/navegacion.spec.ts` (nuevo),
  `pruebas/casos.mjs`, `docs/plan_pruebas_integrales.md` (sección 5.14), `docs/ui_pantallas.md`, `docs/referencia_clases.md`.
- Cómo probarlo: `cd frontend && npm run lint && npm run build`; con las variables `E2E_*`,
  `npx playwright test e2e/navegacion.spec.ts` (CP-107 a CP-109) y el resto de la suite para descartar regresiones.
- Pendientes: los casos CP-107 a CP-109 quedan "Pendiente" en el plan hasta la próxima corrida con evidencias
  (`pruebas\ejecutar-todo.cmd`); la pantalla "Mis incidencias" no existe todavía.

## [2026-11-13] Fase 8 / RF-03 — el Vigilante solo registra en su zona asignada
- Qué se hizo:
  - Backend: en `registrar()`, si el usuario es Vigilante se valida su zona antes de buscar la pedida: sin zona → 400
    "No tiene una zona asignada; avise al Administrador"; zona asignada inactiva → 400 "Su zona asignada está
    inactiva; avise al Administrador"; `idZona` distinto → 400 "Solo puede registrar incidencias en su zona
    asignada". El Administrador puede elegir cualquier zona activa. El contrato no cambia.
  - Frontend: el formulario vuelve a leer el usuario con `GET /api/auth/yo` al abrirse (`refrescarUsuario`). El
    Vigilante ve su zona fija (título "Zona asignada" y una tarjeta con solo el nombre y el distrito, sin selector); sin zona o con la zona inactiva, aviso
    y botón de registro desactivado con el motivo. El Administrador usa el selector con búsqueda. Los nuevos 400 se
    muestran bajo la zona.
  - RF-03 actualizado (se quita "preseleccionada (propuesto), editable").
  - Pruebas: 5 tests nuevos en `IncidenciaServiceImplTest` (215 en total). Playwright: CP-105 (Vigilante: zona fija,
    sin zona, zona inactiva) y CP-106 (Administrador elige otra zona) con zonas, usuario y registro simulados; CP-89 pasa
    a la sesión de Administrador; CP-31 comprueba que se envía la zona asignada. Postman: "Login Vigilante" y
    "Registrar Incidencia Otra Zona" (CP-104, 400, no escribe); Newman las corre con `E2E_VIGILANTE_DNI` y
    `E2E_VIGILANTE_PASSWORD` y las omite sin ellas. El conversor de la colección acepta auth bearer por petición.
- Archivos clave: `backend/.../service/IncidenciaService.java`, `backend/.../service/impl/IncidenciaServiceImpl.java`,
  `IncidenciaServiceImplTest.java`, `frontend/src/app/(privado)/incidencias/nueva/FormularioIncidencia.tsx`,
  `frontend/src/lib/servicios.ts`, `frontend/e2e/incidencia.spec.ts`,
  `postman/collections/SGI-SEGANDINA/{Login Vigilante,Registrar Incidencia Otra Zona}.request.yaml`,
  `pruebas/scripts/{coleccion,newman}.mjs`, `pruebas/casos.mjs`, `docs/requerimientos_funcionales.md`,
  `docs/plan_pruebas_integrales.md`, `docs/ui_pantallas.md`, `docs/referencia_clases.md`.
- Cómo probarlo: `cd backend && .\mvnw.cmd -q verify`; `cd frontend && npm run lint && npm run build`; con las
  variables `E2E_*`, `npx playwright test e2e/incidencia.spec.ts` y `cd pruebas && npm run newman`.
- Resultados (13/11/2026): `verify` con 215 tests sin fallos; lint, build y `tsc` sin errores; `postman collection lint`
  sin problemas. Playwright y Newman no se corrieron (faltan las variables `E2E_*` en esta sesión).
- Pendientes: correr Playwright y Newman con credenciales para regenerar las capturas CP-89, CP-104 a CP-106. El
  Vigilante de prueba necesita una zona activa para CP-31. Si su zona está inactiva, CP-104 recibe "Su zona asignada
  está inactiva…" y su test falla.

## [2026-11-13] Fase 8 — Corrección de DEF-01 (botón de envío desactivado antes del clic)
- Qué se hizo:
  - En "Agregar personal", "Nueva zona" y "Nuevo tipo de evento", pulsar el botón de crear con el formulario vacío
    solo mostraba el aviso del primer campo y no se procesaba el clic. Al presionar, el campo enfocado perdía el foco,
    su aviso aparecía y el botón se desactivaba antes de recibir el clic.
  - `Boton`: un botón `type="submit"` ya no toma el foco al presionarlo con el mouse o el dedo
    (`onMouseDown` con `preventDefault`). El clic llega, se muestran todos los avisos y el foco va al primer campo con
    error. Con el teclado se enfoca igual. Aplica a todos los formularios del sistema. Se mantiene que el botón quede
    desactivado mientras haya avisos visibles.
  - Plan de pruebas: DEF-01 queda corregido, pendiente de verificar en la próxima corrida. Se actualizó el resultado
    esperado de CP-13 (el Vigilante sí tiene menú, con "Cambiar mi contraseña"; el Administrador ve también Personal y
    Catálogos) en el plan y en `pruebas/casos.mjs`.
- Archivos clave: `frontend/src/components/Boton.tsx`, `docs/plan_pruebas_integrales.md`, `pruebas/casos.mjs`.
- Cómo probarlo: `cd frontend && npm run lint && npm run build` (pasan). Con las variables `E2E_*`:
  `npx playwright test e2e/validaciones.spec.ts -g "CP-90|CP-96|CP-99"` y después `pruebas\ejecutar-todo.cmd` para
  regenerar el índice y el PDF de evidencias.
- Pendientes: falta la corrida de Playwright que confirme CP-90, CP-96 y CP-99, y los 17 casos manuales pendientes
  del plan de pruebas.

## [2026-11-13] Fase 8 — Validación visible del DNI
- Qué se hizo:
  - Componente `CampoDni` para los tres campos DNI (login, alta y edición de personal, filtro de auditoría): ayuda fija
    debajo ("8 dígitos, solo números"; en auditoría "Hasta 8 dígitos, solo números"), contador "n/8" a la derecha y,
    al teclear o pegar un carácter no numérico, el bloqueo de siempre más un aviso ámbar "Solo se permiten números"
    durante 3 s, anunciado con `aria-live`.
  - Al salir con menos de 8 dígitos, "El DNI debe tener 8 dígitos numéricos" en rojo (login y personal). En auditoría
    no, porque el filtro busca por los primeros dígitos.
  - `MotivoDesactivado`: junto al botón desactivado ("Ingresar", "Crear usuario"/"Guardar cambios", "Buscar"), el
    primer aviso pendiente ("Revisa el campo DNI: …"), también como `title` y enlazado con `aria-describedby`.
  - `validaciones.ts`: `MENSAJES.soloNumeros`, `AYUDA_DNI`, `AYUDA_DNI_BUSQUEDA`, `AVISO_TEMPORAL_MS`,
    `tieneNoDigitos`. `useValidacion`: `primerErrorVisible()`. `bloquearNoDigitos` pasó de `CampoTexto` a `CampoDni`.
  - Corrección de paso: en personal, pegar `12a34b5678` dejaba `123456` (el `maxLength` cortaba antes de quitar las
    letras); ahora deja `12345678`, como en el login.
  - Sin cambios en el backend.
- Archivos clave: `frontend/src/components/{CampoDni,MotivoDesactivado,CampoTexto}.tsx`,
  `frontend/src/lib/{validaciones,useValidacion}.ts`, `frontend/src/app/login/FormularioLogin.tsx`,
  `frontend/src/app/(privado)/personal/FormularioUsuario.tsx`,
  `frontend/src/app/(privado)/historial/auditoria/ConsultaAuditoria.tsx`, `docs/plan_pruebas_integrales.md` (CP-70 a
  CP-73 y CP-88), `docs/referencia_clases.md`.
- Cómo probarlo: `cd frontend && npm run lint && npm run build`; `npx playwright test e2e/login.spec.ts`; a mano,
  CP-70 a CP-73 en `/login` y "+ Agregar personal", y CP-88 en `/historial/auditoria`.
- Resultados (13/11/2026): lint y build sin errores. Playwright: CP-70, CP-72, CP-77, CP-84 y CP-74 aprobados; CP-90
  sigue fallando por DEF-01 (ya conocido). Capturas CP-70, CP-72, CP-74, CP-77 y CP-84 regeneradas con la nueva
  vista.
- Pendientes o problemas conocidos:
  - Las pruebas de Playwright no verifican todavía la ayuda, el contador, el aviso ámbar ni el texto del botón:
    CP-70 a CP-73 y CP-88 quedan en `Pendiente` hasta probarlos a mano o automatizarlos.
  - DEF-01 sigue abierto, pero ahora el texto junto al botón explica por qué queda desactivado.

## [2026-11-13] Fase 8 / RF-03 — Selector de zona con búsqueda accesible
- Qué se hizo:
  - `SelectorBuscable` como combobox accesible: cada opción muestra el nombre de la zona y, en una segunda línea más
    pequeña, el distrito; busca por nombre, distrito, provincia o referencia (prop nueva `busqueda`, texto que se
    busca sin mostrarse) sin distinguir mayúsculas ni tildes. Sin resultados: "Sin coincidencias".
  - Opciones de 48 px de alto mínimo; con más de 8 zonas la lista se limita en altura (`28rem`) y se desplaza.
  - Teclado: ↑/↓, Inicio/Fin, Enter, Escape y Tab (cierran y devuelven el foco al botón). Para lectores de pantalla:
    `aria-selected` en la opción activa, texto oculto "(elegida)" en la elegida y una región `aria-live` que anuncia
    "N resultados" o "Sin coincidencias".
  - `FormularioIncidencia`: solo zonas activas (`opcionesZona`), la del vigilante preseleccionada si está activa y
    editable. Tipo de evento y gravedad siguen como botones. La zona obligatoria sigue saliendo de
    `validarIncidencia` ("Elige una zona" bajo el botón, con foco en él).
  - Sin dependencias nuevas ni cambios en el backend (`GET /api/catalogos/zonas` ya devuelve solo zonas activas).
  - Playwright: dos pruebas CP-89 en `incidencia.spec.ts` con un catálogo ficticio de 10 zonas (se intercepta
    `GET /api/catalogos/zonas`, no registran nada); CP-89 agregado a `pruebas/casos.mjs`.
- Archivos clave: `frontend/src/components/SelectorBuscable.tsx`,
  `frontend/src/app/(privado)/incidencias/nueva/FormularioIncidencia.tsx`, `frontend/e2e/incidencia.spec.ts`,
  `pruebas/casos.mjs`, `docs/plan_pruebas_integrales.md` (CP-89), `docs/referencia_clases.md`,
  `docs/evidencias/pruebas/capturas/CP-89_selector_zona_busqueda.png`, `CP-89_zona_obligatoria.png`.
- Cómo probarlo: `cd frontend && npm run lint && npm run build`; `npx playwright test e2e/incidencia.spec.ts`; a mano,
  `/incidencias/nueva` en 360 px siguiendo CP-89 (incluido el paso con lector de pantalla).
- Resultados (13/11/2026): lint y build sin errores; Playwright CP-89 (2 pruebas) y CP-33 aprobados.
- Pendientes o problemas conocidos:
  - CP-31 no se volvió a ejecutar (escribe una incidencia real en la base); su captura
    `CP-31_formulario_movil_completo.png` se regenera en la próxima corrida completa.
  - El paso con lector de pantalla (NVDA o TalkBack) de CP-89 es manual.
  - `index.html` y `reporte_pruebas.pdf` de evidencias aún no incluyen CP-89: se regeneran con `npm run reporte`.

## [2026-11-13] Fase 8 — Pruebas automatizadas y evidencias visuales
- Qué se hizo:
  - Backend: JaCoCo 0.8.13 (cobertura en `backend/target/site/jacoco/index.html`, sin umbral) y
    `maven-surefire-report-plugin` 3.5.6 (`.\mvnw.cmd verify surefire-report:report-only` →
    `backend/target/reports/surefire.html`). 210 tests aprobados, 89 % de cobertura de instrucciones.
  - API: carpeta `pruebas/` con Newman 6.2.3 y newman-reporter-htmlextra 1.23.1. La colección local está en formato
    v3 (YAML), así que `scripts/coleccion.mjs` la convierte en memoria al formato v2.1 de Newman sin modificarla.
    `scripts/newman.mjs` arma el environment desde `BASE_URL`, `E2E_ADMIN_DNI` y `E2E_ADMIN_PASSWORD` y por defecto
    ejecuta solo Login y las 24 consultas; `--completo` agrega las 12 escrituras (solo base de prueba, con
    `PRUEBAS_CONTRASENA_TEMPORAL`). El reporte htmlextra no muestra variables, `Authorization` ni cuerpos con
    contraseñas o el token.
  - Frontend: Playwright 1.64.1 en `frontend/e2e` (29 pruebas y 3 de preparación de sesiones): login por rol y
    redirección, DNI con letras, de 7 dígitos y credenciales incorrectas, avisos de validación en login, cambio de
    contraseña, incidencias, personal y catálogos, registro de una incidencia en 360 × 740, acceso a rutas de otro
    rol, dashboard, historial, exportación, auditoría, personal y catálogos. Cada prueba lleva el `CP-xx` en el
    título y guarda capturas `CP-xx_*.png` con contraseñas, DNIs y búsquedas tapadas; los valores reales se escriben
    con `escribirSecreto()` para que no queden en el reporte de Playwright.
  - Evidencias: `pruebas/scripts/reporte.mjs` genera `docs/evidencias/pruebas/index.html` (portada, índice, resumen
    por tipo, enlaces a Surefire, JaCoCo, Newman y Playwright, galería por tipo y caso con RF, descripción,
    esperado, obtenido y estado) y `reporte_pruebas.pdf` (A4, marcadores, "Página X de Y", capturas sin cortar).
    Lo que no se ejecutó aparece como "No ejecutado"; los fallos se muestran con su error. Antes del PDF busca
    contraseñas, DNIs y tokens en lo generado.
  - `pruebas\ejecutar-todo.cmd [--completo]`: backend → Newman → Playwright → índice y PDF; avisa y omite pasos si
    el backend o el frontend no responden.
  - `.gitignore` con los reportes temporales y las sesiones de Playwright; `.gitattributes` marca
    `docs/evidencias/**` como `linguist-documentation` y los `.cmd` con CRLF.
- Archivos clave: `backend/pom.xml`, `pruebas/{package.json,casos.mjs,ejecutar-todo.cmd}`,
  `pruebas/scripts/{coleccion,newman,reporte}.mjs`, `frontend/playwright.config.ts`, `frontend/e2e/*.ts`,
  `docs/evidencias/pruebas/{README.md,index.html,reporte_pruebas.pdf,capturas/}`, `docs/plan_pruebas_integrales.md`
  (secciones 2, 3, 6.2 a 6.4, R-09 y resultados), `docs/referencia_clases.md`, `README.md`.
- Cómo probarlo: con el backend (perfil `local`) y el frontend corriendo y las variables `E2E_*` definidas,
  `pruebas\ejecutar-todo.cmd`; abrir `docs/evidencias/pruebas/index.html`. Detalle en
  `docs/evidencias/pruebas/README.md`.
- Correcciones tras las primeras corridas reales:
  - Newman: cada script de la colección se envuelve en una función, porque el sandbox de Newman ya define la variable
    global `data` y el `const data` del script de "Login" fallaba (el token no se guardaba y todo daba 401).
  - Playwright: `esperarPantalla` solo considera un "Cargando…" visible (con `cacheComponents`, Next deja oculta la
    ruta anterior en el DOM); las pruebas que fallan guardan `CP-xx_fallo.png`; las de CP-90, CP-96 y CP-99 fallan en
    5 s con un mensaje claro.
  - Reporte: las capturas se asocian por el nombre del adjunto (Playwright copia los adjuntos a su carpeta).
  - Colección: "Auditoria Filtrar" usa `periodo=PERSONALIZADO`, porque la API solo acepta `desde` y `hasta` con ese
    periodo (con `ULTIMOS_30_DIAS` respondía 400, que es lo correcto).
- Resultados (corrida del 13/11/2026, 20:06): backend 210 aprobadas y 0 fallidas (cobertura 89,4 % de
  instrucciones); API 25 y 0; extremo a extremo 13 y 0; validación 11 y 3 (CP-90, CP-96 y CP-99, por DEF-01);
  seguridad 1 y 0; usabilidad 1 y 0. 38 de 41 casos automatizados aprobados. Detalle por caso en
  `docs/plan_pruebas_integrales.md` y en `docs/evidencias/pruebas/index.html` (capturas `CP-90_fallo.png`,
  `CP-96_fallo.png` y `CP-99_fallo.png` del defecto).
- Pendientes o problemas conocidos:
  - **DEF-01 (Media, abierto):** en los modales de alta de personal, zona y tipo de evento, pulsar el botón de crear
    con el formulario vacío solo muestra el aviso del primer campo (ese campo pierde el foco, se valida y desactiva el
    botón antes del clic). Corrección propuesta en la sección 8 del plan de pruebas.
  - `npm audit` informa vulnerabilidades en dependencias de Newman (solo herramientas de desarrollo, no llegan al
    sistema).
  - El índice del PDF enlaza a cada sección y el PDF trae marcadores, pero no imprime números de página junto a cada
    entrada.
  - Los pasos manuales de cada caso (consultas SQL, celular real, red lenta, backend detenido) siguen fuera de la
    automatización y se anotan en el plan.

## [2026-11-13] Fase 8 — Gestión de personal, catálogos y "Cambiar mi contraseña" en el frontend
- Qué se hizo:
  - `/personal` (solo Administrador): tabla de usuarios con búsqueda por DNI o nombre, filtros de rol, zona y estado y
    paginación; alta y edición en un modal (la zona es obligatoria para el Vigilante y el alta aclara que la contraseña
    es temporal y deberá cambiarse en el primer ingreso), reasignar zona, restablecer contraseña (nueva temporal de 8 a
    72 caracteres con confirmación, `PATCH /api/usuarios/{id}/contrasena`) y activar o desactivar con confirmación. En
    la propia fila no se puede desactivar, restablecer la contraseña ni cambiar el rol.
  - `/catalogos` (solo Administrador) con pestañas: Zonas (filtros por nombre, departamento → provincia → distrito,
    estado y texto libre; crear, editar, activar y desactivar; al desactivar muestra cuántos vigilantes activos siguen
    asignados y que dejan de contarse en el despliegue hasta cambiarles la zona), Tipos de evento (crear, renombrar,
    activar y desactivar; "Otro" no se puede renombrar) y Niveles de gravedad (nombre y orden, con aviso del
    intercambio).
  - "Cambiar mi contraseña" (`/mi-contrasena`) en el menú de todos los roles, bajo "Mi cuenta". Reutiliza el formulario
    del cambio obligatorio en modo voluntario: al guardar, la sesión sigue abierta. El Vigilante ahora tiene menú.
  - Errores del backend bajo su campo: DNI duplicado (409), nombre de zona, tipo o nivel duplicado (409), zona inactiva
    o faltante, quitarse el rol de Administrador, renombrar "Otro". "No puede desactivar su propia cuenta" se vería en
    el diálogo de confirmación.
  - Validaciones nuevas en `validaciones.ts` con los límites de los DTO. Componentes comunes `Modal`,
    `DialogoConfirmacion`, `CampoTexto` y `EtiquetaEstado`. El menú marca la opción con el prefijo más largo de la ruta.
  - No se modificó el backend: todos los endpoints existían.
- Archivos clave: `frontend/src/app/(privado)/personal/`, `frontend/src/app/(privado)/catalogos/`,
  `frontend/src/app/(privado)/mi-contrasena/page.tsx`, `frontend/src/components/{Modal,DialogoConfirmacion,CampoTexto,EtiquetaEstado,FormularioCambioContrasena,MenuLateral}.tsx`,
  `frontend/src/lib/{servicios,tipos,validaciones,roles}.ts`, `docs/plan_pruebas_integrales.md` (CP-25, CP-69, CP-70 a
  CP-77, CP-82 y nuevos CP-90 a CP-103), `docs/referencia_clases.md`, `docs/ui_pantallas.md`.
- Cómo probarlo: `cd frontend && npm run lint && npm run build` (sin errores); luego `npm run dev` con el backend en
  perfil `local` y seguir CP-25, CP-69 y CP-90 a CP-103.
- Pendientes o problemas conocidos:
  - Falta probar las pantallas en el navegador (los casos siguen en estado `Pendiente`).
  - Las opciones de ubicación del filtro de zonas salen de las primeras 100 zonas (límite de `size` del listado).
  - No hay peticiones nuevas de Postman: las pantallas usan endpoints que ya están en la colección (usuarios, zonas,
    tipos de evento, niveles y contraseñas).

## [2026-11-13] Fase 8 — Selector de zona con búsqueda en el registro de incidencias
- Qué se hizo:
  - `SelectorBuscable`: desplegable con buscador para elegir la zona en `/incidencias/nueva`, en lugar de un botón
    por zona (no escalaba al agregar zonas). En el celular se abre como hoja inferior con la lista desplazable; busca
    por nombre, distrito y provincia sin distinguir tildes; la zona asignada al vigilante aparece primero como "Tu
    zona". Se maneja también con teclado (↑/↓, Enter, Escape).
  - El tipo de evento sigue con botones mientras haya hasta 8 tipos; con más, usa el mismo desplegable. La gravedad
    no cambia.
  - Las validaciones no cambian: "Elige una zona" debajo del botón, borde rojo y foco en él al intentar registrar.
  - Plan de pruebas: caso nuevo CP-89 y selectores de Playwright actualizados.
- Archivos clave: `frontend/src/components/SelectorBuscable.tsx`,
  `frontend/src/app/(privado)/incidencias/nueva/FormularioIncidencia.tsx`, `docs/plan_pruebas_integrales.md`,
  `docs/referencia_clases.md`.
- Cómo probarlo: `cd frontend && npm run lint && npm run build`; luego `npm run dev`, abrir `/incidencias/nueva` en la
  vista de 360 px y seguir CP-89.
- Pendientes o problemas conocidos: falta probarlo en el navegador (CP-89 en estado `Pendiente`).

## [2026-11-13] Fase 8 — Dashboard, historial y auditoría en el frontend
- Qué se hizo:
  - Chart.js 4.6.1 y react-chartjs-2 5.3.1 instalados.
  - Selector de periodo común (`SelectorPeriodo`): Hoy, 7 días, 30 días, Mes actual, Año actual y Personalizado con
    dos calendarios validados como el backend (ambas fechas, desde ≤ hasta, máximo 366 días), con el aviso bajo cada
    fecha.
  - `/dashboard`: KPI (hoy, periodo, vigilantes desplegados y uno por nivel de gravedad con su color), barras por
    zona, anillo por tipo, serie por tiempo (Día/Semana/Mes, línea o barras) y despliegue por zona con las zonas sin
    vigilantes en rojo. Cada bloque tiene su carga, su error y "Reintentar"; refresco automático cada 60 s.
  - `/historial`: filtros por periodo, zona, gravedad y tipo, tabla paginada con detalle por fila y exportación a
    Excel y PDF con los filtros vigentes y el nombre de `Content-Disposition`.
  - `/historial/auditoria` (solo Administrador): filtros por periodo, acción y DNI (completo o primeros dígitos) y
    detalle de cada registro en texto legible.
  - Menú lateral por rol (panel deslizable en tablet y móvil); el Vigilante conserva su pantalla sin menú. Las rutas
    verifican el rol también al escribirlas en la barra.
  - Colores de gravedad en `lib/gravedad.ts`, compartidos con el formulario de incidencias.
  - Plan de pruebas: CP-13, CP-38, CP-45, CP-51, CP-63 y CP-82 listos para ejecutar con su evidencia esperada; casos
    nuevos CP-87 (rango personalizado) y CP-88 (DNI de auditoría); R-05 resuelto y R-14 nuevo.
- Archivos clave: `frontend/src/components/SelectorPeriodo.tsx`, `FiltrosIncidencia.tsx`, `EstadoDatos.tsx`,
  `MenuLateral.tsx`, `MarcoPrivado.tsx`, `components/graficos/*`; `frontend/src/lib/servicios.ts`, `useConsulta.ts`,
  `useRefresco.ts`, `fechas.ts`, `gravedad.ts`, `validaciones.ts`; `frontend/src/app/(privado)/dashboard/PanelDashboard.tsx`,
  `historial/HistorialIncidencias.tsx`, `historial/auditoria/ConsultaAuditoria.tsx`, `DetalleAuditoria.tsx`;
  `docs/referencia_clases.md`, `docs/plan_pruebas_integrales.md`, `docs/ui_pantallas.md`.
- Cómo probarlo: `cd frontend && npm run lint && npm run build` (sin errores); luego `npm run dev` con el backend en
  perfil `local` y los casos CP-13, CP-38, CP-45, CP-51, CP-63, CP-82, CP-87 y CP-88. Las reglas de
  `validarRangoFechas` y `validarDniBusqueda` se comprobaron con Node (un rango de 366 días se acepta y uno de 367 no).
- Pendientes o problemas conocidos:
  - Falta probar estas pantallas en el navegador con datos reales (casos en estado `Pendiente`).
  - Los filtros solo ofrecen zonas, tipos y niveles activos (R-14).
  - Siguen pendientes las pantallas de personal y de catálogos.

## [2026-11-13] Fase 8 — Validaciones de formularios en el frontend
- Qué se hizo:
  - `frontend/src/lib/validaciones.ts`: reglas y mensajes de todos los formularios con los límites de los DTO del
    backend (DNI de 8 dígitos, contraseña de 8 a 72, nombres y apellidos con letras, espacios, apóstrofo y guion,
    descripción obligatoria de hasta 2000 y mínimo 20 para "Otro", fecha no futura con 2 minutos de tolerancia) y
    `erroresDelServidor`, que coloca los errores 400 del backend debajo de su campo.
  - `frontend/src/lib/useValidacion.ts`: aviso al salir del campo, actualización mientras se escribe, ningún aviso
    en campos sin tocar, al guardar se marcan todos y el foco va al primero, botón desactivado mientras haya avisos,
    `aria-invalid` y `aria-describedby`.
  - Login: el DNI no deja escribir ni pegar letras, espacios ni símbolos y no pasa del octavo dígito (teclado
    numérico en móvil). Cambio de contraseña: la nueva admite de 8 a 72 caracteres (antes 16). Registro de
    incidencias: avisos bajo zona, tipo, gravedad, descripción (con contador) y fecha.
  - Se recortan los espacios del DNI y de la descripción antes de enviar; las contraseñas no se recortan.
  - Plan de pruebas: CP-70 a CP-73 y CP-75 a CP-79 listos para ejecutar en los formularios existentes, casos nuevos
    CP-84 (comportamiento de los avisos), CP-85 (error del backend bajo el campo) y CP-86 (contador y recorte), y
    selectores para Playwright. Riesgo R-03 resuelto y R-13 nuevo.
- Archivos clave: `frontend/src/lib/validaciones.ts`, `frontend/src/lib/useValidacion.ts`,
  `frontend/src/components/MensajeCampo.tsx`, `frontend/src/components/SelectorRapido.tsx`,
  `frontend/src/app/login/FormularioLogin.tsx`, `frontend/src/app/cambiar-contrasena/FormularioCambioContrasena.tsx`,
  `frontend/src/app/(privado)/incidencias/nueva/FormularioIncidencia.tsx`, `docs/referencia_clases.md`,
  `docs/plan_pruebas_integrales.md`.
- Cómo probarlo: `cd frontend && npm run lint && npm run build`; luego `npm run dev` y los casos CP-70 a CP-79 y
  CP-84 a CP-86 de `docs/plan_pruebas_integrales.md`. Se verificaron en Chrome (vista de 360 × 740) con la API
  simulada: 55 comprobaciones de los tres formularios sin fallos.
- Pendientes o problemas conocidos:
  - El backend no rechaza números en nombres y apellidos (R-10); el frontend sí lo hará en el formulario de personal.
  - El límite de 72 de la contraseña es en caracteres; BCrypt admite 72 bytes (R-13).
  - Los avisos del backend se reconocen por su texto para las reglas de negocio sin `detalles` (fecha futura,
    "Otro", contraseña actual incorrecta); si cambia el mensaje en el backend, se muestra en la alerta general.
  - CP-85 y CP-86 falta ejecutarlos contra el backend real; las evidencias y Playwright quedan para el paso de
    evidencias.

## [2026-11-13] Fase 8 — Plan de pruebas integrales y scripts de prueba en Postman
- Qué se hizo:
  - `docs/plan_pruebas_integrales.md` nuevo: objetivo, alcance (RF-01 a RF-09, RNF-01 a RNF-05) y fuera de alcance,
    entorno, estrategia por tipo de prueba, criterios de entrada y salida, 83 casos `CP-01` a `CP-83` (resultado
    obtenido y estado vacíos; evidencia esperada `CP-xx_descripcion.png`), pruebas existentes con sus comandos,
    matriz de trazabilidad, plantilla de defectos, riesgos y cronograma hasta el 8 de diciembre de 2026.
  - Prioridad a lo que solo se probó en H2: historial, dashboard (día, semana y mes en hora de Lima, con datos de
    borde de día), reportes Excel y PDF y consulta de auditoría, ahora con casos contra Supabase. Casos de
    inmutabilidad de `auditoria` (triggers, privilegios de `app_sgi` y RLS).
  - Los casos de pantallas aún no hechas (personal, historial, dashboard con gráficos, exportación, auditoría,
    catálogos) y los de validación de formularios quedan como planificados.
  - Colección Postman: las 38 peticiones tienen un script `afterResponse` que comprueba el código de estado de
    éxito del perfil Administrador (200, 201 o 204); los reportes además comprueban `Content-Type` y que el archivo
    venga como adjunto. "Login" comprueba el 200, que venga el token sin la contraseña y que quede guardado en
    `token`.
  - Se quitaron las credenciales escritas en los cuerpos: "Usuarios Crear" usa `{{dniNuevo}}` y
    `{{contrasenaInicial}}`; "Usuarios Mi Contrasena" usa `{{contrasenaActual}}` y `{{contrasenaNueva}}`.
- Archivos clave: `docs/plan_pruebas_integrales.md`, `postman/collections/SGI-SEGANDINA/*.request.yaml`.
- Cómo probarlo:
  - `postman collection lint postman/collections/SGI-SEGANDINA` → sin errores ni advertencias.
  - Agregar al environment local las variables de la sección 2.2 del plan, iniciar el backend en perfil `local` y
    correr la colección con el Runner empezando por "Login" (como Administrador, sin "Usuarios Mi Contrasena").
- Pendientes o problemas conocidos:
  - Ejecutar los casos y llenar resultado obtenido, estado y evidencias en `docs/evidencias/pruebas/`.
  - Agregar al environment `dniNuevo`, `contrasenaInicial`, `contrasenaActual`, `accionAuditoria` y `qAuditoria`.
  - Configurar Playwright; mientras tanto los casos E2E y de validación son manuales.
  - El DTO de usuario no rechaza números en nombres y el cambio de contraseña del frontend limita a 16 caracteres
    (riesgos R-10 y R-03 del plan): alinear al crear `frontend/src/lib/validaciones.ts`.

## [2026-11-13] Fase 8 / RF-08 — Consulta de auditoría en el backend
- Qué se hizo:
  - `GET /api/auditoria` (solo Administrador): paginado (`page` desde 0, `size` de 1 a 100, por defecto 20), orden
    por `fecha_hora` descendente con desempate por id y el mismo formato de página que el historial. Filtros
    opcionales y combinables: rango común (`periodo`, `desde`, `hasta`; por defecto últimos 30 días en Lima, máximo
    366 días), `accion`, `idUsuario` y `q` (DNI exacto o por prefijo, sobre el DNI del usuario y el DNI intentado;
    vacío = sin filtro).
  - Cada fila: `idAuditoria`, `fechaHora` en hora de Lima con desfase, `accion`, `accionEtiqueta`, `usuario`
    (`idUsuario`, `dni`, `nombreCompleto`) o `null` con solo `dniIntentado` si el DNI no existe, y `detalle` como
    objeto JSON. Sin contraseñas, hashes, rol ni estado.
  - `GET /api/auditoria/acciones` (solo Administrador): `{valor, etiqueta}` de las 16 acciones.
  - `AuditoriaDao` sigue sin métodos de borrado ni actualización; la consulta usa `Specification` con
    `@EntityGraph` (un SELECT con LEFT JOIN al usuario, sin N+1). Consultar no inserta registros de auditoría.
  - Errores 400 con el campo en `detalles` para `periodo`, fechas, rango invertido o mayor a 366 días, `accion`,
    `q`, `idUsuario`, `page` y `size`. `RangoFechas` ahora lanza `ParametroInvalidoException` (subclase de
    `ReglaNegocioException`): el historial, el dashboard y los reportes conservan su mensaje y ahora también
    traen el campo en `detalles`.
  - Postman: "Auditoria Listar", "Auditoria Filtrar" (variables `{{periodo}}`, `{{accionAuditoria}}`,
    `{{qAuditoria}}`) y "Auditoria Acciones", con `{{baseUrl}}` y el `{{token}}` de la colección.
  - Docs: contrato de RF-08 en `docs/requerimientos_funcionales.md`, endpoints en `docs/stack_arquitectura.md`,
    sección "Consulta de auditoría (RF-08)" en `docs/referencia_clases.md`.
- Archivos clave: `controller/AuditoriaController.java`, `dto/request/AuditoriaFiltro.java`,
  `dto/response/{AuditoriaResponse,AccionAuditoriaResponse}.java`, `exception/ParametroInvalidoException.java`,
  `dao/AuditoriaDao.java`, `service/AuditoriaService.java`, `service/impl/AuditoriaServiceImpl.java`,
  `model/AccionAuditoria.java`, `dto/request/RangoFechas.java`, `exception/GlobalExceptionHandler.java`,
  `dto/response/IncidenciaHistorialResponse.java`; tests `service/impl/AuditoriaServiceImplTest`,
  `dao/AuditoriaDaoTest`, `dao/TablaAuditoriaH2` (ayuda para la tabla en H2), `controller/AuditoriaControllerTest`,
  `dto/request/RangoFechasTest`; `postman/collections/SGI-SEGANDINA/Auditoria *.request.yaml`.
- Cómo probarlo: `cd backend && ./mvnw verify` → pasan 210 tests (27 nuevos). Prueba manual con Postman en
  `docs/referencia_clases.md`, sección "Consulta de auditoría (RF-08)".
- Pendientes o problemas conocidos:
  - La consulta se probó contra H2 (con la tabla recreada con `JSON` en lugar de `JSONB`); falta ejecutarla contra
    Supabase.
  - Agregar las variables `accionAuditoria` y `qAuditoria` al environment de Postman.
  - Los casos `CP-xx` de esta funcionalidad se agregan cuando se cree `docs/plan_pruebas_integrales.md`.
  - Pantalla de auditoría en el frontend (pestaña del historial).

## [2026-11-13] Fase 8 — README inicial e instrucciones del proyecto actualizadas
- Qué se hizo:
  - `README.md` nuevo en la raíz: descripción, tecnologías con versiones, estructura de carpetas (`backend`,
    `frontend`, `docs`, `postman`), requisitos, ejecución en local a partir de `backend/.env.example` y
    `frontend/.env.example` (sin credenciales), rutas por rol, estado por fases y cómo correr los tests del backend.
  - Instrucciones del proyecto (`CLAUDE.md`):
    - Stack con las versiones reales de `backend/pom.xml` y `frontend/package.json`.
    - Tabla de fases con su estado y el desglose de la Fase 8.
    - Decisiones resueltas: reasignación de zona solo por el Administrador, `fecha_hora` opcional y no futura,
      Administrador inicial por el perfil `seed` y JWT en `localStorage`.
    - Validaciones de formularios centralizadas en `frontend/src/lib/validaciones.ts`, alineadas con los DTO.
    - Sección de pruebas y evidencias (casos `CP-xx` en `docs/plan_pruebas_integrales.md`, colección Postman con
      variables, evidencias en `docs/evidencias/pruebas/`).
- Archivos clave: `README.md`, `CLAUDE.md`.
- Cómo probarlo: leer el README de principio a fin y comprobar que las rutas, variables y comandos que cita existen
  (`backend/.env.example`, `frontend/.env.example`, `./mvnw test`, `npm run dev`).
- Pendientes o problemas conocidos:
  - El README se completará con el despliegue (Fase 9) y con la ejecución de las pruebas extremo a extremo y de la
    colección Postman cuando existan.
  - Aún no existen `docs/plan_pruebas_integrales.md`, `docs/evidencias/pruebas/` ni
    `frontend/src/lib/validaciones.ts`; se crean en las siguientes partes de la Fase 8.

## [2026-10-25] Fase 8 / RF-01 — Login sin credenciales prellenadas
- Qué se hizo:
  - Al recargar o entrar a `/login`, el navegador rellenaba el DNI y la contraseña (gestor de contraseñas y
    restauración de formularios). En equipos o celulares compartidos eso deja las credenciales a la vista.
  - El formulario usa `autoComplete="off"`, igual que el campo DNI. La contraseña usa `autoComplete="new-password"`,
    porque Chrome y Edge ignoran `"off"` en campos de contraseña.
- Archivos clave: `frontend/src/app/login/FormularioLogin.tsx`, `docs/referencia_clases.md`.
- Cómo probarlo:
  - `cd frontend && npm run lint && npm run build` → sin errores.
  - Escribir DNI y contraseña sin enviar y pulsar F5 → campos vacíos. Iniciar y cerrar sesión → campos vacíos.
    Con una contraseña ya guardada en Chrome, `/login` carga vacío. El login correcto y el de credenciales
    incorrectas siguen funcionando.
- Pendientes o problemas conocidos:
  - Si la contraseña ya está guardada en el navegador, este puede ofrecerla en una lista al tocar el campo, pero no
    la rellena solo. Para quitarla del todo hay que borrarla en la configuración del navegador.

## [2026-10-25] Fase 8 / RF-01 — Fix: login bloqueado en "Ingresando…" tras cerrar sesión
- Qué se hizo:
  - Causa: Next.js (con `cacheComponents`) conserva el estado de las pantallas visitadas y el navegador puede
    restaurarlas desde el bfcache. El estado de carga del login solo se apagaba ante un error, así que tras un
    login exitoso y un cierre de sesión `/login` reaparecía con el botón deshabilitado en "Ingresando…".
  - El estado de carga se apaga siempre en un bloque `finally` (login y cambio de contraseña).
  - Los campos del login se montan de nuevo al iniciar o cerrar sesión y al volver con Atrás desde el bfcache:
    contraseña, errores y carga quedan limpios. El DNI también se limpia.
  - "Cerrar sesión" redirige con `router.replace("/login")` y llama a `router.refresh()` para no dejar pantallas
    privadas en la caché del router.
  - Se conservan los avisos "Tu sesión venció" y "Contraseña actualizada, inicia sesión con la nueva.".
- Archivos clave: `frontend/src/app/login/FormularioLogin.tsx`, `frontend/src/context/SesionContext.tsx`,
  `frontend/src/app/cambiar-contrasena/FormularioCambioContrasena.tsx`, `docs/referencia_clases.md`.
- Cómo probarlo:
  - `cd frontend && npm run lint && npm run build` → sin errores.
  - Iniciar sesión, cerrar sesión → `/login` con el botón en "Ingresar" y los campos vacíos, sin recargar con F5;
    volver a entrar funciona. Tras cerrar sesión, Atrás no muestra la pantalla privada. Credenciales incorrectas
    → mensaje de error y botón habilitado. Cambio obligatorio de contraseña → aviso de contraseña actualizada.
- Pendientes o problemas conocidos:
  - El frontend no tiene framework de pruebas automatizadas; este caso se verifica de forma manual.

## [2026-10-25] Fase 8 / RF-01 — Frontend: cambio obligatorio de contraseña temporal
- Qué se hizo:
  - Si el login devuelve `usuario.debeCambiarContrasena: true`, la sesión se guarda marcada y el usuario va a
    `/cambiar-contrasena`. Mientras esté marcada, `RutaProtegida` devuelve cualquier ruta privada a esa pantalla y
    el encabezado con el menú no se muestra.
  - Pantalla nueva con contraseña actual o temporal, nueva y confirmación. Validación en el cliente: obligatorias,
    nueva de 8 a 16 caracteres, distinta de la actual e igual a la confirmación. Errores del backend con mensaje
    claro ("La contraseña actual o temporal no es correcta.", "La nueva contraseña debe ser distinta de la actual").
  - Al recibir 204 se cierra la sesión y se va a `/login` con el aviso "Contraseña actualizada, inicia sesión con
    la nueva."
  - Un 403 con "Debe cambiar su contraseña antes de continuar" en cualquier llamada marca la sesión y redirige a
    la pantalla de cambio.
- Archivos clave: `frontend/src/app/cambiar-contrasena/page.tsx`,
  `frontend/src/app/cambiar-contrasena/FormularioCambioContrasena.tsx`, `frontend/src/lib/sesion.ts`,
  `frontend/src/lib/roles.ts`, `frontend/src/lib/api.ts`, `frontend/src/lib/servicios.ts`,
  `frontend/src/lib/tipos.ts`, `frontend/src/components/RutaProtegida.tsx`,
  `frontend/src/components/Encabezado.tsx`, `frontend/src/app/login/FormularioLogin.tsx`,
  `frontend/src/app/page.tsx`, `docs/referencia_clases.md`.
- Cómo probarlo:
  - `cd frontend && npm run lint && npm run build` → sin errores.
  - Restablecer como Administrador la contraseña de un usuario (`PATCH /api/usuarios/{id}/contrasena`), entrar
    con la temporal → `/cambiar-contrasena`; abrir `/dashboard` → vuelve a la pantalla de cambio; probar actual
    incorrecta, nueva igual, de 7 o 17 caracteres y confirmación distinta; cambio válido → `/login` con el aviso;
    entrar con la nueva → inicio normal del rol.
- Pendientes o problemas conocidos:
  - El máximo de 16 caracteres solo lo aplica el frontend; la API acepta hasta 72.
  - El frontend aún no tiene una pantalla para el cambio voluntario de contraseña (sin contraseña temporal).

## [2026-10-24] RF-01 / RF-02 / RF-08 — Restablecimiento de contraseña y contraseñas temporales
- Qué se hizo:
  - `PATCH /api/usuarios/{id}/contrasena` (solo Administrador) con `{ contrasenaNueva }` de 8 a 72 caracteres:
    - guarda la contraseña con BCrypt y responde 204; no pide la actual;
    - el Administrador no puede restablecer la suya por esta ruta (400; debe usar `PATCH /api/usuarios/me/contrasena`);
    - usuario inexistente → 404; un usuario inactivo se puede restablecer y sigue inactivo.
  - Contraseñas temporales: crear un usuario, editarlo enviando `contrasena` o restablecerla deja
    `debe_cambiar_contrasena = true`.
    - El login lo informa en `usuario.debeCambiarContrasena` y emite un token con el claim `cambioPendiente`.
    - Ese token solo permite `PATCH /api/usuarios/me/contrasena` y `GET /api/auth/yo`; el resto responde 403 con
      "Debe cambiar su contraseña antes de continuar".
    - Al cambiarla, la marca vuelve a `false` y hay que iniciar sesión de nuevo.
  - Auditoría, sin contraseñas ni hashes:
    - acción nueva `RESTABLECER_CONTRASENA {idUsuario, debeCambiarContrasena: true}`;
    - `CREAR_USUARIO` y `MODIFICAR_USUARIO` con contraseña agregan `debeCambiarContrasena: true`;
    - `LOGIN_OK {cambioPendiente: true}` cuando aplica;
    - `CAMBIAR_CONTRASENA` agrega `cambioObligatorio`.
- Base de datos: columna nueva `usuario.debe_cambiar_contrasena` (agregada a `docs/modelo_datos.sql`). En Supabase
  hay que ejecutar:
  `ALTER TABLE usuario ADD COLUMN debe_cambiar_contrasena BOOLEAN NOT NULL DEFAULT FALSE;`
  Sin ella, la app no arranca en el perfil `local` (`ddl-auto=validate`). `auditoria` no necesita cambios.
- Archivos clave:
  - Backend: `dto/request/RestablecerContrasenaRequest.java` (nuevo), `model/Usuario.java`, `model/AccionAuditoria.java`,
    `controller/UsuarioController.java`, `service/UsuarioService.java`, `service/impl/UsuarioServiceImpl.java`,
    `service/TokenService.java`, `service/impl/JwtTokenServiceImpl.java`, `service/impl/AuthServiceImpl.java`,
    `config/SecurityConfig.java`, `dto/response/UsuarioResumenResponse.java`.
  - Tests: `UsuarioServiceImplTest`, `UsuarioControllerTest`, `AuthServiceImplTest`, `AuthControllerTest`,
    `JwtTokenServiceImplTest`.
  - Postman: "Usuarios Restablecer Contrasena", que usa la variable `{{contrasenaNueva}}` del environment local.
  - Docs: RF-01, RF-02 y RF-08 en `docs/requerimientos_funcionales.md`; seguridad y endpoints en
    `docs/stack_arquitectura.md`; sección nueva en `docs/referencia_clases.md`.
- Cómo probarlo: `cd backend && ./mvnw -q verify` → pasan 183 tests. Prueba manual en `docs/referencia_clases.md`,
  sección "Contraseñas temporales: restablecimiento y cambio obligatorio".
- Pendientes o problemas conocidos:
  - Frontend: falta la pantalla de cambio obligatorio (redirigir ahí si `debeCambiarContrasena` es `true` y volver a
    iniciar sesión después) y la acción de restablecer en la gestión de personal. Hasta entonces, un usuario con
    contraseña temporal solo ve errores 403 en el frontend.
  - Un token emitido antes del restablecimiento sigue siendo válido hasta que vence (8 h).

## [2026-10-24] Fase 7 / RF-01, RF-03 — Frontend base: login, rutas por rol y formulario de incidencias
- Qué se hizo:
  - Proyecto Next.js 16.4 (App Router, TypeScript, Tailwind 4, Axios) en `/frontend`. URL de la API en
    `NEXT_PUBLIC_API_URL`; `frontend/.env.example` sin valores reales (el `.gitignore` del frontend lo permite).
  - Login por DNI (8 dígitos, teclado numérico) y contraseña, con mensaje genérico ante credenciales inválidas.
    Redirección por rol: Vigilante → `/incidencias/nueva`; Administrador y Supervisor → `/dashboard`.
  - Sesión en `localStorage` (`sgi.sesion`) con `Authorization: Bearer`. Se eligió `localStorage` porque frontend
    y API están en dominios distintos: una cookie httpOnly sería de terceros (bloqueada en Safari/iOS) y obligaría a
    reactivar CSRF. La sesión se cierra con "Cerrar sesión", al llegar a `expiraEn` (temporizador) y ante un 401
    de una petición con token; en ambos casos de vencimiento el login muestra "Tu sesión venció".
  - Protección de rutas por rol (`RutaProtegida`) y menú filtrado por rol en el encabezado.
  - Formulario `/incidencias/nueva` Mobile-First: selectores rápidos de zona (preseleccionada con la zona del
    vigilante), tipo y gravedad (verde/amarillo/naranja/rojo según `orden`), descripción con contador y mínimo de 20
    caracteres para "Otro", fecha y hora opcional (por defecto la actual; nunca futura), botón fijo abajo en móvil,
    confirmación con el número de incidencia y formulario listo para otro registro.
  - `/dashboard`: pantalla de bienvenida para gerencia (los KPI y gráficos van en la fase siguiente).
  - Cabeceras de seguridad en `next.config.ts` (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
    `Permissions-Policy`).
  - Backend: `CorsConfig` (orígenes desde `CORS_ORIGENES`, por defecto `http://localhost:3000`) y `.cors(...)` en
    `SecurityConfig`. Variable agregada a `application.properties` y `backend/.env.example`.
- Archivos clave: `frontend/src/lib/{api,sesion,servicios,roles,tipos}.ts`, `frontend/src/context/SesionContext.tsx`,
  `frontend/src/components/{RutaProtegida,Encabezado,SelectorRapido,Boton,Alerta,Cargando}.tsx`,
  `frontend/src/app/login/`, `frontend/src/app/(privado)/{incidencias/nueva,dashboard}/`, `frontend/next.config.ts`,
  `frontend/.env.example`; backend `config/CorsConfig.java`, `config/SecurityConfig.java`, test `config/CorsConfigTest`.
  Docs: sección Fase 7 en `docs/referencia_clases.md`; CORS y JWT en el frontend en `docs/stack_arquitectura.md`.
- Cómo probarlo:
  - `cd backend && ./mvnw -q verify` → pasan 170 tests (3 nuevos de CORS).
  - `cd frontend && npm install && npm run lint && npm run build` → sin errores; rutas `/`, `/login`, `/dashboard`,
    `/incidencias/nueva`.
  - Manual: backend en perfil `local`, `frontend/.env.local` con `NEXT_PUBLIC_API_URL=http://localhost:8080`,
    `npm run dev`. Entrar como Vigilante, Supervisor y Administrador y revisar redirecciones, registro con
    confirmación, cierre de sesión y vencimiento del token (detalle en `docs/referencia_clases.md`, Fase 7).
- Pendientes o problemas conocidos:
  - Dashboard, historial y gestión de personal en el frontend (siguiente fase); el menú se amplía entonces.
  - En producción, definir `CORS_ORIGENES` con el dominio de Vercel y `NEXT_PUBLIC_API_URL` con el del backend.
  - El formulario necesita conexión: no guarda incidencias sin red para enviarlas después.

## [2026-10-24] Fase 6 / RF-06 — Exportación de reportes en Excel y PDF
- Qué se hizo:
  - `GET /api/reportes/excel` y `GET /api/reportes/pdf` (Administrador y Supervisor) con los mismos filtros que el
    historial (`periodo`, `desde`, `hasta`, `idZona`, `idNivelGravedad`, `idTipoEvento`), el mismo orden y sin
    paginar. Responden el archivo como adjunto: `incidencias_AAAA-MM-DD.xlsx` / `.pdf` (fecha de hoy en Lima).
  - Interfaz `ExportadorReporte` con `ExcelExportador` (Apache POI 5.5.1) y `PdfExportador` (OpenPDF 2.4.0).
    Columnas: N°, fecha y hora (Lima), zona, tipo, gravedad, registrado por (DNI - nombre) y descripción.
    Excel: encabezados en negrita, fijos y con autofiltro; fecha como celda de fecha. PDF: A4 horizontal con
    título, periodo aplicado con sus fechas, fecha de generación, total y encabezados repetidos en cada página.
    Con cero resultados, el archivo trae solo encabezados.
  - Se audita `EXPORTAR_REPORTE` con `{formato, periodo, desde, hasta, idZona, idNivelGravedad, idTipoEvento,
    totalRegistros}` en la misma transacción. Un rango inválido (400) no se audita.
  - Límite de 10 000 incidencias por reporte (400 pidiendo acotar los filtros).
  - `IncidenciaDao`: `findAll(Specification, Sort)` con `@EntityGraph` y constante `ORDEN_HISTORIAL` compartida
    con el historial.
  - Docs: RF-06 detallado en `docs/requerimientos_funcionales.md`; versiones de POI/OpenPDF y endpoints en
    `docs/stack_arquitectura.md`. Postman: "Reportes Excel", "Reportes PDF" y "Reportes PDF Personalizado".
- Archivos clave: `backend/pom.xml`, `export/{FormatoReporte,DatosReporte,ExportadorReporte,ExcelExportador,
  PdfExportador,ColumnasReporte}.java`, `dto/response/ArchivoReporte.java`,
  `service/ReporteService.java`, `service/impl/ReporteServiceImpl.java`, `controller/ReporteController.java`,
  `dao/IncidenciaDao.java`; tests `export/{ExcelExportadorTest,PdfExportadorTest}`,
  `service/impl/ReporteServiceImplTest`, `controller/ReporteControllerTest`, `dao/IncidenciaDaoTest`.
- Cómo probarlo:
  - `cd backend && ./mvnw -q verify` → compila y pasan 167 tests (19 nuevos).
  - Con la app en perfil `local` y token de Supervisor, en Postman "Send and Download" de "Reportes Excel" y
    "Reportes PDF": los archivos abren en Excel y en un visor PDF y traen lo mismo que el historial con esos
    filtros. `?periodo=HOY&idZona=999` → archivo con solo encabezados. Token de Vigilante → 403. En `auditoria`
    aparece una fila `EXPORTAR_REPORTE` por descarga.
- Pendientes o problemas conocidos:
  - Cuando se configure CORS para el frontend (otro dominio), hay que exponer la cabecera `Content-Disposition`
    (`exposedHeaders`) para que el navegador pueda leer el nombre del archivo.
  - Los reportes no se probaron todavía contra Supabase (solo H2 y pruebas unitarias).

## [2026-10-24] Fase 5 / RF-04, RF-05, RF-07 — Historial, dashboard y despliegue
- Qué se hizo:
  - Filtro de rango común (`RangoFechas` + `Periodo`): `HOY`, `ULTIMOS_7_DIAS`, `ULTIMOS_30_DIAS` (por defecto),
    `MES_ACTUAL`, `ANIO_ACTUAL` y `PERSONALIZADO` con `desde`/`hasta` (`AAAA-MM-DD`, máximo 366 días,
    `desde <= hasta`). Los días se calculan en America/Lima sobre `fecha_hora`, con intervalo semiabierto.
    Se combina con `idZona`, `idNivelGravedad` e `idTipoEvento` (`IncidenciaFiltro`).
  - RF-04: `GET /api/incidencias` paginado (`size` máximo 100), orden por `fecha_hora` descendente; cada fila trae
    zona, tipo, nivel y el usuario que la registró (id, DNI, nombre completo).
  - RF-05: `GET /api/dashboard/kpis` (hoy, periodo y por gravedad con ceros), `/incidencias-por-zona`,
    `/incidencias-por-tipo` e `/incidencias-por-tiempo` con `agrupacion` `DIA`/`SEMANA`/`MES` (por defecto según
    el largo del rango: hasta 31 días DIA, hasta 180 SEMANA, si no MES) y todos los tramos del rango, incluidos
    los vacíos.
  - RF-07: `GET /api/dashboard/despliegue` desde la vista `v_despliegue_por_zona` (entidad de solo lectura).
  - Query params con valor no válido (`periodo`, fechas, `agrupacion`) → 400 con el campo en `detalles`.
  - Índices: `idx_incidencia_fecha (fecha_hora DESC)` e `idx_incidencia_zona (id_zona, fecha_hora DESC)` ya
    están en `docs/modelo_datos.sql`; no se agregó SQL.
  - `docs/requerimientos_funcionales.md`: filtros comunes, RF-04, RF-05 y RF-07 con parámetros, rangos y
    respuestas. `docs/stack_arquitectura.md`: tabla de endpoints. Postman: 8 peticiones nuevas y variables
    `periodo`, `desde`, `hasta`.
- Archivos clave: `dto/request/{Periodo,RangoFechas,IncidenciaFiltro,Agrupacion}.java`,
  `dao/{IncidenciaDao,IncidenciaEstadisticasDao,IncidenciaEstadisticasDaoImpl,ConteoAgrupado,ConteoDiario,
  DespliegueZonaDao}.java`, `model/DespliegueZona.java`, `service/{IncidenciaService,DashboardService}.java` y sus
  `impl`, `controller/{IncidenciaController,DashboardController}.java`,
  `dto/response/{IncidenciaHistorialResponse,KpisResponse,ConteoResponse,SerieTiempoResponse,
  DespliegueZonaResponse}.java`, `exception/GlobalExceptionHandler.java`; tests `dto/request/RangoFechasTest`,
  `service/impl/{DashboardServiceImplTest,IncidenciaServiceImplTest}`, `controller/DashboardControllerTest`,
  `dao/IncidenciaDaoTest` (consultas contra H2), `model/MapeoEntidadesTest`.
- Cómo probarlo:
  - `cd backend && ./mvnw -q verify` → compila y pasan 148 tests (39 nuevos).
  - Con la app en perfil `local` y token de Supervisor: `GET /api/incidencias?periodo=ULTIMOS_7_DIAS` → página
    de la más reciente a la más antigua; `GET /api/dashboard/incidencias-por-tiempo?periodo=MES_ACTUAL` → un
    punto por día del mes hasta hoy (0 en los días sin incidencias); `GET /api/dashboard/despliegue` → zonas
    activas con sus vigilantes; `?periodo=PERSONALIZADO&desde=2026-10-10&hasta=2026-10-01` → 400; con token de
    Vigilante → 403.
- Pendientes o problemas conocidos:
  - Las consultas del historial y del dashboard se probaron contra H2 en modo PostgreSQL; falta ejecutarlas
    contra Supabase (la nativa por día usa `AT TIME ZONE` y `to_char`, cuya semántica en H2 no es idéntica).
  - El rango personalizado acepta fechas futuras (devuelven 0 incidencias).

## [2026-10-24] Fase 4 / RF-02, RF-09 — Gestión de usuarios, de catálogos y cambio de contraseña
- Qué se hizo:
  - Usuarios (solo Administrador, sin `DELETE`): `GET /api/usuarios` paginado con filtros `idRol`, `idZona`,
    `activo` y `q` (DNI, nombres, apellidos); `GET /api/usuarios/{id}`; `POST` (201); `PUT /{id}` (datos, rol,
    zona y contraseña opcional); `PATCH /{id}/estado` (baja lógica). Respuestas sin `contrasena`.
    Reglas: DNI único (409), contraseña de 8 a 72 caracteres guardada con BCrypt, rol existente, Vigilante con
    zona obligatoria, zona nueva o cambiada activa, el Administrador no puede desactivarse ni quitarse su rol.
  - `PATCH /api/usuarios/me/contrasena` para cualquier usuario con token: exige la contraseña actual, mínimo 8
    caracteres y una nueva distinta; responde 204.
  - `GET /api/catalogos/roles` para el formulario de usuarios.
  - Zonas (`/api/zonas`): búsqueda con el contrato de RF-09 (vía `ZonaService.buscar`), detalle, alta, edición y
    activar/desactivar. Tipos de evento (`/api/tipos-evento`): listar todos, alta, renombrar, activar/desactivar;
    el tipo "Otro" no se puede renombrar. Niveles de gravedad (`/api/niveles-gravedad`): listar y editar nombre y
    orden; si el orden lo tiene otro nivel, se intercambian. Nombres únicos sin distinguir mayúsculas (409).
  - Auditoría en la misma transacción con `{id, antes, despues}`; nunca guarda el hash (solo
    `contrasenaCambiada`). Acciones nuevas: `CAMBIAR_CONTRASENA`, `CREAR_ZONA`, `MODIFICAR_ZONA`,
    `CAMBIAR_ESTADO_ZONA`, `CREAR_TIPO_EVENTO`, `MODIFICAR_TIPO_EVENTO`, `CAMBIAR_ESTADO_TIPO_EVENTO`,
    `MODIFICAR_NIVEL_GRAVEDAD`. Editar sin cambios o pedir el mismo estado no audita.
  - Errores nuevos: 404 (`RecursoNoEncontradoException`), 409 (`DatoDuplicadoException` y violaciones de
    restricciones de la BD), en el formato `{ timestamp, status, mensaje, detalles }`.
  - `TipoEventoResponse` y `NivelGravedadResponse` incluyen `estadoActivo`. Listados con `PaginaResponse`.
  - `docs/requerimientos_funcionales.md`: contrato de RF-02 y del cambio de contraseña, RF-09 ampliado a tipos y
    niveles, acciones nuevas en RF-08. Colección de Postman con las peticiones nuevas.
- Archivos clave: `controller/{UsuarioController,ZonaController,TipoEventoController,NivelGravedadController}.java`,
  `service/{UsuarioService,ZonaService,TipoEventoService,NivelGravedadService}.java` y sus `impl`,
  `service/impl/SoporteServicio.java`, `dao/{UsuarioDao,ZonaDao,TipoEventoDao,NivelGravedadDao,FiltrosTexto}.java`,
  `dto/request/*`, `dto/response/{UsuarioResponse,PaginaResponse,RolResponse}.java`, `exception/*`,
  `config/SecurityConfig.java`, `model/AccionAuditoria.java`; tests `service/impl/{UsuarioServiceImplTest,
  TipoEventoServiceImplTest,NivelGravedadServiceImplTest,ZonaServiceImplTest}.java`,
  `controller/{UsuarioControllerTest,ZonaControllerTest}.java`.
- Cómo probarlo:
  - `cd backend && ./mvnw -q verify` → compila y pasan 109 tests (49 nuevos).
  - Con la app en perfil `local` y token de Administrador: `POST /api/usuarios` con
    `{"dni":"33333333","nombres":"Luis","apellidoPaterno":"Rojas","contrasena":"ClaveInicial1","idRol":3,"idZona":1}`
    → 201 sin `contrasena`; repetirlo → 409; sin `idZona` → 400; `PATCH /api/usuarios/<id propio>/estado`
    `{"activo":false}` → 400; con token de Supervisor → 403.
  - Login con el vigilante creado → `PATCH /api/usuarios/me/contrasena`
    `{"contrasenaActual":"ClaveInicial1","contrasenaNueva":"ClaveNueva123"}` → 204; login con la nueva → 200.
  - `GET /api/zonas?distrito=miraflores&activo=true` → página con el formato de RF-09;
    `PUT /api/niveles-gravedad/1` `{"nombreNivel":"Baja","orden":2}` → "Baja" en orden 2 y "Media" en 1.
  - Auditoría: `SELECT accion_realizada, detalle_cambio FROM auditoria ORDER BY id_auditoria DESC LIMIT 10;`
- Pendientes o problemas conocidos:
  - Desactivar una zona no reasigna a los vigilantes que la tienen: siguen asignados (y dejan de contarse en el
    despliegue de RF-07) hasta que se les cambie la zona.
  - Un token emitido antes de cambiar el rol o desactivar a un usuario sigue llevando el rol anterior hasta que
    vence (8 h); los servicios rechazan al actor inactivo, pero las reglas por rol de `SecurityConfig` usan el claim.
  - La consulta de auditoría (`GET /api/auditoria`) queda para la Fase 5 o posterior.

## [2026-10-24] Fase 3 / RF-03 — Catálogos activos y registro de incidencias
- Qué se hizo:
  - `GET /api/catalogos/zonas`, `/tipos-evento` y `/niveles-gravedad` (cualquier usuario con token): solo
    registros con `estado_activo = true`; zonas y tipos por nombre, niveles por `orden`.
  - `POST /api/incidencias` (Vigilante y Administrador) → 201 con la incidencia guardada. El usuario sale del
    `sub` del JWT, nunca del body. Reglas:
    - zona, tipo de evento y nivel de gravedad deben existir y estar activos (si no → 400 con mensaje claro);
    - descripción obligatoria (máx. 2000 caracteres) y recortada; si el tipo es "Otro" debe tener al menos 20
      caracteres;
    - `fechaHora` opcional: por defecto la hora actual; no puede ser futura (se aceptan 2 minutos de desfase del
      reloj del celular);
    - usuario del token inexistente o inactivo → 401.
  - Auditoría `REGISTRAR_INCIDENCIA` en la misma transacción, con `{idIncidencia, idZona, idTipoEvento, idNivelGravedad}`.
  - `ReglaNegocioException` → 400 en el formato de error uniforme. Bean `Clock` (hora de Lima) para poder fijar la
    hora en los tests.
  - RF-03 en `docs/requerimientos_funcionales.md` incluye las reglas nuevas y el contrato del endpoint.
- Archivos clave: `controller/{CatalogoController,IncidenciaController}.java`,
  `service/{CatalogoService,IncidenciaService}.java`, `service/impl/{CatalogoServiceImpl,IncidenciaServiceImpl}.java`,
  `dto/request/IncidenciaRequest.java`, `dto/response/{IncidenciaResponse,TipoEventoResponse,NivelGravedadResponse}.java`,
  `exception/{ReglaNegocioException,GlobalExceptionHandler}.java`, `config/RelojConfig.java`,
  `dao/{ZonaDao,TipoEventoDao}.java`; tests `service/impl/{IncidenciaServiceImplTest,CatalogoServiceImplTest}.java`.
- Cómo probarlo:
  - `cd backend && ./mvnw -q verify` → compila y pasan 60 tests (19 nuevos).
  - Con la app en perfil `local` y un token: los tres `GET /api/catalogos/...` devuelven solo activos;
    `POST /api/incidencias` con
    `{"idZona":1,"idTipoEvento":1,"idNivelGravedad":2,"descripcion":"Persona sospechosa en la puerta"}` → 201;
    con token de Supervisor → 403; tipo "Otro" con descripción corta → 400; zona inactiva → 400; fecha futura → 400.
  - Auditoría: `SELECT accion_realizada, detalle_cambio, id_usuario FROM auditoria WHERE accion_realizada = 'REGISTRAR_INCIDENCIA';`
- Pendientes o problemas conocidos:
  - La regla de "Otro" depende del nombre del tipo de evento; si se renombra en la BD, deja de aplicarse.
  - `GET /api/catalogos/roles` se agrega con el CRUD de usuarios (Fase 4).
  - Zona preseleccionada con la del vigilante: la resuelve el frontend (Fase 7) con `idZona` de `/api/auth/yo`.

## [2026-10-24] RF-09 — Ubicación de zonas y búsqueda con filtros
- Qué se hizo:
  - `zona` tiene `departamento VARCHAR(50) NOT NULL`, `provincia VARCHAR(50) NOT NULL`, `distrito VARCHAR(80) NOT NULL`
    y `referencia VARCHAR(150)` opcional. `docs/modelo_datos.sql` (versión 1.2) las incluye junto con el índice
    `idx_zona_ubicacion (departamento, provincia, distrito)`.
  - Entidad `Zona` con los cuatro campos nuevos.
  - DTO nuevos: `ZonaResponse` (zona completa para el frontend) y `ZonaFiltro` (filtros de búsqueda).
  - `ZonaDao` extiende `JpaSpecificationExecutor` y ofrece `conFiltros(ZonaFiltro)`: filtros opcionales y combinables
    por nombre (contiene), departamento, provincia, distrito (exactos), estado activo y texto libre sobre referencia o
    descripción, sin distinguir mayúsculas y con `%`/`_` tratados literalmente.
  - `ZonaService.buscar(filtro, pagina, tamano)`: paginada (tamaño 1..100), ordenada por nombre.
  - Nuevo RF-09 "Gestión de zonas" en `docs/requerimientos_funcionales.md` con el contrato
    `GET /api/zonas?nombre=&departamento=&provincia=&distrito=&activo=&q=&page=&size=`.
  - Dependencia de test `com.h2database:h2` para probar las consultas sin Supabase.
  - Se resolvió un bloque de conflicto de merge que había quedado en `docs/referencia_clases.md`.
- Archivos clave: `docs/modelo_datos.sql`, `backend/src/main/java/com/segandina/sgi/model/Zona.java`,
  `backend/src/main/java/com/segandina/sgi/dao/ZonaDao.java`, `backend/src/main/java/com/segandina/sgi/dto/{request/ZonaFiltro,response/ZonaResponse}.java`,
  `backend/src/main/java/com/segandina/sgi/service/{ZonaService,impl/ZonaServiceImpl}.java`,
  `backend/src/test/java/com/segandina/sgi/service/impl/ZonaServiceImplTest.java`, `backend/pom.xml`,
  `docs/requerimientos_funcionales.md`, `docs/referencia_clases.md`.
- Cómo probarlo:
  - `cd backend && ./mvnw -q verify` → compila y pasan 41 tests (16 nuevos en `ZonaServiceImplTest`, contra H2 en memoria).
  - Contra Supabase: `./mvnw spring-boot:run -Dspring-boot.run.profiles=local "-Dspring-boot.run.arguments=--spring.jpa.hibernate.ddl-auto=validate --spring.main.web-application-type=none"`
    → arranca sin `SchemaManagementException` si las columnas nuevas existen.
- Pendientes o problemas conocidos:
  - El controller `GET /api/zonas` (y alta/edición/baja de zonas) se implementa en la Fase 4; convertirá el `Page` al
    formato de respuesta definido en RF-09.
  - Crear en Supabase el índice `idx_zona_ubicacion` si aún no existe.

## [2026-10-24] Fase 1 — Baja lógica en catálogos (`estado_activo`)
- Qué se hizo:
  - `zona`, `tipo_evento` y `nivel_gravedad` tienen ahora `estado_activo BOOLEAN NOT NULL DEFAULT TRUE`.
    Un catálogo dado de baja no se borra (las incidencias antiguas lo siguen referenciando), solo deja de
    ofrecerse. La vista `v_despliegue_por_zona` muestra únicamente zonas activas.
  - `docs/modelo_datos.sql` (versión 1.1) refleja las tres columnas y la vista con `WHERE z.estado_activo = TRUE`.
  - Entidades `Zona`, `TipoEvento` y `NivelGravedad`: campo `estadoActivo` (`true` por defecto) con getter/setter.
  - DAO: `findByEstadoActivoTrue()` en `ZonaDao`, `TipoEventoDao` y `NivelGravedadDao`; además
    `NivelGravedadDao.findByEstadoActivoTrueOrderByOrdenAsc()` para listar niveles activos de menos a más grave.
  - Nuevo test `catalogoNuevoEstaActivoPorDefecto` en `MapeoEntidadesTest`.
  - El mapeo `CHAR(8)` (`@JdbcTypeCode(SqlTypes.CHAR)` + `@Column(length = 8)`) ya estaba aplicado en
    `Usuario.dni` y `Auditoria.dniIntentado`; no requirió cambios.
- Archivos clave: `docs/modelo_datos.sql`, `backend/src/main/java/com/segandina/sgi/model/{Zona,TipoEvento,NivelGravedad}.java`,
  `backend/src/main/java/com/segandina/sgi/dao/{ZonaDao,TipoEventoDao,NivelGravedadDao}.java`,
  `backend/src/test/java/com/segandina/sgi/model/MapeoEntidadesTest.java`, `docs/referencia_clases.md`,
  `docs/stack_arquitectura.md`.
- Cómo probarlo:
  - `cd backend && ./mvnw -q verify` → compila y pasan 7 tests.
  - `./mvnw spring-boot:run -Dspring-boot.run.profiles=local "-Dspring-boot.run.arguments=--spring.jpa.hibernate.ddl-auto=validate --spring.main.web-application-type=none"`
    → arranca sin `SchemaManagementException` (confirma que las columnas existen en Supabase).
- Pendientes o problemas conocidos: los servicios de catálogos (Fase 3) deben usar los métodos
  `findByEstadoActivoTrue*` para los formularios; `findAll` sigue devolviendo también los inactivos
  (útil para historial y administración).
## [2026-10-24] Fase 2 / RF-01, RF-08 — Login con JWT, seguridad por roles, auditoría base y seed del Administrador
- Qué se hizo:
  - `POST /api/auth/login`: valida DNI (8 dígitos, si no → 400 sin consultar la BD) y contraseña contra el
    hash BCrypt. Devuelve un JWT HS256 (`sub` = id_usuario, claims `rol` y `dni`, vigencia 8 h) y los datos
    básicos del usuario, sin `contrasena`.
  - DNI inexistente, contraseña incorrecta y usuario inactivo responden igual: 401
    "DNI o contraseña incorrectos". Con DNI inexistente se compara igual contra un hash ficticio para que
    el tiempo de respuesta no delate qué DNI existen.
  - Auditoría: `LOGIN_OK` en la misma transacción del login; `LOGIN_FALLIDO` en transacción propia (se guarda
    aunque el login falle) con `dni_intentado`, `id_usuario` nulo si el DNI no existe y el motivo interno
    (`DNI_NO_REGISTRADO`, `CONTRASENA_INCORRECTA`, `USUARIO_INACTIVO`) en `detalle_cambio`.
  - `GET /api/auth/yo`: datos del usuario dueño del token.
  - Seguridad con el resource server de Spring Security (`spring-boot-starter-oauth2-resource-server`):
    sin sesión, el claim `rol` se convierte en `ROLE_<rol>`. Reglas: login público; `/api/usuarios/**` y
    `/api/auditoria/**` solo Administrador; `/api/dashboard/**` y `/api/reportes/**` Administrador y
    Supervisor; `POST /api/incidencias` Administrador y Vigilante; `GET /api/incidencias/**` Administrador y
    Supervisor; el resto de rutas requiere token. Sin token o token inválido → 401; rol insuficiente → 403.
  - Errores con formato uniforme `{ timestamp, status, mensaje, detalles }`.
  - `JWT_SECRET` se lee de variable de entorno (`jwt.secreto`); la app no arranca si falta o tiene menos de
    32 caracteres. Ya no aparece el usuario temporal que Spring Security generaba en la Fase 1.
  - Perfil `seed` (`AdminSeedRunner`): con `ADMIN_DNI` y `ADMIN_PASSWORD` crea el Administrador activo si el
    DNI no existe, o reemplaza su contraseña por el hash BCrypt si ya existe. Audita `CREAR_USUARIO` o
    `MODIFICAR_USUARIO` con `{"origen":"seed"}`. Nunca escribe la contraseña en el log.
    Opcionales: `ADMIN_NOMBRES` y `ADMIN_APELLIDO_PATERNO` (por defecto "Administrador" / "Sistema").
- Archivos clave: `backend/pom.xml`, `config/SecurityConfig.java`, `config/JwtProperties.java`,
  `config/AdminSeedRunner.java`, `controller/AuthController.java`, `service/AuthService.java`,
  `service/impl/AuthServiceImpl.java`, `service/TokenService.java`, `service/impl/JwtTokenServiceImpl.java`,
  `service/AuditoriaService.java`, `service/impl/AuditoriaServiceImpl.java`, `model/AccionAuditoria.java`,
  `dto/request/LoginRequest.java`, `dto/response/LoginResponse.java`, `dto/response/UsuarioResumenResponse.java`,
  `exception/*`, `application.properties`, `backend/.env.example`; tests en
  `backend/src/test/java/com/segandina/sgi/{controller,config,service/impl}/`.
- Cómo probarlo:
  - Tests (sin BD): `cd backend && ./mvnw -q verify` → compila y pasan 24 tests (`AuthControllerTest`,
    `AuthServiceImplTest`, `JwtTokenServiceImplTest`, `AdminSeedRunnerTest`, `MapeoEntidadesTest`).
  - Crear o actualizar el Administrador inicial, en CMD (Windows) desde `backend`:
    ```
    set "ADMIN_DNI=12345678"
    set "ADMIN_PASSWORD=<contraseña de al menos 8 caracteres>"
    set "JWT_SECRET=<clave de al menos 32 caracteres>"
    .\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local,seed
    ```
    `JWT_SECRET` solo hace falta si no está definido en `application-local.properties`. En el log debe
    aparecer `Seed: Administrador creado (DNI 12345678)` o `Seed: contraseña actualizada ...`. Luego detener
    con Ctrl+C. En PowerShell las variables se definen con `$env:ADMIN_DNI="12345678"` y el argumento va entre
    comillas por la coma: `.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local,seed"`.
  - Arranque normal: `.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local`.
  - Login (CMD):
    `curl -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d "{\"dni\":\"12345678\",\"contrasena\":\"<contraseña>\"}"`
    → 200 con `token`. Con contraseña errónea o DNI inexistente → 401 con el mismo mensaje. Con `"dni":"12"` → 400.
  - Usuario actual: `curl http://localhost:8080/api/auth/yo -H "Authorization: Bearer <token>"` → 200;
    sin el header → 401.
  - Auditoría en Supabase:
    `SELECT accion_realizada, dni_intentado, id_usuario, detalle_cambio, fecha_hora FROM auditoria ORDER BY fecha_hora DESC;`
- Pendientes o problemas conocidos:
  - CORS para el dominio del frontend: se configura en la Fase 7.
  - Consulta de auditoría (`GET /api/auditoria`) para el Administrador: aún no existe el endpoint (hoy responde
    403 a otros roles y 404 al Administrador).
  - Decisión abierta: dónde guardar el JWT en el frontend (localStorage o cookie httpOnly).
  - Un token emitido sigue siendo válido hasta su vencimiento aunque el usuario se desactive; `/api/auth/yo`
    sí lo rechaza porque consulta el estado en la BD.

## [2026-10-24] Fase 1 — Corrección del mapeo CHAR(8)
- Qué se hizo:
  - Con `ddl-auto=validate` el arranque fallaba en `auditoria.dni_intentado`: Hibernate esperaba VARCHAR y
    PostgreSQL informa `bpchar` (CHAR). `Usuario.dni` y `Auditoria.dniIntentado` ahora usan
    `@JdbcTypeCode(SqlTypes.CHAR)` + `@Column(length = 8)` (se quitó `columnDefinition = "char(8)"`).
  - Se revisaron las demás columnas de `modelo_datos.sql` (TEXT, BOOLEAN, JSONB, TIMESTAMPTZ, enteros):
    ninguna necesita cambios; la validación contra Supabase pasa completa.
  - Nuevo test `columnasDniSeMapeanComoChar8` en `MapeoEntidadesTest`.
- Archivos clave: `backend/src/main/java/com/segandina/sgi/model/Usuario.java`,
  `backend/src/main/java/com/segandina/sgi/model/Auditoria.java`,
  `backend/src/test/java/com/segandina/sgi/model/MapeoEntidadesTest.java`, `docs/stack_arquitectura.md`,
  `docs/referencia_clases.md`.
- Cómo probarlo:
  - `cd backend && ./mvnw -q verify` → compila y pasan 6 tests.
  - `./mvnw spring-boot:run -Dspring-boot.run.profiles=local "-Dspring-boot.run.arguments=--spring.jpa.hibernate.ddl-auto=validate --spring.main.web-application-type=none"`
    → arranca (`Started SgiApplication`) sin `SchemaManagementException`.
- Pendientes o problemas conocidos: ninguno nuevo. `application.properties` sigue con `ddl-auto=none`.

## [2026-10-24] Fase 1 — Base del backend: entidades y DAO
- Qué se hizo:
  - Proyecto Spring Boot 4.1.2 en `/backend` (Java 21, Maven Wrapper) con Web MVC, Data JPA, PostgreSQL,
    Security y Validation. Grupo `com.segandina`, artefacto `sgi-backend`, paquete `com.segandina.sgi`.
  - 7 entidades JPA mapeadas a `docs/modelo_datos.sql`: `Rol`, `Zona`, `TipoEvento`, `NivelGravedad`,
    `Usuario`, `Incidencia`, `Auditoria`. Relaciones `@ManyToOne` LAZY; `fecha_registro` y
    `auditoria.fecha_hora` las asigna la BD; `Auditoria` es inmutable (`@Immutable`, sin setters);
    `detalle_cambio` como JSONB.
  - 7 DAO Spring Data. `AuditoriaDao` extiende `Repository` y solo expone `save`, `findById` y
    `findAll(Pageable)` (sin borrado).
  - `application.properties` lee la conexión de variables de entorno (`DB_URL`, `DB_USER`, `DB_PASSWORD`),
    con `ddl-auto=none`. Plantilla `backend/.env.example`.
  - El test por defecto (`@SpringBootTest`, necesitaba BD) se reemplazó por `MapeoEntidadesTest` (JUnit puro).
  - Nuevo `docs/referencia_clases.md` con la referencia de clases de esta fase.
- Archivos clave: `backend/pom.xml`, `backend/src/main/java/com/segandina/sgi/model/*`,
  `backend/src/main/java/com/segandina/sgi/dao/*`, `backend/src/main/resources/application.properties`,
  `backend/src/test/java/com/segandina/sgi/model/MapeoEntidadesTest.java`.
- Cómo probarlo:
  - `cd backend && ./mvnw -q verify` → compila y pasan 5 tests.
  - Validación contra Supabase (con `application-local.properties`):
    `./mvnw spring-boot:run -Dspring-boot.run.profiles=local "-Dspring-boot.run.arguments=--spring.jpa.hibernate.ddl-auto=validate --spring.main.web-application-type=none"`;
    debe arrancar y terminar sin `SchemaManagementException`.
- Pendientes o problemas conocidos:
  - Validación del mapeo contra Supabase: resuelta en la entrada "Corrección del mapeo CHAR(8)".
  - Mientras no exista configuración de seguridad, Spring Security genera un usuario temporal en memoria
    (se reemplaza en la Fase 2 con login por DNI y JWT).
  - La vista `v_despliegue_por_zona` se consumirá con consulta nativa en la Fase 5.
  - En Windows, `mvnw.cmd` exige que `JAVA_HOME` apunte al JDK 21 (p. ej. `C:\Program Files\Java\jdk-21.0.12.1`).
