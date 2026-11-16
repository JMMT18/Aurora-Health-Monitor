#pragma once

#include <stdbool.h>
#include "esp_adc/adc_oneshot.h"
#include "ad8232.h"

typedef enum {
    ECG_MODE_ECG = 0,   // electrocardiograma: latidos, HRV, EDR (filtro 0.5-35 Hz)
    ECG_MODE_EMG = 1,   // electromiografia de superficie (pasa-altos 20 Hz, sin detector de latidos)
} ecg_mode_t;

// arranca la tarea que muestrea el AD8232 en continuo a 200 Hz
void ecg_task_start(adc_oneshot_unit_handle_t adc, adc_channel_t channel, ad8232_leads_t leads);

// cambia el modo de procesamiento (lo llama serial_cmd.c al recibir "MODE EMG" / "MODE ECG")
void ecg_task_set_mode(ecg_mode_t mode);
ecg_mode_t ecg_task_get_mode(void);

// copia hasta max_out muestras recientes de la señal filtrada (para graficarla).
// devuelve cuantas copio realmente. leads_off indica si el electrodo esta suelto.
int ecg_task_get_waveform(int *out, int max_out, bool *leads_off);
