# Plan de pruebas integrales — SGI-SEGANDINA

Versión 1.0 · 13 de noviembre de 2026 · Sistema Web Interno de Gestión de Incidencias y Análisis de Seguridad
(Seguridad Andina S.A.C.).

## 1. Objetivo y alcance

### 1.1 Objetivo

Verificar que el sistema cumple los requerimientos funcionales RF-01 a RF-09 y los no funcionales RNF-01 a RNF-05
trabajando con todas sus piezas juntas: frontend Next.js, API Spring Boot y base de datos PostgreSQL en Supabase.
El plan define los casos de prueba (`CP-xx`), cómo se ejecutan, qué evidencia deja cada uno y cuándo se considera
terminada la etapa de pruebas.

### 1.2 Alcance

| Requerimiento | Qué se prueba |
|---|---|
| RF-01 Autenticación y accesos | Login por DNI y contraseña, JWT, 401/403, contraseña temporal y cambio obligatorio, redirección por rol. |
| RF-02 Gestión de usuarios | Alta, listado con filtros, edición, reasignación de zona, baja lógica, restablecimiento de contraseña. |
| RF-03 Registro de incidencias | Reglas del registro (catálogos activos, "Otro", fecha no futura), formulario Mobile-First. |
| RF-04 Historial y filtros | Listado paginado contra Supabase, filtro de rango en hora de Lima, filtros combinados. |
| RF-05 Dashboard analítico | KPIs, conteos por zona y tipo, serie por día, semana y mes en hora de Lima. |
| RF-06 Exportación de reportes | Excel y PDF contra Supabase, con los filtros del historial; auditoría de la exportación. |
| RF-07 Control de despliegue | Vigilantes activos por zona desde la vista `v_despliegue_por_zona`. |
| RF-08 Auditoría | Registro de cada acción, consulta con filtros, inmutabilidad (triggers, privilegios de `app_sgi`, RLS). |
| RF-09 Zonas y catálogos | Zonas, tipos de evento y niveles de gravedad: alta, edición, baja lógica, búsqueda. |
| RNF-01 Seguridad y trazabilidad | Endpoints protegidos, contraseña nunca expuesta, auditoría inmutable, CORS. |
| RNF-03 Usabilidad | Mobile-First en el formulario del vigilante, escritorio en las pantallas de gerencia. |
| RNF-04 Rendimiento | Registrar una incidencia o descargar un reporte en menos de 3 s con red móvil. |
| RNF-05 Escalabilidad | Revisión de la normalización (3FN) y de los índices del modelo. |

### 1.3 Fuera de alcance

- **RNF-02 Disponibilidad (99 % de uptime):** solo se puede medir con el sistema desplegado (Fase 9); queda fuera de
  esta etapa.
- **Registro sin conexión:** el formulario necesita red; no guarda incidencias para enviarlas después.
- **Cambio voluntario de contraseña desde el frontend:** no existe pantalla; el endpoint se prueba por API (CP-24).
- **Pruebas de carga o estrés** con muchos usuarios concurrentes: RNF-04 se mide con una sola sesión en red móvil.
- **Aplicación móvil nativa:** el sistema es web; en el celular se usa el navegador.
- **Pruebas de penetración** externas.

## 2. Entorno de pruebas

| Elemento | Configuración |
|---|---|
| Backend | Spring Boot en local con el perfil `local` (`.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local`), conectado a Supabase con el rol `app_sgi`. |
| Base de datos | PostgreSQL en Supabase con el esquema de `docs/modelo_datos.sql` (versión 1.2, incluida la columna `usuario.debe_cambiar_contrasena`). Consultas de verificación desde el SQL Editor de Supabase. |
| Frontend | `npm run dev` en `frontend/` con `NEXT_PUBLIC_API_URL=http://localhost:8080` en `frontend/.env.local`. |
| API | Postman (colección `postman/collections/SGI-SEGANDINA`) con un environment local. |
| Navegador de escritorio | Chrome actual, ventana de 1366 × 768. |
| Vista móvil | DevTools de Chrome, dispositivo de 360 × 740 y perfil de red "Fast 4G" (y "Slow 4G" para el caso desfavorable). |
| Zona horaria | Las fechas de los casos se expresan en hora de Lima (UTC−5). |

### 2.1 Datos de prueba

- Un usuario por rol, creado solo para las pruebas, con DNIs ficticios: Administrador `10000001`, Supervisor
  `10000002`, Vigilante `10000003`, Vigilante inactivo `10000004`, usuario con contraseña temporal `10000005`.
  `99999999` se usa como DNI no registrado.
- Las contraseñas de prueba no se escriben en este documento ni en la colección: se cargan en el environment local
  de Postman (variables `contrasena`, `contrasenaInicial`, `contrasenaActual`, `contrasenaNueva`) o en variables de
  entorno del sistema. En las tablas aparecen como `<contraseña válida>` o con su longitud.
- Al menos dos zonas activas y una inactiva, los cuatro tipos de evento de la semilla (`Robo`, `Accidente`,
  `Alerta`, `Otro`) y los cuatro niveles (`Baja`, `Media`, `Alta`, `Crítica`).
- Incidencias de prueba en varios días, zonas, tipos y niveles, incluidas las de borde de día que piden CP-36 y CP-41.
- Las evidencias no muestran contraseñas, tokens ni DNIs reales.

### 2.2 Ejecución de la colección Postman con el Runner

Cada petición de la colección trae un script que comprueba el código de estado de éxito (y, en los reportes, el
`Content-Type` y que el archivo venga como adjunto). "Login" además comprueba que la respuesta traiga el token, que
no traiga la contraseña y que el token quede guardado en la variable `token` del environment, que el resto de
peticiones usa como `Authorization: Bearer {{token}}`.

Variables que debe tener el environment local (los valores no se versionan):

| Variable | Uso |
|---|---|
| `baseUrl` | URL de la API, p. ej. `http://localhost:8080`. |
| `dni`, `contrasena` | Credenciales del usuario con el que se inicia sesión (Administrador para el Runner). |
| `token` | Lo escribe "Login". |
| `periodo`, `desde`, `hasta` | Filtro de rango del historial, dashboard, reportes y auditoría. |
| `dniNuevo`, `contrasenaInicial` | Cuerpo de "Usuarios Crear" (DNI ficticio y contraseña temporal de 8 a 72 caracteres). |
| `contrasenaActual`, `contrasenaNueva` | Cuerpo de "Usuarios Mi Contrasena"; `contrasenaNueva` también la usa "Usuarios Restablecer Contrasena". |
| `accionAuditoria`, `qAuditoria` | Filtros de "Auditoria Filtrar". |

Cómo correrla:

1. Usar una base con datos de prueba, no con datos operativos: varias peticiones modifican registros (editan el
   usuario 2, la zona 1, el tipo de evento 1 y el nivel 1, y desactivan algunos de ellos).
2. Ejecutar "Login" con el Administrador y luego el resto en el orden de la colección.
3. Los códigos esperados son los del perfil Administrador: 200 en consultas y ediciones, 201 en altas y registro de
   incidencias, 204 en restablecimiento y cambio de contraseña.
4. Las altas ("Usuarios Crear", "Zonas Crear", "Tipos Evento Crear") responden 409 si se repiten con los mismos
   datos: para una segunda corrida hay que cambiar `dniNuevo` y los nombres, o restaurar la base.
5. "Usuarios Mi Contrasena" cambia la contraseña del dueño del token: se excluye de la corrida del Administrador y
   se corre aparte, tras iniciar sesión con un usuario de prueba.
6. "Usuarios Restablecer Contrasena" apunta al usuario 2, que no debe ser el Administrador de la sesión (si lo es,
   la API responde 400).

## 3. Estrategia por tipo de prueba

