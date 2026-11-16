# Aurora: monitor de salud

Dashboard web (React + Vite) del reto NASA Space Apps 2026 «Health Monitoring Software».

**Versión 2 (rediseño de la Pantalla 1)**: cuerpo anatómico 2D clicable, zona ampliada en 2D o 3D con sus medidas, ECG en vivo, recomendaciones y guía animada. El diseño está en [`../docs/diseno/`](../docs/diseno) (UX, sistema visual, marca y QA).

Hoy corre con **datos simulados**. Cada 75 s repite un evento de estrés para mostrar el flujo de alerta.

- **Escenarios de demo:** el selector de la barra superior («Simulated data · scenario») activa cada situación de `RECOMENDACIONES_PARAMETROS.md`: fiebre, estrés térmico, fuga de cabina, caída, electrodo suelto, glucosa baja con temblor, deuda de sueño, presión baja, bradicardia, sedentarismo, cabina fría y ánimo bajo.
- **Test de tiempo de reacción:** se abre desde la tarjeta «Reaction time» (zona Head) o desde la recomendación. Son 5 intentos y el promedio se guarda como la medida.

## Cómo correrlo

```bash
npm install
npm run dev
```

## Estructura (v2)

```
src/
  App.jsx                  # layout de la Pantalla 1
  App.css                  # estilos v2 (tokens en styles/tokens.css)
  data/vitals.js           # medidas, umbrales, zonas del cuerpo, recomendaciones
  hooks/useVitals.js       # simulación + mezcla con los datos reales
  hooks/useEsp32.js        # lectura del ESP32 por USB serial (Web Serial)
  v2/
    BodyMap.jsx            # cuerpo 2D (SVG del atlas) con 6 zonas e insignias de estado
    ZonePanel.jsx          # zona ampliada: 2D recortado o 3D (BodyParts3D) + tarjetas de medidas
    Panels.jsx             # barra superior, estado general (I), ECG, recomendaciones (R)
    GuidePanel.jsx         # animación y pasos de la recomendación (A), incluida la confirmación tras una caída
    ReactionTest.jsx       # test de tiempo de reacción (5 intentos)
  anatomy/                 # visor anatómico 2D/3D (React + Three.js), adaptado de "3D Models/"
public/
  models/                  # BodyParts3D v4.0 (~90 MB; el 3D solo se descarga al pulsar «Ver en 3D»)
  ATTRIBUTION.md           # atribución CC BY 4.0 (obligatoria)
```


## Licencia del modelo anatómico

El modelo 3D es **BodyParts3D v4.0**, © The Database Center for Life Science (DBCLS), con licencia **CC BY 4.0**. Hay que mantener el crédito visible: va en el pie de la app y en `public/ATTRIBUTION.md`.

## Conectar el ESP32 (USB serial)

La app lee el ESP32 por el cable USB con **Web Serial**. No usa WiFi.

1. Conecta el ESP32 por USB y cierra cualquier monitor serial: `idf.py monitor`, `tools/ecg_serial_monitor.html` o el de Arduino. El puerto solo lo puede usar un programa a la vez.
2. Corre la app con `npm run dev` y ábrela en **Chrome o Edge** en `http://localhost:5173`. Web Serial no existe en Firefox ni en Zen, y tampoco funciona dentro del link publicado.
3. Pulsa **Connect ESP32 (USB)** en la barra superior y elige el puerto del ESP32 (CP210x / CH340).
4. Deja los dedos quietos en el GSR durante **30 s**: con eso se fija la línea base. Con **Recalibrate GSR** se repite.

Qué se lee del firmware (115200 baudios, ver `main/ecg_task.c` y `main/main.c`):

