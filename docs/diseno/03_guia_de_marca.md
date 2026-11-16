# 03 · Guía de marca: Aurora

Paso 3 del rediseño (skills `logo-design` y `brand-guidelines`). Los archivos están en `Mockups/logo/final/`.

## 1. El logo
**Idea:** la **A** de Aurora es a la vez un visor y una montaña, y su travesaño es un **latido**. Es salud que se vigila desde adentro.

| Archivo | Uso |
|---|---|
| `aurora-symbol.svg` | Símbolo a color: degradado violeta → cian y latido cian. Para ≥ 48 px. |
| `aurora-symbol-small.svg` | Versión para tamaños pequeños: trazos más gruesos y latido simplificado a un pico. Para 16–48 px. |
| `aurora-horizontal.svg` | Símbolo + «Aurora». Va en el encabezado de la app. |
| `aurora-symbol-black.svg` / `-white.svg` / `-mono-9d85ff.svg` | Versiones a una tinta (negro, blanco y violeta). |
| `aurora-app-icon-color.svg` | Icono de app sobre fondo #0a0c18. |
| `favicon.svg`, `favicon.ico`, `icon-192/512.png`, `site.webmanifest`, `head-snippet.html` | Iconos web, listos para `webapp/public`. |

> El texto del logo horizontal usa `<text>` con Space Grotesk. En la app se escribe como HTML, así que no hay problema. Para imprimir habría que convertirlo a curvas.

### Reglas
- **Espacio libre:** alrededor del símbolo, como mínimo el grosor de una pierna de la A (≈ 12 % del ancho).
- **Tamaño mínimo:**
  - 16 px con la versión *small*.
  - 48 px con la versión normal.
  - 120 px de ancho para el logo horizontal.
- **Fondos aprobados:** `--bg-base` #0a0c18, los paneles `--surface-1/2` y el negro. Sobre fondo claro se usa la versión negra o la violeta.
- **No hacer:**
  - recolorearlo con verde, ámbar o rojo (son colores de estado);
  - rotarlo, estirarlo o agregarle sombra o brillo;
  - cambiar el latido por otro símbolo;
  - ponerlo sobre fotos con mucho detalle.

## 2. Color
Los valores completos están en `02_sistema_visual.md`. Resumen:

| Color | HEX | RGB | Rol |
|---|---|---|---|
| Violeta aurora | #9d85ff | 157 133 255 | Marca, selección, foco |
| Violeta botón | #6d4ff0 | 109 79 240 | Botones primarios |
| Cian holograma | #5ee6ff | 94 230 255 | Figura humana, líneas guía, ECG, latido del logo |
| Espacio profundo | #0a0c18 | 10 12 24 | Fondo |
| Texto | #f1f3ff | 241 243 255 | Texto principal |
| Normal / Atención / Crítico | #4ade80 / #fbbf24 / #ff6b6b | — | **Solo** para estados de salud |

## 3. Tipografía
- **Space Grotesk** 600–700: títulos y la palabra del logo.
- **Inter** 400–600: texto.
- **JetBrains Mono** 500–600: cualquier número medido.

Las tres son Google Fonts con licencia OFL, que permite usarlas en el producto.

## 4. Voz y tono
El usuario es un astronauta **sin formación médica**, a veces bajo estrés y lejos de la Tierra.

| Atributo | Sí | No |
|---|---|---|
| **Claro** | «Tu pulso está alto: 118 lpm» | «Taquicardia sinusal detectada» |
| **Calmado** | «Atención: tu estrés subió. Hagamos una pausa de 2 min.» | «¡ALERTA! ¡Nivel de estrés peligroso!» |
| **Accionable** | «Bebe 250 ml de agua y vuelve a medir en 30 min.» | «Considere evaluar su estado de hidratación.» |
| **Honesto** | «Dato simulado» o «Referencia: Inspiration4» | Presentar una simulación como medición real |

### Matriz de tono por estado

| Estado | Tono | Ejemplo |
|---|---|---|
| Normal | Breve, positivo | «Todo en orden. Sigue así.» |
| Atención | Tranquilo, con una acción | «Tu temperatura subió a 37.6 °C. Hidrátate y mide de nuevo en 30 min.» |
| Crítico | Firme, directo, sin dramatismo; primero la acción | «Detén el ejercicio y siéntate. Avisa a tu tripulación.» |

### Reglas de escritura
- Primero el nombre simple y después el técnico: «Sudor / estrés · GSR».
- Se habla de **tú**.
- Las recomendaciones empiezan con un verbo: «Respira…», «Bebe…», «Descansa…».
- Las cifras siempre llevan su unidad.

## 5. Revisión rápida antes de publicar algo
- [ ] El logo es una versión aprobada, respeta el espacio libre y el tamaño mínimo.
- [ ] Solo se usan los colores de esta guía, y verde, ámbar y rojo únicamente para estados.
- [ ] La tipografía y los pesos son los correctos, y los números van en mono.
- [ ] El texto cumple AA (≥ 4.5:1).
- [ ] El tono es claro, calmado y accionable.
