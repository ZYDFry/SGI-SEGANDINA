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
