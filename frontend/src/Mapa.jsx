import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const RECORRIDO_ID = 'd982b26e-5a7f-4238-9b4e-2d0ec08e2257'; // por ahora fijo, luego se puede hacer dinámico

// Ícono de color según nivel de severidad del incidente
function iconoPorNivel(nivel) {
  const colores = {
    alto: 'red',
    medio: 'orange',
    bajo: 'green',
  };
  const color = colores[nivel] || 'gray';

  return L.divIcon({
    className: 'marcador-incidente',
    html: '<div style="background-color: ' + color + '; width: 18px; height: 18px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 3px rgba(0,0,0,0.5);"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function Mapa() {
  const [puntos, setPuntos] = useState([]);
  const [incidentes, setIncidentes] = useState([]);

  useEffect(() => {
    fetch(`http://localhost:4000/recorridos/${RECORRIDO_ID}/gps`)
      .then(res => res.json())
      .then(data => setPuntos(data))
      .catch(err => console.error('Error cargando GPS:', err));
  }, []);

  useEffect(() => {
    fetch(`http://localhost:4000/recorridos/${RECORRIDO_ID}/incidentes-mapa`)
      .then(res => res.json())
      .then(data => {
        console.log('Incidentes recibidos:', data.length, data);
        setIncidentes(data);
      })
      .catch(err => console.error('Error cargando incidentes:', err));
  }, []);

  if (puntos.length === 0) {
    return (
      <div>
        <h2>Mapa de recorrido</h2>
        <p>Cargando puntos GPS o no hay datos para este recorrido...</p>
      </div>
    );
  }

  const posicionInicial = [puntos[0].lat, puntos[0].lng];
  const lineaRuta = puntos.map(p => [p.lat, p.lng]);

  return (
    <div>
      <h2>Mapa de recorrido</h2>
      <MapContainer center={posicionInicial} zoom={13} style={{ height: '400px', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <Polyline positions={lineaRuta} color="blue" />

        {puntos.map((p, i) => (
          <Marker key={`gps-${i}`} position={[p.lat, p.lng]}>
            <Popup>{new Date(p.timestamp).toLocaleString()}</Popup>
          </Marker>
        ))}

        {incidentes
          .filter(inc => inc.lat !== null && inc.lng !== null)
          .map((inc) => (
            <Marker
              key={`incidente-${inc.id}`}
              position={[inc.lat, inc.lng]}
              icon={iconoPorNivel(inc.nivel_riesgo)}
            >
              <Popup>
                <strong>{inc.tipo}</strong><br />
                Nivel de riesgo: {inc.nivel_riesgo}<br />
                {new Date(inc.fecha).toLocaleString()}
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}

export default Mapa;