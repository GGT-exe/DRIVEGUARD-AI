import { leerJson } from './datos'
import { useCarga } from './useCarga'

// El backend entrega los puntos GPS y los incidentes POR recorrido. Para ver la
// flota en un solo mapa se piden los recorridos más recientes y, de cada uno, su
// ruta y sus incidentes (2 consultas por recorrido, en paralelo).
export const MAX_RECORRIDOS_MAPA = 10

export async function cargarDatosMapa() {
  const recorridos = await leerJson(`/recorridos?limite=${MAX_RECORRIDOS_MAPA}`)
  const lista = Array.isArray(recorridos) ? recorridos : []

  return Promise.all(
    lista.map(async (recorrido) => {
      const [gps, incidentes] = await Promise.all([
        leerJson(`/recorridos/${recorrido.id}/gps`).catch(() => []),
        leerJson(`/recorridos/${recorrido.id}/incidentes-mapa`).catch(() => []),
      ])
      const ruta = (Array.isArray(gps) ? gps : [])
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
        .map((p) => [p.lat, p.lng])
      return {
        recorrido,
        ruta,
        incidentes: (Array.isArray(incidentes) ? incidentes : []).map((i) => ({
          ...i,
          lat: i.lat === null ? null : Number(i.lat),
          lng: i.lng === null ? null : Number(i.lng),
          recorrido_id: recorrido.id,
        })),
      }
    })
  )
}

export function useDatosMapa() {
  return useCarga(cargarDatosMapa, [])
}
