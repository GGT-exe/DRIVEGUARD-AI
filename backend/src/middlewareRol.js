// middlewareRol.js
// Historia 22 — restringe una ruta a ciertos roles.
// Se usa DESPUÉS de verificarToken (que ya deja req.usuario = { id, correo, rol }).

// El proyecto usó "admin" y "administrador" para el mismo rol (unas rutas pedían
// uno y otras el otro, y el usuario creado con "admin" recibía 403 al guardar
// umbrales). Aquí se tratan como equivalentes.
function normalizarRol(rol) {
  const r = String(rol || '').trim().toLowerCase();
  return r === 'admin' ? 'administrador' : r;
}

function verificarRol(...rolesPermitidos) {
  const permitidos = rolesPermitidos.map(normalizarRol);
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!permitidos.includes(normalizarRol(req.usuario.rol))) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }
    next();
  };
}

module.exports = { verificarRol, normalizarRol };
