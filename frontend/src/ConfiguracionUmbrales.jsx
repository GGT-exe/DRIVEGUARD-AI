import { useEffect, useState } from 'react'
import { apiFetch } from './api'

// US-22: pantalla de configuracion de umbrales y parametros de seguridad.
// Backend: GET /configuracion (lista de umbrales) y PUT /configuracion/:clave
// (solo rol administrador) con el cuerpo { valor }. Las peticiones usan apiFetch
// (api.js), que agrega el token de sesión.

// Reglas de validacion por umbral. El backend no valida rangos, por eso se hace aqui.
const REGLAS = {
  // Historia 21: umbrales que disparan notificaciones al gerente
  NIVEL_SEGURIDAD_BAJO: {
    etiqueta: 'Nivel de seguridad bajo',
    ayuda: 'Por debajo de este puntaje (0 a 100) se notifica al gerente.',
    min: 0,
    max: 100,
    entero: true,
  },
  INCIDENTES_REPETIDOS: {
    etiqueta: 'Incidentes repetidos',
    ayuda: 'Cantidad de incidentes en un recorrido que dispara una notificación (1 a 50).',
    min: 1,
    max: 50,
    entero: true,
  },
  MINUTOS_ENTRE_NOTIFICACIONES: {
    etiqueta: 'Minutos entre notificaciones iguales',
    ayuda: 'Evita repetir la misma notificación del mismo recorrido (1 a 1440).',
    min: 1,
    max: 1440,
    entero: true,
  },
  UMBRAL_FRENADA_BRUSCA: {
    etiqueta: 'Frenada brusca (m/s²)',
    ayuda: 'Aceleración desde la cual se considera frenada brusca (-10 a -0.5).',
    min: -10,
    max: -0.5,
  },
  UMBRAL_FRENADA_MEDIO: {
    etiqueta: 'Frenada de riesgo medio (m/s²)',
    ayuda: 'Desde esta aceleración el riesgo pasa a medio (-15 a -1). Debe ser menor que la frenada brusca.',
    min: -15,
    max: -1,
  },
  UMBRAL_FRENADA_ALTO: {
    etiqueta: 'Frenada de riesgo alto (m/s²)',
    ayuda: 'Desde esta aceleración el riesgo pasa a alto (-20 a -2). Debe ser menor que la de riesgo medio.',
    min: -20,
    max: -2,
  },
  LIMITE_VELOCIDAD: {
    etiqueta: 'Límite de velocidad (km/h)',
    ayuda: 'Velocidad desde la cual se cuenta como exceso (10 a 200).',
    min: 10,
    max: 200,
  },
}

const ORDEN = [
  'UMBRAL_FRENADA_BRUSCA',
  'UMBRAL_FRENADA_MEDIO',
  'UMBRAL_FRENADA_ALTO',
  'LIMITE_VELOCIDAD',
  'NIVEL_SEGURIDAD_BAJO',
  'INCIDENTES_REPETIDOS',
  'MINUTOS_ENTRE_NOTIFICACIONES',
]

const DEFAULTS = [
  { clave: 'UMBRAL_FRENADA_BRUSCA', valor: -3 },
  { clave: 'UMBRAL_FRENADA_MEDIO', valor: -4.5 },
  { clave: 'UMBRAL_FRENADA_ALTO', valor: -6 },
  { clave: 'LIMITE_VELOCIDAD', valor: 80 },
  { clave: 'NIVEL_SEGURIDAD_BAJO', valor: 50 },
  { clave: 'INCIDENTES_REPETIDOS', valor: 3 },
  { clave: 'MINUTOS_ENTRE_NOTIFICACIONES', valor: 30 },
]

function textos(filas) {
  const salida = {}
  filas.forEach((f) => {
    salida[f.clave] = String(f.valor)
  })
  return salida
}

function aNumero(texto) {
  const t = String(texto).trim().replace(',', '.')
  if (t === '') return NaN
  return Number(t)
}

function ordenar(filas) {
  return [...filas].sort((a, b) => {
    const ia = ORDEN.indexOf(a.clave)
    const ib = ORDEN.indexOf(b.clave)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })
}

function validar(filas, valores) {
  const errores = {}
  filas.forEach((f) => {
    const n = aNumero(valores[f.clave])
    const regla = REGLAS[f.clave]
    if (Number.isNaN(n)) {
      errores[f.clave] = 'Ingresa un número válido.'
    } else if (regla && regla.entero && !Number.isInteger(n)) {
      errores[f.clave] = 'Debe ser un número entero.'
    } else if (regla && (n < regla.min || n > regla.max)) {
      errores[f.clave] = `Debe estar entre ${regla.min} y ${regla.max}.`
    }
  })
  const brusca = 'UMBRAL_FRENADA_BRUSCA'
  const medio = 'UMBRAL_FRENADA_MEDIO'
  const alto = 'UMBRAL_FRENADA_ALTO'
  const hay = (c) => filas.some((f) => f.clave === c)
  if (hay(brusca) && hay(medio) && !errores[brusca] && !errores[medio]) {
    if (aNumero(valores[medio]) >= aNumero(valores[brusca])) {
      errores[medio] = 'Debe ser menor que la frenada brusca.'
    }
  }
  if (hay(medio) && hay(alto) && !errores[medio] && !errores[alto]) {
    if (aNumero(valores[alto]) >= aNumero(valores[medio])) {
      errores[alto] = 'Debe ser menor que la de riesgo medio.'
    }
  }
  return errores
}

