import { createContext, useContext } from 'react'

export const ContextoNotificaciones = createContext(null)

export function useNotificaciones() {
  const valor = useContext(ContextoNotificaciones)
  if (!valor) throw new Error('useNotificaciones debe usarse dentro de <ProveedorNotificaciones>')
  return valor
}
