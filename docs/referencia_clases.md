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

---

## Fase 6 — Exportación de reportes en Excel y PDF (RF-06)

Administradores y Supervisores descargan el historial de incidencias en Excel (Apache POI) o PDF (OpenPDF) con
los mismos filtros y el mismo orden que el historial de la Fase 5. Cada formato es una implementación de
`ExportadorReporte`; el servicio consulta, elige el exportador, audita `EXPORTAR_REPORTE` y arma el nombre del
archivo con la fecha de hoy en Lima.

### Clases nuevas y modificadas

| Clase | Paquete | Responsabilidad | Métodos públicos principales |
|---|---|---|---|
| `FormatoReporte` | `export` | Enum `EXCEL` y `PDF` con su extensión y tipo de contenido. | `extension()` → `"xlsx"` / `"pdf"`. `tipoContenido()` → `MediaType` para `Content-Type`. |
| `DatosReporte` | `export` | Record de entrada de un exportador: `periodo` aplicado (nunca nulo), `rango` resuelto, `generadoEn` y `filas` (`List<IncidenciaHistorialResponse>`, ya ordenadas). | — |
| `ExportadorReporte` | `export` | Interfaz común de los formatos. Agregar un formato es agregar un bean que la implemente, sin tocar el servicio. | `formato()` → `FormatoReporte`. `exportar(DatosReporte)` → `byte[]` del archivo; con cero filas, solo encabezados. |
| `ExcelExportador` | `export` | `.xlsx` con una hoja `Incidencias` (constante `NOMBRE_HOJA`): encabezados en negrita, fila fija, autofiltro, fecha como celda de fecha en hora de Lima, descripción con ajuste de línea. | `exportar(DatosReporte)`. |
| `PdfExportador` | `export` | PDF A4 horizontal: título, `Periodo: …`, `Generado el: …`, `Total de incidencias: N` y una tabla cuyos encabezados se repiten en cada página. | `exportar(DatosReporte)`. |
| `ColumnasReporte` | `export` | (Solo del paquete) Encabezados, título y formatos que comparten Excel y PDF: fecha en Lima, `DNI - nombre` y etiqueta del periodo (`Últimos 30 días (25/09/2026 al 24/10/2026)`). | — |
| `ArchivoReporte` | `dto.response` | Record `nombreArchivo`, `formato`, `contenido` (bytes). | — |
| `ReporteService` / `ReporteServiceImpl` | `service` / `service.impl` | Exportación. Constantes `MAX_FILAS = 10 000` y `PREFIJO_ARCHIVO = "incidencias_"`. Recibe todos los `ExportadorReporte` y los indexa por formato (dos del mismo formato es un error al arrancar). | `exportar(FormatoReporte, IncidenciaFiltro, Long idUsuario)` → `ArchivoReporte`; lanza `CredencialesInvalidasException` (401) si el usuario está inactivo y `ReglaNegocioException` (400) si el rango no es válido o hay más de `MAX_FILAS` incidencias. |
| `ReporteController` | `controller` | `/api/reportes`, roles Administrador y Supervisor (regla ya existente en `SecurityConfig`). | `excel(IncidenciaFiltro, Jwt)` (`GET /excel`) y `pdf(IncidenciaFiltro, Jwt)` (`GET /pdf`) → `ResponseEntity<byte[]>` con `Content-Type` y `Content-Disposition: attachment; filename="…"`. |
| `IncidenciaDao` (modificado) | `dao` | Constante `ORDEN_HISTORIAL` (fecha y luego id descendentes), compartida por el historial y los reportes. | `findAll(Specification, Sort)` → `List<Incidencia>` sin paginar, con `@EntityGraph` de zona, tipo, nivel y usuario (una sola consulta). |
| `IncidenciaServiceImpl` (modificado) | `service.impl` | Usa `IncidenciaDao.ORDEN_HISTORIAL` en lugar de su constante privada. | — |

### Flujo de `GET /api/reportes/pdf?periodo=MES_ACTUAL&idZona=1`

1. `SecurityConfig` exige rol Administrador o Supervisor (`/api/reportes/**`); Vigilante → 403, sin token → 401.
2. Spring arma `IncidenciaFiltro(MES_ACTUAL, null, null, 1, null, null)`; un valor que no se puede convertir
   (`periodo=AYER`) responde 400 sin llegar al servicio.
3. `ReporteController.pdf` llama a `ReporteServiceImpl.exportar(PDF, filtro, <sub del token>)`, que en una
   transacción:
   1. Obtiene el usuario activo del token (`SoporteServicio.actor`).
   2. `RangoFechas.resolver` calcula del día 1 del mes a hoy en Lima; un rango inválido → 400, sin consultar ni
      auditar.
   3. `IncidenciaDao.count(conFiltros(rango, filtro))`; si supera 10 000 → 400.
   4. `IncidenciaDao.findAll(conFiltros(rango, filtro), ORDEN_HISTORIAL)` trae las incidencias con sus relaciones
      (`fecha_hora >= inicio AND fecha_hora < fin AND id_zona = 1 ORDER BY fecha_hora DESC, id_incidencia DESC`)
      y las convierte en `IncidenciaHistorialResponse`.
   5. `PdfExportador.exportar(new DatosReporte(MES_ACTUAL, rango, ahora, filas))` genera los bytes.
   6. `AuditoriaService.registrar(EXPORTAR_REPORTE, {formato: "PDF", periodo: "MES_ACTUAL", desde, hasta,
      idZona: 1, idNivelGravedad: null, idTipoEvento: null, totalRegistros}, null, usuario)`. Si algo falla
      antes del commit, el registro de auditoría se revierte junto con la operación.
   7. Devuelve `ArchivoReporte("incidencias_2026-10-24.pdf", PDF, bytes)`.
4. El controller responde 200 con `Content-Type: application/pdf` y
   `Content-Disposition: attachment; filename="incidencias_2026-10-24.pdf"`.

### Cómo probar

```
cd backend
./mvnw -q verify
```
Pasan 167 tests. Nuevos:
- `ExcelExportadorTest` (3): reabre el `.xlsx` con POI y revisa encabezados, valores de una fila (fecha en hora de
  Lima, `DNI - nombre`, acentos), el orden de las filas y que con cero filas solo queden los encabezados.
- `PdfExportadorTest` (3): el archivo empieza con `%PDF`; el texto extraído con OpenPDF contiene título, periodo,
  fecha de generación, total y los datos de la fila; con cero filas trae los encabezados y "Total de
  incidencias: 0"; con 80 filas hay más de una página y los encabezados se repiten en la segunda.
- `ReporteServiceImplTest` (6): elige el exportador del formato pedido, nombre con la fecha de Lima (a las 00:30
  ya es el día nuevo), periodo por defecto, detalle de auditoría con los filtros, rango inválido y más de
  10 000 filas sin generar ni auditar, usuario inactivo → 401, exportadores duplicados.
- `ReporteControllerTest` (6): Excel y PDF como adjunto con el nombre y tipo correctos y los filtros pasados al
  servicio, 403 para Vigilante, 401 sin token, 400 con `periodo=AYER` y 400 en JSON con un rango invertido.
- `IncidenciaDaoTest` (+1): la consulta sin paginar respeta el orden y carga las relaciones en la misma consulta.

Con la BD (`.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local`) y un token de Supervisor o Administrador:
```
curl -OJ "http://localhost:8080/api/reportes/excel?periodo=ULTIMOS_30_DIAS" -H "Authorization: Bearer <token>"
curl -OJ "http://localhost:8080/api/reportes/pdf?periodo=PERSONALIZADO&desde=2026-10-01&hasta=2026-10-24" -H "Authorization: Bearer <token>"
curl -OJ "http://localhost:8080/api/reportes/pdf?periodo=HOY&idZona=999" -H "Authorization: Bearer <token>"
```
`-OJ` guarda el archivo con el nombre que envía el servidor (`incidencias_<fecha>.xlsx` / `.pdf`). La última no
tiene resultados y genera un PDF con solo los encabezados. Cada descarga deja una fila `EXPORTAR_REPORTE` en
`auditoria` con los filtros en `detalle_cambio`. En Postman, las peticiones "Reportes Excel", "Reportes PDF" y
"Reportes PDF Personalizado" se ejecutan con "Send and Download" para guardar el archivo.

---

## Fase 7 — Frontend base: login, rutas por rol y registro de incidencias (RF-01, RF-03)

Aplicación Next.js 16 (App Router, TypeScript, Tailwind) en `/frontend`. El usuario inicia sesión con DNI y
contraseña; el Vigilante llega al formulario móvil de incidencias y el Administrador o Supervisor al dashboard.
La sesión (JWT) se guarda en `localStorage` y se cierra sola al vencer o ante un 401. En el backend se agrega CORS
para que el navegador pueda llamar a la API desde el dominio del frontend.

### Backend: clases nuevas y modificadas

| Clase | Paquete | Responsabilidad | Métodos públicos principales |
|---|---|---|---|
| `CorsConfig` | `config` | Reglas CORS de `/api/**`: orígenes de `cors.origenes-permitidos` (`CORS_ORIGENES`), métodos GET/POST/PUT/PATCH/DELETE/OPTIONS, headers `Authorization` y `Content-Type`, expone `Content-Disposition`, sin credenciales, preflight cacheado 1 h. | `corsConfigurationSource(String origenes)` → `CorsConfigurationSource`. |
| `SecurityConfig` (modificado) | `config` | Activa CORS en la cadena de filtros con `.cors(Customizer.withDefaults())`, que usa el bean de `CorsConfig`. | — |

### Frontend: módulos y componentes

| Archivo (`frontend/src/`) | Responsabilidad | Funciones / props principales |
|---|---|---|
| `lib/tipos.ts` | Tipos TypeScript de los DTO de la API (`Usuario`, `LoginResponse`, `Zona`, `TipoEvento`, `NivelGravedad`, `IncidenciaRequest`, `IncidenciaResponse`, `ErrorRespuesta`). | — |
| `lib/sesion.ts` | Almacén de la sesión en `localStorage` (clave `sgi.sesion`) con aviso a los suscriptores; recuerda el motivo del último cierre. | `guardarSesion(sesion)`, `borrarSesion(motivo = "manual" \| "expirada")`, `leerSesion()` → sesión vigente o `null`, `suscribirSesion(oyente)` → función para desuscribirse, `consumirMotivoCierre()` → motivo y lo olvida. |
| `lib/api.ts` | Instancia Axios con `baseURL = NEXT_PUBLIC_API_URL`. Interceptor de petición: agrega `Authorization: Bearer`. Interceptor de respuesta: un 401 de una petición con token llama a `borrarSesion("expirada")`. | `api`; `errorDeApi(error)` → `{ status, mensaje, detalles }` (lee el `ErrorRespuesta` del backend o informa falta de conexión). |
| `lib/servicios.ts` | Llamadas a la API que usan las pantallas. | `iniciarSesion(dni, contrasena)` → `Usuario` (guarda la sesión); `cargarCatalogos()` → `{ zonas, tipos, niveles }` (tres GET en paralelo); `registrarIncidencia(IncidenciaRequest)` → `IncidenciaResponse`. |
| `lib/roles.ts` | Rutas y menú por rol. | `rutaInicio(rol)` → `/incidencias/nueva` (Vigilante) o `/dashboard`; `menuDe(rol)` → opciones visibles; constantes `ROLES_REGISTRO` y `ROLES_GERENCIA`. |
| `context/SesionContext.tsx` | `SesionProvider` (en el layout raíz) lee la sesión con `useSyncExternalStore` y programa su cierre al llegar a `expiraEn`. | `useSesion()` → `{ cargando, sesion, cerrarSesion }`; `cerrarSesion()` borra la sesión, va a `/login` con `router.replace` y hace `router.refresh()` para descartar las páginas privadas guardadas en la caché del router. |
| `components/RutaProtegida.tsx` | Muestra la página solo con sesión y rol permitido. Sin sesión → `/login` (o `/login?motivo=expirada` si venció); otro rol → `rutaInicio(rol)`. | Props `roles: Rol[]`, `children`. |
| `components/SelectorRapido.tsx` | Grupo de botones grandes con semántica de radio (`role="radiogroup"`, `aria-checked`). | Props `titulo`, `opciones: { valor, etiqueta, clases? }[]`, `valor`, `onCambio`, `columnas`. |
| `components/Encabezado.tsx` | Barra azul marino con nombre y rol, menú filtrado por rol y botón "Cerrar sesión". | — |
| `components/Boton.tsx`, `Alerta.tsx`, `Cargando.tsx` | Botón (`primario`, `secundario`, `peligro`), mensaje (`error`, `aviso`, `exito`) e indicador de carga. | — |
| `app/login/` | `/login`: DNI de 8 dígitos (teclado numérico) y contraseña; mensaje genérico ante 401; aviso "Tu sesión venció" con `?motivo=expirada`; con sesión activa redirige a `rutaInicio`. Los campos (`CamposLogin`) se montan de nuevo al cambiar la sesión o al restaurarse la página desde el bfcache (`pageshow` con `persisted`), así que nunca reaparecen con contraseña, errores viejos o el botón en "Ingresando…"; el estado de carga se apaga siempre en un `finally`. El formulario desactiva el autocompletado del navegador (`autoComplete="off"` en el formulario y el DNI, `"new-password"` en la contraseña) para que no aparezcan credenciales prellenadas en equipos compartidos. | — |
| `app/(privado)/incidencias/nueva/` | `/incidencias/nueva` (Vigilante, Administrador): selectores de zona (preseleccionada con `usuario.idZona`), tipo y gravedad (verde, amarillo, naranja, rojo según `orden`), descripción con contador y mínimo de 20 caracteres para "Otro", fecha y hora opcional (por defecto la actual), botón fijo abajo en móvil y confirmación con el número de incidencia. | — |
| `app/(privado)/dashboard/` | `/dashboard` (Administrador, Supervisor): pantalla de bienvenida; los indicadores y gráficos se agregan después. | — |
| `app/page.tsx` | `/`: redirige a `rutaInicio(rol)` o a `/login`. | — |

### Flujo: login de un Vigilante y registro de una incidencia

1. `/login` → `FormularioLogin` valida el DNI (`^\d{8}$`) y llama a `iniciarSesion`, que hace
   `POST /api/auth/login`. El backend valida con BCrypt y responde `{ token, expiraEn, usuario }`.
