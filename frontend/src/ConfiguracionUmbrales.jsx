import { useEffect, useState } from 'react'

// US-22: pantalla de configuracion de umbrales y parametros de seguridad.
// Contrato esperado del backend: GET/PUT /configuracion (solo administrador).
const API_URL = import.meta.env.VITE_API_URL || 'https://driveguard-ai-1yop.onrender.com'

const DEFAULTS = {
  nivel_seguridad_bajo: 50,
  incidentes_repetidos: 3,
  frenada_brusca: -3,
  frenada_grave: -5,
}

const CAMPOS = [
  {
    clave: 'nivel_seguridad_bajo',
    etiqueta: 'Nivel de seguridad bajo',
    ayuda: 'Por debajo de este puntaje (0 a 100) se genera una alerta.',
    min: 0,
    max: 100,
    entero: true,
  },
  {
    clave: 'incidentes_repetidos',
    etiqueta: 'Incidentes repetidos',
    ayuda: 'Cantidad de incidentes que dispara una notificación (1 a 50).',
    min: 1,
    max: 50,
    entero: true,
  },
  {
    clave: 'frenada_brusca',
    etiqueta: 'Frenada brusca (m/s²)',
    ayuda: 'Aceleración desde la cual se registra una frenada brusca (-10 a -0.5).',
    min: -10,
    max: -0.5,
    entero: false,
  },
  {
    clave: 'frenada_grave',
    etiqueta: 'Frenada grave (m/s²)',
    ayuda: 'Debe ser menor que la frenada brusca (-20 a -1).',
    min: -20,
    max: -1,
    entero: false,
  },
]

function textos(obj) {
  const salida = {}
  CAMPOS.forEach((c) => {
    salida[c.clave] = String(obj[c.clave])
  })
  return salida
}

function aNumero(texto) {
  const t = String(texto).trim().replace(',', '.')
  if (t === '') return NaN
  return Number(t)
}

function validar(valores) {
  const errores = {}
  CAMPOS.forEach((c) => {
    const n = aNumero(valores[c.clave])
    if (Number.isNaN(n)) {
      errores[c.clave] = 'Ingresa un número válido.'
    } else if (c.entero && !Number.isInteger(n)) {
      errores[c.clave] = 'Debe ser un número entero.'
    } else if (n < c.min || n > c.max) {
      errores[c.clave] = `Debe estar entre ${c.min} y ${c.max}.`
    }
  })
  if (!errores.frenada_brusca && !errores.frenada_grave) {
    if (aNumero(valores.frenada_grave) >= aNumero(valores.frenada_brusca)) {
      errores.frenada_grave = 'Debe ser menor que la frenada brusca.'
    }
  }
  return errores
}

