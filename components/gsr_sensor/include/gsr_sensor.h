#pragma once

#include "esp_adc/adc_oneshot.h"
#include "esp_err.h"

// configura el canal del GSR sobre una unidad ADC ya creada
esp_err_t gsr_init(adc_oneshot_unit_handle_t adc, adc_channel_t channel);

// lee el valor crudo del GSR (0 a 4095 aprox)
esp_err_t gsr_read_raw(adc_oneshot_unit_handle_t adc, adc_channel_t channel, int *raw);
