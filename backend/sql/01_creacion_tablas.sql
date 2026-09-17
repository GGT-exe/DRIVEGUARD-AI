-- ──────────────────── ๑ ♡ ๑ ────────────────────
-- 01. CREACION DE TABLAS - DriveGuard AI (version consolidada)
-- ✦ • ๑ ────────────────────────────────── ๑ • ✦

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE conductores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    contrasena_hash TEXT NOT NULL,
    fecha_registro TIMESTAMP DEFAULT now()
);

CREATE TABLE vehiculos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conductor_id UUID REFERENCES conductores(id),
    tipo VARCHAR(30) NOT NULL,
    placa VARCHAR(20) UNIQUE NOT NULL,
    marca VARCHAR(50),
    modelo VARCHAR(50),
    fecha_registro TIMESTAMP DEFAULT now()
);

CREATE TABLE contactos_emergencia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conductor_id UUID REFERENCES conductores(id),
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    correo VARCHAR(150),
    parentesco VARCHAR(50),
    fecha_registro TIMESTAMP DEFAULT now()
);

CREATE TABLE recorridos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conductor_id UUID REFERENCES conductores(id),
    vehiculo_id UUID REFERENCES vehiculos(id),
    fecha_inicio TIMESTAMP DEFAULT now(),
    fecha_fin TIMESTAMP,
    ruta GEOMETRY(LineString, 4326)
);

CREATE TABLE lecturas_sensor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recorrido_id UUID REFERENCES recorridos(id),
    velocidad FLOAT,
    aceleracion FLOAT,
    ubicacion GEOMETRY(Point, 4326),
    timestamp TIMESTAMP DEFAULT now()
);

CREATE TABLE incidentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recorrido_id UUID REFERENCES recorridos(id),
    tipo VARCHAR(50),
    nivel_riesgo VARCHAR(20),
    imagen_url TEXT,
    fecha TIMESTAMP DEFAULT now()
);

CREATE TABLE alertas_enviadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incidente_id UUID REFERENCES incidentes(id),
    conductor_id UUID REFERENCES conductores(id),
    contacto_emergencia_id UUID REFERENCES contactos_emergencia(id),
    tipo_alerta VARCHAR(50),
    fecha_envio TIMESTAMP DEFAULT now(),
    estado VARCHAR(20) DEFAULT 'enviada'
);

CREATE TABLE reportes_seguridad (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conductor_id UUID REFERENCES conductores(id),
    periodo_inicio TIMESTAMP,
    periodo_fin TIMESTAMP,
    nivel_seguridad_promedio FLOAT,
    total_incidentes INTEGER DEFAULT 0,
    fecha_generacion TIMESTAMP DEFAULT now()
);

CREATE TABLE tramos_riesgo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tramo GEOMETRY(LineString, 4326) NOT NULL,
    nivel_riesgo VARCHAR(20),
    total_incidentes INTEGER DEFAULT 0,
    descripcion TEXT,
    fecha_calculo TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_lecturas_ubicacion ON lecturas_sensor USING GIST (ubicacion);
CREATE INDEX idx_recorridos_conductor ON recorridos (conductor_id);
CREATE INDEX idx_recorridos_vehiculo ON recorridos (vehiculo_id);
CREATE INDEX idx_incidentes_recorrido ON incidentes (recorrido_id);
CREATE INDEX idx_incidentes_fecha ON incidentes (fecha);
CREATE INDEX idx_vehiculos_conductor ON vehiculos (conductor_id);
CREATE INDEX idx_contactos_conductor ON contactos_emergencia (conductor_id);
CREATE INDEX idx_tramos_riesgo_geom ON tramos_riesgo USING GIST (tramo);