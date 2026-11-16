# Links usados: datos, modelos, métodos y herramientas

Actualizado el 2026-11-15. Todos los links se comprobaron. Las listas de archivos de OSDR se consultaron en su API (`https://osdr.nasa.gov/osdr/data/osd/files/<número>`).
Al lado de cada fuente dice dónde quedó en `DATASET_MIO` y en Drive (Hackatones › NASA Space Apps › 26 › Datasets).

## 1. Sistema metabólico, sangre y cardiovascular

### OSD-575: panel metabólico y paneles de suero (glucosa, electrolitos, citocinas)
- **Enlace:** https://osdr.nasa.gov/bio/repo/data/studies/OSD-575
- **Ruta:** pestaña *Files* → *ALSDA Transformed Data* → `LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv`. En la misma carpeta están los paneles Cardiovascular (Eve), Immune (Eve) e Immune (Alamar).
- **En DATASET_MIO / Drive:** `Blood Serum/` (4 CSV)

### OSD-569: hematología (hemoglobina, glóbulos rojos y blancos, plaquetas)
- **Enlace:** https://osdr.nasa.gov/bio/repo/data/studies/OSD-569
- **Ruta:** pestaña *Files* → *ALSDA Transformed Data* → `LSDS-7_Complete_Blood_Count_CBC_TRANSFORMED.csv`
- **En DATASET_MIO / Drive:** `Whole Blood/CBC/`
- **Del mismo estudio:** `GLDS-561_long-readRNAseq_Direct_RNA_seq_Gene_Expression_Processed.xlsx` (expresión génica), convertido a 13 CSV en `Transcriptomics/Direct RNA-seq (GLDS-561)/`

### EchoNet-Dynamic: ecocardiogramas y fracción de eyección
- **Enlace:** https://echonet.github.io/dynamic/
- **Ruta:** al final de la página hay que registrarse con correo para acceder a los videos y a `FileList.csv` con la fracción de eyección (LVEF).
- **Ojo:** son pacientes en la Tierra (Stanford), no astronautas.
- **En DATASET_MIO:** no descargado (requiere registro).

## 2. Salud neuro-ocular (SANS)

### OSD-817: presión intracraneal e intraocular
- **Enlace:** https://osdr.nasa.gov/bio/repo/data/studies/OSD-817
- **Ruta corregida:** en *Files* no hay un `OSD-817_sup_1_...`. Los zips se llaman por ID de animal, por ejemplo `OSD-817_sup_827_Processed_Pressure_Data.zip` o `OSD-817_sup_7346_Processed_Pressure_Data.zip`. Los 11 zips solo traen **2 Excel distintos, repetidos**, con todos los animales.
- **En DATASET_MIO / Drive:** `Neuro-Ocular/OSD-817/`
  - `OSD-817_ICP_IOP_TLPG_hourly.csv`: los dos Excel juntos en una tabla, con 16 animales, 32 ojos y 9 827 mediciones por hora.
  - 4 CSV de tejido ocular (TUNEL, CTB, IHC, PPD).
- **Ojo:**
  - Es un estudio en animales.
  - Unas 145 mediciones tienen IOP ≈ 99.99 mmHg, que parece el tope del sensor; conviene filtrarlas.

## 3. Salud conductual, sueño y cognición

### MMASH (PhysioNet): sueño, cuestionarios, cortisol y melatonina
- **Descarga directa del ZIP (~24 MB):** https://physionet.org/static/published-projects/mmash/multilevel-monitoring-of-activity-and-sleep-in-healthy-people-1.0.0.zip
- **Ojo:** dentro hay otro zip (`MMASH.zip`) con una carpeta por usuario (`user_1` … `user_22`). `user_11` no tiene `saliva.csv`.
- **En DATASET_MIO:** `Sleep & Behavior/MMASH/` (153 CSV). **En Drive:** ya estaba en `Sleep/DataPaper/`, subido por el equipo.

### Sleepstudy: tiempos de reacción con privación de sueño
- **CSV directo:** https://raw.githubusercontent.com/vincentarelbundock/Rdatasets/master/csv/lme4/sleepstudy.csv
- **Columnas:** `Reaction` (ms), `Days` (días con restricción de sueño), `Subject`
- **En DATASET_MIO:** `Sleep & Behavior/Sleepstudy (sleep deprivation RT)/`. **En Drive:** `Sleep/Sleepstudy (sleep deprivation RT)/`

### SWELL-KW: estrés mental y fatiga (repositorio DANS)
- **Enlace:** https://doi.org/10.17026/dans-x55-69zp
- **Ruta:** no hace falta cuenta: los archivos son abiertos (licencia CC-BY-NC-SA 4.0). El usado es `3 - Feature dataset/per sensor/D - Physiology features (HR_HRV_SCL - final).csv`, con descarga directa en https://ssh.datastations.nl/api/access/datafile/189473
- **Ojo:**
  - El link antiguo de PhysioNet (`physionet.org/content/swell-kw`) no existe.
  - En este archivo, `999` significa dato faltante.
- **En DATASET_MIO:** `Sleep & Behavior/SWELL-KW (stress)/SWELL-KW_Physiology_HR_HRV_SCL_per_minute.csv`. Son 25 participantes, con una fila por minuto: `HR`, `RMSSD` (HRV), `SCL` (conductancia de la piel) y `Condition`, donde R = relajación, N = trabajo normal, I = interrupciones y T = presión de tiempo.

