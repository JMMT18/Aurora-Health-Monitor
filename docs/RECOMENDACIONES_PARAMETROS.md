# Manual de Recomendaciones y Protocolos de Actuación por Parámetro

Guía técnica y clínica de actuación para cada parámetro listado en [INVENTARIO_PARAMETROS.md](./INVENTARIO_PARAMETROS.md), diseñada para distinguir entre **fallos técnicos de sensor** y **alertas fisiológicas/ambientales reales**, e integrarse directamente con el visor anatómico 2D/3D de la app (`HumanBody2D` / `HumanBody3D`).

> **Umbrales alineados con la app.** Los valores de atención/crítico de este documento son los mismos de `Proyecto_Nasa/webapp/src/data/vitals.js` y de `PRODUCT.md`. Si se cambia uno, hay que cambiar el otro. La sección 5 lista qué recomendación de la app dispara cada regla.

> **Nota:** Esta guía tiene fines educativos y de apoyo en monitoreo para el prototipo del reto; no sustituye diagnóstico ni atención médica profesional ante emergencias reales. Toda indicación de medicamentos, suplementos o dosis es una sugerencia para **consultar con el médico de vuelo**, no una instrucción directa al tripulante.

---

## 1. Sensores del Prototipo (Medición en Vivo)

### 1.1 AD8232 · ECG y Dinámica Cardiorrespiratoria
**Sistema 2D/3D asociado:** `circulatory` (`Heart`, `Aorta`) y `respiratory` (`Left lung`, `Right lung`).

| Parámetro con problema | Umbral / Condición de alerta | Qué hacer (Recomendación al usuario / tripulante) | Qué hacer si es fallo de sensor |
| :--- | :--- | :--- | :--- |
| **Electrodo suelto (`LO+` / `LO−`)** | Pin `LO+` o `LO−` en alto (`1`) o señal saturada en `0 V` / `3.3 V` | **Pausar cálculo de FC/HRV** para evitar falsas alarmas. Mostrar aviso en pantalla: *"Reajustar los 3 electrodos y limpiar sudor/grasa de la piel"*. | Revisar el conector jack 3.5 mm del AD8232 y reemplazar parches con hidrogel seco. |
| **Frecuencia cardíaca (`HR`) alta (Taquicardia)** | Atención `> 100 lpm` · crítico `> 120 lpm`, en reposo (`ADXL345` en sentado/acostado) | 1. Cruzar con acelerómetro: si no hay esfuerzo físico, **pausa sentado** y respiración lenta. La respiración 4-7-8 dura 19 s por ciclo (≈ 3 resp/min); la resonante 5-5 da 6 resp/min.<br>2. Hidratación oral (`250–500 mL` con electrolitos).<br>3. Si supera `120 lpm` en reposo por `> 10 min` o hay mareo/dolor torácico, reposo absoluto y alerta médica. | Filtrar picos dobles (onda T alta detectada como complejo R) imponiendo un periodo refractario mínimo de `250 ms` entre complejos QRS. |
| **Frecuencia cardíaca (`HR`) baja (Bradicardia)** | Atención `< 60 lpm` · crítico `< 50 lpm` despierto (o `< 40 lpm` dormido), más relevante con fatiga o mareo | Evaluar temperatura cutánea (descartar hipotermia) y ejecutar el test de **Tiempo de reacción** en la app. Si hay mareo, sentarse o recostarse elevando las piernas. | Verificar que no se pierdan ondas R de baja amplitud; ajustar ganancia o umbral adaptativo tipo Pan-Tompkins. |
| **HRV bajo (`RMSSD`, `SDNN`, `pNN50`)** | `RMSSD`: atención `< 25 ms` · crítico `< 15 ms` (la app usa RMSSD). Complementarios: `SDNN < 30 ms`, `pNN50 < 3%` o caída `> 30%` bajo la línea base (SWELL/MMASH) | Indica **sobrecarga simpática, estrés o recuperación incompleta**:<br>• Reducir carga cognitiva y física las siguientes `4 h`.<br>• Hacer micro-pausa de `15 min` y adelantar hora de sueño.<br>• Evitar cafeína y pantallas brillantes antes de dormir. | Descartar artefactos de movimiento o latidos ectópicos: filtrar intervalos `RR` que difieran `> 20%` del intervalo previo o queden fuera de `300–2000 ms`. |
| **Frecuencia respiratoria derivada del ECG (`EDR`)** | Atención `> 20` o `< 12 resp/min` · crítico `> 25` o `< 8 resp/min`, en reposo | • Si `> 20 resp/min`: revisar presión de cabina (`BMP180`) y conductancia (`GSR`); iniciar respiración diafragmática lenta.<br>• Si `< 8 resp/min`: disparar alerta sonora/vibratoria si ocurre durante el sueño o con presión de cabina baja. | Congelar estimación de EDR cuando el `ADXL345` detecte movimiento activo; requiere ventanas limpias de `>= 30 s`. |
| **Ritmo irregular o latidos prematuros** | `RR < 0.75 × RR_medio` seguido de pausa compensatoria (`> 3 eventos/min`) | Suspender ejercicio intenso, hidratar, revisar `Potasio` y `Calcio` si hay analítica disponible y guardar traza cruda de `30 s` de la onda ECG (`mV`) para revisión médica. | Verificar que `LO+/LO−` estén en `0` y descartar golpes mecánicos simultáneos en el acelerómetro. |

