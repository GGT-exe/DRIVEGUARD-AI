// monitoreo.js
// Historia 26 — inicializa Sentry para capturar errores automáticamente en
// producción y mandarte una alerta (correo/dashboard) cuando algo falla.
// En desarrollo local (NODE_ENV distinto de 'production') no se activa, para
// no llenar Sentry de ruido mientras programas y pruebas.

const Sentry = require('@sentry/node');

function iniciarMonitoreo() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[monitoreo] Sentry desactivado (no estás en producción)');
    return;
  }

  if (!process.env.SENTRY_DSN) {
    console.warn('[monitoreo] SENTRY_DSN no está configurado — Sentry no se activó');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: 'production',
    tracesSampleRate: 0.2, // monitorea el rendimiento en el 20% de las peticiones (no todas, para no gastar la cuota gratis)
  });

  console.log('[monitoreo] Sentry activado');
}

module.exports = { iniciarMonitoreo, Sentry };
