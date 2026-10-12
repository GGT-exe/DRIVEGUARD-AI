import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'

// US-21: centro de notificaciones del supervisor.
// Se conecta por Socket.io, se une a la sala "supervisores" y muestra las
// alertas de toda la flota en tiempo real (evento "alerta_flota").
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const MAX_ALERTAS = 50

const COLORES = {
  leve: '#f59e0b',
  moderada: '#ea580c',
  grave: '#dc2626',
}

function colorSeveridad(severidad) {
  return COLORES[severidad] || '#6b7280'
}

function NotificacionesAlertas() {
  const [alertas, setAlertas] = useState([])
  const [abierto, setAbierto] = useState(false)
  const [conectado, setConectado] = useState(false)

  useEffect(() => {
    const socket = io(API_URL)

    socket.on('connect', () => {
      setConectado(true)
      socket.emit('registrar_supervisor')
    })
    socket.on('disconnect', () => setConectado(false))

    socket.on('alerta_flota', (data) => {
      setAlertas((previas) => {
        if (data.alertaId && previas.some((a) => a.alertaId === data.alertaId)) {
          return previas
        }
        const nueva = { ...data, recibidaEn: new Date(), leida: false }
        return [nueva, ...previas].slice(0, MAX_ALERTAS)
      })
    })

    return () => socket.disconnect()
  }, [])

  const noLeidas = alertas.filter((a) => !a.leida).length

  const marcarTodasLeidas = () =>
    setAlertas((previas) => previas.map((a) => ({ ...a, leida: true })))

  const limpiar = () => setAlertas([])

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
            <button type="button" onClick={limpiar} disabled={alertas.length === 0}>
              Limpiar
            </button>
          </div>

          {alertas.length === 0 ? (
            <p style={{ padding: 16, margin: 0, color: '#6b7280', fontSize: 14 }}>
              Sin alertas por ahora.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {alertas.map((a, i) => (
                <li
                  key={a.alertaId || i}
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid #f3f4f6',
                    borderLeft: `4px solid ${colorSeveridad(a.severidad)}`,
                    background: a.leida ? '#fff' : '#fef2f2',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: colorSeveridad(a.severidad), fontWeight: 600, textTransform: 'uppercase' }}>
                      {a.severidad || 'sin severidad'}
                    </span>
                    <span style={{ color: '#6b7280' }}>
                      {a.recibidaEn.toLocaleTimeString('es-CO')}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, marginTop: 2 }}>{a.mensaje || 'Alerta sin mensaje'}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    Conductor: {a.conductorId}
                  </div>
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