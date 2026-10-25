const test = require('node:test');
const assert = require('node:assert/strict');
const { crearFakePrisma } = require('./fakePrisma');
const { levantar, crearApp, tokenDe, pedir } = require('./helpers');
const { verificarToken } = require('../src/middlewareAuth');
const { crearRutasNotificaciones } = require('../src/rutasNotificaciones');
const {
  detectarEventosCriticos,
  evaluarRecorrido,
  listarNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
  UMBRALES_POR_DEFECTO,
} = require('../src/notificaciones');

const REC = 'a1111111-1111-4111-8111-111111111111';
const COND = 'c2222222-2222-4222-8222-222222222222';

async function escenario({ frenadas = 0, excesos = 0, incidentes = 0 } = {}) {
  const prisma = crearFakePrisma();
  prisma.tablas.recorridos.push({ id: REC, conductor_id: COND, conductores: { nombre: 'Carlos Pérez' } });
  for (let i = 0; i < frenadas; i++) await prisma.lecturas_sensor.create({ data: { recorrido_id: REC, velocidad: 40, aceleracion: -5 } });
  for (let i = 0; i < excesos; i++) await prisma.lecturas_sensor.create({ data: { recorrido_id: REC, velocidad: 95, aceleracion: 0 } });
  for (let i = 0; i < incidentes; i++) await prisma.incidentes.create({ data: { recorrido_id: REC, tipo: 'frenada_brusca' } });
  return prisma;
}

function espias() {
  const emitidas = [];
  const correos = [];
  return {
    emitidas,
    correos,
    deps: { emitir: (n) => emitidas.push(n), enviarCorreo: async (n) => { correos.push(n); } },
  };
}

// ---------- detectarEventosCriticos (función pura) ----------

test('sin eventos críticos no se genera nada', () => {
  const e = detectarEventosCriticos({ nivel_seguridad: 100, total_incidentes: 0 }, UMBRALES_POR_DEFECTO, {});
  assert.deepEqual(e, []);
});

test('nivel de seguridad bajo: moderada cerca del umbral y grave por debajo de la mitad', () => {
  const m = detectarEventosCriticos({ nivel_seguridad: 40, total_incidentes: 0 }, UMBRALES_POR_DEFECTO, { recorrido_id: REC });
  assert.equal(m.length, 1);
  assert.equal(m[0].tipo, 'nivel_seguridad_bajo');
  assert.equal(m[0].severidad, 'moderada');
  const g = detectarEventosCriticos({ nivel_seguridad: 20, total_incidentes: 0 }, UMBRALES_POR_DEFECTO, {});
  assert.equal(g[0].severidad, 'grave');
});

test('el umbral es "menor que": nivel exactamente 50 no notifica', () => {
  assert.deepEqual(detectarEventosCriticos({ nivel_seguridad: 50, total_incidentes: 2 }, UMBRALES_POR_DEFECTO, {}), []);
});

test('incidentes repetidos: desde 3 es moderada y desde 6 es grave', () => {
  assert.equal(detectarEventosCriticos({ nivel_seguridad: 100, total_incidentes: 2 }, UMBRALES_POR_DEFECTO, {}).length, 0);
  assert.equal(detectarEventosCriticos({ nivel_seguridad: 100, total_incidentes: 3 }, UMBRALES_POR_DEFECTO, {})[0].severidad, 'moderada');
  assert.equal(detectarEventosCriticos({ nivel_seguridad: 100, total_incidentes: 6 }, UMBRALES_POR_DEFECTO, {})[0].severidad, 'grave');
});

test('sin lecturas (nivel null) igual se detectan los incidentes repetidos', () => {
  const e = detectarEventosCriticos({ nivel_seguridad: null, total_incidentes: 3 }, UMBRALES_POR_DEFECTO, {});
  assert.deepEqual(e.map((x) => x.tipo), ['incidentes_repetidos']);
});

