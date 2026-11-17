# Requerimientos

Fuente: SRS del Proyecto Integrador (RF-01 a RF-07, RNF-01 a RNF-05) más RF-08 definido en el diseño de BD y RF-09 (gestión de zonas) agregado en el diseño del sistema. Los campos de "Entradas", "Reglas" y "Criterios de aceptación" desarrollan lo que el SRS enuncia en una línea; lo marcado como (propuesto) es una decisión por confirmar.

## Roles y permisos

| Acción | Administrador | Supervisor | Vigilante |
|---|---|---|---|
| Iniciar sesión | Sí | Sí | Sí |
| Gestionar usuarios (RF-02) | Sí | No | No |
| Reasignar la zona de un Vigilante activo (RF-02, RF-07) | Sí | Sí | No |
| Registrar incidencia (RF-03) | Sí | No (propuesto) | Sí |
| Ver historial y filtrar (RF-04) | Sí | Sí | No (propuesto) |
| Ver dashboard y despliegue (RF-05, RF-07) | Sí | Sí | No |
| Exportar reportes (RF-06) | Sí | Sí | No |
| Consultar auditoría (RF-08) | Sí | No | No |
| Gestionar zonas, tipos de evento y niveles de gravedad (RF-09) | Sí | No | No |
| Cambiar su propia contraseña | Sí | Sí | Sí |

El Supervisor tiene, según las decisiones técnicas, "visualización de dashboard y reportes", y además puede mover
vigilantes entre zonas desde la pantalla de despliegue de una zona (RF-07); no puede crear, editar ni desactivar
usuarios. El Vigilante usa el formulario móvil.

---

## RF-01 Autenticación y accesos (Prioridad: Alta)

- **Descripción:** inicio de sesión con DNI y contraseña y validación de rol (Administrador, Supervisor, Vigilante).
- **Entradas:** `dni` (8 dígitos), `contrasena`.
- **Reglas:**
  - El usuario debe existir y tener `estado_activo = true`.
  - La contraseña se compara contra el hash BCrypt.
  - Si es correcto, el backend devuelve un JWT (con `id_usuario` y `rol`) y los datos básicos del usuario (sin contraseña),
    incluido `debeCambiarContrasena`.
  - **Contraseña temporal:** si el usuario tiene `debe_cambiar_contrasena = true` (ver RF-02), el login responde 200
    con `usuario.debeCambiarContrasena: true` y un token con el claim `cambioPendiente: true`. Ese token solo sirve
    para `PATCH /api/usuarios/me/contrasena` y `GET /api/auth/yo`; cualquier otra ruta responde 403 con el mensaje
    "Debe cambiar su contraseña antes de continuar". Después del cambio hay que iniciar sesión de nuevo para obtener
    un token normal.
  - Cada intento se registra en `auditoria`: `LOGIN_OK` (con `detalle_cambio = {"cambioPendiente": true}` si la
    contraseña es temporal), o `LOGIN_FALLIDO` con `dni_intentado` (y `id_usuario` nulo si el DNI no existe).
  - Mensaje de error genérico: "DNI o contraseña incorrectos".
- **Criterios de aceptación:**
  - DNI con formato inválido se rechaza antes de consultar la BD.
  - Usuario inactivo no puede entrar.
  - Un endpoint protegido sin token responde 401; con rol insuficiente responde 403.
  - Tras el login, el Vigilante va al formulario de incidencias y Administrador/Supervisor al dashboard.
  - Con contraseña temporal, el usuario no puede usar ninguna otra función hasta cambiarla.

## RF-02 Gestión de usuarios (Prioridad: Media)

- **Descripción:** módulo CRUD de trabajadores con rol y zona de patrullaje. Solo Administrador, salvo la
  reasignación de zona de un Vigilante, que también puede hacer el Supervisor (ver "Reasignación de zona" más abajo).
- **Entradas (alta):** `dni`, `nombres`, `apellido_paterno`, `apellido_materno` (opcional), `contrasena` inicial, `id_rol`, `id_zona` (opcional).
- **Reglas:**
  - `dni` único y de 8 dígitos numéricos.
  - La contraseña (8 a 72 caracteres) se guarda siempre como BCrypt; nunca se devuelve.
  - Toda contraseña que asigna el Administrador es **temporal**: al crear el usuario, al editarlo enviando
    `contrasena` y al restablecerla, queda `debe_cambiar_contrasena = true` y el usuario debe cambiarla en su
    siguiente inicio de sesión (ver RF-01). La marca vuelve a `false` cuando el usuario la cambia con
    `PATCH /api/usuarios/me/contrasena`. El Administrador inicial creado por el seed no tiene la marca.
  - Administrador y Supervisor pueden no tener zona; para Vigilante la zona es obligatoria. Una zona nueva o
    distinta de la actual debe estar activa; la zona actual se conserva aunque se haya desactivado después.
  - No existe borrado físico: "eliminar" es desactivar (`estado_activo = false`) para conservar el historial.
  - Reasignar zona = editar `id_zona`: el Administrador lo hace con `PUT /api/usuarios/{id}` (cualquier rol) o, como el
    Supervisor, con `PATCH /api/usuarios/{id}/zona` (solo Vigilantes activos).
  - El Administrador no puede desactivarse a sí mismo ni quitarse el rol Administrador (evita quedarse sin acceso).
  - Se audita: `CREAR_USUARIO`, `MODIFICAR_USUARIO`, `CAMBIAR_ESTADO_USUARIO`, con valores antes y después en
    `detalle_cambio` (sin la contraseña; si se asignó una, solo `"contrasenaCambiada": true` y
    `"debeCambiarContrasena": true`; el alta siempre lleva `"debeCambiarContrasena": true`). Una edición sin cambios o
    un cambio al mismo estado no se audita.
