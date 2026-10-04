const axios = require('axios');

// IMPORTANTE: mismo recorrido_id que usas en Mapa.jsx y en tus pruebas
const RECORRIDO_ID = 'd982b26e-5a7f-4238-9b4e-2d0ec08e2257';

// Punto de partida: usa el último punto real que ya tienes (el 10.9725,-74.8075
// de tus pruebas por PowerShell), para que la ruta nueva siga desde ahí
// en vez de quedar desconectada.
const LAT_INICIAL = 10.9725;
const LNG_INICIAL = -74.8075;

// Cuántos puntos generar y qué tan "grande" es cada paso
const CANTIDAD_PUNTOS = 200;
const PASO_LAT = 0.0006;   // ~65m por punto aprox., ajustable
const PASO_LNG = 0.0004;

// Pausa entre cada POST, en milisegundos. No necesita ser 1000ms como el
// simulador de velocidad (ese simula tiempo real); acá solo queremos
// llenar la base rápido para probar el mapa con muchos puntos.
const PAUSA_MS = 80;

function dormir(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generarRutaLarga() {
  let lat = LAT_INICIAL;
  let lng = LNG_INICIAL;

  console.log(`Generando ${CANTIDAD_PUNTOS} puntos GPS para el recorrido ${RECORRIDO_ID}...`);

  for (let i = 0; i < CANTIDAD_PUNTOS; i++) {
    // Avance progresivo en una dirección, con algo de variación aleatoria
    // para que no sea una línea perfectamente recta (más parecido a una
    // ruta real, con curvas de calle).
    const variacionLat = (Math.random() - 0.5) * (PASO_LAT * 0.3);
    const variacionLng = (Math.random() - 0.5) * (PASO_LNG * 0.3);

    lat += PASO_LAT + variacionLat;
    lng += PASO_LNG + variacionLng;

    const punto = {
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      recorrido_id: RECORRIDO_ID,
    };

    try {
      await axios.post('http://localhost:4000/gps', punto);
      if (i % 20 === 0) {
        console.log(`Punto ${i + 1}/${CANTIDAD_PUNTOS} enviado:`, punto);
      }
    } catch (error) {
      console.error(`Error en el punto ${i + 1}:`, error.message);
    }

    await dormir(PAUSA_MS);
  }

  console.log('Listo. Ruta larga generada completamente.');
}

generarRutaLarga();