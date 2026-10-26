import { useEffect, useState } from 'react'
import { apiFetch } from './api'

// Historia 23 — historial de auditoría (solo administrador).
// Filtros por usuario, acción y rango de fechas; resultados paginados.

const ACCIONES = [
  { valor: 'login', texto: 'Inicio de sesión' },
  { valor: 'login_fallido', texto: 'Inicio de sesión fallido' },
  { valor: 'registro_usuario', texto: 'Registro de usuario' },
  { valor: 'cambio_configuracion', texto: 'Cambio de configuración' },
  { valor: 'exportar_reporte', texto: 'Exportación de reporte' },
  { valor: 'generar_reportes', texto: 'Generación de reportes' },
]

const TEXTO_ACCION = Object.fromEntries(ACCIONES.map((a) => [a.valor, a.texto]))
const LIMITE = 20
const FILTROS_VACIOS = { usuario_id: '', accion: '', desde: '', hasta: '' }

function HistorialAuditoria() {
  const [usuarios, setUsuarios] = useState([])
  const [formulario, setFormulario] = useState(FILTROS_VACIOS)
  const [aplicados, setAplicados] = useState(FILTROS_VACIOS)
  const [pagina, setPagina] = useState(1)
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let activo = true
    apiFetch('/usuarios')
      .then((r) => (r.ok ? r.json() : []))
      .then((lista) => { if (activo) setUsuarios(lista) })
      .catch(() => {})
    return () => { activo = false }
  }, [])

  useEffect(() => {
    let activo = true
    const params = new URLSearchParams({ pagina: String(pagina), limite: String(LIMITE) })
    Object.entries(aplicados).forEach(([clave, valor]) => { if (valor) params.append(clave, valor) })

    apiFetch(`/auditoria?${params.toString()}`)
      .then(async (r) => {
        const json = await r.json().catch(() => ({}))
        if (!r.ok) {
          throw new Error(
            r.status === 403
              ? 'Solo el administrador puede ver el historial de auditoría.'
              : json.error || 'No se pudo cargar el historial.'
          )
        }
        return json
      })
      .then((json) => {
        if (!activo) return
        setDatos(json)
        setError('')
      })
      .catch((err) => {
        if (!activo) return
        setDatos(null)
        setError(err instanceof TypeError ? 'No se pudo conectar con el servidor.' : err.message)
      })
      .finally(() => { if (activo) setCargando(false) })

    return () => { activo = false }
  }, [aplicados, pagina])

  const cambiar = (campo) => (e) => setFormulario((f) => ({ ...f, [campo]: e.target.value }))

  const buscar = (e) => {
    e.preventDefault()
    if (formulario.desde && formulario.hasta && formulario.desde > formulario.hasta) {
      setError('La fecha "desde" no puede ser posterior a "hasta".')
      return
    }
    setCargando(true)
    setPagina(1)
    setAplicados(formulario)
  }

  const limpiar = () => {
    setCargando(true)
    setFormulario(FILTROS_VACIOS)
    setPagina(1)
    setAplicados(FILTROS_VACIOS)
  }

  const irAPagina = (n) => {
    setCargando(true)
    setPagina(n)
  }

  return (
    <section className="panel" aria-label="Historial de auditoría">
      <div className="panel-head">
        <h2>Historial de auditoría</h2>
        {datos && datos.resultados.length > 0 && (
          <span className="panel-note">
            {datos.total} registro{datos.total === 1 ? '' : 's'} · página {datos.pagina} de {datos.total_paginas}
          </span>
        )}
      </div>

      <form onSubmit={buscar} className="filters pad" style={{ marginBottom: 0 }}>
        <label className="field">
          Usuario
          <select className="select" value={formulario.usuario_id} onChange={cambiar('usuario_id')}>
            <option value="">Todos</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>{u.nombre} ({u.correo})</option>
            ))}
          </select>
        </label>

        <label className="field">
          Acción
          <select className="select" value={formulario.accion} onChange={cambiar('accion')}>
            <option value="">Todas</option>
            {ACCIONES.map((a) => (
              <option key={a.valor} value={a.valor}>{a.texto}</option>
            ))}
          </select>
        </label>

        <label className="field">
          Desde
          <input className="input" type="date" value={formulario.desde} onChange={cambiar('desde')} />
        </label>

        <label className="field">
          Hasta
          <input className="input" type="date" value={formulario.hasta} onChange={cambiar('hasta')} />
        </label>

        <button type="submit" className="btn" disabled={cargando}>Buscar</button>
        <button type="button" className="btn secondary" onClick={limpiar} disabled={cargando}>Limpiar filtros</button>
      </form>

      {error && <p role="alert" className="errorbox">{error}</p>}
      {cargando && !error && <div className="empty">Cargando historial…</div>}

      {!cargando && !error && datos && datos.resultados.length === 0 && (
        <div className="empty">No hay registros para los filtros elegidos.</div>
      )}

      {datos && datos.resultados.length > 0 && (
        <>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Usuario</th>
                  <th>Acción</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {datos.resultados.map((fila) => (
                  <tr className="tdata" key={fila.id}>
                    <td className="mono">{fila.fecha ? new Date(fila.fecha).toLocaleString('es-CO') : '—'}</td>
                    <td>{fila.usuario ? `${fila.usuario.nombre} (${fila.usuario.correo})` : 'Sin usuario identificado'}</td>
                    <td>{TEXTO_ACCION[fila.accion] || fila.accion}</td>
                    <td>{fila.detalle || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pager">
            <span className="info">{datos.total} registro{datos.total === 1 ? '' : 's'} · página {datos.pagina} de {datos.total_paginas}</span>
            <button type="button" className="btn small secondary" onClick={() => irAPagina(pagina - 1)} disabled={cargando || pagina <= 1}>
              Anterior
            </button>
            <button type="button" className="btn small secondary" onClick={() => irAPagina(pagina + 1)} disabled={cargando || pagina >= datos.total_paginas}>
              Siguiente
            </button>
          </div>
        </>
      )}
    </section>
  )
}

export default HistorialAuditoria
