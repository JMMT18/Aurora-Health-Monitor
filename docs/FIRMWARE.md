# Aurora · firmware ESP32 (ESP-IDF)

Firmware del monitor de salud. Sensores: AD8232 (ECG/sEMG), GSR V1.2, termistor NTC, BMP180 (presión de cabina) y ADXL345 (movimiento).
La app web (`webapp/`) lo lee por **USB serial** a 115200 baudios.

## Compilar y grabar

```bash
idf.py set-target esp32
idf.py build flash
```

- El WiFi y el servidor HTTP vienen **desactivados**, porque la app usa el cable USB. Para activarlos: `idf.py -DAURORA_ENABLE_WIFI=ON build`. Necesita `wifi_credentials.h`, y en ESP-IDF 6 además el componente `espressif/cjson`.
- Antes de abrir la app hay que cerrar `idf.py monitor`, porque el puerto solo lo puede usar un programa a la vez.

## Qué hace cada archivo

| Archivo | Función |
|---|---|
| `main/main.c` | Inicializa sensores; cada 1 s lee temperatura, GSR, presión y movimiento y emite `S:` |
| `main/ecg_task.c` | AD8232 a **200 Hz** en el núcleo 1:<br>· filtros notch 60 Hz, pasa-altos 0.5 Hz y pasa-bajos 35 Hz<br>· detector de QRS (Pan-Tompkins simplificado)<br>· emite `E:` (onda), `R:` (cada latido), `L:` (electrodo) y `M:` **cada 2 s**, con BPM de una ventana deslizante de 10 s y HRV del último minuto |
| `main/serial_cmd.c` | Recibe comandos de la app: `MODE EMG`, `MODE ECG` y `PING` |
| `tools/ecg_serial_monitor.html` | Monitor de verificación por serial (Chrome/Edge) |

## Protocolo serial

| Línea | Contenido |
|---|---|
| `E:n0,v1..v10` | 10 muestras de ECG filtrado desde la muestra `n0` (200 Hz) |
| `G:n0,v1..v10` | Igual en modo sEMG (pasa-altos de 20 Hz, 4.º orden) |
| `R:n` | Pico R en la muestra `n` (índice exacto, 5 ms) |
| `M:bpm,rr,rmssd,sdnn,pnn50,resp,irregular` | Cada 2 s |
| `L:1` / `L:0` | Electrodo suelto / reconectado |
| `S:activity,presionPa,tempC,gsr` | Cada 1 s |
| `MODE:EMG` / `MODE:ECG` | Confirma el cambio de modo |

**Termistor:** se calibra con dos puntos medidos en el circuito real: 1.27 V = 37 °C y 1.50 V = 20 °C (`CAL1_*` y `CAL2_*` en `components/thermistor/thermistor.c`). Con eso se calculan R0 y un β efectivo (~1533), y cada lectura promedia 16 muestras del ADC (~70 °C por voltio). Para recalibrar, se cambian esos cuatro valores.

**sEMG con el AD8232:** la placa típica trae un pasa-bajos analógico de unos 40 Hz. La contracción se detecta (MAV y RMS), pero la frecuencia media (MNF) sale más baja que con un amplificador de EMG dedicado.

El respaldo del firmware anterior (`_respaldo_firmware_v1/`) queda solo en la copia local y no se sube al repositorio.
