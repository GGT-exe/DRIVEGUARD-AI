# Evidencia H20: exportación a Excel

- Responsable: Sandrid
- Fecha de la prueba: 2026-10-10
- Prueba: 60 filas simuladas con el código de generación de /reportes/exportar (exceljs)

| Verificación | Resultado |
|---|---|
| Tildes y ñ (José Peñaloza, María Ángeles Núñez, Ñandú Güemes, Óscar Úñiga) | OK |
| 6 columnas con los anchos definidos | OK |
| Encabezado azul con letra blanca | OK |
| Total incidentes como número | OK |
| Fechas (periodo inicio, periodo fin, generación) | Quedan como texto, no como fecha de Excel |
| Nivel nulo | Se guarda como "-" (texto) en una columna numérica |
| Nombre de más de 50 caracteres | Se guarda completo, pero no cabe en la columna (ancho 28) |

Conclusión: la exportación a Excel funciona. Mejoras sugeridas: guardar las fechas como Date con formato de fecha y ensanchar la columna Conductor.