---

### 1.2 GSR Sensor V1.2 · Respuesta Galvánica de la Piel
**Sistema 2D/3D asociado:** `nervous` (sistema nervioso autónomo) y `integumentary` (`Skin FJ2810`).

| Parámetro con problema | Umbral / Condición de alerta | Qué hacer (Recomendación) | Qué hacer si es fallo de sensor |
| :--- | :--- | :--- | :--- |
| **Nivel base (`SCL`) elevado** | Atención `> +20 %` · crítico `> +50 %` sobre la línea base personal en reposo (condición `I` o `T` de SWELL-KW) | Señal de **estrés sostenido, interrupciones constantes o presión de tiempo**:<br>1. Activar modo foco (`25 min` sin notificaciones).<br>2. Realizar relajación muscular progresiva (`3 min`).<br>3. Si `BMP180` marca temperatura de cabina alta, activar ventilación (diferenciar sudor térmico de estrés emocional). | Si cae a `0 µS` (circuito abierto), recolocar las bandas en las falanges medias de los dedos índice y medio sin cortar la circulación. |
| **Picos de respuesta (`SCR`) frecuentes** | Atención `> 8 picos/min` · crítico `> 14 picos/min`, sin esfuerzo físico | Indica **sobresaltos, hipervigilancia o dolor agudo**: dividir la tarea en pasos cortos, descansar la vista `2 min` y revisar el `Índice de estrés 0–100`. | Aplicar filtro paso bajo (`1–2 Hz`) para suprimir ruido eléctrico (`50/60 Hz`) y tirones del cable al escribir. |

---

### 1.3 Termistor Corporal · Temperatura corporal

> **Dónde se mide.** La piel normal está entre unos 32 y 35 °C, por debajo de la temperatura interna (~37 °C). Por eso la app trata el termistor como **temperatura corporal**: va en la frente (o la axila) y se calibra contra un termómetro clínico (calibración de dos puntos) para estimar la temperatura interna. Sin esa calibración, los umbrales de esta tabla no aplican a la lectura cruda de piel.
**Sistema 2D/3D asociado:** `integumentary`, `circulatory` (perfusión periférica) y respuesta inmune.

