import { useState } from 'react'
import { useNotificaciones } from '../contextoNotificaciones'
import { etiquetaTipo, formatearFechaHora, leerJson, riesgoDe } from '../datos'
import { useCarga } from '../useCarga'

const POR_PAGINA = 20
const VACIO = { conductor_id: '', tipo_vehiculo: '', fecha_inicio: '', fecha_fin: '' }

export default function VistaHistorial() {
  const { conductores } = useNotificaciones()
  const [form, setForm] = useState(VACIO)
  const [aplicados, setAplicados] = useState(VACIO)
  const [pagina, setPagina] = useState(1)
  const [errorForm, setErrorForm] = useState('')

  const tipos = useCarga(() => leerJson('/vehiculos/tipos'), [])
  const historial = useCarga(() => {
    const params = new URLSearchParams()
    Object.entries(aplicados).forEach(([k, v]) => { if (v) params.append(k, v) })
    return leerJson(`/incidentes/historial?${params.toString()}`)
  }, [aplicados])

  const cambiar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  const buscar = (e) => {
    e.preventDefault()
    if (form.fecha_inicio && form.fecha_fin && form.fecha_inicio > form.fecha_fin) {
      setErrorForm('La fecha "desde" no puede ser posterior a "hasta".')
      return
    }
    setErrorForm('')
    setPagina(1)
    // fecha_fin con solo AAAA-MM-DD excluiría el último día: se pide hasta el final de ese día
    setAplicados({ ...form, fecha_fin: form.fecha_fin ? `${form.fecha_fin}T23:59:59.999` : '' })
  }

  const limpiar = () => {
    setForm(VACIO)
    setAplicados(VACIO)
    setErrorForm('')
    setPagina(1)
  }

  const filas = historial.datos || []
  const totalPaginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA))
  const visibles = filas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  return (
    <>
      <form className="filters" onSubmit={buscar}>
        <label className="field">Conductor
          <select className="select" value={form.conductor_id} onChange={cambiar('conductor_id')}>
            <option value="">Todos</option>
            {Object.entries(conductores).map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
          </select>
        </label>
        <label className="field">Tipo de vehículo
          <select className="select" value={form.tipo_vehiculo} onChange={cambiar('tipo_vehiculo')}>
            <option value="">Todos</option>
            {(tipos.datos || []).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="field">Desde
          <input className="input" type="date" value={form.fecha_inicio} onChange={cambiar('fecha_inicio')} />
        </label>
        <label className="field">Hasta
          <input className="input" type="date" value={form.fecha_fin} onChange={cambiar('fecha_fin')} />
        </label>
        <button type="submit" className="btn" disabled={historial.cargando}>Buscar</button>
        <button type="button" className="btn secondary" onClick={limpiar} disabled={historial.cargando}>Limpiar filtros</button>
      </form>

      {errorForm && <div className="errorbox" role="alert" style={{ margin: '0 0 12px' }}>{errorForm}</div>}
      {historial.error && <div className="errorbox" role="alert" style={{ margin: '0 0 12px' }}>{historial.error}</div>}

      <div className="panel">
        <div className="tablewrap">
          <table>
            <thead><tr><th>Fecha</th><th>Conductor</th><th>Vehículo</th><th>Tipo</th><th>Riesgo</th></tr></thead>
            <tbody>
              {visibles.map((i) => {
                const r = riesgoDe(i.nivel_riesgo)
                return (
                  <tr className="tdata" key={i.id}>
                    <td className="mono">{formatearFechaHora(i.fecha)}</td>
                    <td>{i.conductor || '—'}</td>
                    <td>{i.placa ? `${i.tipo_vehiculo || ''} · ${i.placa}` : '—'}</td>
                    <td>{etiquetaTipo(i.tipo)}</td>
                    <td><span className={`badge ${r.badge}`}>{r.etiqueta}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {historial.cargando && <div className="empty">Cargando historial…</div>}
        {!historial.cargando && !historial.error && filas.length === 0 && (
          <div className="empty">Sin incidentes para estos filtros.</div>
        )}
        {filas.length > 0 && (
          <div className="pager">
            <span className="info">{filas.length} incidente{filas.length === 1 ? '' : 's'} · página {pagina} de {totalPaginas}</span>
            <button type="button" className="btn small secondary" onClick={() => setPagina((p) => p - 1)} disabled={pagina <= 1}>Anterior</button>
            <button type="button" className="btn small secondary" onClick={() => setPagina((p) => p + 1)} disabled={pagina >= totalPaginas}>Siguiente</button>
          </div>
        )}
      </div>
    </>
  )
}
