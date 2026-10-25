# H21 – Notificaciones de eventos críticos al gerente

## Qué hace
Cada vez que llega una lectura de sensor (`POST /lecturas`) que pueda cambiar el riesgo del recorrido, el servidor recalcula el estado del recorrido y, si cruza un umbral, **guarda una notificación**, la **emite en vivo** por Socket.io a los supervisores y la **envía por correo** a administradores, gerentes y supervisores activos.

| Evento (`tipo`) | Se dispara cuando | Severidad |
|---|---|---|
| `nivel_seguridad_bajo` | nivel de seguridad < `NIVEL_SEGURIDAD_BAJO` (50) | `grave` si es < la mitad del umbral, si no `moderada` |
| `incidentes_repetidos` | incidentes del recorrido ≥ `INCIDENTES_REPETIDOS` (3) | `grave` si ≥ 2 × umbral, si no `moderada` |

- **Sin spam:** no se repite la misma notificación (mismo recorrido + tipo) dentro de `MINUTOS_ENTRE_NOTIFICACIONES` (30).
- **Umbrales editables:** se leen de la tabla `configuraciones_umbral` (pantalla “Configuración de umbrales”, H22). Si no existen, se usan los valores por defecto.
- **Persistente:** el estado leído / no leído vive en la tabla `notificaciones`; no se pierde al recargar.
- **El correo nunca rompe la lectura:** si SMTP no está configurado o falla, se registra en el log y la notificación igual queda guardada y en vivo.

## Archivos
Backend: `src/notificaciones.js`, `src/correo.js`, `src/nivelSeguridad.js`, `src/rutasNotificaciones.js`, `src/sockets.js` (`emitirNotificacion`), `src/sembrar-umbrales.js`, modelo `notificaciones` en `prisma/schema.prisma`.
Frontend: `NotificacionesAlertas.jsx` (campana con contador, lista, marcar leída / todas).

## Endpoints (requieren sesión)
- `GET /notificaciones?limite=50&solo_no_leidas=true`
- `PATCH /notificaciones/:id/leida`
- `PATCH /notificaciones/leer-todas`
- Socket.io: el cliente emite `registrar_supervisor`; recibe `notificacion`.

## Variables de entorno (correo)
`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `DASHBOARD_URL`. Sin `SMTP_HOST` el correo se omite (aviso en el log).

## Evidencia de pruebas
- `backend/tests/notificaciones.test.js`, `correo.test.js`, `server.test.js`: 52 pruebas automáticas en total, todas pasan (`npm test` en `backend`).
- Prueba en navegador real (Playwright, backend real con base simulada): la campana muestra 2 no leídas, marcar una deja 1 y **se conserva tras recargar**, una notificación nueva llega **sin recargar** por Socket.io, “Marcar como leídas” deja 0 y persiste.

## Límites conocidos
- El envío real de correo **no se probó contra un servidor SMTP real** (solo con transporte simulado). Hay que probarlo una vez con las credenciales reales.
- Las pruebas usan una base de datos simulada en memoria; falta correr el flujo contra la base real de Render.
