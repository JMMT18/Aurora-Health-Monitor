# Inventario completo: todo lo que se puede medir

Generado el 2026-11-15 a partir de los CSV de `DATASET_MIO` y de los 6 sensores del prototipo.
- **Sensores:** la prueba de que el sistema funciona en vivo.
- **Datasets:** el respaldo científico, la calibración de umbrales y la referencia con datos reales de astronautas y personas.

## Resumen

| Fuente | Qué aporta | Nº de variables |
|---|---|---|
| Sensores del prototipo (6) | Medición en vivo | 26 parámetros (directos + derivados) |
| OSD-575 · Química sanguínea (CMP) | Sangre de astronautas Inspiration4 | 19 |
| OSD-575 · Panel cardiovascular | Inflamación y riesgo cardiovascular | 9 |
| OSD-575 · Panel inmune Eve | Citocinas | 71 |
| OSD-575 · Panel inmune Alamar | Proteínas inmunes | 203 |
| OSD-569 · Hemograma (CBC) | Células de la sangre | 20 |
| GLDS-561 · Direct RNA-seq | Expresión génica | ~61 852 genes |
| OSD-817 · Neuro-ocular (SANS) | Presiones del ojo y cerebro, nervio óptico | 3 presiones + 9 marcadores de tejido |
| OSD-573 · Microbioma de cabina | Microbios y sus funciones | 1396 taxones + 493 rutas |
| MMASH | Sueño, corazón, actividad, hormonas, cuestionarios | ~60 |
| SWELL-KW | Estrés (pulso, HRV, piel) | 4 |
| sleepstudy | Tiempo de reacción vs. falta de sueño | 2 |
| Fitbit | Actividad física, sueño, peso | ~20 |

---

## 1. Sensores del prototipo (en vivo)

### AD8232 · ECG
| Parámetro | Unidad | Tipo | Dataset para comparar o calibrar |
|---|---|---|---|
| Onda de ECG | mV (señal) | Directo | — |
| Frecuencia cardíaca | lpm | Derivado | SWELL `HR`, MMASH `HR`, Fitbit `heartrate_seconds` |
| Intervalos RR (tiempo entre latidos) | ms | Derivado | MMASH `RR.csv` (`ibi_s`) |
| HRV · RMSSD | ms | Derivado | SWELL `RMSSD`, MMASH (calculado de RR) |
| HRV · SDNN, pNN50 | ms, % | Derivado | MMASH (calculado de RR) |
| Frecuencia respiratoria (derivada del ECG) | resp/min | Derivado | — |
| Ritmo irregular o latidos prematuros | evento | Derivado | — |
| Electrodo suelto | evento | Directo (LO+/LO−) | — |

### GSR Sensor V1.2 · Respuesta galvánica de la piel
| Parámetro | Unidad | Tipo | Dataset |
|---|---|---|---|
| Resistencia y conductancia de la piel | kΩ, µS (relativa) | Directo | SWELL `SCL` |
| Nivel base (SCL) | µS / % sobre línea base | Derivado | SWELL `SCL` por condición |
| Picos de respuesta (SCR) por minuto | nº/min | Derivado | — |

### Termistor (circuito propio) · Temperatura corporal
| Parámetro | Unidad | Tipo | Dataset |
|---|---|---|---|
| Temperatura de la piel | °C | Directo | — |
| Fiebre o hipotermia | evento | Derivado | — |
| Ritmo circadiano de temperatura | °C/24 h | Derivado | MMASH (melatonina y cortisol como referencia del ciclo) |

### BMP180 (+ termistor ambiental) · Cabina
| Parámetro | Unidad | Tipo | Dataset |
|---|---|---|---|
| Presión de cabina | hPa / kPa | Directo | — |
| Velocidad de caída de presión (fugas) | hPa/min | Derivado | — |
| Temperatura de cabina | °C | Directo | — |
| Falla de sensor (validación por software) | evento | Derivado | — |
| Estrés térmico (piel vs. cabina + GSR) | alerta | Combinado | — |

