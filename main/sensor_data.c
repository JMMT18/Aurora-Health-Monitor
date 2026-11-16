#include "sensor_data.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"

static sensor_data_t s_data;
static SemaphoreHandle_t s_mutex;

void sensor_data_init(void)
{
    s_mutex = xSemaphoreCreateMutex();
}

#define SET_FIELD(field, value)                      \
    do {                                              \
        xSemaphoreTake(s_mutex, portMAX_DELAY);        \
        s_data.field = (value);                        \
        xSemaphoreGive(s_mutex);                        \
    } while (0)

void sensor_data_set_heart_rate(float bpm) { SET_FIELD(heart_rate_bpm, bpm); }
void sensor_data_set_irregular_beat(bool irregular) { SET_FIELD(irregular_beat, irregular); }
void sensor_data_set_ecg_respiration(float resp_per_min) { SET_FIELD(ecg_respiration_rate, resp_per_min); }
void sensor_data_set_ecg_leads_off(bool leads_off) { SET_FIELD(ecg_leads_off, leads_off); }

void sensor_data_set_hrv(float rr_ms, float rmssd_ms, float sdnn_ms, float pnn50_pct)
{
    xSemaphoreTake(s_mutex, portMAX_DELAY);
    s_data.rr_interval_ms = rr_ms;
    s_data.rmssd_ms = rmssd_ms;
    s_data.sdnn_ms = sdnn_ms;
    s_data.pnn50_pct = pnn50_pct;
    xSemaphoreGive(s_mutex);
}
void sensor_data_set_gsr(float raw) { SET_FIELD(gsr_raw, raw); }
void sensor_data_set_body_temp(float celsius) { SET_FIELD(body_temp_c, celsius); }
void sensor_data_set_cabin_pressure(float pascal) { SET_FIELD(cabin_pressure_pa, pascal); }
void sensor_data_set_activity(float pct) { SET_FIELD(activity_pct, pct); }

void sensor_data_get(sensor_data_t *out)
{
    xSemaphoreTake(s_mutex, portMAX_DELAY);
    *out = s_data;
    xSemaphoreGive(s_mutex);
}
