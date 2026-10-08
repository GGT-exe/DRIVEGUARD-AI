-- ──────────────────── ๑ ♡ ๑ ────────────────────
-- 06. NIVEL DE SEGURIDAD PROMEDIO (HU-15)
-- ✦ • ๑ ────────────────────────────────── ๑ • ✦

SELECT c.nombre AS conductor,
    GREATEST(
        100
        - (COUNT(*) FILTER (WHERE i.nivel_riesgo = 'alto') * 10)
        - (COUNT(*) FILTER (WHERE i.nivel_riesgo = 'medio') * 5),
        0
    ) AS nivel_seguridad_promedio,
    COUNT(*) AS total_incidentes
FROM conductores c
LEFT JOIN recorridos r ON r.conductor_id = c.id
LEFT JOIN incidentes i ON i.recorrido_id = r.id
WHERE c.id = 'PEGA_AQUI_EL_ID_DEL_CONDUCTOR'
GROUP BY c.nombre;

SELECT
    CASE WHEN i.fecha >= '2026-09-01' THEN 'periodo_actual' ELSE 'periodo_anterior' END AS periodo,
    COUNT(*) AS total_incidentes
FROM incidentes i
JOIN recorridos r ON i.recorrido_id = r.id
WHERE r.conductor_id = 'PEGA_AQUI_EL_ID_DEL_CONDUCTOR'
GROUP BY periodo;