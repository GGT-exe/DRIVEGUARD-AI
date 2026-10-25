# H28 – Plan de contingencia y recuperación

## Componentes y puntos de fallo
| Componente | Dónde vive | Riesgo principal |
|---|---|---|
| Backend (Express + Socket.io) | Render Web Service | Se duerme (plan gratuito), deploy fallido |
| Base de datos (PostgreSQL + PostGIS) | Render Postgres | **Expira a ~30 días en plan gratuito** (ya ocurrió) |
| Frontend | local / hosting estático | URL de API incorrecta |
| Correo | SMTP externo | Credenciales caídas (no detiene el sistema) |

## Escenarios y respuesta
| Escenario | Detección | Acción | Tiempo objetivo |
|---|---|---|---|
| Servidor dormido | Primera petición tarda ~1 min | Esperar; opcional: ping periódico a `/` | 1–2 min |
| Deploy fallido | Render “Failed” | Ver logs; confirmar Root Directory `backend`, build `npm install && npx prisma generate`, start `node src/server.js`; hacer *Rollback* al último deploy bueno | 15 min |
| Base expirada o perdida | 500 en todo, logs con error de conexión | Crear Postgres nuevo → `CREATE EXTENSION IF NOT EXISTS postgis;` → `npx prisma db push` → `node src/sembrar-umbrales.js` → actualizar `DATABASE_URL` → redeploy → registrar admin | 30 min |
| Credenciales filtradas | Aviso o sospecha | Rotar `JWT_SECRET`, contraseñas de BD y SMTP en Render; los tokens viejos dejan de valer | 15 min |
| Correo caído | Aviso `[correo]` en logs | Nada urgente: las notificaciones siguen guardadas y en vivo; corregir credenciales | — |
| Error inesperado en producción | Alerta de Sentry | Revisar el evento, reproducir, corregir, redeploy | según prioridad H26 |

## Copias de seguridad
- Antes de que expire el plan: `pg_dump -Fc "<URL externa>" > driveguard.dump` (en PowerShell, con la ruta completa de `pg_dump.exe`). Guardar el archivo **fuera** del repositorio.
- Restaurar: `pg_restore --no-owner -d "<URL nueva>" driveguard.dump`.
- La **estructura** siempre se puede recrear con `prisma db push`; los datos de simulación se regeneran con el simulador.
- Calendario: poner un recordatorio a los 25 días de crear la base para migrar o renovar.

## Lista de recuperación completa (de cero)
1. Postgres nuevo + PostGIS. 2. Variables en el servicio: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `SENTRY_DSN`, `SMTP_*`, `DASHBOARD_URL`. 3. `npx prisma db push`. 4. `node src/sembrar-umbrales.js`. 5. Deploy. 6. `POST /registro` del primer administrador. 7. Cambiar `VITE_API_URL` si cambió la URL. 8. Probar: login, `/configuracion`, una lectura de prueba, la campana.

## Responsables y comunicación
Backend/datos: Julián y Sandrid. Producto y comunicación: Geraldine. Ante una caída: avisar en el canal del equipo con hora, síntoma y acción en curso; al cerrar, registrar causa y lección en el daily.

## Pruebas del plan
Ejecutado **parcialmente en la práctica**: la migración a la cuenta nueva de Render (BD nueva + PostGIS + `db push` + login) siguió estos pasos y funcionó. Falta ensayar la restauración desde un `pg_dump` con datos y la rotación de credenciales.