| Parámetro con problema | Umbral / Condición de alerta | Qué hacer (Recomendación) | Qué hacer si es fallo de sensor |
| :--- | :--- | :--- | :--- |
| **Fiebre / Hipertermia** | Temperatura corporal calibrada: atención `> 37.2 °C` · crítico `> 38.0 °C` (o `+1.2 °C` sobre basal en reposo) | 1. Cruzar con `HR` en reposo: si sube el pulso (~`10 lpm/°C`), emitir **alerta de posible infección o golpe de calor**.<br>2. Retirar capas de ropa, hidratar con líquidos frescos y suspender ejercicio.<br>3. Si hay CBC/CMP, revisar `Glóbulos blancos`, `Neutrófilos` y `CRP`. | Lecturas `> 43 °C` o `< 15 °C` indican circuito abierto o corto en el divisor NTC; revisar soldadura y reubicar sensor. |
| **Hipotermia / Vasoconstricción** | Temperatura corporal calibrada: atención `< 36.1 °C` · crítico `< 35.0 °C` (o caída `> 1.5 °C` en `30 min`) | • Si la cabina está fría (`< 18 °C`): abrigar extremidades y activar movimiento suave (`ADXL345`).<br>• Si la cabina está templada pero `GSR` y `HR` están altos: es **vasoconstricción simpática por estrés agudo**; hacer respiración lenta y calentar manos. | Fijar el termistor con cinta hipoalergénica aislada de corrientes de aire directas. |
| **Ritmo circadiano de temperatura (`°C/24 h`) alterado** | Amplitud `< 0.4 °C` en 24 h o pico mínimo desfasado del horario de sueño | Indica **cronodisrupción** (turnos o vuelo espacial):<br>• Luz brillante/azul `30 min` justo al despertar.<br>• Oscuridad y cabina fresca (`18–20 °C`) `1 h` antes de dormir (en sintonía con curva de `melatonina` y `cortisol` de MMASH). | Exigir mínimo `18 h` válidas continuas antes de evaluar amplitud circadiana. |

---

### 1.4 BMP180 (+ Termistor Ambiental) · Cabina
**Sistema 2D/3D asociado:** `respiratory` (`Trachea`, `Bronchi`, `Lungs`) y `nervous` (riesgo de hipoxia).

| Parámetro con problema | Umbral / Condición de alerta | Qué hacer (Recomendación de Seguridad) | Qué hacer si es fallo de sensor |
| :--- | :--- | :--- | :--- |
| **Presión de cabina baja** | Atención `< 962 hPa` (−5 % de 101.3 kPa) · crítico `< 912 hPa` (−10 %). Si el hábitat usa otra presión nominal, los porcentajes se aplican sobre esa | **Riesgo de hipoxia / despresurización:**<br>• Detener ejercicio físico inmediatamente.<br>• Verificar suministro de O₂ y sellado de cabina.<br>• Vigilar `HR`, `EDR` y aplicar test de `Tiempo de reacción`. | Validar rango hardware del BMP180 (`300–1100 hPa`); si entrega `0`, `NaN` o valor congelado, reiniciar bus I²C y emitir evento `Falla de sensor`. |
| **Velocidad de caída de presión (`hPa/min`) — Fuga** | Atención `> 0.5 hPa/min` · crítico `> 1.5 hPa/min`, calculada con promedios de 10 s para filtrar ruido | **ALERTA ROJA DE FUGA DE CABINA:** alarma sonora/visual prioritaria, aislar compuertas/válvulas y colocar oxígeno suplementario. | Usar pendiente de regresión móvil de `60 s` para evitar falsos positivos por apertura breve de escotilla/puerta. |
| **Temperatura de cabina extrema** | Atención `> 28 °C` o `< 17 °C` · crítico `> 32 °C` o `< 15 °C` | • `> 28 °C`: activar ventilación, hidratar con `250 mL/h` y bajar intensidad física.<br>• `< 17 °C`: activar calefacción y proteger manos/pies para no perder motricidad fina. | Si la diferencia entre el termistor ambiental y el termómetro interno del BMP180 supera `3 °C`, marcar `Falla de sensor` y usar la lectura consistente. |
| **Estrés térmico combinado** | Cabina `> 27 °C` + temperatura corporal `> 37.2 °C` + `GSR > +20 %` + `HR > 100 lpm` | **Riesgo de agotamiento térmico:** detener esfuerzo físico de inmediato, enfriar cuello y muñecas, rehidratar con electrolitos y descansar hasta que `HR < 85 lpm`. | Confirmar validez simultánea de los tres sensores antes de disparar alerta combinada. |

---

### 1.5 ADXL345 · Acelerómetro, Postura, Sueño y Actividad
**Sistema 2D/3D asociado:** `skeletal` (`Vertebral column`, `Pelvis`, `Femur`) y `nervous`.

