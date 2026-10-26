import { useEffect, useMemo } from 'react'
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { RIESGO, etiquetaTipo, formatearFechaHora, riesgoDe } from './datos'

// Centro por defecto: Cúcuta, Norte de Santander (cuando todavía no hay datos).
const CENTRO = [7.8939, -72.5078]

function AjustarVista({ puntos }) {
  const mapa = useMap()
  const clave = puntos.map((p) => p.join(',')).join(';')
  useEffect(() => {
    if (puntos.length === 0) return
    if (puntos.length === 1) mapa.setView(puntos[0], 14)
    else mapa.fitBounds(puntos, { padding: [30, 30], maxZoom: 16 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, mapa])
  return null
}

// Mapa oscuro con la ruta de cada recorrido y los incidentes por nivel de riesgo.
// datos: salida de cargarDatosMapa(). riesgo: '' | 'alto' | 'medio' | 'bajo'.
// recorridoId: '' = todos.
export default function MapaIncidentes({ datos, riesgo = '', recorridoId = '', alto = 330, conductores = {} }) {
  const visibles = useMemo(
    () => (datos || []).filter((d) => !recorridoId || d.recorrido.id === recorridoId),
    [datos, recorridoId]
  )

  const incidentes = useMemo(
    () => visibles.flatMap((d) => d.incidentes).filter((i) => !riesgo || i.nivel_riesgo === riesgo),
    [visibles, riesgo]
  )
  const conUbicacion = incidentes.filter((i) => Number.isFinite(i.lat) && Number.isFinite(i.lng))
  const sinUbicacion = incidentes.length - conUbicacion.length

  const puntos = useMemo(
    () => [...visibles.flatMap((d) => d.ruta), ...conUbicacion.map((i) => [i.lat, i.lng])],
    [visibles, conUbicacion]
  )

  const nombreConductor = (recorrido) => conductores[recorrido.conductor_id] || 'Conductor sin nombre'

  return (
    <div className="mapbox" style={{ height: alto }}>
      <MapContainer center={CENTRO} zoom={12} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <AjustarVista puntos={puntos} />

        {visibles.map((d) =>
          d.ruta.length > 1 ? (
            <Polyline key={`ruta-${d.recorrido.id}`} positions={d.ruta} pathOptions={{ color: '#5b8bd6', weight: 3, opacity: 0.8 }} />
          ) : null
        )}

        {visibles
          .filter((d) => !d.recorrido.fecha_fin && d.ruta.length > 0)
          .map((d) => (
            <CircleMarker
              key={`curso-${d.recorrido.id}`}
              center={d.ruta[d.ruta.length - 1]}
              radius={7}
              pathOptions={{ color: '#0e1015', weight: 2, fillColor: '#5b8bd6', fillOpacity: 1 }}
            >
              <Popup>
                <b>Recorrido en curso</b><br />
                {nombreConductor(d.recorrido)}<br />
                Inicio: {formatearFechaHora(d.recorrido.fecha_inicio)}
              </Popup>
            </CircleMarker>
          ))}

        {conUbicacion.map((i) => {
          const r = riesgoDe(i.nivel_riesgo)
          return (
            <CircleMarker
              key={`inc-${i.id}`}
              center={[i.lat, i.lng]}
              radius={i.nivel_riesgo === 'alto' ? 10 : 8}
              pathOptions={{ color: '#0e1015', weight: 2, fillColor: r.color, fillOpacity: 0.95 }}
            >
              <Popup>
                <b>{etiquetaTipo(i.tipo)}</b><br />
                Riesgo: {r.etiqueta}<br />
                {formatearFechaHora(i.fecha)}<br />
                <span style={{ color: '#8b94a3' }}>{i.lat.toFixed(5)}, {i.lng.toFixed(5)}</span>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>

      <div className="map-legend">
        {['bajo', 'medio', 'alto'].map((k) => (
          <span key={k}><i style={{ background: RIESGO[k].color }} />{RIESGO[k].etiqueta}</span>
        ))}
        <span><i style={{ background: '#5b8bd6' }} />En curso</span>
      </div>

      {datos && conUbicacion.length === 0 && (
        <div className="map-empty">
          <span>
            {incidentes.length === 0
              ? 'No hay incidentes para mostrar en los recorridos recientes.'
              : `${incidentes.length} incidente(s) sin coordenadas GPS: no se pueden ubicar en el mapa.`}
          </span>
        </div>
      )}
      {sinUbicacion > 0 && conUbicacion.length > 0 && (
        <div className="map-empty" style={{ alignItems: 'flex-end', justifyContent: 'flex-start', padding: '10px 10px 34px' }}>
          <span>{sinUbicacion} incidente(s) sin coordenadas no aparecen en el mapa</span>
        </div>
      )}
    </div>
  )
}
