// Utilidades compartidas por las vistas del dashboard.
import { apiFetch } from '../api'

// El backend guarda nivel_riesgo como alto / medio / bajo; la interfaz habla de
// grave / moderado / leve.
export const RIESGO = {
  alto: { clave: 'grave', etiqueta: 'Grave', color: '#e5484d', badge: 'bad' },
  medio: { clave: 'moderado', etiqueta: 'Moderado', color: '#f5a623', badge: 'warn' },
  bajo: { clave: 'leve', etiqueta: 'Leve', color: '#3dd68c', badge: 'ok' },
}

export function riesgoDe(nivel) {
  return RIESGO[String(nivel || '').toLowerCase()] || { clave: 'ninguna', etiqueta: nivel || '—', color: '#8b94a3', badge: 'neutral' }
}

// Las alertas en vivo y las notificaciones usan leve / moderada / grave.
export function severidadDe(severidad) {
  const s = String(severidad || '').toLowerCase()
  if (s === 'grave') return 'grave'
  if (s === 'moderada' || s === 'moderado') return 'moderado'
  if (s === 'leve') return 'leve'
  return 'ninguna'
}

export const ETIQUETA_SEVERIDAD = { grave: 'Grave', moderado: 'Moderado', leve: 'Leve', ninguna: 'Sin severidad' }

export function colorNivel(nivel) {
  if (nivel === null || nivel === undefined) return 'var(--muted-2)'
  if (nivel >= 80) return 'var(--safe)'
  if (nivel >= 50) return 'var(--warn)'
  return 'var(--danger)'
}

const TIPOS = {
  frenada_brusca: 'Frenada brusca',
  deteccion_camara: 'Detección por cámara',
  accidente: 'Accidente',
  choque: 'Choque',
  proximidad: 'Proximidad peligrosa',
  distraccion: 'Distracción del conductor',
  exceso_velocidad: 'Exceso de velocidad',
}

export function etiquetaTipo(tipo) {
  if (!tipo) return '—'
  return TIPOS[tipo] || String(tipo).replace(/_/g, ' ')
}

export function iniciales(nombre) {
  return String(nombre || '?')
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function formatearFechaHora(valor) {
  if (!valor) return '—'
  const d = new Date(valor)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
}

export function formatearHora(valor) {
  const d = valor instanceof Date ? valor : new Date(valor)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

// Fecha local AAAA-MM-DD
export function aTextoFecha(d) {
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

export const RANGOS = [
  { id: 'hoy', etiqueta: 'Hoy', dias: 0 },
  { id: '7d', etiqueta: '7 días', dias: 6 },
  { id: '30d', etiqueta: '30 días', dias: 29 },
]

export function rangoFechas(id) {
  const r = RANGOS.find((x) => x.id === id) || RANGOS[0]
  const hoy = new Date()
  const desde = new Date(hoy)
  desde.setDate(desde.getDate() - r.dias)
  const finDeDia = new Date(hoy)
  finDeDia.setHours(23, 59, 59, 999)
  return { desde: aTextoFecha(desde), hasta: aTextoFecha(hoy), hastaISO: finDeDia.toISOString() }
}

// Lee JSON de la API; si falla lanza un Error con un mensaje entendible.
export async function leerJson(ruta, opciones) {
  let respuesta
  try {
    respuesta = await apiFetch(ruta, opciones)
  } catch {
    throw new Error('No se pudo conectar con el servidor. Si estaba dormido puede tardar hasta un minuto: reintenta.')
  }
  const cuerpo = await respuesta.json().catch(() => null)
  if (!respuesta.ok) {
    if (respuesta.status === 403) throw new Error('Tu rol no tiene permiso para ver esta información.')
    throw new Error((cuerpo && cuerpo.error) || `Error ${respuesta.status} al consultar el servidor.`)
  }
  return cuerpo
}

// Descarga un archivo protegido (lleva el token, por eso no sirve un enlace simple).
export async function descargarArchivo(ruta, nombreSugerido) {
  const respuesta = await apiFetch(ruta)
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null)
    throw new Error((cuerpo && cuerpo.error) || 'No se pudo generar el archivo.')
  }
  const blob = await respuesta.blob()
  const disposicion = respuesta.headers.get('Content-Disposition') || ''
  const coincide = /filename="?([^";]+)"?/i.exec(disposicion)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = coincide ? coincide[1] : nombreSugerido
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
