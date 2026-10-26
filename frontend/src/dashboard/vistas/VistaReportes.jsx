import { useState } from 'react'
import { useNotificaciones } from '../contextoNotificaciones'
import { descargarArchivo, formatearFechaHora, leerJson } from '../datos'
import { useCarga } from '../useCarga'
import { rolDe, ROLES } from '../roles'

function textoFecha(valor) {
  if (!valor) return '—'
  const d = new Date(valor)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO')
}

export default function VistaReportes({ usuario }) {
  const { conductores } = useNotificaciones()
  const esAdmin = rolDe(usuario) === ROLES.ADMINISTRADOR
  const [form, setForm] = useState({ formato: 'pdf', conductor_id: '', fecha_inicio: '', fecha_fin: '' })
  const [trabajando, setTrabajando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  const reportes = useCarga(() => leerJson('/reportes/periodico'), [])
  const cambiar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  const exportar = async (e) => {
    e.preventDefault()
    if (form.fecha_inicio && form.fecha_fin && form.fecha_inicio > form.fecha_fin) {
      setMensaje({ tipo: 'error', texto: 'La fecha "desde" no puede ser posterior a "hasta".' })
      return
    }
    setTrabajando(true)
    setMensaje(null)
    try {
      const params = new URLSearchParams({ formato: form.formato })
      if (form.conductor_id) params.append('conductor_id', form.conductor_id)
      if (form.fecha_inicio) params.append('fecha_inicio', form.fecha_inicio)
      if (form.fecha_fin) params.append('fecha_fin', form.fecha_fin)
      await descargarArchivo(`/reportes/exportar?${params.toString()}`, form.formato === 'pdf' ? 'reporte-seguridad.pdf' : 'reporte-seguridad.xlsx')
      setMensaje({ tipo: 'ok', texto: 'Reporte descargado.' })
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message })
    } finally {
      setTrabajando(false)
    }
  }

  const generarAhora = async () => {
    setTrabajando(true)
    setMensaje(null)
    try {
      await leerJson('/reportes/generar-ahora', { method: 'POST' })
      setMensaje({ tipo: 'ok', texto: 'Reportes generados para todos los conductores.' })
      reportes.recargar()
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message })
    } finally {
      setTrabajando(false)
    }
  }

  const lista = Array.isArray(reportes.datos) ? reportes.datos : []

  return (
    <div className="listgrid">
      <div className="panel">
        <div className="panel-head"><h2>Exportar reportes</h2></div>
        <form onSubmit={exportar}>
          <div className="formgrid">
            <label className="field">Formato
              <select className="select" value={form.formato} onChange={cambiar('formato')}>
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
              </select>
            </label>
            <label className="field">Conductor
              <select className="select" value={form.conductor_id} onChange={cambiar('conductor_id')}>
                <option value="">Todos</option>
                {Object.entries(conductores).map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
              </select>
            </label>
            <label className="field">Periodo desde
              <input className="input" type="date" value={form.fecha_inicio} onChange={cambiar('fecha_inicio')} />
            </label>
            <label className="field">Periodo hasta
              <input className="input" type="date" value={form.fecha_fin} onChange={cambiar('fecha_fin')} />
            </label>
          </div>
          <div className="cam-actions">
            <button type="submit" className="btn" disabled={trabajando}>{trabajando ? 'Procesando…' : 'Exportar reporte'}</button>
            {esAdmin && (
              <button type="button" className="btn secondary" onClick={generarAhora} disabled={trabajando}>
                Generar reportes ahora
              </button>
            )}
          </div>
          {mensaje && (
            <div className={mensaje.tipo === 'ok' ? 'okbox' : 'errorbox'} role="status" style={{ margin: '0 16px 16px' }}>{mensaje.texto}</div>
          )}
          <p className="field-hint" style={{ padding: '0 16px 16px', margin: 0 }}>
            Los reportes se generan solos cada lunes a las 6:00 a. m.{esAdmin ? ' El botón "Generar reportes ahora" los crea al instante.' : ''}
          </p>
        </form>
      </div>

      <div className="panel">
        <div className="panel-head"><h2>Reportes periódicos</h2><span className="panel-note">{lista.length} registrados</span></div>
        {reportes.error && <div className="errorbox" role="alert">{reportes.error}</div>}
        {reportes.cargando && <div className="empty">Cargando…</div>}
        {!reportes.cargando && !reportes.error && lista.length === 0 && (
          <div className="empty">Aún no hay reportes generados.</div>
        )}
        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          {lista.slice(0, 40).map((r) => (
            <div className="repRow" key={r.id}>
              <div>
                <div>{conductores[r.conductor_id] || 'Conductor sin nombre'}</div>
                <div className="alert-sub">
                  {textoFecha(r.periodo_inicio)} – {textoFecha(r.periodo_fin)} · generado {formatearFechaHora(r.fecha_generacion)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <b className="mono">{r.nivel_seguridad_promedio === null ? '—' : Math.round(r.nivel_seguridad_promedio)}</b>
                <div className="alert-sub">{r.total_incidentes ?? 0} incidente(s)</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
