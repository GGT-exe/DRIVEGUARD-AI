# H25 – Manual de usuario y documentación de la API

## Parte 1. Manual de usuario (dashboard web)

### Ingresar
1. Abre la aplicación y escribe tu **correo** y **contraseña**; pulsa **Ingresar**.
2. Si los datos son incorrectos verás “Correo o contraseña incorrectos”. Si el servidor está dormido (plan gratuito) la primera vez puede tardar hasta un minuto.
3. Arriba a la izquierda aparece tu nombre y rol. **Cerrar sesión** te devuelve al login. La sesión vence a las 8 horas y la app te lleva sola al login.
4. Si aún no tienes cuenta, pulsa **Crear una cuenta nueva**. El registro público crea un usuario con rol **conductor**; los roles privilegiados no se pueden elegir desde este formulario.

### Pestañas según el rol
El menú de la izquierda muestra solo lo que tu rol puede usar. Si escribes en la dirección una pestaña que no te corresponde (por ejemplo `#auditoria`), te lleva al Inicio.

| Pestaña | Supervisor | Gerente | Administrador |
|---|---|---|---|
| Inicio (resumen en vivo) | Sí | Sí | Sí |
| Cámara (monitoreo y registro de incidentes) | Sí | Sí | Sí |
| Mapa de incidentes | Sí | Sí | Sí |
| Alertas y notificaciones | Sí | Sí | Sí |
| Historial de incidentes | Sí | Sí | Sí |
| Comparativo de seguridad | No | Sí | Sí |
| Reportes (exportar PDF / Excel) | No | Sí | Sí (y "Generar ahora") |
| Umbrales | No | No | Sí |
| Auditoría | No | No | Sí |
| Usuarios y permisos | No | No | Sí |

### Cámara
1. Permite el acceso a la cámara cuando el navegador lo pida. Si lo negaste, la pantalla lo explica y cómo corregirlo.
2. Elige el **recorrido** al que pertenece el evento. Con recorrido, el incidente queda ligado a él (aparece en el mapa), se avisa en tiempo real a los supervisores y se evalúan las notificaciones críticas. Sin recorrido solo se guarda.
3. Elige el tipo de evento y el nivel de riesgo, y pulsa **Registrar incidente y alertar**. Si no capturaste una imagen, se toma una del fotograma actual.
4. Esta pantalla **no detecta accidentes por sí sola**: la persona que monitorea los registra.

### Mapa de incidentes
Muestra la ruta de los 10 recorridos más recientes (azul), la posición de los que siguen en curso y cada incidente como un punto por riesgo (verde leve, naranja moderado, rojo grave). Filtra por recorrido y por riesgo; debajo hay la lista con las coordenadas. Un incidente sin puntos GPS no se puede ubicar y se avisa cuántos son.

### Campana de notificaciones (arriba a la derecha)
- El número rojo son las **no leídas**. Pulsa la campana para abrir la lista.
- Clic en una notificación la marca como leída; **Marcar como leídas** las marca todas. El estado se conserva al recargar.
- “En vivo” (verde) significa que recibes avisos al instante; “Sin conexión” (rojo) que se reconectará solo.
- Tipos: **Nivel de seguridad bajo** e **Incidentes repetidos**, con severidad moderada o grave.

### Comparación del nivel de seguridad
Elige **Conductor** o **Vehículo**, un rango de fechas opcional y pulsa **Consultar**. Verde 80–100, amarillo 50–79, rojo 0–49. Quien no tiene lecturas aparece como “Sin lecturas de sensor”.

### Configuración de umbrales (administrador)
Cuatro valores: nivel de seguridad bajo (0–100), incidentes repetidos (1–50), frenada brusca (−10 a −0,5) y frenada grave (−20 a −1, debe ser menor que la brusca). Los errores se muestran bajo cada campo. **Guardar cambios** aplica los valores de inmediato; **Restablecer valores por defecto** solo rellena el formulario (hay que guardar).

### Historial de auditoría (administrador)
Tabla de quién hizo qué y cuándo (inicio de sesión, intento fallido, registro de usuario, cambio de configuración, exportaciones). Filtra por usuario, acción y fechas; 20 filas por página con **Anterior / Siguiente**.

### Problemas frecuentes
| Síntoma | Qué hacer |
|---|---|
| “No se pudo conectar con el servidor” | Esperar 1 min (arranque en frío) y reintentar; si sigue, revisar el plan de contingencia (H28). |
| Vuelve al login solo | La sesión venció: ingresar de nuevo. |
| “No tienes permiso para guardar” | Tu rol no es administrador. |
| Mensaje de umbral “no existe” al guardar | Un técnico debe ejecutar `node src/sembrar-umbrales.js` en el backend. |

## Parte 2. API (resumen)
Base: `https://driveguard-ai-1yop.onrender.com`. Autenticación: cabecera `Authorization: Bearer <token>` (JWT de `/login`, 8 h). Errores: JSON `{ "error": "mensaje" }` con 400 (datos inválidos), 401 (sin sesión / token vencido), 403 (rol insuficiente), 404, 500.

| Método y ruta | Rol | Descripción |
|---|---|---|
| `POST /login` `{correo, contrasena}` | público | Devuelve `{token, usuario}` |
| `POST /registro` `{nombre, correo, contrasena}` | público | Crea un usuario con rol `conductor`; el rol enviado por el cliente se ignora |
| `GET /configuracion` | sesión | Lista `[{clave, valor}]` |
| `PUT /configuracion/:clave` `{valor}` | administrador | Cambia un umbral (auditado) |
| `GET /conductores`, `GET /vehiculos/tipos` | sesión | Catálogos |
| `GET /recorridos?pagina&limite` | sesión | Recorridos paginados |
| `POST /lecturas` | dispositivo | Registra lectura; puede crear incidente y notificaciones |
| `POST /incidentes` `{imagen, tipo, nivel_riesgo, recorrido_id?}` | cámara | Crea el incidente; con `recorrido_id` lo liga al recorrido, avisa por Socket.io y evalúa notificaciones |
| `POST /gps`, `GET /recorridos/:id/gps` | dispositivo / sesión | Puntos GPS |
| `GET /recorridos/:id/nivel-seguridad` | sesión | `{total_lecturas, excesos_velocidad, frenadas_bruscas, total_incidentes, nivel_seguridad}` |
| `GET /recorridos/:id/incidentes-mapa` | sesión | Incidentes con coordenadas |
| `GET /incidentes/historial` | sesión | Historial filtrable |
| `GET /comparacion/nivel-seguridad?por=conductor\|vehiculo&fecha_inicio&fecha_fin` | sesión | Comparación |
| `GET /reportes/nivel-seguridad/:conductor_id` | sesión | Reporte por conductor |
| `GET /reportes/exportar` | admin, gerente | PDF/Excel (auditado) |
| `POST /reportes/generar-ahora`, `GET /reportes/periodico` | admin / sesión | Reportes periódicos |
| `GET /notificaciones`, `PATCH /notificaciones/:id/leida`, `PATCH /notificaciones/leer-todas` | sesión | Centro de notificaciones (H21) |
| `GET /auditoria?usuario_id&accion&desde&hasta&pagina&limite` | administrador | Historial (límite máx. 200) |
| `GET /usuarios` | administrador | Lista para filtros |

Eventos Socket.io: `alerta` (a `conductor:<id>`), `alerta_flota` y `notificacion` (a la sala `supervisores`, registrada con `registrar_supervisor`).

Roles: `administrador` (también acepta `admin`), `gerente`, `supervisor`, `conductor`. La comparación de roles ignora mayúsculas y normaliza `admin` → `administrador`.
