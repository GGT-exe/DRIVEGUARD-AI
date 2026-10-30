const axios = require('axios');

let velocidadActual = 60;

// ID real del conductor asociado al recorrido que se está simulando.
const CONDUCTOR_ID = "821e0fde-20bd-45d3-aceb-d67ce90d3374";

function generarDatoVehiculo() {
    let aceleracion;
    const evento = Math.random();

    // NUEVO — ahora se generan los 3 niveles de frenada brusca (según los
    // umbrales de server.js: leve > -4.5, moderada entre -4.5 y -6, alto <= -6)
    if (evento < 0.05) {
        aceleracion = -7;   // dispara nivel ALTO (grave)
    } else if (evento < 0.10) {
        aceleracion = -5;   // dispara nivel MEDIO (moderada)
    } else if (evento < 0.15) {
        aceleracion = -3.5; // dispara nivel BAJO (leve)
    } else {
        aceleracion = (Math.random() * 2) - 1; // conducción normal, sin frenada brusca
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

// ID real del recorrido creado en la base de datos.
const RECORRIDO_ID = "7c3a30f8-fd69-42f6-9e55-dedd14135e2f";

setInterval(async () => {
    const dato = generarDatoVehiculo();
    dato.recorrido_id = RECORRIDO_ID;
    dato.conductor_id = CONDUCTOR_ID; // NUEVO — necesario para que /lecturas sepa a quién avisar
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