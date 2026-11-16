#pragma once

#include "esp_adc/adc_oneshot.h"
#include "esp_adc/adc_cali.h"
#include "esp_err.h"

typedef struct {
    adc_channel_t channel;
    adc_cali_handle_t cali;
} thermistor_t;

// configura el canal del termistor (sobre una unidad ADC ya creada) y crea
// la calibracion de fabrica del ADC para leer voltios reales, no solo cuentas crudas
esp_err_t thermistor_init(adc_oneshot_unit_handle_t adc, adc_channel_t channel, thermistor_t *dev);

// lee la temperatura en grados Celsius a partir del divisor de voltaje
esp_err_t thermistor_read_celsius(adc_oneshot_unit_handle_t adc, thermistor_t *dev, float *celsius);
