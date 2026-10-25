const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { crearFakePrisma } = require('./fakePrisma');
const { levantar, crearApp, tokenDe, pedir, esperar } = require('./helpers');
const { verificarToken } = require('../src/middlewareAuth');
const { verificarRol } = require('../src/middlewareRol');
const { crearRutasAuditoria } = require('../src/rutasAuditoria');
const { registrarAuditoria, auditar, construirFiltroAuditoria, consultarAuditoria } = require('../src/auditoria');

const ANA = 'a0000000-0000-4000-8000-000000000001';
const LUIS = 'b0000000-0000-4000-8000-000000000002';

async function conDatos() {
  const prisma = crearFakePrisma();
  await prisma.usuarios.create({ data: { id: ANA, nombre: 'Ana Admin', correo: 'ana@test.co', contrasena_hash: 'x', rol: 'admin' } });
  await prisma.usuarios.create({ data: { id: LUIS, nombre: 'Luis Supervisor', correo: 'luis@test.co', contrasena_hash: 'x' } });
  const filas = [
    [ANA, 'login', '2026-10-20T10:00:00Z'],
    [LUIS, 'login', '2026-10-21T08:00:00Z'],
    [ANA, 'cambio_configuracion', '2026-10-21T15:30:00Z'],
    [ANA, 'exportar_reporte', '2026-10-22T09:00:00Z'],
    [null, 'login_fallido', '2026-10-22T23:59:00Z'],
  ];
  for (const [usuario_id, accion, fecha] of filas) {
    await prisma.auditoria.create({ data: { usuario_id, accion, detalle: `detalle de ${accion}`, fecha: new Date(fecha) } });
  }
  return prisma;
}

test('registrarAuditoria guarda usuario, acción, detalle y fecha', async () => {
  const prisma = crearFakePrisma();
  await registrarAuditoria(prisma, ANA, 'login', 'ana@test.co');
  const [fila] = prisma.tablas.auditoria;
  assert.equal(fila.usuario_id, ANA);
  assert.equal(fila.accion, 'login');
  assert.equal(fila.detalle, 'ana@test.co');
  assert.ok(fila.fecha instanceof Date);
});

test('registrarAuditoria no lanza aunque falle la base de datos', async () => {
  const roto = { auditoria: { create: async () => { throw new Error('BD caída'); } } };
  await assert.doesNotReject(registrarAuditoria(roto, ANA, 'login', 'x'));
});

test('construirFiltroAuditoria valida los parámetros', () => {
  assert.match(construirFiltroAuditoria({ usuario_id: 'abc' }).error, /UUID/);
  assert.match(construirFiltroAuditoria({ desde: 'ayer' }).error, /desde/);
  assert.match(construirFiltroAuditoria({ hasta: '2026-13-45' }).error, /hasta/);
  assert.match(construirFiltroAuditoria({ desde: '2026-10-22', hasta: '2026-10-20' }).error, /posterior/);
  assert.match(construirFiltroAuditoria({ accion: 'x'.repeat(51) }).error, /accion/);
  assert.deepEqual(construirFiltroAuditoria({}).where, {});
});

test('filtra por usuario, por acción y por rango de fechas (el "hasta" incluye todo el día)', async () => {
  const prisma = await conDatos();

  const porUsuario = await consultarAuditoria(prisma, { usuario_id: ANA });
  assert.equal(porUsuario.total, 3);
  assert.ok(porUsuario.resultados.every((r) => r.usuario_id === ANA));
  assert.equal(porUsuario.resultados[0].usuario.nombre, 'Ana Admin');

  const porAccion = await consultarAuditoria(prisma, { accion: 'login' });
  assert.equal(porAccion.total, 2);

  const rango = await consultarAuditoria(prisma, { desde: '2026-10-21', hasta: '2026-10-21' });
  assert.deepEqual(rango.resultados.map((r) => r.accion).sort(), ['cambio_configuracion', 'login']);

  const ultimoDia = await consultarAuditoria(prisma, { hasta: '2026-10-22' });
  assert.equal(ultimoDia.total, 5, 'las 23:59 del 22 deben entrar en hasta=2026-10-22');

  const combinado = await consultarAuditoria(prisma, { usuario_id: ANA, accion: 'login', desde: '2026-10-21' });
  assert.equal(combinado.total, 0);
});

