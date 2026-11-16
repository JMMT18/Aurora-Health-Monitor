# 02 · Sistema visual: «Aurora holográfica»

Este es el paso 2 del rediseño, hecho con la skill `ui-design-system`. Los tokens están en `Mockups/tokens.css`.

## Idea
Es un panel médico de nave que parece un **holograma**:
- La figura humana y las líneas guía son de luz cian.
- La marca toma los colores de una **aurora**: violeta que pasa a cian.

La legibilidad va primero: el texto siempre va sobre fondos sólidos, y el brillo solo se usa en líneas y bordes, nunca detrás del texto.

## Colores

| Rol | Token | Hex | Contraste sobre panel | Uso |
|---|---|---|---|---|
| Fondo | `--bg-base` | #0a0c18 | — | Página |
| Panel | `--surface-1/2/3` | #11142a / #171b36 / #1f2445 | — | Bloques I, R, A, ECG y zona |
| Línea | `--line` | #2a3060 | — | Bordes de panel |
| Texto 1 | `--text-1` | #f1f3ff | 15.3:1 | Títulos y valores |
| Texto 2 | `--text-2` | #aab1d8 | 8.0:1 | Explicaciones |
| Texto 3 | `--text-3` | #7f88b5 | 4.9:1 | Etiquetas y fuentes |
| Marca violeta | `--aurora-violet` | #9d85ff | 5.8:1 | Selección, foco, acentos |
| Botón primario | `--aurora-violet-600` | #6d4ff0 | texto blanco 5.2:1 | Acciones |
| Holograma | `--holo-cyan` | #5ee6ff | 11.4:1 | Cuerpo 2D, líneas guía, onda ECG |
| **Normal** | `--ok` | #4ade80 | 9.7:1 | Solo estado |
| **Atención** | `--warn` | #fbbf24 | 10.1:1 | Solo estado |
| **Crítico** | `--crit` | #ff6b6b | 6.1:1 | Solo estado |

**Regla del color reservado:** el verde, el ámbar y el rojo **solo** significan estado. El cian del holograma es azulado (#5ee6ff) para no confundirse con el verde, y aun así cada estado lleva **icono y palabra**:
- ✓ Normal
- ! Atención
- ✕ Crítico

## Tipografía

| Nivel | Fuente | Peso / tamaño | Uso |
|---|---|---|---|
| Display | Space Grotesk | 700 · 2–2.75rem | Título de la zona y estado general en I |
| Título | Space Grotesk | 600 · 1.25rem | Encabezados de bloque |
| Cuerpo | Inter | 400–500 · 0.875–1rem | Explicaciones y recomendaciones |
| Etiqueta | Inter | 600 · 0.75rem, mayúsculas, +0.08em | NORMAL / ATENCIÓN / CRÍTICO, nombres de bloque |
| Dato | JetBrains Mono | 500–600, cifras tabulares | Todo número que venga de un sensor |

## Forma y profundidad
- **Paneles HUD:** esquina superior derecha cortada (`--cut: 14px`) con borde de 1 px. Es la firma visual.
- **Radios:** 8 px en botones, 14 px en tarjetas y completo en chips y pastillas de estado.
- **Sombras:** casi planas; la profundidad viene del tono del panel y no de sombras grandes.
- **Brillo (`--holo-glow`):** solo en la figura, las líneas guía, la onda del ECG y la zona seleccionada.

## Componentes

| Componente | Variantes y estados |
|---|---|
| **Panel HUD** | default · seleccionado (borde violeta) · alerta (borde del color del estado) |
| **Zona del cuerpo** | normal · atención · crítico (pulso) · hover · seleccionada · foco de teclado |
| **Pastilla de estado** | ok / warn / crit, siempre con icono y palabra |
| **Tarjeta de medida** | nombre simple, nombre técnico, valor mono, unidad, rango normal, mini gráfica y fuente (sensor, manual o dataset) |
| **Recomendación** | título, duración y motivo; estados default · hover · activa (reproduciéndose en A) |
| **Botón** | primario (violeta) · fantasma (borde) · icono; tamaños sm 32 px y md 44 px (táctil) |
| **Mini gráfica** | línea cian; los puntos fuera de rango van en el color del estado |

## Responsivo

| Ancho | Distribución |
|---|---|
| ≥ 1280 px | Igual al mockup: 3 columnas y una fila inferior con ECG, R y A |
| 768–1279 px | 2 columnas: cuerpo + zona, y debajo ECG, R y A |
| < 768 px | 1 columna en este orden: I, cuerpo, zona, ECG, R, A |

## Movimiento
- **Duraciones:** 150 / 280 / 600 ms con salida suave.
- **Se anima solo lo que es información:**
  - la onda del ECG
  - el pulso de la zona crítica
  - la línea punteada entre el cuerpo y la zona
  - la guía de A
- **Con `prefers-reduced-motion`:** el ECG pasa a actualizarse por pasos y la guía de A muestra pasos estáticos.

## Cambio v2: figura realista (2026-11-15)
- **Cuerpo:** el holograma cian se reemplazó por una **ilustración plana realista**, con piel en degradado (#f4cfaa → #d9a27a) y sombra suave. Es un dibujo propio, inspirado en el estilo de las referencias pero sin copiarlas. El código está en `Mockups/figure.js`.
- **Órganos por zona:**
  - cerebro: lavanda
  - corazón y arterias: vino #c24d63
  - venas: azul
  - pulmones: celeste
  - digestivo: rosado
  - huesos: marfil
  - nervios: lavanda

  La zona seleccionada se ve al 100 % y las demás al 28 %.
- **Color anatómico y color de estado:** los colores de los órganos son apagados y no reemplazan el estado. El estado de cada zona se muestra **solo** con su insignia (✓ ! ✕ en verde, ámbar o rojo). Para que se distingan, ningún órgano usa el verde, el ámbar o el rojo puros de los estados.
- **Sin scroll en escritorio:** desde 1100 × 640 px la app ocupa exactamente una pantalla. Las tarjetas de medidas se acomodan según el espacio disponible:
  - 1 o 2 columnas, según cuántas medidas haya y la altura;
  - en espacios bajos se ocultan primero la línea «Normal», luego la mini gráfica y el nombre técnico.
- **Celular y tablet:** se mantiene el scroll vertical en una columna, porque ahí no caben todos los bloques a un tamaño legible.
