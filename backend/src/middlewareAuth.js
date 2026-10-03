
// middlewareAuth.js
// Historia 18 — middleware que protege las rutas del dashboard.
// Verifica el token JWT enviado en el header Authorization: Bearer <token>
 
const jwt = require("jsonwebtoken");
 
function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;
 
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token no proporcionado" });
  }
 
  const token = authHeader.split(" ")[1];
 
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload; // { id, correo, rol } — disponible en las rutas protegidas
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "El token expiró, inicia sesión de nuevo" });
    }
    return res.status(401).json({ error: "Token inválido" });
  }
}
 
module.exports = { verificarToken };
 