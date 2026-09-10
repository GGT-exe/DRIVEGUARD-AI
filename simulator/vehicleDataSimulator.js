let velocidadActual = 60;

function generarDatoVehiculo() {
    const aceleracion = (Math.random() * 2) - 1;

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

console.log(generarDatoVehiculo());
console.log(generarDatoVehiculo());
console.log(generarDatoVehiculo());
console.log(generarDatoVehiculo());
console.log(generarDatoVehiculo());