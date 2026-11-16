#include "ecg_task.h"
#include "sensor_data.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/semphr.h"
#include "esp_log.h"
#include "driver/gpio.h"
#include <stdint.h>
#include <stdio.h>
#include <math.h>

#ifndef ECG_PI
#define ECG_PI 3.14159265358979323846f
#endif

static const char *TAG = "ecg_dsp";

// Mutex para proteger ADC_UNIT_1 entre ecg_task y app_main
SemaphoreHandle_t g_adc1_mutex = NULL;

#define FS_HZ 200

/* ------------------------------------------------------------------------
 * Protocolo serial (115200 baudios) que lee la app (webapp/src/hooks/useEsp32.js):
 *   E:<n0>,v1,...,v10   10 muestras de ECG filtrado (200 Hz) que empiezan en la muestra n0
 *   G:<n0>,v1,...,v10   igual, en modo sEMG (filtro 20 Hz pasa-altos, sin detector de latidos)
 *   R:<n>               latido detectado: indice exacto de la muestra (resolucion 5 ms)
 *   M:bpm,rr,rmssd,sdnn,pnn50,resp,irregular   cada 2 s (ventana deslizante)
 *   L:1 / L:0           electrodo suelto / reconectado (LO+ / LO-)
 *   S:...               sensores lentos, cada 1 s (main.c)
 * Con n (contador de muestras) la app alinea latidos y onda sin depender del reloj.
 * ------------------------------------------------------------------------ */
#define ECG_SERIAL_STREAM 1   // 0 = no imprimir la onda
#define ECG_BATCH         10  // muestras por linea E:/G: (20 lineas/s ~ 1 KB/s)

// buffer circular con la señal ya filtrada, para el endpoint /ecg (http_api.c)
#define WAVEFORM_LEN 300
static int s_waveform[WAVEFORM_LEN];
static int s_waveform_pos = 0;
static bool s_leads_off_snapshot = true;
static SemaphoreHandle_t s_waveform_mutex;

static volatile ecg_mode_t s_mode = ECG_MODE_ECG;
void ecg_task_set_mode(ecg_mode_t mode) { s_mode = mode; }
ecg_mode_t ecg_task_get_mode(void) { return s_mode; }

// Estructura para filtro IIR Biquad (Forma Directa II Transpuesta)
typedef struct {
    float b0, b1, b2;
    float a1, a2;
    float z1, z2;
} biquad_t;

static inline float biquad_step(biquad_t *f, float x)
{
    float y = f->b0 * x + f->z1;
    f->z1 = f->b1 * x - f->a1 * y + f->z2;
    f->z2 = f->b2 * x - f->a2 * y;
    return y;
}

static inline void biquad_reset(biquad_t *f) { f->z1 = f->z2 = 0.0f; }

// formulas estandar "RBJ audio EQ cookbook", calculadas una vez al arrancar
static void design_highpass(biquad_t *f, float fs, float fc, float q)
{
    float w0 = 2.0f * ECG_PI * fc / fs;
    float alpha = sinf(w0) / (2.0f * q);
    float cosw0 = cosf(w0);
    float b0 = (1 + cosw0) / 2, b1 = -(1 + cosw0), b2 = (1 + cosw0) / 2;
    float a0 = 1 + alpha, a1 = -2 * cosw0, a2 = 1 - alpha;
    *f = (biquad_t){ b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0, 0, 0 };
}

static void design_lowpass(biquad_t *f, float fs, float fc, float q)
{
    float w0 = 2.0f * ECG_PI * fc / fs;
    float alpha = sinf(w0) / (2.0f * q);
    float cosw0 = cosf(w0);
    float b0 = (1 - cosw0) / 2, b1 = 1 - cosw0, b2 = (1 - cosw0) / 2;
    float a0 = 1 + alpha, a1 = -2 * cosw0, a2 = 1 - alpha;
    *f = (biquad_t){ b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0, 0, 0 };
}

