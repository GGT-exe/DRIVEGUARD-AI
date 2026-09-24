// auth.js
// Historia 18 — utilidades de hash de contraseñas para el login del dashboard.
//
// Se usa bcryptjs (no "bcrypt") porque es 100% JavaScript: no necesita
// compilar nada en tu máquina, así que evita problemas de instalación en Windows.

const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 10; // estándar razonable: suficiente seguridad sin ser lento

/**
 * Convierte una contraseña en texto plano a su hash, para guardarla en la BD.
 * NUNCA guardes la contraseña en texto plano en contrasena_hash.
 */
async function hashPassword(contrasenaPlano) {
  return bcrypt.hash(contrasenaPlano, SALT_ROUNDS);
}

/**
 * Compara la contraseña que el usuario escribió en el login contra el hash
 * guardado en la base de datos. Devuelve true/false.
 */
async function verificarPassword(contrasenaPlano, hashGuardado) {
  return bcrypt.compare(contrasenaPlano, hashGuardado);
}

module.exports = { hashPassword, verificarPassword };
