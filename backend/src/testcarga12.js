// test-carga-historia12.js
// Historia 12 — verifica que, cuando varios conductores generan una alerta
// AL MISMO TIEMPO, el supervisor recibe todas, sin pérdidas ni duplicados.
//
// Uso: node test-carga-historia12.js
// (con el backend ya corriendo en BACKEND_URL)

const axios = require("axios");
const { io } = require("socket.io-client"); // npm install socket.io-client --save-dev

const BACKEND_URL = "http://localhost:4000";
const CANTIDAD_CONDUCTORES = 10; // cuántas alertas simultáneas se van a disparar
const RECORRIDO_ID = "d982b26e-5a7f-4238-9b4e-2d0ec08e2257"; // usa uno real de tu base de datos

async function main() {
  const alertasRecibidas = [];

  // 1. Conectarse como supervisor y empezar a escuchar
  const socket = io(BACKEND_URL);

  await new Promise((resolve) => {
    socket.on("connect", () => {
      socket.emit("registrar_supervisor");
      resolve();
    });
  });

  socket.on("alerta_flota", (data) => {
    alertasRecibidas.push(data);
  });

  console.log(`Conectado como supervisor. Disparando ${CANTIDAD_CONDUCTORES} alertas simultáneas...`);

  // 2. Disparar N alertas AL MISMO TIEMPO (Promise.all, no una por una)
  const conductoresIds = Array.from({ length: CANTIDAD_CONDUCTORES }, (_, i) => `conductor-carga-${i}`);

  await Promise.all(
    conductoresIds.map((conductorId) =>
      axios.post(`${BACKEND_URL}/lecturas`, {
        velocidad: 60,
        aceleracion: -7, // fuerza nivel ALTO en todos
        recorrido_id: RECORRIDO_ID,
        conductor_id: conductorId,
      })
    )
  );

  // 3. Esperar un momento a que lleguen todas las alertas por socket
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 4. Verificar resultados
  const idsUnicos = new Set(alertasRecibidas.map((a) => a.alertaId));
  const conductoresRecibidos = new Set(alertasRecibidas.map((a) => a.conductorId));

  console.log("\n--- RESULTADO ---");
  console.log(`Alertas disparadas:  ${CANTIDAD_CONDUCTORES}`);
  console.log(`Alertas recibidas:   ${alertasRecibidas.length}`);
  console.log(`Ids únicos:          ${idsUnicos.size}`);
  console.log(`Conductores únicos:  ${conductoresRecibidos.size}`);

  const huboPerdida = alertasRecibidas.length < CANTIDAD_CONDUCTORES;
  const huboDuplicados = idsUnicos.size !== alertasRecibidas.length;

  if (huboPerdida) console.error("❌ Se perdieron alertas — el supervisor no recibió todas.");
  if (huboDuplicados) console.error("❌ Hay alertas duplicadas.");
  if (!huboPerdida && !huboDuplicados) console.log("✅ Todas las alertas llegaron, sin pérdidas ni duplicados.");

  socket.disconnect();
  process.exit(huboPerdida || huboDuplicados ? 1 : 0);
}

main().catch((err) => {
  console.error("Error en la prueba:", err.message);
  process.exit(1);
});