// 1. Notch a 60 Hz @ Fs = 200 Hz, Q = 5.0 (elimina ruido electrico)
static biquad_t notch_60hz = {
    .b0 =  0.9149691f, .b1 =  0.5654834f, .b2 =  0.9149691f,
    .a1 =  0.5654834f, .a2 =  0.8299383f,
};
// 2. Pasa-Altos Butterworth 2do orden a 0.5 Hz (quita deriva de linea base)
static biquad_t hp_05hz = {
    .b0 =  0.9889542f, .b1 = -1.9779085f, .b2 =  0.9889542f,
    .a1 = -1.9777865f, .a2 =  0.9780305f,
};
// 3. Pasa-Bajos Butterworth 2do orden a 35 Hz (quita ruido EMG y alta frec)
static biquad_t lp_35hz = {
    .b0 =  0.2533134f, .b1 =  0.5066268f, .b2 =  0.2533134f,
    .a1 = -0.1712407f, .a2 =  0.1844943f,
};
// 4. Banda 5-15Hz, SOLO para decidir cuando hay un latido (no se grafica)
static biquad_t hp_qrs, lp_qrs;
// 5. Banda 0.1-0.5Hz sobre la señal SIN el pasa-altos de 0.5Hz: respiracion (EDR por linea base)
static biquad_t hp_resp, lp_resp;
// 6. Modo sEMG: pasa-altos 20 Hz (2 etapas = 4to orden). OJO: el modulo AD8232 trae un
//    pasa-bajos analogico (~40 Hz en la placa tipica), asi que por encima de eso la señal llega atenuada.
static biquad_t hp_emg1, hp_emg2;

typedef struct {
    adc_oneshot_unit_handle_t adc_handle;
    adc_channel_t channel;
    ad8232_leads_t leads;
} ecg_ctx_t;

static ecg_ctx_t s_ecg_ctx;

/* Antes: BPM = latidos contados en una ventana FIJA de 15 s, publicado cada 15 s.
 * Ahora: cada latido se guarda con su tiempo exacto y cada REPORT_MS se publica
 *   BPM medio = promedio de 60000/RR_i de los latidos de los ultimos BPM_WINDOW_MS
 * (ventana deslizante), asi el dato se actualiza cada 2 s sin perder estabilidad. */
#define REPORT_MS      2000
#define BPM_WINDOW_MS  10000
#define RR_HISTORY     64     // ~1 min de latidos para HRV en el dominio del tiempo
#define LEADS_DEBOUNCE 40     // 200 ms a 200 Hz

static void print_batch(char tag, uint32_t n0, const int *v, int count)
{
#if ECG_SERIAL_STREAM
    char line[128];
    int len = snprintf(line, sizeof(line), "%c:%lu", tag, (unsigned long)n0);
    for (int i = 0; i < count && len < (int)sizeof(line) - 8; i++) {
        len += snprintf(line + len, sizeof(line) - len, ",%d", v[i]);
    }
    printf("%s\n", line);
#endif
}