2. `guardarSesion` escribe en `localStorage` y avisa a `SesionProvider`; el efecto del login ve la sesión y
   redirige a `rutaInicio("Vigilante")` = `/incidencias/nueva`.
3. `RutaProtegida` comprueba el rol; `FormularioIncidencia` llama a `cargarCatalogos()` (tres `GET /api/catalogos/...`
   con `Authorization: Bearer`) y marca la zona del vigilante.
4. Al enviar, valida en el cliente y llama a `registrarIncidencia` → `POST /api/incidencias`. El backend toma el
   usuario del token, valida reglas (fecha no futura, 20 caracteres para "Otro") e inserta en `incidencia`.
5. Con 201 se muestra la confirmación y se limpia el formulario (se conserva la zona). Con 400 se muestran
   `mensaje` y `detalles`. Con 401 el interceptor borra la sesión y `RutaProtegida` lleva a
   `/login?motivo=expirada`.

### Cómo probar

```
cd backend && ./mvnw -q verify          # incluye CorsConfigTest
cd frontend && npm install && npm run lint && npm run build
```
`CorsConfigTest` (3): preflight desde un origen permitido → 200 con `Access-Control-Allow-Origin`; preflight con
`Authorization` hacia `/api/incidencias` → 200; desde un origen no permitido → 403 sin cabeceras CORS.

Prueba manual:
1. Backend: `cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=local`.
2. Frontend: copiar `frontend/.env.example` a `frontend/.env.local` con `NEXT_PUBLIC_API_URL=http://localhost:8080`
   y ejecutar `npm run dev`; abrir `http://localhost:3000`.
3. Login con DNI de 7 dígitos → "El DNI debe tener 8 dígitos". Contraseña incorrecta → "DNI o contraseña incorrectos".
4. Vigilante → `/incidencias/nueva` con su zona marcada. Registrar → tarjeta verde con el número; el formulario
   queda listo para otro. Abrir `/dashboard` → vuelve al formulario.
5. Supervisor → `/dashboard`; abrir `/incidencias/nueva` → vuelve al dashboard. Administrador → ve ambas en el menú.
6. "Cerrar sesión" → `/login`; el botón Atrás no muestra páginas privadas.
7. Token vencido: en DevTools → Application → Local Storage, cambiar `expiraEn` de `sgi.sesion` a una fecha pasada y
   recargar, o alterar el `token` y registrar una incidencia → `/login` con el aviso "Tu sesión venció".
8. DevTools en modo móvil (360 px): botones táctiles, botón "Registrar incidencia" fijo abajo, sin scroll horizontal.

---

## Contraseñas temporales: restablecimiento y cambio obligatorio (RF-01, RF-02, RF-08)

Toda contraseña que asigna el Administrador (al crear un usuario, al editarlo con contraseña o al restablecerla con
`PATCH /api/usuarios/{id}/contrasena`) es temporal. El usuario queda con `debe_cambiar_contrasena = true` y, al
iniciar sesión, recibe un token que solo le permite cambiarla. Cada paso queda en `auditoria` sin guardar
contraseñas ni hashes.

### Base de datos

Columna nueva en `usuario` (ya incluida en `docs/modelo_datos.sql`). En una BD existente se agrega con:
```sql
ALTER TABLE usuario ADD COLUMN debe_cambiar_contrasena BOOLEAN NOT NULL DEFAULT FALSE;
```
Los usuarios existentes quedan en `FALSE`. El perfil `local` valida el esquema al arrancar
(`ddl-auto=validate`), así que la aplicación no inicia hasta que la columna exista.

### Clases nuevas y modificadas

| Clase | Paquete | Responsabilidad | Métodos públicos principales |
|---|---|---|---|
| `RestablecerContrasenaRequest` (nueva) | `dto.request` | Cuerpo `{ contrasenaNueva }`: obligatoria, de 8 a 72 caracteres (72 es el límite de BCrypt). Su `toString()` oculta la contraseña. | — |
| `Usuario` (modificado) | `model` | Campo `debeCambiarContrasena` (`debe_cambiar_contrasena`, por defecto `false`). | `getDebeCambiarContrasena()`, `setDebeCambiarContrasena(Boolean)`. |
| `UsuarioController` (modificado) | `controller` | Nueva ruta, solo Administrador (la cubre la regla `/api/usuarios/**`). | `restablecerContrasena(id, RestablecerContrasenaRequest, Jwt)` → 204 (`PATCH /{id}/contrasena`). |
| `UsuarioService` / `UsuarioServiceImpl` (modificados) | `service` / `service.impl` | Marca y desmarca la contraseña temporal. | `restablecerContrasena(idUsuario, contrasenaNueva, idActor)`: el actor debe estar activo (401), el usuario debe existir (404) y no ser el propio actor (400); guarda el hash, marca `debeCambiarContrasena = true` y audita `RESTABLECER_CONTRASENA {idUsuario, debeCambiarContrasena: true}`. `crear` y `actualizar` (con contraseña) también marcan `true` y lo agregan al detalle. `cambiarContrasenaPropia` deja `false` y audita `cambioObligatorio`. |
| `TokenService` / `JwtTokenServiceImpl` (modificados) | `service` / `service.impl` | Constante `CLAIM_CAMBIO_PENDIENTE = "cambioPendiente"`. | `generarToken(Usuario)`: agrega `cambioPendiente: true` solo si el usuario tiene contraseña temporal. |
| `SecurityConfig` (modificado) | `config` | Con `cambioPendiente`, el converter no asigna `ROLE_<rol>`. `GET /api/auth/yo` y `PATCH /api/usuarios/me/contrasena` piden solo token; la regla final pasa a `anyRequest().hasAnyRole(Administrador, Supervisor, Vigilante)`. El 403 dice "Debe cambiar su contraseña antes de continuar" si el token tiene el claim. | — |
| `AuthServiceImpl` (modificado) | `service.impl` | `LOGIN_OK` lleva `{cambioPendiente: true}` cuando la contraseña es temporal. | `login(LoginRequest)` (sin cambios de firma). |
| `UsuarioResumenResponse` (modificado) | `dto.response` | Nuevo campo `debeCambiarContrasena`, presente en el login y en `GET /api/auth/yo`. | `desde(Usuario)`. |
| `AccionAuditoria` (modificado) | `model` | Acción nueva `RESTABLECER_CONTRASENA`. `accion_realizada` es `VARCHAR(60)` sin restricción de valores: no requiere cambios en la BD. | — |

### Flujo completo

1. El Administrador llama a `PATCH /api/usuarios/7/contrasena` con `{ contrasenaNueva }`. `SecurityConfig` exige
   rol Administrador y `@Valid` valida la longitud (400). Luego `UsuarioServiceImpl.restablecerContrasena`, en una
   transacción:
   1. comprueba que el actor siga activo (401) y que el usuario 7 exista (404) y no sea el propio Administrador (400);
   2. guarda el hash y `debe_cambiar_contrasena = true`;
   3. inserta `RESTABLECER_CONTRASENA {idUsuario: 7, debeCambiarContrasena: true}` con `id_usuario` = Administrador.

   Responde 204.
2. El usuario 7 llama a `POST /api/auth/login`: `AuthServiceImpl` valida credenciales y `JwtTokenServiceImpl` emite
   el token con `cambioPendiente: true`. La respuesta trae `usuario.debeCambiarContrasena: true` y se audita
   `LOGIN_OK {cambioPendiente: true}`.
3. Con ese token, cualquier ruta salvo `/api/auth/yo` y `/api/usuarios/me/contrasena` responde 403: el token no
   tiene autoridad de rol.
4. `PATCH /api/usuarios/me/contrasena` con la temporal como `contrasenaActual`: `cambiarContrasenaPropia` guarda la
   nueva, deja `debe_cambiar_contrasena = false` y audita `CAMBIAR_CONTRASENA {idUsuario, origen: "propio",
   cambioObligatorio: true}`. Responde 204.
5. El token anterior sigue con el claim hasta vencer: el cliente inicia sesión de nuevo con la contraseña nueva y
   obtiene un token normal.

### Cómo probar

```
cd backend
./mvnw -q verify
```
Pasan 183 tests. Tests de esta funcionalidad:
- `UsuarioServiceImplTest`:
  - el restablecimiento guarda el hash temporal y audita sin contraseña;
  - el Administrador no puede restablecer la suya; un usuario inexistente da 404;
  - crear y editar con contraseña marcan el cambio obligatorio; editar sin contraseña no lo marca;
  - el cambio propio quita la marca y audita `cambioObligatorio` en `true` o `false`.
- `JwtTokenServiceImplTest`: el claim aparece solo con contraseña temporal.
- `AuthServiceImplTest`: el login indica la contraseña temporal y la audita.
- `AuthControllerTest`: `debeCambiarContrasena` aparece en el JSON del login; `/api/auth/yo` funciona con un token
  pendiente.
- `UsuarioControllerTest`:
  - restablecer como Administrador → 204; contraseña corta → 400; Supervisor o Vigilante → 403; sin token → 401;
  - con token pendiente, `me/contrasena` → 204 y usuarios, catálogos, dashboard e incidencias → 403 con el mensaje
    nuevo;
  - el 403 por rol conserva su mensaje habitual.

Prueba manual (después de agregar la columna, con la app en perfil `local`):
1. En el environment local de Postman (no versionado) definir la variable `contrasenaNueva`.
2. Como Administrador, ejecutar "Usuarios Restablecer Contrasena" (`PATCH /api/usuarios/2/contrasena`) → 204.
3. Login del usuario 2 con esa contraseña → 200 con `usuario.debeCambiarContrasena: true`.
4. Con ese token, `GET /api/catalogos/zonas` → 403 "Debe cambiar su contraseña antes de continuar".
5. Con ese token, "Usuarios Mi Contrasena" (actual = la temporal) → 204.
6. Login de nuevo → `debeCambiarContrasena: false`, y las rutas de su rol vuelven a responder.
7. Restablecer usando el id del propio Administrador → 400; con token de Supervisor → 403.
8. `SELECT accion_realizada, detalle_cambio, id_usuario FROM auditoria ORDER BY id_auditoria DESC LIMIT 6;` muestra
   `RESTABLECER_CONTRASENA`, `LOGIN_OK {"cambioPendiente": true}` y
   `CAMBIAR_CONTRASENA {..., "cambioObligatorio": true}`.

---

## Frontend — cambio obligatorio de contraseña temporal (RF-01)

Cuando el login devuelve `usuario.debeCambiarContrasena: true`, la sesión se guarda marcada y el usuario solo puede
estar en `/cambiar-contrasena`: las rutas privadas y el menú no se muestran. Allí ingresa la contraseña actual (o
temporal), la nueva y su confirmación. Al guardarla, la sesión se cierra y debe entrar de nuevo con la contraseña
nueva, porque el token anterior sigue limitado hasta vencer.

### Módulos y componentes nuevos y modificados

| Archivo (`frontend/src/`) | Responsabilidad | Funciones / props principales |
|---|---|---|
| `app/cambiar-contrasena/page.tsx` (nuevo) | `/cambiar-contrasena`, fuera del grupo `(privado)`: sin `Encabezado` ni menú, mismo marco que `/login`. | — |
| `app/cambiar-contrasena/FormularioCambioContrasena.tsx` (nuevo) | Formulario de cambio. Sin sesión → `rutaLogin(motivo)`; sesión no marcada → `rutaInicio(rol)`. Valida en el cliente: campos obligatorios, nueva de 8 a 72 caracteres, distinta de la actual e igual a la confirmación (reglas de `lib/validaciones.ts`). Con 204 llama a `borrarSesion("contrasena-cambiada")`; con 400 muestra el mensaje del backend ("La contraseña actual o temporal no es correcta.", "La nueva contraseña debe ser distinta de la actual") y sus `detalles`. Botón "Cerrar sesión" como única salida. | — |
| `lib/tipos.ts` (modificado) | `Usuario.debeCambiarContrasena: boolean`. | — |
| `lib/sesion.ts` (modificado) | Motivo de cierre nuevo `"contrasena-cambiada"`. | `marcarCambioPendiente()`: reescribe la sesión guardada con `debeCambiarContrasena = true` y avisa a los suscriptores (no hace nada sin sesión o si ya está marcada). |
| `lib/roles.ts` (modificado) | Constante `RUTA_CAMBIO_CONTRASENA = "/cambiar-contrasena"`. | `destinoInicial(usuario)` → `/cambiar-contrasena` si está marcado, si no `rutaInicio(rol)`; `rutaLogin(motivo)` → `/login`, `/login?motivo=expirada` o `/login?motivo=contrasena-actualizada`. |
| `lib/api.ts` (modificado) | El interceptor de respuesta, ante un 403 con el mensaje "Debe cambiar su contraseña antes de continuar", llama a `marcarCambioPendiente()`. | — |
| `lib/servicios.ts` (modificado) | — | `cambiarContrasenaPropia(contrasenaActual, contrasenaNueva)` → `Promise<void>` (`PATCH /api/usuarios/me/contrasena`). |
| `components/RutaProtegida.tsx` (modificado) | Con sesión marcada no muestra la página y redirige a `/cambiar-contrasena`. Sin sesión usa `rutaLogin(consumirMotivoCierre())`. | Props sin cambios. |
| `components/Encabezado.tsx` (modificado) | No se muestra con sesión marcada. | — |
| `app/login/FormularioLogin.tsx` (modificado) | Redirige con `destinoInicial(usuario)`. Con `?motivo=contrasena-actualizada` muestra "Contraseña actualizada, inicia sesión con la nueva." | — |
| `app/page.tsx` (modificado) | `/` redirige con `destinoInicial(usuario)`. | — |

### Flujo: primer ingreso con contraseña temporal

1. `/login` → `iniciarSesion` → `POST /api/auth/login`; la respuesta trae `usuario.debeCambiarContrasena: true` y
   `guardarSesion` la guarda así en `localStorage`.
2. El efecto del login llama a `destinoInicial` → `/cambiar-contrasena`. Si el usuario escribe otra ruta,
   `RutaProtegida` lo devuelve allí. Si alguna petición recibe el 403 de contraseña pendiente (por ejemplo, una
   sesión guardada antes de restablecerla), el interceptor marca la sesión y ocurre lo mismo.
3. `FormularioCambioContrasena` valida y llama a `cambiarContrasenaPropia` → `PATCH /api/usuarios/me/contrasena`
   con `{ contrasenaActual, contrasenaNueva }`. El backend comprueba la actual con BCrypt, guarda la nueva, limpia
   `debe_cambiar_contrasena` y audita `CAMBIAR_CONTRASENA`.
