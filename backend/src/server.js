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

// Endpoint para listar los recorridos existentes
app.get('/recorridos', async (req, res) => {
  try {
    const recorridos = await prisma.recorridos.findMany();
    res.json(recorridos);
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
const UMBRAL_FRENADA_BRUSCA = -3; // según lo definido por Julian con el Product Owner

app.post('/lecturas', async (req, res) => {
  try {
    const { velocidad, aceleracion, recorrido_id } = req.body;

    const nuevaLectura = await prisma.lecturas_sensor.create({
      data: {
        velocidad: velocidad,
        aceleracion: aceleracion,
        recorrido_id: recorrido_id || null,
      },
    });

    console.log('Lectura guardada:', nuevaLectura);

    // Deteccion automatica de frenada brusca -> crea un incidente (US-07)
      if (aceleracion <= UMBRAL_FRENADA_BRUSCA) {
        const nivelRiesgo = aceleracion <= -5 ? 'alto' : 'medio';
        const tipo = 'frenada_brusca';
        const fecha = new Date();

        // Validacion de campos obligatorios segun regla de negocio de US-07
        const camposObligatorios = { tipo, recorrido_id, nivelRiesgo, fecha };
        const camposFaltantes = Object.entries(camposObligatorios)
          .filter(([_, valor]) => valor === null || valor === undefined || valor === '')
          .map(([nombre]) => nombre);

        if (camposFaltantes.length > 0) {
          console.error(`🚨 ALERTA: Incidente rechazado por campos incompletos: ${camposFaltantes.join(', ')}`);
        } else {
          const nuevoIncidente = await prisma.incidentes.create({
            data: {
              recorrido_id: recorrido_id,
              tipo: tipo,
              nivel_riesgo: nivelRiesgo,
              fecha: fecha,
            },
          });

          console.log('⚠️  Incidente detectado y guardado:', nuevoIncidente);
        }
      }

    res.status(201).json(nuevaLectura);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: calcular nivel de seguridad y detectar comportamiento anormal (US-09 y US-10)
app.get('/recorridos/:id/nivel-seguridad', async (req, res) => {
  try {
    const { id } = req.params;

    const lecturas = await prisma.lecturas_sensor.findMany({
      where: { recorrido_id: id }
    });

    const incidentes = await prisma.incidentes.findMany({
      where: { recorrido_id: id }
    });

    if (lecturas.length === 0) {
      return res.json({
        recorrido_id: id,
        nivel_seguridad: null,
        mensaje: 'No hay lecturas de sensor para este recorrido'
      });
    }

    const LIMITE_VELOCIDAD = 80; // km/h, ajustable
    const LIMITE_FRENADA_BRUSCA = -4; // aceleración negativa fuerte

    let excesosVelocidad = 0;
    let frenadasBruscas = 0;

    lecturas.forEach(lectura => {
      if (lectura.velocidad !== null && lectura.velocidad > LIMITE_VELOCIDAD) {
        excesosVelocidad++;
      }
      if (lectura.aceleracion !== null && lectura.aceleracion < LIMITE_FRENADA_BRUSCA) {
        frenadasBruscas++;
      }
    });

    let nivelSeguridad = 100 - (excesosVelocidad * 5) - (frenadasBruscas * 10);
    if (nivelSeguridad < 0) nivelSeguridad = 0;

    // Detección de comportamiento anormal (US-10)
    const UMBRAL_NIVEL_BAJO = 50;
    const UMBRAL_INCIDENTES = 3;

    const comportamientoAnormal =
      nivelSeguridad < UMBRAL_NIVEL_BAJO || incidentes.length >= UMBRAL_INCIDENTES;

    let clasificacion;
    if (comportamientoAnormal) {
      clasificacion = 'anormal';
    } else if (incidentes.length > 0) {
      clasificacion = 'riesgo_aislado';
    } else {
      clasificacion = 'normal';
    }

    res.json({
      recorrido_id: id,
      total_lecturas: lecturas.length,
      excesos_velocidad: excesosVelocidad,
      frenadas_bruscas: frenadasBruscas,
      nivel_seguridad: nivelSeguridad,
      total_incidentes: incidentes.length,
      comportamiento_anormal: comportamientoAnormal,
      clasificacion: clasificacion
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Recibe coordenadas GPS y las guarda como punto geografico (PostGIS)
app.post('/gps', async (req, res) => {
  try {
    const { lat, lng, recorrido_id } = req.body;

    await prisma.$executeRaw`
      INSERT INTO lecturas_sensor (recorrido_id, ubicacion)
      VALUES (${recorrido_id}::uuid, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
    `;

    console.log(`GPS guardado: lat=${lat}, lng=${lng}`);
    res.status(201).json({ mensaje: 'Ubicacion guardada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: obtener las coordenadas GPS de un recorrido (para el mapa - Historia 14)
app.get('/recorridos/:id/gps', async (req, res) => {
  try {
    const { id } = req.params;

    const puntos = await prisma.$queryRaw`
      SELECT
        ST_Y(ubicacion::geometry) AS lat,
        ST_X(ubicacion::geometry) AS lng,
        timestamp
      FROM lecturas_sensor
      WHERE recorrido_id = ${id}::uuid
        AND ubicacion IS NOT NULL
      ORDER BY timestamp ASC
    `;

    res.json(puntos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
      }
});

// Ruta de prueba simple, para diagnosticar por qué otras rutas nuevas no cargan
app.get('/prueba-simple', (req, res) => {
  res.json({ funciona: true });
});

// HU-13: Historial de incidentes con filtros (conductor, vehiculo, fechas)
app.get('/incidentes/historial', async (req, res) => {
  try {
    const { conductor_id, fecha_inicio, fecha_fin, tipo_vehiculo, placa } = req.query;
    const condiciones = [];
    const valores = [];
    let idx = 1;

    let query = `
      SELECT i.id, c.nombre AS conductor, v.tipo AS tipo_vehiculo, v.placa,
             i.tipo, i.nivel_riesgo, i.fecha
      FROM incidentes i
      JOIN recorridos r ON i.recorrido_id = r.id
      JOIN conductores c ON r.conductor_id = c.id
      LEFT JOIN vehiculos v ON r.vehiculo_id = v.id
    `;

    if (conductor_id) { condiciones.push(`c.id = $${idx++}`); valores.push(conductor_id); }
    if (fecha_inicio) { condiciones.push(`i.fecha >= $${idx++}`); valores.push(fecha_inicio); }
    if (fecha_fin) { condiciones.push(`i.fecha <= $${idx++}`); valores.push(fecha_fin); }
    if (tipo_vehiculo) { condiciones.push(`v.tipo = $${idx++}`); valores.push(tipo_vehiculo); }
    if (placa) { condiciones.push(`v.placa = $${idx++}`); valores.push(placa); }

    if (condiciones.length > 0) {
      query += ' WHERE ' + condiciones.join(' AND ');
    }
    query += ' ORDER BY i.fecha DESC';

    const resultado = await prisma.$queryRawUnsafe(query, ...valores);
    res.json(resultado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// HU-15: Nivel de seguridad promedio de un conductor
app.get('/reportes/nivel-seguridad/:conductor_id', async (req, res) => {
  try {
    const { conductor_id } = req.params;

    const resultado = await prisma.$queryRaw`
      SELECT
          c.nombre AS conductor,
          GREATEST(
              100
              - (COUNT(*) FILTER (WHERE i.nivel_riesgo = 'alto') * 10)
              - (COUNT(*) FILTER (WHERE i.nivel_riesgo = 'medio') * 5),
              0
          ) AS nivel_seguridad_promedio,
          COUNT(*) AS total_incidentes
      FROM conductores c
      LEFT JOIN recorridos r ON r.conductor_id = c.id
      LEFT JOIN incidentes i ON i.recorrido_id = r.id
      WHERE c.id = ${conductor_id}::uuid
      GROUP BY c.nombre
    `;

    if (resultado.length === 0) {
      return res.status(404).json({ mensaje: 'No hay historial suficiente para este conductor.' });
    }

    res.json(resultado[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoints auxiliares para los dropdowns del filtro visual
app.get('/vehiculos/tipos', async (req, res) => {
  try {
    const tipos = await prisma.vehiculos.findMany({
      distinct: ['tipo'],
      select: { tipo: true },
    });
    res.json(tipos.map(t => t.tipo));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get('/recorridos/:id/incidentes-mapa', async (req, res) => {
  try {
    const { id } = req.params;
    const incidentes = await prisma.$queryRaw`
      SELECT
        i.id,
        i.tipo,
        i.nivel_riesgo,
        i.fecha,
        (SELECT ST_Y(ls.ubicacion::geometry) FROM lecturas_sensor ls WHERE ls.recorrido_id = i.recorrido_id AND ls.ubicacion IS NOT NULL ORDER BY ABS(EXTRACT(EPOCH FROM (ls.timestamp - i.fecha))) LIMIT 1) AS lat,
        (SELECT ST_X(ls.ubicacion::geometry) FROM lecturas_sensor ls WHERE ls.recorrido_id = i.recorrido_id AND ls.ubicacion IS NOT NULL ORDER BY ABS(EXTRACT(EPOCH FROM (ls.timestamp - i.fecha))) LIMIT 1) AS lng
      FROM incidentes i
      WHERE i.recorrido_id = ${id}::uuid
      ORDER BY i.fecha ASC
    `;
    res.json(incidentes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});
app.get('/prueba-simple', (req, res) => { res.json({ funciona: true }); });
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});