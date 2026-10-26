import { useEffect, useRef, useState } from 'react'
import { useNotificaciones } from '../contextoNotificaciones'
import { RIESGO, etiquetaTipo, formatearFechaHora, leerJson, riesgoDe } from '../datos'
import { useCarga } from '../useCarga'

// Monitoreo por cámara: muestra la cámara en vivo y permite registrar el
// accidente con su imagen. Si se elige un recorrido, el servidor liga el
// incidente a ese recorrido (aparece en el mapa) y avisa en tiempo real a los
// supervisores. No hay detección automática en esta pantalla: el registro lo
// dispara la persona que monitorea.

const TIPOS = [
  { valor: 'accidente', etiqueta: 'Accidente' },
  { valor: 'choque', etiqueta: 'Choque / casi choque' },
  { valor: 'proximidad', etiqueta: 'Proximidad peligrosa' },
  { valor: 'distraccion', etiqueta: 'Distracción del conductor' },
  { valor: 'deteccion_camara', etiqueta: 'Otro (detección por cámara)' },
]

const MENSAJES_CAMARA = {
  denegada: ['Permiso de cámara denegado', 'Permite el acceso a la cámara en el navegador (ícono del candado junto a la dirección) y recarga la página.'],
  sin_camara: ['No se encontró ninguna cámara', 'Conecta una cámara web y recarga la página.'],
  sin_soporte: ['Este navegador no permite usar la cámara', 'Abre el dashboard desde localhost o una dirección https, con un navegador actualizado.'],
  error: ['No se pudo iniciar la cámara', 'Puede que otra aplicación la esté usando. Ciérrala y recarga la página.'],
}