4. Con 204, `borrarSesion("contrasena-cambiada")`; el efecto de la pantalla lleva a
   `/login?motivo=contrasena-actualizada` con el aviso verde. El nuevo login entrega un token normal.

### Cómo probar

```
cd frontend && npm run lint && npm run build
```
Prueba manual (backend con `./mvnw spring-boot:run -Dspring-boot.run.profiles=local` y frontend con `npm run dev`):
1. Como Administrador, restablecer la contraseña de un usuario:
   `PATCH /api/usuarios/{id}/contrasena` con `{ "contrasenaNueva": "Temporal123" }`.
2. Iniciar sesión con ese usuario y la temporal → `/cambiar-contrasena`, sin encabezado ni menú.
3. Escribir `/dashboard` o `/incidencias/nueva` en la barra → vuelve a `/cambiar-contrasena`.
4. Errores: campos vacíos; nueva de 7 o de 17 caracteres → "entre 8 y 16 caracteres"; nueva igual a la actual;
   confirmación distinta; contraseña actual equivocada → "La contraseña actual o temporal no es correcta."
5. Cambio válido → `/login` con "Contraseña actualizada, inicia sesión con la nueva." La temporal ya no sirve; la
   nueva lleva al inicio del rol.
6. "Cerrar sesión" desde la pantalla de cambio → `/login` sin aviso; al entrar con la temporal vuelve a pedir el cambio.

## Consulta de auditoría (RF-08)

El Administrador puede consultar la tabla `auditoria` con `GET /api/auditoria`: paginada, del registro más reciente
al más antiguo y con filtros opcionales y combinables por rango de fechas (el mismo de historial y dashboard),
acción, usuario y DNI. `GET /api/auditoria/acciones` entrega las acciones válidas con su etiqueta en español para
el filtro del frontend. La consulta solo lee: no inserta registros de auditoría.

### Clases nuevas y modificadas

| Clase | Paquete | Responsabilidad | Métodos públicos principales |
|---|---|---|---|
| `AuditoriaController` (nueva) | `controller` | `/api/auditoria`, solo Administrador (regla `/api/auditoria/**` de `SecurityConfig`, sin cambios). Recibe y valida los query params (`page >= 0`, `size` de 1 a 100) y delega. | `buscar(AuditoriaFiltro, page, size)` → `PaginaResponse<AuditoriaResponse>`; `acciones()` → `List<AccionAuditoriaResponse>` (`GET /acciones`). |
| `AuditoriaFiltro` (nueva) | `dto.request` | Record con `periodo`, `desde`, `hasta`, `accion` (`AccionAuditoria`), `idUsuario` (`@Positive`) y `q` (`@Pattern [0-9]{0,8}`; vacío = sin filtro). | — |
| `AuditoriaResponse` (nueva) | `dto.response` | Fila de la consulta: `idAuditoria`, `fechaHora` (en hora de Lima), `accion`, `accionEtiqueta`, `usuario` (`Registrador` o `null`), `dniIntentado`, `detalle` (objeto JSON). | `desde(Auditoria)`. |
| `AccionAuditoriaResponse` (nueva) | `dto.response` | `{ valor, etiqueta }` de una acción. | `desde(AccionAuditoria)`. |
| `ParametroInvalidoException` (nueva) | `exception` | Subclase de `ReglaNegocioException` con el nombre del query param rechazado. | `getCampo()`. |
| `AccionAuditoria` (modificado) | `model` | Cada acción lleva una etiqueta en español. | `getEtiqueta()`; `etiquetaDe(String)`: etiqueta del valor guardado, o el mismo texto si no es una acción conocida. |
| `AuditoriaDao` (modificado) | `dao` | Sigue extendiendo solo `Repository` (sin `delete` ni `update`). Constante `ORDEN_AUDITORIA` (`fechaHora` e `idAuditoria` descendentes). | `findAll(Specification, Pageable)` con `@EntityGraph("usuario")`: un SELECT con LEFT JOIN al usuario, sin N+1. `conFiltros(RangoFechas, AuditoriaFiltro)`: `fecha_hora` en `[inicio, fin)`, acción exacta, usuario, y `q` como prefijo (`LIKE 'q%'`) del DNI del usuario o del DNI intentado. `count()`. |
| `AuditoriaService` / `AuditoriaServiceImpl` (modificados) | `service` / `service.impl` | Agrega la consulta, en transacción de solo lectura; recibe el `Clock` de la aplicación. Constante `TAMANO_MAXIMO = 100`. | `buscar(filtro, pagina, tamano)` → `Page<AuditoriaResponse>` (lanza `ParametroInvalidoException` si la página, el tamaño o el rango no son válidos); `acciones()` → todas las acciones en el orden del enum. |
| `RangoFechas` (modificado) | `dto.request` | `resolver(...)` lanza `ParametroInvalidoException` con el campo: `periodo` (fechas sin `PERSONALIZADO`), `desde`/`hasta` (fecha faltante), `desde` (rango invertido), `hasta` (más de 366 días). Afecta también a historial, dashboard y reportes: mismo mensaje y ahora el campo en `detalles`. | Sin cambios de firma. |
| `GlobalExceptionHandler` (modificado) | `exception` | `ParametroInvalidoException` → 400 con `"campo: mensaje"` en `detalles`. `HandlerMethodValidationException` (restricciones en `@RequestParam` junto con un `@Valid`) → 400 con un detalle por parámetro o campo, p. ej. `"size: debe estar entre 1 y 100"` o `"q: debe tener solo dígitos, hasta 8"`. | — |
| `IncidenciaHistorialResponse.Registrador` (modificado) | `dto.response` | `desde(Usuario)` pasa a ser público para reutilizarlo en la auditoría (id, DNI y nombre completo, sin contraseña ni rol). | `desde(Usuario)`. |

### Flujo: `GET /api/auditoria?accion=LOGIN_FALLIDO&q=4040&size=10`

1. `SecurityConfig` valida el JWT y exige `ROLE_Administrador` (401 sin token; 403 con otro rol o con cambio de
   contraseña pendiente).
2. Spring arma `AuditoriaFiltro` desde los query params. Un valor de `accion` que no está en el enum o un `periodo`
   desconocido producen `BindException`; `q` o `idUsuario` inválidos y `size` fuera de 1..100 producen
   `HandlerMethodValidationException`. En ambos casos responde 400 con el campo en `detalles`.
3. `AuditoriaController.buscar` delega en `AuditoriaServiceImpl.buscar`, que resuelve el rango con
   `RangoFechas.resolver` (sin periodo, últimos 30 días en Lima) y arma `PageRequest(page, size, ORDEN_AUDITORIA)`.
4. `AuditoriaDao.findAll(conFiltros(rango, filtro), pageable)` ejecuta un SELECT con LEFT JOIN a `usuario`
   (`fecha_hora >= inicio AND fecha_hora < fin AND accion_realizada = 'LOGIN_FALLIDO' AND
   (u.dni LIKE '4040%' OR a.dni_intentado LIKE '4040%')`) y un SELECT de conteo. Aprovecha los índices
   `idx_auditoria_fecha` e `idx_auditoria_usuario`.
5. Cada `Auditoria` se convierte en `AuditoriaResponse` y el controller responde con `PaginaResponse`.

### Cómo probar

```
cd backend
./mvnw verify
```
Tests de esta funcionalidad:
- `AuditoriaServiceImplTest` (H2 en modo PostgreSQL, reloj fijo el 24/10/2026 12:00 en Lima): rango por defecto
  (excluye un registro de hace 30 días), periodo `HOY` con el borde de las 00:00 y `PERSONALIZADO`, filtros por
  acción, usuario y DNI (exacto, prefijo, DNI intentado, vacío), combinaciones, orden descendente con desempate por
  id, fila con DNI inexistente (`usuario` nulo y `dniIntentado`), nombre completo y detalle JSON, paginación,
  parámetros inválidos con su campo, que la consulta no inserte filas y la lista de acciones.
- `AuditoriaDaoTest` (H2): el usuario llega cargado en la misma consulta, orden descendente, intervalo semiabierto
  del día en Lima y búsqueda por prefijo.
- `AuditoriaControllerTest` (seguridad real, servicio simulado): Administrador 200 con el JSON esperado y sin
  `contrasena`; valores por defecto `page=0` y `size=20`; parámetros vacíos sin filtro; `/acciones` 200; Supervisor
  y Vigilante 403; cambio de contraseña pendiente 403; sin token 401; `size=101`, `accion=BORRAR`, `q=12ab`,
  `periodo=AYER` y rango invertido 400 con el campo en `detalles`.
- `RangoFechasTest`: cada rechazo indica su campo.

Prueba manual con la aplicación en perfil `local` y Postman (environment con `baseUrl`, `token` de un
Administrador, `periodo`, `accionAuditoria` y `qAuditoria`):
1. "Auditoria Listar" → 200; el primer registro es el `LOGIN_OK` del login recién hecho y `fechaHora` termina en
   `-05:00`.
2. Hacer un login con un DNI que no exista y luego "Auditoria Filtrar" con `periodo=HOY` y
   `accionAuditoria=LOGIN_FALLIDO` → la fila trae `usuario: null`, `dniIntentado` y
   `detalle.motivo = "DNI_NO_REGISTRADO"`. Con `qAuditoria` = los primeros dígitos de ese DNI aparece la misma fila.
3. "Auditoria Acciones" → 16 acciones con su etiqueta.
4. Con token de Supervisor → 403; con `size=101` o `accion=BORRAR` → 400 con el campo en `detalles`.
5. En la BD, `SELECT count(*) FROM auditoria;` antes y después de consultar: no cambia (salvo por los logins que
   hagas).

## Frontend — validaciones de formularios (RF-01, RF-03)

Los formularios validan cada campo antes de enviar, con los mismos límites que los DTO del backend. El aviso aparece
en rojo debajo del campo al salir de él, se actualiza mientras se escribe hasta que el dato es válido, y al pulsar
guardar se marcan todos los errores y el foco va al primero. Los errores 400 del backend se muestran debajo del campo
al que corresponden. Hoy se aplica al login, al cambio de contraseña y al registro de incidencias.

### Módulos y componentes nuevos y modificados

| Archivo (`frontend/src/`) | Responsabilidad | Funciones / props principales |
|---|---|---|
| `lib/validaciones.ts` (nuevo) | Reglas y mensajes de todos los formularios, como funciones puras (sin React). Constantes `LARGO_DNI` (8), `CONTRASENA_MIN`/`CONTRASENA_MAX` (8/72), `NOMBRES_MAX` (80), `APELLIDO_MAX` (50), `DESCRIPCION_MAX` (2000), `DESCRIPCION_MIN_OTRO` (20), `TOLERANCIA_FECHA_MS` (2 min) y `MENSAJES`. | `limpiarDni(texto)` → solo dígitos, máximo 8. `sonDigitos(texto)`. `esTipoOtro(nombre)`. Validadores de un campo → mensaje o `null`: `obligatorio`, `validarDni`, `validarContrasenaLogin`, `validarContrasenaNueva(nueva, actual?)`, `validarConfirmacion(confirmacion, nueva)`, `validarNombre(valor, max, opcional?)`, `validarSeleccion(valor, mensaje)`, `validarDescripcion(texto, esOtro)`, `validarFechaNoFutura(valorLocal, ahora?)`. Por formulario → `Errores` (campo → mensaje): `validarLogin`, `validarCambioContrasena`, `validarIncidencia`. `erroresDelServidor(error, mapa, reglas?)` → `{ campos, general }`: reparte los `detalles` `"campo: mensaje"` de un 400 según `mapa` (nombre en el backend → campo del formulario) y ubica las reglas de negocio conocidas por su mensaje; lo demás queda en `general`. |
| `lib/useValidacion.ts` (nuevo) | Hook con el estado de los avisos de un formulario: campos tocados, intento de envío y errores del backend. | `useValidacion(errores, orden)` → `error(campo)` (aviso visible o `undefined`), `alSalir(campo)`, `alCambiar(campo)` (borra el aviso del backend del campo), `registrar(campo)` (ref para el foco), `propsCampo(campo)` → `{ id, ref, onBlur, aria-invalid, aria-describedby }`, `intentarEnviar()` → `true` si se puede enviar (si no, enfoca el primer error), `ponerErroresServidor(errores)`, `reiniciar()`, `hayErroresVisibles`. `idError(campo)` → `"error-<campo>"`. |
| `components/MensajeCampo.tsx` (nuevo) | Aviso en rojo debajo de un campo, con `id="error-<campo>"` y `role="alert"`; sin mensaje no muestra nada. | Props `campo`, `mensaje?`. `bordeCampo(invalido)` → clases de borde rojo o normal. |
| `components/SelectorRapido.tsx` (modificado) | El grupo muestra su aviso debajo, contorno rojo, `aria-invalid` y `aria-describedby` en el `radiogroup`; avisa cuando el foco sale del grupo. | Props nuevas opcionales: `campo`, `error`, `onSalir`, `refPrimero` (ref del primer botón, para enfocarlo). |
| `app/login/FormularioLogin.tsx` (modificado) | DNI que solo admite dígitos: bloquea al teclear lo que no sea dígito o pase del octavo (`onBeforeInput`) y limpia lo pegado con `limpiarDni` (`onChange`); `inputMode="numeric"` y `pattern="[0-9]*"` para el teclado numérico. Contraseña obligatoria. El 401 sigue en la alerta general. | — |
| `app/cambiar-contrasena/FormularioCambioContrasena.tsx` (modificado) | Nueva de 8 a 72 caracteres (antes 16), distinta de la actual, y confirmación igual. "La contraseña actual no es correcta" y "debe ser distinta de la actual" del backend se muestran bajo su campo. | — |
| `components/SelectorBuscable.tsx` (nuevo) | Desplegable con búsqueda para listas que crecen (zonas y, con más de 8, tipos de evento). Un botón grande muestra la opción elegida y su detalle; al tocarlo abre una hoja inferior en el celular o un desplegable desde `sm`, con buscador y lista desplazable. Detalle actualizado en la sección "Frontend — selector de zona con búsqueda en el registro de incidencias". | Props `titulo`, `opciones`, `valor`, `onCambio`, `placeholder`, `campo`, `error`, `onSalir`, `refPrimero`, `destacado`. |
| `app/(privado)/incidencias/nueva/FormularioIncidencia.tsx` (modificado) | La zona se elige con `SelectorBuscable` (detalle: distrito; la zona asignada al vigilante aparece primero y preseleccionada). El tipo de evento usa botones con hasta 8 tipos y `SelectorBuscable` si hay más (`MAX_TIPOS_EN_BOTONES`). Avisos bajo zona, tipo, gravedad, descripción (con contador `n/2000`) y fecha. Los 400 de catálogo inactivo, descripción corta de "Otro" y fecha futura se muestran bajo su campo. Tras registrar, el formulario queda sin avisos. | — |

