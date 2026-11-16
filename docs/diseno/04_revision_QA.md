# 04 · Revisión de diseño y accesibilidad

Revisé `aurora-medica-mockup.html` el 2026-11-15 con dos skills: `design-qa` (lint, auditoría renderizada a 1440 px) y `a11y-audit` (escáner WCAG 2.2 y contraste).

## Corregido
| Problema | Criterio | Arreglo |
|---|---|---|
| En el cuerpo 2D, el estado de cada zona se veía solo por color | 1.4.1 | Cada zona lleva un icono de estado (✓ ! ✕) |
| No había landmark `<main>` | 1.3.1 | La app va dentro de `<main>` |
| No había enlace para saltar al contenido | 2.4.1 | Se agregó «Saltar a la zona seleccionada» |
| Los canvas no tenían rol | 1.1.1 | ECG y 3D con `role="img"` y descripción |
| El lector de pantalla anunciaba las medidas cada segundo | 4.1.3 | Solo el bloque I anuncia, y únicamente cuando cambia el estado |
| El texto terciario sobre el panel más claro quedaba en 4.36:1 | 1.4.3 | `--text-3` pasó a #8a93bf (≥ 4.5:1) |
| La zona enfocada con teclado se veía débil | 2.4.7 | Ahora tiene un contorno blanco sólido de 2.5 px |

## Contraste medido (AA)
- Texto principal: 15.3:1.
- Secundario: 8.0:1.
- Terciario: ≥ 4.5:1.
- Violeta sobre panel: 5.8:1.
- Botón primario: 5.2:1.
- Estados sobre su fondo:
  - verde 8.8:1
  - ámbar 8.8:1
  - rojo 5.9:1

## Falsos positivos (aceptados)
- **«Botón sin acción»** (6 casos): los manejadores se conectan desde JavaScript.
- **«Texto de relleno: Todo»**: es la palabra en español «Todo en orden».
- **«Foco tapado» en la zona Mano**: esa zona son dos círculos separados y el centro de su caja cae entre ambos. Con el teclado, la zona sí se ve.
- **«Contraste sin verificar»** (texto sobre degradado): el degradado está solo en el fondo de la página. El texto va sobre paneles sólidos, y esos pares sí se midieron.
- **Degradado violeta**: es la marca «aurora», definida en la guía. Es una decisión de diseño.

## Pendiente o no verificado
- **Lector de pantalla real:** no se probó con NVDA ni VoiceOver.
- **Teclado con Playwright:** no se hizo la pasada completa porque no está instalado. El foco solo se comprobó por script.
- **Vista a 320 px:** no se pudo medir en local porque al archivo le falta la etiqueta de viewport, que el artifact sí agrega. Conviene revisarla en un celular.
