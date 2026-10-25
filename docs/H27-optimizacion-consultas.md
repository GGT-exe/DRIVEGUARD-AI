# H27 – Optimización de consultas

## Cambios
1. **Índices** (en `prisma/schema.prisma`):
   - `lecturas_sensor(recorrido_id, timestamp)` → `idx_lecturas_recorrido_ts`
   - `incidentes(recorrido_id, fecha)` → `idx_incidentes_recorrido_fecha`
   - `recorridos(fecha_inicio)` → `idx_recorridos_fecha_inicio`
   - `notificaciones(leida, fecha)` y `(recorrido_id, tipo)`
2. **`/recorridos/:id/nivel-seguridad`**: antes traía todas las lecturas del recorrido y contaba en JavaScript; ahora hace 4 `count` en paralelo en la base (`src/nivelSeguridad.js`). La respuesta tiene el mismo formato.
3. **`GET /recorridos`**: paginado (`pagina`, `limite`, máx. acotado) en vez de devolver todo.

## Medición
PostgreSQL 16 local, **500 000 lecturas sintéticas**, recorrido de 1 000 lecturas. `EXPLAIN (ANALYZE)`:

| Consulta | Antes | Después | Plan |
|---|---|---|---|
| Traer lecturas del recorrido | 27–28 ms | 1,6–3,7 ms | Parallel Seq Scan → Bitmap Index Scan |
| COUNT total | 25 ms | 1,8 ms | idem |
| COUNT excesos de velocidad | 32 ms | 1,3 ms | idem |
| COUNT frenadas bruscas | 31 ms | 1,8 ms | idem |
| Puntos GPS ordenados por tiempo | 27 ms | 2,0 ms | idem + Sort |

Mejora de ≈ 10–20 veces. Los datos completos están en `docs/evidencias/bench_antes.txt` y `bench_despues.txt`.

## Honestidad sobre la medición
- Datos **sintéticos** y base **local**, no la de Render; los tiempos absolutos serán distintos, pero el cambio de plan (barrido completo → índice) sí es el mismo.
- Los índices **no** se han aplicado a la base real: ejecutar `npx prisma db push` contra la base de Render.
- Costo: cada índice hace las escrituras un poco más lentas; con la frecuencia de lecturas del proyecto es aceptable.

## Pendiente de la historia
La sesión de retroalimentación con usuarios reales (criterio de aceptación de H27) **no se puede simular**: hay que hacerla con el equipo/usuarios y anotar sus comentarios aquí.
