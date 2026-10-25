# Referencia de clases del backend

Paquete base: `com.segandina.sgi` (carpeta `backend/src/main/java/com/segandina/sgi/`).

---

## Fase 1 — Base del backend: entidades y DAO

Proyecto Spring Boot 4.1.2 (Java 21, Maven Wrapper) con las 7 entidades JPA que reflejan las tablas de
`docs/modelo_datos.sql` y sus DAO (interfaces Spring Data JPA). Hibernate no crea ni altera tablas
(`ddl-auto=none`); el esquema vive en Supabase. Aún no hay controllers ni servicios.

### Entidades (`model/`)

Todas tienen getters/setters de sus campos (salvo las excepciones indicadas) y `equals`/`hashCode` por id,
compatibles con proxies LAZY de Hibernate.

| Clase | Tabla | Id | Responsabilidad / notas |
|---|---|---|---|
| `Rol` | `rol` | `Short` | Rol del sistema: `nombreRol` (Administrador, Supervisor, Vigilante). |
| `Zona` | `zona` | `Integer` | Zona o sede: `nombreZona`, `descripcion`, `estadoActivo` (baja lógica, `true` por defecto). |
| `TipoEvento` | `tipo_evento` | `Short` | Catálogo: `nombreTipoEvento` (Robo, Accidente, Alerta, Otro), `estadoActivo`. |
| `NivelGravedad` | `nivel_gravedad` | `Short` | Catálogo: `nombreNivel`, `orden` (1 = menos grave), `estadoActivo`. |
| `Usuario` | `usuario` | `Long` | Persona que usa el sistema. `dni` (`char(8)`), nombres y apellidos (`apellidoMaterno` opcional), `contrasena` (hash BCrypt, nunca se expone en la API), `estadoActivo` (baja lógica, `true` por defecto), `rol` (obligatorio) y `zona` (opcional), ambos `@ManyToOne` LAZY. |
| `Incidencia` | `incidencia` | `Long` | Evento reportado. `fechaHora` (cuándo ocurrió), `fechaRegistro` (solo lectura: la asigna la BD con `now()`; no tiene setter), `descripcion`, y relaciones LAZY obligatorias a `TipoEvento`, `NivelGravedad`, `Usuario` y `Zona`. |
| `Auditoria` | `auditoria` | `Long` | Log inmutable (`@Immutable`, sin setters). Se crea con el constructor `Auditoria(accionRealizada, detalleCambio, dniIntentado, usuario)`. `detalleCambio` es un `Map<String,Object>` guardado como JSONB; `fechaHora` la asigna la BD; `usuario` puede ser nulo (p. ej. login con DNI inexistente). |

Correspondencia de tipos usada: `SMALLSERIAL → Short`, `SERIAL → Integer`, `BIGSERIAL → Long`,
`TIMESTAMPTZ → OffsetDateTime`, `JSONB → Map<String,Object>` con `@JdbcTypeCode(SqlTypes.JSON)`,
`CHAR(8) → String` con `@JdbcTypeCode(SqlTypes.CHAR)` y `@Column(length = 8)` (necesario para que
`ddl-auto=validate` acepte las columnas `bpchar`).

La vista `v_despliegue_por_zona` no se mapea como entidad.

### DAO (`dao/`)

| Interfaz | Extiende | Métodos propios (además de los heredados) |
|---|---|---|
| `RolDao` | `JpaRepository<Rol, Short>` | `Optional<Rol> findByNombreRol(String nombreRol)`: busca un rol por nombre exacto. |
| `ZonaDao` | `JpaRepository<Zona, Integer>` | `Optional<Zona> findByNombreZona(String nombreZona)`: busca una zona por nombre exacto. `List<Zona> findByEstadoActivoTrue()`: solo zonas activas. |
| `TipoEventoDao` | `JpaRepository<TipoEvento, Short>` | `List<TipoEvento> findByEstadoActivoTrue()`: solo tipos activos. |
| `NivelGravedadDao` | `JpaRepository<NivelGravedad, Short>` | `List<NivelGravedad> findAllByOrderByOrdenAsc()`: niveles de menos a más grave. `findByEstadoActivoTrue()` y `findByEstadoActivoTrueOrderByOrdenAsc()`: solo niveles activos (sin orden / ordenados). |
| `UsuarioDao` | `JpaRepository<Usuario, Long>` | `Optional<Usuario> findByDni(String dni)`: usuario por DNI (activo o no). `boolean existsByDni(String dni)`: indica si el DNI ya está registrado. |
| `IncidenciaDao` | `JpaRepository<Incidencia, Long>` | — |
| `AuditoriaDao` | `Repository<Auditoria, Long>` | Solo `Auditoria save(Auditoria)`, `Optional<Auditoria> findById(Long)` y `Page<Auditoria> findAll(Pageable)`. Al no extender `JpaRepository`, no existen métodos de borrado. |

Los métodos heredados de `JpaRepository` más usados: `save`, `findById`, `findAll`, `existsById`, `count`.
No se usan los de borrado: usuarios e incidencias se dan de baja lógicamente.

### Configuración

- `src/main/resources/application.properties`: lee `DB_URL`, `DB_USER`, `DB_PASSWORD` de variables de entorno;
  `ddl-auto=none`, `open-in-view=false`, zona horaria JDBC en UTC.
- `backend/.env.example`: plantilla de variables sin valores.
- Para desarrollo local, `src/main/resources/application-local.properties` (ignorado por git) con perfil `local`.

### Cómo probar

```
cd backend
./mvnw -q verify
```
Ejecuta `MapeoEntidadesTest` (JUnit puro, sin BD): comprueba que cada entidad apunta a su tabla, que
`Auditoria` es inmutable, que `AuditoriaDao` no expone `delete*`, que `Incidencia` no permite asignar
`fechaRegistro` y que un `Usuario` nuevo está activo.

Validar el mapeo contra la BD real (requiere `application-local.properties` con la conexión a Supabase):
```
./mvnw spring-boot:run -Dspring-boot.run.profiles=local "-Dspring-boot.run.arguments=--spring.jpa.hibernate.ddl-auto=validate --spring.main.web-application-type=none"
```
La aplicación arranca, Hibernate compara entidades y tablas, y termina sola. Si el mapeo no coincide,
falla con `SchemaManagementException` indicando la columna.

---

## Ajuste de catálogos — baja lógica con `estado_activo`

