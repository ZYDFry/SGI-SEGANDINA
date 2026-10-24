# Requerimientos

Fuente: SRS del Proyecto Integrador (RF-01 a RF-07, RNF-01 a RNF-05) más RF-08 definido en el diseño de BD y RF-09 (gestión de zonas) agregado en el diseño del sistema. Los campos de "Entradas", "Reglas" y "Criterios de aceptación" desarrollan lo que el SRS enuncia en una línea; lo marcado como (propuesto) es una decisión por confirmar.

## Roles y permisos

| Acción | Administrador | Supervisor | Vigilante |
|---|---|---|---|
| Iniciar sesión | Sí | Sí | Sí |
| Gestionar usuarios (RF-02) | Sí | No | No |
| Registrar incidencia (RF-03) | Sí | No (propuesto) | Sí |
| Ver historial y filtrar (RF-04) | Sí | Sí | No (propuesto) |
| Ver dashboard y despliegue (RF-05, RF-07) | Sí | Sí | No |
| Exportar reportes (RF-06) | Sí | Sí | No |
| Consultar auditoría (RF-08) | Sí | No | No |
| Gestionar zonas (RF-09) | Sí | No | No |

El Supervisor tiene, según las decisiones técnicas, "visualización de dashboard y reportes". El Vigilante usa el formulario móvil.

---

## RF-01 Autenticación y accesos (Prioridad: Alta)

- **Descripción:** inicio de sesión con DNI y contraseña y validación de rol (Administrador, Supervisor, Vigilante).
- **Entradas:** `dni` (8 dígitos), `contrasena`.
- **Reglas:**
  - El usuario debe existir y tener `estado_activo = true`.
  - La contraseña se compara contra el hash BCrypt.
  - Si es correcto, el backend devuelve un JWT (con `id_usuario` y `rol`) y los datos básicos del usuario (sin contraseña).
  - Cada intento se registra en `auditoria`: `LOGIN_OK`, o `LOGIN_FALLIDO` con `dni_intentado` (y `id_usuario` nulo si el DNI no existe).
  - Mensaje de error genérico: "DNI o contraseña incorrectos".
- **Criterios de aceptación:**
  - DNI con formato inválido se rechaza antes de consultar la BD.
  - Usuario inactivo no puede entrar.
  - Un endpoint protegido sin token responde 401; con rol insuficiente responde 403.
  - Tras el login, el Vigilante va al formulario de incidencias y Administrador/Supervisor al dashboard.

## RF-02 Gestión de usuarios (Prioridad: Media)

- **Descripción:** módulo CRUD de trabajadores con rol y zona de patrullaje. Solo Administrador.
- **Entradas (alta):** `dni`, `nombres`, `apellido_paterno`, `apellido_materno` (opcional), `contrasena` inicial, `id_rol`, `id_zona` (opcional).
- **Reglas:**
  - `dni` único y de 8 dígitos numéricos.
  - La contraseña se guarda siempre como BCrypt; nunca se devuelve.
  - Administrador y Supervisor pueden no tener zona; para Vigilante la zona es obligatoria (propuesto).
  - No existe borrado físico: "eliminar" es desactivar (`estado_activo = false`) para conservar el historial.
  - Reasignar zona = editar `id_zona`.
  - Se audita: `CREAR_USUARIO`, `MODIFICAR_USUARIO`, `CAMBIAR_ESTADO_USUARIO`, con valores antes y después en `detalle_cambio`.
- **Criterios de aceptación:** crear, listar (con rol, zona y estado), editar y activar/desactivar; DNI duplicado devuelve error claro; un Supervisor o Vigilante recibe 403.

## RF-03 Registro de incidencias (Prioridad: Alta)

- **Descripción:** formulario para registrar eventos en campo, Mobile-First, en menos de 2 minutos.
- **Entradas:** `id_zona`, `id_tipo_evento`, `id_nivel_gravedad`, `descripcion`, `fecha_hora` (opcional).
- **Reglas:**
  - `id_usuario` se toma del JWT.
  - `fecha_hora` (cuándo ocurrió): si no se envía, el backend usa la hora actual; no puede ser futura. `fecha_registro` la asigna la BD.
  - `descripcion` obligatoria y no vacía.
  - Zona preseleccionada con la zona asignada al vigilante (propuesto), editable.
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
  fecha futura, "Otro" corto); 401 sin token o con usuario inactivo; 403 con rol Supervisor.
- **Criterios de aceptación:** el flujo completo se hace con selectores rápidos y un campo de texto; el servidor responde en menos de 3 segundos en red móvil (RNF-04); tras guardar se muestra confirmación y el formulario queda listo para otro registro.