### Reglas por formulario

| Formulario | Campo (`id`) | Regla | Mensaje | Equivalente en el backend |
|---|---|---|---|---|
| Login | `dni` | Obligatorio; solo dígitos (no se pueden escribir ni pegar otros caracteres); exactamente 8 | "Este campo es obligatorio" · "El DNI debe tener 8 dígitos numéricos" | `LoginRequest.dni`: `@NotBlank`, `@Pattern(^[0-9]{8}$)` |
| Login | `contrasena` | Obligatoria (sin límite de largo) | "Este campo es obligatorio" | `LoginRequest.contrasena`: `@NotBlank` |
| Cambio de contraseña | `actual` | Obligatoria | "Este campo es obligatorio" · del backend: "La contraseña actual o temporal no es correcta" | `CambioContrasenaRequest.contrasenaActual`: `@NotBlank`; `UsuarioServiceImpl.cambiarContrasenaPropia` |
| Cambio de contraseña | `nueva` | Obligatoria; de 8 a 72 caracteres; distinta de la actual | "La contraseña debe tener entre 8 y 72 caracteres" · "La nueva contraseña debe ser distinta de la actual" | `contrasenaNueva`: `@NotBlank`, `@Size(min = 8, max = 72)`; regla del servicio |
| Cambio de contraseña | `confirmacion` | Obligatoria; igual a la nueva | "Las contraseñas no coinciden" | Solo frontend |
| Registro de incidencias | `idZona` (desplegable con búsqueda), `idTipo`, `idGravedad` | Selección obligatoria | "Elige una zona" · "Elige un tipo de evento" · "Elige un nivel de gravedad" | `IncidenciaRequest`: `@NotNull`; catálogo activo en `IncidenciaServiceImpl.registrar` |
| Registro de incidencias | `descripcion` | Obligatoria; máximo 2000 (el campo no admite más); mínimo 20 si el tipo es "Otro", sobre el texto recortado; contador `n/2000` | "Este campo es obligatorio" · 'Para el tipo "Otro" la descripción debe tener al menos 20 caracteres' · "No debe superar los 2000 caracteres" | `@NotBlank`, `@Size(max = 2000)`; mínimo de "Otro" en el servicio |
| Registro de incidencias | `fecha` | Opcional (por defecto la hora actual); si se edita, obligatoria y no futura, con 2 minutos de tolerancia | "Este campo es obligatorio" · "La fecha y hora no puede ser futura" | `fechaHora` opcional; `TOLERANCIA_RELOJ` de 2 min en el servicio |
| Personal (pantalla pendiente) | nombres, apellidos | Letras (con tildes, ü y ñ), espacios, apóstrofo y guion; nombres hasta 80, apellidos hasta 50; apellido materno opcional (`validarNombre`) | "Solo se permiten letras, espacios, apóstrofo y guion" · "No debe superar los N caracteres" | `UsuarioCrearRequest`: solo `@Size`; no rechaza números |

Antes de enviar se recortan los espacios del DNI y de la descripción. Las contraseñas no se recortan: un espacio es
parte de la contraseña y el backend tampoco las recorta.

### Flujo: registro de incidencia con un error del backend

1. El usuario pulsa "Registrar incidencia". `useValidacion.intentarEnviar()` marca todos los campos; si
   `validarIncidencia` devuelve errores, enfoca el primero y no se envía nada.
2. Sin errores, `registrarIncidencia` hace `POST /api/incidencias` con la descripción recortada.
3. Si el backend responde 400 `{ mensaje: "Datos de entrada inválidos", detalles: ["descripcion: no debe superar los
   2000 caracteres"] }`, `errorDeApi` lo traduce y `erroresDelServidor` lo reparte con el mapa
   `{ descripcion: "descripcion", idTipoEvento: "idTipo", … }`: queda "No debe superar los 2000 caracteres" bajo la
   descripción. Una regla de negocio sin `detalles` ("La fecha y hora de la incidencia no puede ser futura") se ubica
   por su texto bajo la fecha.
4. `ponerErroresServidor` muestra esos avisos y enfoca el campo; al editarlo, el aviso del backend se borra.

### Cómo probar

```
cd frontend
npm run lint
npm run build
npm run dev
```

1. `/login`: escribir `1234567a` (quedan los 7 dígitos), salir del campo ("El DNI debe tener 8 dígitos numéricos" y
   botón desactivado), escribir el octavo (el aviso se va), pegar `12a34b5678` (queda `12345678`). Pulsar "Ingresar"
   con todo vacío: aviso en los dos campos, foco en el DNI y ninguna petición en Network.
2. `/cambiar-contrasena` (usuario con contraseña temporal): nueva de 7 o 73 caracteres, confirmación distinta, nueva
   igual a la actual, y una actual incorrecta (aviso del backend bajo el campo).
3. `/incidencias/nueva` (Vigilante): registrar vacío, tipo "Otro" con 19 y 20 caracteres, fecha 10 minutos en el
   futuro, y una descripción con espacios al inicio y al final (en Network, `descripcion` llega recortada).
4. En DevTools, el campo con aviso tiene `aria-invalid="true"` y `aria-describedby="error-<campo>"`.

Los casos completos son CP-70 a CP-79 y CP-84 a CP-86 del plan de pruebas integrales, con los selectores para
automatizarlos con Playwright.

## Frontend — dashboard, historial y auditoría (RF-04 a RF-08)

Pantallas gerenciales del frontend: el dashboard con KPI y gráficos de Chart.js que se refrescan cada 60 segundos, el
historial de incidencias con filtros, paginación y exportación a Excel o PDF, y la consulta de auditoría para el
Administrador. Todas usan el mismo selector de periodo y un menú lateral que muestra solo las pantallas del rol.

### Rutas y acceso

| Ruta | Pantalla | Roles (`RutaProtegida`) | Endpoints que usa |
|---|---|---|---|
| `/dashboard` | Dashboard gerencial | Administrador, Supervisor (`ROLES_GERENCIA`) | `GET /api/dashboard/kpis`, `/incidencias-por-zona`, `/incidencias-por-tipo`, `/incidencias-por-tiempo`, `/despliegue` |
| `/historial` | Historial de incidencias | Administrador, Supervisor | `GET /api/incidencias`, `GET /api/reportes/excel` y `/pdf`, `GET /api/catalogos/*` |
| `/historial/auditoria` | Pestaña de auditoría | Administrador (`ROLES_ADMIN`) | `GET /api/auditoria`, `GET /api/auditoria/acciones` |

Menú por rol (`lib/roles.ts`, `MENU`): el Administrador ve Dashboard, Historial, Auditoría y Registrar incidencia; el
Supervisor, Dashboard e Historial; el Vigilante, el formulario de registro (las opciones de personal, catálogos y
"Cambiar mi contraseña" se describen en la sección de personal y catálogos). Si alguien escribe una
ruta que su rol no tiene, `RutaProtegida` lo lleva a su pantalla de inicio. La autorización real la hace la API.

### Módulos nuevos y modificados (`frontend/src/lib/`)

| Archivo | Responsabilidad | Funciones principales |
|---|---|---|
| `tipos.ts` (modificado) | Tipos de los DTO de consulta. | `Periodo`, `Agrupacion`, `FiltroPeriodo`, `FiltroIncidencias`, `FiltroAuditoria`, `Pagina<T>`, `Kpis`, `ConteoGravedad`, `Conteo`, `SerieTiempo`, `PuntoSerie`, `DespliegueZona`, `IncidenciaHistorial`, `Registrador`, `AccionAuditoria`, `RegistroAuditoria`. |
| `servicios.ts` (modificado) | Llamadas a la API con los filtros comunes. | `parametrosIncidencias(filtro)` → query params (envía `desde`/`hasta` solo con `PERSONALIZADO` y omite los filtros vacíos). `buscarIncidencias(filtro, page, size)` → `Pagina<IncidenciaHistorial>`. `obtenerKpis`, `obtenerPorZona`, `obtenerPorTipo(filtro)`. `obtenerSerieTiempo(filtro, agrupacion o null)` (sin agrupación la elige el backend). `obtenerDespliegue()`. `exportarReporte("excel" o "pdf", filtro)` → nombre del archivo descargado. `nombreDeContentDisposition(cabecera)`. `buscarAuditoria(filtro, page, size)`, `listarAccionesAuditoria()`. |
| `validaciones.ts` (modificado) | Reglas del periodo personalizado y del DNI de búsqueda, iguales a las del backend. | `validarRangoFechas({desde, hasta})` → avisos: "Elige una fecha" en la que falte, "La fecha desde no puede ser posterior a hasta" en `desde`, "El rango no puede superar 366 días" en `hasta` (`RANGO_MAX_DIAS`, como `RangoFechas.MAX_DIAS`). `validarDniBusqueda(q)` → `null` o "El DNI debe tener solo dígitos, hasta 8" (como `AuditoriaFiltro.q`). |
| `fechas.ts` (nuevo) | Fechas en hora de Lima. | `hoyLima()` → AAAA-MM-DD. `diasEntre(desde, hasta)` (cuenta ambos extremos). `formatearFechaHora(iso)`, `formatearDia(dia)`, `formatearHora(fecha)`. `etiquetaTramo(punto, agrupacion)` → "05/11", "05/11–11/11" o "nov. 2026". |
| `gravedad.ts` (nuevo) | Colores de gravedad compartidos por el formulario, el dashboard y el historial (1 verde, 2 amarillo, 3 naranja, 4 rojo). | `coloresGravedad(orden)` → `{ normal, marcada, insignia, hex }`. |
| `useConsulta.ts` (nuevo) | Estado de una consulta para un gráfico o una tabla. Recarga cuando cambia la función (memoizada con sus filtros) y descarta respuestas viejas. | `useConsulta(cargar)` → `{ datos, error, cargando, actualizando, actualizadoEn, recargar }`. `recargar()` no borra los datos visibles. |
| `useRefresco.ts` (nuevo) | Refresco periódico, pausado con la pestaña oculta. | `useRefresco(refrescar, intervaloMs = REFRESCO_MS)` (60 000 ms). |
| `roles.ts` (modificado) | Opciones nuevas del menú. | `ROLES_ADMIN`; `MENU` con `/historial` y `/historial/auditoria`. |

### Componentes (`frontend/src/components/`)

| Componente | Responsabilidad | Props principales |
|---|---|---|
| `SelectorPeriodo` | Botones Hoy, 7 días, 30 días, Mes actual, Año actual y Personalizado (`role="radiogroup"`). Con Personalizado muestra los calendarios `desde` y `hasta` (máximo hoy), con el aviso debajo de cada uno, y "Aplicar". | `valor: FiltroPeriodo`, `onCambio(periodo)` (solo con un periodo válido). Exporta `PERIODOS` y `PERIODO_INICIAL` (30 días). |
| `FiltrosIncidencia` | Periodo, zona, gravedad y tipo de evento (catálogos activos) y "Quitar filtros". | `valor: FiltroIncidencias`, `onCambio(filtro)`. Exporta `FILTRO_INICIAL`. |
| `EstadoDatos` | Cargando, error con "Reintentar" (y los detalles de un 400), mensaje sin datos o el contenido. | `cargando`, `error`, `vacio`, `mensajeVacio?`, `onReintentar`. |
| `Tarjeta`, `TarjetaKpi` | Contenedor con título y acciones; indicador grande con borde de color y modo alerta (rojo). | `titulo`, `acciones?` · `etiqueta`, `valor`, `detalle?`, `color?`, `alerta?`, `cargando?`. |
| `Paginacion` | Total, página actual, Anterior/Siguiente y filas por página (10, 20, 50). | `pagina`, `totalPaginas`, `totalElementos`, `tamano`, `onPagina`, `onTamano`. |
| `MenuLateral`, `MarcoPrivado`, `Encabezado` (modificado) | Menú lateral fijo en escritorio y panel deslizable en tablet y móvil (botón "Menú"; se cierra con Escape, al tocar fuera o al elegir). El marco solo lo muestra si el rol tiene más de una pantalla. | `MenuLateral`: `opciones`, `abierto`, `onCerrar`. `Encabezado`: `onAbrirMenu?`. |
| `graficos/GraficoBarras`, `GraficoAnillo`, `GraficoSerie` | Barras horizontales por zona, anillo por tipo (con porcentaje en el tooltip) y serie en línea o barras (tooltip con el tramo completo). Cada uno trae una tabla oculta con los datos para lectores de pantalla. | `titulo`, `datos: Conteo[]` · `serie: SerieTiempo`, `tipo: "linea"` o `"barras"`. `graficos/registro.ts` registra en Chart.js solo los elementos usados y define los colores corporativos. |

### Páginas (`frontend/src/app/(privado)/`)

| Archivo | Qué muestra |
|---|---|
| `dashboard/PanelDashboard.tsx` | Periodo con el rango aplicado; KPI de hoy, del periodo, vigilantes desplegados (rojo si hay zonas sin vigilantes) y por gravedad; barras por zona; anillo por tipo; serie con Día/Semana/Mes y Línea/Barras (al cambiar de periodo vuelve a la agrupación por defecto del backend); tabla de despliegue. Cada bloque tiene su propio estado de carga y error. "Actualizar" y refresco cada 60 s sin borrar lo visible. |
| `historial/HistorialIncidencias.tsx`, `PestanasHistorial.tsx` | Filtros, botones de exportación ("Generando…", confirmación con el nombre del archivo o el error del backend), tabla Fecha, Zona, Tipo, Gravedad (insignia de color) y Usuario, con "Ver detalle" (descripción, N.° y fecha de registro) y paginación. Las pestañas Incidencias/Auditoría solo aparecen para el Administrador. |
| `historial/auditoria/ConsultaAuditoria.tsx`, `DetalleAuditoria.tsx` | Periodo, acción (de `/api/auditoria/acciones`), DNI (solo dígitos, completo o primeros dígitos) y tabla Fecha y hora, Acción (el login fallido en rojo), Usuario ("No identificado" y DNI intentado cuando no existe) y Detalle. `DetalleAuditoria` traduce claves y códigos (`DNI_NO_REGISTRADO` → "DNI no registrado", `ULTIMOS_30_DIAS` → "Últimos 30 días", booleanos Sí/No) y muestra `antes`/`despues` como "valor anterior → valor nuevo". |