export default function VistaCamara() {
  const { conductores } = useNotificaciones()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const [estado, setEstado] = useState(() => (navigator.mediaDevices?.getUserMedia ? 'iniciando' : 'sin_soporte'))
  const [ahora, setAhora] = useState(() => new Date())
  const [captura, setCaptura] = useState(null)
  const [form, setForm] = useState({ recorrido_id: '', tipo: 'accidente', nivel_riesgo: 'alto' })
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [registro, setRegistro] = useState([])

  const recorridos = useCarga(() => leerJson('/recorridos?limite=20'), [])

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) return undefined
    let cancelado = false
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((stream) => {
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        setEstado('activa')
      })
      .catch((err) => {
        if (cancelado) return
        setEstado(err.name === 'NotAllowedError' ? 'denegada' : err.name === 'NotFoundError' ? 'sin_camara' : 'error')
      })
    return () => {
      cancelado = true
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
    }
  }, [])

  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const cambiar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  // Devuelve una foto (JPEG) del fotograma actual, o null si no hay imagen disponible.
  const tomarFoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (estado !== 'activa' || !video || !canvas || !video.videoWidth) return null
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    return canvas.toDataURL('image/jpeg', 0.8)
  }

  const capturar = () => {
    const foto = tomarFoto()
    if (!foto) {
      setResultado({ tipo: 'error', texto: 'No hay imagen de la cámara para capturar.' })
      return
    }
    setCaptura(foto)
    setResultado(null)
  }

  const registrar = async () => {
    setEnviando(true)
    setResultado(null)
    const imagen = captura || tomarFoto()
    try {
      const creado = await leerJson('/incidentes', {
        method: 'POST',
        body: JSON.stringify({
          imagen: imagen || undefined,
          tipo: form.tipo,
          nivel_riesgo: form.nivel_riesgo,
          recorrido_id: form.recorrido_id || undefined,
        }),
      })
      const aviso = form.recorrido_id
        ? 'Se avisó en tiempo real a los supervisores y quedó ligado al recorrido (se ubica en el mapa).'
        : 'Quedó guardado SIN recorrido: no se avisa a los supervisores ni se puede ubicar en el mapa. Elige un recorrido para eso.'
      setResultado({ tipo: form.recorrido_id ? 'ok' : 'info', texto: `Incidente registrado. ${aviso}` })
      setRegistro((previo) => [
        { id: creado.id, cuando: new Date(), tipo: form.tipo, nivel: form.nivel_riesgo, conImagen: Boolean(imagen), conRecorrido: Boolean(form.recorrido_id) },
        ...previo,
      ].slice(0, 8))
      setCaptura(null)
    } catch (e) {
      setResultado({ tipo: 'error', texto: e.message })
    } finally {
      setEnviando(false)
    }
  }

  const etiquetaRecorrido = (r) =>
    `${conductores[r.conductor_id] || 'Conductor sin nombre'} · ${formatearFechaHora(r.fecha_inicio)}${r.fecha_fin ? '' : ' (en curso)'}`

  const mensajeCamara = MENSAJES_CAMARA[estado]

  return (
    <div className="cam-layout">
      <div className="panel">
        <div className="panel-head">
          <h2>Cámara del conductor</h2>
          <span className="panel-note">{estado === 'activa' ? 'Transmisión activa' : 'Sin transmisión'}</span>
        </div>

        <div className="camwrap">
          <video ref={videoRef} autoPlay playsInline muted style={{ display: estado === 'activa' ? 'block' : 'none' }} />
          {estado === 'iniciando' && <div className="cam-off">Solicitando acceso a la cámara…</div>}
          {mensajeCamara && (
            <div className="cam-off" role="alert"><b>{mensajeCamara[0]}</b>{mensajeCamara[1]}</div>
          )}
          {estado === 'activa' && (
            <>
              <div className="cam-frame"><i /><i /><i /><i /></div>
              <div className="cam-rec"><span className="live-dot" />EN VIVO</div>
              <div className="cam-time">{ahora.toLocaleString('es-CO')}</div>
            </>
          )}
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <div className="cam-controls">
          <label className="field">Recorrido (para ubicar y alertar)
            <select className="select" value={form.recorrido_id} onChange={cambiar('recorrido_id')}>
              <option value="">Sin recorrido (solo guardar)</option>
              {(recorridos.datos || []).map((r) => <option key={r.id} value={r.id}>{etiquetaRecorrido(r)}</option>)}
            </select>
          </label>
          <label className="field">Tipo de evento
            <select className="select" value={form.tipo} onChange={cambiar('tipo')}>
              {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
            </select>
          </label>
          <label className="field">Nivel de riesgo
            <select className="select" value={form.nivel_riesgo} onChange={cambiar('nivel_riesgo')}>
              {['alto', 'medio', 'bajo'].map((k) => <option key={k} value={k}>{RIESGO[k].etiqueta}</option>)}
            </select>
          </label>
        </div>

        <div className="cam-actions">
          <button type="button" className="btn secondary" onClick={capturar} disabled={estado !== 'activa'}>Capturar imagen</button>
          <button type="button" className="btn danger" onClick={registrar} disabled={enviando}>
            {enviando ? 'Registrando…' : 'Registrar incidente y alertar'}
          </button>
        </div>
        {resultado && (
          <div className={resultado.tipo === 'ok' ? 'okbox' : resultado.tipo === 'info' ? 'infobox' : 'errorbox'} role="status" style={{ margin: '0 16px 16px' }}>
            {resultado.texto}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
        <div className="panel">
          <div className="panel-head"><h2>Imagen capturada</h2></div>
          <div className="pad">
            {captura ? (
              <>
                <img className="shot" src={captura} alt="Captura de la cámara" />
                <p className="field-hint" style={{ marginBottom: 0 }}>Se enviará junto con el incidente.</p>
              </>
            ) : (
              <p className="field-hint" style={{ margin: 0 }}>
                Sin captura. Al registrar, si no capturaste una imagen se toma una del fotograma actual.
              </p>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h2>Registrados en esta sesión</h2></div>
          {registro.length === 0 && <div className="empty">Aún no registraste incidentes.</div>}
          {registro.map((r) => {
            const riesgo = riesgoDe(r.nivel)
            return (
              <div className="log-item" key={r.id}>
                <span className={`sev ${riesgo.clave}`} style={{ marginTop: 6 }} />
                <div>
                  <b>{etiquetaTipo(r.tipo)}</b> · {riesgo.etiqueta}
                  <div className="alert-sub">
                    {r.cuando.toLocaleTimeString('es-CO')} · {r.conImagen ? 'con imagen' : 'sin imagen'} · {r.conRecorrido ? 'ligado a recorrido' : 'sin recorrido'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <p className="field-hint">
          Esta pantalla no detecta accidentes por sí sola: quien monitorea los registra. La detección automática con IA
          todavía no está conectada al dashboard.
        </p>
      </div>
    </div>
  )
}