### ADXL345 · Acelerómetro
| Parámetro | Unidad | Tipo | Dataset |
|---|---|---|---|
| Aceleración en 3 ejes | g | Directo | MMASH `Axis1–3`, `Vector Magnitude` |
| Pasos | pasos | Derivado | MMASH `Steps`, Fitbit `TotalSteps` |
| Nivel de actividad y minutos activos/sedentarios | min | Derivado | Fitbit `VeryActive/FairlyActive/LightlyActive/SedentaryMinutes` |
| Gasto energético estimado | kcal, METs | Derivado | Fitbit `Calories`, `METs` |
| Postura (acostado/sentado/de pie) | categoría | Derivado | MMASH `Inclinometer Lying/Sitting/Standing` |
| Sueño por actigrafía (duración, despertares) | h, nº | Derivado | MMASH `sleep.csv`, Fitbit `sleepDay`, `minuteSleep` |
| Caídas / golpes / caída libre | evento | Directo (interrupción del chip) | — |
| Temblor | Hz | Derivado | — |
| Cumplimiento de la rutina de ejercicio | % meta, racha | Derivado | Fitbit |

### Combinados (varios sensores)
| Indicador | Sensores | Dataset |
|---|---|---|
| **Índice de estrés 0–100** | ECG (HRV) + GSR + acelerómetro | SWELL (relajado / normal / interrupciones / presión de tiempo) |
| Fatiga acumulada | HRV + sueño | MMASH |
| Calidad del sueño | Acelerómetro + pulso + temperatura | MMASH |
| Esfuerzo durante el ejercicio | Acelerómetro + pulso | Fitbit |
| Fiebre o infección | Temperatura + pulso en reposo | — |

### Entrada manual o prueba dentro de la app (sin sensor)
| Parámetro | Cómo | Dataset |
|---|---|---|
| Presión arterial | Manual | — |
| Glucosa | Manual | OSD-575 `glucose` |
| Horas de sueño | Manual (o automático con ADXL345) | MMASH, Fitbit |
| Estado de ánimo | Manual | MMASH (PANAS, STAI, estrés diario) |
| Tiempo de reacción | Test de toque en la app | sleepstudy `Reaction` |

---

## 2. OSD-575 · Sangre de astronautas Inspiration4

4 tripulantes (C001–C004) en 7 momentos: L-92, L-44 y L-3 (antes del lanzamiento), y R+1, R+45, R+82 y R+194 (después del regreso).

### Química sanguínea (CMP), 19 analitos
Cada uno trae valor, mínimo y máximo de referencia.

| Parámetro | Unidad |
|---|---|
| Albúmina | g/dL |
| Razón albúmina/globulina | razón |
| Fosfatasa alcalina | U/L |
| ALT (transaminasa, hígado) | U/L |
| AST (transaminasa, hígado/músculo) | U/L |
| Bilirrubina total | mg/dL |
| Razón BUN/creatinina | razón |
| Calcio | mg/dL |
| CO₂ (bicarbonato) | mmol/L |
| Cloro | mmol/L |
| Creatinina (riñón) | mg/dL |
| Filtración glomerular (eGFR, fórmula afroamericana) | mL/min/1.73 m² |
| Filtración glomerular (eGFR, fórmula general) | mL/min/1.73 m² |
| Globulinas | g/dL |
| Glucosa | mg/dL |
| Potasio | mmol/L |
| Proteína total | g/dL |
| Sodio | mmol/L |
| Nitrógeno ureico (BUN) | mg/dL |

### Panel cardiovascular (Eve), 9 proteínas
Cada una trae concentración y porcentaje.

| Parámetro | Unidad |
|---|---|
| α2-macroglobulina | ng/mL |
| AGP (glicoproteína ácida α1, inflamación) | ng/mL |
| CRP (proteína C reactiva, inflamación) | pg/mL |
| Fetuina-A (calcificación vascular) | ng/mL |
| Fibrinógeno (coagulación) | ng/mL |
| Haptoglobina | ng/mL |
| L-selectina (adhesión de leucocitos) | pg/mL |
| PF4 (factor plaquetario 4) | ng/mL |
| SAP (amiloide sérico P) | pg/mL |

### Panel inmune Eve, 71 citocinas (pg/mL)
6CKINE, BCA-1, CTACK, EGF, ENA-78, EOTAXIN, EOTAXIN-2, EOTAXIN-3, FGF-2, FLT-3L, FRACTALKINE, G-CSF, GM-CSF, GROα, I-309, IFN-α2, IFNγ, IL-10, IL-12P40, IL-12P70, IL-13, IL-15, IL-16, IL-17A, IL-17E/IL-25, IL-17F, IL-18, IL-1RA, IL-1α, IL-1β, IL-2, IL-20, IL-21, IL-22, IL-23, IL-27, IL-28A, IL-3, IL-33, IL-4, IL-5, IL-6, IL-7, IL-8, IL-9, IP-10, LIF, M-CSF, MCP-1, MCP-2, MCP-3, MCP-4, MDC, MIG/CXCL9, MIP-1α, MIP-1β, MIP-1δ, PDGF-AA, PDGF-AB/BB, RANTES, SCD40L, SCF, SDF-1α+β, TARC, TGFα, TNFα, TNFβ, TPO, TRAIL, TSLP, VEGF-A

