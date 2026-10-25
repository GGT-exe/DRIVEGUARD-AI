// fakePrisma.js
// Base de datos en memoria con la misma interfaz mínima de Prisma que usa el
// backend (findMany, findFirst, findUnique, create, update, updateMany, count).
// Sirve para probar la lógica y las rutas sin necesidad de PostgreSQL.

const { randomUUID } = require('node:crypto');

const DEFAULTS = {
  usuarios: () => ({ activo: true, rol: 'supervisor', fecha_registro: new Date() }),
  notificaciones: () => ({
    leida: false, fecha: new Date(), fecha_lectura: null, leida_por: null, conductor_id: null, recorrido_id: null,
  }),
  auditoria: () => ({ fecha: new Date(), detalle: null, usuario_id: null }),
  configuraciones_umbral: () => ({ descripcion: null, actualizado_por: null }),
  lecturas_sensor: () => ({ recorrido_id: null, velocidad: null, aceleracion: null, timestamp: new Date() }),
  incidentes: () => ({ recorrido_id: null, tipo: null, nivel_riesgo: null, imagen_url: null, fecha: new Date() }),
  recorridos: () => ({ conductor_id: null, vehiculo_id: null, fecha_inicio: new Date() }),
  reportes_seguridad: () => ({}),
};

function cumple(valor, condicion) {
  if (condicion !== null && typeof condicion === 'object' && !(condicion instanceof Date)) {
    if ('in' in condicion && !condicion.in.includes(valor)) return false;
    const hay = valor !== null && valor !== undefined;
    if ('gt' in condicion && !(hay && valor > condicion.gt)) return false;
    if ('gte' in condicion && !(hay && valor >= condicion.gte)) return false;
    if ('lt' in condicion && !(hay && valor < condicion.lt)) return false;
    if ('lte' in condicion && !(hay && valor <= condicion.lte)) return false;
    return true;
  }
  if (condicion instanceof Date && valor instanceof Date) return valor.getTime() === condicion.getTime();
  return valor === condicion;
}

function coincide(fila, where = {}) {
  return Object.entries(where).every(([campo, condicion]) => cumple(fila[campo], condicion));
}

function proyectar(fila, select) {
  if (!select) return { ...fila };
  const salida = {};
  for (const [campo, valor] of Object.entries(select)) {
    if (valor) salida[campo] = fila[campo];
  }
  return salida;
}

function crearModelo(nombre, filas) {
  const base = DEFAULTS[nombre] || (() => ({}));
  return {
    async findMany({ where, orderBy, skip = 0, take, select } = {}) {
      let r = filas.filter((f) => coincide(f, where));
      if (orderBy) {
        const [campo, sentido] = Object.entries(orderBy)[0];
        r = [...r].sort((a, b) => {
          const x = a[campo], y = b[campo];
          if (x === y) return 0;
          return (x > y ? 1 : -1) * (sentido === 'desc' ? -1 : 1);
        });
      }
      r = r.slice(skip, take === undefined ? undefined : skip + take);
      return r.map((f) => proyectar(f, select));
    },
    async findFirst({ where, select } = {}) {
      const f = filas.find((x) => coincide(x, where));
      return f ? proyectar(f, select) : null;
    },
    async findUnique({ where, select }) {
      const f = filas.find((x) => coincide(x, where));
      return f ? proyectar(f, select) : null;
    },
    async create({ data }) {
      const fila = { id: randomUUID(), ...base(), ...data };
      filas.push(fila);
      return { ...fila };
    },
    async update({ where, data }) {
      const f = filas.find((x) => coincide(x, where));
      if (!f) throw new Error(`No existe el registro a actualizar en ${nombre}`);
      Object.assign(f, data);
      return { ...f };
    },
    async updateMany({ where, data }) {
      const objetivo = filas.filter((x) => coincide(x, where));
      objetivo.forEach((f) => Object.assign(f, data));
      return { count: objetivo.length };
    },
    async count({ where } = {}) {
      return filas.filter((f) => coincide(f, where)).length;
    },
  };
}

function crearFakePrisma() {
  const tablas = {};
  const prisma = { tablas, async $disconnect() {} };
  for (const nombre of Object.keys(DEFAULTS)) {
    tablas[nombre] = [];
    prisma[nombre] = crearModelo(nombre, tablas[nombre]);
  }
  return prisma;
}

module.exports = { crearFakePrisma };