Las tablas `zona`, `tipo_evento` y `nivel_gravedad` tienen la columna `estado_activo BOOLEAN NOT NULL DEFAULT TRUE`.
Un registro de catálogo no se borra (las incidencias antiguas lo siguen referenciando): se desactiva y deja de
ofrecerse en los formularios. La vista `v_despliegue_por_zona` filtra `WHERE z.estado_activo = TRUE`.

### Cambios en clases

| Clase | Cambio | Métodos públicos nuevos |
|---|---|---|
| `Zona`, `TipoEvento`, `NivelGravedad` | Campo `estadoActivo` (`@Column(name = "estado_activo", nullable = false)`), `true` al crear el objeto. | `Boolean getEstadoActivo()`, `void setEstadoActivo(Boolean)`. |
| `ZonaDao` | Consulta derivada de Spring Data. | `List<Zona> findByEstadoActivoTrue()`: zonas activas. |
| `TipoEventoDao` | Consulta derivada. | `List<TipoEvento> findByEstadoActivoTrue()`: tipos de evento activos. |
| `NivelGravedadDao` | Consultas derivadas. | `List<NivelGravedad> findByEstadoActivoTrue()`: niveles activos. `List<NivelGravedad> findByEstadoActivoTrueOrderByOrdenAsc()`: niveles activos de menos a más grave. |

Spring Data genera el SQL a partir del nombre; por ejemplo `findByEstadoActivoTrue()` en `ZonaDao` equivale a
`SELECT * FROM zona WHERE estado_activo = true`. `findAll()` sigue devolviendo activos e inactivos.

### Cómo probar

`MapeoEntidadesTest.catalogoNuevoEstaActivoPorDefecto` comprueba que una `Zona`, un `TipoEvento` y un
`NivelGravedad` nuevos están activos. Para confirmar que las columnas existen en Supabase, usar el arranque con
`ddl-auto=validate` descrito en la sección de la Fase 1.

## Fase 2 — Login con JWT, seguridad por roles y auditoría base (RF-01, RF-08)

El usuario inicia sesión con DNI y contraseña (`POST /api/auth/login`); si son válidos recibe un JWT HS256
de 8 horas con su id y su rol. Spring Security valida ese token en cada petición y aplica las reglas por rol.
Cada intento de login queda en `auditoria` (`LOGIN_OK` / `LOGIN_FALLIDO`). El perfil `seed` crea el primer
Administrador.

### Clases nuevas

| Clase | Paquete | Responsabilidad | Métodos públicos principales |
|---|---|---|---|
| `SecurityConfig` | `config` | Cadena de filtros sin sesión, reglas por rol, respuestas JSON 401/403 y beans de seguridad. El claim `rol` se convierte en la autoridad `ROLE_<rol>`. | `securityFilterChain(HttpSecurity, JsonMapper)` → `SecurityFilterChain`. `passwordEncoder()` → `BCryptPasswordEncoder`. `jwtEncoder(JwtProperties)` / `jwtDecoder(JwtProperties)` → firma y validación HS256 con la clave de `JWT_SECRET`. |
| `JwtProperties` | `config` | Record con `jwt.secreto` y `jwt.expiracion` (por defecto 8 h). Lanza `IllegalStateException` si el secreto falta o tiene menos de 32 bytes. | `secreto()`, `expiracion()`. |
| `AdminSeedRunner` | `config` | `CommandLineRunner` activo solo con el perfil `seed`. Lee `ADMIN_DNI`, `ADMIN_PASSWORD` y opcionalmente `ADMIN_NOMBRES`, `ADMIN_APELLIDO_PATERNO`. | `run(String...)`: valida DNI (8 dígitos) y contraseña (≥ 8 caracteres); si el DNI no existe crea el Administrador activo, si existe reemplaza solo su contraseña por el hash BCrypt; audita `CREAR_USUARIO` o `MODIFICAR_USUARIO`. Lanza `IllegalStateException` si faltan datos o no existe el rol. |
| `AuthController` | `controller` | Endpoints de autenticación. | `login(LoginRequest)` → `LoginResponse` (`POST /api/auth/login`, público). `yo(Jwt)` → `UsuarioResumenResponse` (`GET /api/auth/yo`, con token). |
| `AuthService` / `AuthServiceImpl` | `service` / `service.impl` | Lógica del login. | `login(LoginRequest)` → `LoginResponse`; lanza `CredencialesInvalidasException` si el DNI no existe, la contraseña no coincide o el usuario está inactivo. `usuarioActual(Long idUsuario)` → `UsuarioResumenResponse`; rechaza usuarios inexistentes o inactivos. |
| `TokenService` / `JwtTokenServiceImpl` | `service` / `service.impl` | Emisión del JWT. Define los nombres de claim `CLAIM_ROL` y `CLAIM_DNI` y el record `TokenEmitido(token, expiraEn)`. | `generarToken(Usuario)` → `TokenEmitido` con `iss=sgi-segandina`, `sub`=id del usuario, `rol`, `dni`, `iat` y `exp`. |
| `AuditoriaService` / `AuditoriaServiceImpl` | `service` / `service.impl` | Inserción en `auditoria` (nunca actualiza ni borra). | `registrar(AccionAuditoria, Map detalle, String dniIntentado, Usuario)`: se une a la transacción en curso. `registrarLoginFallido(String dni, Usuario, String motivo)`: transacción propia (`REQUIRES_NEW`), guarda `{"motivo": ...}` en `detalle_cambio`. |
| `AccionAuditoria` | `model` | Enum con las acciones de RF-08: `LOGIN_OK`, `LOGIN_FALLIDO`, `CREAR_USUARIO`, `MODIFICAR_USUARIO`, `CAMBIAR_ESTADO_USUARIO`, `REGISTRAR_INCIDENCIA`, `EXPORTAR_REPORTE`. El nombre es el valor de `accion_realizada`. | — |
| `LoginRequest` | `dto.request` | Record `dni` (`@Pattern ^[0-9]{8}$`) y `contrasena` (`@NotBlank`). Su `toString()` oculta la contraseña. | — |
| `LoginResponse` | `dto.response` | Record `token`, `tipo` (`"Bearer"`), `expiraEn`, `usuario`. | `bearer(token, expiraEn, usuario)` → respuesta con tipo `Bearer`. |
| `UsuarioResumenResponse` | `dto.response` | Record `idUsuario`, `dni`, `nombres`, `apellidoPaterno`, `apellidoMaterno`, `rol`, `idZona`. No incluye la contraseña. | `desde(Usuario)` → resumen (llamar dentro de una transacción: `rol` es LAZY). |
| `ErrorRespuesta` | `exception` | Formato uniforme de error `{ timestamp, status, mensaje, detalles }`. | `de(status, mensaje, detalles)`. |
| `CredencialesInvalidasException` | `exception` | Login rechazado, siempre con `MENSAJE` = "DNI o contraseña incorrectos". | — |
| `GlobalExceptionHandler` | `exception` | `@RestControllerAdvice`: credenciales inválidas → 401; errores de `@Valid` → 400 con un detalle por campo; JSON ilegible → 400. | — |