## 4. Actividad física y gamificación (prevención muscular y ósea)

### Fitbit Fitness Tracker Data
- **Enlace:** https://www.kaggle.com/datasets/arashnic/fitbit
- **Ruta:** requiere cuenta en Kaggle. En la pestaña *Data* se descarga el ZIP con los CSV de pasos, calorías y ritmo cardíaco, para simular el uso de la máquina ARED.
- **Sin cuenta:** es el mismo dataset que Kaggle, publicado originalmente en Zenodo (CC-BY 4.0): https://zenodo.org/records/53894. Ahí hay 2 zips, uno por mes.
- **Ojo:** unos 30 usuarios en 2016; no todos tienen ritmo cardíaco o peso.
- **Modelo:** la pérdida muscular (~15 %) y ósea (~1.5 %) cuando no se cumplen las rutinas se modela matemáticamente en el código. No hay un CSV de OSDR con esos datos. OSD-201 **no** sirve para esto: es un estudio de vacunas en ratones.
- **En DATASET_MIO:** `Physical Activity/Fitbit (Zenodo 53894)/`, con 29 CSV y ~590 MB:
  - `2016-03-12_to_2016-04-11/`: 11 CSV, 35 usuarios.
  - `2016-04-12_to_2016-05-12/`: 18 CSV, 33 usuarios. Este periodo es el que usa Kaggle.
  - Archivos clave: `dailyActivity_merged.csv` (pasos, minutos activos y sedentarios, calorías por día), `sleepDay_merged.csv` y `heartrate_seconds_merged.csv`. Los archivos `minute*` son muy pesados.

## 5. Entorno hostil (radiación espacial)

### NASA DONKI API: eventos de partículas solares
- **API key gratuita:** https://api.nasa.gov/
- **Consulta de prueba:** https://api.nasa.gov/DONKI/SEP?startDate=2026-10-01&endDate=2026-11-15&api_key=DEMO_KEY
- **Ojo:**
  - Devuelve **solo JSON**, no CSV.
  - Para esas fechas devuelve `[]` (no hubo eventos).
  - `DEMO_KEY` tiene un límite bajo de consultas por hora.
  - Cada consulta acepta como máximo **60 días**.
- **En DATASET_MIO:** no descargado. `DEMO_KEY` llegó a su límite (error 429). Con una clave propia de api.nasa.gov se puede bajar el historial en tramos de 60 días.

---

## Otros datos que ya están en DATASET_MIO pero no en la lista final
- **OSD-573 (microbiología de la cápsula Inspiration4):** https://osdr.nasa.gov/bio/repo/data/studies/OSD-573. Son 2 CSV convertidos de TSV (`Metaphlan-taxonomy` y `Pathway-abundances-cpm`), en `Cabin Environment/Microbiome (OSD-573)/` en DATASET_MIO y en Drive.
- **API de archivos de OSDR** (para listar lo que tiene cada estudio): `https://osdr.nasa.gov/osdr/data/osd/files/<número>`, por ejemplo https://osdr.nasa.gov/osdr/data/osd/files/575

## 6. Modelo anatómico 3D y figura 2D

- **BodyParts3D (DBCLS):** https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
- **Licencia:** CC BY 4.0, https://creativecommons.org/licenses/by/4.0/ (atribución en `webapp/public/ATTRIBUTION.md`)
- **Artículo:** Mitsuhashi N. et al. (2009), *BodyParts3D: 3D structure database for anatomical concepts*, Nucleic Acids Research. https://doi.org/10.1093/nar/gkn613
- **Referencias visuales consultadas:** https://github.com/ashemag/human-atlas y https://anatomy.app/3d-anatomy-overview

## 7. Métodos y fórmulas (`webapp/src/lib/hrv.js`)

- **HRV (dominio del tiempo y la frecuencia, LF/HF):** Task Force of the ESC and NASPE (1996), *Heart rate variability: standards of measurement*. https://doi.org/10.1161/01.CIR.93.5.1043
- **Detección de latidos (QRS):** Pan J., Tompkins W. (1985), *A real-time QRS detection algorithm*. https://doi.org/10.1109/TBME.1985.325532
- **Sensor GSR (conversión a conductancia):** https://wiki.seeedstudio.com/Grove-GSR_Sensor/

## 8. Hardware y software

- **AD8232 (ECG):** https://www.analog.com/en/products/ad8232.html
- **ESP-IDF (firmware ESP32):** https://docs.espressif.com/projects/esp-idf/
- **Web Serial API:** https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API
- **React:** https://react.dev · **Vite:** https://vite.dev · **Three.js:** https://threejs.org
- **Fuentes tipográficas:** https://fonts.google.com
- **Repositorio del proyecto:** https://github.com/JMMT18/Aurora-Health-Monitor

## 9. Revisados pero no usados en la app

- **NASA DONKI** (sección 5): solo JSON y sin eventos en el periodo; la radiación no se mide con nuestros sensores.
- **EchoNet-Dynamic** (sección 1): requiere registro y son pacientes en la Tierra.
- **ODIR-5K** (fondo de ojo): https://www.kaggle.com/datasets/andrewmvd/ocular-disease-recognition-odir5k. Descartado: no tenemos cámara de fondo de ojo.
- **OSD-201:** https://osdr.nasa.gov/bio/repo/data/studies/OSD-201. Descartado: es un estudio de vacunas en ratones.
