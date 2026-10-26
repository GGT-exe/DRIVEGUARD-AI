import { useEffect, useState } from 'react'
import Dashboard from './dashboard/Dashboard'
import Login from './Login'
import { obtenerToken, obtenerUsuario } from './api'

function App() {
  const [usuario, setUsuario] = useState(() => (obtenerToken() ? obtenerUsuario() : null))

  // Si el token vence (o se cierra la sesión), apiFetch avisa y se vuelve al login.
  useEffect(() => {
    const alCerrar = () => setUsuario(null)
    window.addEventListener('sesion-cerrada', alCerrar)
    return () => window.removeEventListener('sesion-cerrada', alCerrar)
  }, [])

  if (!usuario) return <Login onLogin={setUsuario} />
  return <Dashboard usuario={usuario} />
}

export default App
