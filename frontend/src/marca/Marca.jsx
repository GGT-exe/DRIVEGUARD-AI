import { useId } from 'react'
import { COLORES as C, ISO, ISOLOGO, LOGOTIPO, IMAGOTIPO } from './trazos'

// Identidad visual de DriveGuard-AI (Manual de identidad V1.1).
// Cuatro representaciones: Logotipo (solo texto), Isotipo (solo símbolo),
// Imagotipo (símbolo + texto, separables) e Isologo (texto dentro del símbolo).
// Variantes: 'negativo' (sobre Asfalto, la principal), 'positivo' (sobre claro),
// 'asfalto' y 'blanco' (monocromáticas).

const PALETAS = {
  negativo: { trazo: C.verde, via: C.pizarra, punto: C.verde, linea: C.amarillo, anillo: null, texto: [C.hielo, C.verde, C.amarillo] },
  positivo: { trazo: C.asfalto, via: C.asfalto, punto: C.verde_o, linea: C.amarillo, anillo: '#FFFFFF', texto: [C.asfalto, C.verde_o, C.amar_o] },
}
const MONO = { asfalto: C.asfalto, blanco: '#FFFFFF' }

function datos(variante) {
  if (MONO[variante]) {
    const c = MONO[variante]
    return { mono: c, texto: [c, c, c] }
  }
  return { ...(PALETAS[variante] || PALETAS.negativo), mono: null }
}

// Símbolo (escudo + vía + punto + líneas) en las coordenadas del trazado original.
function Simbolo({ g, p }) {
  const idClip = useId()
  const idMask = useId()
  const [cx, cy, r] = g.punto
  const lineas = g.lineas.map(([x, y, w, h]) => ({ x, y, w, h }))
  if (p.mono) {
    return (
      <>
        <clipPath id={idClip}><path d={g.escudo} /></clipPath>
        <mask id={idMask} maskUnits="userSpaceOnUse" x="0" y="0" width="677" height="920">
          <rect x="0" y="0" width="677" height="920" fill="#fff" />
          <circle cx={cx} cy={cy} r={r} fill="#000" />
          {lineas.map((l) => <rect key={l.x} x={l.x} y={l.y} width={l.w} height={l.h} rx={l.w / 2} fill="#000" />)}
        </mask>
        <g mask={`url(#${idMask})`}>
          <path d={g.via} fill={p.mono} clipPath={`url(#${idClip})`} />
          <path d={g.escudo} fill="none" stroke={p.mono} strokeWidth="32" strokeLinejoin="round" />
        </g>
      </>
    )
  }
  return (
    <>
      <clipPath id={idClip}><path d={g.escudo} /></clipPath>
      <path d={g.via} fill={p.via} clipPath={`url(#${idClip})`} />
      <path d={g.escudo} fill="none" stroke={p.trazo} strokeWidth="32" strokeLinejoin="round" />
      {lineas.map((l) => <rect key={l.x} x={l.x} y={l.y} width={l.w} height={l.h} rx={l.w / 2} fill={p.linea} />)}
      {p.anillo && <circle cx={cx} cy={cy} r={r + 9} fill={p.anillo} />}
      <circle cx={cx} cy={cy} r={r} fill={p.punto} />
    </>
  )
}

function Svg({ viewBox, alto, className, titulo, decorativo, children }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      height={alto}
      className={className}
      role={decorativo ? undefined : 'img'}
      aria-label={decorativo ? undefined : titulo}
      aria-hidden={decorativo ? 'true' : undefined}
      focusable="false"
    >
      {children}
    </svg>
  )
}

export function Isotipo({ alto = 32, variante = 'negativo', className, titulo = 'DriveGuard-AI', decorativo = false }) {
  const p = datos(variante)
  return (
    <Svg viewBox={ISO.viewBox} alto={alto} className={className} titulo={titulo} decorativo={decorativo}>
      <Simbolo g={ISO} p={p} />
    </Svg>
  )
}

export function Isologo({ alto = 120, variante = 'negativo', className, titulo = 'DriveGuard-AI', decorativo = false }) {
  const p = datos(variante)
  return (
    <Svg viewBox={ISOLOGO.viewBox} alto={alto} className={className} titulo={titulo} decorativo={decorativo}>
      <Simbolo g={ISOLOGO} p={p} />
      <path d={ISOLOGO.drive} fill={p.texto[0]} />
      <path d={ISOLOGO.guard} fill={p.texto[1]} />
      <path d={ISOLOGO.ai} fill={p.texto[2]} />
    </Svg>
  )
}

export function Logotipo({ alto = 24, variante = 'negativo', className, titulo = 'DriveGuard-AI', decorativo = false }) {
  const p = datos(variante)
  return (
    <Svg viewBox={`0 0 ${LOGOTIPO.ancho} ${LOGOTIPO.alto}`} alto={alto} className={className} titulo={titulo} decorativo={decorativo}>
      <path d={LOGOTIPO.drive} fill={p.texto[0]} />
      <path d={LOGOTIPO.guard} fill={p.texto[1]} />
      <path d={LOGOTIPO.ai} fill={p.texto[2]} />
    </Svg>
  )
}

// Versión principal de la marca: úsese siempre que haya espacio horizontal.
// Tamaño mínimo según el manual: 120 px de ancho (≈ 22 px de alto).
export function Imagotipo({ alto = 32, variante = 'negativo', className, titulo = 'DriveGuard-AI', decorativo = false }) {
  const p = datos(variante)
  const { escala, anchoIso, separacion } = IMAGOTIPO
  return (
    <Svg viewBox={`0 0 ${IMAGOTIPO.ancho} ${IMAGOTIPO.alto}`} alto={alto} className={className} titulo={titulo} decorativo={decorativo}>
      <g transform={`scale(${escala}) translate(-30 -18)`}>
        <Simbolo g={ISO} p={p} />
      </g>
      <g transform={`translate(${anchoIso + separacion} 0)`}>
        <path d={IMAGOTIPO.drive} fill={p.texto[0]} />
        <path d={IMAGOTIPO.guard} fill={p.texto[1]} />
        <path d={IMAGOTIPO.ai} fill={p.texto[2]} />
      </g>
    </Svg>
  )
}

// Eslogan oficial: «Anticípate al riesgo.» con «riesgo» en Verde Guardia.
export function Eslogan({ className }) {
  return <span className={className}>Anticípate al <span className="eslogan-clave">riesgo</span>.</span>
}