### Flujo de `POST /api/auth/login`

1. `SecurityConfig` deja pasar la ruta sin token.
2. `AuthController.login` recibe el JSON; `@Valid` rechaza con 400 un DNI que no tenga 8 dígitos (no se
   consulta la BD).
3. `AuthServiceImpl.login` (transacción) busca con `UsuarioDao.findByDni`:
   - No existe → compara contra un hash ficticio, `AuditoriaService.registrarLoginFallido(dni, null, "DNI_NO_REGISTRADO")`
     y lanza `CredencialesInvalidasException`.
   - Contraseña distinta (`PasswordEncoder.matches`) → `LOGIN_FALLIDO` con el usuario y motivo `CONTRASENA_INCORRECTA`.
   - `estadoActivo = false` → `LOGIN_FALLIDO` con motivo `USUARIO_INACTIVO`.
   - Correcto → `TokenService.generarToken`, `AuditoriaService.registrar(LOGIN_OK, ...)` y se arma `LoginResponse`.
4. `GlobalExceptionHandler` transforma la excepción en 401 con el mensaje genérico; el `LOGIN_FALLIDO` ya quedó
   confirmado en la BD por su transacción propia.

En las demás rutas, el `BearerTokenAuthenticationFilter` de Spring Security valida firma y vencimiento con
`JwtDecoder`, convierte el claim `rol` en `ROLE_<rol>` y aplica las reglas de `SecurityConfig`.

### Configuración

- `application.properties`: `jwt.secreto=${JWT_SECRET}`, `jwt.expiracion=8h`.
- `backend/.env.example`: añade `JWT_SECRET`, `ADMIN_DNI`, `ADMIN_PASSWORD`, `ADMIN_NOMBRES`, `ADMIN_APELLIDO_PATERNO`.
- Dependencia nueva: `spring-boot-starter-oauth2-resource-server`.

### Cómo probar

```
cd backend
./mvnw -q verify
```
Pasan 24 tests sin BD: `AuthControllerTest` (login 200 sin contraseña en la respuesta, 401 genérico, 400 por
DNI inválido, 401 sin token o con token alterado, 200 en `/api/auth/yo` con token, 403 de un Vigilante en
`/api/auditoria`), `AuthServiceImplTest` (éxito y los tres tipos de fallo con su auditoría),
`JwtTokenServiceImplTest` (claims y vencimiento de 8 h, secreto corto rechazado), `AdminSeedRunnerTest`
(crear, actualizar contraseña, variables inválidas) y `MapeoEntidadesTest`.

Con la BD (CMD, desde `backend`):
```
set "ADMIN_DNI=12345678"
set "ADMIN_PASSWORD=<contraseña>"
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local,seed
```
Crea o actualiza el Administrador (detener con Ctrl+C). Luego, con `.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local`:
```
curl -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d "{\"dni\":\"12345678\",\"contrasena\":\"<contraseña>\"}"
curl http://localhost:8080/api/auth/yo -H "Authorization: Bearer <token>"
```
`JWT_SECRET` (mínimo 32 caracteres) debe estar en el entorno o en `application-local.properties`.

## Ajuste de zona — ubicación y búsqueda con filtros (RF-09)

La tabla `zona` guarda ahora su ubicación: `departamento`, `provincia`, `distrito` (obligatorios) y `referencia`
(opcional, hasta 150 caracteres), con el índice `idx_zona_ubicacion (departamento, provincia, distrito)`. El
backend ofrece una búsqueda de zonas con filtros opcionales y combinables, paginada y ordenada por nombre, que
usará el endpoint `GET /api/zonas` de RF-09.

### Clases nuevas y modificadas

