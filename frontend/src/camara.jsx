import { useRef, useEffect } from 'react';

function Camara() {
  const videoRef = useRef(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        videoRef.current.srcObject = stream;
      })
      .catch(err => console.error('Error:', err));
  }, []);

  return (
    <div>
      <h2>Cámara</h2>
      <video ref={videoRef} autoPlay playsInline width="400"></video>
    </div>
  );
}

export default Camara;