| Tipo | Qué cubre | Cómo se ejecuta |
|---|---|---|
| Unitaria | Reglas de negocio de los servicios, cálculo de rangos (`RangoFechas`), generación de Excel y PDF, emisión y lectura del JWT, seed del Administrador. | JUnit 5 + Mockito en `backend/src/test`, sin base de datos. |
| Integración del backend | Controllers con seguridad real (MockMvc: rutas, roles, formato de error, CORS) y consultas DAO contra H2 en modo PostgreSQL. | `./mvnw test`. |
| Integración API contra Supabase | El backend completo contra la base real: consultas nativas (`AT TIME ZONE`, `to_char`), JSONB de auditoría, vista de despliegue. Prioriza lo que solo se probó en H2: historial, dashboard, reportes y consulta de auditoría. | Postman (peticiones de la colección y variantes descritas en cada caso) + SQL Editor para verificar filas. |
| Seguridad | 401 sin token o con token inválido, 403 por rol, contraseñas temporales y cambio obligatorio, restablecimiento, contraseña nunca expuesta, auditoría inmutable en tres capas: triggers `trg_auditoria_no_modificar` y `trg_auditoria_no_truncar`, `GRANT` de `app_sgi` sin UPDATE/DELETE sobre `auditoria` y RLS activo en todas las tablas. | Postman, SQL Editor de Supabase, cliente SQL conectado como `app_sgi`, API REST pública de Supabase. |
| Validación de formularios | Avisos debajo de cada campo antes de enviar, con los mismos límites y mensajes que los DTO del backend. | Manual en el navegador y luego Playwright, sobre `frontend/src/lib/validaciones.ts` (pendiente de crear). |
| Extremo a extremo (E2E) | Recorridos completos desde el navegador: login por rol, cambio obligatorio, registro móvil, historial, dashboard, exportación, personal y catálogos. | Manual con capturas mientras Playwright no esté configurado; después, Playwright en `frontend/`. |
| Rendimiento (RNF-04) | Tiempo de respuesta al registrar una incidencia y al descargar un reporte, menor a 3 s con red móvil. | Pestaña Network de DevTools con "Fast 4G" (tiempo total de la petición) y tiempo de respuesta de Postman. Se toman 5 mediciones y se informa la mayor. |
| Usabilidad (RNF-03) | Formulario del vigilante usable con una mano a 360 px; pantallas de gerencia en escritorio y utilizables en tablet. | Revisión manual con la vista móvil de DevTools y en un celular real. |

Los casos que dependen de pantallas aún no construidas figuran en la tabla como **planificados**: se ejecutan cuando
la pantalla exista.

## 4. Criterios de entrada y salida

### 4.1 Entrada

- `./mvnw -q verify` en verde y `npm run lint && npm run build` sin errores en la rama que se prueba.
- Esquema de Supabase igual a `docs/modelo_datos.sql` (el backend arranca con `ddl-auto=validate` sin
  `SchemaManagementException`), con triggers, RLS y privilegios de `app_sgi` aplicados.
- Usuarios, catálogos e incidencias de prueba cargados (sección 2.1) y environment de Postman completo (sección 2.2).
- Para los casos planificados: la pantalla correspondiente está terminada y compila.

### 4.2 Salida

- Todos los casos no planificados ejecutados, con resultado obtenido, estado y evidencia.
- 100 % de los casos de RF-01, RF-03, RF-04, RF-05, RF-07 y RNF-01 (prioridad alta) en estado "Aprobado".
- Ningún defecto de severidad crítica o alta abierto; los de severidad media o baja, documentados con su plan.
- Evidencias en `docs/evidencias/pruebas/` (capturas `CP-xx_descripcion.png`, `index.html` y `reporte_pruebas.pdf`).

### 4.3 Estados de un caso

`Pendiente` (sin ejecutar) · `Aprobado` · `Fallido` (se registra un defecto) · `Bloqueado` (no se pudo ejecutar) ·
`Planificado` (depende de una pantalla aún no construida).

## 5. Casos de prueba

Columnas: **Resultado obtenido** y **Estado** se llenan al ejecutar el caso. **Evidencia** es el nombre de la
captura que se guarda en `docs/evidencias/pruebas/`. Tipos: Unitaria/Integración backend (UI-B), Integración API
(API), Seguridad (SEG), Validación (VAL), Extremo a extremo (E2E), Rendimiento (REN), Usabilidad (USA),
Revisión (REV).

Salvo que se indique otra cosa, las peticiones llevan `Authorization: Bearer <token>` del rol indicado en la
precondición y se ejecutan contra Supabase.

### 5.1 Suite automatizada

| ID | RF | Tipo | Precondición | Pasos | Datos de prueba | Resultado esperado | Resultado obtenido | Estado | Evidencia |
|---|---|---|---|---|---|---|---|---|---|
| CP-01 | RF-01 a RF-09 | UI-B | JDK 21 en `JAVA_HOME`. | 1. `cd backend`. 2. `.\mvnw.cmd -q verify`. | Ninguno (H2 en memoria). | Compila y pasan los 210 tests, sin fallos ni errores. | | | CP-01_suite_backend.png |

### 5.2 RF-01 Autenticación y accesos

| ID | RF | Tipo | Precondición | Pasos | Datos de prueba | Resultado esperado | Resultado obtenido | Estado | Evidencia |
|---|---|---|---|---|---|---|---|---|---|
| CP-02 | RF-01 | API | Administrador `10000001` activo. | 1. `POST /api/auth/login` (petición "Login"). 2. En SQL: `SELECT accion_realizada, id_usuario FROM auditoria ORDER BY id_auditoria DESC LIMIT 1;` | `dni` = 10000001, `contrasena` = `<contraseña válida>`. | 200 con `token`, `expiraEn` y `usuario` (rol Administrador, `debeCambiarContrasena: false`), sin campo `contrasena`. Fila `LOGIN_OK` con el id del Administrador. | | | CP-02_login_valido.png |
| CP-03 | RF-01 | SEG | Usuario `10000003` activo. | 1. `POST /api/auth/login` con contraseña errónea. 2. Revisar la última fila de `auditoria`. | `dni` = 10000003, contraseña incorrecta. | 401 "DNI o contraseña incorrectos". Fila `LOGIN_FALLIDO` con `dni_intentado` = 10000003 y `detalle_cambio` `{"motivo": "CONTRASENA_INCORRECTA"}`. | | | CP-03_login_contrasena_incorrecta.png |
| CP-04 | RF-01 | SEG | DNI `99999999` no registrado. | 1. `POST /api/auth/login`. 2. Revisar la última fila de `auditoria`. | `dni` = 99999999, cualquier contraseña. | 401 con el mismo mensaje que CP-03. Fila `LOGIN_FALLIDO` con `id_usuario` nulo, `dni_intentado` = 99999999 y motivo `DNI_NO_REGISTRADO`. | | | CP-04_login_dni_inexistente.png |
| CP-05 | RF-01 | SEG | Vigilante `10000004` con `estado_activo = false`. | 1. `POST /api/auth/login` con su contraseña correcta. | `dni` = 10000004, `<contraseña válida>`. | 401 "DNI o contraseña incorrectos"; `LOGIN_FALLIDO` con motivo `USUARIO_INACTIVO`. | | | CP-05_login_usuario_inactivo.png |
| CP-06 | RF-01 | API | — | 1. `POST /api/auth/login` con DNI de 2 dígitos. 2. Repetir con `1234567a`. 3. Contar filas de `auditoria` antes y después. | `dni` = `12` y `1234567a`. | 400 con `dni: debe tener 8 dígitos` en `detalles`. No se agrega ninguna fila a `auditoria` (se rechaza antes de consultar la BD). | | | CP-06_login_dni_invalido.png |
| CP-07 | RF-01 | SEG | — | 1. `GET /api/incidencias` sin cabecera `Authorization`. 2. `GET /api/auth/yo` sin cabecera. | — | 401 en ambos, en el formato `{timestamp, status, mensaje, detalles}`. | | | CP-07_sin_token_401.png |
| CP-08 | RF-01 | SEG | Token válido de Supervisor. | 1. Cambiar un carácter de la firma del token. 2. `GET /api/dashboard/kpis` con el token alterado. | Token modificado. | 401. | | | CP-08_token_alterado_401.png |
| CP-09 | RF-01 | SEG | Token de Vigilante. | 1. `GET /api/dashboard/kpis`. 2. `GET /api/incidencias`. 3. `GET /api/reportes/excel`. 4. `GET /api/usuarios`. | — | 403 en las cuatro peticiones. | | | CP-09_vigilante_403.png |
| CP-10 | RF-01 | SEG | Token de Supervisor. | 1. `GET /api/usuarios`. 2. `POST /api/incidencias` con un cuerpo válido. 3. `GET /api/auditoria`. 4. `POST /api/zonas` con un cuerpo válido. | Cuerpos de "Registrar Incidencias" y "Zonas Crear". | 403 en las cuatro peticiones; no se crea incidencia ni zona. | | | CP-10_supervisor_403.png |
| CP-11 | RF-01 | SEG | Usuario `10000005` con contraseña temporal (`debe_cambiar_contrasena = true`). | 1. `POST /api/auth/login`. 2. `GET /api/auth/yo`. 3. `GET /api/catalogos/zonas`. 4. Revisar la fila `LOGIN_OK`. | `dni` = 10000005, contraseña temporal. | 1: 200 con `usuario.debeCambiarContrasena: true`. 2: 200. 3: 403 "Debe cambiar su contraseña antes de continuar". 4: `detalle_cambio` `{"cambioPendiente": true}`. | | | CP-11_token_cambio_pendiente.png |
| CP-12 | RF-01 | SEG | Token de CP-11. | 1. `PATCH /api/usuarios/me/contrasena`. 2. Revisar la fila `CAMBIAR_CONTRASENA`. 3. Iniciar sesión con la nueva. 4. `GET /api/catalogos/zonas`. | `contrasenaActual` = temporal, `contrasenaNueva` = `<contraseña válida de 10 caracteres>`. | 1: 204. 2: `{idUsuario, origen: "propio", cambioObligatorio: true}`, sin contraseña ni hash. 3: 200 con `debeCambiarContrasena: false`. 4: 200. | | | CP-12_cambio_obligatorio.png |
| CP-13 | RF-01 | E2E | Frontend en `npm run dev`; usuarios de los tres roles. | 1. Entrar como Vigilante. 2. Escribir `/dashboard` en la barra. 3. Cerrar sesión y entrar como Supervisor y luego como Administrador. 4. Revisar el menú de cada rol. | DNIs 10000001, 10000002, 10000003. | Vigilante va a `/incidencias/nueva` y al abrir `/dashboard` vuelve a su inicio. Supervisor y Administrador van a `/dashboard`. El menú muestra solo las opciones del rol. | | | CP-13_redireccion_por_rol.png |
| CP-14 | RF-01 | E2E | Usuario con contraseña temporal. | 1. Iniciar sesión. 2. Abrir `/dashboard` o `/incidencias/nueva`. 3. Enviar actual incorrecta. 4. Enviar un cambio válido. 5. Entrar con la nueva. | Contraseña temporal y nueva válida. | 1: va a `/cambiar-contrasena` sin menú. 2: vuelve a `/cambiar-contrasena`. 3: "La contraseña actual o temporal no es correcta.". 4: `/login` con "Contraseña actualizada, inicia sesión con la nueva.". 5: inicio normal del rol. | | | CP-14_cambio_obligatorio_frontend.png |
| CP-15 | RF-01 | E2E | Sesión iniciada. | 1. "Cerrar sesión". 2. Pulsar Atrás. 3. Iniciar sesión, borrar o vencer el token (`expiraEn`) y navegar. 4. Recargar `/login` con datos escritos sin enviar. | Cualquier usuario de prueba. | 1: `/login` con campos vacíos y botón "Ingresar" habilitado. 2: no se muestra la pantalla privada. 3: `/login` con "Tu sesión venció". 4: campos vacíos. | | | CP-15_cierre_y_vencimiento_sesion.png |