test('ordena del más reciente al más antiguo y trae usuario null si no hay actor', async () => {
  const r = await consultarAuditoria(await conDatos(), {});
  assert.deepEqual(r.resultados.map((x) => x.accion), ['login_fallido', 'exportar_reporte', 'cambio_configuracion', 'login', 'login']);
  assert.equal(r.resultados[0].usuario, null);
});

test('paginación: limite, pagina y total_paginas', async () => {
  const prisma = await conDatos();
  const p1 = await consultarAuditoria(prisma, { limite: '2', pagina: '1' });
  const p3 = await consultarAuditoria(prisma, { limite: '2', pagina: '3' });
  assert.equal(p1.resultados.length, 2);
  assert.equal(p1.total, 5);
  assert.equal(p1.total_paginas, 3);
  assert.equal(p3.resultados.length, 1);
  assert.equal((await consultarAuditoria(prisma, { limite: '9999' })).limite, 200);
});

test('middleware auditar: registra solo cuando la respuesta es exitosa', async () => {
  const prisma = crearFakePrisma();
  const app = express();
  const poner = (req, res, next) => { req.usuario = { id: ANA }; next(); };
  app.get('/ok', poner, auditar(prisma, 'accion_ok', (req) => `q=${req.query.q}`), (req, res) => res.json({ ok: true }));
  app.get('/mal', poner, auditar(prisma, 'accion_mal', 'no debería'), (req, res) => res.status(400).json({ error: 'x' }));
  const srv = await levantar(app);
  try {
    await pedir(srv.url, '/ok?q=hola');
    await pedir(srv.url, '/mal');
    await esperar(30);
    assert.equal(prisma.tablas.auditoria.length, 1);
    assert.equal(prisma.tablas.auditoria[0].accion, 'accion_ok');
    assert.equal(prisma.tablas.auditoria[0].usuario_id, ANA);
    assert.equal(prisma.tablas.auditoria[0].detalle, 'q=hola');
  } finally {
    await srv.cerrar();
  }
});

test('GET /auditoria: solo administrador (admin o administrador), con filtros y validación', async () => {
  const prisma = await conDatos();
  const srv = await levantar(crearApp(crearRutasAuditoria({ prisma, verificarToken, verificarRol })));
  try {
    assert.equal((await pedir(srv.url, '/auditoria')).status, 401);
    assert.equal((await pedir(srv.url, '/auditoria', { token: tokenDe('supervisor') })).status, 403);
    assert.equal((await pedir(srv.url, '/auditoria', { token: tokenDe('gerente') })).status, 403);

    for (const rol of ['admin', 'administrador']) {
      const r = await pedir(srv.url, `/auditoria?usuario_id=${ANA}&desde=2026-10-21`, { token: tokenDe(rol) });
      assert.equal(r.status, 200, rol);
      assert.equal(r.json.total, 2);
      assert.equal(r.json.resultados[0].usuario.correo, 'ana@test.co');
    }

    const mala = await pedir(srv.url, '/auditoria?usuario_id=hola', { token: tokenDe('admin') });
    assert.equal(mala.status, 400);
    assert.match(mala.json.error, /UUID/);

    const usuarios = await pedir(srv.url, '/usuarios', { token: tokenDe('admin') });
    assert.equal(usuarios.status, 200);
    assert.deepEqual(usuarios.json.map((u) => u.nombre), ['Ana Admin', 'Luis Supervisor']);
    assert.equal(usuarios.json[0].contrasena_hash, undefined, 'nunca debe salir el hash');
    assert.equal((await pedir(srv.url, '/usuarios', { token: tokenDe('supervisor') })).status, 403);
  } finally {
    await srv.cerrar();
  }
});