| Parámetro con problema | Umbral / Condición de alerta | Qué hacer (Recomendación) | Qué hacer si es fallo de sensor |
| :--- | :--- | :--- | :--- |
| **Caídas / Golpes / Caída libre** | Pico `> 3 g` o `FREE_FALL < 0.2 g` seguido de inmovilidad `> 10 s` | 1. Mostrar diálogo urgente en pantalla: **"¿Estás bien? (Confirmar en 15 s)"**.<br>2. Si no confirma o se altera abruptamente la `HR`, activar **emergencia por caída/traumatismo**.<br>3. Si confirma, verificar dolor osteoarticular y mareo. | Si después del golpe la magnitud del vector queda completamente inmóvil sin micro-respiración, el dispositivo se cayó al suelo (`Inclinometer Off`). |
| **Temblor (`Hz`) detectado** | Pico espectral FFT estable entre `4–12 Hz` en reposo | Evaluar **hipoglucemia, fatiga muscular aguda, frío, ansiedad o exceso de cafeína**. Recomendar ingesta de carbohidrato rápido si hay ayuno prolongado (`Glucosa`), abrigo y pausa en tareas de precisión. | Muestrear al menos a `50 Hz` y descartar vibración mecánica externa del vehículo/soporte. |
| **Sedentarismo / Bajo cumplimiento** | `> 90 min` continuos sentado/acostado despierto, o `< 60%` de meta de pasos/METs | **Contramedida contra desacondicionamiento óseo y cardiovascular:**<br>• Recordatorio cada `60–90 min`: `3 min` de sentadillas, estiramientos o ejercicio resistivo.<br>• Mantener carga mecánica diaria protege densidad ósea y volumen plasmático. | Recalibrar offset de `1 g` en reposo sobre superficie plana si falla la detección de postura (`Lying/Sitting/Standing`). |
| **Sueño por actigrafía alterado** | `TST < 6 h`, `WASO > 45 min`, eficiencia `< 80%` o `>= 5` despertares (MMASH/Fitbit) | • Programar **siesta corta de 20 min** antes de las `15:00 h`.<br>• Exigir test de **Tiempo de reacción (`sleepstudy`)** antes de tareas críticas.<br>• Bajar iluminación nocturna y temperatura de cabina (`18–20 °C`). | Si hay `0` movimiento durante horas junto con pérdida de señal `HR`, el usuario se quitó el sensor. |

---

### 1.6 Indicadores Combinados y Entrada Manual / App

| Parámetro con problema | Condición de alerta | Qué hacer en la aplicación / protocolo |
| :--- | :--- | :--- |
| **Índice de estrés (`0–100`)** | `60–79` (Alto) / `>= 80` (Crítico) | • **`60–79`:** Iniciar guía de biofeedback en pantalla mostrando caída de `GSR` y subida de `RMSSD` en tiempo real.<br>• **`>= 80`:** Posponer maniobras críticas, reducir estímulos sensoriales e hidratar. |
| **Fatiga acumulada (`HRV + sueño`)** | `>= 2` noches con `TST < 6 h` y `RMSSD` suprimido | Sustituir entrenamiento intenso (`VeryActiveMinutes`) por movilidad suave y prioridad absoluta de sueño de recuperación (`>= 8 h`). |
| **Tiempo de reacción (`Reaction`)** | Atención `> 320 ms` · crítico `> 400 ms`, o `> +20 %` sobre basal (referencia `sleepstudy`). Se mide con el test de 5 intentos de la app | **Alerta de déficit psicomotor:** restringir operación de equipos complejos o toma de decisiones en solitario hasta completar descanso/siesta. |
| **Presión arterial (manual)** | `>= 140/90 mmHg` (Alta) o `< 90/60 mmHg` (Hipotensión ortostática) | • **Alta:** reposo `10 min`, repetir toma, reducir sodio y realizar respiración lenta.<br>• **Baja:** beber `500 mL` de agua con electrolitos, contraer pantorrillas/muslos antes de levantarse y hacerlo de forma progresiva. |
| **Glucosa (manual, `mg/dL`)** | Hipoglucemia: atención `< 70` · crítico `< 54`. En ayunas: atención `100–125` · crítico `>= 126` (posprandial `>= 200`) | • **`< 70 mg/dL`:** Aplicar **regla 15-15** (tomar `15 g` de carbohidratos simples, esperar `15 min` y volver a medir).<br>• **Elevada:** hidratar con agua, caminata ligera `15–20 min` (`ADXL345`) y evitar azúcares refinados. |
| **Estado de ánimo (`PANAS` / `STAI`)** | Afecto negativo elevado, positivo muy bajo o `STAI > 45` | Activar módulo de soporte conductual: contacto con red de apoyo/tierra, bitácora emocional, música relajante y sesión de respiración guiada. |

