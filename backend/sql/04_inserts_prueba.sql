-- ──────────────────── ๑ ♡ ๑ ────────────────────
-- 04. INSERTS DE PRUEBA - DriveGuard AI
-- ✦ • ๑ ────────────────────────────────── ๑ • ✦

INSERT INTO conductores (nombre, correo, contrasena_hash)
VALUES ('Geraldine Torres', 'geraldine@driveguard.com', 'hash_temporal_123')
RETURNING id;

INSERT INTO recorridos (conductor_id)
VALUES ('PEGA_AQUI_EL_ID_DEL_CONDUCTOR')
RETURNING id;

-- Vehiculo de prueba
INSERT INTO vehiculos (conductor_id, tipo, placa, marca, modelo)
VALUES ('PEGA_AQUI_EL_ID_DEL_CONDUCTOR', 'carro', 'ABC123', 'Chevrolet', 'Spark')
RETURNING id;

-- Asociar el vehiculo al recorrido ya creado
UPDATE recorridos
SET vehiculo_id = 'PEGA_AQUI_EL_ID_DEL_VEHICULO'
WHERE id = 'PEGA_AQUI_EL_ID_DEL_RECORRIDO';

-- Contacto de emergencia de prueba
INSERT INTO contactos_emergencia (conductor_id, nombre, telefono, parentesco)
VALUES ('PEGA_AQUI_EL_ID_DEL_CONDUCTOR', 'Maria Torres', '3001234567', 'familiar')
RETURNING id;