static void ecg_processing_task(void *arg)
{
    (void)arg;
    TickType_t last_wake = xTaskGetTickCount();
    const TickType_t sample_period = pdMS_TO_TICKS(1000 / FS_HZ); // 5 ms -> 200 Hz

    uint32_t n = 0;                   // contador de muestras desde el arranque
    int batch[ECG_BATCH];
    int batch_len = 0;
    uint32_t batch_n0 = 0;
    char batch_tag = 'E';

    // deteccion de picos (umbral adaptativo de 2 niveles estilo Pan-Tompkins)
    uint32_t last_r_n = 0;
    bool have_r = false;
    float last_qrs_band = 0;
    float spki = 0, npki = 0;
    float prev_energy = 0;
    bool energy_rising = false;

    // historial de RR (ms) y del instante (ms) en que termino cada uno
    float rr_hist[RR_HISTORY];
    uint32_t rr_end_ms[RR_HISTORY];
    int rr_count = 0, rr_pos = 0;
    float rr_running_mean = 800.0f;
    bool last_irregular = false;

    uint32_t last_report_ms = 0;

    bool resp_above = false;
    uint32_t last_resp_cross_ms = 0;
    float resp_rate = 0;

    bool prev_leads_off = false;
    // antirrebote del electrodo suelto: LO+/LO- debe sostenerse 200 ms (40 muestras) para cambiar de estado.
    // Sin esto, un electrodo que se mueve hace parpadear la señal y la grafica se reinicia a cada rato.
    bool lo_state = false;
    int lo_count = 0;
    ecg_mode_t prev_mode = ECG_MODE_ECG;

    while (1) {
        vTaskDelayUntil(&last_wake, sample_period);
        n++;
        uint32_t now_ms = n * (1000 / FS_HZ);   // tiempo derivado del contador: exacto a 200 Hz

        bool lo_raw = gpio_get_level(s_ecg_ctx.leads.lo_plus) || gpio_get_level(s_ecg_ctx.leads.lo_minus);
        if (lo_raw == lo_state) {
            lo_count = 0;
        } else if (++lo_count >= LEADS_DEBOUNCE) {
            lo_state = lo_raw;
            lo_count = 0;
        }
        bool leads_off = lo_state;
        sensor_data_set_ecg_leads_off(leads_off);
        if (leads_off != prev_leads_off) {
            printf("L:%d\n", leads_off ? 1 : 0);
            prev_leads_off = leads_off;
        }

        ecg_mode_t mode = s_mode;
        if (mode != prev_mode) {
            printf("MODE:%s\n", mode == ECG_MODE_EMG ? "EMG" : "ECG");
            biquad_reset(&hp_emg1); biquad_reset(&hp_emg2);
            batch_len = 0;
            prev_mode = mode;
        }

        if (leads_off) {
            biquad_reset(&notch_60hz); biquad_reset(&hp_05hz); biquad_reset(&lp_35hz);
            biquad_reset(&hp_qrs); biquad_reset(&lp_qrs);
            biquad_reset(&hp_resp); biquad_reset(&lp_resp);
            biquad_reset(&hp_emg1); biquad_reset(&hp_emg2);
            last_qrs_band = 0;
            spki = npki = 0;
            prev_energy = 0;
            energy_rising = false;
            have_r = false;
            rr_count = 0;
            rr_pos = 0;
            rr_running_mean = 800.0f;
            last_irregular = false;
            resp_above = false;
            resp_rate = 0;
            batch_len = 0;
            xSemaphoreTake(s_waveform_mutex, portMAX_DELAY);
            s_leads_off_snapshot = true;
            xSemaphoreGive(s_waveform_mutex);
            continue;
        }

        // Sobremuestreo en rafaga (4 lecturas) protegido por mutex para reducir ruido del ADC
        int sum_raw = 0, valid_samples = 0;
        if (xSemaphoreTake(g_adc1_mutex, pdMS_TO_TICKS(2)) == pdTRUE) {
            for (int i = 0; i < 4; i++) {
                int raw = 0;
                if (adc_oneshot_read(s_ecg_ctx.adc_handle, s_ecg_ctx.channel, &raw) == ESP_OK) {
                    sum_raw += raw;
                    valid_samples++;
                }
            }
            xSemaphoreGive(g_adc1_mutex);
        }
        if (valid_samples == 0) continue;
        float x = (float)sum_raw / (float)valid_samples;

        float s1 = biquad_step(&notch_60hz, x);

        /* ---------------- modo sEMG ---------------- */
        if (mode == ECG_MODE_EMG) {
            float e = biquad_step(&hp_emg1, s1);
            e = biquad_step(&hp_emg2, e);
            if (batch_len == 0) { batch_n0 = n; batch_tag = 'G'; }
            batch[batch_len++] = (int)e;          // centrado en 0
            if (batch_len == ECG_BATCH) { print_batch(batch_tag, batch_n0, batch, batch_len); batch_len = 0; }
            continue;
        }

        /* ---------------- modo ECG ---------------- */
        float s2 = biquad_step(&hp_05hz, s1);
        float ecg_clean = biquad_step(&lp_35hz, s2);

        // EDR por deriva de linea base (respaldo; la app calcula ademas el EDR por amplitud R-S)
        float resp_r = biquad_step(&hp_resp, s1);
        resp_r = biquad_step(&lp_resp, resp_r);
        bool resp_now_above = resp_r > 0;
        if (resp_now_above && !resp_above) {
            uint32_t since_ms = now_ms - last_resp_cross_ms;
            last_resp_cross_ms = now_ms;
            float period_s = since_ms / 1000.0f;
            if (period_s > 1.0f && period_s < 10.0f) {
                float rate = 60.0f / period_s;
                resp_rate = (resp_rate == 0) ? rate : (resp_rate * 0.7f + rate * 0.3f);
                sensor_data_set_ecg_respiration(resp_rate);
            }
        }
        resp_above = resp_now_above;

        int clean_int = (int)ecg_clean + 2048;
        xSemaphoreTake(s_waveform_mutex, portMAX_DELAY);
        s_leads_off_snapshot = false;
        s_waveform[s_waveform_pos] = clean_int;
        s_waveform_pos = (s_waveform_pos + 1) % WAVEFORM_LEN;
        xSemaphoreGive(s_waveform_mutex);

        if (batch_len == 0) { batch_n0 = n; batch_tag = 'E'; }
        batch[batch_len++] = clean_int;
        if (batch_len == ECG_BATCH) { print_batch(batch_tag, batch_n0, batch, batch_len); batch_len = 0; }

        // Detector de pico R: banda 5-15Hz -> derivada -> cuadrado
        float qrs_band = biquad_step(&hp_qrs, ecg_clean);
        qrs_band = biquad_step(&lp_qrs, qrs_band);
        float qrs_deriv = qrs_band - last_qrs_band;
        last_qrs_band = qrs_band;
        float qrs_energy = qrs_deriv * qrs_deriv;
        float threshold = npki + 0.25f * (spki - npki);

        if (qrs_energy > prev_energy) {
            energy_rising = true;
        } else if (energy_rising) {
            energy_rising = false;
            uint32_t peak_n = n - 1;                       // el maximo fue en la muestra anterior
            bool refractory_ok = !have_r || (peak_n - last_r_n) * (1000 / FS_HZ) > 250;
            if (prev_energy > threshold && refractory_ok) {
                spki = 0.125f * prev_energy + 0.875f * spki;
                if (have_r) {
                    float rr_ms = (float)((peak_n - last_r_n) * (1000 / FS_HZ));
                    float inst_bpm = 60000.0f / rr_ms;
                    if (inst_bpm >= 40.0f && inst_bpm <= 200.0f) {
                        printf("R:%lu\n", (unsigned long)peak_n);
                        last_irregular = (rr_count > 3) && (fabsf(rr_ms - rr_running_mean) > 0.20f * rr_running_mean);
                        rr_hist[rr_pos] = rr_ms;
                        rr_end_ms[rr_pos] = now_ms;
                        rr_pos = (rr_pos + 1) % RR_HISTORY;
                        if (rr_count < RR_HISTORY) rr_count++;
                        rr_running_mean = rr_running_mean * 0.9f + rr_ms * 0.1f;
                        sensor_data_set_irregular_beat(last_irregular);
                    }
                } else {
                    printf("R:%lu\n", (unsigned long)peak_n);
                }
                last_r_n = peak_n;
                have_r = true;
            } else {
                npki = 0.125f * prev_energy + 0.875f * npki;
            }
        }
        prev_energy = qrs_energy;

        /* -------- publicacion cada REPORT_MS con ventana deslizante -------- */
        if (now_ms - last_report_ms >= REPORT_MS) {
            last_report_ms = now_ms;
            // RR en orden cronologico (del mas viejo al mas nuevo)
            float rr[RR_HISTORY];
            uint32_t rr_t[RR_HISTORY];
            int N = rr_count;
            for (int i = 0; i < N; i++) {
                int idx = (rr_pos - N + i + RR_HISTORY) % RR_HISTORY;
                rr[i] = rr_hist[idx];
                rr_t[i] = rr_end_ms[idx];
            }
            // BPM medio (formula: promedio de BPM_i = 60000/RR_i) de los latidos de los ultimos 10 s
            float bpm_sum = 0;
            int bpm_n = 0;
            for (int i = 0; i < N; i++) {
                if (now_ms - rr_t[i] <= BPM_WINDOW_MS) { bpm_sum += 60000.0f / rr[i]; bpm_n++; }
            }
            float bpm = bpm_n ? bpm_sum / bpm_n : 0;
            // HRV en el dominio del tiempo sobre el historial (~1 min)
            float mean = 0, sdnn = 0, rmssd = 0, pnn50 = 0;
            if (N >= 2) {
                for (int i = 0; i < N; i++) mean += rr[i];
                mean /= N;
                float var = 0;
                for (int i = 0; i < N; i++) { float d = rr[i] - mean; var += d * d; }
                sdnn = sqrtf(var / (N - 1));                         // SDNN, divisor N-1
                float sq = 0;
                int nn50 = 0;
                for (int i = 0; i < N - 1; i++) {
                    float d = rr[i + 1] - rr[i];
                    sq += d * d;
                    if (fabsf(d) > 50.0f) nn50++;
                }
                rmssd = sqrtf(sq / (N - 1));                         // RMSSD, N-1 diferencias
                pnn50 = 100.0f * nn50 / (N - 1);                     // pNN50
            }
            float last_rr = N ? rr[N - 1] : 0;
            sensor_data_set_heart_rate(bpm);
            sensor_data_set_hrv(last_rr, rmssd, sdnn, pnn50);
            printf("M:%.0f,%.0f,%.1f,%.1f,%.1f,%.0f,%d\n", bpm, last_rr, rmssd, sdnn, pnn50, resp_rate, last_irregular ? 1 : 0);
        }
    }
}

