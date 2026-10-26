import { useState } from 'react'
import { useNotificaciones } from './contextoNotificaciones'
import { ETIQUETA_SEVERIDAD, formatearHora } from './datos'

const FILTROS = [
  { id: 'todas', etiqueta: 'Todas' },
  { id: 'grave', etiqueta: 'Graves' },
  { id: 'moderado', etiqueta: 'Mod.' },
  { id: 'leve', etiqueta: 'Leves' },
]

// Lista de alertas y notificaciones (alertas en tiempo real del diseño).
// `conFiltros` muestra los chips de severidad; `conAcciones` los botones de la cabecera.
export default function ListaAlertas({ conFiltros = true, conAcciones = true, max = 330 }) {
  const { items, aviso, noLeidas, marcarLeida, marcarTodas, limpiarEnVivo } = useNotificaciones()
  const [filtro, setFiltro] = useState('todas')
  const visibles = items.filter((i) => filtro === 'todas' || i.severidad === filtro)
  const hayEnVivo = items.some((i) => i.origen === 'en_vivo')

  return (
    <>
      {(conFiltros || conAcciones) && (
        <div className="alerts-tools">
          {conFiltros && (
            <div className="chips">
              {FILTROS.map((f) => (
                <button key={f.id} type="button" className={`chip ${filtro === f.id ? 'active' : ''}`} onClick={() => setFiltro(f.id)}>
                  {f.etiqueta}
                </button>
              ))}
            </div>
          )}
          {conAcciones && (
            <div className="chips" style={{ marginLeft: 'auto' }}>
              <button type="button" className="btn small secondary" onClick={marcarTodas} disabled={noLeidas === 0}>
                Marcar como leídas
              </button>
              <button type="button" className="btn small secondary" onClick={limpiarEnVivo} disabled={!hayEnVivo}>
                Limpiar alertas en vivo
              </button>
            </div>
          )}
        </div>
      )}

      {aviso && <div className="errorbox" role="alert">{aviso}</div>}

      <div className="alerts" style={{ maxHeight: max }}>
        {visibles.length === 0 ? (
          <div className="empty">Sin alertas por ahora.</div>
        ) : (
          visibles.map((item) => (
            <div
              key={item.clave}
              className={`alert ${item.leida ? '' : 'unread'}`}
              onClick={() => marcarLeida(item)}
              title={item.leida ? undefined : 'Clic para marcar como leída'}
            >
              <span className={`sev ${item.severidad}`} />
              <div className="alert-body">
                <div className="alert-row1">
                  <b>{item.titulo}</b>
                  <span className="alert-time">{formatearHora(item.cuando)}</span>
                </div>
                <div className="alert-sub">{ETIQUETA_SEVERIDAD[item.severidad]} · {item.mensaje}</div>
                {item.detalle && <div className="alert-sub">{item.detalle}</div>}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}