function cabeceras() {
  let token = null
  try {
    token = localStorage.getItem('token')
  } catch {
    token = null
  }
  const h = { 'Content-Type': 'application/json' }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

const COLOR_AVISO = {
  error: { fondo: '#fef2f2', borde: '#fca5a5', texto: '#991b1b' },
  info: { fondo: '#eff6ff', borde: '#93c5fd', texto: '#1e3a8a' },
  ok: { fondo: '#f0fdf4', borde: '#86efac', texto: '#166534' },
}

function ConfiguracionUmbrales() {
  const [valores, setValores] = useState(textos(DEFAULTS))
  const [errores, setErrores] = useState({})
  const [aviso, setAviso] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    let activo = true
    async function cargar() {
      try {
        const r = await fetch(`${API_URL}/configuracion`, { headers: cabeceras() })
        if (!activo) return
        if (r.ok) {
          const d = await r.json()
          setValores(textos({ ...DEFAULTS, ...d }))
        } else if (r.status === 401 || r.status === 403) {
          setAviso({ tipo: 'error', texto: 'No se pudo cargar: se necesita una sesión de administrador.' })
        } else {
          setAviso({ tipo: 'info', texto: 'El servidor aún no ofrece la configuración. Se muestran los valores por defecto.' })
        }
      } catch {
        if (activo) setAviso({ tipo: 'error', texto: 'No se pudo conectar con el servidor.' })
      } finally {
        if (activo) setCargando(false)
      }
    }
    cargar()
    return () => {
      activo = false
    }
  }, [])

  const cambiar = (clave, valor) => {
    const siguiente = { ...valores, [clave]: valor }
    setValores(siguiente)
    setErrores(validar(siguiente))
    setAviso(null)
  }

  const restablecer = () => {
    setValores(textos(DEFAULTS))
    setErrores({})
    setAviso(null)
  }

  const guardar = async (e) => {
    e.preventDefault()
    const err = validar(valores)
    setErrores(err)
    if (Object.keys(err).length > 0) {
      setAviso({ tipo: 'error', texto: 'Corrige los campos marcados antes de guardar.' })
      return
    }
    const cuerpo = {}
    CAMPOS.forEach((c) => {
      cuerpo[c.clave] = aNumero(valores[c.clave])
    })
    setGuardando(true)
    try {
      const r = await fetch(`${API_URL}/configuracion`, {
        method: 'PUT',
        headers: cabeceras(),
        body: JSON.stringify(cuerpo),
      })
      if (r.ok) {
        const d = await r.json().catch(() => null)
        if (d) setValores(textos({ ...DEFAULTS, ...d }))
        setAviso({ tipo: 'ok', texto: 'Configuración guardada.' })
      } else if (r.status === 400) {
        const d = await r.json().catch(() => null)
        setAviso({ tipo: 'error', texto: (d && d.error) || 'El servidor rechazó los valores.' })
      } else if (r.status === 401 || r.status === 403) {
        setAviso({ tipo: 'error', texto: 'No tienes permiso para guardar: se necesita ser administrador.' })
      } else if (r.status === 404) {
        setAviso({ tipo: 'info', texto: 'El servidor aún no tiene el endpoint de configuración (pendiente).' })
      } else {
        setAviso({ tipo: 'error', texto: 'No se pudo guardar. Intenta de nuevo.' })
      }
    } catch {
      setAviso({ tipo: 'error', texto: 'No se pudo conectar con el servidor.' })
    } finally {
      setGuardando(false)
    }
  }

  const hayErrores = Object.keys(errores).length > 0

  return (
    <section
      style={{
        maxWidth: 620,
        margin: '24px auto',
        padding: 24,
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        textAlign: 'left',
      }}
    >
      <h2 style={{ marginTop: 0 }}>Configuración de umbrales</h2>
      <p style={{ color: '#6b7280', marginTop: 0 }}>
        Define a partir de qué valores el sistema genera alertas y notificaciones.
      </p>

      <form onSubmit={guardar} noValidate>
        {CAMPOS.map((c) => (
          <div key={c.clave} style={{ marginBottom: 14 }}>
            <label htmlFor={c.clave} style={{ display: 'block', fontWeight: 600 }}>
              {c.etiqueta}
            </label>
            <input
              id={c.clave}
              type="text"
              inputMode="decimal"
              value={valores[c.clave]}
              onChange={(e) => cambiar(c.clave, e.target.value)}
              aria-invalid={errores[c.clave] ? 'true' : 'false'}
              aria-describedby={`${c.clave}-ayuda`}
              disabled={cargando}
              style={{
                width: 140,
                padding: '6px 8px',
                marginTop: 4,
                border: `1px solid ${errores[c.clave] ? '#dc2626' : '#9ca3af'}`,
                borderRadius: 6,
              }}
            />
            <div
              id={`${c.clave}-ayuda`}
              style={{ fontSize: 13, color: errores[c.clave] ? '#dc2626' : '#6b7280', marginTop: 2 }}
            >
              {errores[c.clave] || c.ayuda}
            </div>
          </div>
        ))}

        {aviso && (
          <div
            role="status"
            style={{
              margin: '12px 0',
              padding: '8px 12px',
              borderRadius: 6,
              border: `1px solid ${COLOR_AVISO[aviso.tipo].borde}`,
              background: COLOR_AVISO[aviso.tipo].fondo,
              color: COLOR_AVISO[aviso.tipo].texto,
            }}
          >
            {aviso.texto}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={guardando || cargando || hayErrores}>
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button type="button" onClick={restablecer} disabled={guardando}>
            Restablecer valores por defecto
          </button>
        </div>
      </form>
    </section>
  )
}

export default ConfiguracionUmbrales