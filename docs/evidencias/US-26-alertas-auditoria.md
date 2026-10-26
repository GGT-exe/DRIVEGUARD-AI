# US-26: verificación de alertas y auditoría con datos reales

Fecha: 26/10/2026
Responsable: Sandrid
Backend probado: https://driveguard-ai-1yop.onrender.com
Datos de prueba: marca PRUEBA-US27 (conductora Ana Rojas, recorrido en curso 6bc9fc59-902d-4483-bad1-1bee858f3871)

## 1. Umbrales de notificación (leídos de la base)

NIVEL_SEGURIDAD_BAJO = 50, INCIDENTES_REPETIDOS = 3, MINUTOS_ENTRE_NOTIFICACIONES = 30 (valores por defecto).

## 2. Regla de notificación guardada y correo

- Código: `evaluarRecorrido` (backend/src/notificaciones.js), llamada desde `POST /incidentes` y `POST /lecturas`.
- Crea la notificación y envía correo a gerentes y administradores solo si el nivel de seguridad del recorrido es menor que 50 o si hay 3 o más incidentes. No repite el mismo tipo dentro de 30 minutos.
- Prueba con dato real: se registró 1 incidente (imagen `PRUEBA-US27`) sobre el recorrido de Ana. Resultado en la base: nivel de seguridad 90, 2 incidentes, 0 notificaciones. Es lo esperado, porque no se cumple ninguna de las dos reglas.
- La notificación guardada y el correo se documentan como **verificados por código**. No se disparó el caso real para no enviar correo al equipo.

## 3. Alerta en vivo (Socket.io)

- Se llamó `POST /test-alerta/:conductorId` y respondió OK.
- Con el dashboard abierto y sesión iniciada, apareció en la campana la alerta "frenada brusca", severidad Grave, "Alerta de prueba", conductor PRUEBA-US27 Ana Rojas, 01:20 a. m.
- Esta alerta solo se emite en vivo, no se guarda en la base. Resultado: **verificado**.

## 4. Auditoría

- Con sesión de administrador se exportó un reporte en PDF desde Reportes.
- El historial de auditoría mostró el registro: 26/10/2026 1:21:21 a. m., usuario Geraldine, acción "Exportación de reporte", detalle `formato=pdf`.
- Resultado: **verificado**.

## Pendiente de limpieza

Borrar los datos de prueba, incluido el incidente b2836e1d-e2b8-4ced-b7a9-158679a5bb43 (imagen `PRUEBA-US27`).