### 5.3 RF-02 Gestión de usuarios

| ID | RF | Tipo | Precondición | Pasos | Datos de prueba | Resultado esperado | Resultado obtenido | Estado | Evidencia |
|---|---|---|---|---|---|---|---|---|---|
| CP-16 | RF-02 | API | Token de Administrador; zona 1 activa. | 1. `POST /api/usuarios`. 2. Revisar la fila `CREAR_USUARIO`. | `{dni: 10000006, nombres: "Luis", apellidoPaterno: "Rojas", contrasena: <8 a 72 caracteres>, idRol: 3, idZona: 1}`. | 201 con el usuario (`estadoActivo: true`), sin `contrasena`. Auditoría con `debeCambiarContrasena: true` y sin la contraseña ni el hash. | | | CP-16_crear_usuario.png |
| CP-17 | RF-02 | API | Usuario de CP-16 creado. | 1. Repetir el `POST` de CP-16. | Mismo DNI 10000006. | 409 con mensaje claro de DNI duplicado. | | | CP-17_dni_duplicado_409.png |
| CP-18 | RF-02 | API | Token de Administrador. | 1. `POST /api/usuarios` con rol Vigilante sin `idZona`. 2. Repetir con una zona inactiva. 3. Repetir con `idRol` inexistente. | `idRol: 3`, `idZona` ausente / inactiva; `idRol: 99`. | 400 en los tres casos, con mensaje claro. | | | CP-18_vigilante_sin_zona_400.png |
| CP-19 | RF-02 | API | Varios usuarios de prueba. | 1. `GET /api/usuarios?idRol=3&activo=true&q=Rojas&page=0&size=20`. 2. `GET /api/usuarios/{id}`. 3. `GET /api/usuarios/999999`. | Filtros indicados. | 1: página `{contenido, pagina, tamano, totalElementos, totalPaginas}` solo con vigilantes activos que coinciden, ordenada por apellidos y nombres, sin `contrasena`. 2: 200. 3: 404. | | | CP-19_listar_usuarios.png |
| CP-20 | RF-02 | API | Vigilante de CP-16 en la zona 1; zona 2 activa. | 1. `PUT /api/usuarios/{id}` con `idZona: 2` y `contrasena: null`. 2. Repetir sin cambios. 3. Revisar `auditoria`. | Mismos datos con `idZona: 2`. | 1: 200 con `idZona: 2`. 2: 200. 3: un solo `MODIFICAR_USUARIO` con antes/después de la zona (la edición sin cambios no audita). | | | CP-20_reasignar_zona.png |
| CP-21 | RF-02 | API | Token de Administrador. | 1. `PATCH /api/usuarios/{id vigilante}/estado` `{activo: false}`. 2. Login con ese vigilante. 3. `PATCH /api/usuarios/{id propio}/estado` `{activo: false}`. | — | 1: 200 con `estadoActivo: false` y `CAMBIAR_ESTADO_USUARIO`. 2: 401. 3: 400 (el Administrador no puede desactivarse). | | | CP-21_baja_logica_usuario.png |
| CP-22 | RF-02 | SEG | Token de Administrador; usuario de prueba activo. | 1. `PATCH /api/usuarios/{id}/contrasena` ("Usuarios Restablecer Contrasena"). 2. Revisar `auditoria`. 3. Login del afectado con la nueva. | `contrasenaNueva` = `<8 a 72 caracteres>`. | 1: 204. 2: `RESTABLECER_CONTRASENA` con `{idUsuario: <afectado>, debeCambiarContrasena: true}`, autor el Administrador, sin contraseña ni hash. 3: 200 con `debeCambiarContrasena: true`. | | | CP-22_restablecer_contrasena.png |
| CP-23 | RF-02 | SEG | Token de Administrador. | 1. Restablecer la contraseña propia por `PATCH /api/usuarios/{id propio}/contrasena`. 2. Restablecer `id` 999999. 3. Restablecer con 7 caracteres. 4. Con token de Supervisor. | — | 1: 400. 2: 404. 3: 400 `contrasenaNueva: debe tener entre 8 y 72 caracteres`. 4: 403. | | | CP-23_restablecer_errores.png |
| CP-24 | RF-02 | SEG | Token de un usuario sin contraseña temporal. | 1. `PATCH /api/usuarios/me/contrasena` con actual incorrecta. 2. Con nueva igual a la actual. 3. Con nueva de 73 caracteres. | — | 400 en los tres, con mensaje claro ("La nueva contraseña debe ser distinta de la actual" en el 2). | | | CP-24_cambio_propio_errores.png |
| CP-25 | RF-02 | E2E | **Planificado (pantalla `/personal` pendiente).** Sesión de Administrador. | 1. Abrir `/personal`. 2. "+ Agregar Personal" con datos válidos. 3. Editar la zona. 4. Desactivar y activar. 5. Restablecer la contraseña. 6. Entrar como Supervisor y abrir `/personal`. | Usuario ficticio nuevo. | Tabla con nombre, DNI, rol, zona y estado; cada acción se refleja en la tabla y muestra confirmación; el Supervisor no ve la opción ni puede abrir la ruta. | | | CP-25_gestion_personal.png |

