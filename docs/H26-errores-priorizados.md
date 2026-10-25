# H26 – Errores y hallazgos priorizados

Encontrados al revisar el código y probarlo de punta a punta. Estado: ✅ corregido en este cambio · ⚠️ abierto.

| # | Prioridad | Hallazgo | Impacto | Estado |
|---|---|---|---|---|
| 1 | Crítica | Roles inconsistentes: el código comparaba `admin` y `administrador`; un admin real recibía 403 al guardar umbrales o exportar. | Funciones de admin inutilizables | ✅ `normalizarRol` + `verificarRol` (prueba de regresión incluida) |
| 2 | Crítica | El frontend no tenía login: todas las peticiones protegidas devolvían 401. | Dashboard sin datos | ✅ `Login.jsx`, `api.js` (token en cada petición, vuelta al login al vencer) |
| 3 | Alta | `import './Camara'` con archivo `camara.jsx`: funciona en Windows, **rompe el build en Linux/Render**. | Despliegue del frontend falla | ✅ Import corregido |
| 4 | Alta | La pantalla de umbrales (H22) esperaba un objeto y un único PUT; el backend devuelve lista y usa `PUT /configuracion/:clave`. Mostraba valores por defecto y no guardaba. | Configuración inoperante | ✅ Adaptada y probada en navegador |
| 5 | Alta | `POST /registro` público: cualquiera puede crearse un usuario (incluido rol privilegiado si el cuerpo lo permite). | Seguridad | ⚠️ Exigir sesión de administrador o fijar rol por defecto |
| 6 | Alta | Endpoints sin autenticación: `/incidentes`, `/lecturas`, `/gps`, `/test-alerta/:id`. | Datos falsos / abuso | ⚠️ Dispositivos con clave de API; borrar `/test-alerta` y `/prueba-simple` en producción |
| 7 | Media | CORS abierto (`*`). | Cualquier sitio puede llamar la API | ⚠️ Limitar al dominio del dashboard |
| 8 | Media | Umbrales de velocidad/frenada fijos en código dentro de `/lecturas`. | No respetan la pantalla H22 | ⚠️ Leerlos de `configuraciones_umbral` como ya hacen los de H21 |
| 9 | Media | Consultas por `recorrido_id` sin índice (barrido completo). | Lentitud con muchos datos | ✅ Ver H27 |
| 10 | Media | Mensajes de error 500 podían exponer detalles internos. | Fuga de información | ✅ Mensajes genéricos en rutas nuevas; ⚠️ revisar las antiguas de `server.js` |
| 11 | Baja | Error de lint existente en `ComparacionSeguridad.jsx` (`set-state-in-effect`). | Solo calidad de código | ⚠️ |
| 12 | Baja | Render gratuito: la base expira a ~30 días y el servicio se duerme. | Caídas | ⚠️ Ver plan H28 |

## Observabilidad
Winston (logs) y Sentry (errores) quedaron configurados por Julián; en producción definir `NODE_ENV=production` y `SENTRY_DSN`. Los fallos de correo y de notificaciones se registran sin interrumpir la petición.

## Cómo se verificó
52 pruebas automáticas (`npm test`) + 13 pasos en navegador real. Las pruebas usan base simulada; los puntos 5–8 se identificaron por lectura de código y **no** se han corregido todavía.
