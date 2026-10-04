require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { PrismaClient } = require('@prisma/client');
const PDFDocument = require('pdfkit');       // HU-20: exportar reportes en PDF
const ExcelJS = require('exceljs');          // HU-20: exportar reportes en Excel
const cron = require('node-cron');           // HU-17: job periódico
const { initSockets, emitirAlerta, SEVERIDAD } = require('./sockets'); // Historia 11
const jwt = require('jsonwebtoken');          // Historia 18
const { hashPassword, verificarPassword } = require('./auth');        // Historia 18
const { verificarToken } = require('./middlewareAuth');               // Historia 18

const app = express();
const server = http.createServer(app); // reemplaza el uso directo de app.listen()
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

initSockets(server); // deja el canal de Socket.io activo sobre el mismo servidor

app.post('/test-alerta/:conductorId', (req, res) => {
  emitirAlerta(req.params.conductorId, {
    severidad: SEVERIDAD.GRAVE,
    tipo: 'frenada_brusca',
    mensaje: 'Alerta de prueba',
  });
  res.sendStatus(200);
});

app.get('/', (req, res) => {
  res.send('DriveGuard API activa');
});

// ======================================================
// HU-19: permisos por rol. verificarToken (middlewareAuth.js) ya deja
// req.usuario = { id, correo, rol } disponible; esto solo revisa el rol.
// ======================================================
function requireRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }
    next();
  };
}

// ============================================================
// Historia 18 — registro e inicio de sesión seguro al dashboard
// ============================================================