### 5.4 RF-03 Registro de incidencias

| ID | RF | Tipo | Precondición | Pasos | Datos de prueba | Resultado esperado | Resultado obtenido | Estado | Evidencia |
|---|---|---|---|---|---|---|---|---|---|
| CP-26 | RF-03 | API | Token de Vigilante; zona 1, tipo 1 y nivel 2 activos. | 1. `POST /api/incidencias` ("Registrar Incidencias") sin `fechaHora`. 2. Revisar la fila en `incidencia` y en `auditoria`. | `{idZona: 1, idTipoEvento: 1, idNivelGravedad: 2, descripcion: "Persona sospechosa en la puerta"}`. | 201 con zona, tipo y nivel con sus nombres; `fecha_hora` ≈ hora actual; `id_usuario` = el del token; `REGISTRAR_INCIDENCIA` con `{idIncidencia, idZona, idTipoEvento, idNivelGravedad}`. | | | CP-26_registrar_incidencia.png |
| CP-27 | RF-03 | API | Token de Vigilante. | 1. `POST` con tipo "Otro" y descripción de 19 caracteres rodeada de espacios. 2. Repetir con 20 caracteres. | Tipo "Otro" (id 4 en la semilla). | 1: 400 por descripción corta. 2: 201. | | | CP-27_otro_descripcion_corta.png |
| CP-28 | RF-03 | API | Token de Vigilante. | 1. `POST` con `fechaHora` = ahora + 10 min. 2. Con ahora + 1 min. 3. Con ayer a las 22:00 (reporte tardío). | Hora de Lima con desfase `-05:00`. | 1: 400 por fecha futura. 2: 201 (tolerancia de 2 min). 3: 201 con esa `fecha_hora`. | | | CP-28_fecha_futura.png |
| CP-29 | RF-03 | API | Zona inactiva (CP-66), tipo inactivo (CP-67). | 1. `POST` con la zona inactiva. 2. Con el tipo inactivo. 3. Con `idZona` 999999. | — | 400 en los tres, con mensaje claro; no se guarda la incidencia. | | | CP-29_catalogo_inactivo.png |
| CP-30 | RF-03 | API | Token de Vigilante. | 1. `POST` sin `descripcion`. 2. Con `descripcion` de solo espacios. 3. Con 2001 caracteres. 4. Sin `idZona`. | — | 400: `descripcion: es obligatoria`, `descripcion: no debe superar los 2000 caracteres`, `idZona: es obligatoria`. | | | CP-30_campos_obligatorios_api.png |
| CP-31 | RF-03 | E2E | Vista móvil 360 × 740; Vigilante con zona asignada. | 1. Iniciar sesión. 2. Verificar zona preseleccionada. 3. Elegir tipo y gravedad con los selectores. 4. Escribir la descripción y registrar. | Datos válidos. | Se muestra la confirmación con el número de incidencia y el formulario queda listo para otro registro. La incidencia aparece en `GET /api/incidencias`. | | | CP-31_formulario_movil.png |
| CP-32 | RF-03 | REN | Vista móvil con red "Fast 4G" (repetir con "Slow 4G"). | 1. Registrar 5 incidencias. 2. Medir en Network el tiempo total del `POST /api/incidencias`. | Datos válidos. | El mayor de los 5 tiempos es menor a 3 s con "Fast 4G". Con "Slow 4G" se registra el valor obtenido. | | | CP-32_rendimiento_registro.png |
| CP-33 | RF-03 | USA | Vista móvil 360 × 740 y un celular real. | 1. Recorrer el formulario con una mano. 2. Cronometrar un registro completo. | — | Sin desplazamiento horizontal; selectores como botones; colores de gravedad (verde, amarillo, naranja, rojo); botón de registro fijo abajo; registro completo en menos de 2 minutos. | | | CP-33_usabilidad_movil.png |

### 5.5 RF-04 Historial y filtros (contra Supabase)

| ID | RF | Tipo | Precondición | Pasos | Datos de prueba | Resultado esperado | Resultado obtenido | Estado | Evidencia |
|---|---|---|---|---|---|---|---|---|---|
| CP-34 | RF-04 | API | Token de Supervisor; incidencias en los últimos 40 días. | 1. `GET /api/incidencias` sin parámetros. 2. Comparar con `SELECT count(*) FROM incidencia WHERE fecha_hora >= <hoy − 29 días 00:00 Lima>`. | — | Página de 20 con solo los últimos 30 días, de la más reciente a la más antigua (a igual fecha, id descendente). `totalElementos` igual al conteo SQL. Cada fila trae `usuario` `{idUsuario, dni, nombreCompleto}` sin contraseña. | | | CP-34_historial_por_defecto.png |
| CP-35 | RF-04 | API | Incidencias de varias zonas, tipos y niveles. | 1. `GET /api/incidencias?periodo=ULTIMOS_7_DIAS&idZona=1&idNivelGravedad=3&idTipoEvento=1`. 2. `?idZona=999999`. 3. `?page=1&size=5`. 4. `?size=500`. | Ids existentes. | 1: solo filas que cumplen los cuatro filtros. 2: página vacía (200). 3: segunda página de 5 sin repetir filas de la primera. 4: `tamano` 100. | | | CP-35_historial_filtros.png |
| CP-36 | RF-04 | API | Dos incidencias de prueba: 2026-11-10 23:59:59 y 2026-11-11 00:00:00, hora de Lima. | 1. `GET /api/incidencias?periodo=PERSONALIZADO&desde=2026-11-10&hasta=2026-11-10`. 2. Igual con el 2026-11-11. | `fechaHora` `2026-11-10T23:59:59-05:00` y `2026-11-11T00:00:00-05:00`. | 1: aparece solo la de las 23:59:59. 2: aparece solo la de las 00:00:00. | | | CP-36_borde_dia_lima.png |
| CP-37 | RF-04 | API | Token de Supervisor. | 1. `?periodo=PERSONALIZADO&desde=2026-10-10&hasta=2026-10-01`. 2. `desde=2025-01-01&hasta=2026-01-03`. 3. `?periodo=HOY&desde=2026-11-01`. 4. `?periodo=SEMANAL`. 5. `PERSONALIZADO` sin `hasta`. | — | 400 en todos, con el campo en `detalles` (`desde: La fecha desde no puede ser posterior a hasta`; el rango de más de 366 días en `hasta`; las fechas sin `PERSONALIZADO` en `periodo`). | | | CP-37_historial_rango_invalido.png |
| CP-38 | RF-04 | E2E | **Planificado (pantalla `/historial` pendiente).** Sesión de Supervisor. | 1. Abrir `/historial`. 2. Aplicar rango, zona y gravedad. 3. Cambiar de página. | — | Tabla con Fecha, Zona, Tipo, Gravedad y Usuario; descripción en el detalle; los filtros dan las mismas filas que la API (CP-35); estados de carga y error visibles. | | | CP-38_pantalla_historial.png |

### 5.6 RF-05 Dashboard analítico (contra Supabase)

