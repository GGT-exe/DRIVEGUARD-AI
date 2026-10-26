import { useEffect, useState } from 'react'
import { cerrarSesion } from '../api'
import ErrorBoundary from '../ErrorBoundary'
import ConfiguracionUmbrales from '../ConfiguracionUmbrales'
import HistorialAuditoria from '../HistorialAuditoria'
import './dashboard.css'
import Icono from './iconos'
import ListaAlertas from './ListaAlertas'
import ProveedorNotificaciones from './ProveedorNotificaciones'
import { useNotificaciones } from './contextoNotificaciones'
import { RANGOS, iniciales } from './datos'
import { ETIQUETA_ROL, pestanasPara, rolDe } from './roles'
import VistaAlertas from './vistas/VistaAlertas'
import VistaCamara from './vistas/VistaCamara'
import VistaComparativo from './vistas/VistaComparativo'
import VistaHistorial from './vistas/VistaHistorial'
import VistaInicio from './vistas/VistaInicio'
import VistaMapa from './vistas/VistaMapa'
import VistaReportes from './vistas/VistaReportes'
import VistaUsuarios from './vistas/VistaUsuarios'

function pestanaInicial(permitidas) {
  const deHash = window.location.hash.replace('#', '')
  return permitidas.some((p) => p.id === deHash) ? deHash : 'inicio'
}

function Campana() {
  const { noLeidas } = useNotificaciones()
  const [abierta, setAbierta] = useState(false)
  return (
    <div className="bell-wrap">
      <button type="button" className="bell" aria-label="Centro de notificaciones" aria-expanded={abierta} onClick={() => setAbierta((v) => !v)}>
        <Icono nombre="alerta" tam={18} />
        {noLeidas > 0 && <span className="count">{noLeidas}</span>}
      </button>
      {abierta && (
        <div className="bell-panel" role="dialog" aria-label="Notificaciones">
          <div className="panel-head"><h2>Notificaciones</h2><span className="panel-note">{noLeidas} sin leer</span></div>
          <ListaAlertas conFiltros={false} max={380} />
        </div>
      )}
    </div>
  )
}

function Contenido({ usuario }) {
  const permitidas = pestanasPara(usuario)
  const [actual, setActual] = useState(() => pestanaInicial(permitidas))
  const [rango, setRango] = useState('hoy')
  const { conectado, noLeidas } = useNotificaciones()

  const pestana = permitidas.find((p) => p.id === actual) || permitidas[0]

  const ir = (id) => {
    setActual(id)
    window.location.hash = id
    window.scrollTo({ top: 0 })
  }

  useEffect(() => {
    const alCambiarHash = () => setActual(pestanaInicial(permitidas))
    window.addEventListener('hashchange', alCambiarHash)
    return () => window.removeEventListener('hashchange', alCambiarHash)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario])

  const vista = {
    inicio: <VistaInicio rango={rango} onIrA={ir} />,
    camara: <VistaCamara />,
    mapa: <VistaMapa />,
    alertas: <VistaAlertas />,
    historial: <VistaHistorial />,
    comparativo: <VistaComparativo />,
    reportes: <VistaReportes usuario={usuario} />,
    umbrales: <ConfiguracionUmbrales />,
    auditoria: <HistorialAuditoria />,
    usuarios: <VistaUsuarios />,
  }[pestana.id]

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <div className="brand-mark" />
          <div><b>DriveGuard-AI</b><span>Norte de Santander, CO</span></div>
        </div>

        <nav className="nav" aria-label="Secciones">
          {permitidas.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`navlink ${p.id === pestana.id ? 'active' : ''}`}
              aria-current={p.id === pestana.id ? 'page' : undefined}
              onClick={() => ir(p.id)}
            >
              <Icono nombre={p.icono} />
              <span className="lbl">{p.etiqueta}</span>
              {p.id === 'alertas' && noLeidas > 0 && <span className="badge-n">{noLeidas}</span>}
            </button>
          ))}
        </nav>

        <div className="side-foot">
          <div className="user">
            <div className="avatar">{iniciales(usuario.nombre)}</div>
            <div className="user-meta">
              <b>{usuario.nombre}</b>
              <span>{ETIQUETA_ROL[rolDe(usuario)]}</span>
            </div>
          </div>
          <button type="button" className="navlink logout" onClick={cerrarSesion}>
            <Icono nombre="salir" />
            <span className="lbl">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <main className="content">
        <div className="topbar">
          <div>
            <h1>{pestana.titulo}</h1>
            <div className="sub">
              {pestana.id === 'inicio' ? (
                <>
                  <span className={`live-dot ${conectado ? '' : 'off'}`} />
                  {conectado ? 'Alertas en vivo conectadas' : 'Sin conexión en vivo (se reconecta solo)'}
                </>
              ) : (
                pestana.sub
              )}
            </div>
          </div>
          <div className="topbar-right">
            {pestana.id === 'inicio' && (
              <div className="range" role="group" aria-label="Periodo">
                {RANGOS.map((r) => (
                  <button key={r.id} type="button" className={rango === r.id ? 'active' : ''} onClick={() => setRango(r.id)}>
                    {r.etiqueta}
                  </button>
                ))}
              </div>
            )}
            <Campana />
          </div>
        </div>

        <ErrorBoundary key={pestana.id}>{vista}</ErrorBoundary>
      </main>
    </div>
  )
}

export default function Dashboard({ usuario }) {
  return (
    <ProveedorNotificaciones>
      <Contenido usuario={usuario} />
    </ProveedorNotificaciones>
  )
}
