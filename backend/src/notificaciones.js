// notificaciones.js
// Historia 21 — notificaciones al gerente por eventos críticos.
//
// Un "evento crítico" es:
//   - nivel_seguridad_bajo:  el nivel de seguridad del recorrido cae por debajo del umbral
//   - incidentes_repetidos:  el recorrido acumula N o más incidentes
// Los umbrales se leen de configuraciones_umbral (editables desde la pantalla
// de H22); si no existen, se usan los valores por defecto de abajo.
//
// Cuando se detecta un evento: se guarda la notificación (estado leído/no leído),
// se avisa en tiempo real al dashboard (Socket.io) y se envía un correo.

const logger = require('./logger');
const { calcularEstadoRecorrido } = require('./nivelSeguridad');
const { enteroAcotado, esUuid } = require('./validaciones');

const UMBRALES_POR_DEFECTO = {
  NIVEL_SEGURIDAD_BAJO: 50,
  INCIDENTES_REPETIDOS: 3,
  MINUTOS_ENTRE_NOTIFICACIONES: 30, // evita repetir la misma alerta en cada lectura
};

async function obtenerUmbralesNotificacion(prisma) {
  const umbrales = { ...UMBRALES_POR_DEFECTO };
  const filas = await prisma.configuraciones_umbral.findMany({
    where: { clave: { in: Object.keys(UMBRALES_POR_DEFECTO) } },
  });
  for (const fila of filas) {
    if (Number.isFinite(fila.valor)) umbrales[fila.clave] = fila.valor;
  }
  return umbrales;
}

// Función pura: dado el estado de un recorrido, decide qué eventos críticos hay.
function detectarEventosCriticos(estado, umbrales, contexto = {}) {
  const eventos = [];
  const donde = `${contexto.conductorNombre ? `conductor ${contexto.conductorNombre}, ` : ''}recorrido ${String(contexto.recorrido_id || '').slice(0, 8)}`;

  if (estado.nivel_seguridad !== null && estado.nivel_seguridad < umbrales.NIVEL_SEGURIDAD_BAJO) {
    eventos.push({
      tipo: 'nivel_seguridad_bajo',
      severidad: estado.nivel_seguridad < umbrales.NIVEL_SEGURIDAD_BAJO / 2 ? 'grave' : 'moderada',
      mensaje: `Nivel de seguridad bajo: ${estado.nivel_seguridad}/100 (umbral ${umbrales.NIVEL_SEGURIDAD_BAJO}) — ${donde}`,
    });
  }

  if (estado.total_incidentes >= umbrales.INCIDENTES_REPETIDOS) {
    eventos.push({
      tipo: 'incidentes_repetidos',
      severidad: estado.total_incidentes >= umbrales.INCIDENTES_REPETIDOS * 2 ? 'grave' : 'moderada',
      mensaje: `Incidentes repetidos: ${estado.total_incidentes} incidentes (umbral ${umbrales.INCIDENTES_REPETIDOS}) — ${donde}`,
    });
  }

  return eventos;
}

async function obtenerContextoRecorrido(prisma, recorrido_id, conductor_id) {
  try {
    const r = await prisma.recorridos.findUnique({
      where: { id: recorrido_id },
      select: { conductor_id: true, conductores: { select: { nombre: true } } },
    });
    return {
      recorrido_id,
      conductor_id: (esUuid(conductor_id) ? conductor_id : null) || r?.conductor_id || null,
      conductorNombre: r?.conductores?.nombre || null,
    };
  } catch (error) {
    logger.warn(`[notificaciones] No se pudo leer el conductor del recorrido: ${error.message}`);
    return { recorrido_id, conductor_id: conductor_id || null, conductorNombre: null };
  }
}

/**
 * Evalúa un recorrido y genera las notificaciones que correspondan.
 * @param deps.emitir        (notificacion) => void   aviso en tiempo real (Socket.io)
 * @param deps.enviarCorreo  (notificacion) => Promise  envío por correo
 * @returns las notificaciones creadas (vacío si no hay eventos o ya se avisó hace poco)
 */
async function evaluarRecorrido(prisma, { recorrido_id, conductor_id } = {}, deps = {}) {
  if (!recorrido_id) return [];

  const estado = await calcularEstadoRecorrido(prisma, recorrido_id);
  const umbrales = await obtenerUmbralesNotificacion(prisma);
  const contexto = await obtenerContextoRecorrido(prisma, recorrido_id, conductor_id);
  const eventos = detectarEventosCriticos(estado, umbrales, contexto);

  const creadas = [];
  const desde = new Date(Date.now() - umbrales.MINUTOS_ENTRE_NOTIFICACIONES * 60 * 1000);

  for (const evento of eventos) {
    const reciente = await prisma.notificaciones.findFirst({
      where: { recorrido_id, tipo: evento.tipo, fecha: { gte: desde } },
    });
    if (reciente) continue;

    const notificacion = await prisma.notificaciones.create({
      data: {
        tipo: evento.tipo,
        severidad: evento.severidad,
        mensaje: evento.mensaje,
        conductor_id: contexto.conductor_id,
        recorrido_id,
      },
    });
    creadas.push(notificacion);

    try {
      if (deps.emitir) deps.emitir(notificacion);
    } catch (error) {
      logger.warn(`[notificaciones] No se pudo emitir por Socket.io: ${error.message}`);
    }
    try {
      if (deps.enviarCorreo) await deps.enviarCorreo(notificacion);
    } catch (error) {
      logger.warn(`[notificaciones] Falló el envío por correo: ${error.message}`);
    }
  }

  return creadas;
}

// ---- Consulta y estado leído / no leído (centro de notificaciones del dashboard) ----

async function listarNotificaciones(prisma, { solo_no_leidas = false, limite } = {}) {
  const take = enteroAcotado(limite, 50, 1, 200);
  const where = solo_no_leidas ? { leida: false } : {};
  const [notificaciones, totalNoLeidas] = await Promise.all([
    prisma.notificaciones.findMany({ where, orderBy: { fecha: 'desc' }, take }),
    prisma.notificaciones.count({ where: { leida: false } }),
  ]);
  return { total_no_leidas: totalNoLeidas, notificaciones };
}

async function marcarLeida(prisma, id, usuario_id) {
  const existente = await prisma.notificaciones.findUnique({ where: { id } });
  if (!existente) return null;
  return prisma.notificaciones.update({
    where: { id },
    data: { leida: true, fecha_lectura: new Date(), leida_por: usuario_id || null },
  });
}

async function marcarTodasLeidas(prisma, usuario_id) {
  const r = await prisma.notificaciones.updateMany({
    where: { leida: false },
    data: { leida: true, fecha_lectura: new Date(), leida_por: usuario_id || null },
  });
  return r.count;
}

module.exports = {
  UMBRALES_POR_DEFECTO,
  obtenerUmbralesNotificacion,
  detectarEventosCriticos,
  evaluarRecorrido,
  listarNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
};