### Flujo: exportar el historial a Excel

1. En `/historial` el usuario elige "Mes actual" y una zona: `FiltrosIncidencia` llama a `onCambio` y la tabla se
   recarga con `buscarIncidencias` desde la página 0.
2. "Exportar Excel" llama a `exportarReporte("excel", filtro)`, que hace
   `GET /api/reportes/excel?periodo=MES_ACTUAL&idZona=…` con `responseType: "blob"` y el token en `Authorization`.
3. `ReporteController` → `ReporteService.exportar` consulta las incidencias con los mismos filtros, genera el archivo
   con Apache POI y audita `EXPORTAR_REPORTE`; responde con
   `Content-Disposition: attachment; filename="incidencias_AAAA-MM-DD.xlsx"` (cabecera expuesta por `CorsConfig`).
4. `nombreDeContentDisposition` toma el nombre, se crea un enlace temporal con `URL.createObjectURL` y el navegador
   descarga el archivo. Si la API responde 400 (por ejemplo, más de 10 000 incidencias), el cuerpo JSON llega como
   Blob; `exportarReporte` lo convierte para que `errorDeApi` muestre el mensaje.

### Cómo probar

```
cd frontend
npm run lint
npm run build
npm run dev
```

Con el backend en el perfil `local`:

1. Como Supervisor, `/dashboard`: recorrer los seis periodos, Día/Semana/Mes y Línea/Barras; los totales coinciden con
   las respuestas de `/api/dashboard/*` en la pestaña Network. Un rango personalizado invertido o de 367 días muestra
   el aviso bajo la fecha y no hace peticiones.
2. `/historial`: filtrar, ver detalle, paginar, "Exportar Excel" y "Exportar PDF" (se descargan
   `incidencias_AAAA-MM-DD.xlsx` y `.pdf`).
3. Escribir `/historial/auditoria` como Supervisor: vuelve a `/dashboard`. Como Administrador: filtrar por "Inicio de
   sesión fallido" y un DNI parcial; el detalle se lee sin JSON.
4. Como Vigilante: el menú no ofrece Dashboard ni Historial, y `/dashboard` o `/historial` lo devuelven al formulario.
5. Con el backend detenido, cada gráfico y tabla muestra su error con "Reintentar".

Los casos completos son CP-13, CP-38, CP-45, CP-51, CP-63, CP-82, CP-87 y CP-88 del plan de pruebas integrales.

## Frontend — personal, catálogos y cambio de contraseña (RF-02, RF-09)

Pantallas de administración del frontend: la gestión de personal (alta, edición, reasignación de zona, restablecer
contraseña y activar o desactivar), los catálogos con pestañas para zonas, tipos de evento y niveles de gravedad, y
"Cambiar mi contraseña" para cualquier usuario. Todo formulario valida con `lib/validaciones.ts` (mismos límites y
mensajes que los DTO) y muestra los errores del backend bajo el campo que corresponde.

### Rutas y acceso

| Ruta | Pantalla | Roles (`RutaProtegida`) | Endpoints que usa |
|---|---|---|---|
| `/personal` | Gestión de personal | Administrador (`ROLES_ADMIN`) | `GET/POST /api/usuarios`, `PUT /api/usuarios/{id}`, `PATCH /api/usuarios/{id}/estado`, `PATCH /api/usuarios/{id}/contrasena`, `GET /api/catalogos/roles`, `GET /api/catalogos/zonas` |
| `/catalogos` | Catálogos: Zonas | Administrador | `GET/POST /api/zonas`, `PUT /api/zonas/{id}`, `PATCH /api/zonas/{id}/estado`; para el aviso de vigilantes, `GET /api/catalogos/roles` y `GET /api/usuarios?idZona=&idRol=&activo=true&size=1` |
| `/catalogos/tipos-evento` | Catálogos: Tipos de evento | Administrador | `GET/POST /api/tipos-evento`, `PUT /api/tipos-evento/{id}`, `PATCH /api/tipos-evento/{id}/estado` |
| `/catalogos/niveles-gravedad` | Catálogos: Niveles de gravedad | Administrador | `GET /api/niveles-gravedad`, `PUT /api/niveles-gravedad/{id}` |
| `/mi-contrasena` | Cambiar mi contraseña | Administrador, Supervisor, Vigilante (`ROLES_TODOS`) | `PATCH /api/usuarios/me/contrasena` |

Menú por rol (`MENU` en `lib/roles.ts`): el Administrador ve Dashboard, Historial, Auditoría, Registrar incidencia,
Personal y Catálogos; el Supervisor, Dashboard e Historial; el Vigilante, Registrar incidencia. Todos ven al pie,
bajo "Mi cuenta", "Cambiar mi contraseña"; por eso el Vigilante también tiene menú (desde la sección "Menú de navegación por rol", en el celular es una barra inferior). Un Supervisor
o Vigilante que escribe `/personal` o `/catalogos` es llevado a su pantalla de inicio; la API además responde 403.

### Módulos nuevos y modificados (`frontend/src/lib/`)

| Archivo | Responsabilidad | Funciones principales |
|---|---|---|
| `tipos.ts` (modificado) | DTO de la gestión. | `RolCatalogo`, `UsuarioGestion` (= `UsuarioResponse`, sin contraseña), `UsuarioRequest` (`contrasena: null` conserva la actual), `FiltroUsuarios`, `ZonaRequest`, `FiltroZonas`. |
| `servicios.ts` (modificado) | Llamadas a la API de RF-02 y RF-09; los filtros vacíos no se envían. | `listarRoles()`, `listarZonasActivas()`. `buscarUsuarios(filtro, page, size)` → `Pagina<UsuarioGestion>`. `crearUsuario(req)`, `actualizarUsuario(id, req)`, `cambiarEstadoUsuario(id, activo)` → `UsuarioGestion`. `restablecerContrasena(id, nueva)` (204). `contarVigilantesActivos(idZona, idRolVigilante)` → número (usa `totalElementos` de una página de tamaño 1). `buscarZonas(filtro, page, size)`, `crearZona`, `actualizarZona`, `cambiarEstadoZona`. `listarTiposEvento()`, `crearTipoEvento(nombre)`, `actualizarTipoEvento(id, nombre)`, `cambiarEstadoTipoEvento(id, activo)`. `listarNiveles()`, `actualizarNivel(id, nombre, orden)`. |
| `validaciones.ts` (modificado) | Reglas de los formularios nuevos. | `validarUsuario(campos, esVigilante, conContrasena)`: DNI de 8 dígitos, nombres (80) y apellidos (50) solo con letras, espacios, apóstrofo y guion, apellido materno opcional, rol obligatorio ("Elige un rol"), zona obligatoria para el Vigilante ("El Vigilante debe tener una zona asignada") y, al crear, contraseña de 8 a 72 con confirmación. `validarRestablecer({nueva, confirmacion})`. `validarZona(campos)`: nombre 80, departamento 50, provincia 50, distrito 80, referencia 150 y descripción 2000 (las dos últimas opcionales). `validarTipoEvento` (30). `validarNivel`: nombre 20 y orden entero de 1 a 32767 (`validarOrden`). `validarTexto(valor, max, opcional)` evalúa el texto recortado, como lo guarda el backend. |
| `roles.ts` (modificado) | Menú y acceso. | `ROLES_TODOS`, `RUTA_MI_CONTRASENA`; opciones Personal, Catálogos y "Cambiar mi contraseña" (`cuenta: true`). `opcionActiva(ruta, opciones)` → `href` de la opción con el prefijo más largo (así `/catalogos/tipos-evento` marca "Catálogos" y `/historial/auditoria` marca "Auditoría"). |

### Componentes (`frontend/src/components/`)

| Componente | Responsabilidad | Props principales |
|---|---|---|
| `Modal` (nuevo) | Diálogo `role="dialog"` con `aria-modal` y título enlazado; enfoca el primer campo, se cierra con Escape, "✕" o el fondo (salvo `bloqueado` mientras guarda) y devuelve el foco. Ocupa toda la pantalla en el celular. | `titulo`, `subtitulo?`, `onCerrar`, `bloqueado?`, `ancho?` (`sm`, `md`, `lg`). |
| `DialogoConfirmacion` (nuevo) | Confirmación antes de activar o desactivar. Muestra "Procesando…" y, si la API responde con error, el mensaje dentro del diálogo. | `titulo`, `textoConfirmar`, `variante?` (`peligro` o `primario`), `onConfirmar: () => Promise<void>`, `onCerrar`. |
| `CampoTexto`, `EnvolturaCampo` (nuevos) | Etiqueta, control, aviso en rojo (`error-<campo>`) y ayuda enlazados por `aria-describedby`. `EnvolturaCampo` sirve para selects y textareas. | `etiqueta`, `props` (de `useValidacion().propsCampo`), `valor`, `onCambio`, `error?`, `ayuda?`, `opcional?`. También exporta `describirCampo`, `idAyuda` y `ESTILO_CAMPO` (el bloqueo de no dígitos del DNI pasó a `CampoDni`). |
| `EtiquetaEstado` (nuevo) | Pastilla Activo/Inactivo (Activa/Inactiva con `femenino`). | `activo`, `femenino?`. |
| `FormularioCambioContrasena` (movido desde `app/cambiar-contrasena/`) | Contraseña actual, nueva (8 a 72, distinta de la actual) y confirmación. | `modo`: `obligatorio` (por defecto; al guardar cierra la sesión y lleva al login) o `voluntario` (la sesión sigue abierta, muestra "Contraseña actualizada…" y "Volver al inicio"). |
| `MenuLateral`, `MarcoPrivado` (modificados) | Resaltan la opción con `opcionActiva` y separan "Mi cuenta" al pie. | Sin cambios de props. |

### Páginas (`frontend/src/app/(privado)/`)

| Archivo | Qué muestra |
|---|---|
| `personal/GestionPersonal.tsx` | Búsqueda por DNI o nombre, filtros de rol, zona y estado, tabla (Nombre, DNI, Rol, Zona, Estado, Acciones) con paginación y aviso de éxito tras cada acción. En la propia fila ("(tú)") "Desactivar" y "Restablecer contraseña" están desactivados. |
| `personal/FormularioUsuario.tsx` | Modal de alta y edición. Al crear pide la contraseña temporal con confirmación y avisa que el usuario deberá cambiarla en su primer ingreso; al editar no la pide (se envía `contrasena: null`). El rol queda bloqueado al editarse a sí mismo. Errores del backend bajo su campo: DNI duplicado (409), zona inactiva o faltante, quitarse el rol de Administrador. |
| `personal/CampoZona.tsx` | Selector de zona: zonas activas más la zona actual del usuario, marcada "(inactiva)" si ya no lo está. |
| `personal/ReasignarZona.tsx` | Modal que solo cambia la zona: `PUT /api/usuarios/{id}` con los datos actuales de la fila y la zona nueva. |
| `personal/RestablecerContrasena.tsx` | Modal con la nueva contraseña temporal y su confirmación → `PATCH /api/usuarios/{id}/contrasena`. |
| `personal/nombreCompleto.ts` | `nombreCompleto(usuario)` → "Apellido paterno Apellido materno, Nombres". |
| `catalogos/PestanasCatalogos.tsx` | Título y pestañas Zonas, Tipos de evento y Niveles de gravedad (cada una es una ruta). |
| `catalogos/GestionZonas.tsx` | Filtros por nombre, departamento → provincia → distrito en cascada (opciones tomadas de las zonas existentes, porque la API compara esos campos por igualdad exacta), estado y texto libre; tabla paginada; confirmación de activar o desactivar. Al desactivar cuenta los vigilantes activos de la zona y avisa que siguen asignados y dejan de contarse en el despliegue hasta cambiarles la zona, con enlace a Personal. |
| `catalogos/FormularioZona.tsx` | Modal de alta y edición de zona con sugerencias (`datalist`) de departamentos, provincias y distritos ya usados; nombre duplicado (409) bajo el nombre. |
| `catalogos/tipos-evento/GestionTiposEvento.tsx` | Lista de todos los tipos, alta y renombrado en un modal, activar o desactivar con confirmación. "Otro" tiene "Editar" desactivado. |
| `catalogos/niveles-gravedad/GestionNiveles.tsx` | Lista por orden con el color de cada nivel; modal para nombre y orden que avisa con qué nivel se intercambiará el orden. |
| `mi-contrasena/page.tsx` | `FormularioCambioContrasena` en modo `voluntario`, dentro del marco con encabezado y menú. |

### Flujo: crear un Vigilante con un DNI que ya existe

1. En `/personal`, "+ Agregar personal" abre `FormularioUsuario`. Al elegir el rol Vigilante, `validarUsuario` exige la
   zona; los avisos aparecen al salir de cada campo o al pulsar "Crear usuario", y si hay alguno no se envía nada.
2. Con datos válidos, `crearUsuario` envía `POST /api/usuarios` con
   `{ dni, nombres, apellidoPaterno, apellidoMaterno, contrasena, idRol, idZona }` y el token.
3. `UsuarioController.crear` → `UsuarioService.crear` encuentra el DNI y lanza `DatoDuplicadoException`;
   `GlobalExceptionHandler` responde 409 `{ mensaje: "Ya existe un usuario con el DNI …", detalles: [] }`.
4. `erroresDelServidor` reconoce la regla y `useValidacion.ponerErroresServidor` muestra "Ya existe un usuario con este
   DNI" bajo el DNI y lo enfoca; el aviso se borra al editar el campo. Con un DNI nuevo la API responde 201, el
   usuario queda con `debe_cambiar_contrasena = true`, el modal se cierra y la tabla se recarga con el aviso
   "Se creó a … Su contraseña es temporal: deberá cambiarla en su primer ingreso."

### Cómo probar

```
cd frontend
npm run lint
npm run build
npm run dev
```

Con el backend en el perfil `local`:

1. Como Administrador, `/personal`: crear un Vigilante sin zona (aviso), con zona (aviso de contraseña temporal),
   repetir su DNI (409 bajo el DNI), reasignarle la zona, desactivarlo y activarlo, y restablecerle la contraseña.