---

## 2. Biomarcadores de los Datasets Espaciales y Clínicos

### 2.1 OSD-575 · Química Sanguínea CMP (19 analitos)

| Subgrupo y sistema 3D | Parámetros alterados | Causa probable | Qué hacer / Contramedida |
| :--- | :--- | :--- | :--- |
| **Renal y Electrolitos**<br>*(Urinario: `Kidneys`, `Ureters`, `Bladder`)* | `Creatinina`, `BUN`, `BUN/Creatinina > 20`, `eGFR < 60`, `Sodio`, `Potasio`, `Cloro`, `CO₂` | Deshidratación, caída de filtración glomerular o pérdida electrolítica; en microgravedad sube el riesgo de nefrolitiasis (cálculos). | 1. Hidratación dirigida (`~35 mL/kg/día` si `BUN/Creatinina > 20`).<br>2. **Si `Potasio < 3.5` o `> 5.0 mmol/L`:** activar vigilancia continua en **ECG (`AD8232`)** por riesgo arrítmico.<br>3. Ajustar aporte hídrico y **consultar con el médico de vuelo** la prevención de cálculos (p. ej. citrato de potasio). |
| **Hepático y Proteico**<br>*(Digestivo: `Liver`, `Gallbladder`, `Stomach`)* | `ALT`, `AST`, `Bilirrubina total`, `Fosfatasa alcalina`, `Albúmina`, `Proteína total`, `Globulinas`, `Razón A/G` | Sobrecarga hepática, inflamación biliar, déficit proteico (`Albúmina < 3.5 g/dL`) o daño muscular por ejercicio intenso (`AST` elevada aislada). | 1. Si `AST` sube sola tras pico de actividad en `ADXL345`, dar `48 h` de recuperación muscular.<br>2. Si suben `ALT + Bilirrubina`, revisar medicación/suplementos potencialmente hepatotóxicos.<br>3. Si `Albúmina` baja, revisar con el equipo médico y de nutrición el aporte de proteína (referencia habitual `1.2–1.5 g/kg/día`). |
| **Metabolismo Mineral Óseo**<br>*(Óseo: `Skeleton`)* | `Calcio > 10.2 mg/dL` + `Fosfatasa alcalina` alterada | En microgravedad o inmovilización prolongada aumenta la **resorción ósea**, liberando calcio a sangre y orina. | 1. Reforzar **entrenamiento resistivo de carga** diario (`ADXL345`).<br>2. Revisar con el médico de vuelo el aporte de vitamina D (y K2 si aplica).<br>3. Mantener alta diuresis/hidratación para proteger los riñones. |

---

### 2.2 OSD-575 · Panel Cardiovascular Eve (9 proteínas)
**Sistema 2D/3D asociado:** `circulatory` (`Heart`, `Arteries`, `Veins`).

- **Inflamación vascular (`CRP`, `AGP`, `SAP`, `α2-macroglobulina` elevados):**
  - *Qué hacer:* cruzar con temperatura corporal y `HR` en reposo; indicar reposo relativo, sueño de `>= 7.5 h`, nutrición antiinflamatoria (omega-3, antioxidantes) y seguimiento hasta regresar a la línea base pre-vuelo (`L-92`/`L-44`).
- **Activación plaquetaria y riesgo trombótico (`Fibrinógeno`, `PF4`, `L-selectina` elevados):**
  - *Qué hacer:* prevenir estasis venosa (incluyendo yugular por desplazamiento cefálico de fluidos): activar pausas de movilidad cada `45 min` (`ADXL345`), bombeo muscular de miembros inferiores e hidratación adecuada (verificando `Hematocrito`).
- **Calcificación vascular o hemólisis (`Fetuina-A` baja o `Haptoglobina` baja):**
  - *Qué hacer:* si `Haptoglobina` desciende junto con `Hemoglobina`/`Glóbulos rojos`, evaluar **hemólisis asociada al vuelo espacial**; reducir impactos mecánicos y verificar reservas de hierro, folato y B12.

---

### 2.3 OSD-569 · Hemograma Completo CBC (20 parámetros)
**Sistema 2D/3D asociado:** `circulatory` (sangre) y `skeletal` (médula ósea).