test('el mensaje incluye el conductor y el valor medido', () => {
  const [e] = detectarEventosCriticos({ nivel_seguridad: 30, total_incidentes: 0 }, UMBRALES_POR_DEFECTO, { recorrido_id: REC, conductorNombre: 'Carlos Pérez' });
  assert.match(e.mensaje, /30\/100/);
  assert.match(e.mensaje, /Carlos Pérez/);
  assert.match(e.mensaje, /a1111111/);
});

// ---------- evaluarRecorrido ----------

test('6 frenadas bruscas: nivel 40 → notifica nivel bajo, guarda, emite y envía correo', async () => {
  const prisma = await escenario({ frenadas: 6 });
  const { emitidas, correos, deps } = espias();

  const creadas = await evaluarRecorrido(prisma, { recorrido_id: REC }, deps);

  assert.equal(creadas.length, 1);
  assert.equal(creadas[0].tipo, 'nivel_seguridad_bajo');
  assert.equal(creadas[0].leida, false);
  assert.equal(creadas[0].conductor_id, COND);
  assert.equal(prisma.tablas.notificaciones.length, 1);
  assert.equal(emitidas.length, 1);
  assert.equal(correos.length, 1);
  assert.equal(emitidas[0].id, creadas[0].id);
});

test('3 incidentes con buen nivel: notifica incidentes repetidos', async () => {
  const prisma = await escenario({ excesos: 2, incidentes: 3 });
  const creadas = await evaluarRecorrido(prisma, { recorrido_id: REC }, espias().deps);
  assert.deepEqual(creadas.map((n) => n.tipo), ['incidentes_repetidos']);
});

test('nivel bajo e incidentes repetidos a la vez generan dos notificaciones', async () => {
  const prisma = await escenario({ frenadas: 6, incidentes: 3 });
  const creadas = await evaluarRecorrido(prisma, { recorrido_id: REC }, espias().deps);
  assert.deepEqual(creadas.map((n) => n.tipo).sort(), ['incidentes_repetidos', 'nivel_seguridad_bajo']);
});

test('no repite la misma notificación dentro de la ventana de 30 minutos', async () => {
  const prisma = await escenario({ frenadas: 6 });
  const { emitidas, correos, deps } = espias();

  await evaluarRecorrido(prisma, { recorrido_id: REC }, deps);
  const segunda = await evaluarRecorrido(prisma, { recorrido_id: REC }, deps);

  assert.equal(segunda.length, 0);
  assert.equal(prisma.tablas.notificaciones.length, 1);
  assert.equal(emitidas.length, 1);
  assert.equal(correos.length, 1);
});

test('pasada la ventana, vuelve a notificar si la situación continúa', async () => {
  const prisma = await escenario({ frenadas: 6 });
  await evaluarRecorrido(prisma, { recorrido_id: REC }, espias().deps);
  prisma.tablas.notificaciones[0].fecha = new Date(Date.now() - 31 * 60 * 1000);

  const otra = await evaluarRecorrido(prisma, { recorrido_id: REC }, espias().deps);
  assert.equal(otra.length, 1);
  assert.equal(prisma.tablas.notificaciones.length, 2);
});

test('los umbrales configurados en la base (H22) reemplazan los de por defecto', async () => {
  const prisma = await escenario({ excesos: 4 }); // nivel 80: normalmente no notifica
  assert.equal((await evaluarRecorrido(prisma, { recorrido_id: REC }, espias().deps)).length, 0);

  await prisma.configuraciones_umbral.create({ data: { clave: 'NIVEL_SEGURIDAD_BAJO', valor: 90 } });
  const creadas = await evaluarRecorrido(prisma, { recorrido_id: REC }, espias().deps);
  assert.equal(creadas.length, 1);
  assert.match(creadas[0].mensaje, /umbral 90/);
});

test('sin recorrido_id o sin eventos no hace nada', async () => {
  const prisma = await escenario({ excesos: 1 });
  assert.deepEqual(await evaluarRecorrido(prisma, {}, espias().deps), []);
  assert.deepEqual(await evaluarRecorrido(prisma, { recorrido_id: REC }, espias().deps), []);
  assert.equal(prisma.tablas.notificaciones.length, 0);
});