const COLOR_AVISO = {
  error: { fondo: '#fef2f2', borde: '#fca5a5', texto: '#991b1b' },
  info: { fondo: '#eff6ff', borde: '#93c5fd', texto: '#1e3a8a' },
  ok: { fondo: '#f0fdf4', borde: '#86efac', texto: '#166534' },
}

function ConfiguracionUmbrales() {
  const [filas, setFilas] = useState(DEFAULTS)
  const [valores, setValores] = useState(textos(DEFAULTS))
  const [errores, setErrores] = useState({})
  const [aviso, setAviso] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    let activo = true
    async function cargar() {
      try {
        const r = await apiFetch('/configuracion')
        if (!activo) return
        if (r.ok) {
          const d = await r.json()
          if (Array.isArray(d) && d.length > 0) {
            const lista = ordenar(d.map((x) => ({ clave: x.clave, valor: x.valor, descripcion: x.descripcion })))
            setFilas(lista)
            setValores(textos(lista))
          } else {
            setAviso({ tipo: 'info', texto: 'El servidor no tiene umbrales cargados. Se muestran los valores por defecto.' })
          }
        } else if (r.status === 401 || r.status === 403) {
          setAviso({ tipo: 'error', texto: 'No se pudo cargar: inicia sesión para ver la configuración.' })
        } else {
          setAviso({ tipo: 'error', texto: 'No se pudo cargar la configuración del servidor.' })
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
    setErrores(validar(filas, siguiente))
    setAviso(null)
  }

  const restablecer = () => {
    setValores(textos(DEFAULTS))
    setErrores({})
    setAviso(null)
  }

  const guardar = async (e) => {
    e.preventDefault()
    const err = validar(filas, valores)
    setErrores(err)
    if (Object.keys(err).length > 0) {
      setAviso({ tipo: 'error', texto: 'Corrige los campos marcados antes de guardar.' })
      return
    }
    const cambiados = filas.filter((f) => aNumero(valores[f.clave]) !== Number(f.valor))
    if (cambiados.length === 0) {
      setAviso({ tipo: 'info', texto: 'No hay cambios para guardar.' })
      return
    }
    setGuardando(true)
    let guardados = 0
    let nuevas = [...filas]
    try {
      for (const f of cambiados) {
        const r = await apiFetch(`/configuracion/${encodeURIComponent(f.clave)}`, {
          method: 'PUT',
          body: JSON.stringify({ valor: aNumero(valores[f.clave]) }),
        })
        if (r.ok) {
          guardados += 1
          nuevas = nuevas.map((x) => (x.clave === f.clave ? { ...x, valor: aNumero(valores[f.clave]) } : x))
          continue
        }
        let texto = 'No se pudo guardar. Intenta de nuevo.'
        if (r.status === 401 || r.status === 403) {
          texto = 'No tienes permiso para guardar: se necesita rol de administrador.'
        } else if (r.status === 400 || r.status === 404) {
          const d = await r.json().catch(() => null)
          texto = (d && d.error) || 'El servidor rechazó el valor.'
        }
        setFilas(nuevas)
        setAviso({
          tipo: 'error',
          texto: guardados > 0 ? `Se guardaron ${guardados} cambio(s), pero falló "${f.clave}": ${texto}` : texto,
        })
        return
      }
      setFilas(nuevas)
      setAviso({ tipo: 'ok', texto: `Configuración guardada (${guardados} cambio${guardados === 1 ? '' : 's'}).` })
    } catch {
      setFilas(nuevas)
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
        Define a partir de qué valores el sistema clasifica el riesgo y cuenta excesos.
      </p>

      <form onSubmit={guardar} noValidate>
        {filas.map((f) => {
          const regla = REGLAS[f.clave]
          const etiqueta = regla ? regla.etiqueta : f.clave
          const ayuda = regla ? regla.ayuda : f.descripcion || ''
          return (
            <div key={f.clave} style={{ marginBottom: 14 }}>
              <label htmlFor={f.clave} style={{ display: 'block', fontWeight: 600 }}>
                {etiqueta}
              </label>
              <input
                id={f.clave}
                type="text"
                inputMode="decimal"
                value={valores[f.clave] ?? ''}
                onChange={(e) => cambiar(f.clave, e.target.value)}
                aria-invalid={errores[f.clave] ? 'true' : 'false'}
                aria-describedby={`${f.clave}-ayuda`}
                disabled={cargando}
                style={{
                  width: 140,
                  padding: '6px 8px',
                  marginTop: 4,
                  border: `1px solid ${errores[f.clave] ? '#dc2626' : '#9ca3af'}`,
                  borderRadius: 6,
                }}
              />
              <div
                id={`${f.clave}-ayuda`}
                style={{ fontSize: 13, color: errores[f.clave] ? '#dc2626' : '#6b7280', marginTop: 2 }}
              >
                {errores[f.clave] || ayuda}
              </div>
            </div>
          )
        })}

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