// Crea un usuario del dashboard. Déjalo abierto hasta tener el primer admin
// creado a mano; luego protégelo con verificarToken + requireRol('admin').
app.post('/registro', async (req, res) => {
  try {
    const { nombre, correo, contrasena, rol } = req.body;
    if (!nombre || !correo || !contrasena) {
      return res.status(400).json({ error: 'nombre, correo y contrasena son obligatorios' });
    }
    const hash = await hashPassword(contrasena);
    const usuario = await prisma.usuarios.create({
      data: { nombre, correo, contrasena_hash: hash, rol: rol || 'supervisor', activo: true },
    });
    res.status(201).json({ id: usuario.id, nombre: usuario.nombre, rol: usuario.rol });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
      return res.status(400).json({ error: 'correo y contrasena son obligatorios' });
    }

    const usuario = await prisma.usuarios.findUnique({ where: { correo } });

    // Mismo mensaje de error tanto si el correo no existe como si la
    // contraseña está mal — así no le damos pistas a quien intenta adivinar.
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const passwordValida = await verificarPassword(contrasena, usuario.contrasena_hash);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: usuario.id, correo: usuario.correo, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      usuario: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ======================================================
// Endpoints existentes
// ======================================================

app.get('/conductores', verificarToken, async (req, res) => {
  try {
    const conductores = await prisma.conductores.findMany({
      select: { id: true, nombre: true },
    });
    res.json(conductores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/recorridos', verificarToken, async (req, res) => {
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
        imagen_url: imagen,
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
const UMBRAL_FRENADA_BRUSCA = -3;

app.post('/lecturas', async (req, res) => {
  try {
    const { velocidad, aceleracion, recorrido_id, conductor_id } = req.body;

    const nuevaLectura = await prisma.lecturas_sensor.create({
      data: {
        velocidad: velocidad,
        aceleracion: aceleracion,
        recorrido_id: recorrido_id || null,
      },
    });

    console.log('Lectura guardada:', nuevaLectura);

    if (aceleracion <= UMBRAL_FRENADA_BRUSCA) {
      const nivelRiesgo = aceleracion <= -5 ? 'alto' : 'medio';
      const tipo = 'frenada_brusca';
      const fecha = new Date();

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

        // Historia 11 — avisar al conductor en tiempo real por Socket.io.
        if (conductor_id) {
          emitirAlerta(conductor_id, {
            tipo: tipo,
            severidad: nivelRiesgo === 'alto' ? SEVERIDAD.GRAVE : SEVERIDAD.MODERADA,
            mensaje: 'Frenada brusca detectada',
          });
        }
      }
    }

    res.status(201).json(nuevaLectura);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// US-09 y US-10: nivel de seguridad y comportamiento anormal del recorrido
app.get('/recorridos/:id/nivel-seguridad', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;

    const lecturas = await prisma.lecturas_sensor.findMany({ where: { recorrido_id: id } });
    const incidentes = await prisma.incidentes.findMany({ where: { recorrido_id: id } });

    if (lecturas.length === 0) {
      return res.json({
        recorrido_id: id,
        nivel_seguridad: null,
        mensaje: 'No hay lecturas de sensor para este recorrido'
      });
    }

    const LIMITE_VELOCIDAD = 80;
    const LIMITE_FRENADA_BRUSCA = -4;

    let excesosVelocidad = 0;
    let frenadasBruscas = 0;

    lecturas.forEach(lectura => {
      if (lectura.velocidad !== null && lectura.velocidad > LIMITE_VELOCIDAD) excesosVelocidad++;
      if (lectura.aceleracion !== null && lectura.aceleracion < LIMITE_FRENADA_BRUSCA) frenadasBruscas++;
    });

    let nivelSeguridad = 100 - (excesosVelocidad * 5) - (frenadasBruscas * 10);
    if (nivelSeguridad < 0) nivelSeguridad = 0;

    const UMBRAL_NIVEL_BAJO = 50;
    const UMBRAL_INCIDENTES = 3;

    const comportamientoAnormal =
      nivelSeguridad < UMBRAL_NIVEL_BAJO || incidentes.length >= UMBRAL_INCIDENTES;

    let clasificacion;
    if (comportamientoAnormal) clasificacion = 'anormal';
    else if (incidentes.length > 0) clasificacion = 'riesgo_aislado';
    else clasificacion = 'normal';

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

// Coordenadas GPS de un recorrido (para el mapa - Historia 14)
app.get('/recorridos/:id/gps', verificarToken, async (req, res) => {
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

app.get('/prueba-simple', (req, res) => {
  res.json({ funciona: true });
});

// HU-13: Historial de incidentes con filtros (conductor, vehiculo, fechas)
// Optimizada: EXPLAIN ANALYZE confirmó Nested Loop + Index Scan, ~0.3ms con datos de prueba.
app.get('/incidentes/historial', verificarToken, async (req, res) => {
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

    if (condiciones.length > 0) query += ' WHERE ' + condiciones.join(' AND ');
    query += ' ORDER BY i.fecha DESC';

    const resultado = await prisma.$queryRawUnsafe(query, ...valores);
    res.json(resultado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// HU-15: Nivel de seguridad promedio de un conductor (COUNT(i.id), no COUNT(*),
// para no contar la fila fantasma del LEFT JOIN cuando no hay incidentes; y
// total_recorridos para distinguir "sin historial" de "historial perfecto").
app.get('/reportes/nivel-seguridad/:conductor_id', verificarToken, async (req, res) => {
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

app.get('/vehiculos/tipos', verificarToken, async (req, res) => {
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

// Incidentes de un recorrido con coordenadas, para pintarlos en el mapa (Historia 14)
app.get('/recorridos/:id/incidentes-mapa', verificarToken, async (req, res) => {
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

// ============================================================
// HU-16: Comparación del nivel de seguridad entre conductores o vehículos
// Usa la MISMA fórmula que US-09 (/recorridos/:id/nivel-seguridad)
// Filtros: ?por=conductor|vehiculo  &fecha_inicio=AAAA-MM-DD  &fecha_fin=AAAA-MM-DD
// ============================================================
function calcularNivelSeguridad(lecturas) {
  if (lecturas.length === 0) return null;

  const LIMITE_VELOCIDAD = 80;
  const LIMITE_FRENADA_BRUSCA = -4;

  let excesosVelocidad = 0;
  let frenadasBruscas = 0;

  lecturas.forEach(lectura => {
    if (lectura.velocidad !== null && lectura.velocidad > LIMITE_VELOCIDAD) excesosVelocidad++;
    if (lectura.aceleracion !== null && lectura.aceleracion < LIMITE_FRENADA_BRUSCA) frenadasBruscas++;
  });

  let nivel = 100 - (excesosVelocidad * 5) - (frenadasBruscas * 10);
  if (nivel < 0) nivel = 0;

  return { nivel, excesosVelocidad, frenadasBruscas };
}

app.get('/comparacion/nivel-seguridad', verificarToken, async (req, res) => {
  try {
    const por = req.query.por || 'conductor';

    if (por !== 'conductor' && por !== 'vehiculo') {
      return res.status(400).json({ error: "El parámetro 'por' debe ser 'conductor' o 'vehiculo'" });
    }

    const { fecha_inicio, fecha_fin } = req.query;
    const filtroFecha = {};

    if (fecha_inicio) {
      const desde = new Date(fecha_inicio);
      if (isNaN(desde.getTime())) {
        return res.status(400).json({ error: "fecha_inicio no es válida. Usa el formato AAAA-MM-DD" });
      }
      filtroFecha.gte = desde;
    }

    if (fecha_fin) {
      const hasta = new Date(fecha_fin);
      if (isNaN(hasta.getTime())) {
        return res.status(400).json({ error: "fecha_fin no es válida. Usa el formato AAAA-MM-DD" });
      }
      if (fecha_fin.length === 10) hasta.setUTCHours(23, 59, 59, 999);
      filtroFecha.lte = hasta;
    }

    if (filtroFecha.gte && filtroFecha.lte && filtroFecha.gte > filtroFecha.lte) {
      return res.status(400).json({ error: "fecha_inicio no puede ser posterior a fecha_fin" });
    }

    const where = Object.keys(filtroFecha).length > 0 ? { fecha_inicio: filtroFecha } : {};

    const recorridos = await prisma.recorridos.findMany({
      where,
      select: {
        id: true,
        conductor_id: true,
        vehiculo_id: true,
        conductores: { select: { nombre: true } },
        vehiculos: { select: { placa: true, tipo: true, marca: true, modelo: true } },
        lecturas_sensor: { select: { velocidad: true, aceleracion: true } },
        _count: { select: { incidentes: true } }
      }
    });

    const UMBRAL_NIVEL_BAJO = 50;
    const UMBRAL_INCIDENTES = 3;

    const grupos = {};

    recorridos.forEach(recorrido => {
      const clave = por === 'conductor' ? recorrido.conductor_id : recorrido.vehiculo_id;
      if (!clave) return;

      if (!grupos[clave]) {
        grupos[clave] = {
          id: clave,
          nombre: por === 'conductor'
            ? (recorrido.conductores?.nombre || 'Sin nombre')
            : (recorrido.vehiculos?.placa || 'Sin placa'),
          detalle: por === 'vehiculo' && recorrido.vehiculos
            ? { tipo: recorrido.vehiculos.tipo, marca: recorrido.vehiculos.marca, modelo: recorrido.vehiculos.modelo }
            : undefined,
          total_recorridos: 0,
          recorridos_evaluados: 0,
          suma_niveles: 0,
          excesos_velocidad: 0,
          frenadas_bruscas: 0,
          total_incidentes: 0,
          recorridos_anormales: 0
        };
      }

      const grupo = grupos[clave];
      const totalIncidentes = recorrido._count.incidentes;

      grupo.total_recorridos++;
      grupo.total_incidentes += totalIncidentes;

      const resultado = calcularNivelSeguridad(recorrido.lecturas_sensor);
      if (resultado === null) return;

      grupo.recorridos_evaluados++;
      grupo.suma_niveles += resultado.nivel;
      grupo.excesos_velocidad += resultado.excesosVelocidad;
      grupo.frenadas_bruscas += resultado.frenadasBruscas;

      if (resultado.nivel < UMBRAL_NIVEL_BAJO || totalIncidentes >= UMBRAL_INCIDENTES) {
        grupo.recorridos_anormales++;
      }
    });

    const resultados = Object.values(grupos)
      .map(grupo => {
        const { suma_niveles, ...resto } = grupo;
        return {
          ...resto,
          nivel_seguridad_promedio: grupo.recorridos_evaluados > 0
            ? Math.round((suma_niveles / grupo.recorridos_evaluados) * 10) / 10
            : null
        };
      })
      .sort((a, b) => {
        if (a.nivel_seguridad_promedio === null) return 1;
        if (b.nivel_seguridad_promedio === null) return -1;
        return b.nivel_seguridad_promedio - a.nivel_seguridad_promedio;
      })
      .map((item, index) => ({ posicion: index + 1, ...item }));

    res.json({
      comparacion_por: por,
      filtros: { fecha_inicio: fecha_inicio || null, fecha_fin: fecha_fin || null },
      total: resultados.length,
      resultados
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// HU-20: Exportación de reportes de seguridad en PDF o Excel
// Lee reportes_seguridad (la llena el job de HU-17, más abajo)
// Uso: /reportes/exportar?formato=pdf|excel  (opcionales: &conductor_id=...&fecha_inicio=...&fecha_fin=...)
// Solo admin/gerente pueden exportar (HU-19: permisos por rol)
// ============================================================
function formatearFecha(fecha) {
  if (!fecha) return '-';
  return new Date(fecha).toISOString().slice(0, 10);
}

function formatearNivel(nivel) {
  if (nivel === null || nivel === undefined) return '-';
  return Math.round(nivel * 10) / 10;
}

app.get('/reportes/exportar', verificarToken, requireRol('admin', 'gerente'), async (req, res) => {
  try {
    const formato = (req.query.formato || '').toLowerCase();
    const { conductor_id, fecha_inicio, fecha_fin } = req.query;

    if (formato !== 'pdf' && formato !== 'excel') {
      return res.status(400).json({ error: "El parámetro 'formato' debe ser 'pdf' o 'excel'" });
    }

    const where = {};
    if (conductor_id) where.conductor_id = conductor_id;

    if (fecha_inicio) {
      const desde = new Date(fecha_inicio);
      if (isNaN(desde.getTime())) {
        return res.status(400).json({ error: 'fecha_inicio no es válida. Usa el formato AAAA-MM-DD' });
      }
      where.periodo_inicio = { gte: desde };
    }

    if (fecha_fin) {
      const hasta = new Date(fecha_fin);
      if (isNaN(hasta.getTime())) {
        return res.status(400).json({ error: 'fecha_fin no es válida. Usa el formato AAAA-MM-DD' });
      }
      if (fecha_fin.length === 10) hasta.setUTCHours(23, 59, 59, 999);
      where.periodo_fin = { lte: hasta };
    }

    const reportes = await prisma.reportes_seguridad.findMany({
      where,
      include: { conductores: { select: { nombre: true } } },
      orderBy: { fecha_generacion: 'desc' }
    });

    const filas = reportes.map(r => ({
      conductor: r.conductores?.nombre || 'Sin conductor',
      periodo_inicio: formatearFecha(r.periodo_inicio),
      periodo_fin: formatearFecha(r.periodo_fin),
      nivel: formatearNivel(r.nivel_seguridad_promedio),
      incidentes: r.total_incidentes ?? 0,
      generado: formatearFecha(r.fecha_generacion)
    }));

    const hoy = formatearFecha(new Date());
    const textoFiltros = [
      conductor_id ? `Conductor: ${filas[0]?.conductor || conductor_id}` : null,
      fecha_inicio ? `Desde: ${fecha_inicio}` : null,
      fecha_fin ? `Hasta: ${fecha_fin}` : null
    ].filter(Boolean).join('   ') || 'Sin filtros (todos los reportes)';

    // ---------------- EXCEL ----------------
    if (formato === 'excel') {
      const libro = new ExcelJS.Workbook();
      libro.creator = 'DriveGuard-AI';
      const hoja = libro.addWorksheet('Reportes de seguridad');

      hoja.columns = [
        { header: 'Conductor', key: 'conductor', width: 28 },
        { header: 'Periodo inicio', key: 'periodo_inicio', width: 16 },
        { header: 'Periodo fin', key: 'periodo_fin', width: 16 },
        { header: 'Nivel de seguridad promedio', key: 'nivel', width: 28 },
        { header: 'Total incidentes', key: 'incidentes', width: 18 },
        { header: 'Fecha de generación', key: 'generado', width: 20 }
      ];

      hoja.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      hoja.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };

      if (filas.length === 0) {
        hoja.addRow({ conductor: 'No hay reportes para los filtros seleccionados' });
      } else {
        filas.forEach(fila => hoja.addRow(fila));
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="reporte-seguridad-${hoy}.xlsx"`);
      await libro.xlsx.write(res);
      return res.end();
    }

    // ---------------- PDF ----------------
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-seguridad-${hoy}.pdf"`);
    doc.pipe(res);

    doc.fontSize(18).font('Helvetica-Bold').text('DriveGuard-AI — Reporte de seguridad');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#555555')
      .text(`Generado el ${hoy}`)
      .text(textoFiltros)
      .text(`Total de reportes: ${filas.length}`);
    doc.fillColor('black').moveDown(1);

    const columnas = [
      { titulo: 'Conductor', clave: 'conductor', ancho: 150 },
      { titulo: 'Periodo inicio', clave: 'periodo_inicio', ancho: 80 },
      { titulo: 'Periodo fin', clave: 'periodo_fin', ancho: 80 },
      { titulo: 'Nivel prom.', clave: 'nivel', ancho: 65 },
      { titulo: 'Incidentes', clave: 'incidentes', ancho: 60 },
      { titulo: 'Generado', clave: 'generado', ancho: 80 }
    ];
    const ALTO_FILA = 20;
    const X_INICIO = 40;

    const dibujarFila = (valores, y, esEncabezado) => {
      if (esEncabezado) {
        doc.rect(X_INICIO, y, 515, ALTO_FILA).fill('#2563eb');
        doc.fillColor('white').font('Helvetica-Bold');
      } else {
        doc.fillColor('black').font('Helvetica');
      }
      let x = X_INICIO;
      columnas.forEach(col => {
        doc.fontSize(9).text(String(valores[col.clave] ?? col.titulo), x + 4, y + 6, {
          width: col.ancho - 8,
          ellipsis: true,
          lineBreak: false
        });
        x += col.ancho;
      });
      if (!esEncabezado) {
        doc.moveTo(X_INICIO, y + ALTO_FILA).lineTo(X_INICIO + 515, y + ALTO_FILA)
          .strokeColor('#dddddd').stroke();
      }
    };

    const encabezado = {};
    columnas.forEach(col => { encabezado[col.clave] = col.titulo; });

    let y = doc.y;
    dibujarFila(encabezado, y, true);
    y += ALTO_FILA;

    if (filas.length === 0) {
      doc.fillColor('black').font('Helvetica').fontSize(10)
        .text('No hay reportes para los filtros seleccionados.', X_INICIO, y + 10);
    } else {
      filas.forEach(fila => {
        if (y + ALTO_FILA > doc.page.height - 50) {
          doc.addPage();
          y = 40;
          dibujarFila(encabezado, y, true);
          y += ALTO_FILA;
        }
        dibujarFila(fila, y, false);
        y += ALTO_FILA;
      });
    }

    doc.end();
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.end();
    }
  }
});

// ======================================================
// HU-17: Reportes periódicos de seguridad vial
// Llena la tabla reportes_seguridad que lee /reportes/exportar arriba.
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

// Forzar la generación manualmente (pruebas / admin)
app.post('/reportes/generar-ahora', verificarToken, requireRol('admin'), async (req, res) => {
  try {
    await generarReportesSemanal();
    res.json({ mensaje: 'Reporte generado manualmente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Consulta de reportes por período (sin exportar archivo, solo JSON)
app.get('/reportes/periodico', verificarToken, async (req, res) => {
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

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});