| ID | RF | Tipo | Precondición | Pasos | Datos de prueba | Resultado esperado | Resultado obtenido | Estado | Evidencia |
|---|---|---|---|---|---|---|---|---|---|
| CP-39 | RF-05 | API | Token de Supervisor; ningún incidente de nivel "Crítica" en el periodo. | 1. `GET /api/dashboard/kpis?periodo=ULTIMOS_30_DIAS`. 2. Comparar con el historial del mismo periodo. | — | `desde`, `hasta`, `incidenciasHoy`, `incidenciasPeriodo` (= `totalElementos` del historial) y `porGravedad` con los 4 niveles activos de menos a más grave, "Crítica" con 0. | | | CP-39_kpis.png |
| CP-40 | RF-05 | API | Incidencias en al menos dos zonas y dos tipos. | 1. `GET /api/dashboard/incidencias-por-zona?periodo=ULTIMOS_30_DIAS`. 2. `.../incidencias-por-tipo`. 3. Comparar con `SELECT id_zona, count(*) ... GROUP BY id_zona`. | — | Listas `{id, nombre, total}` de mayor a menor, solo con zonas o tipos que tienen incidencias; totales iguales a los del SQL. | | | CP-40_por_zona_y_tipo.png |
| CP-41 | RF-05 | API | Incidencia de prueba el 2026-11-05 a las 23:30 hora de Lima (04:30 UTC del día 6). | 1. `GET /api/dashboard/incidencias-por-tiempo?periodo=MES_ACTUAL&agrupacion=DIA`. | `fechaHora` `2026-11-05T23:30:00-05:00`. | `agrupacion: DIA`; un punto por día del 1 del mes a hoy, con 0 en los días sin incidencias; la incidencia de prueba cuenta en el día 5, no en el 6. | | | CP-41_serie_dia_lima.png |
| CP-42 | RF-05 | API | Incidencias en octubre de 2026. | 1. `GET /api/dashboard/incidencias-por-tiempo?periodo=PERSONALIZADO&desde=2026-10-01&hasta=2026-10-31&agrupacion=SEMANA` ("Dashboard Por Tiempo Personalizado"). | `desde` = 2026-10-01 (jueves), `hasta` = 2026-10-31 (sábado). | Tramos 01–04, 05–11, 12–18, 19–25 y 26–31 de octubre (semanas de lunes a domingo, primera y última recortadas); la suma de `total` es igual al historial del mismo rango. | | | CP-42_serie_semana.png |
| CP-43 | RF-05 | API | Incidencias en varios meses de 2026. | 1. `GET /api/dashboard/incidencias-por-tiempo?periodo=ANIO_ACTUAL&agrupacion=MES`. | — | Un tramo por mes calendario de enero al mes actual, el último recortado a hoy; meses sin incidencias con 0. | | | CP-43_serie_mes.png |
| CP-44 | RF-05 | API | Token de Supervisor. | 1. `incidencias-por-tiempo` con `PERSONALIZADO` de 31 días sin `agrupacion`. 2. De 32 días. 3. De 181 días. 4. `agrupacion=HORA`. | Rangos de 31, 32 y 181 días. | 1: `DIA`. 2: `SEMANA`. 3: `MES`. 4: 400 con `agrupacion` en `detalles`. | | | CP-44_agrupacion_automatica.png |
| CP-45 | RF-05, RF-07 | E2E | **Planificado (dashboard con Chart.js pendiente).** Sesión de Supervisor en escritorio. | 1. Abrir `/dashboard`. 2. Cambiar el periodo. 3. Registrar una incidencia desde otra sesión y esperar el refresco. 4. Detener el backend. | — | Tarjetas KPI (incidencias de hoy y vigilantes desplegados), barras por zona y anillo por tipo con los mismos datos de la API; la incidencia nueva aparece tras el refresco; con el backend detenido cada gráfico muestra su estado de error. | | | CP-45_dashboard_graficos.png |

### 5.7 RF-06 Exportación de reportes (contra Supabase)

| ID | RF | Tipo | Precondición | Pasos | Datos de prueba | Resultado esperado | Resultado obtenido | Estado | Evidencia |
|---|---|---|---|---|---|---|---|---|---|
| CP-46 | RF-06 | API | Token de Supervisor; incidencias en el periodo. | 1. "Send and Download" de "Reportes Excel". 2. Abrir el archivo en Excel. 3. Comparar con `GET /api/incidencias` con los mismos filtros. | `periodo` = ULTIMOS_30_DIAS, `idZona` = 1. | 200, `Content-Disposition: attachment; filename="incidencias_<hoy Lima>.xlsx"`. Hoja "Incidencias" con encabezados en negrita, fijos y con autofiltro; la fecha es celda de fecha (`dd/MM/yyyy HH:mm`); mismas filas y orden que el historial. | | | CP-46_reporte_excel.png |
| CP-47 | RF-06 | API | Igual que CP-46, con más de una página de datos. | 1. "Send and Download" de "Reportes PDF Personalizado". 2. Abrir el PDF. | `desde`/`hasta` de un mes. | A4 horizontal con "Reporte de incidencias", periodo con sus fechas, fecha de generación, total de incidencias y encabezados repetidos en cada página; mismas filas que el historial. | | | CP-47_reporte_pdf.png |
| CP-48 | RF-06 | API | — | 1. `GET /api/reportes/excel?periodo=HOY&idZona=999`. 2. `GET /api/reportes/pdf?periodo=HOY&idZona=999`. | `idZona` inexistente. | Archivos válidos con solo encabezados; el PDF con título, periodo y "Total de incidencias: 0". | | | CP-48_reporte_sin_resultados.png |
| CP-49 | RF-06 | SEG | Tokens de Supervisor y de Vigilante. | 1. Contar filas `EXPORTAR_REPORTE`. 2. Descargar un PDF. 3. `GET /api/reportes/pdf?periodo=PERSONALIZADO&desde=2026-10-10&hasta=2026-10-01`. 4. Con token de Vigilante. 5. Contar de nuevo. | — | 2: una fila `EXPORTAR_REPORTE` con `{formato, periodo, desde, hasta, idZona, idNivelGravedad, idTipoEvento, totalRegistros}`. 3: 400 en JSON. 4: 403. 5: solo aumentó en 1 (los rechazos no se auditan). | | | CP-49_reporte_auditoria_y_roles.png |
| CP-50 | RF-06 | REN | Red "Fast 4G"; reporte de los últimos 30 días. | 1. Descargar 5 veces el Excel y 5 el PDF. 2. Medir el tiempo total de cada petición. | — | El mayor tiempo de cada formato es menor a 3 s. | | | CP-50_rendimiento_reportes.png |
| CP-51 | RF-06 | E2E | **Planificado (pantalla `/historial` pendiente).** Sesión de Supervisor; `CORS_ORIGENES` con el origen del frontend. | 1. Aplicar filtros en `/historial`. 2. "Exportar Excel". 3. "Exportar PDF". | — | Se descargan los archivos con el nombre `incidencias_AAAA-MM-DD` y con los filtros vigentes (mismas filas que la tabla). | | | CP-51_exportar_desde_historial.png |

### 5.8 RF-07 Control de despliegue

| ID | RF | Tipo | Precondición | Pasos | Datos de prueba | Resultado esperado | Resultado obtenido | Estado | Evidencia |
|---|---|---|---|---|---|---|---|---|---|
| CP-52 | RF-07 | API | Token de Supervisor; una zona activa sin vigilantes. | 1. `GET /api/dashboard/despliegue`. 2. Comparar con `SELECT * FROM v_despliegue_por_zona;`. | — | `[{idZona, nombreZona, vigilantesActivos}]` ordenado por nombre, solo zonas activas, la zona sin vigilantes con 0; igual a la vista. | | | CP-52_despliegue.png |
| CP-53 | RF-07 | API | Vigilante activo en la zona 1. | 1. Desactivarlo y consultar el despliegue. 2. Activarlo, reasignarlo a la zona 2 y consultar. 3. Desactivar la zona 2 y consultar. | — | 1: zona 1 baja en 1. 2: zona 1 baja y zona 2 sube en 1. 3: la zona 2 ya no aparece. | | | CP-53_despliegue_cambios.png |

### 5.9 RF-08 Auditoría