## RF-04 Historial y filtros (Prioridad: Alta)

- **Descripción:** listado general de incidencias con filtros.
- **Filtros (opcionales y combinables):** rango de fechas (sobre `fecha_hora`), zona, nivel de gravedad.
- **Reglas:** orden por `fecha_hora` descendente; paginación en servidor.
- **Columnas:** Fecha, Zona, Tipo, Gravedad, Usuario (y descripción en el detalle).
- **Criterios de aceptación:** sin filtros muestra todo; con filtros solo lo que cumple todos; los filtros vigentes son los que usa la exportación (RF-06).

## RF-05 Dashboard analítico (Prioridad: Alta)

- **Descripción:** panel gerencial con gráficos dinámicos. Vista Desktop.
- **Contenido:**
  - KPI: incidencias de hoy.
  - Gráfico de barras: incidencias por zona.
  - Gráfico de anillo (en el diseño UI figura como "pastel"): incidencias por tipo de evento.
  - Despliegue por zona (ver RF-07).
- **Reglas:** los datos salen de consultas agregadas en el backend (ejemplos en el Capítulo IV, sección 4.4). El flujo TO-BE habla de métricas "en tiempo real": cargar al abrir y refrescar cada 30–60 s (propuesto).
- **Criterios de aceptación:** estados de carga y de error visibles; un registro nuevo aparece en las métricas sin recargar manualmente tras el siguiente refresco.

## RF-06 Exportación de reportes (Prioridad: Media)

- **Descripción:** descargar el historial en Excel o PDF aplicando los filtros vigentes.
- **Reglas:** mismos filtros y mismas columnas que RF-04 (más descripción). Excel con Apache POI; PDF con OpenPDF. Nombre de archivo con fecha, p. ej. `incidencias_2026-10-23.xlsx`. Se audita `EXPORTAR_REPORTE` con los filtros usados.
- **Criterios de aceptación:** el archivo abre correctamente, trae solo lo filtrado y encabezados legibles; con cero resultados se genera un archivo con solo encabezados.

## RF-07 Control de despliegue (Prioridad: Alta)

- **Descripción:** en el dashboard, cantidad de vigilantes activos por zona para decidir reasignaciones.
- **Reglas:** se obtiene de la vista `v_despliegue_por_zona` (cuenta usuarios con rol Vigilante y `estado_activo = true` por zona; las zonas sin vigilantes aparecen con 0).
- **Criterios de aceptación:** al activar, desactivar o reasignar un vigilante, el conteo se actualiza en el siguiente refresco.

## RF-08 Auditoría / logs (Prioridad: no definida en el SRS del Word)

- **Descripción:** registro automático de acciones críticas con fecha, hora y usuario.
- **Reglas:**
  - La tabla `auditoria` es solo inserción: ni el código ni los tests hacen UPDATE o DELETE.
  - Acciones: `LOGIN_OK`, `LOGIN_FALLIDO`, `CREAR_USUARIO`, `MODIFICAR_USUARIO`, `CAMBIAR_ESTADO_USUARIO`, `REGISTRAR_INCIDENCIA`, `EXPORTAR_REPORTE`.
  - `detalle_cambio` (JSONB) guarda los valores antes y después cuando aplica.
  - El log se escribe en la misma transacción que la acción (excepto `LOGIN_FALLIDO`).
  - Consulta solo para Administrador, con filtros por fecha y acción (pantalla "Historial de Incidencias y Auditoría").
- **Criterios de aceptación:** cada acción listada deja un registro; intentar modificar o borrar un log falla en la BD.

## RF-09 Gestión de zonas (Prioridad: Media)

- **Descripción:** alta, edición, activación/desactivación y listado filtrable de las zonas o sedes donde se asigna personal y ocurren incidencias. Solo Administrador.
- **Entradas (alta y edición):** `nombre_zona`, `departamento`, `provincia`, `distrito`, `referencia` (opcional; dirección o punto de referencia) y `descripcion` (opcional).
- **Reglas:**
  - `nombre_zona` único (hasta 80 caracteres); `departamento` y `provincia` hasta 50, `distrito` hasta 80 y `referencia` hasta 150.
  - No existe borrado físico: "eliminar" es desactivar (`estado_activo = false`). Una zona inactiva no se ofrece en los formularios (RF-02, RF-03) pero se conserva en el historial y desaparece del despliegue (RF-07).
  - El listado se puede filtrar por cualquiera de los campos; los filtros son opcionales y combinables (AND) y no distinguen mayúsculas.
- **Contrato del listado** (se implementa en la Fase 4):

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
