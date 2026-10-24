-- =====================================================
-- SGI-SEGANDINA | Seguridad Andina S.A.C.
-- Script de creación de base de datos - Versión 1.2
-- Motor: PostgreSQL (Supabase) - ejecutar en SQL Editor
-- 7 tablas: rol, zona, tipo_evento, nivel_gravedad,
--           usuario, incidencia, auditoria
-- =====================================================

-- 1. ROL
CREATE TABLE rol (
    id_rol      SMALLSERIAL PRIMARY KEY,
    nombre_rol  VARCHAR(30) NOT NULL UNIQUE
);

-- 2. ZONA
CREATE TABLE zona (
    id_zona      SERIAL PRIMARY KEY,
    nombre_zona    VARCHAR(80) NOT NULL UNIQUE,
    departamento   VARCHAR(50) NOT NULL,
    provincia      VARCHAR(50) NOT NULL,
    distrito       VARCHAR(80) NOT NULL,
    referencia     VARCHAR(150),                       -- opcional: dirección o punto de referencia
    descripcion    TEXT,
    estado_activo  BOOLEAN NOT NULL DEFAULT TRUE    -- baja lógica
);

-- 3. TIPO_EVENTO (catálogo)
CREATE TABLE tipo_evento (
    id_tipo_evento      SMALLSERIAL PRIMARY KEY,
    nombre_tipo_evento  VARCHAR(30) NOT NULL UNIQUE,
    estado_activo       BOOLEAN NOT NULL DEFAULT TRUE    -- baja lógica
);

-- 4. NIVEL_GRAVEDAD (catálogo)
CREATE TABLE nivel_gravedad (
    id_nivel_gravedad  SMALLSERIAL PRIMARY KEY,
    nombre_nivel       VARCHAR(20) NOT NULL UNIQUE,
    orden              SMALLINT NOT NULL UNIQUE,         -- 1 = menos grave
    estado_activo      BOOLEAN NOT NULL DEFAULT TRUE     -- baja lógica
);

-- 5. USUARIO
CREATE TABLE usuario (
    id_usuario       BIGSERIAL PRIMARY KEY,
    dni              CHAR(8) NOT NULL UNIQUE,
    nombres          VARCHAR(80) NOT NULL,
    apellido_paterno VARCHAR(50) NOT NULL,
    apellido_materno VARCHAR(50),                    -- opcional: hay personas con un solo apellido
    contrasena       VARCHAR(255) NOT NULL,          -- hash BCrypt
    estado_activo    BOOLEAN NOT NULL DEFAULT TRUE,
    id_rol           SMALLINT NOT NULL,
    id_zona          INTEGER,
    CONSTRAINT chk_usuario_dni CHECK (dni ~ '^[0-9]{8}$'),
    CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol)
        REFERENCES rol (id_rol) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_usuario_zona FOREIGN KEY (id_zona)
        REFERENCES zona (id_zona) ON UPDATE CASCADE ON DELETE SET NULL
);

