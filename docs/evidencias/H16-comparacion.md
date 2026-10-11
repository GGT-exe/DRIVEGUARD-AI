# Evidencia H16: comparación del nivel de seguridad

- Responsable: Sandrid
- Fecha de la prueba: 2026-10-09
- Entorno: backend desplegado en Render, endpoint GET /comparacion/nivel-seguridad (con token)

| Prueba | Esperado | Obtenido | Resultado |
|---|---|---|---|
| Por conductor, sin filtros | 200 | 200, 1 resultado | OK |
| por=vehiculo | 200 | 200, 1 resultado (placa y tipo) | OK |
| por=otro | 400 | 400 | OK |
| fecha_inicio=abc | 400 | 400 | OK |
| fecha_inicio posterior a fecha_fin | 400 | 400 | OK |
| fecha_inicio=2030-01-01 | 200 con total 0 | 200, total 0 | OK |
| Sin token | 401 | 401 | OK |

Limitación: la base solo tiene un conductor y un vehículo, así que no se pudo comprobar el orden de la lista (de mayor a menor nivel).

Conclusión: el endpoint valida parámetros y fechas correctamente y responde igual en el servidor desplegado.