void ecg_task_start(adc_oneshot_unit_handle_t adc1, adc_channel_t channel, ad8232_leads_t leads)
{
    if (g_adc1_mutex == NULL) {
        g_adc1_mutex = xSemaphoreCreateMutex();
    }
    s_waveform_mutex = xSemaphoreCreateMutex();
    s_ecg_ctx.adc_handle = adc1;
    s_ecg_ctx.channel = channel;
    s_ecg_ctx.leads = leads;

    design_highpass(&hp_qrs, FS_HZ, 5.0f, 0.7071f);
    design_lowpass(&lp_qrs, FS_HZ, 15.0f, 0.7071f);
    design_highpass(&hp_resp, FS_HZ, 0.1f, 0.7071f);
    design_lowpass(&lp_resp, FS_HZ, 0.5f, 0.7071f);
    // Butterworth de 4to orden = dos biquads con Q 0.5412 y 1.3066
    design_highpass(&hp_emg1, FS_HZ, 20.0f, 0.5412f);
    design_highpass(&hp_emg2, FS_HZ, 20.0f, 1.3066f);

    ESP_LOGI(TAG, "ECG: 200 Hz, publica M: cada %d ms (ventana BPM %d ms)", REPORT_MS, BPM_WINDOW_MS);

    // Prioridad 5 y fijada al Core 1 para que el WiFi (Core 0) no introduzca jitter en los 200 Hz
    xTaskCreatePinnedToCore(ecg_processing_task, "ecg_dsp", 6144, NULL, 5, NULL, 1);
}

int ecg_task_get_waveform(int *out, int max_out, bool *leads_off)
{
    if (!s_waveform_mutex) {
        return 0;
    }
    xSemaphoreTake(s_waveform_mutex, portMAX_DELAY);
    *leads_off = s_leads_off_snapshot;
    int n = max_out < WAVEFORM_LEN ? max_out : WAVEFORM_LEN;
    for (int i = 0; i < n; i++) {
        int idx = (s_waveform_pos + i) % WAVEFORM_LEN;
        out[i] = s_waveform[idx];
    }
    xSemaphoreGive(s_waveform_mutex);
    return n;
}