- **Serie roja (`Hematocrito`, `Hemoglobina`, `Glóbulos rojos`, `MCV`, `MCH`, `MCHC`, `RDW`):**
  - *`Hematocrito` y `Hemoglobina` elevados:* **hemoconcentración** por déficit de volumen plasmático/deshidratación; aplicar protocolo de carga de líquidos y sodio antes de esfuerzos o reentrada gravitacional.
  - *`Hemoglobina` baja ("anemia espacial") / `RDW` alto:* clasificar según `MCV` (`< 80 fL` déficit de hierro; `> 100 fL` déficit de B12/folato), ajustar metas de carga aeróbica y corregir micronutrientes.
- **Serie blanca (`Glóbulos blancos`, `Neutrófilos`, `Linfocitos`, `Monocitos`, `Eosinófilos`, `Basófilos` absolutos y `%`):**
  - *Índice `Neutrófilos / Linfocitos (NLR) > 3`:* marcador de **estrés fisiológico agudo, radiación o infección**; priorizar descanso inmune y vigilar la temperatura corporal.
    - **Dato real de Inspiration4 (OSD-569, calculado de `LSDS-7_..._CBC`):** en `R+1` el NLR fue `1.64`, `2.16`, `1.96` y `2.10` en los 4 tripulantes, dentro de lo normal. Subió respecto a `L-3` en C001 y C002. El valor más alto del dataset es `3.08`, antes del vuelo (C003, `L-44`). Por eso conviene vigilar el **cambio respecto a la línea base de cada persona**, no solo el umbral fijo.
  - *`Eosinófilos` o `Basófilos` elevados:* sospechar alergia o irritación ambiental en cabina; cruzar con filtros de aire y `OSD-573` (microbioma).
- **Plaquetas (`Plaquetas`, `MPV`):**
  - *`Plaquetas < 150 miles/µL`:* evitar actividades con riesgo de traumatismo/caída (`ADXL345`).
  - *`MPV` alto + `PF4` alto:* reforzar hidratación y movilidad venosa.

---

### 2.4 OSD-575 · Paneles Inmunes (Eve 71 citocinas + Alamar 203 proteínas) y GLDS-561 (RNA-seq)
**Sistema 2D/3D asociado:** `circulatory`, `nervous` y `respiratory`.

- **Tormenta o sesgo proinflamatorio (`IL-6`, `TNF-α`, `IL-1β`, `IFN-γ`, `IL-8/CXCL8`, `MCP-1/CCL2`, `IL-17A`, `CRP` elevados sin ascenso proporcional de `IL-10` o `IL-1RA`):**
  - *Qué hacer:* posible inflamación sistémica o reactivación viral latente por estrés/radiación; suspender entrenamiento exigente, reforzar sueño reparador y monitorear `Termistor` + `HR` cada `4 h`.
- **Proteínas neurogliales y vasculares en Alamar (`GFAP`, `BDNF`, `NGF`, `VSNL1`, `VCAM1`, `VEGFA`, `MMP9`):**
  - *Qué hacer:* si `GFAP` sube o `BDNF` cae, realizar prueba de **Tiempo de reacción (`sleepstudy`)** y revisar variables neuro-oculares (`OSD-817`); indicar descanso cognitivo seguido de ejercicio aeróbico moderado (estimula `BDNF`).
- **Expresión génica (`GLDS-561` · ~61,852 genes):**
  - *Qué hacer:* cuando rutas de **estrés oxidativo, inflamación o reparación de daño al ADN** presenten `log2 fold change` significativo (`p ajustado < 0.05`) tras el vuelo (`R+1`), programar vigilancia longitudinal (`R+45`, `R+82`, `R+194`) y dieta rica en antioxidantes hasta su normalización.

---

### 2.5 OSD-817 · Neuro-ocular / SANS

> **Ojo:** OSD-817 es un estudio en **animales**. Los umbrales de esta tabla (`IOP > 21 mmHg`, `ICP > 15–20 mmHg`) son **clínicos humanos**; el dataset sirve solo como referencia de la tendencia (cómo cambian IOP, ICP y TLPG), no para comparar valores absolutos.
**Sistema 2D/3D asociado:** `nervous` (`Brain`, ventrículos cerebrales, pares craneales / cabeza del nervio óptico).