2. Entrar como ese Vigilante: pide cambiar la temporal; después del restablecimiento la vuelve a pedir.
3. `/catalogos`: desactivar una zona con vigilantes y leer el número en la confirmación; filtrar por ubicación.
4. `/catalogos/tipos-evento`: crear un tipo y verlo en `/incidencias/nueva`; "Otro" no se puede editar.
5. `/catalogos/niveles-gravedad`: cambiar el orden de un nivel al de otro y ver el intercambio.
6. Con cada rol, "Cambiar mi contraseña" desde el menú; la sesión sigue abierta.
7. Como Supervisor y Vigilante: no aparecen Personal ni Catálogos y las rutas escritas en la barra redirigen.

Los casos completos son CP-25, CP-69, CP-70 a CP-77 y CP-90 a CP-103 del plan de pruebas integrales.

## Pruebas automatizadas y evidencias

Ejecución automática de las pruebas y generación de evidencias: los tests del backend con reporte HTML de Surefire y
cobertura JaCoCo, la colección Postman con Newman, pruebas de extremo a extremo y de validación con Playwright que
toman capturas `CP-xx_*.png`, y un índice HTML con su PDF que junta todos los resultados. No hay clases Java nuevas: el
`pom.xml` agrega `jacoco-maven-plugin` (agente en `test` y reporte en `target/site/jacoco`) y
`maven-surefire-report-plugin` (`report-only` → `target/reports/surefire.html`).

### Scripts de `pruebas/` (Node, módulos ES)

| Archivo | Responsabilidad | Funciones y salida |
|---|---|---|
| `casos.mjs` | Catálogo de los casos automatizados con los textos del plan. | `TIPOS` (orden y nombre de los tipos del reporte), `CASOS` (`id` → `{rf, tipo, descripcion, esperado, automatiza, soloCompleto?}`), `CASO_POR_PETICION` (nombre de la petición de la colección → `CP-xx`). |
| `scripts/coleccion.mjs` | Convierte la colección local (v3, un `*.request.yaml` por petición) al formato v2.1 de Newman, en memoria. | `cargarColeccion({completo})` → `{peticiones, incluidas, coleccion}`: ordena por `order`, normaliza `queryParams` (objeto o lista), pasa el cuerpo JSON, los scripts `afterResponse` como `test`, `auth: noauth` del Login y el Bearer `{{token}}` de `.resources/definition.yaml`. Sin `completo` solo incluye Login y GET; "Usuarios Mi Contrasena" siempre se excluye (`EXCLUIDAS`). `--listar` imprime cada petición y si corre. |
| `scripts/newman.mjs` | Corre la colección con la API de Node de Newman. | Arma el environment desde `BASE_URL`, `E2E_ADMIN_DNI`, `E2E_ADMIN_PASSWORD` (y `PRUEBAS_CONTRASENA_TEMPORAL` con `--completo`), sin escribirlo en disco. Salidas: `reportes/newman/newman.html` (htmlextra sin variables, sin `Authorization` y sin los cuerpos de login y contraseñas) y `reportes/newman/resumen.json` (petición, caso, código, tiempo y aserciones). Código de salida 0 si todas pasan, 1 si alguna falla, 2 si faltan variables. |
| `scripts/reporte.mjs` | Junta los resultados y genera las evidencias. | Lee `backend/target/surefire-reports/TEST-*.xml`, `jacoco.csv`, el resumen de Newman y `reportes/playwright/resultados.json`; asocia cada prueba a su caso (por el `CP-xx` del título del test o la anotación `caso`); un caso es Aprobado si todas sus pruebas ejecutadas pasan, Fallido si alguna falla y No ejecutado si todas se omitieron. Escribe `docs/evidencias/pruebas/index.html`, `reportes/resumen-casos.json` y, con el Chromium de Playwright, `reporte_pruebas.pdf` (A4, marcadores, pie "Página X de Y", sin cortar capturas). Antes del PDF busca contraseñas y DNIs de las variables `E2E_*` y tokens JWT; si aparecen en `index.html`, termina con código 3 sin generar el PDF. `--sin-pdf` omite el PDF. |
| `ejecutar-todo.cmd` | Orquesta la corrida en Windows. | Comprueba Node, `curl` y `JAVA_HOME`; instala dependencias si faltan; prueba `GET {BASE_URL}/api/auth/yo` (espera 401) y `GET {FRONTEND_URL}/login` (200); borra `pruebas/reportes`; corre `mvnw.cmd verify surefire-report:report-only -Dmaven.test.failure.ignore=true`, Newman, Playwright (borra antes las capturas) y `reporte.mjs`. `--completo` pasa a Newman. Sale con 1 si algo falló u omitió por error. |

### Pruebas de Playwright (`frontend/e2e/`)

| Archivo | Responsabilidad | Contenido |
|---|---|---|
| `playwright.config.ts` | Configuración. | Chromium 1366 × 768, `locale` es-PE, zona `America/Lima`, un worker, sin servidor propio (`FRONTEND_URL`); proyecto `sesiones` antes de `chromium`; reportes `list`, `html` (`pruebas/reportes/playwright/html`) y `json` (`resultados.json`). |
| `ayudas.ts` | Utilidades comunes. | `credenciales(rol)` → `{dni, contrasena}` o `null`; `exigirCredenciales(rol)` salta la prueba si faltan; `usarSesion(rol)` usa el `storageState` del rol (o salta la prueba si no existe); `caso(...ids)` anota el caso; `capturar(page, testInfo, nombre, {paginaCompleta, dniFicticio})` guarda `capturas/<nombre>.png`, tapa contraseñas, DNIs, búsquedas y textos de 8 dígitos y oculta el indicador de Next; `capturarAlFallar()` registra un `afterEach` que guarda `CP-xx_fallo.png` cuando la prueba falla; `escribirSecreto(campo, valor)` escribe con el setter nativo y un evento `input` para que el valor no quede en el reporte; `contarPeticionesApi(page, metodo?)` → función que devuelve cuántas peticiones a la API salieron; `esperarPantalla(page, ruta)` espera la URL y que no quede "Cargando…". |
| `sesiones.setup.ts` | Sesión de cada rol. | `POST /api/auth/login` por la API, comprueba que no tenga contraseña temporal y guarda `sgi.sesion` en `localStorage` → `e2e/.auth/<rol>.json`. |
| `login.spec.ts` | RF-01. | CP-70, CP-72, CP-77, CP-84 y CP-03 (sin sesión) y CP-13 (login de cada rol, destino y menú). |
| `acceso-roles.spec.ts` | Rutas de otro rol. | CP-13 / CP-103 con Vigilante y Supervisor. |
| `validaciones.spec.ts` | Avisos sin envío. | CP-75, CP-76 (`/mi-contrasena`), CP-77, CP-78, CP-79 (incidencias), CP-74, CP-90 (personal), CP-96, CP-99, CP-101 (catálogos). |
| `incidencia.spec.ts` | RF-03 en 360 × 740. | CP-33 (sin desplazamiento horizontal, botón fijo visible), CP-31 / CP-86 (registro real con confirmación y descripción recortada en el `POST`) y CP-89 (selector de zona con un catálogo ficticio interceptado: búsqueda, teclado, alto de opciones, lista limitada, solo zonas activas y zona obligatoria). |
| `paneles.spec.ts` | Pantallas de gerencia. | CP-45 (dashboard, periodo, agrupación y tipo de gráfico), CP-38 (historial y detalle), CP-51 (descarga Excel y PDF), CP-63 (auditoría como Administrador y sin pestaña como Supervisor), CP-25 (personal) y CP-69 (catálogos). |

### Flujo de una corrida

1. `ejecutar-todo.cmd` comprueba que el backend responda 401 en `/api/auth/yo` y el frontend 200 en `/login`.
2. Maven corre los 210 tests; Surefire deja `TEST-*.xml` y `surefire.html`, JaCoCo `jacoco.csv` e `index.html`.
3. `newman.mjs` carga la colección con `cargarColeccion`, inicia sesión con el Administrador (la petición "Login"
   guarda el token en el environment en memoria) y ejecuta las consultas; escribe `resumen.json`.
4. Playwright corre `sesiones.setup.ts` (una sesión por rol) y luego las pruebas, que guardan capturas en
   `docs/evidencias/pruebas/capturas` y las adjuntan al reporte.
5. `reporte.mjs` consolida por caso, escribe `index.html`, revisa que no haya secretos y genera el PDF.

### Cómo probar

```
cd pruebas && npm ci && npm run coleccion
cd ..\frontend && npx playwright test --list
cd .. && pruebas\ejecutar-todo.cmd
```

Abrir `docs/evidencias/pruebas/index.html` y `reporte_pruebas.pdf`. Sin variables `E2E_*`, las pruebas con sesión
aparecen omitidas y Newman como "No ejecutado". Requisitos y variables: `docs/evidencias/pruebas/README.md`.

## Frontend — selector de zona con búsqueda en el registro de incidencias (RF-03)

En `/incidencias/nueva` la zona se elige con un desplegable con búsqueda (combobox accesible) en lugar de un botón
por zona. Cada opción muestra el nombre y, debajo, el distrito; se busca por nombre, distrito, provincia o referencia
sin distinguir mayúsculas ni tildes. Solo se listan zonas activas y la del vigilante viene preseleccionada. Tipo de
evento y nivel de gravedad siguen como botones. No hay cambios en el backend ni dependencias nuevas.

### Componentes y páginas (`frontend/src/`)

| Archivo | Responsabilidad | Funciones / props principales |
|---|---|---|
| `components/SelectorBuscable.tsx` (modificado) | Combobox con disparador: un botón (`id` = campo) muestra la opción elegida con su detalle; al tocarlo abre una hoja inferior en el celular o un desplegable desde `sm` con un buscador enfocado (`role="combobox"`, `aria-activedescendant`) y una lista (`role="listbox"`). Opciones de 48 px de alto mínimo; con más de `MAX_OPCIONES_VISIBLES` (8) opciones la lista se limita a `28rem` y se desplaza. Sin resultados muestra "Sin coincidencias". Una región `aria-live` anuncia "N resultados" o "Sin coincidencias"; la opción activa lleva `aria-selected` y la elegida un ✓ con el texto oculto "(elegida)". | Props: `titulo`, `opciones: OpcionBuscable[]`, `valor`, `onCambio(valor)`, `placeholder`, `campo`, `error?`, `onSalir?`, `refPrimero?`, `destacado?` (opción que va primero con la marca `etiquetaDestacado`, "Tu zona" por defecto), `placeholderBusqueda?`. `OpcionBuscable`: `valor`, `etiqueta`, `detalle?` (segunda línea, se busca), `busqueda?` (texto que se busca sin mostrarse). `normalizar(texto)` → minúsculas sin tildes. Teclado: ↑/↓, Inicio/Fin, Enter elige, Escape y Tab cierran y devuelven el foco al botón. |
| `app/(privado)/incidencias/nueva/FormularioIncidencia.tsx` (modificado) | Arma las opciones de zona con `opcionesZona(zonas)`: filtra `estadoActivo`, `detalle` = distrito y `busqueda` = provincia + referencia. Preselecciona la zona del vigilante solo si está activa. La validación sigue en `validarIncidencia` (`lib/validaciones.ts`): sin zona, "Elige una zona" bajo el botón, borde rojo y foco en él. | — |

### Flujo: elegir una zona buscando por referencia

1. `FormularioIncidencia` llama a `cargarCatalogos()` → `GET /api/catalogos/zonas` (`CatalogoController.zonas` →
   `CatalogoServiceImpl.listarZonasActivas` → `ZonaDao.findByEstadoActivoTrueOrderByNombreZonaAsc`).
2. `opcionesZona` convierte cada zona activa en `{ valor, etiqueta: nombreZona, detalle: distrito, busqueda: "provincia referencia" }`.
3. El vigilante toca el botón: `SelectorBuscable` abre la lista con su zona primero ("Tu zona") y enfoca el buscador.
4. Escribe `kennedy`: `normalizar` compara contra `etiqueta + detalle + busqueda` y queda la zona cuya referencia es
   "Frente al parque Kennedy"; el lector de pantalla anuncia "1 resultado".
5. Enter llama a `onCambio(idZona)`, cierra la lista, devuelve el foco al botón y `useValidacion.alCambiar("idZona")`
   borra el aviso del campo.

### Cómo probar

- `cd frontend && npm run lint && npm run build`.
- `npx playwright test e2e/incidencia.spec.ts -g CP-89` (con la sesión de Vigilante; ver `docs/evidencias/pruebas/README.md`):
  usa un catálogo ficticio de 10 zonas y deja `CP-89_selector_zona_busqueda.png` y `CP-89_zona_obligatoria.png`.
- A mano: `npm run dev`, `/incidencias/nueva` en 360 px y seguir CP-89 del plan de pruebas, incluido el paso con
  lector de pantalla.

## Frontend — validación visible del DNI (RF-01, RF-02, RF-08)

Los campos DNI del login, del alta y edición de personal y del filtro de auditoría siguen bloqueando lo que no es
dígito, pero ahora lo hacen a la vista: ayuda fija debajo, contador "n/8" a la derecha, aviso ámbar temporal "Solo se
permiten números" al teclear o pegar letras o símbolos, aviso rojo al salir con un DNI incompleto (salvo en auditoría,
que busca por los primeros dígitos) y un texto junto al botón que explica por qué está desactivado. Solo frontend.

### Módulos y componentes (`frontend/src/`)

