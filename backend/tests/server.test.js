// Prueba del servidor COMPLETO (server.js) con una base de datos simulada:
// login, auditoría, roles, lecturas que disparan notificaciones, exportación.

process.env.JWT_SECRET = 'secreto-de-prueba';
process.env.PORT = '0';
delete process.env.NODE_ENV;
delete process.env.SMTP_HOST;

const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { crearFakePrisma } = require('./fakePrisma');
const { pedir, esperar, tokenDe } = require('./helpers');
const { hashPassword } = require('../src/auth');

const fake = crearFakePrisma();
const ruta = require.resolve('@prisma/client');
require.cache[ruta] = {
  id: ruta, filename: ruta, loaded: true,
  exports: { PrismaClient: function PrismaClient() { return fake; } },
};

const { server } = require('../src/server');

const REC = 'a1111111-1111-4111-8111-111111111111';
const COND = 'c2222222-2222-4222-8222-222222222222';
let url;

async function login(correo, contrasena) {
  return pedir(url, '/login', { metodo: 'POST', cuerpo: { correo, contrasena } });
}

async function lectura(cuerpo) {
  const r = await pedir(url, '/lecturas', { metodo: 'POST', cuerpo: { recorrido_id: REC, conductor_id: COND, ...cuerpo } });
  await esperar(40); // la evaluación de notificaciones corre en segundo plano
  return r;
}

test.before(async () => {
  if (!server.listening) await once(server, 'listening');
  url = `http://127.0.0.1:${server.address().port}`;

  const hash = await hashPassword('Clave123!');
  const base = { contrasena_hash: hash, activo: true };
  await fake.usuarios.create({ data: { ...base, nombre: 'Ana Admin', correo: 'ana@test.co', rol: 'admin' } });
  await fake.usuarios.create({ data: { ...base, nombre: 'Sara Supervisora', correo: 'sara@test.co', rol: 'supervisor' } });
  fake.tablas.recorridos.push({ id: REC, conductor_id: COND, fecha_inicio: new Date(2026, 8, 30), conductores: { nombre: 'Carlos Pérez' } });
  for (const [clave, valor] of [['UMBRAL_FRENADA_BRUSCA', -3]]) {
    await fake.configuraciones_umbral.create({ data: { clave, valor } });
  }
});

test.after(() => { server.close(); });

test('GET / responde que la API está activa', async () => {
  const r = await fetch(url + '/');
  assert.equal(await r.text(), 'DriveGuard API activa');
});

test('login correcto devuelve token y deja registro de auditoría', async () => {
  const r = await login('ana@test.co', 'Clave123!');
  assert.equal(r.status, 200);
  assert.ok(r.json.token);
  assert.equal(r.json.usuario.rol, 'admin');
  const fila = fake.tablas.auditoria.find((a) => a.accion === 'login');
  assert.equal(fila.detalle, 'ana@test.co');
  assert.equal(fila.usuario_id, r.json.usuario.id);
});

test('login incorrecto da 401 y queda como login_fallido', async () => {
  assert.equal((await login('ana@test.co', 'mala')).status, 401);
  assert.equal((await login('nadie@test.co', 'x')).status, 401);
  const fallidos = fake.tablas.auditoria.filter((a) => a.accion === 'login_fallido');
  assert.equal(fallidos.length, 2);
  assert.equal(fallidos[1].usuario_id, null);
});

test('registro crea usuario y lo audita', async () => {
  const r = await pedir(url, '/registro', { metodo: 'POST', cuerpo: { nombre: 'Nuevo', correo: 'nuevo@test.co', contrasena: 'abc12345' } });
  assert.equal(r.status, 201);
  assert.equal(r.json.rol, 'supervisor');
  assert.ok(fake.tablas.auditoria.some((a) => a.accion === 'registro_usuario' && /nuevo@test.co/.test(a.detalle)));
});

test('GET /auditoria: el admin ve el historial con nombres; el supervisor recibe 403', async () => {
  const admin = (await login('ana@test.co', 'Clave123!')).json.token;
  const sup = (await login('sara@test.co', 'Clave123!')).json.token;

  const ok = await pedir(url, '/auditoria?accion=login', { token: admin });
  assert.equal(ok.status, 200);
  assert.ok(ok.json.total >= 2);
  assert.ok(ok.json.resultados.every((r) => r.accion === 'login'));
  const nombres = ok.json.resultados.map((r) => r.usuario?.nombre);
  assert.ok(nombres.includes('Ana Admin') && nombres.includes('Sara Supervisora'));

  assert.equal((await pedir(url, '/auditoria', { token: sup })).status, 403);
  assert.equal((await pedir(url, '/auditoria')).status, 401);
  assert.equal((await pedir(url, '/auditoria?desde=mañana', { token: admin })).status, 400);
});

test('REGRESIÓN: un usuario con rol "admin" puede guardar umbrales (antes daba 403)', async () => {
  const admin = (await login('ana@test.co', 'Clave123!')).json.token;
  const r = await pedir(url, '/configuracion/UMBRAL_FRENADA_BRUSCA', { metodo: 'PUT', token: admin, cuerpo: { valor: -3.5 } });
  assert.equal(r.status, 200);
  assert.equal(r.json.valor, -3.5);
  const aud = fake.tablas.auditoria.find((a) => a.accion === 'cambio_configuracion');
  assert.match(aud.detalle, /UMBRAL_FRENADA_BRUSCA: -3 -> -3.5/);

  const sup = (await login('sara@test.co', 'Clave123!')).json.token;
  assert.equal((await pedir(url, '/configuracion/UMBRAL_FRENADA_BRUSCA', { metodo: 'PUT', token: sup, cuerpo: { valor: -9 } })).status, 403);
});

