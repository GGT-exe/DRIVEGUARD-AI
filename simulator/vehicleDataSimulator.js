function generarDatoVehiculo() {
    const velocidad = Math.random() * 100;
    const aceleracion = (Math.random() * 6) - 3;

    return {
        velocidad: velocidad,
        aceleracion: aceleracion,
        timestamp: Date.now()
    };
}

console.log(generarDatoVehiculo());