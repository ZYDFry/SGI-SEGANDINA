# Stack y arquitectura

Sistema Web Interno (no es app móvil nativa: se descartó por costo de smartphones). Los vigilantes reportan desde el navegador del celular o de la caseta; la gerencia usa el dashboard en escritorio.

## 1. Tecnologías

| Capa | Tecnología | Notas |
|---|---|---|
| Backend | Java 21, Spring Boot 4.1.2 | Initializr ya no ofrece 3.x (oct 2026); se usa la 4.x estable (Hibernate 7, Jackson 3). Maven Wrapper. |
| Persistencia | Spring Data JPA (Hibernate) + PostgreSQL | `ddl-auto=none`. Las tablas ya existen (ver `modelo_datos.sql`). |
| Seguridad | Spring Security + JWT HS256 (`spring-boot-starter-oauth2-resource-server`, Nimbus JOSE), BCrypt | Rol de BD `app_sgi` con privilegios mínimos. |
| Frontend | Next.js 16 (App Router), Tailwind CSS | Mobile-First en el formulario del vigilante. |
| Gráficos / HTTP | Chart.js (con `react-chartjs-2`), Axios | Barras por zona, anillo por tipo de evento. |
| Excel | Apache POI 5.5.1 (`poi-ooxml`) | RF-06. Archivos `.xlsx`. |
| PDF | OpenPDF 2.4.0 (`com.github.librepdf:openpdf`, paquete `com.lowagie.text`) | RF-06. Fork libre de iText 4 (LGPL/MPL). |
| Logging | Logback (viene con Spring Boot) | Config en `logback-spring.xml`. |
| Utilidades | Google Guava (opcional) | Solo si aporta (p. ej. `Preconditions`); el curso pide mostrar uso de librerías Java. |
| Base de datos | PostgreSQL en Supabase | Project Settings → Database para la cadena de conexión. |
| Despliegue | Vercel (frontend), Render o Railway (backend) | |

## 2. Arquitectura del backend

El curso exige MVC, DAO y SOLID. Cómo se materializan en una API REST:

- **Model**: entidades JPA (`@Entity`) y DTOs de entrada/salida.
- **View**: el frontend Next.js, consumiendo JSON (el contrato de la API es la "vista").
- **Controller**: `@RestController`, solo recibe, valida y delega. Sin lógica de negocio.
- **Service**: reglas de negocio (interfaz + implementación). Depende de interfaces DAO, no de implementaciones.
- **DAO**: paquete `dao` con interfaces Spring Data JPA (`extends JpaRepository`) más consultas `@Query` para el dashboard. Es la implementación del patrón DAO que se documenta en el informe.

SOLID en la práctica: servicios con una sola responsabilidad (S), servicios inyectados por interfaz (D), exportadores `ExportadorReporte` con implementaciones `ExcelExportador` y `PdfExportador` (O/L), interfaces pequeñas (I).

### Estructura de paquetes (base `com.segandina.sgi`)

```
backend/src/main/java/com/segandina/sgi/
  config/        SecurityConfig (JWT con el resource server de Spring Security, sin JwtFilter manual),
                 JwtProperties, CorsConfig, ErrorJsonHandlers
  controller/    AuthController, UsuarioController, IncidenciaController,
                 DashboardController, ReporteController, AuditoriaController, CatalogoController
  service/       interfaces + impl/
  dao/           RolDao, ZonaDao, TipoEventoDao, NivelGravedadDao, UsuarioDao, IncidenciaDao, AuditoriaDao
  model/         entidades JPA (Rol, Zona, TipoEvento, NivelGravedad, Usuario, Incidencia, Auditoria)
  dto/           request/ y response/
  export/        ExportadorReporte, ExcelExportador, PdfExportador
  exception/     excepciones de dominio + @RestControllerAdvice
```

### Mapeo de tablas a JPA (puntos que suelen fallar)

- `SMALLSERIAL` → `Short` (rol, tipo_evento, nivel_gravedad). `SERIAL` → `Integer` (zona). `BIGSERIAL` → `Long`.
- `TIMESTAMPTZ` → `OffsetDateTime` o `Instant`.
- `JSONB` (`auditoria.detalle_cambio`) → `@JdbcTypeCode(SqlTypes.JSON)` sobre un `Map<String,Object>` o `String`.
- `CHAR(8)` (`usuario.dni`, `auditoria.dni_intentado`) → `String` con `@JdbcTypeCode(SqlTypes.CHAR)` y
  `@Column(length = 8)`. Sin `@JdbcTypeCode`, Hibernate trata el `String` como VARCHAR y `ddl-auto=validate`
  falla, porque PostgreSQL informa la columna como `bpchar` (`Types#CHAR`); `columnDefinition = "char(8)"` no lo evita.
