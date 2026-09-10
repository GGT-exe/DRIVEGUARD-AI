require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
  res.send('DriveGuard API activa');
});

// Endpoint de prueba: leer conductores de la base de datos
app.get('/conductores', async (req, res) => {
  try {
    const conductores = await prisma.conductores.findMany();
    res.json(conductores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para crear un incidente con la imagen capturada
app.post('/incidentes', async (req, res) => {
  try {
    const { imagen, tipo, nivel_riesgo } = req.body;

    const nuevoIncidente = await prisma.incidentes.create({
      data: {
        imagen_url: imagen, // por ahora guardamos el base64 directo aquí
        tipo: tipo || 'deteccion_camara',
        nivel_riesgo: nivel_riesgo || 'medio'
      }
    });

    res.json(nuevoIncidente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Recibe una lectura de sensor (velocidad, aceleracion) desde el simulador
app.post('/lecturas', async (req, res) => {
  try {
    const { velocidad, aceleracion } = req.body;

    const nuevaLectura = await prisma.lecturas_sensor.create({
      data: {
        velocidad: velocidad,
        aceleracion: aceleracion,
      },
    });

    console.log('Lectura guardada:', nuevaLectura);
    res.status(201).json(nuevaLectura);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
