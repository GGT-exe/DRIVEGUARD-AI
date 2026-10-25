# Resultados de las pruebas de integración de extremo a extremo (H24)

- **Responsable:** Sandrid
- **Fecha:** 25 de octubre de 2026
- **Entorno:** backend local (puerto 4000) conectado a la base de datos nueva en Render; frontend local (Vite, puerto 5173)
- **Plan de referencia:** `docs/plan-pruebas-integracion.md`
- **Datos:** usuarios, conductores y registros de prueba marcados como "PRUEBA" / `@prueba.test`, que se eliminan al terminar.

## 1. Resultados por caso

| ID | Caso | Esperado | Obtenido | Estado |
|---|---|---|---|---|
| IT-01 | Login con credenciales correctas (admin, administrador, supervisor) | 200 y token | 200 en los tres roles | OK |
| IT-02 | Login con contraseña incorrecta | 401 | 401 | OK |
| IT-03 | Enviar una lectura a /lecturas | 200/201 y registro guardado | 201, 1 registro guardado | OK |
| IT-04 | Enviar un incidente a /incidentes | 200/201 y registro guardado | 200, 1 registro guardado | OK |
| IT-05 | Enviar posición a /gps | 200/201 y posición guardada | 201, 1 posición guardada | OK |
| IT-06 | Alerta en tiempo real al supervisor (Socket.io) | La alerta llega a la campana del dashboard | La alerta "Alerta de prueba" llegó con estado "En vivo" | OK |
| IT-07 | Dashboard con datos reales | Los paneles muestran los datos | Los paneles Mapa y Comparación responden 401 porque el frontend no envía token | Limitado |
| IT-08 | GET /configuracion sin token | 401 | 401 | OK |
| IT-09 | Comparación por conductor (admin) | 200 con lista ordenada de mayor a menor nivel | 200; María 100, conductor largo 90, José 70 | OK |
| IT-10 | Exportar PDF (admin) | 200 y PDF con los datos | 200; 6 filas, tildes y ñ correctas, nombre largo truncado con "…" | OK |
| IT-11 | Exportar Excel (admin) | 200 y Excel con los mismos datos | 200 | OK |
| IT-12 | Exportar como supervisor | 403 | 403 | OK |
| IT-13 | Frenada brusca -> incidente -> alerta | El incidente se crea y la alerta llega a la campana | Incidente creado (0 -> 1) y alerta "Frenada brusca detectada" recibida | OK |

Permisos de configuración: supervisor PUT 403, admin PUT 403, administrador PUT 200 (reenviando el mismo valor, sin cambiar la base).

## 2. Hallazgos

| # | Hallazgo | Severidad | Corrección sugerida |
|---|---|---|---|
| 1 | Los roles no coinciden: la configuración exige `administrador` y la exportación exige `admin` o `gerente`. Ningún usuario puede hacer ambas cosas. | Media | Unificar el nombre del rol. |
| 2 | `GET /incidentes/historial?conductor_id=<uuid>` responde 500 (`operator does not exist: uuid = text`). | Media | Agregar el cast `::uuid` en la consulta. |
| 3 | Los paneles Mapa y Comparación no envían token (401) y `Mapa.jsx` falla con `undefined.lat`. Se agregó un ErrorBoundary para aislarlo. | Media | Agregar pantalla de login y enviar el token en cada petición. |
| 4 | `PUT /configuracion/:clave` acepta cualquier número, sin rangos ni orden entre umbrales. La validación solo existe en la pantalla. | Baja a media | Validar rangos y orden en el backend. |
| 5 | `/incidentes`, `/lecturas`, `/gps` y `/test-alerta` no exigen token. | Por confirmar | Confirmar si es intencional por el simulador. |
| 6 | En la comparación, el nivel se satura en 0 con muchos excesos y el desempate no considera los incidentes. | Baja | Revisar el desempate. |
| 7 | `App.jsx` importa `./Camara` pero el archivo es `camara.jsx`. | Baja | Igualar mayúsculas (falla en Linux). |

## 3. Pendientes

1. Probar el guardado real de un umbral con el usuario `administrador` y restaurar los valores originales (-3, -4.5, -6 y 80).
2. Repetir las pruebas principales contra el backend desplegado en Render.
3. Borrar los datos de prueba y avisar al equipo.