| Clase | Paquete | Responsabilidad | Métodos públicos principales |
|---|---|---|---|
| `Zona` (modificada) | `model` | Campos `departamento` (50), `provincia` (50), `distrito` (80) no nulos y `referencia` (150) opcional. | Getters y setters de los cuatro campos. |
| `ZonaFiltro` | `dto.request` | Record con los filtros `nombre`, `departamento`, `provincia`, `distrito`, `activo`, `q`. Un valor `null` o en blanco no filtra. | — |
| `ZonaResponse` | `dto.response` | Record `idZona`, `nombreZona`, `departamento`, `provincia`, `distrito`, `referencia`, `descripcion`, `estadoActivo`. | `desde(Zona)` → DTO. |
| `ZonaDao` (modificada) | `dao` | Ahora también extiende `JpaSpecificationExecutor<Zona>`. | `static Specification<Zona> conFiltros(ZonaFiltro)`: condición AND con los filtros que tengan valor. `nombre` → `lower(nombre_zona) LIKE %x%`; `departamento`, `provincia`, `distrito` → igualdad sin mayúsculas; `activo` → `estado_activo = x`; `q` → `referencia` o `descripcion` contienen el texto. Escapa `%`, `_` y `\` para buscarlos literalmente. Se usa con `findAll(Specification, Pageable)`. |
| `ZonaService` / `ZonaServiceImpl` | `service` / `service.impl` | Lógica de búsqueda de zonas. Constante `TAMANO_MAXIMO = 100`. | `buscar(ZonaFiltro filtro, int pagina, int tamano)` → `Page<ZonaResponse>`. Transacción de solo lectura; `filtro` nulo = todas; página negativa → 0; tamaño acotado a 1..100; orden por `nombre_zona` sin distinguir mayúsculas. |

### Flujo de una búsqueda

1. (Fase 4) El controller de RF-09 arma un `ZonaFiltro` con los query params y llama a `ZonaService.buscar`.
2. `ZonaServiceImpl.buscar` crea un `PageRequest` con la página y el tamaño acotados y el orden
   `lower(nombre_zona) ASC`.
3. `ZonaDao.findAll(ZonaDao.conFiltros(filtro), pageable)` genera, por ejemplo para `nombre=sede&departamento=Lima&q=larco`:
   ```sql
   SELECT ... FROM zona
   WHERE lower(nombre_zona) LIKE '%sede%' ESCAPE '\'
     AND lower(departamento) = 'lima'
     AND (lower(referencia) LIKE '%larco%' ESCAPE '\' OR lower(descripcion) LIKE '%larco%' ESCAPE '\')
   ORDER BY lower(nombre_zona) OFFSET 0 ROWS FETCH FIRST 20 ROWS ONLY
   ```
   más un `SELECT count(*)` con el mismo `WHERE` para el total.
4. Cada `Zona` se convierte en `ZonaResponse`.

### Cómo probar

```
cd backend
./mvnw -q verify
```
`ZonaServiceImplTest` (16 tests) carga cinco zonas en H2 en memoria (modo PostgreSQL, solo en tests) y ejecuta
la búsqueda real: sin filtros, nombre parcial sin mayúsculas, departamento + provincia + distrito, distrito
exacto (no parcial), activas/inactivas, texto libre en referencia y en descripción, nombre + estado, todos los
filtros juntos, filtros en blanco, sin coincidencias, `%` y `_` literales, paginación y acotado de página y tamaño.
La dependencia `com.h2database:h2` tiene scope `test`: no se usa al ejecutar la aplicación.

## Fase 3 — Catálogos y registro de incidencias (RF-03)

El frontend obtiene los catálogos activos (zonas, tipos de evento, niveles de gravedad) para armar los selectores
del formulario móvil. El vigilante (o el Administrador) registra la incidencia con `POST /api/incidencias`: el
usuario se toma del token, se rechazan catálogos inexistentes o dados de baja, fechas futuras y descripciones de
menos de 20 caracteres cuando el tipo es "Otro". Cada registro se audita como `REGISTRAR_INCIDENCIA`.

### Clases nuevas y modificadas

| Clase | Paquete | Responsabilidad | Métodos públicos principales |
|---|---|---|---|
| `CatalogoController` | `controller` | Catálogos activos en `/api/catalogos`, para cualquier usuario autenticado. | `zonas()` → `List<ZonaResponse>` (`GET /zonas`). `tiposEvento()` → `List<TipoEventoResponse>` (`GET /tipos-evento`). `nivelesGravedad()` → `List<NivelGravedadResponse>` (`GET /niveles-gravedad`). |
| `CatalogoService` / `CatalogoServiceImpl` | `service` / `service.impl` | Lectura (transacción de solo lectura) de los catálogos con `estado_activo = true`. | `listarZonasActivas()`: ordenadas por nombre. `listarTiposEventoActivos()`: ordenados por nombre. `listarNivelesGravedadActivos()`: de menos a más grave (`orden`). |
| `IncidenciaController` | `controller` | Alta de incidencias. | `registrar(IncidenciaRequest, Jwt)` → `IncidenciaResponse` con 201 (`POST /api/incidencias`, roles Vigilante y Administrador). El id del usuario es el `sub` del token. |
| `IncidenciaService` / `IncidenciaServiceImpl` | `service` / `service.impl` | Reglas de RF-03. Constantes `TIPO_OTRO = "Otro"`, `MIN_DESCRIPCION_OTRO = 20`, `TOLERANCIA_RELOJ = 2 min`. | `registrar(IncidenciaRequest, Long idUsuario)` → `IncidenciaResponse`. Lanza `CredencialesInvalidasException` si el usuario no existe o está inactivo, y `ReglaNegocioException` si la zona, el tipo o el nivel no existe o está inactivo, si la fecha supera la hora actual más la tolerancia o si un tipo "Otro" trae menos de 20 caracteres. |
| `IncidenciaRequest` | `dto.request` | Record `idZona`, `idTipoEvento`, `idNivelGravedad` (`@NotNull`), `descripcion` (`@NotBlank`, máximo 2000) y `fechaHora` opcional (`OffsetDateTime`). No lleva usuario. | — |
| `IncidenciaResponse` | `dto.response` | Record `idIncidencia`, `fechaHora`, `descripcion`, `zona`, `tipoEvento`, `nivelGravedad`, `idUsuario`. Sin datos sensibles del usuario. | `desde(Incidencia)` (dentro de la transacción: las relaciones son LAZY). |
| `TipoEventoResponse` | `dto.response` | Record `idTipoEvento`, `nombreTipoEvento`. | `desde(TipoEvento)`. |
| `NivelGravedadResponse` | `dto.response` | Record `idNivelGravedad`, `nombreNivel`, `orden` (para colorear los botones de gravedad). | `desde(NivelGravedad)`. |
| `ReglaNegocioException` | `exception` | Datos con formato válido que incumplen una regla del negocio. `GlobalExceptionHandler` la responde con 400 y su mensaje. | `ReglaNegocioException(String mensaje)`. |
| `RelojConfig` | `config` | Bean `Clock` en zona `America/Lima` (`ZONA_LIMA`); los servicios lo usan para "ahora" y los tests lo reemplazan por un reloj fijo. | `reloj()` → `Clock`. |
| `ZonaDao` (modificado) | `dao` | Nuevo método derivado. | `findByEstadoActivoTrueOrderByNombreZonaAsc()`. |
| `TipoEventoDao` (modificado) | `dao` | Nuevo método derivado. | `findByEstadoActivoTrueOrderByNombreTipoEventoAsc()`. |

### Flujo de `POST /api/incidencias`

1. `SecurityConfig` valida el JWT y exige rol Vigilante o Administrador (otro rol → 403, sin token → 401).
2. `IncidenciaController.registrar` recibe el JSON; `@Valid` responde 400 si falta un id o la descripción.
3. `IncidenciaServiceImpl.registrar` (una transacción):
   1. `UsuarioDao.findById(sub del token)` y verifica que esté activo.
   2. `ZonaDao`, `TipoEventoDao` y `NivelGravedadDao.findById`: cada uno debe existir y estar activo.
   3. Recorta la descripción; si el tipo se llama "Otro" (sin distinguir mayúsculas) exige 20 caracteres.
   4. `fechaHora` vacía → hora actual del `Clock`; si es posterior a ahora + 2 minutos, se rechaza.
   5. `IncidenciaDao.save` inserta la fila (`fecha_registro` la pone la BD con `DEFAULT now()`).
   6. `AuditoriaService.registrar(REGISTRAR_INCIDENCIA, {idIncidencia, idZona, idTipoEvento, idNivelGravedad}, null, usuario)`
      en la misma transacción: si falla la auditoría, tampoco queda la incidencia.
4. Responde 201 con `IncidenciaResponse`. Las excepciones las traduce `GlobalExceptionHandler` al formato
   `{ timestamp, status, mensaje, detalles }`.

### Cómo probar

```
cd backend
./mvnw -q verify
```
Pasan 60 tests. Nuevos: `IncidenciaServiceImplTest` (15: registro válido con usuario del token y auditoría,
fecha por defecto, fecha futura y tolerancia, zona inexistente o inactiva, tipo y nivel inactivos, regla de
"Otro" con 19/20 caracteres, espacios y mayúsculas, usuario inactivo o inexistente; en cada rechazo se verifica
que no se guarde ni se audite) y `CatalogoServiceImplTest` (4).

Con la BD (`.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local`) y un token de login:
```
curl http://localhost:8080/api/catalogos/zonas -H "Authorization: Bearer <token>"
curl http://localhost:8080/api/catalogos/tipos-evento -H "Authorization: Bearer <token>"
curl http://localhost:8080/api/catalogos/niveles-gravedad -H "Authorization: Bearer <token>"
curl -X POST http://localhost:8080/api/incidencias -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d "{\"idZona\":1,\"idTipoEvento\":1,\"idNivelGravedad\":2,\"descripcion\":\"Persona sospechosa en la puerta\"}"
```
La última debe responder 201. Para comprobar la auditoría:
`SELECT accion_realizada, detalle_cambio, id_usuario FROM auditoria WHERE accion_realizada = 'REGISTRAR_INCIDENCIA' ORDER BY fecha_hora DESC;`

---

## Fase 4 — Gestión de usuarios (RF-02) y de catálogos (RF-09)

El Administrador da de alta, edita, reasigna de zona y activa/desactiva al personal, y administra zonas, tipos de
evento y niveles de gravedad. No existe `DELETE`: la baja es lógica (`estado_activo`). Las contraseñas se guardan
con BCrypt y nunca salen en las respuestas. Cualquier usuario autenticado puede cambiar su propia contraseña. Cada
cambio se audita con los valores antes y después.

### Clases nuevas y modificadas

| Clase | Paquete | Responsabilidad | Métodos públicos principales |
|---|---|---|---|
| `UsuarioController` | `controller` | `/api/usuarios` (Administrador) y `/api/usuarios/me/contrasena` (cualquier rol). El actor es el `sub` del token. | `buscar(idRol, idZona, activo, q, page, size)` → `PaginaResponse<UsuarioResponse>` (`GET`). `obtener(id)` (`GET /{id}`). `crear(UsuarioCrearRequest, Jwt)` → 201 (`POST`). `actualizar(id, UsuarioActualizarRequest, Jwt)` (`PUT /{id}`). `cambiarEstado(id, CambioEstadoRequest, Jwt)` (`PATCH /{id}/estado`). `cambiarContrasenaPropia(CambioContrasenaRequest, Jwt)` → 204 (`PATCH /me/contrasena`). |
| `UsuarioService` / `UsuarioServiceImpl` | `service` / `service.impl` | Reglas de RF-02. Constantes `ROL_ADMINISTRADOR`, `ROL_VIGILANTE`, `TAMANO_MAXIMO = 100`. | `buscar(UsuarioFiltro, pagina, tamano)` → `Page<UsuarioResponse>` ordenada por apellidos y nombres. `obtener(Long)` (404 si no existe). `crear(request, idActor)`: DNI único (409), rol existente, hash BCrypt, audita `CREAR_USUARIO`. `actualizar(id, request, idActor)`: DNI único frente a otros, contraseña opcional, audita `MODIFICAR_USUARIO` solo si algo cambió. `cambiarEstado(id, activo, idActor)`: audita `CAMBIAR_ESTADO_USUARIO` solo si cambia. `cambiarContrasenaPropia(idUsuario, request)`: valida la actual, exige una distinta, audita `CAMBIAR_CONTRASENA`. |
| `ZonaController` | `controller` | `/api/zonas` (Administrador). | `buscar(nombre, departamento, provincia, distrito, activo, q, page, size)` → `PaginaResponse<ZonaResponse>` con el contrato de RF-09. `obtener(id)`, `crear(ZonaRequest, Jwt)` → 201, `actualizar(id, ZonaRequest, Jwt)`, `cambiarEstado(id, CambioEstadoRequest, Jwt)`. |
| `ZonaService` / `ZonaServiceImpl` (ampliados) | `service` / `service.impl` | Además de `buscar`, el alta y la edición con nombre único sin distinguir mayúsculas. | `obtener(Integer)`. `crear(request, idActor)` → audita `CREAR_ZONA`. `actualizar(id, request, idActor)` → `MODIFICAR_ZONA`. `cambiarEstado(id, activo, idActor)` → `CAMBIAR_ESTADO_ZONA`. |
| `TipoEventoController` | `controller` | `/api/tipos-evento` (Administrador). | `listar()` (todos, por nombre), `crear(TipoEventoRequest, Jwt)` → 201, `actualizar(id, TipoEventoRequest, Jwt)` (`PUT /{id}`), `cambiarEstado(id, CambioEstadoRequest, Jwt)` (`PATCH /{id}/estado`). |
| `TipoEventoService` / `TipoEventoServiceImpl` | `service` / `service.impl` | Nombre único sin distinguir mayúsculas; el tipo "Otro" no se puede renombrar porque la regla de 20 caracteres de RF-03 depende de su nombre. | `listar()`. `crear(request, idActor)` → `CREAR_TIPO_EVENTO`. `actualizar(id, request, idActor)` → `MODIFICAR_TIPO_EVENTO`. `cambiarEstado(id, activo, idActor)` → `CAMBIAR_ESTADO_TIPO_EVENTO`. |
| `NivelGravedadController` | `controller` | `/api/niveles-gravedad` (Administrador). | `listar()` (todos, por `orden`). `actualizar(id, NivelGravedadRequest, Jwt)` (`PUT /{id}`). |
| `NivelGravedadService` / `NivelGravedadServiceImpl` | `service` / `service.impl` | Edición de nombre y orden. `orden` es UNIQUE en la BD: si el orden pedido lo tiene otro nivel, ese nivel pasa por `ORDEN_TEMPORAL` (`Short.MIN_VALUE`) y luego toma el orden anterior, todo en una transacción. | `listar()`. `actualizar(id, request, idActor)` → audita `MODIFICAR_NIVEL_GRAVEDAD` con `antes`, `despues` e `intercambiadoCon` si hubo intercambio. |
| `CatalogoController` / `CatalogoService` (modificados) | `controller` / `service` | Roles para el formulario de usuarios. | `roles()` / `listarRoles()` → `List<RolResponse>` (`GET /api/catalogos/roles`, cualquier usuario autenticado). |
| `SoporteServicio` | `service.impl` | Utilidad interna: actor del token (activo o 401), recorte de textos opcionales y detalle `{id, antes, despues}` de auditoría. | (paquete) `actor`, `opcional`, `cambio`. |
| `UsuarioDao` (modificado) | `dao` | Búsqueda con filtros (`JpaSpecificationExecutor`); el listado carga rol y zona en la misma consulta (`@EntityGraph`). | `conFiltros(UsuarioFiltro)`, `existsByDniAndIdUsuarioNot`, `findAll(Specification, Pageable)`. |
| `ZonaDao`, `TipoEventoDao`, `NivelGravedadDao` (modificados) | `dao` | Unicidad sin distinguir mayúsculas y consultas de administración. | `existsByNombreZonaIgnoreCase[AndIdZonaNot]`, `existsByNombreTipoEventoIgnoreCase[AndIdTipoEventoNot]`, `findAllByOrderByNombreTipoEventoAsc`, `existsByNombreNivelIgnoreCaseAndIdNivelGravedadNot`, `findByOrden`. |
| `FiltrosTexto` | `dao` | Utilidad interna compartida por `ZonaDao` y `UsuarioDao`: `LIKE` sin distinguir mayúsculas con `%`/`_` literales e igualdad sin mayúsculas. | (paquete) `limpiar`, `contiene`, `igualSinMayusculas`. |
| `UsuarioCrearRequest`, `UsuarioActualizarRequest` | `dto.request` | DNI de 8 dígitos, nombres (80), apellidos (50), contraseña de 8 a 72 caracteres (obligatoria al crear, opcional al editar), `idRol`, `idZona`. Su `toString()` oculta la contraseña. | — |
| `CambioContrasenaRequest` | `dto.request` | `contrasenaActual`, `contrasenaNueva` (8 a 72). | — |
| `CambioEstadoRequest` | `dto.request` | `activo` (obligatorio). Lo usan usuarios, zonas y tipos de evento. | — |
| `UsuarioFiltro`, `ZonaRequest`, `TipoEventoRequest`, `NivelGravedadRequest` | `dto.request` | Filtros del listado de usuarios y cuerpos de alta/edición de catálogos con los largos de la BD; `orden` ≥ 1. | — |
| `UsuarioResponse` | `dto.response` | Usuario con `idRol`, `rol`, `idZona`, `nombreZona` y `estadoActivo`. Sin contraseña. | `desde(Usuario)`. |
| `PaginaResponse<T>` | `dto.response` | Formato de listados: `contenido`, `pagina`, `tamano`, `totalElementos`, `totalPaginas`. | `desde(Page<T>)`. |
| `RolResponse` | `dto.response` | `idRol`, `nombreRol`. | `desde(Rol)`. |
| `TipoEventoResponse`, `NivelGravedadResponse` (modificados) | `dto.response` | Incluyen `estadoActivo`. | `desde(...)`. |
| `RecursoNoEncontradoException`, `DatoDuplicadoException` | `exception` | `GlobalExceptionHandler` las responde con 404 y 409. Además, una `DataIntegrityViolationException` (dos altas simultáneas con el mismo dato único) se responde con 409 genérico. | Constructor `(String mensaje)`. |
| `AccionAuditoria` (modificado) | `model` | Acciones nuevas: `CAMBIAR_CONTRASENA`, `CREAR_ZONA`, `MODIFICAR_ZONA`, `CAMBIAR_ESTADO_ZONA`, `CREAR_TIPO_EVENTO`, `MODIFICAR_TIPO_EVENTO`, `CAMBIAR_ESTADO_TIPO_EVENTO`, `MODIFICAR_NIVEL_GRAVEDAD`. | — |
| `SecurityConfig` (modificado) | `config` | `PATCH /api/usuarios/me/contrasena` para cualquier usuario con token (se evalúa antes que `/api/usuarios/**`); `/api/zonas/**`, `/api/tipos-evento/**` y `/api/niveles-gravedad/**` solo Administrador. | — |

### Flujo de `PUT /api/usuarios/{id}`

1. `SecurityConfig` valida el JWT y exige rol Administrador (otro rol → 403, sin token → 401).
2. `UsuarioController.actualizar` recibe el JSON; `@Valid` responde 400 si el DNI no tiene 8 dígitos, falta un
   campo obligatorio o la contraseña enviada no tiene entre 8 y 72 caracteres.
3. `UsuarioServiceImpl.actualizar` (una transacción):
   1. `UsuarioDao.findById(sub del token)`: el Administrador debe seguir activo (si no → 401).
   2. `UsuarioDao.findById(id)`: el usuario a editar debe existir (si no → 404).
   3. `UsuarioDao.existsByDniAndIdUsuarioNot`: el DNI no puede tenerlo otro usuario (si no → 409).
   4. `RolDao.findById`: el rol debe existir. Si el Administrador se edita a sí mismo, no puede quitarse el rol
      Administrador (400).
   5. Zona: un Vigilante debe tener zona; una zona nueva o distinta de la actual debe existir y estar activa
      (`ZonaDao.findById`). La zona actual se conserva aunque se haya desactivado después.
   6. Copia los datos; si llegó contraseña, guarda `PasswordEncoder.encode(...)`. Hibernate emite el `UPDATE` al
      confirmar la transacción.
   7. Si algo cambió, `AuditoriaService.registrar(MODIFICAR_USUARIO, {idUsuario, antes, despues, contrasenaCambiada}, null, admin)`.
      `antes` y `despues` tienen DNI, nombres, apellidos, rol, zona y estado; nunca el hash.
4. Responde 200 con `UsuarioResponse`.

### Cómo probar

```
cd backend
./mvnw -q verify
```
Pasan 109 tests. Nuevos: `UsuarioServiceImplTest` (17: alta con hash y auditoría sin contraseña, DNI repetido,
Vigilante sin zona, Supervisor sin zona, zona inactiva, edición con antes/después, zona inactiva conservada,
edición sin cambios no audita, autoprotección del Administrador, cambio de estado, 404, actor inactivo, cambio de
contraseña propia correcto, con la actual errónea e igual a la actual), `TipoEventoServiceImplTest` (7),
`NivelGravedadServiceImplTest` (5, contra H2: intercambio de orden con la restricción UNIQUE real),
`ZonaServiceImplTest` (6 más: alta, duplicado sin mayúsculas, edición, estado), `UsuarioControllerTest` (10) y
`ZonaControllerTest` (4): 401 sin token, 403 para Supervisor y Vigilante, 204 al cambiar la contraseña propia
como Vigilante, `contrasena` ausente en el JSON, formato de página de RF-09.

Con la BD (`.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local`) y un token de Administrador (CMD):
```
curl -X POST http://localhost:8080/api/usuarios -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d "{\"dni\":\"33333333\",\"nombres\":\"Luis\",\"apellidoPaterno\":\"Rojas\",\"contrasena\":\"ClaveInicial1\",\"idRol\":3,\"idZona\":1}"
curl "http://localhost:8080/api/usuarios?q=rojas" -H "Authorization: Bearer <token>"
curl "http://localhost:8080/api/zonas?distrito=miraflores&activo=true" -H "Authorization: Bearer <token>"
curl -X PUT http://localhost:8080/api/niveles-gravedad/1 -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d "{\"nombreNivel\":\"Baja\",\"orden\":2}"
```
El primero responde 201 (repetirlo → 409); el último deja "Baja" en orden 2 y "Media" en orden 1. Con el token del
vigilante creado:
```
curl -X PATCH http://localhost:8080/api/usuarios/me/contrasena -H "Authorization: Bearer <token vigilante>" -H "Content-Type: application/json" -d "{\"contrasenaActual\":\"ClaveInicial1\",\"contrasenaNueva\":\"ClaveNueva123\"}"
```
→ 204; ese mismo token en `GET /api/usuarios` → 403. Auditoría:
`SELECT accion_realizada, detalle_cambio, id_usuario FROM auditoria ORDER BY id_auditoria DESC LIMIT 10;`
La colección de Postman (`postman/collections/SGI-SEGANDINA`) incluye todas estas peticiones.

---

## Fase 5 — Historial (RF-04), dashboard (RF-05) y despliegue (RF-07)

Supervisores y Administradores consultan el historial paginado de incidencias y las métricas del dashboard. Todos
estos endpoints comparten un mismo filtro: un periodo predefinido o un rango personalizado de días (en hora de
Lima, máximo 366 días) más zona, nivel de gravedad y tipo de evento opcionales. El despliegue lee la vista
`v_despliegue_por_zona` y no depende del rango.

### Clases nuevas y modificadas

| Clase | Paquete | Responsabilidad | Métodos públicos principales |
|---|---|---|---|
| `Periodo` | `dto.request` | Enum `HOY`, `ULTIMOS_7_DIAS`, `ULTIMOS_30_DIAS`, `MES_ACTUAL`, `ANIO_ACTUAL`, `PERSONALIZADO`. | — |
| `RangoFechas` | `dto.request` | Record `desde`, `hasta` (días inclusive). Es la única clase que calcula rangos; la reutilizarán los reportes (RF-06). Constantes `MAX_DIAS = 366` y `PERIODO_POR_DEFECTO = ULTIMOS_30_DIAS`. | `resolver(Periodo, LocalDate desde, LocalDate hasta, Clock)` → `RangoFechas`: calcula el periodo con "hoy" en Lima; lanza `ReglaNegocioException` si hay fechas sin `PERSONALIZADO`, faltan con `PERSONALIZADO`, `desde > hasta` o hay más de 366 días. `inicio()` / `fin()` → `OffsetDateTime` en Lima del intervalo semiabierto `[desde 00:00, hasta+1 00:00)`. `dias()` → largo inclusive. |
| `IncidenciaFiltro` | `dto.request` | Record de query params `periodo`, `desde`, `hasta` (`AAAA-MM-DD`), `idZona`, `idNivelGravedad`, `idTipoEvento`. Spring lo arma desde la URL (sin anotación en el controller). | — |
| `Agrupacion` | `dto.request` | Enum `DIA`, `SEMANA`, `MES` para la serie por tiempo. | `porDefecto(RangoFechas)` → `DIA` hasta 31 días, `SEMANA` hasta 180, `MES` si es mayor. |
| `IncidenciaDao` (modificado) | `dao` | Ahora también `JpaSpecificationExecutor` y el fragmento `IncidenciaEstadisticasDao`. | `findAll(Specification, Pageable)` con `@EntityGraph` de zona, tipo, nivel y usuario (una sola consulta por página). `conFiltros(RangoFechas, IncidenciaFiltro)` → `Specification` con `fechaHora >= inicio AND fechaHora < fin` y los filtros que tengan valor. |
| `IncidenciaEstadisticasDao` / `IncidenciaEstadisticasDaoImpl` | `dao` | Consultas agregadas con `EntityManager`. Las condiciones opcionales se agregan al texto solo cuando tienen valor, para no enviar parámetros nulos a PostgreSQL. | `contarPorZona`, `contarPorTipo`, `contarPorNivel(RangoFechas, IncidenciaFiltro)` → `List<ConteoAgrupado>` (JPQL, mayor total primero). `contarPorDia(...)` → `List<ConteoDiario>` (nativa, agrupa por `fecha_hora AT TIME ZONE 'America/Lima'`; solo días con datos). |
| `ConteoAgrupado`, `ConteoDiario` | `dao` | Records de resultado: `(id, nombre, total)` y `(dia, total)`. | — |
| `DespliegueZona` | `model` | Entidad `@Immutable` de la vista `v_despliegue_por_zona` (`idZona`, `nombreZona`, `vigilantesActivos`), sin setters. | Getters. |
| `DespliegueZonaDao` | `dao` | Solo lectura (`Repository`). | `findAll(Sort)` → una fila por zona activa. |
| `IncidenciaService` / `IncidenciaServiceImpl` (modificados) | `service` / `service.impl` | Historial. Constante `TAMANO_MAXIMO = 100`. | `buscar(IncidenciaFiltro, int pagina, int tamano)` → `Page<IncidenciaHistorialResponse>`, orden `fechaHora` y luego `idIncidencia` descendentes; tamaño acotado entre 1 y 100. |
| `DashboardService` / `DashboardServiceImpl` | `service` / `service.impl` | Métricas de RF-05 y despliegue de RF-07 (transacciones de solo lectura). | `kpis(IncidenciaFiltro)` → `KpisResponse`. `incidenciasPorZona` / `incidenciasPorTipo(IncidenciaFiltro)` → `List<ConteoResponse>`. `incidenciasPorTiempo(IncidenciaFiltro, Agrupacion)` → `SerieTiempoResponse`, con todos los tramos del rango en orden (0 si no hay datos). `despliegue()` → `List<DespliegueZonaResponse>` por nombre de zona. |
| `IncidenciaController` (modificado) | `controller` | Historial. | `buscar(IncidenciaFiltro, page, size)` → `PaginaResponse<IncidenciaHistorialResponse>` (`GET /api/incidencias`). |
| `DashboardController` | `controller` | `/api/dashboard`, roles Administrador y Supervisor. | `kpis` (`GET /kpis`), `incidenciasPorZona` (`GET /incidencias-por-zona`), `incidenciasPorTipo` (`GET /incidencias-por-tipo`), `incidenciasPorTiempo(filtro, agrupacion)` (`GET /incidencias-por-tiempo`), `despliegue()` (`GET /despliegue`). |
| `IncidenciaHistorialResponse` | `dto.response` | Fila del historial: `idIncidencia`, `fechaHora`, `fechaRegistro`, `descripcion`, `zona`, `tipoEvento`, `nivelGravedad` y `usuario` (`Registrador`: `idUsuario`, `dni`, `nombreCompleto`). | `desde(Incidencia)`. |
| `KpisResponse` | `dto.response` | `desde`, `hasta`, `incidenciasHoy`, `incidenciasPeriodo`, `porGravedad` (`ConteoGravedad`: id, nombre, orden, total). | — |
| `ConteoResponse` | `dto.response` | `(id, nombre, total)` para los gráficos por zona y por tipo. | `desde(ConteoAgrupado)`. |
| `SerieTiempoResponse` | `dto.response` | `agrupacion`, `desde`, `hasta`, `puntos` (`Punto`: `inicio`, `fin`, `total`). | — |
| `DespliegueZonaResponse` | `dto.response` | `(idZona, nombreZona, vigilantesActivos)`. | `desde(DespliegueZona)`. |
| `GlobalExceptionHandler` (modificado) | `exception` | Un query param que no se puede convertir (`periodo=AYER`, `desde=24-10-2026`, `agrupacion=ANIO`) responde 400 con `"<campo>: valor no válido '<valor>'"` en `detalles`. | `parametrosInvalidos(BindException)`, `tipoInvalido(MethodArgumentTypeMismatchException)`. |

### Flujo de `GET /api/dashboard/incidencias-por-tiempo?periodo=MES_ACTUAL&idZona=1`

1. `SecurityConfig` exige rol Administrador o Supervisor (`/api/dashboard/**`).
2. Spring arma `IncidenciaFiltro(MES_ACTUAL, null, null, 1, null, null)` con los query params; `agrupacion` llega
   como `null`. Un valor que no se puede convertir responde 400 sin llegar al servicio.
3. `DashboardServiceImpl.incidenciasPorTiempo`:
   1. `RangoFechas.resolver` calcula del día 1 del mes a hoy (hora de Lima); un rango inválido lanza
      `ReglaNegocioException` (400) antes de consultar la BD.
   2. Sin agrupación pedida, `Agrupacion.porDefecto` elige `DIA` (el mes tiene 31 días o menos).
   3. `IncidenciaDao.contarPorDia` ejecuta
      `SELECT to_char(i.fecha_hora AT TIME ZONE 'America/Lima', 'YYYY-MM-DD') AS dia, COUNT(*) FROM incidencia i
      WHERE i.fecha_hora >= :inicio AND i.fecha_hora < :fin AND i.id_zona = :idZona GROUP BY dia ORDER BY dia`
      (puede usar el índice `idx_incidencia_zona (id_zona, fecha_hora DESC)`).
   4. Recorre el rango tramo a tramo (día, semana de lunes a domingo o mes calendario, recortados a los bordes),
      suma los conteos de cada tramo y pone 0 en los que no tienen datos.
4. Responde 200 con `SerieTiempoResponse`.

### Cómo probar

```
cd backend
./mvnw -q verify
```
Pasan 148 tests. Nuevos:
- `IncidenciaDaoTest` (5, contra H2 en modo PostgreSQL): el historial incluye las 00:00:00 y las 23:59:59 del
  día en Lima y excluye las 00:00:00 del día siguiente, ordena descendente y combina zona, nivel y tipo; los
  conteos por zona, tipo y nivel; el conteo por día agrupa en hora de Lima (las 03:30 UTC del 25 cuentan para
  el 24); un rango sin datos devuelve listas vacías.
- `RangoFechasTest` (12): periodo por defecto, cada periodo, límites del día en Lima, cambio de día (las 23:59:59
  de Lima ya son el día siguiente en UTC), fin de mes, año bisiesto (29 de febrero, 2028 completo = 366 días),
  rango de un día, rango invertido, rango de 367 días, `PERSONALIZADO` sin fechas, fechas sin `PERSONALIZADO` y
  agrupación por defecto en 31/32 y 180/181 días.
- `DashboardServiceImplTest` (9): serie sin datos (todo en 0), huecos rellenados, semanas recortadas, meses que
  cruzan el año con febrero bisiesto, agrupación por defecto, rango inválido sin consultar la BD, KPIs con
  niveles en 0 y niveles inactivos ocultos, conteos por zona y tipo, despliegue.
- `IncidenciaServiceImplTest` (+2): orden y tamaño máximo del historial, rango inválido.
- `DashboardControllerTest` (10): filtros y paginación llegan al servicio, 403 para Vigilante, 401 sin token,
  400 con `periodo`, fecha o `agrupacion` no válidos y con rango invertido.
- `MapeoEntidadesTest` (+1): `DespliegueZona` apunta a la vista y no tiene setters.

Con la BD (`.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local`) y un token de Supervisor o Administrador:
```
curl "http://localhost:8080/api/incidencias?periodo=ULTIMOS_7_DIAS&page=0&size=20" -H "Authorization: Bearer <token>"
curl "http://localhost:8080/api/dashboard/kpis" -H "Authorization: Bearer <token>"
curl "http://localhost:8080/api/dashboard/incidencias-por-tiempo?periodo=PERSONALIZADO&desde=2026-10-01&hasta=2026-10-24&agrupacion=SEMANA" -H "Authorization: Bearer <token>"
curl "http://localhost:8080/api/dashboard/despliegue" -H "Authorization: Bearer <token>"
curl "http://localhost:8080/api/incidencias?periodo=PERSONALIZADO&desde=2026-10-10&hasta=2026-10-01" -H "Authorization: Bearer <token>"
```
La última responde 400 ("La fecha desde no puede ser posterior a hasta"). Con un token de Vigilante, todas
responden 403. La colección de Postman incluye estas peticiones ("Historial …" y "Dashboard …") y toma
`periodo`, `desde` y `hasta` de las variables del environment.
