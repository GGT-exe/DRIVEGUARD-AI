require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cron = require('node-cron');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const JWT_SECRET = process.env.JWT_SECRET; // agrégalo a tu .env, nunca lo subas a Git

app.get('/', (req, res) => {
  res.send('DriveGuard API activa');
});

// ======================================================
// AUTENTICACIÓN (HU-18) y PERMISOS POR ROL (HU-19)
// ======================================================

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Token no proporcionado' });

  const token = header.split(' ')[1]; // formato "Bearer <token>"
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.usuario = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }
    next();
  };
}

// Registrar usuario del dashboard (protégelo con requireRole('admin') una vez tengan
// al primer admin creado manualmente en la base; mientras tanto déjalo abierto para crear
// el usuario inicial y luego cierras el acceso).
app.post('/auth/registrar', async (req, res) => {
  try {
    const { nombre, correo, password, rol } = req.body;
    if (!nombre || !correo || !password) {
      return res.status(400).json({ error: 'nombre, correo y password son obligatorios' });
    }
    const hash = await bcrypt.hash(password, 10);
    const usuario = await prisma.usuarios.create({
      data: { nombre, correo, contrasena_hash: hash, rol: rol || 'analista', activo: true },
    });
    res.status(201).json({ id: usuario.id, nombre: usuario.nombre, rol: usuario.rol });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { correo, password } = req.body;
    const usuario = await prisma.usuarios.findUnique({ where: { correo } });
    if (!usuario) return res.status(401).json({ error: 'Credenciales inválidas' });

    if (!usuario.activo) {
      return res.status(403).json({ error: 'Usuario desactivado, contacta a un administrador' });
    }

    const passwordValida = await bcrypt.compare(password, usuario.contrasena_hash);
    if (!passwordValida) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ token, usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ======================================================
// ENDPOINTS EXISTENTES
// ======================================================

// Endpoint: conductores (usado tanto de prueba como para el dropdown del filtro)
app.get('/conductores', async (req, res) => {
  try {
    const conductores = await prisma.conductores.findMany({
      select: { id: true, nombre: true },
    });
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

// HU-13: Historial de incidentes con filtros (conductor, vehiculo, fechas)
// Ya optimizada: EXPLAIN ANALYZE confirmó Nested Loop + Index Scan, ~0.3ms con los datos de prueba.
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

// HU-15: Nivel de seguridad promedio de un conductor (corregido: COUNT(i.id) en vez de
// COUNT(*) para no contar la fila "fantasma" del LEFT JOIN cuando no hay incidentes,
// y total_recorridos para distinguir "sin historial" de "historial perfecto").
app.get('/reportes/nivel-seguridad/:conductor_id', async (req, res) => {
  try {
    const { conductor_id } = req.params;

    const resultado = await prisma.$queryRaw`
      SELECT
          c.nombre AS conductor,
          COUNT(DISTINCT r.id) AS total_recorridos,
          COUNT(i.id) AS total_incidentes,
          GREATEST(
              100
              - (COUNT(i.id) FILTER (WHERE i.nivel_riesgo = 'alto') * 10)
              - (COUNT(i.id) FILTER (WHERE i.nivel_riesgo = 'medio') * 5),
              0
          ) AS nivel_seguridad_promedio
      FROM conductores c
      LEFT JOIN recorridos r ON r.conductor_id = c.id
      LEFT JOIN incidentes i ON i.recorrido_id = r.id
      WHERE c.id = ${conductor_id}::uuid
      GROUP BY c.nombre
    `;

    if (resultado.length === 0) {
      return res.status(404).json({ mensaje: 'Conductor no encontrado.' });
    }

    const fila = resultado[0];

    if (Number(fila.total_recorridos) === 0) {
      return res.json({
        conductor: fila.conductor,
        nivel_seguridad_promedio: null,
        total_incidentes: 0,
        mensaje: 'No hay historial suficiente para calcular el nivel de seguridad de este conductor.',
      });
    }

    res.json(fila);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint auxiliar para el dropdown del filtro visual
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

// ======================================================
// HU-17: Reportes periódicos de seguridad vial
// ======================================================

async function generarReportesSemanal() {
  const conductores = await prisma.conductores.findMany();
  const hoy = new Date();
  const haceUnaSemana = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);

  for (const conductor of conductores) {
    const stats = await prisma.$queryRaw`
      SELECT COUNT(i.id) AS total,
             COUNT(i.id) FILTER (WHERE i.nivel_riesgo = 'alto') AS altos,
             COUNT(i.id) FILTER (WHERE i.nivel_riesgo = 'medio') AS medios
      FROM recorridos r
      LEFT JOIN incidentes i ON i.recorrido_id = r.id
        AND i.fecha BETWEEN ${haceUnaSemana} AND ${hoy}
      WHERE r.conductor_id = ${conductor.id}::uuid
    `;
    const { total, altos, medios } = stats[0];
    const nivel = Math.max(0, 100 - Number(altos) * 10 - Number(medios) * 5);

    await prisma.reportes_seguridad.create({
      data: {
        periodo_inicio: haceUnaSemana,
        periodo_fin: hoy,
        conductor_id: conductor.id,
        total_incidentes: Number(total),
        nivel_seguridad_promedio: nivel,
      },
    });
  }
  console.log(`[reportePeriodico] Reporte generado para ${conductores.length} conductores`);
}

// Todos los lunes a las 6am genera el reporte semanal automáticamente
cron.schedule('0 6 * * 1', generarReportesSemanal);

// Endpoint para forzar la generación manualmente durante pruebas (bórralo o protégelo
// con requireRole('admin') antes de pasar a producción)
app.post('/reportes/generar-ahora', async (req, res) => {
  try {
    await generarReportesSemanal();
    res.json({ mensaje: 'Reporte generado manualmente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Consulta de reportes por período (lo que pide la daily del miércoles)
app.get('/reportes/periodico', async (req, res) => {
  try {
    const { conductor_id, desde, hasta } = req.query;
    const where = {};
    if (conductor_id) where.conductor_id = conductor_id;
    if (desde && hasta) where.periodo_inicio = { gte: new Date(desde) };

    const reportes = await prisma.reportes_seguridad.findMany({
      where,
      orderBy: { periodo_inicio: 'desc' },
    });
    res.json(reportes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ======================================================
// HU-20: Exportación de reportes en PDF / Excel
// Protegidas con login + rol (solo admin/gerente pueden exportar)
// ======================================================

app.get('/reportes/exportar/pdf', authMiddleware, requireRole('admin', 'gerente'), async (req, res) => {
  try {
    const reportes = await prisma.reportes_seguridad.findMany({ include: { conductores: true } });
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_seguridad.pdf');
    doc.pipe(res);

    doc.fontSize(16).text('Reporte de Seguridad Vial - DriveGuard AI', { align: 'center' });
    doc.moveDown();
    reportes.forEach((r) => {
      doc.fontSize(11).text(
        `${r.conductores?.nombre || r.conductor_id} | ${r.periodo_inicio.toISOString().slice(0, 10)} - ${r.periodo_fin.toISOString().slice(0, 10)} | Incidentes: ${r.total_incidentes} | Nivel: ${r.nivel_seguridad_promedio}`
      );
    });
    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/reportes/exportar/excel', authMiddleware, requireRole('admin', 'gerente'), async (req, res) => {
  try {
    const reportes = await prisma.reportes_seguridad.findMany({ include: { conductores: true } });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Reportes');
    sheet.columns = [
      { header: 'Conductor', key: 'conductor', width: 25 },
      { header: 'Periodo Inicio', key: 'inicio', width: 15 },
      { header: 'Periodo Fin', key: 'fin', width: 15 },
      { header: 'Incidentes', key: 'incidentes', width: 12 },
      { header: 'Nivel Seguridad', key: 'nivel', width: 15 },
    ];
    reportes.forEach((r) => {
      sheet.addRow({
        conductor: r.conductores?.nombre || r.conductor_id,
        inicio: r.periodo_inicio.toISOString().slice(0, 10),
        fin: r.periodo_fin.toISOString().slice(0, 10),
        incidentes: r.total_incidentes,
        nivel: r.nivel_seguridad_promedio,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_seguridad.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});