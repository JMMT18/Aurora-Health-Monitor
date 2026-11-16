#include "ad8232.h"

esp_err_t ad8232_init(adc_oneshot_unit_handle_t adc, adc_channel_t channel, ad8232_leads_t leads)
{
    adc_oneshot_chan_cfg_t chan_cfg = {
        .atten = ADC_ATTEN_DB_12,
        .bitwidth = ADC_BITWIDTH_DEFAULT,
    };

    esp_err_t err = adc_oneshot_config_channel(adc, channel, &chan_cfg);
    if (err != ESP_OK) {
        return err;
    }

    // LO+ / LO- los maneja el AD8232, solo se leen como entrada
    gpio_config_t io_cfg = {
        .pin_bit_mask = (1ULL << leads.lo_plus) | (1ULL << leads.lo_minus),
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
    };

    return gpio_config(&io_cfg);
}

esp_err_t ad8232_read_raw(adc_oneshot_unit_handle_t adc, adc_channel_t channel, int *raw)
{
    return adc_oneshot_read(adc, channel, raw);
}

bool ad8232_leads_off(ad8232_leads_t leads)
{
    // en alto significa que el electrodo esta desconectado
    return gpio_get_level(leads.lo_plus) || gpio_get_level(leads.lo_minus);
}
