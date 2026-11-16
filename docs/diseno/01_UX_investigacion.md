# 01 · Investigación UX: Aurora (rediseño Pantalla 1)

Paso 1 del rediseño, hecho con la skill `ux-researcher-designer`. Se basa en:
- `Proyecto_Nasa/PRODUCT.md`
- el reto *Health Monitoring Software*
- el mockup a mano `Mockups/Pantalla_1.png`
- `INVENTARIO_PARAMETROS.md`

> **Confianza: baja (exploratoria).** No hay entrevistas ni analítica con astronautas reales. Las personas se derivan del reto y de la literatura, no de datos de usuarios. No se inventan testimonios. Para validarlas está la prueba rápida de la sección 6.

---

## 1. Personas

### P1 · Astronauta en misión larga (principal)
- **Contexto:** estación, base lunar o tránsito a Marte. No hay médico a bordo y la comunicación con la Tierra tiene retraso (hasta ~20 min en Marte).
- **Conocimiento médico:** bajo. No sabe interpretar un ECG ni un valor de GSR.
- **Uso:** revisiones cortas (1–3 min) varias veces al día, o cuando la app le avisa. Usa pantalla de tablet o laptop, a veces con guantes o con prisa.
- **Metas:**
  1. Saber en 2 segundos si está bien.
  2. Entender qué parte del cuerpo tiene el problema.
  3. Saber qué hacer ya mismo.
- **Frustraciones esperadas:** números sin contexto, tablas largas, alarmas que asustan sin decir qué hacer.
- **Implicación de diseño:** el estado general domina la pantalla, el cuerpo es el menú, y cada alerta trae una acción guiada.

### P2 · Médico de vuelo en Tierra (secundaria)
- Revisa los datos con retraso y quiere tendencias, valores exactos y referencias (Inspiration4, rangos normales).
- **Implicación:** la vista ampliada muestra el valor exacto, la unidad, el rango normal y la fuente (sensor o dataset).

### P3 · Jurado del hackathon (persona de contexto)
- Tiene unos 2–3 minutos de demo y quiere ver que funciona con hardware real y que es fácil de entender.
- **Implicación:** el flujo completo se puede mostrar en 4 clics:
  1. Ver el estado general.
  2. Tocar el pecho.
  3. Abrir el 3D.
  4. Tocar una recomendación y ver la animación.

  El evento de estrés simulado dispara una alerta visible.

---

## 2. Tareas principales (ordenadas por frecuencia × importancia)

| # | Tarea | Bloque del mockup | Éxito |
|---|---|---|---|
| T1 | ¿Estoy bien? | **I** (arriba a la derecha) | Identificar el estado en ≤ 2 s |
| T2 | ¿Qué parte está mal? | Cuerpo 2D (izquierda), con las zonas coloreadas por estado | Encontrar la zona en alerta en ≤ 5 s |
| T3 | Ver los detalles de una zona | Vista ampliada (centro) con las medidas y mini gráficas | Leer el valor y si es normal |
| T4 | Ver la zona en 3D | Botón 3D en la vista ampliada | Abrir y rotar el modelo |
| T5 | Saber qué hacer | **R** (abajo al centro) | Elegir una recomendación |
| T6 | Hacer la acción guiada | **A** (abajo a la derecha): animación y temporizador | Completar la guía |
| T7 | Ver el corazón en vivo | **ECG** (abajo a la izquierda) | Ver la onda moverse y el pulso |

---

## 3. Mapa de viaje: «chequeo de salud con alerta» (P1)

| Etapa | Acciones | Punto de contacto | Emoción (1–5) | Dolor | Oportunidad |
|---|---|---|---|---|---|
| 1. Aviso | La app muestra **I** en ámbar | Bloque I y pulso del color | 2 (inquietud) | No sabe si es grave | La palabra «Atención» + qué zona + desde cuándo |
| 2. Ubicar | Mira el cuerpo y ve la mano y el pecho en ámbar | Cuerpo 2D | 3 | Varias zonas a la vez | Ordenar por gravedad; la zona más grave se selecciona sola |
| 3. Entender | Toca la mano; en el centro aparece la mano ampliada con GSR y pulso | Vista ampliada | 3 | No sabe qué es GSR | Nombre simple («Sudor / estrés») y una línea de qué significa |
| 4. Decidir | Lee **R**: «Respiración 4-7-8 · 2 min» | Recomendaciones | 4 | Demasiadas opciones | 3 recomendaciones como máximo, la más urgente primero |
| 5. Actuar | Toca la recomendación y **A** muestra una figura que respira y un círculo con el tiempo | Animación | 4 | Olvida el ritmo | Guía visual con tiempo y fases (inhala / sostén / exhala) |
| 6. Cierre | El GSR vuelve a la normalidad e **I** pasa a verde | I y la zona | 5 (alivio) | No sabe si funcionó | Mostrar «Mejoró» y el cambio en la mini gráfica |

**Prioridad de las oportunidades** (frecuencia × gravedad × resolubilidad):
1. Estado claro con palabra y forma, no solo color (5×5×5).
2. Recomendación accionable con guía (4×5×4).
3. Nombres simples para cada medida (5×4×5).

---

## 4. Especificación funcional de la Pantalla 1

### Distribución (escritorio ≥ 1280 px), igual al mockup
```
┌──────────────────────────────────────────────────────────────┐
│ marca      TÍTULO (zona seleccionada)               [ I ]    │
│                                                              │
│  CUERPO 2D   - - -▶  [ ZONA AMPLIADA ]  ── medida 1  ~~~     │
│  (6 zonas)           [  botón 3D    ]  ── medida 2  ~~~      │
│                                        ── medida 3  ~~~      │
│                                                              │
│  [  ECG  ]           [     R     ]         [     A     ]     │
└──────────────────────────────────────────────────────────────┘
```
- **Tablet** (768–1279 px): dos columnas. El cuerpo y la zona arriba, y abajo R y A lado a lado.
- **Celular** (< 768 px): una columna en este orden: I, cuerpo, zona y medidas, ECG, R, A.

