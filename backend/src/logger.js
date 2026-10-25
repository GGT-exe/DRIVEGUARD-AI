// logger.js
// Historia 26 — logs estructurados con nivel, timestamp y, en producción,
// guardados en archivos separados para poder revisarlos y priorizarlos.

const winston = require('winston');

const esProduccion = process.env.NODE_ENV === 'production';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }), // incluye el stack trace si se loguea un Error
    winston.format.json()
  ),
  transports: [
    // Siempre se ve en consola (Render captura esto automáticamente en sus logs)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// En producción, además de la consola, guarda en archivos (útil si alguna vez
// corres el backend fuera de Render, o para revisar localmente).
if (esProduccion) {
  logger.add(new winston.transports.File({ filename: 'logs/errores.log', level: 'error' }));
  logger.add(new winston.transports.File({ filename: 'logs/combinado.log' }));
}

module.exports = logger;