-- 6. INCIDENCIA
CREATE TABLE incidencia (
    id_incidencia      BIGSERIAL PRIMARY KEY,
    fecha_hora         TIMESTAMPTZ NOT NULL,                 -- cuándo ocurrió
    fecha_registro     TIMESTAMPTZ NOT NULL DEFAULT now(),   -- cuándo se registró
    descripcion        TEXT NOT NULL,
    id_tipo_evento     SMALLINT NOT NULL,
    id_nivel_gravedad  SMALLINT NOT NULL,
    id_usuario         BIGINT NOT NULL,
    id_zona            INTEGER NOT NULL,
    CONSTRAINT fk_incidencia_tipo FOREIGN KEY (id_tipo_evento)
        REFERENCES tipo_evento (id_tipo_evento) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_incidencia_gravedad FOREIGN KEY (id_nivel_gravedad)
        REFERENCES nivel_gravedad (id_nivel_gravedad) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_incidencia_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_incidencia_zona FOREIGN KEY (id_zona)
        REFERENCES zona (id_zona) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- 7. AUDITORIA
CREATE TABLE auditoria (
    id_auditoria      BIGSERIAL PRIMARY KEY,
    accion_realizada  VARCHAR(60) NOT NULL,
    detalle_cambio    JSONB,
    fecha_hora        TIMESTAMPTZ NOT NULL DEFAULT now(),
    dni_intentado     CHAR(8),
    id_usuario        BIGINT,                             -- NULL si el usuario no existe
    CONSTRAINT fk_auditoria_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- =====================================================
-- ÍNDICES (Dashboard, RF-07 y búsqueda de zonas RF-09)
-- =====================================================
CREATE INDEX idx_zona_ubicacion     ON zona (departamento, provincia, distrito);
CREATE INDEX idx_usuario_zona       ON usuario (id_zona) WHERE estado_activo;
CREATE INDEX idx_incidencia_fecha   ON incidencia (fecha_hora DESC);
CREATE INDEX idx_incidencia_zona    ON incidencia (id_zona, fecha_hora DESC);
CREATE INDEX idx_incidencia_usuario ON incidencia (id_usuario);
CREATE INDEX idx_incidencia_tipo    ON incidencia (id_tipo_evento);
CREATE INDEX idx_incidencia_nivel   ON incidencia (id_nivel_gravedad);
CREATE INDEX idx_auditoria_usuario  ON auditoria (id_usuario, fecha_hora DESC);
CREATE INDEX idx_auditoria_fecha    ON auditoria (fecha_hora DESC);

-- =====================================================
-- RNF-01: AUDITORÍA INMUTABLE (capa 1: triggers)
-- =====================================================
CREATE OR REPLACE FUNCTION fn_auditoria_inmutable()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'La tabla auditoria es inmutable: operacion % no permitida', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auditoria_no_modificar
BEFORE UPDATE OR DELETE ON auditoria
FOR EACH ROW EXECUTE FUNCTION fn_auditoria_inmutable();

CREATE TRIGGER trg_auditoria_no_truncar
BEFORE TRUNCATE ON auditoria
FOR EACH STATEMENT EXECUTE FUNCTION fn_auditoria_inmutable();

-- =====================================================
-- RF-07: VIGILANTES ACTIVOS POR ZONA (solo zonas activas)
-- security_invoker: la vista respeta el RLS de las tablas base
-- =====================================================
CREATE OR REPLACE VIEW v_despliegue_por_zona
WITH (security_invoker = true) AS
SELECT z.id_zona,
       z.nombre_zona,
       COUNT(u.id_usuario) AS vigilantes_activos
FROM zona z
LEFT JOIN usuario u
       ON u.id_zona = z.id_zona
      AND u.estado_activo = TRUE
      AND u.id_rol = (SELECT id_rol FROM rol WHERE nombre_rol = 'Vigilante')
WHERE z.estado_activo = TRUE
GROUP BY z.id_zona, z.nombre_zona;

-- =====================================================
-- DATOS SEMILLA (catálogos)
-- =====================================================
INSERT INTO rol (nombre_rol) VALUES ('Administrador'), ('Supervisor'), ('Vigilante');

INSERT INTO tipo_evento (nombre_tipo_evento)
VALUES ('Robo'), ('Accidente'), ('Alerta'), ('Otro');

INSERT INTO nivel_gravedad (nombre_nivel, orden)
VALUES ('Baja', 1), ('Media', 2), ('Alta', 3), ('Crítica', 4);

-- =====================================================
-- SUPABASE: RLS (bloquea la API pública de Supabase)
-- =====================================================
ALTER TABLE rol            ENABLE ROW LEVEL SECURITY;
ALTER TABLE zona           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipo_evento    ENABLE ROW LEVEL SECURITY;
ALTER TABLE nivel_gravedad ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario        ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidencia     ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria      ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RNF-01 (capa 2): ROL DE APLICACIÓN CON PRIVILEGIOS MÍNIMOS
-- Spring Boot debe conectarse con este rol, no con 'postgres'.
-- Cambia la contraseña antes de ejecutar.
-- =====================================================
CREATE ROLE app_sgi LOGIN PASSWORD 'CAMBIAR_ESTA_CLAVE';

GRANT USAGE ON SCHEMA public TO app_sgi;
GRANT SELECT, INSERT, UPDATE ON rol, zona, tipo_evento, nivel_gravedad, usuario, incidencia TO app_sgi;
GRANT SELECT, INSERT ON auditoria TO app_sgi;      -- sin UPDATE ni DELETE
GRANT SELECT ON v_despliegue_por_zona TO app_sgi;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_sgi;

-- Con RLS activo, el rol necesita políticas para operar
CREATE POLICY p_app_all_rol            ON rol            FOR ALL TO app_sgi USING (true) WITH CHECK (true);
CREATE POLICY p_app_all_zona           ON zona           FOR ALL TO app_sgi USING (true) WITH CHECK (true);
CREATE POLICY p_app_all_tipo_evento    ON tipo_evento    FOR ALL TO app_sgi USING (true) WITH CHECK (true);
CREATE POLICY p_app_all_nivel_gravedad ON nivel_gravedad FOR ALL TO app_sgi USING (true) WITH CHECK (true);
CREATE POLICY p_app_all_usuario        ON usuario        FOR ALL TO app_sgi USING (true) WITH CHECK (true);
CREATE POLICY p_app_all_incidencia     ON incidencia     FOR ALL TO app_sgi USING (true) WITH CHECK (true);
CREATE POLICY p_app_sel_auditoria      ON auditoria      FOR SELECT TO app_sgi USING (true);
CREATE POLICY p_app_ins_auditoria      ON auditoria      FOR INSERT TO app_sgi WITH CHECK (true);
