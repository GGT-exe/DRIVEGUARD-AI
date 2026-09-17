-- ──────────────────── ๑ ♡ ๑ ────────────────────
-- 04. INSERTS DE PRUEBA - DriveGuard AI
-- ✦ • ๑ ────────────────────────────────── ๑ • ✦

-- Crear un conductor de prueba (copia el id que devuelve)
INSERT INTO conductores (nombre, correo, contrasena_hash)
VALUES ('Geraldine Torres', 'geraldine@driveguard.com', 'hash_temporal_123')
RETURNING id;

-- Crear un recorrido para ese conductor (pega el id de arriba)
INSERT INTO recorridos (conductor_id)
VALUES ('PEGA_AQUI_EL_ID_DEL_CONDUCTOR')
RETURNING id;

-- El id que devuelve este INSERT es el que va en RECORRIDO_ID del simulador