### Panel inmune Alamar, 203 proteínas (unidades NPQ, escala log2 relativa)
ACTIVIN-A, ACTIVIN-AB, ACTIVIN-B, AGER, AGRP, ANGPT1, ANXA1, BDNF, BMP10, BMP7, C1QA, CCL1, CCL13, CCL14, CCL15, CCL16, CCL17, CCL19, CCL2, CCL20, CCL22, CCL23, CCL24, CCL25, CCL28, CCL3, CCL4, CCL5, CCL7, CCL8, CD200, CD200R1, CD274, CD276, CD40, CD70, CD83, CD93, CEACAM5, CHI3L1, CLCF1, CLEC4A, CSF1, CSF2RB, CSF3, CSF3R, CST7, CTF1, CTLA4, CTSS, CX3CL1, CXADR, CXCL1, CXCL10, CXCL12, CXCL13, CXCL14, CXCL2, CXCL3, CXCL5, CXCL8, CXCL9, EGF, EPO, FAM3D, FASLG, FGF19, FGF2, FGF21, FGF23, FLT1, FLT3LG, FTH1, GDF15, GDF2, GFAP, GRN, GZMB, HGF, IFNA1;-IFNA13, IFNA2, IFNB1, IFNG, IFNL1, IFNW1, IL10, IL10RB, IL11, IL12B, IL12P70, IL12RB1, IL13, IL13RA2, IL15RA, IL16, IL17A, IL17B, IL17C, IL17F, IL17RB, IL18, IL18BP, IL18R1, IL19, IL1B, IL1R2, IL1RL1, IL1RN, IL20, IL22, IL23, IL27, IL2RA, IL2RB, IL32, IL33, IL34, IL35, IL36A, IL36G, IL39, IL3RA, IL4, IL4R, IL5, IL5RA, IL6, IL6R, IL7, IL7R, IL9, INHIBIN-A, INHIBIN-B, IRAK4, KDR, KITLG, LAG3, LAMP3, LCN2, LGALS9, LIF, LTBR, MDK, MERTK, MET, MICA, MICB, MIF, MMP10, MMP12, MMP3, MMP8, MMP9, MPO, MUC16, NCR1, NGF, OSM, PDCD1, PDGFA, PTX3, S100A12, S100A9, SCG2, SELE, SLURP1, SPP1, TAFA5, TGFB1, TGFB3, THPO, TIMP1, TIMP2, TLR3, TNF, TNFRSF11A, TNFRSF13C, TNFRSF14, TNFRSF17, TNFRSF18, TNFRSF1A, TNFRSF1B, TNFRSF4, TNFRSF8, TNFRSF9, TNFSF10, TNFSF11, TNFSF12, TNFSF13B, TNFSF15, TNFSF4, TNFSF8, TNFSF9, TREM1, TSLP, VCAM1, VEGFA, VEGFC, VEGFD, VSNL1, VSTM1, WNT16, WNT7A

---

## 3. OSD-569 · Hemograma de astronautas Inspiration4 (CBC), 20 parámetros
Mismos 4 tripulantes y 7 momentos. Cada parámetro trae valor, mínimo y máximo de referencia.

| Parámetro | Unidad |
|---|---|
| Basófilos (absoluto) | células/µL |
| Eosinófilos (absoluto) | células/µL |
| Linfocitos (absoluto) | células/µL |
| Monocitos (absoluto) | células/µL |
| Neutrófilos (absoluto) | células/µL |
| Basófilos (%) | % |
| Eosinófilos (%) | % |
| Hematocrito | % |
| Hemoglobina | g/dL (la columna dice % por error) |
| Linfocitos (%) | % |
| MCH (hemoglobina por glóbulo) | pg |
| MCHC (concentración de hemoglobina) | g/dL |
| MCV (tamaño del glóbulo rojo) | fL |
| Monocitos (%) | % |
| MPV (tamaño de plaquetas) | fL |
| Neutrófilos (%) | % |
| Plaquetas | miles/µL |
| RDW (variación de tamaño de glóbulos rojos) | % |
| Glóbulos rojos | millones/µL |
| Glóbulos blancos | miles/µL |

