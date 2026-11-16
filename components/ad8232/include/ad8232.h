#pragma once

#include "esp_adc/adc_oneshot.h"
#include "driver/gpio.h"
#include "esp_err.h"
#include <stdbool.h>

// pines digitales de deteccion de electrodo suelto (LO+ / LO-)
typedef struct {
    gpio_num_t lo_plus;
    gpio_num_t lo_minus;
} ad8232_leads_t;

// configura el canal de la senal (sobre una unidad ADC ya creada) y los pines LO+/LO-
esp_err_t ad8232_init(adc_oneshot_unit_handle_t adc, adc_channel_t channel, ad8232_leads_t leads);

// lee el valor crudo de la senal de ECG
esp_err_t ad8232_read_raw(adc_oneshot_unit_handle_t adc, adc_channel_t channel, int *raw);

// true si algun electrodo esta desconectado
bool ad8232_leads_off(ad8232_leads_t leads);
