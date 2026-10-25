// correo.js
// Historia 21 — envío por correo de las notificaciones críticas a los gerentes
// y administradores activos.
//
// Variables de entorno (configurarlas en Render → Environment):
//   SMTP_HOST, SMTP_PORT (587 por defecto), SMTP_SECURE ("true" para el puerto 465),
//   SMTP_USER, SMTP_PASS, SMTP_FROM (opcional), DASHBOARD_URL (opcional)
// Si SMTP_HOST no está definido, NO se envía nada: solo se avisa en el log
// (la notificación igual queda guardada y llega al dashboard).

const nodemailer = require('nodemailer');
const logger = require('./logger');
const { normalizarRol } = require('./middlewareRol');

const ROLES_DESTINATARIOS = ['gerente', 'administrador'];

let transporteCache;

function crearTransporte() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

function transportePorDefecto() {
  if (transporteCache === undefined) transporteCache = crearTransporte();
  return transporteCache;
}

async function obtenerDestinatarios(prisma) {
  const usuarios = await prisma.usuarios.findMany({
    where: { activo: true },
    select: { correo: true, rol: true },
  });
  return usuarios
    .filter((u) => u.correo && ROLES_DESTINATARIOS.includes(normalizarRol(u.rol)))
    .map((u) => u.correo);
}

/**
 * Envía la notificación por correo. Nunca lanza: un fallo de SMTP no debe
 * romper el flujo de las lecturas del sensor.
 * @returns {Promise<{enviado: boolean, motivo?: string, destinatarios?: string[]}>}
 */
async function enviarCorreoNotificacion(prisma, notificacion, { transporte } = {}) {
  try {
    const t = transporte === undefined ? transportePorDefecto() : transporte;
    if (!t) {
      logger.warn('[correo] SMTP_HOST no está configurado: la notificación no se envió por correo');
      return { enviado: false, motivo: 'smtp_no_configurado' };
    }

    const destinatarios = await obtenerDestinatarios(prisma);
    if (destinatarios.length === 0) {
      logger.warn('[correo] No hay gerentes ni administradores activos con correo para notificar');
      return { enviado: false, motivo: 'sin_destinatarios' };
    }

    const enlace = process.env.DASHBOARD_URL ? `\n\nAbrir el dashboard: ${process.env.DASHBOARD_URL}` : '';
    await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'driveguard@localhost',
      to: destinatarios.join(', '),
      subject: `[DriveGuard AI] Alerta ${notificacion.severidad}: ${notificacion.tipo.replace(/_/g, ' ')}`,
      text: `${notificacion.mensaje}\n\nTipo: ${notificacion.tipo}\nSeveridad: ${notificacion.severidad}\nFecha: ${new Date(notificacion.fecha || Date.now()).toLocaleString('es-CO')}${enlace}`,
    });

    return { enviado: true, destinatarios };
  } catch (error) {
    logger.error(`[correo] No se pudo enviar la notificación: ${error.message}`);
    return { enviado: false, motivo: 'error_envio' };
  }
}

module.exports = { enviarCorreoNotificacion, obtenerDestinatarios, ROLES_DESTINATARIOS };
