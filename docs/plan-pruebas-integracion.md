# Plan de pruebas de integración de extremo a extremo (H24)

- **Responsable:** Sandrid
- **Entorno:** backend local (puerto 4000) y backend desplegado en Render
- **Alcance:** flujo completo de DriveGuard AI, desde la detección hasta los reportes.

## 1. Objetivo

Verificar que los módulos funcionan bien en conjunto: que un evento detectado llegue a la base de datos, genere una alerta, se vea en el dashboard y aparezca en los reportes exportados.

## 2. Flujo a probar

Detección (simulador) -> Backend (/lecturas, /incidentes, /gps) -> Base de datos -> Alertas (Socket.io) -> Dashboard -> Reportes (comparación, PDF, Excel)

## 3. Casos de prueba

| ID | Etapa | Precondición | Pasos | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|---|
| IT-01 | Autenticación | Usuario activo | POST /login con correo y contrasena válidos | 200 y token JWT | | Pendiente |
| IT-02 | Autenticación | Ninguna | POST /login con contraseña incorrecta | 401 | | Pendiente |
| IT-03 | Detección | Backend activo | Enviar una lectura al endpoint /lecturas | 200/201 y registro guardado | | Pendiente |
| IT-04 | Detección | Backend activo | Enviar un incidente a /incidentes | 200/201 y registro guardado | | Pendiente |
| IT-05 | Detección | Backend activo | Enviar posición a /gps | 200/201 y posición guardada | | Pendiente |
| IT-06 | Alertas | Dashboard abierto | Generar un incidente de riesgo | La alerta llega al dashboard en tiempo real (Socket.io) | | Pendiente |
| IT-07 | Dashboard | Datos cargados | Abrir el dashboard con sesión válida | Se muestran conductores, alertas y gráficas con los datos reales | | Pendiente |
| IT-08 | Dashboard | Ninguna | Abrir el dashboard sin sesión | Redirige al login / 401 | | Pendiente |
| IT-09 | Reportes | Admin con token | GET /comparacion/nivel-seguridad?por=conductor | 200 con lista ordenada | | Pendiente |
| IT-10 | Reportes | Admin con token | GET /reportes/exportar?formato=pdf | 200 y PDF con los datos del incidente | | Pendiente |
| IT-11 | Reportes | Admin con token | GET /reportes/exportar?formato=excel | 200 y Excel con los mismos datos que el PDF | | Pendiente |
| IT-12 | Reportes | Supervisor con token | GET /reportes/exportar | 403 | | Pendiente |
| IT-13 | Extremo a extremo | Todo activo | Incidente -> alerta -> dashboard -> exportar | El incidente aparece en cada etapa con los mismos datos | | Pendiente |

## 4. Criterios de aceptación

- Todos los casos IT-01 a IT-13 en estado OK, o con el defecto registrado.
- Ningún caso crítico (autenticación, alertas, reportes) en falla.

## 5. Datos de prueba

Se usan usuarios y registros de prueba que se borran al terminar, porque la base de datos es compartida por el equipo. No se ejecuta /reportes/generar-ahora sin acuerdo del equipo.

## 6. Referencias

Resultados de las pruebas de acceso por rol y de exportación: ver `docs/evidencias/`.