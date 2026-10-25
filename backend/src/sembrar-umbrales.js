const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const umbrales = [
    { clave: 'UMBRAL_FRENADA_BRUSCA', valor: -3, descripcion: 'Aceleración a partir de la cual se considera frenada brusca (nivel bajo)' },
    { clave: 'UMBRAL_FRENADA_MEDIO', valor: -4.5, descripcion: 'Aceleración a partir de la cual el nivel de riesgo pasa a medio' },
    { clave: 'UMBRAL_FRENADA_ALTO', valor: -6, descripcion: 'Aceleración a partir de la cual el nivel de riesgo pasa a alto' },
    { clave: 'LIMITE_VELOCIDAD', valor: 80, descripcion: 'Velocidad (km/h) a partir de la cual se cuenta como exceso' },
    // Historia 21 — eventos críticos que notifican al gerente
    { clave: 'NIVEL_SEGURIDAD_BAJO', valor: 50, descripcion: 'Nivel de seguridad (0-100) por debajo del cual se notifica al gerente' },
    { clave: 'INCIDENTES_REPETIDOS', valor: 3, descripcion: 'Cantidad de incidentes en un recorrido a partir de la cual se notifica al gerente' },
    { clave: 'MINUTOS_ENTRE_NOTIFICACIONES', valor: 30, descripcion: 'Minutos mínimos entre dos notificaciones iguales del mismo recorrido' },
  ];

  for (const u of umbrales) {
    await prisma.configuraciones_umbral.upsert({
      where: { clave: u.clave },
      update: {},
      create: u
    });
  }

  console.log('Umbrales iniciales creados/confirmados.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());