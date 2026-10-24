// middlewareRol.js
// Historia 22 — restringe una ruta a ciertos roles.
// Se usa DESPUÉS de verificarToken (que ya deja req.usuario = { id, correo, rol }).

function verificarRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }
    next();
  };
}

module.exports = { verificarRol };