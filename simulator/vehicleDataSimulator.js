const axios = require('axios');

let velocidadActual = 60;

function generarDatoVehiculo() {
    let aceleracion;
    const evento = Math.random();

    if (evento < 0.1) {
        aceleracion = -3.5;
    } else {
        aceleracion = (Math.random() * 2) - 1;
    }

    velocidadActual += aceleracion;

    if (velocidadActual < 0) {
        velocidadActual = 0;
    }

    return {
        velocidad: Number(velocidadActual.toFixed(2)),
        aceleracion: Number(aceleracion.toFixed(2)),
        timestamp: Date.now()
    };
}

function generarDistanciaObstaculo() {
    const distancia = Math.random() * 30;
    return Number(distancia.toFixed(2));
}

function detectarObstaculo(distancia) {
    const UMBRAL_RIESGO = 7;
    return distancia < UMBRAL_RIESGO;
}

// IMPORTANTE: reemplaza esto por el ID real del recorrido creado en la base de datos
const RECORRIDO_ID = "d982b26e-5a7f-4238-9b4e-2d0ec08e2257";

setInterval(async () => {
    const dato = generarDatoVehiculo();
    dato.recorrido_id = RECORRIDO_ID;
    console.log('Generado:', dato);

    try {
        await axios.post('http://localhost:4000/lecturas', dato);
        console.log('Enviado al backend correctamente');
    } catch (error) {
        console.error('Error al enviar al backend:', error.message);
    }
}, 1000);

// Pendiente de activar cuando se trabaje HU-04 (proximidad a obstaculos):
// const distancia = generarDistanciaObstaculo();
// const riesgo = detectarObstaculo(distancia);
// console.log({ distanciaObstaculo: distancia, riesgoColision: riesgo, timestamp: Date.now() });