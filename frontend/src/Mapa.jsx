import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function Mapa() {
  // Coordenadas de ejemplo (luego las reemplazamos con datos reales del recorrido)
  const posicion = [4.7110, -74.0721]; // Bogotá, como ejemplo

  return (
    <div>
      <h2>Mapa de recorrido</h2>
      <MapContainer center={posicion} zoom={13} style={{ height: '400px', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <Marker position={posicion}>
          <Popup>Punto de prueba</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

export default Mapa;