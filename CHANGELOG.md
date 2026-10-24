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
