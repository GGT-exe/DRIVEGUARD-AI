# Identidad visual de DriveGuard-AI en el front

Fuente: `Manual_de_Identidad_DriveGuard-AI.pdf` (V1.1) en esta carpeta.

## Componentes React (`frontend/src/marca/Marca.jsx`)
```jsx
import { Imagotipo, Isotipo, Logotipo, Isologo, Eslogan } from '../marca/Marca'

<Imagotipo alto={30} />                    // versión principal (símbolo + nombre)
<Isotipo alto={32} />                      // solo símbolo: avatar, favicon, menú compacto
<Logotipo alto={24} />                     // solo texto
<Isologo alto={120} />                     // nombre dentro del escudo: sellos, etiquetas
<Imagotipo variante="positivo" />          // sobre fondos claros
<Isotipo variante="asfalto" />             // monocromo sobre Verde Guardia o Amarillo Carril
<Isotipo variante="blanco" />              // monocromo sobre fondos oscuros saturados
<Eslogan />                                // «Anticípate al riesgo.»
```
Variantes: `negativo` (por defecto, sobre Asfalto), `positivo`, `asfalto`, `blanco`.
Tamaño mínimo del imagotipo: 120 px de ancho (alto ≈ 22 px).

## Reglas rápidas
- Colores: Asfalto `#12151A`, Verde Guardia `#3DD68C`, Amarillo Carril `#F4C542` (token `--ama`, solo detalle y guía; nunca severidad). Ámbar `#F5A623` y Rojo `#E5484D` solo para severidad moderada y grave.
- Tipografías: IBM Plex Sans (texto) e IBM Plex Mono (cifras, etiquetas, códigos).
- No deformar, rotar, recolorear ni añadir efectos a la marca.
- Archivos SVG de todas las versiones: `frontend/public/marca/`. El favicon es el isotipo.
