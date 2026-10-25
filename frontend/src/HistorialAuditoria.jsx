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
    <section style={estilos.seccion} aria-label="Historial de auditoría">
      <h2>Historial de auditoría</h2>

      <form onSubmit={buscar} style={estilos.filtros}>
        <label style={estilos.etiqueta}>
          Usuario
          <select value={formulario.usuario_id} onChange={cambiar('usuario_id')} style={estilos.campo}>
            <option value="">Todos</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>{u.nombre} ({u.correo})</option>
            ))}
          </select>
        </label>

        <label style={estilos.etiqueta}>
          Acción
          <select value={formulario.accion} onChange={cambiar('accion')} style={estilos.campo}>
            <option value="">Todas</option>
            {ACCIONES.map((a) => (
              <option key={a.valor} value={a.valor}>{a.texto}</option>
            ))}
          </select>
        </label>

        <label style={estilos.etiqueta}>
          Desde
          <input type="date" value={formulario.desde} onChange={cambiar('desde')} style={estilos.campo} />
        </label>

        <label style={estilos.etiqueta}>
          Hasta
          <input type="date" value={formulario.hasta} onChange={cambiar('hasta')} style={estilos.campo} />
        </label>

        <div style={estilos.botones}>
          <button type="submit" disabled={cargando}>Buscar</button>
          <button type="button" onClick={limpiar} disabled={cargando}>Limpiar filtros</button>
        </div>
      </form>

      {error && <p role="alert" style={estilos.error}>{error}</p>}
      {cargando && !error && <p>Cargando historial…</p>}

      {!cargando && !error && datos && datos.resultados.length === 0 && (
        <p>No hay registros para los filtros elegidos.</p>
      )}

      {datos && datos.resultados.length > 0 && (
        <>
          <p style={estilos.resumen}>
            {datos.total} registro{datos.total === 1 ? '' : 's'} · página {datos.pagina} de {datos.total_paginas}
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={estilos.tabla}>
              <thead>
                <tr>
                  <th style={estilos.th}>Fecha</th>
                  <th style={estilos.th}>Usuario</th>
                  <th style={estilos.th}>Acción</th>
                  <th style={estilos.th}>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {datos.resultados.map((fila) => (
                  <tr key={fila.id}>
                    <td style={estilos.td}>{fila.fecha ? new Date(fila.fecha).toLocaleString('es-CO') : '—'}</td>
                    <td style={estilos.td}>
                      {fila.usuario ? `${fila.usuario.nombre} (${fila.usuario.correo})` : 'Sin usuario identificado'}
                    </td>
                    <td style={estilos.td}>{TEXTO_ACCION[fila.accion] || fila.accion}</td>
                    <td style={estilos.td}>{fila.detalle || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={estilos.paginacion}>
            <button type="button" onClick={() => irAPagina(pagina - 1)} disabled={cargando || pagina <= 1}>
              Anterior
            </button>
            <button type="button" onClick={() => irAPagina(pagina + 1)} disabled={cargando || pagina >= datos.total_paginas}>
              Siguiente
            </button>
          </div>
        </>
      )}
    </section>
  )
}

const estilos = {
  seccion: { margin: '24px auto', maxWidth: 1000, padding: 16, textAlign: 'left' },
  filtros: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', marginBottom: 12 },
  etiqueta: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600 },
  campo: { padding: '6px 8px', fontSize: 14 },
  botones: { display: 'flex', gap: 8 },
  error: { padding: '8px 10px', borderRadius: 6, background: '#fef2f2', color: '#991b1b' },
  resumen: { fontSize: 13, color: '#6b7280' },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #d1d5db', whiteSpace: 'nowrap' },
  td: { padding: '8px 10px', borderBottom: '1px solid #e5e7eb', verticalAlign: 'top' },
  paginacion: { display: 'flex', gap: 8, marginTop: 12 },
}

export default HistorialAuditoria
