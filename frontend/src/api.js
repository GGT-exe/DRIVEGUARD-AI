// api.js
// Dirección del backend y manejo de la sesión (token JWT del login).
// Todas las pantallas del dashboard usan apiFetch para que la petición lleve
// el token; sin él, las rutas protegidas responden 401.

export const API_URL = import.meta.env.VITE_API_URL || 'https://driveguard-ai-1yop.onrender.com'

const CLAVE_TOKEN = 'token' // ConfiguracionUmbrales.jsx ya lee esta clave
const CLAVE_USUARIO = 'usuario'

// localStorage puede no estar disponible (modo privado, datos bloqueados):
// en ese caso la sesión vive solo en memoria mientras la página esté abierta.
const memoria = {}

function leer(clave) {
  try {
    const valor = localStorage.getItem(clave)
    if (valor !== null) return valor
  } catch {
    // se usa la memoria
  }
  return memoria[clave] ?? null
}

function escribir(clave, valor) {
  if (valor === null) delete memoria[clave]
  else memoria[clave] = valor
  try {
    if (valor === null) localStorage.removeItem(clave)
    else localStorage.setItem(clave, valor)
  } catch {
    // solo memoria
  }
}

export function obtenerToken() {
  return leer(CLAVE_TOKEN)
}

export function obtenerUsuario() {
  const texto = leer(CLAVE_USUARIO)
  try {
    return texto ? JSON.parse(texto) : null
  } catch {
    return null
  }
}

export function guardarSesion(token, usuario) {
  escribir(CLAVE_TOKEN, token)
  escribir(CLAVE_USUARIO, JSON.stringify(usuario))
}

export function cerrarSesion() {
  escribir(CLAVE_TOKEN, null)
  escribir(CLAVE_USUARIO, null)
  window.dispatchEvent(new Event('sesion-cerrada'))
}

// "admin" y "administrador" son el mismo rol (ver backend/src/middlewareRol.js)
export function esAdministrador(usuario) {
  const rol = String(usuario?.rol || '').trim().toLowerCase()
  return rol === 'admin' || rol === 'administrador'
}

export async function apiFetch(ruta, opciones = {}) {
  const token = obtenerToken()
  const headers = { ...(opciones.body ? { 'Content-Type': 'application/json' } : {}), ...opciones.headers }
  if (token) headers.Authorization = `Bearer ${token}`

  const respuesta = await fetch(`${API_URL}${ruta}`, { ...opciones, headers })

  // El token dura 8 horas: si venció, se vuelve a la pantalla de login.
  if (respuesta.status === 401 && token) cerrarSesion()
  return respuesta
}
