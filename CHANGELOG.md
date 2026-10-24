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
  - **Validación del mapeo contra Supabase (`ddl-auto=validate`) aún no ejecutada**: falta crear
    `application-local.properties`. Punto a vigilar: las columnas `char(8)` (`dni`, `dni_intentado`);
    si el validador las rechaza, añadir `@JdbcTypeCode(SqlTypes.CHAR)`.
  - Mientras no exista configuración de seguridad, Spring Security genera un usuario temporal en memoria
    (se reemplaza en la Fase 2 con login por DNI y JWT).
  - La vista `v_despliegue_por_zona` se consumirá con consulta nativa en la Fase 5.
  - En Windows, `mvnw.cmd` exige que `JAVA_HOME` apunte al JDK 21 (p. ej. `C:\Program Files\Java\jdk-21.0.12.1`).
