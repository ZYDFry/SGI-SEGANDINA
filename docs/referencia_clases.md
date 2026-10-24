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
| `Zona` | `zona` | `Integer` | Zona o sede: `nombreZona`, `descripcion`. |
| `TipoEvento` | `tipo_evento` | `Short` | Catálogo: `nombreTipoEvento` (Robo, Accidente, Alerta, Otro). |
| `NivelGravedad` | `nivel_gravedad` | `Short` | Catálogo: `nombreNivel` y `orden` (1 = menos grave). |
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
| `ZonaDao` | `JpaRepository<Zona, Integer>` | `Optional<Zona> findByNombreZona(String nombreZona)`: busca una zona por nombre exacto. |
| `TipoEventoDao` | `JpaRepository<TipoEvento, Short>` | — |
| `NivelGravedadDao` | `JpaRepository<NivelGravedad, Short>` | `List<NivelGravedad> findAllByOrderByOrdenAsc()`: niveles de menos a más grave. |
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
