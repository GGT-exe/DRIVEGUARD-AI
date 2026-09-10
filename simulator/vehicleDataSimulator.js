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

setInterval(async () => {
    const dato = generarDatoVehiculo();
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