// rutasNotificaciones.js
// Historia 21 — API del centro de notificaciones del dashboard.
//   GET   /notificaciones?solo_no_leidas=true&limite=50
//   PATCH /notificaciones/leer-todas
//   PATCH /notificaciones/:id/leida
// Cualquier usuario autenticado (supervisor, gerente, administrador) puede usarlas.

const express = require('express');
const { listarNotificaciones, marcarLeida, marcarTodasLeidas } = require('./notificaciones');
const { esUuid } = require('./validaciones');
const { manejarError } = require('./manejarError');

function crearRutasNotificaciones({ prisma, verificarToken }) {
  const router = express.Router();

  router.get('/notificaciones', verificarToken, async (req, res) => {
    try {
      const { solo_no_leidas, limite } = req.query;
      const resultado = await listarNotificaciones(prisma, {
        solo_no_leidas: solo_no_leidas === 'true',
        limite,
      });
      res.json(resultado);
    } catch (error) {
      manejarError(error, 'GET /notificaciones');
      res.status(500).json({ error: 'No se pudieron consultar las notificaciones' });
    }
  });

  router.patch('/notificaciones/leer-todas', verificarToken, async (req, res) => {
    try {
      const actualizadas = await marcarTodasLeidas(prisma, req.usuario.id);
      res.json({ actualizadas });
    } catch (error) {
      manejarError(error, 'PATCH /notificaciones/leer-todas');
      res.status(500).json({ error: 'No se pudieron marcar las notificaciones' });
    }
  });

  router.patch('/notificaciones/:id/leida', verificarToken, async (req, res) => {
    try {
      const { id } = req.params;
      if (!esUuid(id)) {
        return res.status(400).json({ error: 'El id de la notificación no es válido' });
      }
      const notificacion = await marcarLeida(prisma, id, req.usuario.id);
      if (!notificacion) {
        return res.status(404).json({ error: 'Notificación no encontrada' });
      }
      res.json(notificacion);
    } catch (error) {
      manejarError(error, 'PATCH /notificaciones/:id/leida');
      res.status(500).json({ error: 'No se pudo marcar la notificación' });
    }
  });

  return router;
}

module.exports = { crearRutasNotificaciones };
