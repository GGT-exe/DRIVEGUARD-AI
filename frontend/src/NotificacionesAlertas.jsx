import { useCallback, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { API_URL, apiFetch } from './api'

// US-21: centro de notificaciones del supervisor / gerente.
// Dos fuentes, en una sola lista:
//  - Notificaciones guardadas en el servidor (nivel de seguridad bajo, incidentes
//    repetidos): se cargan al abrir, llegan en vivo por el evento "notificacion" y
//    su estado leído / no leído SE CONSERVA al recargar la página.
//  - Alertas en vivo de la flota (evento "alerta_flota"): solo viven mientras la
//    página está abierta, como antes.
const MAX_ALERTAS = 50

const COLORES = {
  leve: '#f59e0b',
  moderada: '#ea580c',
  grave: '#dc2626',
}

const TITULOS = {
  nivel_seguridad_bajo: 'Nivel de seguridad bajo',
  incidentes_repetidos: 'Incidentes repetidos',
}

function colorSeveridad(severidad) {
  return COLORES[severidad] || '#6b7280'
}

function NotificacionesAlertas() {
  const [guardadas, setGuardadas] = useState([])
  const [enVivo, setEnVivo] = useState([])
  const [abierto, setAbierto] = useState(false)
  const [conectado, setConectado] = useState(false)
  const [aviso, setAviso] = useState('')

  const cargar = useCallback(async () => {
    try {
      const respuesta = await apiFetch(`/notificaciones?limite=${MAX_ALERTAS}`)
      if (!respuesta.ok) throw new Error('respuesta no válida')
      const datos = await respuesta.json()
      setGuardadas(datos.notificaciones)
      setAviso('')
    } catch {
      setAviso('No se pudieron cargar las notificaciones guardadas.')
    }
  }, [])

  useEffect(() => {
    const socket = io(API_URL)

    socket.on('connect', () => {
      setConectado(true)
      socket.emit('registrar_supervisor')
      cargar() // al reconectar, recupera lo que haya llegado mientras no había conexión
    })
    socket.on('disconnect', () => setConectado(false))

    socket.on('notificacion', (nueva) => {
      setGuardadas((previas) =>
        previas.some((n) => n.id === nueva.id) ? previas : [nueva, ...previas].slice(0, MAX_ALERTAS)
      )
    })

    socket.on('alerta_flota', (data) => {
      setEnVivo((previas) => {
        if (data.alertaId && previas.some((a) => a.alertaId === data.alertaId)) {
          return previas
        }
        const nueva = { ...data, recibidaEn: new Date(), leida: false }
        return [nueva, ...previas].slice(0, MAX_ALERTAS)
      })
    })

    return () => socket.disconnect()
  }, [cargar])

  const items = [
    ...guardadas.map((n) => ({
      clave: `n-${n.id}`,
      origen: 'guardada',
      id: n.id,
      severidad: n.severidad,
      titulo: TITULOS[n.tipo] || n.tipo,
      mensaje: n.mensaje,
      cuando: new Date(n.fecha),
      leida: n.leida,
    })),
    ...enVivo.map((a, i) => ({
      clave: `v-${a.alertaId || i}`,
      origen: 'en_vivo',
      id: a.alertaId,
      severidad: a.severidad,
      titulo: a.severidad ? a.severidad : 'sin severidad',
      mensaje: a.mensaje || 'Alerta sin mensaje',
      detalle: `Conductor: ${a.conductorId}`,
      cuando: a.recibidaEn,
      leida: a.leida,
    })),
  ].sort((a, b) => b.cuando - a.cuando)

  const noLeidas = items.filter((i) => !i.leida).length

  const marcarLeida = async (item) => {
    if (item.leida) return
    if (item.origen === 'en_vivo') {
      setEnVivo((previas) => previas.map((a) => (a.alertaId === item.id ? { ...a, leida: true } : a)))
      return
    }
    // optimista: se marca ya y, si el servidor falla, se vuelve a cargar el estado real
    setGuardadas((previas) => previas.map((n) => (n.id === item.id ? { ...n, leida: true } : n)))
    try {
      const r = await apiFetch(`/notificaciones/${item.id}/leida`, { method: 'PATCH' })
      if (!r.ok) throw new Error('no se pudo marcar')
    } catch {
      setAviso('No se pudo marcar como leída. Inténtalo de nuevo.')
      cargar()
    }
  }

  const marcarTodasLeidas = async () => {
    setEnVivo((previas) => previas.map((a) => ({ ...a, leida: true })))
    setGuardadas((previas) => previas.map((n) => ({ ...n, leida: true })))
    try {
      const r = await apiFetch('/notificaciones/leer-todas', { method: 'PATCH' })
      if (!r.ok) throw new Error('no se pudo marcar')
    } catch {
      setAviso('No se pudieron marcar todas como leídas. Inténtalo de nuevo.')
      cargar()
    }
  }

  const limpiarEnVivo = () => setEnVivo([])

  const alternarPanel = () => {
    setAbierto((v) => !v)
  }

  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 2000, fontFamily: 'sans-serif' }}>
      <button
        type="button"
        onClick={alternarPanel}
        aria-label="Centro de notificaciones"
        style={{
          position: 'relative',
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          background: '#1f2937',
          color: '#fff',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {noLeidas > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 20,
              height: 20,
              padding: '0 5px',
              borderRadius: 10,
              background: '#dc2626',
              color: '#fff',
              fontSize: 12,
              lineHeight: '20px',
              textAlign: 'center',
            }}
          >
            {noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div
          style={{
            marginTop: 8,
            width: 340,
            maxHeight: 420,
            overflowY: 'auto',
            background: '#fff',
            color: '#111827',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 12px',
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            <strong>Notificaciones</strong>
            <span style={{ fontSize: 12, color: conectado ? '#16a34a' : '#dc2626' }}>
              {conectado ? 'En vivo' : 'Sin conexión'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderBottom: '1px solid #e5e7eb' }}>
            <button type="button" onClick={marcarTodasLeidas} disabled={noLeidas === 0}>
              Marcar como leídas
            </button>
            <button type="button" onClick={limpiarEnVivo} disabled={enVivo.length === 0}>
              Limpiar alertas en vivo
            </button>
          </div>

          {aviso && (
            <p role="alert" style={{ margin: 0, padding: '8px 12px', fontSize: 13, background: '#fef2f2', color: '#991b1b' }}>
              {aviso}
            </p>
          )}

          {items.length === 0 ? (
            <p style={{ padding: 16, margin: 0, color: '#6b7280', fontSize: 14 }}>
              Sin alertas por ahora.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {items.map((item) => (
                <li
                  key={item.clave}
                  onClick={() => marcarLeida(item)}
                  title={item.leida ? undefined : 'Clic para marcar como leída'}
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid #f3f4f6',
                    borderLeft: `4px solid ${colorSeveridad(item.severidad)}`,
                    background: item.leida ? '#fff' : '#fef2f2',
                    cursor: item.leida ? 'default' : 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: colorSeveridad(item.severidad), fontWeight: 600, textTransform: 'uppercase' }}>
                      {item.titulo}
                    </span>
                    <span style={{ color: '#6b7280' }}>
                      {item.cuando.toLocaleTimeString('es-CO')}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, marginTop: 2 }}>{item.mensaje}</div>
                  {item.detalle && (
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{item.detalle}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificacionesAlertas
