const test = require('node:test');
const assert = require('node:assert/strict');
const { esUuid, parsearFecha, enteroAcotado } = require('../src/validaciones');
const { calcularNivel, calcularEstadoRecorrido } = require('../src/nivelSeguridad');
const { verificarRol, normalizarRol } = require('../src/middlewareRol');
const { crearFakePrisma } = require('./fakePrisma');

test('esUuid acepta UUID válidos y rechaza el resto', () => {
  assert.equal(esUuid('d982b26e-5a7f-4238-9b4e-2d0ec08e2257'), true);
  assert.equal(esUuid('123'), false);
  assert.equal(esUuid(''), false);
  assert.equal(esUuid(undefined), false);
  assert.equal(esUuid("x'; DROP TABLE usuarios;--"), false);
});

test('parsearFecha: inválida da null y "hasta" incluye todo el día', () => {
  assert.equal(parsearFecha('no-es-fecha'), null);
  assert.equal(parsearFecha(''), null);
  assert.equal(parsearFecha(undefined), null);
  assert.equal(parsearFecha('2026-10-20').toISOString(), '2026-10-20T00:00:00.000Z');
  assert.equal(parsearFecha('2026-10-20', { finDeDia: true }).toISOString(), '2026-10-20T23:59:59.999Z');
});

test('enteroAcotado respeta límites y valores por defecto', () => {
  assert.equal(enteroAcotado(undefined, 50, 1, 200), 50);
  assert.equal(enteroAcotado('abc', 50, 1, 200), 50);
  assert.equal(enteroAcotado('0', 50, 1, 200), 1);
  assert.equal(enteroAcotado('9999', 50, 1, 200), 200);
  assert.equal(enteroAcotado('25', 50, 1, 200), 25);
});

test('calcularNivel usa la fórmula de US-09 (100 - 5*excesos - 10*frenadas, mínimo 0)', () => {
  assert.equal(calcularNivel(0, 0), 100);
  assert.equal(calcularNivel(2, 1), 80);
  assert.equal(calcularNivel(50, 50), 0);
});

test('calcularEstadoRecorrido da el mismo resultado que recorrer las lecturas', async () => {
  const prisma = crearFakePrisma();
  const rec = 'a1111111-1111-4111-8111-111111111111';
  const lecturas = [
    { velocidad: 90, aceleracion: 0 },   // exceso
    { velocidad: 85, aceleracion: -5 },  // exceso + frenada
    { velocidad: 60, aceleracion: -4 },  // -4 NO es frenada (< -4)
    { velocidad: 80, aceleracion: 1 },   // 80 NO es exceso (> 80)
    { velocidad: null, aceleracion: null },
  ];
  for (const l of lecturas) await prisma.lecturas_sensor.create({ data: { recorrido_id: rec, ...l } });
  await prisma.lecturas_sensor.create({ data: { recorrido_id: 'otro', velocidad: 200, aceleracion: -9 } });
  await prisma.incidentes.create({ data: { recorrido_id: rec } });

  const estado = await calcularEstadoRecorrido(prisma, rec);
  assert.deepEqual(estado, {
    total_lecturas: 5,
    excesos_velocidad: 2,
    frenadas_bruscas: 1,
    total_incidentes: 1,
    nivel_seguridad: 100 - 2 * 5 - 1 * 10,
  });
});

test('calcularEstadoRecorrido: sin lecturas el nivel es null', async () => {
  const estado = await calcularEstadoRecorrido(crearFakePrisma(), 'sin-datos');
  assert.equal(estado.nivel_seguridad, null);
  assert.equal(estado.total_lecturas, 0);
});

test('normalizarRol trata admin y administrador como el mismo rol', () => {
  assert.equal(normalizarRol('admin'), 'administrador');
  assert.equal(normalizarRol('Administrador'), 'administrador');
  assert.equal(normalizarRol(' ADMIN '), 'administrador');
  assert.equal(normalizarRol('gerente'), 'gerente');
  assert.equal(normalizarRol(undefined), '');
});

function ejecutar(middleware, usuario) {
  const res = { codigo: null, cuerpo: null, status(c) { this.codigo = c; return this; }, json(b) { this.cuerpo = b; return this; } };
  let siguio = false;
  middleware({ usuario }, res, () => { siguio = true; });
  return { res, siguio };
}

test('verificarRol: admin y administrador pasan donde se pide cualquiera de los dos', () => {
  for (const pedido of ['admin', 'administrador']) {
    for (const rolUsuario of ['admin', 'administrador']) {
      assert.equal(ejecutar(verificarRol(pedido), { rol: rolUsuario }).siguio, true, `${pedido} <- ${rolUsuario}`);
    }
  }
});

test('verificarRol: otros roles reciben 403 y sin usuario 401', () => {
  const sup = ejecutar(verificarRol('administrador'), { rol: 'supervisor' });
  assert.equal(sup.siguio, false);
  assert.equal(sup.res.codigo, 403);
  const anon = ejecutar(verificarRol('administrador'), undefined);
  assert.equal(anon.res.codigo, 401);
  assert.equal(ejecutar(verificarRol('admin', 'gerente'), { rol: 'gerente' }).siguio, true);
});
