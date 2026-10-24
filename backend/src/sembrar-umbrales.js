const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const umbrales = [
    { clave: 'UMBRAL_FRENADA_BRUSCA', valor: -3, descripcion: 'Aceleración a partir de la cual se considera frenada brusca (nivel bajo)' },
    { clave: 'UMBRAL_FRENADA_MEDIO', valor: -4.5, descripcion: 'Aceleración a partir de la cual el nivel de riesgo pasa a medio' },
    { clave: 'UMBRAL_FRENADA_ALTO', valor: -6, descripcion: 'Aceleración a partir de la cual el nivel de riesgo pasa a alto' },
    { clave: 'LIMITE_VELOCIDAD', valor: 80, descripcion: 'Velocidad (km/h) a partir de la cual se cuenta como exceso' },
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