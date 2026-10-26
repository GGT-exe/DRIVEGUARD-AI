import { useState } from 'react'
import { colorNivel, leerJson } from '../datos'
import { useCarga } from '../useCarga'

// Misma regla de la API: por debajo de 50 el recorrido se considera de riesgo.
const UMBRAL_RIESGO = 50

export default function VistaComparativo() {
  const [por, setPor] = useState('conductor')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [aplicados, setAplicados] = useState({ por: 'conductor', desde: '', hasta: '' })
  const [seleccion, setSeleccion] = useState(null)
  const [errorForm, setErrorForm] = useState('')

  const comparacion = useCarga(() => {
    const params = new URLSearchParams({ por: aplicados.por })
    if (aplicados.desde) params.append('fecha_inicio', aplicados.desde)
    if (aplicados.hasta) params.append('fecha_fin', aplicados.hasta)
    return leerJson(`/comparacion/nivel-seguridad?${params.toString()}`)
  }, [aplicados])

  const consultar = (e) => {
    e.preventDefault()
    if (desde && hasta && desde > hasta) {
      setErrorForm('La fecha "desde" no puede ser posterior a "hasta".')
      return
    }
    setErrorForm('')
    setSeleccion(null)
    setAplicados({ por, desde, hasta })
  }

  const resultados = (comparacion.datos && comparacion.datos.resultados) || []
  const conNivel = resultados.filter((r) => r.nivel_seguridad_promedio !== null)
  const sinLecturas = resultados.filter((r) => r.nivel_seguridad_promedio === null)
  const elegido = conNivel.find((r) => r.id === seleccion) || conNivel[0]
  const porConductor = aplicados.por === 'conductor'

  return (
    <>
      <form className="filters" onSubmit={consultar}>
        <label className="field">Comparar por
          <select className="select" value={por} onChange={(e) => setPor(e.target.value)}>
            <option value="conductor">Conductor</option>
            <option value="vehiculo">Vehículo</option>
          </select>
        </label>
        <label className="field">Desde
          <input className="input" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label className="field">Hasta
          <input className="input" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </label>
        <button type="submit" className="btn" disabled={comparacion.cargando}>
          {comparacion.cargando ? 'Consultando…' : 'Consultar'}
        </button>
      </form>

      {errorForm && <div className="errorbox" role="alert" style={{ margin: '0 0 12px' }}>{errorForm}</div>}
      {comparacion.error && <div className="errorbox" role="alert" style={{ margin: '0 0 12px' }}>{comparacion.error}</div>}

      <div className="cmp-grid">
        <div>
          <h3 className="sec" style={{ marginTop: 0 }}>Nivel de seguridad promedio (0–100)</h3>
          <div className="panel">
            {conNivel.length === 0 && !comparacion.cargando && !comparacion.error && (
              <div className="empty">No hay recorridos con lecturas en el rango seleccionado.</div>
            )}
            {conNivel.length > 0 && (
              <div className="barchart">
                {conNivel.map((r) => (
                  <button
                    type="button"
                    key={r.id}
                    className={`bcol ${elegido && r.id === elegido.id ? 'sel' : ''}`}
                    onClick={() => setSeleccion(r.id)}
                    title={`${r.nombre}: ${r.nivel_seguridad_promedio}`}
                  >
                    {r.nivel_seguridad_promedio}
                    <div className="bar" style={{ height: `${r.nivel_seguridad_promedio * 1.9}px`, background: colorNivel(r.nivel_seguridad_promedio) }} />
                    <small>{r.nombre}</small>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="field-hint">
            <span className="dot" style={{ background: 'var(--safe)' }} />80–100 seguro ·{' '}
            <span className="dot" style={{ background: 'var(--warn)' }} />{UMBRAL_RIESGO}–79 precaución ·{' '}
            <span className="dot" style={{ background: 'var(--danger)' }} />0–{UMBRAL_RIESGO - 1} riesgo
          </p>
          {sinLecturas.length > 0 && (
            <p className="field-hint">Sin lecturas de sensor (no se pueden calificar): {sinLecturas.map((r) => r.nombre).join(', ')}</p>
          )}
        </div>

        <div>
          <h3 className="sec" style={{ marginTop: 0 }}>{porConductor ? 'Resumen del conductor' : 'Resumen del vehículo'}</h3>
          {!elegido && <div className="sumcard"><span>Selecciona una barra para ver el detalle.</span></div>}
          {elegido && (
            <>
              <div className="sumcard"><span>{porConductor ? 'Conductor' : 'Vehículo'}</span><b>{elegido.nombre}</b></div>
              <div className="sumcard"><span>Nivel promedio</span><b style={{ color: colorNivel(elegido.nivel_seguridad_promedio) }}>{elegido.nivel_seguridad_promedio}</b></div>
              <div className="sumcard"><span>Total de incidentes</span><b>{elegido.total_incidentes}</b></div>
              <div className="sumcard"><span>Recorridos evaluados</span><b>{elegido.recorridos_evaluados} de {elegido.total_recorridos}</b></div>
              <div className="sumcard"><span>Excesos de velocidad · frenadas bruscas</span><b>{elegido.excesos_velocidad} · {elegido.frenadas_bruscas}</b></div>
              <div className="sumcard"><span>Recorridos anormales</span><b>{elegido.recorridos_anormales}</b></div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
