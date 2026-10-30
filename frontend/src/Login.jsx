import { useState } from 'react'
import { API_URL, guardarSesion } from './api'
import './dashboard/dashboard.css'
import { Eslogan, Imagotipo } from './marca/Marca'

// Historia 18 — pantalla de inicio de sesión del dashboard.
// Sin ella el navegador no tiene token y todas las rutas protegidas responden 401.

function Login({ onLogin }) {
  const [modo, setModo] = useState('login')
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async (evento) => {
    evento.preventDefault()
    setError('')
    setExito('')
    setEnviando(true)

    try {
      if (modo === 'registro') {
        if (contrasena !== confirmacion) {
          throw new Error('Las contraseñas no coinciden.')
        }

        const respuesta = await fetch(`${API_URL}/registro`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: nombre.trim(),
            correo: correo.trim(),
            contrasena,
          }),
        })
        const datos = await respuesta.json().catch(() => ({}))

        if (!respuesta.ok) {
          throw new Error(datos.error || 'No se pudo crear la cuenta.')
        }

        setModo('login')
        setContrasena('')
        setConfirmacion('')
        setExito('Cuenta creada. Ahora inicia sesión con tus datos.')
        return
      }

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
        <div className="brand login-brand">
          <Imagotipo alto={44} className="brand-full" />
          <Eslogan className="brand-slogan" />
        </div>
        <h1>Iniciar sesión</h1>
        <p className="lead">
          {modo === 'registro'
            ? 'Crea una cuenta de usuario para acceder al panel.'
            : 'Accede al panel de monitoreo de la flota.'}
        </p>

        {modo === 'registro' && (
          <>
            <label htmlFor="registro-nombre">Nombre</label>
            <input
              id="registro-nombre"
              className="input wide"
              type="text"
              autoComplete="name"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </>
        )}

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
          autoComplete={modo === 'registro' ? 'new-password' : 'current-password'}
          required
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
        />

        {modo === 'registro' && (
          <>
            <label htmlFor="registro-confirmacion">Confirmar contraseña</label>
            <input
              id="registro-confirmacion"
              className="input wide"
              type="password"
              autoComplete="new-password"
              required
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
            />
          </>
        )}

        {exito && <p role="status" className="successbox" style={{ margin: '12px 0 0' }}>{exito}</p>}
        {error && <p role="alert" className="errorbox" style={{ margin: '12px 0 0' }}>{error}</p>}

        <button type="submit" className="btn" disabled={enviando}>
          {enviando ? (modo === 'registro' ? 'Creando cuenta…' : 'Ingresando…') : modo === 'registro' ? 'Crear cuenta' : 'Ingresar'}
        </button>
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            setModo(modo === 'registro' ? 'login' : 'registro')
            setError('')
            setExito('')
          }}
        >
          {modo === 'registro' ? 'Ya tengo una cuenta' : 'Crear una cuenta nueva'}
        </button>
      </form>
    </main>
  )
}

export default Login
