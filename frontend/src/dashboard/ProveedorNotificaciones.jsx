import { useCallback, useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import { API_URL, apiFetch } from '../api'
import { ContextoNotificaciones } from './contextoNotificaciones'
import { severidadDe } from './datos'

// Historia 21 y 12 — una sola conexión Socket.io para todo el dashboard.
// Dos fuentes en una lista:
//  - Notificaciones guardadas en el servidor (nivel de seguridad bajo, incidentes
//    repetidos): se cargan al abrir, llegan por el evento "notificacion" y su
//    estado leído / no leído se conserva al recargar.
//  - Alertas en vivo de la flota (evento "alerta_flota"): viven mientras la
//    página está abierta.
const MAX = 50

const TITULOS = {
  nivel_seguridad_bajo: 'Nivel de seguridad bajo',
  incidentes_repetidos: 'Incidentes repetidos',
}

export default function ProveedorNotificaciones({ children, usuario }) {
  const [guardadas, setGuardadas] = useState([])
  const [enVivo, setEnVivo] = useState([])
  const [conductores, setConductores] = useState({})
  const [conectado, setConectado] = useState(false)
  const [aviso, setAviso] = useState('')

  const cargar = useCallback(async () => {
    try {
      const r = await apiFetch(`/notificaciones?limite=${MAX}`)
      if (!r.ok) throw new Error('respuesta no válida')
      const datos = await r.json()
      setGuardadas(datos.notificaciones)
      setAviso('')
    } catch {
      setAviso('No se pudieron cargar las notificaciones guardadas.')
    }
  }, [])

  useEffect(() => {
    let activo = true
    apiFetch('/conductores')
      .then((r) => (r.ok ? r.json() : []))
      .then((lista) => {
        if (activo) setConductores(Object.fromEntries(lista.map((c) => [c.id, c.nombre])))
      })
      .catch(() => {})
    return () => { activo = false }
  }, [])

  useEffect(() => {
    const socket = io(API_URL)

    socket.on('connect', () => {
      setConectado(true)
      if (usuario?.rol === 'conductor') {
        apiFetch('/conductores')
          .then((r) => (r.ok ? r.json() : []))
          .then((lista) => {
            if (lista[0]?.id) socket.emit('registrar_conductor', lista[0].id)
          })
          .catch(() => {})
      } else {
        socket.emit('registrar_supervisor')
      }
      cargar() // al reconectar recupera lo que llegó sin conexión
    })
    socket.on('disconnect', () => setConectado(false))

    socket.on('notificacion', (nueva) => {
      setGuardadas((previas) => (previas.some((n) => n.id === nueva.id) ? previas : [nueva, ...previas].slice(0, MAX)))
    })

    const recibirAlerta = (data) => {
      setEnVivo((previas) => {
        if (data.alertaId && previas.some((a) => a.alertaId === data.alertaId)) return previas
        return [{ ...data, recibidaEn: new Date(), leida: false }, ...previas].slice(0, MAX)
      })
    }
    socket.on('alerta_flota', recibirAlerta)
    socket.on('alerta', recibirAlerta)

    return () => socket.disconnect()
  }, [cargar, usuario])

  const items = useMemo(() => {
    const deServidor = guardadas.map((n) => ({
      clave: `n-${n.id}`,
      origen: 'guardada',
      id: n.id,
      severidad: severidadDe(n.severidad),
      titulo: TITULOS[n.tipo] || n.tipo,
      mensaje: n.mensaje,
      detalle: n.conductor_id && conductores[n.conductor_id] ? `Conductor: ${conductores[n.conductor_id]}` : '',
      cuando: new Date(n.fecha),
      leida: n.leida,
    }))
    const deVivo = enVivo.map((a, i) => ({
      clave: `v-${a.alertaId || i}`,
      origen: 'en_vivo',
      id: a.alertaId,
      severidad: severidadDe(a.severidad),
      titulo: a.tipo ? String(a.tipo).replace(/_/g, ' ') : 'Alerta en vivo',
      mensaje: a.mensaje || 'Alerta sin mensaje',
      detalle: `Conductor: ${conductores[a.conductorId] || a.conductorId || '—'}`,
      cuando: a.recibidaEn,
      leida: a.leida,
    }))
    return [...deServidor, ...deVivo].sort((a, b) => b.cuando - a.cuando)
  }, [guardadas, enVivo, conductores])

  const noLeidas = items.filter((i) => !i.leida).length

  const marcarLeida = useCallback(async (item) => {
    if (item.leida) return
    if (item.origen === 'en_vivo') {
      setEnVivo((previas) => previas.map((a) => (a.alertaId === item.id ? { ...a, leida: true } : a)))
      return
    }
    setGuardadas((previas) => previas.map((n) => (n.id === item.id ? { ...n, leida: true } : n)))
    try {
      const r = await apiFetch(`/notificaciones/${item.id}/leida`, { method: 'PATCH' })
      if (!r.ok) throw new Error('no se pudo marcar')
    } catch {
      setAviso('No se pudo marcar como leída. Inténtalo de nuevo.')
      cargar()
    }
  }, [cargar])

  const marcarTodas = useCallback(async () => {
    setEnVivo((previas) => previas.map((a) => ({ ...a, leida: true })))
    setGuardadas((previas) => previas.map((n) => ({ ...n, leida: true })))
    try {
      const r = await apiFetch('/notificaciones/leer-todas', { method: 'PATCH' })
      if (!r.ok) throw new Error('no se pudo marcar')
    } catch {
      setAviso('No se pudieron marcar todas como leídas. Inténtalo de nuevo.')
      cargar()
    }
  }, [cargar])

  const limpiarEnVivo = useCallback(() => setEnVivo([]), [])

  const valor = useMemo(
    () => ({ items, noLeidas, conectado, aviso, marcarLeida, marcarTodas, limpiarEnVivo, recargar: cargar, conductores }),
    [items, noLeidas, conectado, aviso, marcarLeida, marcarTodas, limpiarEnVivo, cargar, conductores]
  )

  return <ContextoNotificaciones.Provider value={valor}>{children}</ContextoNotificaciones.Provider>
}