| Archivo | Responsabilidad | Funciones / props principales |
|---|---|---|
| `lib/validaciones.ts` (modificado) | Textos y reglas nuevas del DNI. | `MENSAJES.soloNumeros` ("Solo se permiten números"), `AYUDA_DNI` ("8 dígitos, solo números"), `AYUDA_DNI_BUSQUEDA` ("Hasta 8 dígitos, solo números"), `AVISO_TEMPORAL_MS` (3000). `tieneNoDigitos(texto)` → `true` si el texto escrito o pegado trae algún carácter que no es dígito. `validarDni` y `validarDniBusqueda` no cambian. |
| `lib/useValidacion.ts` (modificado) | Expone el primer aviso visible. | `primerErrorVisible()` → `{ campo, mensaje }` del primer campo de `orden` con aviso visible, o `null`. |
| `components/CampoDni.tsx` (nuevo) | Campo DNI completo: etiqueta, input (`inputMode="numeric"`, `maxLength` 8), contador "n/8" (verde al llegar a 8; para el lector de pantalla, "n de 8 dígitos" en `contador-<campo>`), aviso rojo (`error-<campo>`), aviso ámbar (`aviso-<campo>`, región `aria-live="polite"` siempre montada, se oculta a los 3 s y cada intento reinicia la cuenta) y ayuda fija (`ayuda-<campo>`). Al teclear bloquea el carácter no numérico o el noveno dígito (`beforeinput`); al pegar inserta solo los dígitos en la posición del cursor; `onChange` cubre el autocompletado y los teclados que no emiten `beforeinput`. | Props: `etiqueta?` ("DNI"), `props` (de `useValidacion().propsCampo`), `valor`, `onCambio(dniLimpio)`, `error?`, `ayuda?` (`AYUDA_DNI` por defecto), `placeholder?`, `className?` (tamaño en cada pantalla). |
| `components/MotivoDesactivado.tsx` (nuevo) | Texto breve junto al botón desactivado. | `textoMotivo(primero, etiquetas)` → "Revisa el campo {etiqueta}: {mensaje}" o `undefined`. `MotivoDesactivado({ id, texto, className? })`: párrafo que el botón enlaza con `aria-describedby`; el botón repite el texto en `title`. |
| `app/login/FormularioLogin.tsx` (modificado) | DNI con `CampoDni`; motivo bajo "Ingresar" (no se muestra mientras se envía o se redirige). | — |
| `app/(privado)/personal/FormularioUsuario.tsx` (modificado) | DNI con `CampoDni`; motivo a la izquierda de "Cancelar" y del botón de guardar (encima de los botones en el celular), con un nombre visible por campo. | — |
| `app/(privado)/historial/auditoria/ConsultaAuditoria.tsx` (modificado) | DNI con `CampoDni` y `AYUDA_DNI_BUSQUEDA`; se quitaron sus manejadores propios de teclado y pegado. Sin aviso rojo por tener menos de 8 dígitos (búsqueda por prefijo). Motivo bajo la fila del formulario. | — |

### Flujo: pegar `12a34b5678` en el DNI del login

1. `CampoDni.alPegar` cancela el pegado normal (con `maxLength` 8 el navegador cortaría el texto antes de quitar las
   letras), detecta letras con `tieneNoDigitos` y muestra el aviso ámbar durante 3 s.
2. Inserta `limpiarDni("12a34b5678")` = `12345678` en la posición del cursor y llama a `onCambio`.
3. `FormularioLogin` guarda el DNI y `useValidacion` recalcula `validarLogin`: el DNI es válido, el contador queda en
   "8/8" y, si no hay otros avisos, el botón "Ingresar" se habilita y desaparece el texto del motivo.
4. Nada llega al backend hasta pulsar "Ingresar" (`POST /api/auth/login`, sin cambios).

### Cómo probar

- `cd frontend && npm run lint && npm run build`.
- `npx playwright test e2e/login.spec.ts` (CP-70, CP-72, CP-77, CP-84 siguen pasando con los ids de siempre).
- A mano, con `npm run dev`: CP-70 a CP-73 en `/login` y en "+ Agregar personal", y CP-88 en `/historial/auditoria`.

## Frontend — botón de envío que no roba el foco (corrección DEF-01)

En los modales de alta (personal, zonas y tipos de evento), pulsar el botón de crear con el formulario vacío solo
mostraba el aviso del primer campo. Al presionar el botón, el campo enfocado perdía el foco, su aviso aparecía y el
botón se desactivaba antes de recibir el clic. Ahora los botones de envío no toman el foco con el puntero. Solo
frontend.

### Componentes (`frontend/src/`)

| Archivo | Responsabilidad | Funciones / props principales |
|---|---|---|
| `components/Boton.tsx` (modificado) | Botón con las variantes `primario`, `secundario` y `peligro`. Con `type="submit"` cancela el `mousedown` (`preventDefault`) para no quitar el foco al campo actual; el `onMouseDown` recibido por props se sigue llamando. Con el teclado (Tab y Enter o Espacio) se enfoca y funciona igual. | Props: `variante?` (`primario` por defecto), `type?` (`button` por defecto) y el resto de atributos de `<button>`. |

### Flujo: "Crear zona" con el formulario vacío

1. Al abrirse el modal, el foco está en "Nombre de la zona".
2. `mousedown` sobre "Crear zona": `Boton` lo cancela, así que el campo no pierde el foco y su `onBlur` (`alSalir`) no
   se dispara. El botón sigue habilitado.
3. `click` → `submit` → `useValidacion().intentarEnviar()` muestra los avisos de nombre, departamento, provincia y
   distrito, enfoca el nombre y devuelve `false`. No sale ninguna petición.
4. Desde ese momento el botón queda desactivado hasta que se corrigen los avisos.

### Cómo probar

- `cd frontend && npm run lint && npm run build`.
- `npx playwright test e2e/validaciones.spec.ts -g "CP-90|CP-96|CP-99"` (con las variables `E2E_*`).
- A mano: abrir "+ Nueva zona" y pulsar "Crear zona" sin escribir nada. Deben aparecer los cuatro avisos
  obligatorios y el foco debe ir al nombre. Repetir en "+ Agregar personal" (rol Vigilante sin zona) y en
  "+ Nuevo tipo".

## RF-03 — el Vigilante solo registra en su zona asignada

El Vigilante ya no elige la zona: registra únicamente en la que tiene asignada, y el backend rechaza cualquier otra.
El Administrador sigue eligiendo cualquier zona activa. El contrato de `POST /api/incidencias` no cambia (`idZona`
sigue siendo obligatorio).

### Backend (`backend/src/main/java/com/segandina/sgi/`)

| Clase | Paquete | Responsabilidad | Métodos públicos principales |
|---|---|---|---|
| `IncidenciaService` (modificado) | `service` | Mensajes de la regla: `SIN_ZONA_ASIGNADA`, `ZONA_ASIGNADA_INACTIVA`, `SOLO_ZONA_ASIGNADA`. | `registrar(IncidenciaRequest, Long idUsuario)` → `IncidenciaResponse`; ahora también lanza `ReglaNegocioException` si el Vigilante no tiene zona, su zona está inactiva o envía otra. |
| `IncidenciaServiceImpl` (modificado) | `service.impl` | Si el rol del usuario es `Vigilante`, valida su zona (método privado `validarZonaDelVigilante`) antes de buscar la zona pedida, así que una zona ajena recibe el mismo mensaje exista o no. El Administrador no pasa por esa regla. | `registrar(...)`. |

### Frontend (`frontend/src/`)

| Archivo | Responsabilidad | Funciones / props principales |
|---|---|---|
| `lib/servicios.ts` (modificado) | Relectura del usuario autenticado. | `refrescarUsuario()` → `Usuario`: `GET /api/auth/yo` y guarda el usuario en la sesión, conservando el token y su vencimiento. |
| `app/(privado)/incidencias/nueva/FormularioIncidencia.tsx` (modificado) | Al abrir carga a la vez los catálogos y `refrescarUsuario()`. Vigilante: título `#titulo-zona` "Zona asignada" y tarjeta de solo lectura `#idZona` con el nombre y, debajo, el distrito y el `idZona` fijo; sin zona o con la zona fuera del catálogo de activas, aviso en la tarjeta y botón desactivado con `MotivoDesactivado` (`#motivo-incidencia`). Administrador: `SelectorBuscable`. Los tres mensajes nuevos del 400 se muestran bajo la zona (regla `"zona asignada"` en `REGLAS_SERVIDOR`) y, si el usuario es Vigilante, el formulario vuelve a cargar el usuario y los catálogos. El botón muestra también el primer aviso pendiente como motivo. | — |

### Flujo: un Vigilante envía otra zona

1. `POST /api/incidencias` con `{ idZona: 5, … }` y el token del Vigilante (zona asignada 1).
2. `IncidenciaController.registrar` valida el DTO y llama a `IncidenciaService.registrar(request, Long.valueOf(jwt.getSubject()))`.
3. `IncidenciaServiceImpl` carga el usuario con `UsuarioDao.findById` (activo), ve el rol `Vigilante` y compara su zona
   asignada (activa, id 1) con `idZona` 5: lanza `ReglaNegocioException("Solo puede registrar incidencias en su zona asignada")`.
4. `GlobalExceptionHandler` responde 400 con `{timestamp, status, mensaje, detalles}`. No se consulta `ZonaDao`, no se
   inserta la incidencia ni se audita (la transacción se revierte).

### Cómo probar

- `cd backend && .\mvnw.cmd -q verify` (`IncidenciaServiceImplTest`: Vigilante en su zona, sin zona, con zona
  inactiva, con otra zona; Administrador en cualquier zona).
- `cd frontend && npm run lint && npm run build`; con las variables `E2E_*`, `npx playwright test e2e/incidencia.spec.ts`
  (CP-31, CP-89, CP-105, CP-106).
- `cd pruebas && npm run newman` con `E2E_VIGILANTE_DNI` y `E2E_VIGILANTE_PASSWORD`: "Login Vigilante" y
  "Registrar Incidencia Otra Zona" (CP-104, 400).
- A mano: `curl -X POST http://localhost:8080/api/incidencias -H "Authorization: Bearer <token de vigilante>" -H "Content-Type: application/json" -d "{\"idZona\":999999,\"idTipoEvento\":1,\"idNivelGravedad\":2,\"descripcion\":\"Prueba\"}"` → 400.

## Menú de navegación por rol

El menú se agrupa por títulos ("Gestión", "Administración", "Mi cuenta") y cada opción lleva un ícono SVG en línea.
El encabezado muestra el título de la pantalla actual. En escritorio hay una barra lateral fija; por debajo de `lg`,
un panel deslizable con manejo de foco y Escape; y el Vigilante, en el celular, navega con una barra inferior fija.
La lógica de acceso por rol no cambia (`RutaProtegida`, `ROLES_*`, `rutaInicio`).

### Frontend (`frontend/src/`)

| Archivo | Responsabilidad | Funciones / props principales |
|---|---|---|
| `lib/roles.ts` (modificado) | Modelo del menú. `OpcionMenu` tiene ahora `grupo` (`GrupoMenu`), `icono` (`NombreIcono`), `etiquetaCorta?` (texto de la barra inferior: "Registrar") y `disponible?` (`false` = preparada y oculta: "Mis incidencias" del Vigilante, `/mis-incidencias`). Sustituye al antiguo `cuenta?`. | `GRUPOS_MENU`: orden de los grupos. `menuDe(rol)` → opciones del rol sin las de `disponible: false`. `gruposDe(opciones)` → `{ titulo, opciones }[]` en el orden de `GRUPOS_MENU`, sin grupos vacíos. `opcionActiva(ruta, opciones)` sin cambios. |
| `components/IconoMenu.tsx` (nuevo) | Ícono SVG de 24×24 en trazo (`currentColor`), decorativo (`aria-hidden`); sin dependencias. | Props: `nombre: NombreIcono`, `className?` (`h-5 w-5` por defecto). |
| `components/MenuLateral.tsx` (modificado) | Barra lateral (`lg`, `aside` "Menú lateral") y panel deslizable (`< lg`, `role="dialog"`, `id="menu-panel"`), ambos con el `nav` "Menú principal" agrupado. El panel enfoca el primer enlace al abrir, mantiene el Tab dentro, se cierra con Escape, ✕, fondo o al elegir y devuelve el foco al botón "Menú". En el panel, "Mi cuenta" agrega "Cerrar sesión". | Props: `opciones`, `abierto`, `onCerrar`, `botonMenuRef`. Exporta `ID_PANEL_MENU`. |
| `components/BarraInferior.tsx` (nuevo) | Solo Vigilante y solo `< sm`: `nav` "Navegación inferior" fija al pie (alto 4rem) con las opciones de trabajo ("Registrar") y el botón "Mi cuenta", que abre la hoja `role="dialog"` "Mi cuenta" con "Cambiar mi contraseña" y "Cerrar sesión" (Escape o fondo la cierran y el foco vuelve al botón). La opción actual lleva `aria-current="page"` ("Mi cuenta" en `/mi-contrasena`). | Props: `opciones`. |
| `components/Encabezado.tsx` (modificado) | Título de la pantalla actual (`data-testid="titulo-pantalla"`, la etiqueta de la opción activa) y usuario · rol. Botón "Menú" con ícono, `aria-expanded` y `aria-controls`; oculto en `lg` y, si hay barra inferior, también en `< sm`. "Cerrar sesión" del encabezado se oculta en `< sm` cuando el menú lo ofrece en "Mi cuenta". | Props: `opciones`, `onAbrirMenu?`, `menuAbierto?`, `botonMenuRef?`, `conBarraInferior?`. |
| `components/MarcoPrivado.tsx` (modificado) | Arma encabezado, menú y barra inferior según el rol; guarda el `ref` del botón "Menú" y publica la variable CSS `--alto-barra-inferior` (4rem en `< sm` con barra; 0 en otro caso), que agrega espacio al pie del contenido. | — |
| `app/(privado)/incidencias/nueva/FormularioIncidencia.tsx` (modificado) | El contenedor fijo del botón "Registrar incidencia" se ubica en `bottom: var(--alto-barra-inferior)` (`z-30`): con la barra queda justo encima de ella; sin barra (Administrador) sigue al pie. | — |

### Flujo: el Supervisor abre el menú en una tablet

1. `MarcoPrivado` calcula `menuDe("Supervisor")` → Dashboard, Historial y Cambiar mi contraseña (más de una opción: hay menú; no es Vigilante: sin barra inferior).
2. `Encabezado` muestra "Dashboard" como título (`opcionActiva("/dashboard", …)`) y el botón "Menú" con `aria-expanded="false"`.
3. Clic en "Menú" → `menuAbierto = true` → `MenuLateral` dibuja el panel con `gruposDe(...)`: "Gestión" y "Mi cuenta" (con "Cerrar sesión"); el efecto enfoca "Dashboard".
4. Escape → `onCerrar()` → el panel se desmonta y el efecto devuelve el foco a `botonMenuRef` ("Menú", otra vez `aria-expanded="false"`).

### Cómo probar

- `cd frontend && npm run lint && npm run build`.
- Con las variables `E2E_*` y el backend y el frontend en marcha: `npx playwright test e2e/navegacion.spec.ts`
  (CP-107 Vigilante a 360 × 740, CP-108 Supervisor a 768 × 1024, CP-109 Administrador a 1366 × 768).
