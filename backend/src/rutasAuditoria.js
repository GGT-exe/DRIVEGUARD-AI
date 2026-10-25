// rutasAuditoria.js
// Historia 23 — consulta del historial de auditoría (solo administrador).
//   GET /auditoria?usuario_id=&accion=&desde=AAAA-MM-DD&hasta=AAAA-MM-DD&pagina=1&limite=50
//   GET /usuarios   (lista para el filtro "usuario" de la vista)

const express = require('express');
const { consultarAuditoria } = require('./auditoria');
const { manejarError } = require('./manejarError');

function crearRutasAuditoria({ prisma, verificarToken, verificarRol }) {
  const router = express.Router();

  router.get('/auditoria', verificarToken, verificarRol('administrador'), async (req, res) => {
    try {
      const resultado = await consultarAuditoria(prisma, req.query);
      if (resultado.error) {
        return res.status(400).json({ error: resultado.error });
      }
      res.json(resultado);
    } catch (error) {
      manejarError(error, 'GET /auditoria');
      res.status(500).json({ error: 'No se pudo consultar el historial de auditoría' });
    }
  });

  router.get('/usuarios', verificarToken, verificarRol('administrador'), async (req, res) => {
    try {
      const usuarios = await prisma.usuarios.findMany({
        select: { id: true, nombre: true, correo: true, rol: true, activo: true },
        orderBy: { nombre: 'asc' },
      });
      res.json(usuarios);
    } catch (error) {
      manejarError(error, 'GET /usuarios');
      res.status(500).json({ error: 'No se pudo consultar la lista de usuarios' });
    }
  });

  return router;
}

module.exports = { crearRutasAuditoria };
