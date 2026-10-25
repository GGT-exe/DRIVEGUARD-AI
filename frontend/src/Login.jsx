import { useState } from 'react'
import { API_URL, guardarSesion } from './api'

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
    <main style={estilos.pagina}>
      <form onSubmit={enviar} style={estilos.tarjeta} aria-label="Inicio de sesión">
        <h1 style={estilos.titulo}>DriveGuard AI</h1>
        <p style={estilos.subtitulo}>Inicia sesión para ver el dashboard</p>

        <label style={estilos.etiqueta} htmlFor="login-correo">Correo</label>
        <input
          id="login-correo"
          type="email"
          autoComplete="username"
          required
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          style={estilos.campo}
        />

        <label style={estilos.etiqueta} htmlFor="login-contrasena">Contraseña</label>
        <input
          id="login-contrasena"
          type="password"
          autoComplete="current-password"
          required
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          style={estilos.campo}
        />

        {error && <p role="alert" style={estilos.error}>{error}</p>}

        <button type="submit" disabled={enviando} style={estilos.boton}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </main>
  )
}

const estilos = {
  pagina: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'sans-serif' },
  tarjeta: { width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 6, padding: 24, borderRadius: 12, border: '1px solid #d1d5db', background: '#fff', color: '#111827', textAlign: 'left' },
  titulo: { margin: 0, fontSize: 24 },
  subtitulo: { margin: '0 0 12px', color: '#6b7280', fontSize: 14 },
  etiqueta: { fontSize: 13, fontWeight: 600, marginTop: 8 },
  campo: { padding: '9px 10px', borderRadius: 6, border: '1px solid #9ca3af', fontSize: 15 },
  error: { margin: '8px 0 0', padding: '8px 10px', borderRadius: 6, background: '#fef2f2', color: '#991b1b', fontSize: 13 },
  boton: { marginTop: 14, padding: '10px 12px', borderRadius: 6, border: 'none', background: '#1f2937', color: '#fff', fontSize: 15, cursor: 'pointer' },
}

export default Login