| Parámetro con problema | Condición de alerta | Qué hacer / Contramedida |
| :--- | :--- | :--- |
| **Presión intraocular (`IOP > 21 mmHg`)** o **intracraneal (`ICP > 15–20 mmHg`)** | Redistribución cefálica de fluidos o congestión venosa | 1. Aplicar contramedidas de secuestro venoso en miembros inferiores (**LBNP** — presión negativa inferior — o manguitos en muslos).<br>2. En Tierra: dormir con cabecera elevada `15–30°` (verificar postura con `ADXL345`). |
| **Gradiente translaminar (`TLPG = IOP − ICP`) alterado** o aumento de `GFAP`, `TNF-α`, `TLR4`, `COLIV`, `LAM`, `FN`, `TUNEL` o caída de `CTB`/`PPD` | Riesgo de edema de disco óptico y daño axonal | Controlar estricto el **CO₂ de cabina** (la hipercapnia eleva la presión intracraneal), evitar maniobras de Valsalva/apnea en cargas pesadas y ejecutar chequeos visuales frecuentes en la app. |

---

### 2.6 OSD-573 · Microbioma de Cabina y MMASH · Hormonas Salivales
- **Microbioma de cabina (`OSD-573` · `1,396 taxones`, `493 rutas`):**
  - *Problema:* proliferación de patógenos oportunistas de piel/vía aérea o rutas de virulencia/biopelículas en hisopados.
  - *Qué hacer:* activar protocolo de desinfección de superficies de alto contacto, revisión/cambio de filtros HEPA, control de humedad de cabina y vigilancia respiratoria (`EDR` + temperatura corporal).
- **Cortisol y Melatonina en saliva (`MMASH`):**
  - *Problema:* `Cortisol` nocturno elevado o `Melatonina` suprimida antes de acostarse.
  - *Qué hacer:* eliminar luz azul `60 min` antes de dormir, cambiar iluminación de cabina a espectro cálido/ámbar nocturno y aplicar `10 min` de respiración lenta para atenuar el eje hipotálamo-hipófisis-adrenal.

---

## 3. Mapeo Directo de Alertas al Visor 2D y 3D

La app organiza el cuerpo en **zonas** (Head, Chest, Hand and wrist, Abdomen, Legs, Full body), cada una con su insignia de estado y sus puntos de medida en 2D y 3D. Esta tabla relaciona los sistemas anatómicos del modelo con los parámetros:

| Sistema en el visor (`id`) | Órganos clave 3D | Parámetros que disparan alerta visual en ese sistema |
| :--- | :--- | :--- |
| `circulatory` | `Heart`, `Aorta`, arterias y venas | `HR`, `RR`, `HRV`, latidos prematuros, `Presión arterial`, `OSD-575 Cardiovascular`, `OSD-569 Hemograma`, inmunidad inflamatoria |
| `nervous` | `Brain`, `Spinal cord`, `Peripheral nerves` | `GSR`, `Índice de estrés`, `Tiempo de reacción`, sueño/fatiga, `Cortisol/Melatonina`, `SANS (IOP/ICP/TLPG)`, `Temblor` |
| `respiratory` | `Trachea`, `Bronchi`, `Left/Right lung` | `Frecuencia respiratoria (EDR)`, `Presión de cabina y fugas (BMP180)`, riesgo microbiológico aéreo (`OSD-573`) |
| `digestive` | `Liver`, `Stomach`, `Gallbladder`, intestinos | `ALT`, `AST`, `Bilirrubina`, `Fosfatasa alcalina`, `Albúmina`, `Proteína total`, `Glucosa` |
| `urinary` | `Left/Right kidney`, `Ureters`, `Bladder`, `Urethra` | `Creatinina`, `BUN`, `eGFR`, `Sodio`, `Potasio`, `Cloro`, `CO₂`, deshidratación / riesgo de litiasis |
| `skeletal` | Cráneo, columna, costillas, pelvis, fémur | `Caídas / golpes (ADXL345)`, `Sedentarismo prolongado`, pérdida de masa ósea / `Calcio` sérico elevado |

---

