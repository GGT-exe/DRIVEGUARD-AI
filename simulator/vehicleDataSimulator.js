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

setInterval(() => {
    const dato = generarDatoVehiculo();

    console.log(dato);
}, 1000);