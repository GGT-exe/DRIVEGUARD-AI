import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts'

// HU-16: Gráfico de comparación del nivel de seguridad entre conductores o vehículos
const API_URL = 'http://localhost:4000'

// Mismos umbrales que US-10 en el backend
const UMBRAL_NIVEL_BAJO = 50

function colorPorNivel(nivel) {
  if (nivel >= 80) return '#16a34a' // verde: seguro
  if (nivel >= UMBRAL_NIVEL_BAJO) return '#f59e0b' // amarillo: precaución
  return '#dc2626' // rojo: riesgo (por debajo del umbral de US-10)
}

function TooltipDetalle({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0].payload

  return (
    <div style={estilos.tooltip}>
      <strong>{d.nombre}</strong>
      {d.detalle && (
        <div>{[d.detalle.tipo, d.detalle.marca, d.detalle.modelo].filter(Boolean).join(' · ')}</div>
      )}
      <div>Nivel promedio: <b>{d.nivel_seguridad_promedio}</b> / 100</div>
      <div>Recorridos evaluados: {d.recorridos_evaluados} de {d.total_recorridos}</div>
      <div>Excesos de velocidad: {d.excesos_velocidad}</div>
      <div>Frenadas bruscas: {d.frenadas_bruscas}</div>
      <div>Incidentes: {d.total_incidentes}</div>
      <div>Recorridos anormales: {d.recorridos_anormales}</div>
    </div>
  )
}

function ComparacionSeguridad() {
  const [por, setPor] = useState('conductor')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [datos, setDatos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const consultar = async () => {
    setCargando(true)
    setError('')

    try {
      const params = new URLSearchParams({ por })
      if (fechaInicio) params.append('fecha_inicio', fechaInicio)
      if (fechaFin) params.append('fecha_fin', fechaFin)

      const respuesta = await fetch(`${API_URL}/comparacion/nivel-seguridad?${params.toString()}`)
      const json = await respuesta.json()

      if (!respuesta.ok) {
        throw new Error(json.error || 'Error al consultar la comparación')
      }

      setDatos(json.resultados)
    } catch (err) {
      setError(err.message)
      setDatos([])
    } finally {
      setCargando(false)
    }
  }

  // Consultar automáticamente al abrir la página y cuando cambia el agrupamiento
  useEffect(() => {
    consultar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [por])

  const conNivel = datos.filter(d => d.nivel_seguridad_promedio !== null)
  const sinLecturas = datos.filter(d => d.nivel_seguridad_promedio === null)

  return (
    <section style={estilos.contenedor}>
      <h2 style={estilos.titulo}>Comparación del nivel de seguridad</h2>

      {/* Filtros */}
      <div style={estilos.filtros}>
        <label style={estilos.campo}>
          Comparar por
          <select value={por} onChange={e => setPor(e.target.value)} style={estilos.input}>
            <option value="conductor">Conductor</option>
            <option value="vehiculo">Vehículo</option>
          </select>
        </label>

        <label style={estilos.campo}>
          Desde
          <input
            type="date"
            value={fechaInicio}
            onChange={e => setFechaInicio(e.target.value)}
            style={estilos.input}
          />
        </label>

        <label style={estilos.campo}>
          Hasta
          <input
            type="date"
            value={fechaFin}
            onChange={e => setFechaFin(e.target.value)}
            style={estilos.input}
          />
        </label>

        <button type="button" onClick={consultar} disabled={cargando} style={estilos.boton}>
          {cargando ? 'Consultando...' : 'Consultar'}
        </button>
      </div>

      {/* Mensajes de estado */}
      {error && <p style={estilos.error}>⚠️ {error}</p>}

      {!error && !cargando && datos.length === 0 && (
        <p style={estilos.aviso}>No hay recorridos en el rango seleccionado.</p>
      )}

      {/* Gráfico */}
      {conNivel.length > 0 && (
        <div style={{ width: '100%', height: 360 }}>
          <ResponsiveContainer>
            <BarChart data={conNivel} margin={{ top: 24, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nombre" />
              <YAxis domain={[0, 100]} />
              <Tooltip content={<TooltipDetalle />} />
              <ReferenceLine
                y={UMBRAL_NIVEL_BAJO}
                stroke="#dc2626"
                strokeDasharray="6 4"
                label={{ value: 'Umbral de riesgo (50)', position: 'insideTopRight', fill: '#dc2626', fontSize: 12 }}
              />
              <Bar dataKey="nivel_seguridad_promedio" name="Nivel promedio" minPointSize={4}>
                {conNivel.map(d => (
                  <Cell key={d.id} fill={colorPorNivel(d.nivel_seguridad_promedio)} />
                ))}
                <LabelList dataKey="nivel_seguridad_promedio" position="top" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Leyenda de colores */}
      {conNivel.length > 0 && (
        <div style={estilos.leyenda}>
          <span><span style={{ ...estilos.punto, background: '#16a34a' }} /> 80–100 seguro</span>
          <span><span style={{ ...estilos.punto, background: '#f59e0b' }} /> 50–79 precaución</span>
          <span><span style={{ ...estilos.punto, background: '#dc2626' }} /> 0–49 riesgo</span>
        </div>
      )}

      {sinLecturas.length > 0 && (
        <p style={estilos.aviso}>
          Sin lecturas de sensor (no se pueden calificar): {sinLecturas.map(d => d.nombre).join(', ')}
        </p>
      )}
    </section>
  )
}

const estilos = {
  contenedor: {
    maxWidth: 900,
    margin: '32px auto',
    padding: 20,
    border: '1px solid #d1d5db',
    borderRadius: 12,
    textAlign: 'left'
  },
  titulo: { marginTop: 0 },
  filtros: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'flex-end',
    marginBottom: 16
  },
  campo: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 },
  input: { padding: '6px 8px', borderRadius: 6, border: '1px solid #9ca3af' },
  boton: {
    padding: '8px 16px',
    borderRadius: 6,
    border: 'none',
    background: '#2563eb',
    color: 'white',
    cursor: 'pointer'
  },
  error: { color: '#dc2626' },
  aviso: { color: '#6b7280', fontSize: 14 },
  tooltip: {
    background: 'white',
    color: '#111827',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    lineHeight: 1.5
  },
  leyenda: { display: 'flex', gap: 16, fontSize: 13, marginTop: 8, flexWrap: 'wrap' },
  punto: {
    display: 'inline-block',
    width: 10,
    height: 10,
    borderRadius: '50%',
    marginRight: 4
  }
}

export default ComparacionSeguridad