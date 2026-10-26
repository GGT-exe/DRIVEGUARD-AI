import { useState } from 'react'
import { API_URL, guardarSesion } from './api'
import './dashboard/dashboard.css'

// Historia 18 — pantalla de inicio de sesión del dashboard.
// Sin ella el navegador no tiene token y todas las rutas protegidas responden 401.

function Login({ onLogin }) {
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async (evento) => {
    evento.preventDefault()
    setError('')
    setEnviando(true)

    try {
      const respuesta = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: correo.trim(), contrasena }),
      })
      const datos = await respuesta.json().catch(() => ({}))

      if (!respuesta.ok) {
        throw new Error(
          respuesta.status === 401
            ? 'Correo o contraseña incorrectos.'
            : datos.error || 'No se pudo iniciar sesión.'
        )
      }

      guardarSesion(datos.token, datos.usuario)
      onLogin(datos.usuario)
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'No se pudo conectar con el servidor. Si lleva un rato sin usarse puede tardar hasta un minuto en despertar: vuelve a intentarlo.'
          : err.message
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="login-page">
      <form onSubmit={enviar} className="login-card" aria-label="Inicio de sesión">
        <div className="brand">
          <div className="brand-mark" />
          <div><b>DriveGuard-AI</b><span>Seguridad vial de flota</span></div>
        </div>
        <h1>Iniciar sesión</h1>
        <p className="lead">Accede al panel de monitoreo de la flota.</p>

        <label htmlFor="login-correo">Correo</label>
        <input
          id="login-correo"
          className="input wide"
          type="email"
          autoComplete="username"
          required
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
        />

        <label htmlFor="login-contrasena">Contraseña</label>
        <input
          id="login-contrasena"
          className="input wide"
          type="password"
          autoComplete="current-password"
          required
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
        />

        {error && <p role="alert" className="errorbox" style={{ margin: '12px 0 0' }}>{error}</p>}

        <button type="submit" className="btn" disabled={enviando}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </main>
  )
}

export default Login
