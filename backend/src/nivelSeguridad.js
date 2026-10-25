// nivelSeguridad.js
// US-09 / US-10 / H27 — cálculo del nivel de seguridad de un recorrido.
//
// H27 (optimización): antes el endpoint traía TODAS las lecturas del recorrido a
// memoria y las recorría con un forEach. Ahora la base de datos cuenta
// (COUNT con filtro, apoyado en el índice idx_lecturas_recorrido_ts) y solo
// viajan 4 números. El resultado es idéntico, con mucho menos datos.

const LIMITE_VELOCIDAD = 80;
const LIMITE_FRENADA_BRUSCA = -4;

// Misma fórmula de siempre: 100 - 5 por exceso de velocidad - 10 por frenada brusca, mínimo 0.
function calcularNivel(excesosVelocidad, frenadasBruscas) {
  const nivel = 100 - excesosVelocidad * 5 - frenadasBruscas * 10;
  return nivel < 0 ? 0 : nivel;
}

async function calcularEstadoRecorrido(prisma, recorrido_id) {
  const [totalLecturas, excesosVelocidad, frenadasBruscas, totalIncidentes] = await Promise.all([
    prisma.lecturas_sensor.count({ where: { recorrido_id } }),
    prisma.lecturas_sensor.count({ where: { recorrido_id, velocidad: { gt: LIMITE_VELOCIDAD } } }),
    prisma.lecturas_sensor.count({ where: { recorrido_id, aceleracion: { lt: LIMITE_FRENADA_BRUSCA } } }),
    prisma.incidentes.count({ where: { recorrido_id } }),
  ]);

  return {
    total_lecturas: totalLecturas,
    excesos_velocidad: excesosVelocidad,
    frenadas_bruscas: frenadasBruscas,
    total_incidentes: totalIncidentes,
    nivel_seguridad: totalLecturas === 0 ? null : calcularNivel(excesosVelocidad, frenadasBruscas),
  };
}

module.exports = { LIMITE_VELOCIDAD, LIMITE_FRENADA_BRUSCA, calcularNivel, calcularEstadoRecorrido };