test('lecturas con frenadas bruscas: a los 3 incidentes avisa, y a las 6 avisa nivel bajo', async () => {
  const sara = (await login('sara@test.co', 'Clave123!')).json.token;

  for (let i = 0; i < 2; i++) await lectura({ velocidad: 40, aceleracion: -5 });
  assert.equal(fake.tablas.notificaciones.length, 0, 'con 2 incidentes todavía no hay notificación');

  await lectura({ velocidad: 40, aceleracion: -5 }); // 3er incidente
  assert.deepEqual(fake.tablas.notificaciones.map((n) => n.tipo), ['incidentes_repetidos']);

  for (let i = 0; i < 2; i++) await lectura({ velocidad: 40, aceleracion: -5 }); // 4 y 5
  assert.equal(fake.tablas.notificaciones.length, 1, 'no se repite la misma alerta');

  await lectura({ velocidad: 40, aceleracion: -5 }); // 6ta frenada: nivel 100-60 = 40 < 50
  assert.deepEqual(fake.tablas.notificaciones.map((n) => n.tipo).sort(), ['incidentes_repetidos', 'nivel_seguridad_bajo']);

  const lista = await pedir(url, '/notificaciones', { token: sara });
  assert.equal(lista.json.total_no_leidas, 2);
  assert.match(lista.json.notificaciones.find((n) => n.tipo === 'nivel_seguridad_bajo').mensaje, /Carlos Pérez/);
  assert.equal(lista.json.notificaciones[0].conductor_id, COND);

  const una = await pedir(url, `/notificaciones/${lista.json.notificaciones[0].id}/leida`, { metodo: 'PATCH', token: sara });
  assert.equal(una.json.leida, true);
  assert.equal((await pedir(url, '/notificaciones?solo_no_leidas=true', { token: sara })).json.notificaciones.length, 1);
});

test('una lectura normal no genera notificaciones ni evaluación', async () => {
  const antes = fake.tablas.notificaciones.length;
  const r = await lectura({ velocidad: 50, aceleracion: 0 });
  assert.equal(r.status, 201);
  assert.equal(fake.tablas.notificaciones.length, antes);
});

test('nivel-seguridad mantiene el formato de respuesta y los números (H27)', async () => {
  const sara = (await login('sara@test.co', 'Clave123!')).json.token;
  const r = await pedir(url, `/recorridos/${REC}/nivel-seguridad`, { token: sara });
  assert.equal(r.status, 200);
  // 6 lecturas con -5 (frenadas) + 1 normal (50 km/h) = 7 lecturas, 6 frenadas, 0 excesos, 6 incidentes
  assert.deepEqual(r.json, {
    recorrido_id: REC,
    total_lecturas: 7,
    excesos_velocidad: 0,
    frenadas_bruscas: 6,
    nivel_seguridad: 40,
    total_incidentes: 6,
    comportamiento_anormal: true,
    clasificacion: 'anormal',
  });

  const vacio = await pedir(url, '/recorridos/b9999999-9999-4999-8999-999999999999/nivel-seguridad', { token: sara });
  assert.deepEqual(vacio.json, {
    recorrido_id: 'b9999999-9999-4999-8999-999999999999',
    nivel_seguridad: null,
    mensaje: 'No hay lecturas de sensor para este recorrido',
  });
});

test('GET /recorridos pagina y ordena por fecha (H27)', async () => {
  const sara = (await login('sara@test.co', 'Clave123!')).json.token;
  for (let i = 1; i <= 4; i++) fake.tablas.recorridos.push({ id: `r${i}`, fecha_inicio: new Date(2026, 9, i) });
  const r = await pedir(url, '/recorridos?limite=2&pagina=1', { token: sara });
  assert.equal(r.json.length, 2);
  assert.ok(new Date(r.json[0].fecha_inicio) >= new Date(r.json[1].fecha_inicio));
  const sinParametros = await pedir(url, '/recorridos', { token: sara });
  assert.ok(sinParametros.json.length >= 5);
});

test('exportar: valida formato (400 no se audita) y exige rol admin/gerente', async () => {
  const admin = tokenDe('admin', 'a0000000-0000-4000-8000-000000000001');
  const sup = tokenDe('supervisor');
  const antes = fake.tablas.auditoria.filter((a) => a.accion === 'exportar_reporte').length;

  assert.equal((await pedir(url, '/reportes/exportar?formato=xml', { token: admin })).status, 400);
  assert.equal((await pedir(url, '/reportes/exportar?formato=pdf', { token: sup })).status, 403);
  await esperar(30);
  assert.equal(fake.tablas.auditoria.filter((a) => a.accion === 'exportar_reporte').length, antes);

  const ok = await fetch(url + '/reportes/exportar?formato=excel', { headers: { Authorization: `Bearer ${admin}` } });
  assert.equal(ok.status, 200);
  await ok.arrayBuffer();
  await esperar(50);
  const nuevas = fake.tablas.auditoria.filter((a) => a.accion === 'exportar_reporte');
  assert.equal(nuevas.length, antes + 1);
  assert.match(nuevas.at(-1).detalle, /formato=excel/);
});
