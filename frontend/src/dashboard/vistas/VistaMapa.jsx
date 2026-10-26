import { useState } from 'react'
import { useNotificaciones } from '../contextoNotificaciones'
import { RIESGO, etiquetaTipo, formatearFechaHora, riesgoDe } from '../datos'
import { MAX_RECORRIDOS_MAPA, useDatosMapa } from '../mapaDatos'
import MapaIncidentes from '../MapaIncidentes'

export default function VistaMapa() {
  const { conductores } = useNotificaciones()
  const mapa = useDatosMapa()
  const [recorridoId, setRecorridoId] = useState('')
  const [riesgo, setRiesgo] = useState('')

  const datos = mapa.datos || []
  const filas = datos
    .filter((d) => !recorridoId || d.recorrido.id === recorridoId)
    .flatMap((d) => d.incidentes.map((i) => ({ ...i, conductor: conductores[d.recorrido.conductor_id] || '—' })))
    .filter((i) => !riesgo || i.nivel_riesgo === riesgo)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))

  return (
    <>
      <div className="filters">
        <label className="field">Recorrido
          <select className="select" value={recorridoId} onChange={(e) => setRecorridoId(e.target.value)}>
            <option value="">Todos (últimos {MAX_RECORRIDOS_MAPA})</option>
            {datos.map((d) => (
              <option key={d.recorrido.id} value={d.recorrido.id}>
                {conductores[d.recorrido.conductor_id] || 'Conductor sin nombre'} · {formatearFechaHora(d.recorrido.fecha_inicio)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">Nivel de riesgo
          <select className="select" value={riesgo} onChange={(e) => setRiesgo(e.target.value)}>
            <option value="">Todos los riesgos</option>
            {['bajo', 'medio', 'alto'].map((k) => <option key={k} value={k}>{RIESGO[k].etiqueta}</option>)}
          </select>
        </label>
        <button type="button" className="btn secondary" onClick={mapa.recargar} disabled={mapa.cargando}>
          {mapa.cargando ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {mapa.error && <div className="errorbox" role="alert" style={{ margin: '0 0 12px' }}>{mapa.error}</div>}

      <div className="panel">
        <MapaIncidentes datos={mapa.datos} riesgo={riesgo} recorridoId={recorridoId} alto={520} conductores={conductores} />
      </div>

      <h3 className="sec">Incidentes del mapa ({filas.length})</h3>
      <div className="panel tablewrap">
        <table>
          <thead><tr><th>Tipo</th><th>Conductor</th><th>Fecha</th><th>Ubicación</th><th>Riesgo</th></tr></thead>
          <tbody>
            {filas.map((i) => {
              const r = riesgoDe(i.nivel_riesgo)
              const ubicado = Number.isFinite(i.lat) && Number.isFinite(i.lng)
              return (
                <tr className="tdata" key={i.id}>
                  <td>{etiquetaTipo(i.tipo)}</td>
                  <td>{i.conductor}</td>
                  <td className="mono">{formatearFechaHora(i.fecha)}</td>
                  <td className="mono">{ubicado ? `${i.lat.toFixed(5)}, ${i.lng.toFixed(5)}` : 'sin coordenadas'}</td>
                  <td><span className={`badge ${r.badge}`}>{r.etiqueta}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filas.length === 0 && <div className="empty">No hay incidentes para estos filtros.</div>}
      </div>
    </>
  )
}