| ID | RF | Tipo | Precondición | Pasos | Datos de prueba | Resultado esperado | Resultado obtenido | Estado | Evidencia |
|---|---|---|---|---|---|---|---|---|---|
| CP-54 | RF-08 | API | Casos CP-02 a CP-53 y CP-64 a CP-68 ejecutados. | 1. `GET /api/auditoria/acciones`. 2. Para cada acción, `GET /api/auditoria?accion=<valor>&periodo=HOY`. | Las 16 acciones. | 1: 16 pares `{valor, etiqueta}` en el orden del enum. 2: cada acción tiene al menos un registro de la ejecución; ninguno contiene contraseñas ni hashes. | | | CP-54_todas_las_acciones.png |
| CP-55 | RF-08 | API | Token de Administrador; registros de CP-03 y CP-04. | 1. `GET /api/auditoria?periodo=HOY&accion=LOGIN_FALLIDO` ("Auditoria Filtrar"). 2. `?q=9999`. 3. `?idUsuario=<id del Administrador>`. | `accionAuditoria` = LOGIN_FALLIDO, `qAuditoria` = 9999. | 1: solo `LOGIN_FALLIDO`, de lo más reciente a lo más antiguo; `fechaHora` con `-05:00`; `detalle` como objeto JSON (p. ej. `{"motivo": "DNI_NO_REGISTRADO"}`). 2: el intento de CP-04 con `usuario: null` y `dniIntentado`. 3: solo acciones de ese usuario. Sin contraseña, hash, rol ni estado. | | | CP-55_consulta_auditoria.png |
| CP-56 | RF-08 | API | Token de Administrador. | 1. `SELECT count(*) FROM auditoria;`. 2. Ejecutar 5 veces "Auditoria Listar" y una "Auditoria Acciones". 3. Repetir el conteo. | — | El conteo no cambia: consultar no genera registros. | | | CP-56_consulta_no_inserta.png |
| CP-57 | RF-08 | API | Token de Administrador. | 1. `?accion=BORRAR`. 2. `?q=12ab`. 3. `?q=123456789`. 4. `?size=0` y `?size=101`. 5. `?idUsuario=0`. 6. `?page=-1`. | — | 400 en todos con el campo en `detalles` (p. ej. `accion: valor no válido 'BORRAR'`, `size: debe estar entre 1 y 100`). | | | CP-57_auditoria_parametros_invalidos.png |
| CP-58 | RF-08 | SEG | Tokens de Supervisor, de Vigilante y con cambio pendiente. | 1. `GET /api/auditoria` y `GET /api/auditoria/acciones` con cada token. | — | 403 en todos. | | | CP-58_auditoria_403.png |
| CP-59 | RF-08 | SEG | SQL Editor de Supabase (rol `postgres`). | 1. `UPDATE auditoria SET accion_realizada = 'X' WHERE id_auditoria = <id existente>;` | — | `ERROR: La tabla auditoria es inmutable: operacion UPDATE no permitida` (trigger `trg_auditoria_no_modificar`); la fila no cambia. | | | CP-59_update_auditoria_trigger.png |
| CP-60 | RF-08 | SEG | SQL Editor de Supabase. | 1. `DELETE FROM auditoria WHERE id_auditoria = <id existente>;` 2. `TRUNCATE auditoria;` | — | Mismo error con `DELETE` (trigger `trg_auditoria_no_modificar`) y con `TRUNCATE` (`trg_auditoria_no_truncar`); el conteo de filas no cambia. | | | CP-60_delete_truncate_auditoria.png |
| CP-61 | RF-08 | SEG | Cliente SQL conectado como `app_sgi` (credenciales del environment local, no se muestran). | 1. `UPDATE auditoria SET accion_realizada = 'X' WHERE id_auditoria = <id>;` 2. `DELETE FROM auditoria WHERE id_auditoria = <id>;` 3. `SELECT count(*) FROM auditoria;` | — | 1 y 2: `permission denied for table auditoria` (`app_sgi` solo tiene SELECT e INSERT). 3: devuelve el conteo. | | | CP-61_app_sgi_sin_update.png |
| CP-62 | RNF-01 | SEG | Clave pública `anon` del proyecto Supabase (no se muestra en la captura). | 1. `GET https://<proyecto>.supabase.co/rest/v1/auditoria?select=*` con la clave anon. 2. Igual sobre `usuario`. | — | No devuelve filas (lista vacía o error de permisos): RLS activo sin políticas para `anon`. | | | CP-62_rls_api_publica.png |
| CP-63 | RF-08 | E2E | **Planificado (pestaña de auditoría en `/historial` pendiente).** Sesiones de Administrador y Supervisor. | 1. Como Administrador abrir la pestaña de auditoría. 2. Filtrar por acción, DNI y fechas. 3. Como Supervisor abrir `/historial`. | — | El filtro de acción se llena con `GET /api/auditoria/acciones`; la tabla muestra lo mismo que la API; el Supervisor no ve la pestaña. | | | CP-63_pestana_auditoria.png |

### 5.10 RF-09 Zonas y catálogos

| ID | RF | Tipo | Precondición | Pasos | Datos de prueba | Resultado esperado | Resultado obtenido | Estado | Evidencia |
|---|---|---|---|---|---|---|---|---|---|
| CP-64 | RF-09 | API | Token de Administrador. | 1. `POST /api/zonas` ("Zonas Crear"). 2. Repetir con `nombreZona` en mayúsculas. 3. Sin `distrito`. | `{nombreZona: "Sede Surco", departamento: "Lima", provincia: "Lima", distrito: "Santiago de Surco"}`. | 1: 201 y `CREAR_ZONA`. 2: 409 (nombre duplicado sin distinguir mayúsculas). 3: 400 `distrito: es obligatorio`. | | | CP-64_crear_zona.png |
| CP-65 | RF-09 | API | Zonas en distintos distritos. | 1. `GET /api/zonas?distrito=miraflores&activo=true`. 2. `?nombre=sede`. 3. `?q=%`. 4. Sin filtros. | — | 1: solo activas de Miraflores. 2: nombres que contienen "sede". 3: solo referencias o descripciones con `%` literal. 4: todas, por nombre. Formato de página de RF-09. | | | CP-65_buscar_zonas.png |
| CP-66 | RF-09 | API | Zona con incidencias registradas. | 1. `PATCH /api/zonas/{id}/estado` `{activo: false}`. 2. `GET /api/catalogos/zonas`. 3. `GET /api/zonas?activo=false`. 4. Historial filtrado por esa zona. | — | 1: 200 y `CAMBIAR_ESTADO_ZONA`. 2: la zona no aparece. 3: aparece. 4: sus incidencias siguen en el historial. | | | CP-66_desactivar_zona.png |
| CP-67 | RF-09 | API | Token de Administrador. | 1. `POST /api/tipos-evento` ("Tipos Evento Crear"). 2. `PUT` del tipo "Otro" con otro nombre. 3. `PATCH .../estado` `{activo: false}` del tipo creado. 4. `GET /api/catalogos/tipos-evento`. | `{nombreTipoEvento: "Incendio"}`. | 1: 201. 2: 400 (el tipo "Otro" no se puede renombrar). 3: 200. 4: el tipo desactivado no aparece. | | | CP-67_tipos_evento.png |
| CP-68 | RF-09 | API | Niveles de la semilla (Baja 1, Media 2). | 1. `PUT /api/niveles-gravedad/1` ("Niveles Gravedad Editar"). 2. `GET /api/niveles-gravedad`. 3. Revisar `MODIFICAR_NIVEL_GRAVEDAD`. | `{nombreNivel: "Baja", orden: 2}`. | "Baja" queda en orden 2 y "Media" en 1; la auditoría registra `intercambiadoCon`. | | | CP-68_niveles_intercambio.png |
| CP-69 | RF-09 | E2E | **Planificado (pantalla de catálogos pendiente).** Sesión de Administrador. | 1. Crear, editar y desactivar una zona desde la pantalla. 2. Lo mismo con un tipo de evento. 3. Cambiar el orden de un nivel. | — | Cada acción se refleja en la lista y en los formularios de registro (solo activos); el nombre duplicado muestra el mensaje de la API. | | | CP-69_pantalla_catalogos.png |

### 5.11 Validaciones de formularios (frontend)

Todas quedan **planificadas** hasta que exista `frontend/src/lib/validaciones.ts`; aplican a los formularios
indicados en cada caso. El aviso aparece debajo del campo y el formulario no se envía mientras haya errores. Los
mensajes son los de los DTO del backend.