| Línea serial | Frecuencia | Se usa para |
|---|---|---|
| `E:n0,v1,…,v10` | 20 líneas/s (ECG a **200 Hz**) | Onda real en «Live ECG», QT y EDR por amplitud R-S |
| `R:n` | cada latido | Tiempo exacto de cada pico R (índice de muestra, resolución 5 ms) → RR, HRV, espectro |
| `M:bpm,rr,rmssd,sdnn,pnn50,resp,irregular` | **cada 2 s** (antes 15 s) | Respaldo del firmware; latido irregular |
| `L:1` / `L:0` | al cambiar | Electrodo suelto / reconectado |
| `G:n0,v1,…,v10` | 200 Hz | Modo sEMG |
| `S:activity,presiónPa,tempC,gsr` | cada 1 s | Temperatura, presión de cabina, GSR (ADC → µS → % sobre la línea base y picos SCR) y movimiento |

La app manda `MODE EMG` / `MODE ECG` por el mismo cable (`main/serial_cmd.c`). Con el firmware anterior, que imprime un número suelto por línea, también funciona, pero a 25 Hz y sin latidos exactos.

### Análisis cardíaco (botón «Analysis» del panel ECG)

`src/lib/hrv.js` implementa las fórmulas del equipo y `src/hooks/useCardiac.js` las recalcula **cada 2 s**:

| Grupo | Medidas | Datos usados |
|---|---|---|
| Frecuencia cardíaca | BPM medio (promedio de 60000/RRᵢ) | latidos de los últimos 10 s |
| Dominio del tiempo | RR medio, SDNN, RMSSD, SDSD, NN50, pNN50 | intervalos NN del último minuto (sin artefactos ni ectópicos) |
| Poincaré | SD1, SD2, SD2/SD1, área S (con gráfico) | ídem |
| Baevsky | Mo, AMo, MxDMn, SI (clases de 50 ms) | ídem |
| Frecuencia | VLF, LF, HF, LFnu, HFnu, LF/HF (con gráfico) | NN de los últimos 5 min, spline a 4 Hz, ventana de Hann. LF necesita ≥ 2 min y VLF ≥ 5 min |
| Morfología | QT (método de la tangente), QTc de Bazett, Fridericia y Framingham | ECG a 200 Hz del último minuto |
| EDR | Respiración por modulación de amplitud R-S (0.1–0.5 Hz) | ídem |
| sEMG | MAV, RMS, WL, MNF | últimas 256 muestras en modo sEMG |

- **Pruebas:** `node tests/hrv.test.mjs` valida cada fórmula con cálculos a mano y con señales de respuesta conocida (senos de 0.10 y 0.25 Hz, ECG sintético con QT = 400 ms y respiración de 15 rpm). Son 32 pruebas.
- **Sin ESP32:** un ECG sintético a 200 Hz alimenta el mismo cálculo, para la demo.
- **Con ESP32:** el pulso, la HRV y la respiración que muestra la app salen de este cálculo, más preciso que el del firmware.

- **Etiqueta LIVE:** las tarjetas con datos del ESP32 la muestran. El resto sigue simulado o manual: pasos, glucosa, presión arterial, sueño, caídas, temblor y temperatura de cabina.
- **Escenarios de demo:** mientras hay conexión, el selector se oculta.

**Notas sobre el firmware:**
- `wifi_connect_sta()` y `http_api_start()` en `main.c` ya no hacen falta para la app. Si no hay red, el ESP32 reintenta 5 veces antes de seguir; se pueden comentar para que arranque más rápido.
- **GSR:** la conversión a µS supone que el módulo da ~2048 sin dedos. Se ajusta con el potenciómetro, o con `GSR_CAL` en `src/hooks/useEsp32.js`.
- **Temperatura:** el termistor debe estar calibrado contra un termómetro clínico para que los umbrales de temperatura corporal tengan sentido (ver [`docs/RECOMENDACIONES_PARAMETROS.md`](../docs/RECOMENDACIONES_PARAMETROS.md)).

**Probar sin hardware**, solo en `npm run dev`: en la consola del navegador, `__auroraSerial('S:5,101250,36.9,1700')`, `__auroraSerial('M:78,769,38,52,14,15,0')` o `__auroraSerial('2100')` inyectan líneas como si vinieran del puerto.
