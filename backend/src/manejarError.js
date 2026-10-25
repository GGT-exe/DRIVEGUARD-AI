// manejarError.js
// Historia 26 — función única para registrar un error: lo manda al logger
// (siempre) y a Sentry (solo en producción), con contexto de qué endpoint
// y qué datos tenía la petición, para poder priorizarlo después.

const logger = require('./logger');
const { Sentry } = require('./monitoreo');

/**
 * @param {Error} error
 * @param {string} contexto  nombre del endpoint, ej: "POST /lecturas"
 * @param {object} extra     datos útiles para diagnosticar (sin info sensible)
 */
function manejarError(error, contexto, extra = {}) {
  logger.error(`[${contexto}] ${error.message}`, { stack: error.stack, ...extra });

  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, { extra: { contexto, ...extra } });
  }
}

module.exports = { manejarError };