- A mano, con las herramientas de desarrollo del navegador en modo dispositivo: como Vigilante a 360 px, comprobar la
  barra inferior, que el botón "Registrar incidencia" no quede tapado y la hoja "Mi cuenta"; como Supervisor a 768 px,
  abrir "Menú", recorrer con Tab (no sale del panel) y cerrar con Escape; en escritorio, navegar y ver la opción marcada.

### Corrección de DEF-01 en `Modal` y ajuste de CP-106

| Archivo | Cambio |
|---|---|
| `components/Modal.tsx` (modificado) | El elemento que abrió el modal se guarda una sola vez en una referencia y el foco se le devuelve solo cuando el panel ya no está en el DOM (cierre real, comprobado en un `setTimeout`). En desarrollo, React ejecuta el efecto dos veces (modo estricto); antes, la primera limpieza movía el foco fuera del primer campo, que mostraba "Este campo es obligatorio" y dejaba desactivado el botón de envío antes del clic. Props sin cambios. |
| `e2e/incidencia.spec.ts` (CP-106) | Oculta el indicador flotante de Next (`ocultarIndicadorNext`) al abrir la pantalla y no solo antes de enviar: en `npm run dev`, a 360 px, el indicador intercepta los clics en la hoja de zonas y en los botones de la parte baja. No es un fallo de la aplicación (con el indicador oculto, el clic y el teclado funcionan igual a 360 px y en escritorio). |

Cómo probar: `cd frontend && npx playwright test e2e/validaciones.spec.ts -g "CP-90|CP-96|CP-99"` y
`npx playwright test e2e/incidencia.spec.ts -g "CP-106"`. A mano, en `npm run dev`: abrir "+ Nueva zona" y pulsar
"Crear zona" sin escribir: aparecen los cuatro avisos y el foco va al nombre; al cerrar el modal, el foco vuelve a
"+ Nueva zona".

## RF-05 — dashboard con filtros globales y filtrado cruzado

El dashboard tiene una barra de filtros global (periodo, zona, tipo de evento y gravedad) que afecta a los KPI, las
barras, el anillo y la serie. Un clic en una barra de zona, un sector del anillo o una tarjeta de gravedad aplica o
quita ese filtro; cada gráfico se consulta sin su propio filtro y resalta lo elegido. Los filtros viven en la URL,
se muestran como chips y "Ver en historial" abre el historial con los mismos parámetros. Solo cambia el frontend: el
backend ya aceptaba `idZona`, `idTipoEvento` e `idNivelGravedad` en los endpoints del dashboard.

### Frontend (`frontend/src/`)

| Archivo | Responsabilidad | Funciones / props principales |
|---|---|---|
| `lib/filtrosUrl.ts` (nuevo) | Convierte los filtros comunes de/a la URL y los alterna desde los gráficos. Define `FILTRO_INICIAL` (últimos 30 días sin filtros; `FiltrosIncidencia` lo reexporta). | `DIMENSIONES`: `{ clave, etiqueta }` de zona, tipo y gravedad (orden de los chips; un filtro nuevo, como el estado actual, se suma aquí y en `FiltroIncidencias`). `filtroDesdeUrl(params)` → `FiltroIncidencias`: valida el periodo, el rango personalizado con `validarRangoFechas` y los ids (enteros positivos); lo inválido queda con el valor por defecto. `consultaDesdeFiltro(filtro)` → query string sin "?" (usa `parametrosIncidencias`; omite el periodo por defecto). `sinFiltro(filtro, clave)` → el filtro sin esa dimensión. `alternarFiltro(filtro, clave, id)` → aplica el id o lo quita si ya estaba. `claveFiltro(filtro)` → texto estable para comparar filtros. |
| `lib/useFiltroUrl.ts` (nuevo) | Hook que usa la URL como única fuente de verdad de los filtros (`useSearchParams`; el componente debe estar dentro de `<Suspense>`). | `useFiltroUrl()` → `{ filtro, consulta, aplicar(nuevo) }`. `aplicar` hace `router.push` (sin desplazar la página) solo si la consulta cambia, así "Atrás" deshace cada cambio. |
| `components/ChipsFiltros.tsx` (nuevo) | Grupo "Filtros activos": un chip por filtro (periodo solo si no es el de defecto; zona, tipo y gravedad con su nombre, o "n.° id" si no está en los catálogos activos), cada uno con "×" (`aria-label="Quitar filtro …"`), y "Quitar todo". No dibuja nada sin filtros. | Props: `filtro`, `catalogos: Catalogos \| null`, `onCambio(filtro)`. |
| `components/FiltrosIncidencia.tsx` (modificado) | Recibe los catálogos por prop (la pantalla los carga una vez y los comparte con los chips). Reinicia `SelectorPeriodo` con una `key` cuando el periodo cambia desde fuera ("Atrás"). Un id que no está en las opciones (zona inactiva llegada por la URL) se agrega como "Zona n.° id". | Props: `valor`, `onCambio`, `catalogos: ConsultaCatalogos`, `sinQuitar?` (oculta "Quitar filtros"). Exporta el tipo `ConsultaCatalogos`. |
| `components/Tarjeta.tsx` (modificado) | `TarjetaKpi` puede ser un botón que filtra. | Props nuevas: `onElegir?()` (la dibuja como `<button aria-pressed>`), `seleccionada?` (borde marcado), `atenuada?`. |
| `components/graficos/GraficoBarras.tsx` y `GraficoAnillo.tsx` (modificados) | Clic en una barra (toda la fila de la zona) o en un sector o su leyenda llama a `onElegir` con el id; mano como cursor sobre lo elegible; lo no elegido se atenúa y el sector elegido sobresale. | Props nuevas: `seleccionado?: number \| null`, `onElegir?(id)`. |
| `components/graficos/TablaAccesible.tsx` (modificado) | Con `onElegir`, cada fila tiene un botón "Filtrar por …" con `aria-pressed`; la tabla es invisible pero se muestra mientras uno de sus botones tiene el foco. | Props nuevas: filas con `id?`, `seleccionado?`, `onElegir?(id)`. |
| `components/graficos/registro.ts` (modificado) | Ayudas compartidas por los gráficos que filtran. | `atenuar(hex, alfa = 0.25)` → `rgba(...)`. `indiceElegido(elementos)` → índice o `null`. `cursorElegible(evento, elementos)` (para `onHover`). |
| `app/(privado)/dashboard/PanelDashboard.tsx` (modificado) | Usa `useFiltroUrl`; barra `FiltrosIncidencia`, `ChipsFiltros` y el enlace "Ver en historial". Arma un filtro por gráfico con `sinFiltro`: barras sin zona, anillo sin tipo y tarjetas de gravedad con un `kpis` sin gravedad (si no hay gravedad elegida, esa misma consulta da los KPI y no se hace una segunda). La agrupación de la serie se recuerda solo para el periodo en que se eligió. Bloques internos `SeccionIndicadores` y `SeccionDespliegue` y un lugar marcado para la futura sección "Atención de casos". | — |
| `app/(privado)/historial/HistorialIncidencias.tsx` (modificado) | Lee y escribe los filtros en la URL con `useFiltroUrl`; la página y el detalle abierto se guardan junto con la consulta en que se eligieron, así un cambio de filtros (también con "Atrás") vuelve a la primera página. | — |
| `app/(privado)/dashboard/page.tsx` e `historial/page.tsx` (modificados) | Envuelven el contenido en `<Suspense fallback={<Cargando />}>`, que Next exige alrededor de `useSearchParams`. | — |

### Flujo: clic en el sector "Robo" del anillo

1. Chart.js llama a `options.onClick` de `GraficoAnillo` con el elemento bajo el puntero; `indiceElegido` da su índice y se llama `onElegir(datos[i].id)`.
2. `PanelDashboard` ejecuta `alternar("idTipoEvento", id)` → `alternarFiltro(filtro, …)` → `aplicar(nuevo)` → `router.push("/dashboard?idTipoEvento=…")`.
3. `useSearchParams` cambia → `filtroDesdeUrl` da el filtro nuevo → los `useMemo` recalculan `filtroZonas` (con tipo) y `filtroTipos` (sin tipo).
4. `useConsulta` vuelve a pedir `GET /api/dashboard/kpis`, `incidencias-por-zona` e `incidencias-por-tiempo` con `idTipoEvento`, y `incidencias-por-tipo` sin él; en el backend, `DashboardController` → `DashboardServiceImpl` → `IncidenciaEstadisticasDao` agregan con esos filtros.
5. `ChipsFiltros` muestra "Tipo de evento: Robo", el selector "Tipo de evento" queda en Robo y el anillo resalta su sector. "Atrás" vuelve a la URL anterior y todo se recalcula igual.

### Cómo probar

- `cd frontend && npm run lint && npm run build`.
- `npx playwright test e2e/dashboard-filtros.spec.ts` (CP-110 a CP-114; sesión de Supervisor, con catálogos,
  dashboard e historial simulados: no depende de los datos de la base ni escribe).
- A mano en `/dashboard`: elegir una zona y ver el chip y la URL; clic en un sector, en una barra y en una tarjeta de
  gravedad (otro clic lo quita); Tab hasta la tabla de un gráfico y Enter en "Filtrar por …"; "Atrás" y "Adelante";
  copiar la URL en otra pestaña; "Ver en historial" y comparar "N registros" con "Incidencias del periodo".

## RF-05 — usabilidad del filtrado cruzado del dashboard

Antes, tras un clic en un gráfico no había una forma visible de volver a ver todo: los chips quedaban arriba, dentro
de la tarjeta de filtros, y desaparecían sin filtros. Ahora una barra de filtros activos fija queda justo encima de
los gráficos ("Mostrando todo" o los chips con "×" y "Quitar filtros"), cada gráfico filtrado avisa "Filtrado por …
· Ver todo", y un filtro también se quita con un clic en un espacio vacío del gráfico o con Escape. Solo cambia el
frontend.

### Frontend (`frontend/src/`)

| Archivo | Responsabilidad | Funciones / props principales |
|---|---|---|
| `components/ChipsFiltros.tsx` (modificado) | Barra de filtros activos: siempre se dibuja. Sin filtros muestra "Mostrando todo"; con filtros, un chip con "×" por cada uno y el botón "Quitar filtros" (antes "Quitar todo"). Una región `aria-live="polite"` oculta (`data-testid="anuncio-filtros"`) anuncia "Filtros activos: …" o "Mostrando todo" en cada cambio. | Props sin cambios: `filtro`, `catalogos`, `onCambio(filtro)`. Exporta `textoFiltro(clave, id, catalogos)` → "Zona: Zona Sur" (o "Zona: n.° 7" si el id no está en los catálogos), usado por los chips y los avisos. |
| `app/(privado)/dashboard/PanelDashboard.tsx` (modificado) | Indicación de uso bajo el título. Saca `ChipsFiltros` de la tarjeta de filtros a un contenedor propio (`data-testid="barra-filtros"`, `lg:sticky lg:top-2`) justo antes de los KPI. Agrega `quitar(clave)` (aplica `sinFiltro`) y un `keydown` en `document`: Escape aplica `FILTRO_INICIAL` si hay filtros y el foco está en el dashboard o en `body` (no en `input`, `select` ni `textarea`). | Componente interno `AvisoFiltro({ filtro, propia?, catalogos, quitar })`: en el slot `acciones` de `Tarjeta`, lista "Filtrado por <texto> · Ver todo" por cada dimensión activa distinta de `propia` (`data-aviso=<clave>`); el botón "Ver todo" (`aria-label="Ver todo: quitar filtro …"`) llama a `quitar(clave)`. |
| `components/graficos/GraficoBarras.tsx` (modificado) | El tooltip sigue respondiendo en toda la fila de la zona, pero el clic solo elige la barra si cae entre su inicio y su extremo (al menos 24 px); el clic en el espacio en blanco a la derecha, con una zona elegida, llama a `onQuitar`. El cursor de mano sigue la misma regla. | Prop nueva `onQuitar?()`. |
| `components/graficos/GraficoAnillo.tsx` (modificado) | Un clic sin sector debajo dentro del área de dibujo (hueco central o esquinas), con un tipo elegido, llama a `onQuitar`. La leyenda conserva su propio clic. | Prop nueva `onQuitar?()`. |
| `components/graficos/registro.ts` (modificado) | Ayudas para distinguir un clic en un elemento de un clic en vacío. | `enAreaDeDibujo(evento, grafico)` → `true` si el evento cae en `chartArea` (sin ejes ni leyenda). `indiceBarraBajoPuntero(evento, elementos)` → índice de la barra horizontal si `evento.x` no pasa de `max(extremo, inicio + 24)`, o `null`. |

Chart.js solo llama a `options.onClick` dentro del área de dibujo, así que un clic en los nombres de zona del eje no
filtra ni quita nada.

### Flujo: clic en el espacio vacío junto a una barra con "Zona Sur" elegida

1. Chart.js llama a `onClick` de `GraficoBarras` con la fila bajo el puntero (`mode: "index"`); `indiceBarraBajoPuntero` ve que `evento.x` pasa del extremo de la barra y devuelve `null`.
2. Como hay una zona elegida, se llama `onQuitar()` → `quitar("idZona")` en `PanelDashboard` → `aplicar(sinFiltro(filtro, "idZona"))` → `router.push("/dashboard")`.
3. `useFiltroUrl` lee la URL nueva; `useConsulta` vuelve a pedir `kpis`, `incidencias-por-tipo` e `incidencias-por-tiempo` sin `idZona` (en el backend, `DashboardController` → `DashboardServiceImpl` → `IncidenciaEstadisticasDao`).
4. `ChipsFiltros` muestra "Mostrando todo" y la región `aria-live` lo anuncia; los avisos "Filtrado por Zona: …" del anillo y la serie desaparecen. "Atrás" vuelve a `?idZona=…` y todo se recalcula igual.

### Cómo probar

- `cd frontend && npm run lint && npm run build`.
- `npx playwright test e2e/dashboard-filtros.spec.ts` (CP-110 a CP-116; sesión de Supervisor con catálogos,
  dashboard e historial simulados: no depende de los datos de la base ni escribe).
- A mano en `/dashboard` (ventana ancha): clic en una barra → chip y aviso "Filtrado por" en el anillo y la serie →
  "Ver todo"; clic a la derecha de una barra y en el centro del anillo; Escape tras un clic en un gráfico; "Atrás";
  desplazar hasta la serie y comprobar que la barra de filtros queda arriba. Con NVDA, comprobar que cada cambio se
  anuncia.
