-- ──────────────────── ๑ ♡ ๑ ────────────────────
-- 03. CONSULTAS CON JOIN - DriveGuard AI
-- ✦ • ๑ ────────────────────────────────── ๑ • ✦

SELECT c.nombre AS conductor, l.velocidad, l.aceleracion, l.timestamp
FROM lecturas_sensor l
JOIN recorridos r ON l.recorrido_id = r.id
JOIN conductores c ON r.conductor_id = c.id
ORDER BY l.timestamp DESC
LIMIT 20;

SELECT c.nombre AS conductor, i.tipo, i.nivel_riesgo, i.fecha
FROM incidentes i
JOIN recorridos r ON i.recorrido_id = r.id
JOIN conductores c ON r.conductor_id = c.id
ORDER BY i.fecha DESC;

SELECT nivel_riesgo, COUNT(*) AS total
FROM incidentes
GROUP BY nivel_riesgo;

SELECT c.nombre AS conductor, AVG(l.velocidad) AS velocidad_promedio
FROM lecturas_sensor l
JOIN recorridos r ON l.recorrido_id = r.id
JOIN conductores c ON r.conductor_id = c.id
GROUP BY c.nombre;