- **Contrato** (Administrador; sin `DELETE`):

  | Método y ruta | Cuerpo | Respuestas |
  |---|---|---|
  | `GET /api/usuarios?idRol=&idZona=&activo=&q=&page=&size=` | — | 200 página `{ contenido, pagina, tamano, totalElementos, totalPaginas }`; `q` busca en DNI, nombres y apellidos; orden por apellidos y nombres; `size` de 1 a 100 (por defecto 20) |
  | `GET /api/usuarios/{id}` | — | 200; 404 |
  | `POST /api/usuarios` | `{ dni, nombres, apellidoPaterno, apellidoMaterno?, contrasena, idRol, idZona? }` | 201; 400 datos inválidos, rol inexistente o zona inválida; 409 DNI duplicado |
  | `PUT /api/usuarios/{id}` | igual al alta, con `contrasena` opcional (`null` la conserva) | 200; 400; 404; 409 |
  | `PATCH /api/usuarios/{id}/estado` | `{ activo }` | 200; 400 si el Administrador se desactiva a sí mismo; 404 |
  | `PATCH /api/usuarios/{id}/contrasena` | `{ contrasenaNueva }` | 204; 400 contraseña inválida o `id` propio; 404 |
  | `GET /api/catalogos/roles` | — | 200 `[{ idRol, nombreRol }]` (cualquier usuario autenticado) |

  Cada usuario se devuelve como `{ idUsuario, dni, nombres, apellidoPaterno, apellidoMaterno, idRol, rol, idZona,
  nombreZona, estadoActivo }`. Sin token → 401; Supervisor o Vigilante → 403.
- **Cambio de contraseña propia:** `PATCH /api/usuarios/me/contrasena` con `{ contrasenaActual, contrasenaNueva }`,
  para cualquier usuario autenticado. La actual debe coincidir y la nueva debe tener de 8 a 72 caracteres y ser
  distinta de la actual (si no → 400). Responde 204, quita la marca de contraseña temporal y audita
  `CAMBIAR_CONTRASENA` con `{idUsuario, origen: "propio", cambioObligatorio}` (`true` si la anterior era temporal).
- **Restablecimiento de contraseña por el Administrador:** `PATCH /api/usuarios/{id}/contrasena` con
  `{ contrasenaNueva }`, solo Administrador (Supervisor o Vigilante → 403; sin token → 401). Sirve cuando un
  usuario olvidó su contraseña: no se pide la actual.
  - La nueva debe tener de 8 a 72 caracteres (si no → 400) y se guarda como BCrypt.
  - El Administrador no puede restablecer la suya por esta ruta (→ 400); debe usar `PATCH /api/usuarios/me/contrasena`.
  - Usuario inexistente → 404. Se puede restablecer a un usuario inactivo; su estado no cambia.
  - La contraseña restablecida es temporal: el usuario queda con `debe_cambiar_contrasena = true`.
  - Responde 204 y audita `RESTABLECER_CONTRASENA` con
    `detalle_cambio = {"idUsuario": <id del afectado>, "debeCambiarContrasena": true}`; el autor es el
    Administrador. Nunca se guarda la contraseña ni el hash.