test('si falla el Socket.io o el correo, la notificación igual queda guardada', async () => {
  const prisma = await escenario({ frenadas: 6 });
  const creadas = await evaluarRecorrido(prisma, { recorrido_id: REC }, {
    emitir: () => { throw new Error('socket caído'); },
    enviarCorreo: async () => { throw new Error('smtp caído'); },
  });
  assert.equal(creadas.length, 1);
  assert.equal(prisma.tablas.notificaciones.length, 1);
});

// ---------- leído / no leído ----------

test('listar, marcar una como leída y marcar todas', async () => {
  const prisma = await escenario({ frenadas: 6, incidentes: 3 });
  await evaluarRecorrido(prisma, { recorrido_id: REC }, espias().deps);

  let r = await listarNotificaciones(prisma);
  assert.equal(r.total_no_leidas, 2);
  assert.equal(r.notificaciones.length, 2);

  const marcada = await marcarLeida(prisma, r.notificaciones[0].id, COND);
  assert.equal(marcada.leida, true);
  assert.equal(marcada.leida_por, COND);
  assert.ok(marcada.fecha_lectura instanceof Date);

  r = await listarNotificaciones(prisma, { solo_no_leidas: true });
  assert.equal(r.notificaciones.length, 1);
  assert.equal(r.total_no_leidas, 1);

  assert.equal(await marcarTodasLeidas(prisma, COND), 1);
  assert.equal((await listarNotificaciones(prisma)).total_no_leidas, 0);
  assert.equal(await marcarLeida(prisma, 'no-existe'), null);
});

test('listarNotificaciones respeta el límite y ordena de la más reciente a la más antigua', async () => {
  const prisma = crearFakePrisma();
  for (let i = 0; i < 5; i++) {
    await prisma.notificaciones.create({ data: { tipo: 't', severidad: 'leve', mensaje: `m${i}`, fecha: new Date(2026, 9, 20 + i) } });
  }
  const r = await listarNotificaciones(prisma, { limite: '2' });
  assert.deepEqual(r.notificaciones.map((n) => n.mensaje), ['m4', 'm3']);
  assert.equal(r.total_no_leidas, 5);
});

// ---------- rutas HTTP (con JWT real) ----------

test('rutas /notificaciones: autenticación, listado, filtro y marcado como leída', async () => {
  const prisma = await escenario({ frenadas: 6, incidentes: 3 });
  await evaluarRecorrido(prisma, { recorrido_id: REC }, espias().deps);
  const srv = await levantar(crearApp(crearRutasNotificaciones({ prisma, verificarToken })));
  const token = tokenDe('supervisor');

  try {
    assert.equal((await pedir(srv.url, '/notificaciones')).status, 401);

    const lista = await pedir(srv.url, '/notificaciones', { token });
    assert.equal(lista.status, 200);
    assert.equal(lista.json.total_no_leidas, 2);
    assert.equal(lista.json.notificaciones.length, 2);

    const id = lista.json.notificaciones[0].id;
    const ok = await pedir(srv.url, `/notificaciones/${id}/leida`, { metodo: 'PATCH', token });
    assert.equal(ok.status, 200);
    assert.equal(ok.json.leida, true);

    const noLeidas = await pedir(srv.url, '/notificaciones?solo_no_leidas=true', { token });
    assert.equal(noLeidas.json.notificaciones.length, 1);
    assert.equal(noLeidas.json.total_no_leidas, 1);

    assert.equal((await pedir(srv.url, '/notificaciones/no-es-uuid/leida', { metodo: 'PATCH', token })).status, 400);
    assert.equal((await pedir(srv.url, '/notificaciones/99999999-9999-4999-8999-999999999999/leida', { metodo: 'PATCH', token })).status, 404);

    const todas = await pedir(srv.url, '/notificaciones/leer-todas', { metodo: 'PATCH', token });
    assert.deepEqual(todas.json, { actualizadas: 1 });
    assert.equal((await pedir(srv.url, '/notificaciones', { token })).json.total_no_leidas, 0);
  } finally {
    await srv.cerrar();
  }
});