## 4. GLDS-561 · Expresión génica (Direct RNA-seq, Inspiration4)
- **~61 852 genes** (IDs de Ensembl) en **13 comparaciones** (después del vuelo vs. antes, y recuperación vs. R+1).
- Por gen: conteos por tripulante y momento (featureCounts y salmon), **log2 fold change**, **p-value** y **p ajustado** (DESeq2 y pipeline-transcriptome-de).

---

## 5. OSD-817 · Neuro-ocular (SANS), estudio en animales
| Parámetro | Unidad |
|---|---|
| Presión intraocular (IOP) | mmHg, por hora |
| Presión intracraneal (ICP) | mmHg, por hora |
| Gradiente translaminar (TLPG = IOP − ICP) | mmHg, por hora |
| Muerte celular en retina (TUNEL) | conteos, normalizado |
| Transporte axonal (CTB) | conteos, normalizado |
| Expresión en cabeza del nervio óptico: colágeno IV (COLIV), laminina (LAM), fibronectina (FN), GFAP, TNF-α, TLR4 | puntaje |
| Axones normales y anormales del nervio óptico (PPD) | conteos por corte |

Son 16 animales, 32 ojos, en 6 grupos.

## 6. OSD-573 · Microbioma de la cápsula Inspiration4
| Parámetro | Detalle |
|---|---|
| Abundancia de microbios (MetaPhlAn) | 1396 taxones (de reino a especie) en 38 hisopados |
| Rutas metabólicas de los microbios | 493 rutas, en CPM |

---

## 7. MMASH · Sueño, corazón, actividad y hormonas (22 personas sanas, ~24 h)
| Archivo | Variables |
|---|---|
| `RR.csv` | Intervalo entre latidos (`ibi_s`), día, hora |
| `Actigraph.csv` | Aceleración 3 ejes (`Axis1–3`), `Vector Magnitude`, `Steps`, `HR`, postura (`Inclinometer Lying/Sitting/Standing/Off`) |
| `sleep.csv` | Hora de acostarse y levantarse, inicio del sueño, latencia, eficiencia, minutos en cama, tiempo total dormido (TST), vigilia tras dormirse (WASO), nº de despertares, duración media de despertares, índice de movimiento, índice de fragmentación |
| `Activity.csv` | Actividades registradas (tipo, inicio, fin, día) |
| `saliva.csv` | **Cortisol** y **melatonina** (antes de dormir y al despertar) |
| `questionnaire.csv` | Cronotipo (MEQ), ansiedad estado/rasgo (STAI1, STAI2), calidad de sueño (Pittsburgh), estrés diario, inhibición/activación conductual (BIS/BAS: bis, drive, fun, reward), afecto positivo y negativo a lo largo del día (PANAS) |
| `user_info.csv` | Sexo, peso, altura, edad |

## 8. SWELL-KW · Estrés en trabajo de oficina (25 personas, por minuto)
| Variable | Detalle |
|---|---|
| `HR` | Frecuencia cardíaca |
| `RMSSD` | Variabilidad cardíaca |
| `SCL` | Conductancia de la piel |
| `Condition` | R = relajación, N = normal, I = interrupciones, T = presión de tiempo |

## 9. sleepstudy · Privación de sueño (18 personas, 10 días)
| Variable | Detalle |
|---|---|
| `Reaction` | Tiempo de reacción medio (ms) |
| `Days` | Días con restricción de sueño (0–9) |

## 10. Fitbit · Actividad física (~35 usuarios, 2 meses de 2016)
| Frecuencia | Variables |
|---|---|
| Por día | Pasos, distancia (total, tracker, registrada, muy activa, moderada, ligera, sedentaria), minutos muy activos / bastante activos / ligeramente activos / sedentarios, calorías |
| Por hora | Pasos, calorías, intensidad total y media |
| Por minuto | Pasos, calorías, intensidad, METs, sueño (estado por minuto) |
| Por segundo | Frecuencia cardíaca |
| Sueño por día | Minutos dormido, minutos en cama, nº de registros de sueño |
| Peso | Peso (kg/lb), IMC, % de grasa, si fue manual |

---

## 11. Fuentes de la lista no descargadas
| Fuente | Qué mediría | Falta |
|---|---|---|
| NASA DONKI API | Eventos de partículas solares (radiación) | Clave propia de api.nasa.gov |
| EchoNet-Dynamic | Fracción de eyección del corazón (LVEF) en ecocardiogramas | Registro en Stanford |
