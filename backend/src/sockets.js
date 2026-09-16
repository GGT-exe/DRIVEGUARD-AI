// sockets.js
// Historia 11 — Alerta inmediata al conductor ante situación de riesgo
// Historia 12 — Notificación en tiempo real al supervisor de flota
//
// Este módulo configura el canal de tiempo real (Socket.io): cuando se
// detecta un evento de riesgo, avisa al conductor específico (room
// conductor:<id>) y, al mismo tiempo, a todos los supervisores conectados
// (room "supervisores").

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

    // Historia 12 — el dashboard del supervisor se une a la room "supervisores"
    // para recibir todas las alertas de la flota, sin importar el conductor.
    socket.on("registrar_supervisor", () => {
      socket.join("supervisores");
      console.log(`[sockets] Supervisor conectado: ${socket.id}`);
    });

    socket.on("disconnect", () => {
      console.log(`[sockets] Cliente desconectado: ${socket.id}`);
    });
  });

  console.log("[sockets] Canal de alertas en tiempo real listo");
  return io;
}

/**
 * Envía una alerta a un conductor específico Y, al mismo tiempo, notifica
 * a todos los supervisores conectados (Historia 11 + Historia 12).
 * Esta es la función que llama la lógica de detección de riesgo cada vez
 * que se detecta un evento.
 *
 * @param {string} conductorId
 * @param {{ severidad: string, mensaje: string, tipo?: string }} alerta
 */
function emitirAlerta(conductorId, alerta) {
  if (!io) {
    throw new Error("Socket.io no ha sido inicializado. Llama a initSockets() primero.");
  }

  const payload = {
    ...alerta,
    timestamp: new Date().toISOString(),
  };

  // Historia 11 — al conductor específico
  io.to(`conductor:${conductorId}`).emit("alerta", payload);

  // Historia 12 — a todos los supervisores de flota, incluyendo qué conductor la generó
  io.to("supervisores").emit("alerta_flota", { conductorId, ...payload });

  console.log(`[sockets] Alerta enviada a conductor ${conductorId} y a supervisores:`, alerta);
}

module.exports = { initSockets, emitirAlerta, SEVERIDAD };