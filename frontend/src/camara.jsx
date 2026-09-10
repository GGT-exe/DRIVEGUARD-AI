import { useRef, useEffect, useState } from 'react';

function Camara() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [imagenCapturada, setImagenCapturada] = useState(null);
  const [estadoEnvio, setEstadoEnvio] = useState('');

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        videoRef.current.srcObject = stream;
      })
      .catch(err => console.error('Error:', err));
  }, []);

  const capturarImagen = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/png');
    setImagenCapturada(dataUrl);
    localStorage.setItem('imagen_temporal', dataUrl);
  };

  const conectarConIncidente = async () => {
    if (!imagenCapturada) {
      setEstadoEnvio('Primero captura una imagen.');
      return;
    }

    try {
      setEstadoEnvio('Enviando...');

      const respuesta = await fetch('http://localhost:4000/incidentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagen: imagenCapturada,
          tipo: 'deteccion_camara',
          nivel_riesgo: 'medio'
        })
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(data.error || 'Error al guardar el incidente');
      }

      setEstadoEnvio(`Incidente guardado con id: ${data.id}`);
    } catch (error) {
      console.error(error);
      setEstadoEnvio('Error al conectar con el backend: ' + error.message);
    }
  };

  return (
    <div>
      <h2>Cámara</h2>
      <video ref={videoRef} autoPlay playsInline width="400"></video>
      <br />
      <button onClick={capturarImagen}>Capturar imagen</button>
      <button onClick={conectarConIncidente}>Conectar con incidente</button>

      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>

      {imagenCapturada && (
        <div>
          <h3>Imagen capturada:</h3>
          <img src={imagenCapturada} width="400" alt="Captura" />
        </div>
      )}

      {estadoEnvio && <p><strong>{estadoEnvio}</strong></p>}
    </div>
  );
}

export default Camara;