- **Reasignación de zona (Administrador y Supervisor):** `PATCH /api/usuarios/{id}/zona` con `{ idZona }`. Es la única
  ruta de `/api/usuarios` que puede usar el Supervisor; el resto sigue siendo solo del Administrador.
  - Solo cambia la zona de usuarios con rol Vigilante y activos. Otro rol, usuario inactivo, zona inexistente o
    inactiva, o la misma zona que ya tiene → 400 con el motivo (p. ej. "Solo se puede reasignar la zona de un
    Vigilante"). `idZona` vacío → 400 `idZona: es obligatorio`. Usuario inexistente → 404. Vigilante → 403; sin token → 401.
  - Responde 200 con el usuario (sin contraseña) y audita `REASIGNAR_ZONA` con
    `detalle_cambio = {"idUsuario": <id>, "antes": {"idZona", "nombreZona"}, "despues": {"idZona", "nombreZona"}}`; el
    autor del registro es quien hizo el cambio (Administrador o Supervisor, tomado del token).
  - Mover a un vigilante no cambia sus incidencias pasadas: cada incidencia guarda su propia `id_zona`, así que el
    historial, el dashboard y los reportes siguen contándolas en la zona donde ocurrieron. Desde ese momento el
    Vigilante solo puede registrar en su zona nueva (RF-03).
- **Criterios de aceptación:** crear, listar (con rol, zona y estado), editar y activar/desactivar; DNI duplicado devuelve error claro; un Supervisor o Vigilante recibe 403 en esas operaciones; el Supervisor sí puede reasignar la zona de un Vigilante activo.

## RF-03 Registro de incidencias (Prioridad: Alta)

- **Descripción:** formulario para registrar eventos en campo, Mobile-First, en menos de 2 minutos.
- **Entradas:** `id_zona`, `id_tipo_evento`, `id_nivel_gravedad`, `descripcion`, `fecha_hora` (opcional).
- **Reglas:**
  - `id_usuario` se toma del JWT.
  - `fecha_hora` (cuándo ocurrió): si no se envía, el backend usa la hora actual; no puede ser futura. `fecha_registro` la asigna la BD.
  - `descripcion` obligatoria y no vacía.
  - **Zona según el rol:**
    - El Vigilante solo registra en su zona asignada. El formulario la muestra fija (título "Zona asignada" y una tarjeta con el
      nombre y el distrito, sin selector) y envía su id; al abrirse vuelve a leer el usuario con `GET /api/auth/yo`, porque
      el Administrador pudo reasignarla después del login. El backend lo verifica antes de buscar la zona pedida:
      sin zona asignada → 400 "No tiene una zona asignada; avise al Administrador"; zona asignada inactiva → 400
      "Su zona asignada está inactiva; avise al Administrador"; `idZona` distinto del asignado → 400 "Solo puede
      registrar incidencias en su zona asignada". En los dos primeros casos el formulario muestra el aviso y deja
      el botón de registro desactivado con el motivo.
    - El Administrador elige cualquier zona activa con el selector con búsqueda (su propia zona, si tiene, aparece
      primero con la marca "Tu zona").
  - Tipos y gravedades vienen de los catálogos (`tipo_evento`, `nivel_gravedad`).
  - Zona, tipo y nivel deben existir y estar activos (`estado_activo = true`); los catálogos se obtienen con
    `GET /api/catalogos/zonas`, `/tipos-evento` y `/niveles-gravedad`, que solo devuelven los activos.
  - Si el tipo de evento es "Otro", la descripción (sin espacios en los extremos) debe tener al menos 20 caracteres.
  - Máximo 2000 caracteres de descripción. Para `fecha_hora` se aceptan hasta 2 minutos de adelanto por desfase
    del reloj del celular.
  - Se audita `REGISTRAR_INCIDENCIA`.
- **Contrato:** `POST /api/incidencias` (Vigilante, Administrador) con
  `{ "idZona", "idTipoEvento", "idNivelGravedad", "descripcion", "fechaHora"? }`. Respuestas: 201 con la incidencia
  guardada (zona, tipo y nivel con sus nombres); 400 por datos faltantes o regla incumplida (catálogo inactivo,
  fecha futura, "Otro" corto, Vigilante sin zona, con la zona inactiva o con una zona distinta de la asignada); 401 sin token o con usuario inactivo; 403 con rol Supervisor.
- **Criterios de aceptación:** el flujo completo se hace con selectores rápidos y un campo de texto; el servidor responde en menos de 3 segundos en red móvil (RNF-04); tras guardar se muestra confirmación y el formulario queda listo para otro registro.

## Rango de fechas y filtros comunes (RF-04, RF-05 y RF-06)

El historial, el dashboard y los reportes reciben los mismos query params, todos opcionales y combinables con AND:

| Parámetro | Valores | Descripción |
|---|---|---|
| `periodo` | `HOY`, `ULTIMOS_7_DIAS`, `ULTIMOS_30_DIAS`, `MES_ACTUAL`, `ANIO_ACTUAL`, `PERSONALIZADO` | Sin valor se usa `ULTIMOS_30_DIAS`. |
| `desde`, `hasta` | fecha `AAAA-MM-DD` | Obligatorias con `PERSONALIZADO` y rechazadas con cualquier otro periodo. Ambos días se incluyen. |
| `idZona` | id | Solo incidencias de esa zona. |
| `idNivelGravedad` | id | Solo incidencias de ese nivel. |
| `idTipoEvento` | id | Solo incidencias de ese tipo. |

- **Cómo se calculan los periodos** (con "hoy" según la hora de Lima): `HOY` = hoy; `ULTIMOS_7_DIAS` = hoy y los 6 días anteriores; `ULTIMOS_30_DIAS` = hoy y los 29 anteriores; `MES_ACTUAL` = del día 1 del mes a hoy; `ANIO_ACTUAL` = del 1 de enero a hoy.
- **Límites del día:** se calculan en la zona horaria America/Lima sobre `fecha_hora`. La consulta usa el intervalo semiabierto `[desde 00:00, (hasta + 1 día) 00:00)` en hora de Lima, así que una incidencia de las 23:59:59 entra en su día y una de las 00:00:00 del día siguiente no.
- **Validaciones (400):** `desde` posterior a `hasta`; rango personalizado de más de 366 días (un año bisiesto completo es el máximo); `PERSONALIZADO` sin alguna de las fechas; fechas enviadas sin `PERSONALIZADO`; `periodo` o fecha con formato no válido. La respuesta indica el campo en `detalles` (por ejemplo `"desde: La fecha desde no puede ser posterior a hasta"`; el rango excesivo y la fecha faltante se informan en `hasta` o `desde`, y las fechas sin `PERSONALIZADO` en `periodo`).
- La consulta de auditoría (RF-08) usa el mismo filtro de rango, aplicado sobre `auditoria.fecha_hora`.
- Un id de zona, nivel o tipo que no existe no es error: simplemente no devuelve resultados.
- **Catálogos para filtrar:** `GET /api/catalogos/filtros` (Administrador y Supervisor; Vigilante → 403) devuelve
  `{zonas, tiposEvento, nivelesGravedad}` con los registros activos **e inactivos**, cada uno con `estadoActivo`. Las
  listas de filtros del historial y del dashboard los usan, con los inactivos al final y marcados "(inactiva)" o
  "(inactivo)", para poder consultar incidencias de una zona, un tipo o un nivel ya dados de baja. Los formularios
  (registro de incidencias, personal) siguen usando solo los activos (`/api/catalogos/zonas`, etc.).

## RF-04 Historial y filtros (Prioridad: Alta)

- **Descripción:** listado general de incidencias con filtros.
- **Endpoint:** `GET /api/incidencias` (Administrador y Supervisor; Vigilante recibe 403).
- **Parámetros:** los filtros comunes (rango de fechas sobre `fecha_hora`, zona, nivel de gravedad y tipo de evento) más `page` (desde 0, por defecto 0) y `size` (por defecto 20, se acota entre 1 y 100).
- **Reglas:** orden por `fecha_hora` descendente (a igual fecha, por id descendente, para que la paginación sea estable); paginación en servidor.
- **Respuesta:** página con `contenido`, `pagina`, `tamano`, `totalElementos` y `totalPaginas`. Cada fila trae `idIncidencia`, `fechaHora`, `fechaRegistro`, `descripcion`, `zona`, `tipoEvento`, `nivelGravedad` y `usuario` (`idUsuario`, `dni`, `nombreCompleto`; nunca la contraseña).
- **Columnas en pantalla:** Fecha, Zona, Tipo, Gravedad, Usuario (y descripción en el detalle).
- **Criterios de aceptación:** sin filtros muestra los últimos 30 días; con filtros solo lo que cumple todos; los filtros vigentes son los que usa la exportación (RF-06).
- **Filtros en la URL:** la pantalla lee y escribe los filtros comunes en la dirección (`/historial?periodo=ULTIMOS_7_DIAS&idZona=3`), con los mismos nombres que los query params de la API. Un enlace compartido o el botón "Ver en historial" del dashboard abren el historial con esos filtros; los valores no válidos se ignoran.

## RF-05 Dashboard analítico (Prioridad: Alta)

- **Descripción:** panel gerencial con gráficos dinámicos. Vista Desktop.
- **Endpoints** (Administrador y Supervisor), todos con los filtros comunes:

| Endpoint | Contenido |
|---|---|
| `GET /api/dashboard/kpis` | `desde`, `hasta`, `incidenciasHoy` (hoy en Lima, con los mismos filtros de zona, nivel y tipo), `incidenciasPeriodo`, el periodo anterior (`desdeAnterior`, `hastaAnterior`, `incidenciasPeriodoAnterior`: mismo número de días, terminando el día antes de `desde`, con los mismos filtros) y `porGravedad`: todos los niveles activos ordenados de menos a más grave, con 0 si no tienen incidencias (un nivel inactivo solo aparece si tiene incidencias en el rango). |
| `GET /api/dashboard/incidencias-por-zona` | Lista `{id, nombre, total}` de las zonas con incidencias en el rango, de mayor a menor (gráfico de barras). |
| `GET /api/dashboard/incidencias-por-tipo` | Igual, por tipo de evento (gráfico de anillo; en el diseño UI figura como "pastel"). |
| `GET /api/dashboard/incidencias-por-tiempo` | Serie `{agrupacion, desde, hasta, puntos[{inicio, fin, total}]}`. |

- **Serie por tiempo:** parámetro opcional `agrupacion` = `DIA`, `SEMANA` o `MES`. Sin valor: `DIA` si el rango tiene hasta 31 días, `SEMANA` hasta 180 y `MES` si es mayor. Se devuelven todos los tramos del rango, también los que no tienen incidencias (con `total` 0). Las semanas van de lunes a domingo y los meses son calendario; el primer y el último tramo se recortan a `desde` y `hasta` (por ejemplo, del jueves 1 al domingo 4).
- **Comparación con el periodo anterior:** la tarjeta "Incidencias del periodo" muestra "▲ n % vs. periodo anterior"
  (rojo: más incidencias), "▼ n %" (verde: menos) o "= 0 %", con el porcentaje redondeado a entero. Si el periodo
  anterior no tuvo incidencias y el actual sí, muestra "▲ Sin incidencias en el periodo anterior". Por ejemplo,
  "Últimos 7 días" del 10 al 16 de noviembre se compara con el 3 al 9 de noviembre; un personalizado del 1 al 10 de
  marzo, con el 19 al 28 de febrero.
- **Despliegue y carga por zona:** ver RF-07.
- **Reglas:** los datos salen de consultas agregadas en el backend; el conteo por día se hace con `fecha_hora AT TIME ZONE 'America/Lima'` y la agrupación en semanas o meses y el relleno con ceros se hacen en Java. El flujo TO-BE habla de métricas "en tiempo real": cargar al abrir y refrescar cada 30–60 s (propuesto).
- **Filtros globales y filtrado cruzado (pantalla):**
  - Una barra de filtros (periodo, zona, tipo de evento y gravedad) se aplica a los KPI, las barras, el anillo, la serie y la tabla de carga por zona (RF-07). La tarjeta "Vigilantes desplegados" no se filtra.
  - Clic en una barra de zona, en un sector del anillo o en una tarjeta de gravedad aplica ese filtro; otro clic sobre lo mismo lo quita. Alternativa con teclado: botones "Filtrar por …" en la tabla de datos de cada gráfico.
  - Cada gráfico se consulta sin su propio filtro, para seguir mostrando todas sus opciones: las barras sin `idZona`, el anillo sin `idTipoEvento` y las tarjetas de gravedad con un `GET /api/dashboard/kpis` sin `idNivelGravedad`. Lo elegido se resalta y el resto se atenúa. Los KPI de hoy y del periodo y la serie usan todos los filtros.
  - Barra de filtros activos encima de los gráficos (fija al desplazar en pantallas grandes): chips con "×", "Quitar
    filtros" (vuelve a los últimos 30 días sin filtros) o "Mostrando todo"; cada gráfico filtrado avisa "Filtrado por …
    · Ver todo". Un filtro también se quita con un clic en un espacio vacío del gráfico, con Escape o con "Atrás".
  - Los filtros se guardan en la URL (`?periodo=&desde=&hasta=&idZona=&idTipoEvento=&idNivelGravedad=`; el periodo por defecto no se escribe): un enlace compartido los reproduce y "Atrás" deshace el último cambio. "Ver en historial" abre `/historial` con los mismos parámetros, así el total del historial coincide con "Incidencias del periodo".
- **Criterios de aceptación:** estados de carga y de error visibles; un registro nuevo aparece en las métricas sin recargar manualmente tras el siguiente refresco; elegir una zona, un tipo o una gravedad (en la barra o en el gráfico) actualiza los demás bloques y aparece su chip; la URL copiada reproduce los filtros.

## RF-06 Exportación de reportes (Prioridad: Media)

- **Descripción:** descargar el historial en Excel o PDF aplicando los filtros vigentes.
- **Endpoints** (Administrador y Supervisor; Vigilante recibe 403): `GET /api/reportes/excel` y `GET /api/reportes/pdf`, con los filtros comunes (sin `page` ni `size`: el reporte trae todas las incidencias que cumplen los filtros).
- **Respuesta:** 200 con el archivo como adjunto (`Content-Disposition: attachment; filename="incidencias_2026-10-24.xlsx"`). Tipo de contenido `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` o `application/pdf`. La fecha del nombre es la de generación, en hora de Lima. Los errores (400, 401, 403) se responden en JSON como el resto de la API.
- **Reglas:**
  - Mismos filtros y mismo orden que RF-04 (`fecha_hora` descendente, luego id descendente).
  - Columnas: N°, Fecha y hora (en hora de Lima, `dd/MM/yyyy HH:mm`), Zona, Tipo de evento, Gravedad, Registrado por (`DNI - nombre completo`) y Descripción.
  - Excel (Apache POI): una hoja "Incidencias" con la fila de encabezados en negrita, fija al desplazarse y con autofiltro; la fecha es una celda de fecha real (se puede ordenar y filtrar).
  - PDF (OpenPDF): A4 horizontal con título "Reporte de incidencias", periodo aplicado con sus fechas (p. ej. `Periodo: Últimos 30 días (25/09/2026 al 24/10/2026)`), fecha y hora de generación, total de incidencias y la tabla, con los encabezados repetidos en cada página.
  - Con cero resultados se genera el archivo con solo los encabezados (en el PDF también el título, el periodo y "Total de incidencias: 0").
  - Máximo 10 000 incidencias por reporte; si hay más responde 400 pidiendo acotar el periodo o los filtros.
  - Se audita `EXPORTAR_REPORTE` con el detalle `{formato, periodo, desde, hasta, idZona, idNivelGravedad, idTipoEvento, totalRegistros}` (`desde`/`hasta` son las fechas ya resueltas del periodo; los filtros no enviados quedan en `null`). Si la petición es rechazada (400) no se audita.
- **Criterios de aceptación:** el archivo abre correctamente, trae solo lo filtrado y encabezados legibles; con cero resultados se genera un archivo con solo encabezados.

## RF-07 Control de despliegue (Prioridad: Alta)

- **Descripción:** en el dashboard, vigilantes activos por zona frente a la carga de incidencias, para decidir
  reasignaciones; y una pantalla por zona desde la que el Administrador y el Supervisor mueven vigilantes.
- **Endpoints** (Administrador y Supervisor; Vigilante → 403, sin token → 401):

| Endpoint | Contenido |
|---|---|
| `GET /api/dashboard/despliegue` | Sin filtros. `[{idZona, nombreZona, vigilantesActivos}]` de las zonas activas, ordenado por nombre. |
| `GET /api/dashboard/carga-por-zona` | Filtros comunes. `[{idZona, nombreZona, incidencias, vigilantesActivos, incidenciasPorVigilante}]`. |
| `GET /api/dashboard/zonas/{idZona}` | Datos de una zona, activa o no (`{idZona, nombreZona, departamento, provincia, distrito, referencia, descripcion, estadoActivo}`); 404 si no existe. |
| `GET /api/dashboard/vigilantes?idZona=&activo=` | Vigilantes con su zona: `[{idUsuario, nombres, apellidoPaterno, apellidoMaterno, idZona, nombreZona, estadoActivo}]`, ordenados por apellidos y nombres. Sin DNI ni contraseña. |
| `PATCH /api/usuarios/{id}/zona` | Reasignación de zona de un Vigilante activo; reglas en RF-02. |

- **Reglas:**
  - Los vigilantes activos salen de la vista `v_despliegue_por_zona` (cuenta usuarios con rol Vigilante y
    `estado_activo = true` por zona activa; las zonas sin vigilantes aparecen con 0). Es el despliegue de hoy: no
    depende del periodo.
  - **Carga por zona:** `incidencias` son las del periodo con los filtros de nivel y tipo; `incidenciasPorVigilante`
    = incidencias / vigilantes activos, redondeado a 2 decimales, y `null` si la zona no tiene vigilantes. Aparecen
    todas las zonas activas (con 0 incidencias si no tienen) y las inactivas que tengan incidencias en el periodo
    (con 0 vigilantes). Con `idZona` solo viene esa zona. Orden: primero las zonas con incidencias y sin vigilantes,
    luego de mayor a menor incidencias por vigilante y, a igualdad, por nombre.
- **Pantalla del dashboard:** la tabla "Despliegue y carga por zona" (Zona · Vigilantes activos · Incidencias · Inc.
  por vigilante) usa los filtros del dashboard salvo la zona (resalta la elegida) y se ordena con un clic en cada
  encabezado. Cada zona enlaza a su pantalla `/despliegue/{idZona}` con el periodo y los filtros vigentes. La tarjeta
  "Vigilantes desplegados" enlaza a la zona filtrada, o a la tabla si no hay zona elegida.
- **Pantalla de una zona** (`/despliegue/{idZona}`): datos de la zona, su carga en el periodo, los vigilantes asignados
  (nombre y estado) y las 5 incidencias más recientes con "Ver en historial" (abre `/historial` filtrado por la zona
  y el periodo). Desde aquí:
  - "Mover a otra zona" junto a cada vigilante activo: se elige la zona destino (solo zonas activas distintas de la
    actual) y se confirma.
  - "Asignar vigilante de otra zona": se elige un vigilante activo de otra zona (con su zona actual) y se confirma.
    No está disponible si la zona está inactiva.
  - La confirmación indica el origen, el destino y que las incidencias ya registradas se quedan en la zona de origen.
- **Criterios de aceptación:** al activar, desactivar o reasignar un vigilante, el conteo se actualiza en el siguiente
  refresco (en la pantalla de la zona, al momento); la carga cambia con el periodo y los filtros; el Supervisor puede
  reasignar un Vigilante activo y recibe 400 si intenta mover a otro rol; las incidencias pasadas del vigilante no
  cambian de zona.

## RF-08 Auditoría / logs (Prioridad: no definida en el SRS del Word)

- **Descripción:** registro automático de acciones críticas con fecha, hora y usuario.
- **Reglas:**
  - La tabla `auditoria` es solo inserción: ni el código ni los tests hacen UPDATE o DELETE.
  - Acciones: `LOGIN_OK`, `LOGIN_FALLIDO`, `CREAR_USUARIO`, `MODIFICAR_USUARIO`, `CAMBIAR_ESTADO_USUARIO`,
    `CAMBIAR_CONTRASENA`, `RESTABLECER_CONTRASENA`, `REGISTRAR_INCIDENCIA`, `EXPORTAR_REPORTE`, `CREAR_ZONA`,
    `MODIFICAR_ZONA`, `CAMBIAR_ESTADO_ZONA`, `CREAR_TIPO_EVENTO`, `MODIFICAR_TIPO_EVENTO`,
    `CAMBIAR_ESTADO_TIPO_EVENTO`, `MODIFICAR_NIVEL_GRAVEDAD`.
  - `accion_realizada` es texto libre (`VARCHAR(60)`, sin restricción de valores en la BD); los valores válidos
    los define el enum `AccionAuditoria` del backend.
  - `detalle_cambio` (JSONB) guarda los valores antes y después cuando aplica. Ninguna acción guarda contraseñas
    ni hashes. Detalles relacionados con contraseñas:
    - `RESTABLECER_CONTRASENA`: `{idUsuario, debeCambiarContrasena: true}` del afectado, con el Administrador como
      autor (`id_usuario`).
    - `CREAR_USUARIO` y `MODIFICAR_USUARIO` con contraseña: además de antes/después, `debeCambiarContrasena: true`.
    - `LOGIN_OK` con contraseña temporal: `{cambioPendiente: true}` (si no, sin detalle).
    - `CAMBIAR_CONTRASENA`: `{idUsuario, origen: "propio", cambioObligatorio}`; `cambioObligatorio: true` indica que
      el usuario reemplazó una contraseña temporal.
  - El log se escribe en la misma transacción que la acción (excepto `LOGIN_FALLIDO`).
  - Consulta solo para Administrador, con filtros por fecha, acción, usuario y DNI (pantalla "Historial de Incidencias y Auditoría"). Consultar la auditoría no genera registros de auditoría.
- **Endpoint de consulta:** `GET /api/auditoria` (solo Administrador; Supervisor y Vigilante reciben 403, sin token 401, y un token con cambio de contraseña pendiente 403).

| Parámetro | Valores | Descripción |
|---|---|---|
| `periodo`, `desde`, `hasta` | los del filtro de rango común | Sin valor, últimos 30 días. Días calculados en America/Lima, máximo 366. |
| `accion` | un valor de `GET /api/auditoria/acciones` | Solo registros de esa acción. Vacío = sin filtro. |
| `idUsuario` | id positivo | Solo registros hechos por ese usuario. |
| `q` | de 0 a 8 dígitos | DNI completo o sus primeros dígitos; busca en el DNI del usuario y en el DNI intentado (`dni_intentado`). Vacío = sin filtro. |
| `page` | desde 0 (por defecto 0) | Página. |
| `size` | 1 a 100 (por defecto 20) | Tamaño de página. Fuera de ese rango es 400 (no se acota). |

  - Orden por `fecha_hora` descendente y, a igual fecha, por id descendente.
  - Respuesta con el mismo formato de página que el historial (`contenido`, `pagina`, `tamano`, `totalElementos`, `totalPaginas`). Cada fila:
    ```json
    {
      "idAuditoria": 152,
      "fechaHora": "2026-11-13T09:15:02.481-05:00",
      "accion": "LOGIN_FALLIDO",
      "accionEtiqueta": "Inicio de sesión fallido",
      "usuario": null,
      "dniIntentado": "40404040",
      "detalle": { "motivo": "DNI_NO_REGISTRADO" }
    }
    ```
    `fechaHora` va en hora de Lima con su desfase. `usuario` es `{ idUsuario, dni, nombreCompleto }` cuando la acción tiene autor y `null` cuando el DNI no existe (entonces solo viene `dniIntentado`). `dniIntentado` solo tiene valor en los intentos de login. `detalle` es el contenido de `detalle_cambio` como objeto JSON (o `null`). No se devuelve contraseña, hash, rol ni estado del usuario.
  - Errores 400 en el formato uniforme, con el campo en `detalles`: `periodo` o fechas no válidos, rango invertido o mayor a 366 días, `accion` desconocida (`"accion: valor no válido 'BORRAR'"`), `q` con letras o más de 8 dígitos, `idUsuario` no positivo, `page` negativo o `size` fuera de 1..100 (`"size: debe estar entre 1 y 100"`).
- **Endpoint de acciones:** `GET /api/auditoria/acciones` (solo Administrador): lista, en el orden del enum, de `{ "valor": "LOGIN_OK", "etiqueta": "Inicio de sesión correcto" }` para cada acción, para llenar el filtro del frontend.
- **Criterios de aceptación:** cada acción listada deja un registro; intentar modificar o borrar un log falla en la BD; la consulta devuelve solo lo que cumple todos los filtros, de lo más reciente a lo más antiguo, y no agrega filas a `auditoria`.

## RF-09 Gestión de zonas y catálogos (Prioridad: Media)

- **Descripción:** alta, edición, activación/desactivación y listado filtrable de las zonas o sedes donde se asigna personal y ocurren incidencias; administración de los catálogos de tipos de evento y niveles de gravedad. Solo Administrador.
- **Entradas (alta y edición):** `nombre_zona`, `departamento`, `provincia`, `distrito`, `referencia` (opcional; dirección o punto de referencia) y `descripcion` (opcional).
- **Reglas:**
  - `nombre_zona` único (hasta 80 caracteres); `departamento` y `provincia` hasta 50, `distrito` hasta 80 y `referencia` hasta 150.
  - No existe borrado físico: "eliminar" es desactivar (`estado_activo = false`). Una zona inactiva no se ofrece en los formularios (RF-02, RF-03) pero se conserva en el historial y desaparece del despliegue (RF-07).
  - El listado se puede filtrar por cualquiera de los campos; los filtros son opcionales y combinables (AND) y no distinguen mayúsculas.
  - Nombres únicos sin distinguir mayúsculas (zona, tipo de evento y nivel); los textos se guardan sin espacios en
    los extremos.
  - Cada alta, edición y cambio de estado se audita con valores antes y después (`CREAR_ZONA`, `MODIFICAR_ZONA`,
    `CAMBIAR_ESTADO_ZONA` y equivalentes para tipos y niveles).
- **Contrato del listado:**

  `GET /api/zonas?nombre=&departamento=&provincia=&distrito=&activo=&q=&page=&size=`

  | Parámetro | Efecto |
  |---|---|
  | `nombre` | El nombre de la zona contiene el texto. |
  | `departamento`, `provincia`, `distrito` | Igualdad exacta (sin distinguir mayúsculas). |
  | `activo` | `true` solo activas, `false` solo inactivas; sin valor, todas. |
  | `q` | Texto libre: la `referencia` o la `descripcion` contienen el texto. |
  | `page` | Página desde 0 (por defecto 0; un valor negativo se toma como 0). |
  | `size` | Elementos por página (por defecto 20; se acota entre 1 y 100). |

  Un parámetro vacío o ausente no filtra; `%` y `_` se buscan como caracteres normales. Orden por `nombre_zona` ascendente (sin distinguir mayúsculas). Respuesta 200:
  ```json
  {
    "contenido": [
      { "idZona": 1, "nombreZona": "Sede Miraflores", "departamento": "Lima", "provincia": "Lima",
        "distrito": "Miraflores", "referencia": "Av. Larco 345", "descripcion": "Edificio corporativo",
        "estadoActivo": true }
    ],
    "pagina": 0, "tamano": 20, "totalElementos": 1, "totalPaginas": 1
  }
  ```
  Sin token → 401; Supervisor o Vigilante → 403.
- **Resto del contrato** (Administrador; sin `DELETE`):

  | Método y ruta | Cuerpo | Respuestas |
  |---|---|---|
  | `GET /api/zonas/{id}` | — | 200; 404 |
  | `POST /api/zonas` | `{ nombreZona, departamento, provincia, distrito, referencia?, descripcion? }` | 201; 400; 409 nombre duplicado |
  | `PUT /api/zonas/{id}` | igual al alta | 200; 400; 404; 409 |
  | `PATCH /api/zonas/{id}/estado` | `{ activo }` | 200; 404 |
  | `GET /api/tipos-evento` | — | 200 todos (activos e inactivos) por nombre: `[{ idTipoEvento, nombreTipoEvento, estadoActivo }]` |
  | `POST /api/tipos-evento` | `{ nombreTipoEvento }` (hasta 30) | 201; 400; 409 |
  | `PUT /api/tipos-evento/{id}` | `{ nombreTipoEvento }` | 200; 400 (el tipo "Otro" no se puede renombrar: la regla de RF-03 depende de su nombre); 404; 409 |
  | `PATCH /api/tipos-evento/{id}/estado` | `{ activo }` | 200; 404 |
  | `GET /api/niveles-gravedad` | — | 200 todos por `orden`: `[{ idNivelGravedad, nombreNivel, orden, estadoActivo }]` |
  | `PUT /api/niveles-gravedad/{id}` | `{ nombreNivel, orden }` (nombre hasta 20, orden ≥ 1) | 200; 400; 404; 409 |

  Los niveles de gravedad solo admiten edición de nombre y orden. Si el `orden` pedido ya lo tiene otro nivel, los
  dos niveles intercambian su orden en la misma transacción y la auditoría lo registra en `intercambiadoCon`.
  Los formularios siguen usando `GET /api/catalogos/...`, que devuelve solo los activos.
- **Criterios de aceptación:** crear, editar y activar/desactivar zonas; nombre duplicado devuelve error claro; sin filtros el listado muestra todas las zonas; con filtros solo las que cumplen todos; un Supervisor o Vigilante recibe 403.

---

## Requerimientos no funcionales

| ID | Categoría | Descripción |
|---|---|---|
| RNF-01 | Seguridad y trazabilidad | Endpoints protegidos y logs de auditoría inmutables (triggers + RLS + rol `app_sgi`). |
| RNF-02 | Disponibilidad | Desplegado en la nube con 99% de uptime (el Charter dice 99.9%; pendiente de unificar). |
| RNF-03 | Usabilidad | Responsivo estricto: Mobile-First para el formulario del vigilante, Desktop para gerencia. |
| RNF-04 | Rendimiento | Registrar una incidencia o cargar un reporte en menos de 3 s con red móvil estándar. |
| RNF-05 | Escalabilidad | BD normalizada (3FN) para crecer en volumen sin degradarse. |

Requisito del curso: al menos el 50% de la solución en Java (backend Spring Boot).
