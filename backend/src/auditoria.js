// auditoria.js
// Historia 23 — registra una acción auditable (quién, qué hizo y cuándo) y
// permite consultar el historial con filtros por usuario, acción y fecha.

const { esUuid, parsearFecha, enteroAcotado } = require('./validaciones');

async function registrarAuditoria(prisma, usuario_id, accion, detalle) {
  try {
    await prisma.auditoria.create({
      data: { usuario_id, accion, detalle }
    });
  } catch (error) {
    console.error('No se pudo registrar la auditoría:', error.message);
  }
}

/**
 * Middleware de auditoría: se pone en una ruta y registra usuario, acción y
 * fecha cuando la respuesta fue exitosa (código < 400).
 * Va DESPUÉS de verificarToken, porque toma el usuario de req.usuario.
 *
 *   app.get('/reportes/exportar', verificarToken, auditar(prisma, 'exportar_reporte',
 *     (req) => `formato=${req.query.formato}`), ...)
 */
function auditar(prisma, accion, detalleFn) {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode >= 400) return;
      const detalle = typeof detalleFn === 'function' ? detalleFn(req) : detalleFn;
      registrarAuditoria(prisma, req.usuario ? req.usuario.id : null, accion, detalle);
    });
    next();
  };
}

// Valida los filtros de la consulta. Devuelve { error } o { where }.
function construirFiltroAuditoria(query = {}) {
  const where = {};
  const { usuario_id, accion, desde, hasta } = query;

  if (usuario_id) {
    if (!esUuid(usuario_id)) return { error: 'usuario_id no es un UUID válido' };
    where.usuario_id = usuario_id;
  }

  if (accion) {
    if (typeof accion !== 'string' || accion.length > 50) return { error: 'accion no es válida' };
    where.accion = accion;
  }

  const fechaDesde = desde ? parsearFecha(desde) : null;
  const fechaHasta = hasta ? parsearFecha(hasta, { finDeDia: true }) : null;

  if (desde && !fechaDesde) return { error: 'desde no es válida. Usa el formato AAAA-MM-DD' };
  if (hasta && !fechaHasta) return { error: 'hasta no es válida. Usa el formato AAAA-MM-DD' };
  if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
    return { error: 'desde no puede ser posterior a hasta' };
  }

  if (fechaDesde || fechaHasta) {
    where.fecha = {};
    if (fechaDesde) where.fecha.gte = fechaDesde;
    if (fechaHasta) where.fecha.lte = fechaHasta;
  }

  return { where };
}

/**
 * Consulta paginada del historial (más reciente primero).
 * @returns {Promise<{error: string} | {pagina, limite, total, total_paginas, resultados}>}
 */
async function consultarAuditoria(prisma, query = {}) {
  const filtro = construirFiltroAuditoria(query);
  if (filtro.error) return { error: filtro.error };

  const pagina = enteroAcotado(query.pagina, 1, 1, 1000000);
  const limite = enteroAcotado(query.limite, 50, 1, 200);

  const [total, filas] = await Promise.all([
    prisma.auditoria.count({ where: filtro.where }),
    prisma.auditoria.findMany({
      where: filtro.where,
      orderBy: { fecha: 'desc' },
      skip: (pagina - 1) * limite,
      take: limite,
    }),
  ]);

  const ids = [...new Set(filas.map((f) => f.usuario_id).filter(Boolean))];
  const usuarios = ids.length
    ? await prisma.usuarios.findMany({
        where: { id: { in: ids } },
        select: { id: true, nombre: true, correo: true },
      })
    : [];
  const porId = new Map(usuarios.map((u) => [u.id, u]));

  return {
    pagina,
    limite,
    total,
    total_paginas: Math.max(1, Math.ceil(total / limite)),
    resultados: filas.map((f) => ({
      id: f.id,
      usuario_id: f.usuario_id,
      usuario: porId.has(f.usuario_id)
        ? { nombre: porId.get(f.usuario_id).nombre, correo: porId.get(f.usuario_id).correo }
        : null,
      accion: f.accion,
      detalle: f.detalle,
      fecha: f.fecha,
    })),
  };
}

module.exports = { registrarAuditoria, auditar, construirFiltroAuditoria, consultarAuditoria };
