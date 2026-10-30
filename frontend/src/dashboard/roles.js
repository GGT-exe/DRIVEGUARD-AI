// Pestañas del dashboard según el rol del usuario.
// El backend es quien realmente protege cada ruta (middlewareRol.js); esto solo
// decide qué pestañas se muestran para no ofrecer pantallas que darían 403.

export const ROLES = {
  CONDUCTOR: 'conductor',
  SUPERVISOR: 'supervisor',
  GERENTE: 'gerente',
  ADMINISTRADOR: 'administrador',
}

// "admin" y "administrador" son el mismo rol (ver backend/src/middlewareRol.js).
// Un rol desconocido recibe el acceso mínimo (conductor).
export function rolDe(usuario) {
  const rol = String(usuario?.rol || '').trim().toLowerCase()
  if (rol === 'admin' || rol === 'administrador') return ROLES.ADMINISTRADOR
  if (rol === 'gerente') return ROLES.GERENTE
  if (rol === 'supervisor') return ROLES.SUPERVISOR
  return ROLES.CONDUCTOR
}

export const ETIQUETA_ROL = {
  [ROLES.CONDUCTOR]: 'Conductor',
  [ROLES.SUPERVISOR]: 'Supervisor de flota',
  [ROLES.GERENTE]: 'Gerente de flota',
  [ROLES.ADMINISTRADOR]: 'Administrador',
}

const TODOS = [ROLES.SUPERVISOR, ROLES.GERENTE, ROLES.ADMINISTRADOR]
const MONITOREO = [ROLES.CONDUCTOR, ...TODOS]
const GERENCIA = [ROLES.GERENTE, ROLES.ADMINISTRADOR]
const SOLO_ADMIN = [ROLES.ADMINISTRADOR]

export const PESTANAS = [
  { id: 'inicio', etiqueta: 'Inicio', icono: 'inicio', roles: MONITOREO, titulo: 'Panel de seguridad de flota', sub: 'Vista general en vivo de la operación.' },
  { id: 'camara', etiqueta: 'Cámara', icono: 'camara', roles: MONITOREO, titulo: 'Monitoreo por cámara', sub: 'Seguimiento del conductor y registro del incidente con su imagen.' },
  { id: 'mapa', etiqueta: 'Mapa', icono: 'mapa', roles: MONITOREO, titulo: 'Mapa de incidentes', sub: 'Dónde ocurrieron los accidentes y los posibles accidentes, por nivel de riesgo.' },
  { id: 'alertas', etiqueta: 'Alertas', icono: 'alerta', roles: MONITOREO, titulo: 'Alertas y notificaciones', sub: 'Alertas en vivo de la flota y notificaciones de eventos críticos.' },
  { id: 'historial', etiqueta: 'Historial', icono: 'historial', roles: MONITOREO, titulo: 'Historial de incidentes', sub: 'Filtra por conductor, tipo de vehículo y fechas.' },
  { id: 'comparativo', etiqueta: 'Comparativo', icono: 'barras', roles: GERENCIA, titulo: 'Comparativo de seguridad', sub: 'Nivel de seguridad por conductor o vehículo.' },
  { id: 'reportes', etiqueta: 'Reportes', icono: 'reporte', roles: GERENCIA, titulo: 'Reportes', sub: 'Consulta y exporta los reportes periódicos en PDF o Excel.' },
  { id: 'umbrales', etiqueta: 'Umbrales', icono: 'ajustes', roles: SOLO_ADMIN, titulo: 'Configuración de umbrales', sub: 'Valores a partir de los cuales el sistema clasifica el riesgo y notifica.' },
  { id: 'auditoria', etiqueta: 'Auditoría', icono: 'escudo', roles: SOLO_ADMIN, titulo: 'Historial de auditoría', sub: 'Quién hizo qué y cuándo en el sistema.' },
  { id: 'usuarios', etiqueta: 'Usuarios', icono: 'usuarios', roles: SOLO_ADMIN, titulo: 'Usuarios y permisos', sub: 'Usuarios del sistema y qué puede hacer cada rol.' },
]

export function pestanasPara(usuario) {
  const rol = rolDe(usuario)
  return PESTANAS.filter((p) => p.roles.includes(rol))
}

export const PERMISOS_POR_ROL = [
  { rol: 'Administrador', desc: 'Acceso total: umbrales, auditoría, usuarios, reportes y todo el monitoreo.' },
  { rol: 'Gerente', desc: 'Monitoreo completo, comparativo de seguridad y exportación de reportes. No administra usuarios ni umbrales.' },
  { rol: 'Supervisor', desc: 'Cámara, mapa, alertas e historial de incidentes. No ve comparativos ni reportes.' },
  { rol: 'Conductor', desc: 'Solo consulta Inicio, Cámara, Mapa, Alertas e Historial. No administra usuarios, umbrales ni reportes.' },
]
