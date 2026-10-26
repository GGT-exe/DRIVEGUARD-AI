import { useNotificaciones } from '../contextoNotificaciones'
import ListaAlertas from '../ListaAlertas'

export default function VistaAlertas() {
  const { conectado, noLeidas, items } = useNotificaciones()
  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Alertas y notificaciones ({items.length})</h2>
        <span className="panel-note">
          {conectado ? 'Conectado en vivo' : 'Sin conexión: se reconecta solo'} · {noLeidas} sin leer
        </span>
      </div>
      <ListaAlertas max={560} />
    </div>
  )
}
