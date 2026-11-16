#include "thermistor.h"
#include "esp_adc/adc_cali_scheme.h"
#include <math.h>

// Modelo: divisor 3.3V --- R_SERIE --- (pin ADC) --- NTC --- GND, con la ecuacion Beta del NTC.
// Los parametros R0 y Beta NO se suponen: se calculan con DOS puntos medidos en el circuito real
// (caracterizacion del equipo). Asi el modelo absorbe las diferencias entre el circuito analogico
// real y el divisor ideal (el Beta efectivo resulta ~1533, no el 3950 nominal de un NTC suelto).
#define VCC_MV      3300.0f
#define R_SERIE_OHM 10000.0f
#define NTC_T0_K    298.15f   // referencia del modelo: 25 C

// --- caracterizacion medida (AJUSTAR si se recalibra) ---
#define CAL1_VOLT_MV 1270.0f  // 1.27 V ...
#define CAL1_TEMP_C  37.0f    // ... = 37 C
#define CAL2_VOLT_MV 1500.0f  // 1.50 V ...
#define CAL2_TEMP_C  20.0f    // ... = 20 C

// promedio de lecturas: con ~70 C/V, 1 mV de ruido del ADC son ~0.07 C
#define N_AVG 16

static float s_r0;    // resistencia equivalente a 25 C
static float s_beta;  // Beta efectivo

static float ntc_resistance_from_mv(float v_mv)
{
    return R_SERIE_OHM * v_mv / (VCC_MV - v_mv);
}

esp_err_t thermistor_init(adc_oneshot_unit_handle_t adc, adc_channel_t channel, thermistor_t *dev)
{
    dev->channel = channel;

    adc_oneshot_chan_cfg_t chan_cfg = {
        .atten = ADC_ATTEN_DB_12,
        .bitwidth = ADC_BITWIDTH_DEFAULT,
    };
    esp_err_t err = adc_oneshot_config_channel(adc, channel, &chan_cfg);
    if (err != ESP_OK) {
        return err;
    }

    adc_cali_line_fitting_config_t cali_cfg = {
        .unit_id = ADC_UNIT_1,
        .atten = ADC_ATTEN_DB_12,
        .bitwidth = ADC_BITWIDTH_DEFAULT,
    };
    err = adc_cali_create_scheme_line_fitting(&cali_cfg, &dev->cali);
    if (err != ESP_OK) {
        return err;
    }

    // calibracion de dos puntos:  Beta = ln(R1/R2) / (1/T1 - 1/T2),  R0 = R1 / e^(Beta (1/T1 - 1/T0))
    float r1 = ntc_resistance_from_mv(CAL1_VOLT_MV), t1 = CAL1_TEMP_C + 273.15f;
    float r2 = ntc_resistance_from_mv(CAL2_VOLT_MV), t2 = CAL2_TEMP_C + 273.15f;
    s_beta = logf(r1 / r2) / (1.0f / t1 - 1.0f / t2);
    s_r0 = r1 / expf(s_beta * (1.0f / t1 - 1.0f / NTC_T0_K));

    return ESP_OK;
}

esp_err_t thermistor_read_celsius(adc_oneshot_unit_handle_t adc, thermistor_t *dev, float *celsius)
{
    int sum_mv = 0, n = 0;
    for (int i = 0; i < N_AVG; i++) {
        int raw, mv;
        if (adc_oneshot_read(adc, dev->channel, &raw) != ESP_OK) continue;
        if (adc_cali_raw_to_voltage(dev->cali, raw, &mv) != ESP_OK) continue;
        sum_mv += mv;
        n++;
    }
    if (n == 0) {
        return ESP_FAIL;
    }
    float mv = (float)sum_mv / n;

    // fuera de rango = termistor desconectado (cerca de VCC) o en corto (cerca de 0 V)
    if (mv < 100.0f || mv > VCC_MV - 100.0f) {
        return ESP_ERR_INVALID_RESPONSE;
    }

    float r_ntc = ntc_resistance_from_mv(mv);
    float inv_t = (1.0f / NTC_T0_K) + (1.0f / s_beta) * logf(r_ntc / s_r0);
    *celsius = (1.0f / inv_t) - 273.15f;

    return ESP_OK;
}