| ID | RF | Tipo | Precondición | Pasos | Datos de prueba | Resultado esperado | Resultado obtenido | Estado | Evidencia |
|---|---|---|---|---|---|---|---|---|---|
| CP-70 | RF-01, RF-02 | VAL | **Planificado.** Login y formulario de personal. | 1. Escribir letras en el DNI. 2. Enviar. | `1234567a` | El campo no conserva letras o muestra "debe tener 8 dígitos"; no se envía. | | | CP-70_dni_con_letras.png |
| CP-71 | RF-01, RF-02 | VAL | **Planificado.** Login y formulario de personal. | 1. Pegar un texto con letras en el DNI. | `12a34b5678` pegado | Quedan solo dígitos (como máximo 8) o se muestra "debe tener 8 dígitos"; no se envía un DNI con letras. | | | CP-71_dni_pegado_con_letras.png |
| CP-72 | RF-01, RF-02 | VAL | **Planificado.** Login y formulario de personal. | 1. Escribir 7 dígitos. 2. Enviar. | `1000000` | "debe tener 8 dígitos" debajo del campo; no se envía. | | | CP-72_dni_7_digitos.png |
| CP-73 | RF-01, RF-02 | VAL | **Planificado.** Login y formulario de personal. | 1. Escribir o pegar 9 dígitos. | `100000001` | El campo admite como máximo 8 dígitos o muestra "debe tener 8 dígitos"; no se envían 9. | | | CP-73_dni_9_digitos.png |
| CP-74 | RF-02 | VAL | **Planificado.** Formulario de personal. | 1. Escribir números en nombres y apellidos. 2. Enviar. | `Luis2`, `Rojas3` | Aviso debajo de cada campo; no se envía. (Ver riesgo R-10: el backend hoy no rechaza números en nombres.) | | | CP-74_nombres_con_numeros.png |
| CP-75 | RF-01, RF-02 | VAL | **Planificado.** Cambio de contraseña y formulario de personal. | 1. Contraseña de 7 caracteres. 2. De 73. 3. De 8 y de 72. | Cadenas de 7, 8, 72 y 73 caracteres | 1 y 2: "debe tener entre 8 y 72 caracteres". 3: sin aviso. (Ver riesgo R-03: hoy el cambio de contraseña limita a 16.) | | | CP-75_contrasena_longitud.png |
| CP-76 | RF-01, RF-02 | VAL | **Planificado.** Cambio de contraseña y restablecimiento. | 1. Escribir una confirmación distinta de la nueva. 2. Enviar. | Nueva y confirmación distintas | Aviso debajo de la confirmación; no se envía. | | | CP-76_confirmacion_distinta.png |
| CP-77 | RF-01, RF-02, RF-03, RF-09 | VAL | **Planificado.** Login, registro de incidencias, personal y zonas. | 1. Enviar cada formulario con los campos obligatorios vacíos. | Campos vacíos | "es obligatorio" / "es obligatoria" debajo de cada campo vacío; no se envía ninguna petición (verificar en Network). | | | CP-77_obligatorios_vacios.png |
| CP-78 | RF-03 | VAL | **Planificado.** Registro de incidencias. | 1. Elegir "Otro". 2. Escribir 19 caracteres. 3. Escribir 20. | Texto de 19 y 20 caracteres | 2: aviso de mínimo 20 caracteres y no se envía. 3: sin aviso; se puede registrar. | | | CP-78_descripcion_otro_corta.png |
| CP-79 | RF-03 | VAL | **Planificado.** Registro de incidencias. | 1. Elegir una fecha y hora 10 minutos en el futuro. 2. Enviar. | Ahora + 10 min | Aviso de fecha futura debajo del campo; no se envía. | | | CP-79_fecha_futura.png |

### 5.12 Requerimientos no funcionales

| ID | RF | Tipo | Precondición | Pasos | Datos de prueba | Resultado esperado | Resultado obtenido | Estado | Evidencia |
|---|---|---|---|---|---|---|---|---|---|
| CP-80 | RNF-01 | SEG | Tokens de Administrador. | 1. Guardar las respuestas de login, `GET /api/auth/yo`, `GET /api/usuarios`, `GET /api/usuarios/{id}`, historial y auditoría. 2. Buscar `contrasena` y `$2a$`/`$2b$` en ellas. | — | Ninguna respuesta contiene el campo `contrasena` ni un hash BCrypt. | | | CP-80_contrasena_no_expuesta.png |
| CP-81 | RNF-01 | SEG | Backend con `CORS_ORIGENES` por defecto (`http://localhost:3000`). | 1. `OPTIONS /api/auth/login` con `Origin: http://localhost:3000`. 2. Con `Origin: http://sitio-no-permitido.test`. | — | 1: responde con `Access-Control-Allow-Origin: http://localhost:3000`. 2: sin esa cabecera (el navegador bloquea la petición). | | | CP-81_cors.png |
| CP-82 | RNF-03 | USA | **Planificado (dashboard, historial y personal pendientes).** Ventanas de 1366 × 768 y 768 × 1024. | 1. Recorrer `/dashboard`, `/historial` y `/personal` en ambas. | — | En escritorio se ven completas; en tablet son utilizables sin desplazamiento horizontal de la página (las tablas pueden desplazarse dentro de su contenedor). | | | CP-82_usabilidad_escritorio_tablet.png |
| CP-83 | RNF-05 | REV | `docs/modelo_datos.sql` versión 1.2. | 1. Revisar dependencias funcionales de cada tabla. 2. Verificar índices `idx_incidencia_fecha`, `idx_incidencia_zona` e `idx_zona_ubicacion` en Supabase (`\di` o `pg_indexes`). | — | Tablas en 3FN (catálogos separados, sin atributos repetidos ni dependencias transitivas); los tres índices existen. | | | CP-83_normalizacion_indices.png |

## 6. Pruebas existentes y cómo ejecutarlas

### 6.1 Backend (`backend/src/test/java/com/segandina/sgi`, 210 tests)

| Tipo | Archivos | Qué prueban |
|---|---|---|
| Unitaria (JUnit 5 + Mockito, sin BD) | `service/impl/AuthServiceImplTest` (6), `CatalogoServiceImplTest` (4), `DashboardServiceImplTest` (9), `IncidenciaServiceImplTest` (17), `ReporteServiceImplTest` (6), `TipoEventoServiceImplTest` (7), `UsuarioServiceImplTest` (21), `JwtTokenServiceImplTest` (4); `config/AdminSeedRunnerTest` (3) | Reglas de negocio de cada servicio, auditoría en cada acción, emisión del JWT y claim `cambioPendiente`, seed del Administrador. |
| Unitaria (sin BD ni mocks) | `dto/request/RangoFechasTest` (13), `export/ExcelExportadorTest` (3), `export/PdfExportadorTest` (3), `model/MapeoEntidadesTest` (8) | Cálculo de periodos en hora de Lima y validaciones del rango; contenido de los archivos Excel y PDF (con `FilasPrueba` como datos); mapeo de entidades (`CHAR(8)`, valores por defecto). |
| Integración de controllers (`@WebMvcTest` + MockMvc, seguridad real) | `controller/AuthControllerTest` (8), `UsuarioControllerTest` (16), `DashboardControllerTest` (10), `ReporteControllerTest` (6), `ZonaControllerTest` (4), `AuditoriaControllerTest` (12); `config/CorsConfigTest` (3) | Rutas, códigos 200/201/204/400/401/403/404/409, formato de error, reglas por rol y contraseña pendiente, cabeceras de descarga, CORS. |
| Integración con base de datos (`@DataJpaTest` contra H2 en modo PostgreSQL) | `dao/IncidenciaDaoTest` (6), `dao/AuditoriaDaoTest` (2), `service/impl/AuditoriaServiceImplTest` (12), `service/impl/ZonaServiceImplTest` (22), `service/impl/NivelGravedadServiceImplTest` (5); `dao/TablaAuditoriaH2` (ayuda que recrea `auditoria` con `JSON`) | Consultas del historial, dashboard y auditoría, búsqueda de zonas, intercambio de orden de niveles. No sustituyen a los casos contra Supabase (sección 5.5 a 5.9). |

Comandos (desde `backend/`; en Windows `.\mvnw.cmd` con `JAVA_HOME` en el JDK 21):

| Qué | Comando |
|---|---|
| Compilar y correr todo | `./mvnw -q verify` |
| Solo los tests | `./mvnw test` |
| Una clase | `./mvnw test -Dtest=AuditoriaControllerTest` |
| Un método | `./mvnw test -Dtest=RangoFechasTest#<nombreDelMetodo>` |

### 6.2 API contra Supabase

