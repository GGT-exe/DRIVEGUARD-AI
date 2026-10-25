import { useEffect, useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import Camara from './camara' // el archivo se llama camara.jsx (en Linux importa la minúscula)
import Mapa from './Mapa'
import ComparacionSeguridad from './ComparacionSeguridad'
import NotificacionesAlertas from './NotificacionesAlertas'
import ErrorBoundary from './ErrorBoundary'
import ConfiguracionUmbrales from './ConfiguracionUmbrales'
import HistorialAuditoria from './HistorialAuditoria'
import Login from './Login'
import { cerrarSesion, esAdministrador, obtenerToken, obtenerUsuario } from './api'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [usuario, setUsuario] = useState(() => (obtenerToken() ? obtenerUsuario() : null))

  // Si el token vence (o se cierra la sesión), apiFetch avisa y se vuelve al login.
  useEffect(() => {
    const alCerrar = () => setUsuario(null)
    window.addEventListener('sesion-cerrada', alCerrar)
    return () => window.removeEventListener('sesion-cerrada', alCerrar)
  }, [])

  if (!usuario) return <Login onLogin={setUsuario} />

  return (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'flex-start', padding: '12px 16px', fontFamily: 'sans-serif', fontSize: 14 }}>
        <span>Sesión: <strong>{usuario.nombre}</strong> ({usuario.rol})</span>
        <button type="button" onClick={cerrarSesion}>Cerrar sesión</button>
      </div>
      <ErrorBoundary><Camara /></ErrorBoundary>
      <ErrorBoundary><Mapa /></ErrorBoundary>
      <ErrorBoundary><ComparacionSeguridad /></ErrorBoundary>
      <ErrorBoundary><ConfiguracionUmbrales /></ErrorBoundary>
      {esAdministrador(usuario) && <ErrorBoundary><HistorialAuditoria /></ErrorBoundary>}
      <NotificacionesAlertas />
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/App.jsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <button
          type="button"
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App