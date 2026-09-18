-- ──────────────────── ๑ ♡ ๑ ────────────────────
-- 02. VERIFICACION - DriveGuard AI
-- ✦ • ๑ ────────────────────────────────── ๑ • ✦

SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

SELECT PostGIS_Version();

SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'lecturas_sensor';

SELECT 'conductores' AS tabla, COUNT(*) AS total FROM conductores
UNION ALL
SELECT 'vehiculos', COUNT(*) FROM vehiculos
UNION ALL
SELECT 'contactos_emergencia', COUNT(*) FROM contactos_emergencia
UNION ALL
SELECT 'recorridos', COUNT(*) FROM recorridos
UNION ALL
SELECT 'lecturas_sensor', COUNT(*) FROM lecturas_sensor
UNION ALL
SELECT 'incidentes', COUNT(*) FROM incidentes;

SELECT * FROM lecturas_sensor ORDER BY timestamp DESC LIMIT 10;

SELECT id, ST_AsText(ubicacion) AS coordenadas, timestamp
FROM lecturas_sensor
WHERE ubicacion IS NOT NULL
ORDER BY timestamp DESC LIMIT 5;