## 4. Fuentes Pendientes de Integración (Sección 11 del Inventario)
- **NASA DONKI API** *(cuando se agregue API key de `api.nasa.gov`)*: si reporta **tormenta de partículas solares (SEP / clase X/S2+)**, emitir alerta preventiva de **radiación**, reforzar resguardo en zona blindada de la cápsula y registrar dosis para correlación posterior con `Hemograma (Linfocitos/NLR)` y `GLDS-561`.
- **EchoNet-Dynamic** *(cuando se integre ecocardiografía)*: si la **fracción de eyección (`LVEF`) cae `< 50%`** o desciende `>= 10%` respecto al basal, restringir esfuerzo físico, evaluar congestión de fluidos y activar seguimiento cardiológico prioritario.

---

## 5. Implementación en la app (Aurora v2)

Las reglas viven en `buildRecs()` de `Proyecto_Nasa/webapp/src/data/vitals.js`. La app muestra **las 3 más graves** y el bloque A anima la que se elija. Cada fila se puede probar con el selector **"Simulated data · scenario"** de la barra superior.

| Recomendación en la app (clave) | Se dispara cuando | Escenario de demo |
|---|---|---|
| Fall detected: are you OK? (`fall`) | Impacto `> 3 g` + inmovilidad. Cuenta regresiva de 15 s; sin respuesta → alerta a la tripulación (simulada) | Fall or impact |
| Cabin leak protocol (`leak`) | Caída de presión `> 0.5 hPa/min` | Cabin leak |
| Check seals and hatches (`hatch`) | Presión de cabina fuera de ±5 % | Cabin leak (al bajar) |
| Reattach your ECG electrodes (`electrodes`) | `LO+` / `LO−` activos: se pausan HR, HRV y respiración | Loose ECG electrode |
| Heat stress: cool down (`heat`) | Cabina `> 27 °C` + cuerpo `> 37.2 °C` + GSR `> +20 %` + HR `> 100` | Heat stress |
| Possible fever (`fever`) / Warm up (`cold`) | Temperatura corporal fuera de 36.1–37.2 °C | Fever / Cold cabin |
| Seated pause (`sit`) / Low heart rate check (`lowhr`) | HR `> 100` / HR `< 60` | Acute stress / Low heart rate |
| Slow diaphragmatic breathing (`slowbreath`) / Low breathing rate (`lowresp`) | Respiración `> 20` / `< 12` por minuto | Acute stress |
| 4-7-8 breathing (`breathe`) | GSR `> +20 %`, RMSSD `< 25 ms` o índice de estrés `>= 60` | Auto demo / Acute stress |
| High stress: slow down (`resonance`) | Índice de estrés `>= 80` (respiración resonante 5-5) | Auto demo |
| Reset your focus (`focus`) | SCR `> 8 picos/min` | Acute stress |
| Cabin is too hot / too cold (`ventilate` / `heatcabin`) | Cabina `> 28 °C` / `< 17 °C` | Heat stress / Cold cabin |
| Tremor detected (`tremor`) | Pico FFT `4–12 Hz` en reposo | Low glucose + tremor |
| 15-15 rule (`eat`) / High glucose (`glucosehigh`) | Glucosa `< 70` / `>= 100` en ayunas | Low glucose + tremor |
| Low / High blood pressure (`bplow` / `bphigh`) | `< 90/60` / `>= 120/80` (crítico `>= 140/90`) | Low blood pressure |
| Your reactions are slow (`slowreact`) | Último test `> 320 ms` | Sleep debt + fatigue |
| Take your reaction test (`reactiontest`) | Todavía no se hizo el test hoy (mantenimiento) | Siempre al inicio |
| Recovery day (`recovery`) | Sueño `< 6 h` + RMSSD `< 25 ms` | Sleep debt + fatigue |
| Start your rest cycle earlier (`sleep`) | Sueño `< 6 h` | Sleep debt + fatigue |
| Time to move (`move`) | Sentado `> 90 min` seguidos | Sitting too long |
| Resistance exercise (`squat`) | Actividad `< 50 %` de la meta (también como mantenimiento) | Sitting too long |
| Talk to someone (`support`) | Ánimo `<= 2` de 5 | Low mood |
| Drink 250 ml of water (`water`) | Mantenimiento cuando no hay alertas | Everything normal |

Los biomarcadores de la sección 2 (sangre, citocinas, genes, SANS, microbioma) no se miden en vivo: la app los usa como **referencia**, por ejemplo el sodio de OSD-575 en la zona Abdomen.
