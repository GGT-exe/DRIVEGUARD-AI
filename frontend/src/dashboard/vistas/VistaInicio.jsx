import { useNotificaciones } from '../contextoNotificaciones'
import { colorNivel, etiquetaTipo, formatearHora, iniciales, leerJson, rangoFechas, riesgoDe } from '../datos'
import { useCarga } from '../useCarga'
import { useDatosMapa } from '../mapaDatos'
import ListaAlertas from '../ListaAlertas'
import MapaIncidentes from '../MapaIncidentes'

const CIRC = 194.8

function Gauge({ valor }) {
  const v = valor === null ? 0 : valor
  const color = valor === null ? '#2b313c' : valor >= 80 ? 'var(--safe)' : valor >= 60 ? 'var(--warn)' : 'var(--danger)'
  return (
    <svg width="74" height="74" viewBox="0 0 74 74" role="img" aria-label={valor === null ? 'Sin datos' : `Nivel ${valor} de 100`}>
      <circle cx="37" cy="37" r="31" fill="none" stroke="#262c36" strokeWidth="7" />
      <circle
        cx="37" cy="37" r="31" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={CIRC} strokeDashoffset={CIRC - (CIRC * v) / 100}
        transform="rotate(-90 37 37)" style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.3s' }}
      />
    </svg>
  )
}

export default function VistaInicio({ rango, onIrA }) {
  const { items, noLeidas, conductores } = useNotificaciones()
  const mapa = useDatosMapa()

  const resumen = useCarga(async () => {
    const { desde, hasta, hastaISO } = rangoFechas(rango)
    const [comparacion, historial, recorridos] = await Promise.all([
      leerJson(`/comparacion/nivel-seguridad?por=conductor&fecha_inicio=${desde}&fecha_fin=${hasta}`),
      leerJson(`/incidentes/historial?fecha_inicio=${desde}&fecha_fin=${encodeURIComponent(hastaISO)}`),
      leerJson('/recorridos?limite=100'),
    ])
    return { conductores: comparacion.resultados || [], incidentes: historial, recorridos }
  }, [rango])

  const d = resumen.datos
  const conNivel = d ? d.conductores.filter((c) => c.nivel_seguridad_promedio !== null) : []
  const nivelFlota = conNivel.length
    ? Math.round(conNivel.reduce((s, c) => s + c.nivel_seguridad_promedio, 0) / conNivel.length)
    : null

  const enCurso = d ? d.recorridos.filter((r) => !r.fecha_fin).length : null
  const graves = items.filter((i) => !i.leida && i.severidad === 'grave').length
  const porTipo = {}
  if (d) d.incidentes.forEach((i) => { porTipo[i.tipo] = (porTipo[i.tipo] || 0) + 1 })
  const topTipos = Object.entries(porTipo).sort((a, b) => b[1] - a[1]).slice(0, 3)

  return (
    <>
      {resumen.error && <div className="errorbox" role="alert">{resumen.error}</div>}

      <section className="kpis">
        <div className="card gauge-card">
          <Gauge valor={nivelFlota} />
          <div>
            <p className="kpi-title" style={{ marginBottom: 4 }}>Nivel de seguridad de flota</p>
            <div className="gauge-num">{nivelFlota === null ? '—' : nivelFlota}<span>/100</span></div>
            <div className="kpi-foot">{conNivel.length} conductor(es) con lecturas</div>
          </div>
        </div>
        <div className="card">
          <p className="kpi-title">Alertas sin leer</p>
          <div className="kpi-val" style={{ color: noLeidas ? 'var(--danger)' : 'var(--text)' }}>{noLeidas}</div>
          <div className="kpi-foot">
            <span className="dot" style={{ background: 'var(--danger)' }} />{graves} graves ·{' '}
            <span className="dot" style={{ background: 'var(--warn)' }} />{noLeidas - graves} otras
          </div>
        </div>
        <div className="card">
          <p className="kpi-title">Recorridos en curso</p>
          <div className="kpi-val">
            {enCurso === null ? '—' : enCurso}
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>{d ? `/${d.recorridos.length}` : ''}</span>
          </div>
          <div className="kpi-foot">entre los últimos {d ? d.recorridos.length : 100} recorridos</div>
        </div>
        <div className="card">
          <p className="kpi-title">Incidentes del periodo</p>
          <div className="kpi-val">{d ? d.incidentes.length : '—'}</div>
          <div className="kpi-foot">
            {topTipos.length === 0 ? 'Sin incidentes en el periodo' : topTipos.map(([t, n]) => `${etiquetaTipo(t)} ${n}`).join(' · ')}
          </div>
        </div>
      </section>

      <section className="grid">
        <div className="panel">
          <div className="panel-head">
            <h2>Dónde ocurrieron los incidentes</h2>
            <button type="button" className="chip" onClick={() => onIrA('mapa')}>Ver mapa completo</button>
          </div>
          {mapa.error && <div className="errorbox" role="alert">{mapa.error}</div>}
          <MapaIncidentes datos={mapa.datos} alto={330} conductores={conductores} />
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Alertas en tiempo real</h2>
            <button type="button" className="chip" onClick={() => onIrA('alertas')}>Ver todas</button>
          </div>
          <ListaAlertas conAcciones={false} />
        </div>
      </section>

      <section className="grid">
        <div className="panel">
          <div className="panel-head"><h2>Comparativo de nivel de seguridad por conductor</h2></div>
          {resumen.cargando && !d && <div className="empty">Cargando…</div>}
          {d && conNivel.length === 0 && <div className="empty">No hay lecturas de sensor en este periodo.</div>}
          {conNivel.map((c) => (
            <div className="drow" key={c.id}>
              <div className="dinit">{iniciales(c.nombre)}</div>
              <div>
                <div className="dname"><span>{c.nombre}</span><span className="muted">{c.total_incidentes} incidente(s)</span></div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${c.nivel_seguridad_promedio}%`, background: colorNivel(c.nivel_seguridad_promedio) }} />
                </div>
              </div>
              <div className="dscore" style={{ color: colorNivel(c.nivel_seguridad_promedio) }}>{c.nivel_seguridad_promedio}</div>
            </div>
          ))}
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Incidentes recientes</h2>
            <button type="button" className="chip" onClick={() => onIrA('historial')}>Ver historial</button>
          </div>
          <div className="tablewrap">
            <table>
              <thead><tr><th>Conductor</th><th>Tipo</th><th>Hora</th><th>Riesgo</th></tr></thead>
              <tbody>
                {d && d.incidentes.slice(0, 6).map((i) => {
                  const r = riesgoDe(i.nivel_riesgo)
                  return (
                    <tr className="tdata" key={i.id}>
                      <td>{i.conductor || '—'}</td>
                      <td>{etiquetaTipo(i.tipo)}</td>
                      <td className="mono">{formatearHora(i.fecha)}</td>
                      <td><span className={`badge ${r.badge}`}>{r.etiqueta}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {d && d.incidentes.length === 0 && <div className="empty">Sin incidentes en el periodo.</div>}
        </div>
      </section>
    </>
  )
}
