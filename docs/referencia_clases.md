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

```
cd backend
./mvnw -q verify
```
`MapeoEntidadesTest.catalogoNuevoEstaActivoPorDefecto` comprueba que una `Zona`, un `TipoEvento` y un
`NivelGravedad` nuevos están activos. Para confirmar que las columnas existen en Supabase, usar el arranque con
`ddl-auto=validate` descrito en la sección anterior.
