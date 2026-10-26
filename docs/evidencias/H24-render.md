# H24 - Verificación en el backend desplegado (Render)

**Backend:** https://driveguard-ai-1yop.onrender.com
**Fecha:** 25 de octubre de 2026
**Ejecutó:** Sandrid
**Datos:** usuarios y reportes de prueba (`@prueba.test`, conductores "PRUEBA"), que se eliminan al terminar.

## Resultados

| Prueba | Esperado | Obtenido | Estado |
|--------|----------|----------|--------|
| Login administrador | 200 y token | Token obtenido | OK |
| GET /configuracion con token | 200 | 200 | OK |
| GET /configuracion sin token | 401 | 401 | OK |
| Exportar PDF (administrador) | 200 y PDF | 200, archivo %PDF- de 2079 bytes, 6 filas, tildes y ñ correctas, nombre largo truncado con "..." | OK |
| Exportar Excel (administrador) | 200 | 200, 6975 bytes | OK |
| Exportar con formato inválido | 400 | 400 | OK |
| Supervisor exporta | 403 | 403 | OK |
| Supervisor PUT /configuracion/:clave | 403 | 403 | OK |

## Conclusión

El comportamiento en Render coincide con el de las pruebas locales (H24): autenticación, permisos por rol y exportación PDF/Excel funcionan igual con la base nueva.
