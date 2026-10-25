// validaciones.js
// Utilidades pequeñas para validar los parámetros de las consultas (H21, H23).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function esUuid(valor) {
  return typeof valor === 'string' && UUID_RE.test(valor);
}

/**
 * Convierte "AAAA-MM-DD" (o una fecha ISO) en Date. Devuelve null si no es válida.
 * Con finDeDia=true y una fecha sin hora, usa las 23:59:59.999 UTC para que el
 * filtro "hasta" incluya el día completo.
 */
function parsearFecha(texto, { finDeDia = false } = {}) {
  if (typeof texto !== 'string' || texto.trim() === '') return null;
  const fecha = new Date(texto);
  if (isNaN(fecha.getTime())) return null;
  if (finDeDia && /^\d{4}-\d{2}-\d{2}$/.test(texto.trim())) {
    fecha.setUTCHours(23, 59, 59, 999);
  }
  return fecha;
}

// Entero dentro de [min, max]; si no viene o no es válido, usa el valor por defecto.
function enteroAcotado(valor, porDefecto, min, max) {
  const n = Number.parseInt(valor, 10);
  if (!Number.isFinite(n)) return porDefecto;
  return Math.min(Math.max(n, min), max);
}

module.exports = { esUuid, parsearFecha, enteroAcotado };