| Herramienta | Dónde | Cómo |
|---|---|---|
| Postman (Runner) | `postman/collections/SGI-SEGANDINA` (38 peticiones con script de código de estado) | Backend en perfil `local`, environment local completo (sección 2.2), "Run collection" empezando por "Login". |
| SQL Editor de Supabase | Proyecto de Supabase | Consultas de verificación de cada caso (`auditoria`, `incidencia`, `v_despliegue_por_zona`) y CP-59 a CP-61. |

### 6.3 Frontend

| Tipo | Herramienta | Comando |
|---|---|---|
| Análisis estático y compilación | ESLint y build de Next.js | `cd frontend && npm run lint && npm run build` |
| Extremo a extremo y validaciones | Playwright | Por configurar en `frontend/`; mientras tanto los casos E2E y VAL se ejecutan de forma manual con capturas. |

## 7. Matriz de trazabilidad

| Requerimiento | Casos |
|---|---|
| RF-01 | CP-01, CP-02 a CP-15, CP-70 a CP-73, CP-75 a CP-77 |
| RF-02 | CP-01, CP-16 a CP-25, CP-70 a CP-77 |
| RF-03 | CP-01, CP-26 a CP-33, CP-77 a CP-79 |
| RF-04 | CP-01, CP-34 a CP-38 |
| RF-05 | CP-01, CP-39 a CP-45 |
| RF-06 | CP-01, CP-46 a CP-51 |
| RF-07 | CP-01, CP-45, CP-52, CP-53 |
| RF-08 | CP-01, CP-54 a CP-61, CP-63 (y la verificación de auditoría de CP-02 a CP-05, CP-11, CP-12, CP-16, CP-20 a CP-22, CP-26, CP-49, CP-64, CP-66, CP-68) |
| RF-09 | CP-01, CP-64 a CP-69, CP-77 |
| RNF-01 | CP-07 a CP-12, CP-59 a CP-62, CP-80, CP-81 |
| RNF-02 | Fuera de alcance (sección 1.3) |
| RNF-03 | CP-31, CP-33, CP-82 |
| RNF-04 | CP-32, CP-50 |
| RNF-05 | CP-83 |

## 8. Registro de defectos

Los defectos se registran en esta tabla (o en un issue del repositorio con los mismos campos) y se enlazan desde el
caso fallido.

| ID | Caso | Severidad | Descripción | Pasos para reproducir | Resultado esperado | Resultado obtenido | Evidencia | Estado | Corrección |
|---|---|---|---|---|---|---|---|---|---|
| DEF-01 | CP-xx | Crítica / Alta / Media / Baja | | | | | `CP-xx_defecto.png` | Abierto / Corregido / Verificado / Cerrado | Commit o rama |

Severidad: **Crítica** (pérdida o exposición de datos, el sistema no se puede usar), **Alta** (un RF no se cumple y no
hay alternativa), **Media** (el RF se cumple con una alternativa o un error de presentación relevante), **Baja**
(detalles visuales o de texto).

## 9. Riesgos conocidos

| ID | Riesgo | Origen | Impacto | Mitigación |
|---|---|---|---|---|
| R-01 | Las consultas del historial, del dashboard, de los reportes y de la auditoría solo se probaron en H2. La serie por día usa `AT TIME ZONE` y `to_char`, cuya semántica en H2 no es idéntica, y en H2 `detalle_cambio` es `JSON` en lugar de `JSONB`. | CHANGELOG Fases 5, 6 y 8 | Conteos por día desplazados o errores en Supabase. | CP-34 a CP-37, CP-39 a CP-44, CP-46 a CP-49 y CP-55 a CP-57 se ejecutan contra Supabase con datos de borde de día. |
| R-02 | Un token emitido antes de desactivar a un usuario, cambiarle el rol o restablecerle la contraseña sigue siendo válido hasta que vence (8 h); las reglas por rol usan el claim. | CHANGELOG Fases 2 y 4 | Acceso con permisos anteriores durante un turno. | Documentado; los servicios rechazan al actor inactivo y `/api/auth/yo` consulta la BD. Se verifica en CP-21. |
| R-03 | El cambio de contraseña del frontend limita la nueva a 16 caracteres; la API acepta de 8 a 72. | CHANGELOG Fase 8 (cambio obligatorio) | Desalineación con el DTO. | Alinear en `validaciones.ts` (CP-75). |
| R-04 | La regla de descripción mínima de "Otro" depende del nombre del tipo de evento. | CHANGELOG Fase 3 | Si se renombra en la BD deja de aplicarse. | La API impide renombrar "Otro" (CP-67). |
| R-05 | Para leer el nombre del archivo desde el navegador hace falta exponer `Content-Disposition` en CORS (`exposedHeaders`). | CHANGELOG Fase 6 | El botón de exportar no obtiene el nombre del archivo. | Revisar al construir el historial (CP-51). |
| R-06 | Desactivar una zona no reasigna a sus vigilantes: siguen asignados y dejan de contarse en el despliegue. | CHANGELOG Fase 4 | Vigilantes "invisibles" en RF-07. | Reasignarlos desde personal; se observa en CP-53. |
| R-07 | El rango personalizado acepta fechas futuras (devuelven 0 incidencias). | CHANGELOG Fase 5 | Resultados vacíos sin aviso. | Comportamiento aceptado; considerar aviso en el frontend. |
| R-08 | El formulario de incidencias necesita conexión; no guarda registros sin red. | CHANGELOG Fase 7 | Pérdida del reporte en zonas sin cobertura. | Fuera de alcance (sección 1.3). |
| R-09 | El frontend no tiene pruebas automatizadas; Playwright está por configurar. | CHANGELOG Fase 8 | Regresiones en pantallas sin detectar. | Casos E2E y VAL manuales con capturas hasta configurar Playwright. |
| R-10 | El DTO de usuario solo limita la longitud de nombres y apellidos; no rechaza números. | `UsuarioCrearRequest`, `UsuarioActualizarRequest` | La validación del frontend (CP-74) no tendría equivalente en el backend. | Agregar la misma regla en ambos lados al crear `validaciones.ts`. |
| R-11 | Faltan en el environment de Postman las variables `accionAuditoria`, `qAuditoria`, `dniNuevo`, `contrasenaInicial` y `contrasenaActual`. | CHANGELOG Fase 8 y sección 2.2 | El Runner falla en esas peticiones. | Agregarlas antes de la primera corrida. |
| R-12 | Varias pantallas aún no existen (historial, dashboard con gráficos, personal, catálogos, auditoría). | Estado de la Fase 8 | Casos planificados sin ejecutar al acercarse el cierre. | Cronograma de la sección 10; se ejecutan conforme se terminan. |

## 10. Cronograma

| Fechas (2026) | Actividad | Casos |
|---|---|---|
| 13 – 16 nov | Preparar datos de prueba en Supabase y el environment de Postman; ejecutar la suite automatizada. | CP-01 |
| 16 – 20 nov | Ejecutar los casos de API y seguridad contra Supabase (prioridad: lo probado solo en H2). | CP-02 a CP-24, CP-26 a CP-30, CP-34 a CP-37, CP-39 a CP-44, CP-46 a CP-50, CP-52 a CP-62, CP-64 a CP-68, CP-80, CP-81, CP-83 |
| 23 nov | **Aprobación del plan de pruebas integrales.** | — |
| 18 – 24 nov | Ejecutar los E2E, rendimiento y usabilidad de las pantallas existentes (login, cambio obligatorio, registro móvil). | CP-13 a CP-15, CP-31 a CP-33 |
| 23 – 29 nov | Validaciones de formularios en cuanto exista `validaciones.ts`; configurar Playwright. | CP-70 a CP-79 |
| 25 nov – 3 dic | E2E de las pantallas nuevas conforme se terminan (dashboard, historial con exportación y auditoría, personal, catálogos). | CP-25, CP-38, CP-45, CP-51, CP-63, CP-69, CP-82 |
| 1 – 5 dic | Corregir defectos y repetir los casos fallidos; generar evidencias (`index.html`, `reporte_pruebas.pdf`). | Casos fallidos |
| 6 – 8 dic | Pruebas de humo en el entorno desplegado (Fase 9) y cierre. **Puesta en producción: 8 dic** (límite máximo del Charter: 15 dic). | CP-02, CP-26, CP-32, CP-46, CP-50 |
