import { useRef, useEffect, useState } from 'react';

function Camara() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [imagenCapturada, setImagenCapturada] = useState(null);

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

    // Guardado temporal
    localStorage.setItem('imagen_temporal', dataUrl);
  };

  return (
    <div>
      <h2>Cámara</h2>
      <video ref={videoRef} autoPlay playsInline width="400"></video>
      <br />
      <button onClick={capturarImagen}>Capturar imagen</button>

      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>

      {imagenCapturada && (
        <div>
          <h3>Imagen capturada:</h3>
          <img src={imagenCapturada} width="400" alt="Captura" />
        </div>
      )}
    </div>
  );
}

export default Camara;