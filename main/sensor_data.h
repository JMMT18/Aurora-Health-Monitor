#pragma once

#include <stdbool.h>

// snapshot de las ultimas lecturas, protegido por un mutex para que la tarea
// de sensores (escritor) y el manejador HTTP (lector) no choquen entre si
typedef struct {
    float heart_rate_bpm;
    float rr_interval_ms;
    float rmssd_ms;
    float sdnn_ms;
    float pnn50_pct;
    float ecg_respiration_rate; // resp/min, derivada del ECG (EDR)
    bool irregular_beat;
    float gsr_raw;
    float body_temp_c;
    float cabin_pressure_pa;
    float activity_pct;
    bool ecg_leads_off;
} sensor_data_t;

void sensor_data_init(void);

void sensor_data_set_heart_rate(float bpm);
void sensor_data_set_hrv(float rr_ms, float rmssd_ms, float sdnn_ms, float pnn50_pct);
void sensor_data_set_irregular_beat(bool irregular);
void sensor_data_set_ecg_respiration(float resp_per_min);
void sensor_data_set_ecg_leads_off(bool leads_off);
void sensor_data_set_gsr(float raw);
void sensor_data_set_body_temp(float celsius);
void sensor_data_set_cabin_pressure(float pascal);
void sensor_data_set_activity(float pct);

// copia atomica del snapshot completo, para armar la respuesta HTTP
void sensor_data_get(sensor_data_t *out);
