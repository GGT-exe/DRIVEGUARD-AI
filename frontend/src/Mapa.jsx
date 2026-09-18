import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const RECORRIDO_ID = 'd982b26e-5a7f-4238-9b4e-2d0ec08e2257'; // por ahora fijo, luego se puede hacer dinámico

function Mapa() {
  const [puntos, setPuntos] = useState([]);

  useEffect(() => {
    fetch(`http://localhost:4000/recorridos/${RECORRIDO_ID}/gps`)
      .then(res => res.json())
      .then(data => setPuntos(data))
      .catch(err => console.error('Error cargando GPS:', err));
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
          <Marker key={i} position={[p.lat, p.lng]}>
            <Popup>{new Date(p.timestamp).toLocaleString()}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default Mapa;