### Las 6 zonas del cuerpo y sus medidas

| Zona | En vivo (sensor) | Manual o test | Referencia (dataset) |
|---|---|---|---|
| **Cabeza** | Temperatura de la piel (termistor) | Tiempo de reacción (test), ánimo | sleepstudy (reacción), OSD-817 (presión intraocular), MMASH (ánimo) |
| **Pecho** | Pulso, ECG, HRV (RMSSD), respiración derivada del ECG (AD8232) | Presión arterial | SWELL (HR, RMSSD), MMASH (RR), OSD-575 panel cardiovascular |
| **Mano/muñeca** | GSR (sudor o estrés), pulso | — | SWELL (SCL por condición) |
| **Abdomen** | — | Glucosa | OSD-575 CMP (glucosa, electrolitos), OSD-569 hemograma |
| **Piernas** | Pasos, actividad, minutos activos (ADXL345) | — | Fitbit (pasos, METs), pérdida muscular y ósea modelada |
| **Cuerpo completo** | Postura, sueño por actigrafía, caídas (ADXL345), presión de cabina (BMP180) | Horas de sueño | MMASH (sueño), Fitbit (sleepDay) |

- La cabina **no** es una parte del cuerpo. Se muestra como un chip de «ambiente» junto a **I**, no dentro del cuerpo.

### Estados de cada zona
- **Normal:** verde.
- **Atención:** ámbar.
- **Crítico:** rojo con pulso.
- **Seleccionada:** contorno y línea punteada hacia la vista ampliada.

Cada estado lleva siempre **icono + palabra**, no solo color.

### Recomendaciones (R)
- Se generan con reglas a partir de los estados, máximo 3, ordenadas por gravedad.
- Cada una trae:
  - título corto
  - duración
  - por qué (qué medida la activó)
  - tipo de animación
- Si todo está normal, se muestra una recomendación de mantenimiento: hidratarse, ejercicio diario o higiene de sueño.

| Disparador | Recomendación | Animación A |
|---|---|---|
| GSR alto o RMSSD bajo | Respiración 4-7-8 (2 min) | Figura respirando + círculo que crece y se encoge |
| Pulso alto en reposo | Pausa y sentarse (3 min) | Figura que se sienta + temporizador |
| Temperatura alta | Hidratarse y medir de nuevo en 30 min | Figura tomando agua + vaso que se llena |
| Actividad baja | Sesión de ejercicio de resistencia (ARED, 20 min) | Figura haciendo sentadillas + contador de repeticiones |
| Sueño corto | Ventana de descanso | Figura acostada + luna con cuenta regresiva |
| Glucosa fuera de rango | Comida o snack y volver a medir | Figura comiendo + pasos |
| Presión de cabina cayendo | Revisar sellos (protocolo) | Escotilla + lista de pasos |

### ECG
- Onda en vivo continua, con el pulso actual y un indicador de electrodo suelto.
- Siempre visible porque es la prueba más fuerte de que el hardware funciona.

### Vista 3D
- Se abre en el lugar de la vista ampliada, sin modal.
- Reutiliza el modelo 3D actual (react-three-fiber) con la cámara enfocada en la zona elegida.
- El botón «Volver a 2D» queda visible.

---

## 5. Implicaciones de diseño para los pasos 2–4

1. **Jerarquía:** I > zona en alerta > recomendación. Todo lo demás es secundario.
2. **Lenguaje:** nombre simple primero y nombre técnico después, por ejemplo «Sudor / estrés · GSR».
3. **Color de estado reservado:** el verde, el ámbar y el rojo solo se usan para estados, y la paleta de marca nueva no debe usarlos.
4. **Futurista pero legible:** líneas de holograma y brillo suave en el cuerpo y los bordes. El texto siempre va sobre un fondo sólido con contraste AA.
5. **Movimiento con sentido:** solo se anima lo que es información (la onda del ECG, el pulso de una alerta, la guía A). Se respeta `prefers-reduced-motion`.
6. **Áreas táctiles de 44 px o más** en las zonas del cuerpo y en los botones, por los guantes.

---

## 6. Plan de prueba de usabilidad (rápida, «guerrilla»)

- **Participantes:** 5. Pueden ser los 4 del equipo cruzados con otra persona que no haya visto la app, o amigos sin formación médica.
- **Duración:** 10 min cada uno, en voz alta («piensa en voz alta»).

| Tarea | Escenario | Éxito | Meta |
|---|---|---|---|
| 1 | «Acabas de despertar en la estación. ¿Estás bien?» | Dice el estado correcto | ≤ 3 s |
| 2 | «La app te avisa algo. ¿Qué parte de tu cuerpo es?» | Toca la zona correcta | ≤ 8 s, 0 errores |
| 3 | «¿Tu pulso es normal?» | Lee el valor y su estado | ≤ 10 s |
| 4 | «Mira tu corazón en 3D» | Abre el 3D | Sin ayuda |
| 5 | «¿Qué deberías hacer ahora? Hazlo» | Toca la recomendación y sigue la animación | Completa ≥ 80 % |

- **Métricas:**
  - tasa de éxito > 80 %
  - errores < 15 %
  - satisfacción ≥ 4/5 en una pregunta final: «¿Lo usarías en una misión?»
- **Gravedad de los hallazgos:** 4 = bloquea, 3 = difícil, 2 = duda, 1 = cosmético. Lo de nivel 3–4 se arregla antes de la demo.
