const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-prueba';

// Levanta una app Express en un puerto libre y devuelve la URL base y cómo cerrarla.
async function levantar(app) {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    cerrar: () => new Promise((resolve) => server.close(resolve)),
  };
}

function crearApp(...routers) {
  const app = express();
  app.use(express.json());
  routers.forEach((r) => app.use(r));
  return app;
}

function tokenDe(rol, id = '11111111-1111-4111-8111-111111111111') {
  return jwt.sign({ id, correo: `${rol}@prueba.test`, rol }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

async function pedir(url, ruta, { metodo = 'GET', token, cuerpo } = {}) {
  const r = await fetch(url + ruta, {
    method: metodo,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  let json = null;
  try { json = await r.json(); } catch { json = null; }
  return { status: r.status, json };
}

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { levantar, crearApp, tokenDe, pedir, esperar };