- `TEXT` → `String` con `columnDefinition = "text"`. `BOOLEAN` → `Boolean`. Ambos pasan la validación sin anotaciones extra.
- `estado_activo` (`usuario`, `zona`, `tipo_evento`, `nivel_gravedad`) → `Boolean` inicializado en `TRUE` en Java,
  igual que el `DEFAULT TRUE` de la BD. Es la baja lógica: nada se borra. Los formularios listan con
  `findByEstadoActivoTrue()` en el DAO; la vista `v_despliegue_por_zona` ya excluye zonas inactivas.
- `incidencia.fecha_registro` y `auditoria.fecha_hora` tienen `DEFAULT now()`: mapear con `insertable = false, updatable = false` o dejar que la BD lo asigne.
- `Auditoria` es inmutable: sin setters, sin `update`/`delete` en `AuditoriaDao` (exponer solo `save` de nuevos registros y consultas).
- La vista `v_despliegue_por_zona` se consume con una proyección o consulta nativa (no es entidad editable).

## 3. Seguridad

- Contraseñas con BCrypt (`contrasena` guarda el hash, 255 caracteres).
- JWT con `id_usuario` y `rol`. Expiración propuesta: 8 horas (un turno). Secreto en variable de entorno `JWT_SECRET`.
- Autorización por rol en cada endpoint (`@PreAuthorize` o reglas en `SecurityConfig`).
- El `id_usuario` de una incidencia o de un log de auditoría siempre sale del token, nunca del body.
- Mensaje de error de login genérico (no revelar si el DNI existe).
- CORS limitado al dominio del frontend.
- BD (RNF-01), tres capas: triggers que bloquean UPDATE/DELETE/TRUNCATE en `auditoria`; RLS activo en todas las tablas; el backend conecta con `app_sgi` (sin UPDATE ni DELETE sobre `auditoria`).

### Conexión a Supabase

Variables de entorno (valores reales fuera de git):

```
DB_URL=jdbc:postgresql://<host>:<puerto>/postgres
DB_USER=app_sgi            # con el pooler de Supabase el usuario suele llevar sufijo: app_sgi.<project-ref>
DB_PASSWORD=
JWT_SECRET=
```

Verificar en Supabase (Project Settings → Database) cuál cadena corresponde: conexión directa o pooler. Si se usa el pooler en modo transacción, puede hacer falta `?prepareThreshold=0` en la URL de JDBC.

`application.properties` lee `${DB_URL}`, `${DB_USER}`, `${DB_PASSWORD}`, `${JWT_SECRET}`. Para desarrollo local, `application-local.properties` (ignorado por git) con perfil `local`.

## 4. API REST (propuesta inicial, ajustable)

Prefijo `/api`. Todo requiere JWT salvo el login.

| Método y ruta | Rol | RF |
|---|---|---|
| `POST /auth/login` | público | RF-01 |
| `GET /catalogos/zonas`, `/tipos-evento`, `/niveles-gravedad`, `/roles` | autenticado | RF-02/03 |
| `GET /usuarios`, `POST /usuarios`, `PUT /usuarios/{id}`, `PATCH /usuarios/{id}/estado` | Administrador | RF-02 |
| `POST /incidencias` | Vigilante, Administrador | RF-03 |
| `GET /incidencias?periodo&desde&hasta&idZona&idNivelGravedad&idTipoEvento&page&size` | Administrador, Supervisor | RF-04 |
| `GET /dashboard/kpis`, `/dashboard/incidencias-por-zona`, `/dashboard/incidencias-por-tipo`, `/dashboard/incidencias-por-tiempo?agrupacion` (todos con los filtros de RF-04, sin paginación) | Administrador, Supervisor | RF-05 |
| `GET /dashboard/despliegue` | Administrador, Supervisor | RF-07 |
| `GET /reportes/excel?periodo&desde&hasta&idZona&idNivelGravedad&idTipoEvento` y `GET /reportes/pdf?...` (mismos filtros que RF-04, sin paginación; responden el archivo como adjunto) | Administrador, Supervisor | RF-06 |
| `GET /auditoria?desde&hasta&accion&page&size` | Administrador | RF-08 |

Formato de error uniforme: `{ "timestamp", "status", "mensaje", "detalles": [] }`.

## 5. Despliegue

- Frontend en Vercel; backend en Render o Railway (Dockerfile o build Maven); BD en Supabase.
- Variables de entorno configuradas en cada plataforma, no en el repositorio.
- Meta de disponibilidad: ver RNF-02 (99%; el Charter menciona 99.9%, pendiente de unificar).

## 6. Control de versiones

Ramas `main` / `develop` / `feature/*`. El historial de commits y los merges sirven como evidencia para el informe (Git/GitHub es criterio de la rúbrica).
