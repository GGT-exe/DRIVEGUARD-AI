-- ──────────────────── ๑ ♡ ๑ ────────────────────
-- 05. HISTORIAL DE INCIDENTES CON FILTROS (HU-13)
-- ✦ • ๑ ────────────────────────────────── ๑ • ✦

SELECT i.id, c.nombre AS conductor, i.tipo, i.nivel_riesgo, i.fecha
FROM incidentes i
JOIN recorridos r ON i.recorrido_id = r.id
JOIN conductores c ON r.conductor_id = c.id
ORDER BY i.fecha DESC;

SELECT i.id, c.nombre AS conductor, i.tipo, i.nivel_riesgo, i.fecha
FROM incidentes i
JOIN recorridos r ON i.recorrido_id = r.id
JOIN conductores c ON r.conductor_id = c.id
WHERE c.id = 'PEGA_AQUI_EL_ID_DEL_CONDUCTOR'
ORDER BY i.fecha DESC;

SELECT i.id, c.nombre AS conductor, i.tipo, i.nivel_riesgo, i.fecha
FROM incidentes i
JOIN recorridos r ON i.recorrido_id = r.id
JOIN conductores c ON r.conductor_id = c.id
WHERE i.fecha BETWEEN '2026-09-01' AND '2026-09-30'
ORDER BY i.fecha DESC;

SELECT i.id, c.nombre AS conductor, v.tipo AS tipo_vehiculo, v.placa,
       i.tipo, i.nivel_riesgo, i.fecha
FROM incidentes i
JOIN recorridos r ON i.recorrido_id = r.id
JOIN conductores c ON r.conductor_id = c.id
LEFT JOIN vehiculos v ON r.vehiculo_id = v.id
WHERE v.tipo = 'carro'
ORDER BY i.fecha DESC;

SELECT i.id, c.nombre AS conductor, v.tipo AS tipo_vehiculo, v.placa,
       i.tipo, i.nivel_riesgo, i.fecha
FROM incidentes i
JOIN recorridos r ON i.recorrido_id = r.id
JOIN conductores c ON r.conductor_id = c.id
LEFT JOIN vehiculos v ON r.vehiculo_id = v.id
WHERE c.id = 'PEGA_AQUI_EL_ID_DEL_CONDUCTOR'
  AND v.tipo = 'carro'
  AND i.fecha BETWEEN '2026-09-01' AND '2026-09-30'
ORDER BY i.fecha DESC;