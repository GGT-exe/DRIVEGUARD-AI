import { useEffect, useRef, useState } from 'react'

// Carga datos asíncronos y recarga cuando cambian las dependencias.
// `cargando` se deduce comparando claves (no se llama a setState de forma
// síncrona dentro del efecto).
export function useCarga(cargador, dependencias = []) {
  const [estado, setEstado] = useState({ clave: null, datos: null, error: '' })
  const [version, setVersion] = useState(0)
  const ultimo = useRef(cargador)
  const clave = `${JSON.stringify(dependencias)}|${version}`

  useEffect(() => {
    ultimo.current = cargador
  })

  useEffect(() => {
    let activo = true
    Promise.resolve()
      .then(() => ultimo.current())
      .then((datos) => { if (activo) setEstado({ clave, datos, error: '' }) })
      .catch((e) => { if (activo) setEstado({ clave, datos: null, error: e.message || 'Error al cargar.' }) })
    return () => { activo = false }
  }, [clave])

  return {
    datos: estado.datos,
    error: estado.clave === clave ? estado.error : '',
    cargando: estado.clave !== clave,
    recargar: () => setVersion((v) => v + 1),
  }
}
