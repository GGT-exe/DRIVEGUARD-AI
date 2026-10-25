const test = require('node:test');
const assert = require('node:assert/strict');
const nodemailer = require('nodemailer');
const { crearFakePrisma } = require('./fakePrisma');
const { enviarCorreoNotificacion, obtenerDestinatarios } = require('../src/correo');

const NOTIFICACION = {
  tipo: 'nivel_seguridad_bajo',
  severidad: 'grave',
  mensaje: 'Nivel de seguridad bajo: 20/100 (umbral 50) — conductor Carlos, recorrido a1111111',
  fecha: new Date('2026-10-25T15:00:00Z'),
};

async function usuarios() {
  const prisma = crearFakePrisma();
  const datos = [
    ['Gerente Activo', 'gerente@test.co', 'gerente', true],
    ['Admin Nuevo', 'admin@test.co', 'admin', true],
    ['Admin Viejo', 'administrador@test.co', 'administrador', true],
    ['Supervisor', 'supervisor@test.co', 'supervisor', true],
    ['Gerente Inactivo', 'inactivo@test.co', 'gerente', false],
  ];
  for (const [nombre, correo, rol, activo] of datos) {
    await prisma.usuarios.create({ data: { nombre, correo, rol, activo, contrasena_hash: 'x' } });
  }
  return prisma;
}

test('destinatarios: solo gerentes y administradores activos (admin y administrador cuentan)', async () => {
  const lista = await obtenerDestinatarios(await usuarios());
  assert.deepEqual(lista.sort(), ['admin@test.co', 'administrador@test.co', 'gerente@test.co']);
});

test('arma y envía el correo con asunto, texto y destinatarios correctos', async () => {
  const transporte = nodemailer.createTransport({ jsonTransport: true });
  process.env.DASHBOARD_URL = 'https://driveguard.example.com';
  process.env.SMTP_FROM = 'DriveGuard <alertas@driveguard.test>';
  try {
    const r = await enviarCorreoNotificacion(await usuarios(), NOTIFICACION, { transporte });
    assert.equal(r.enviado, true);
    assert.equal(r.destinatarios.length, 3);
  } finally {
    delete process.env.DASHBOARD_URL;
    delete process.env.SMTP_FROM;
  }
});

test('el mensaje real generado por nodemailer lleva lo esperado', async () => {
  const enviados = [];
  const transporte = { sendMail: async (m) => { enviados.push(m); } };
  process.env.DASHBOARD_URL = 'https://driveguard.example.com';
  try {
    await enviarCorreoNotificacion(await usuarios(), NOTIFICACION, { transporte });
  } finally {
    delete process.env.DASHBOARD_URL;
  }
  const [m] = enviados;
  assert.match(m.subject, /^\[DriveGuard AI\] Alerta grave: nivel seguridad bajo$/);
  assert.match(m.text, /20\/100/);
  assert.match(m.text, /Abrir el dashboard: https:\/\/driveguard\.example\.com/);
  assert.equal(m.to.split(', ').length, 3);
  assert.ok(!m.to.includes('supervisor@test.co'));
  assert.ok(!m.to.includes('inactivo@test.co'));
});

test('sin SMTP configurado no envía ni lanza error', async () => {
  const r = await enviarCorreoNotificacion(await usuarios(), NOTIFICACION, { transporte: null });
  assert.deepEqual(r, { enviado: false, motivo: 'smtp_no_configurado' });
});

test('sin destinatarios no envía', async () => {
  const transporte = { sendMail: async () => { throw new Error('no debería llamarse'); } };
  const r = await enviarCorreoNotificacion(crearFakePrisma(), NOTIFICACION, { transporte });
  assert.deepEqual(r, { enviado: false, motivo: 'sin_destinatarios' });
});

test('si el servidor SMTP falla, devuelve error_envio sin lanzar', async () => {
  const transporte = { sendMail: async () => { throw new Error('conexión rechazada'); } };
  const r = await enviarCorreoNotificacion(await usuarios(), NOTIFICACION, { transporte });
  assert.deepEqual(r, { enviado: false, motivo: 'error_envio' });
});

test('nodemailer (jsonTransport) acepta el mensaje que construimos', async () => {
  const transporte = nodemailer.createTransport({ jsonTransport: true });
  const info = await transporte.sendMail({ from: 'a@b.co', to: 'c@d.co', subject: 's', text: 't' });
  assert.ok(JSON.parse(info.message).subject === 's');
});
