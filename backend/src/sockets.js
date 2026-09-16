// sockets.js
// Historia 11 — Alerta inmediata al conductor ante situación de riesgo
//
// Este módulo configura el canal de tiempo real (Socket.io) que se usará
// para enviar alertas al conductor apenas se detecta una situación de riesgo.
// Hoy (lunes) el objetivo es dejar el canal funcionando y probado,
// no todavía conectarlo con la detección real (eso llega con EPIC-03/US-11 avanzada).

const { Server } = require("socket.io");

let io;

/**
 * Niveles de severidad que va a manejar la Historia 11.
 * (Se terminan de definir el miércoles, pero dejamos la base lista.)
 */
const SEVERIDAD = {
  LEVE: "leve",
  MODERADA: "moderada",
  GRAVE: "grave",
};

/**
 * Inicializa Socket.io sobre el servidor HTTP existente de Express.
 * Llamar UNA sola vez desde el archivo principal del servidor (ver ejemplo
 * de integración más abajo).
 *
 * @param {import("http").Server} httpServer  El servidor creado con http.createServer(app)
 */
function initSockets(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: "*", // TODO: restringir al dominio del frontend en producción
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`[sockets] Cliente conectado: ${socket.id}`);

    // El cliente (app/dashboard del conductor) debe unirse a su propia
    // "room" enviando su ID de conductor apenas conecta.
    socket.on("registrar_conductor", (conductorId) => {
      socket.join(`conductor:${conductorId}`);
      console.log(`[sockets] Conductor ${conductorId} unido a su canal`);
    });

    socket.on("disconnect", () => {
      console.log(`[sockets] Cliente desconectado: ${socket.id}`);
    });
  });

  console.log("[sockets] Canal de alertas en tiempo real listo");
  return io;
}

/**
 * Envía una alerta a un conductor específico.
 * Esta es la función que, en el resto del Sprint, va a llamar la lógica
 * de detección de riesgo (EPIC-03) cada vez que se detecte un evento.
 *
 * @param {string} conductorId
 * @param {{ severidad: string, mensaje: string, tipo?: string }} alerta
 */
function emitirAlerta(conductorId, alerta) {
  if (!io) {
    throw new Error("Socket.io no ha sido inicializado. Llama a initSockets() primero.");
  }

  io.to(`conductor:${conductorId}`).emit("alerta", {
    ...alerta,
    timestamp: new Date().toISOString(),
  });

  console.log(`[sockets] Alerta enviada a conductor ${conductorId}:`, alerta);
}

module.exports = { initSockets, emitirAlerta, SEVERIDAD };
