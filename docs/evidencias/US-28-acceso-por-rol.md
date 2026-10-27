# US-28: prueba de acceso no autorizado por rol

Fecha: 26/10/2026
Responsable: Sandrid
Backend probado: https://driveguard-ai-1yop.onrender.com

## 1. Sin token (GET)

| Ruta | Código |
|------|--------|
| /recorridos | 401 |
| /incidentes/historial | 401 |
| /conductores | 401 |
| /configuracion | 401 |

`/incidentes/historial` ya quedó protegido con el commit de Geraldine.

## 2. Con rol gerente (usuario Julian)

| Petición | Código |
|----------|--------|
| GET /auditoria | 403 |
| PUT /configuracion/NIVEL_SEGURIDAD_BAJO (cuerpo vacío) | 403 |
| POST /reportes/generar-ahora | 403 |

El 403 se devuelve antes de ejecutar la acción: no se cambió ningún umbral ni se generaron reportes.

## 3. Menú por rol

El gerente ve Inicio, Cámara, Mapa, Alertas, Historial, Comparativo y Reportes. No ve Umbrales, Auditoría ni Usuarios.

## Hallazgos nuevos

- CRÍTICO: `POST /registro` es público y toma el rol del body.
- `POST /incidentes`, `/lecturas`, `/gps` y `/test-alerta/:conductorId` no usan `verificarToken`.
- Varios `catch` devuelven `error.message` al cliente.
