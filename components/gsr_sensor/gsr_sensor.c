#include "gsr_sensor.h"

esp_err_t gsr_init(adc_oneshot_unit_handle_t adc, adc_channel_t channel)
{
    // atenuacion 12dB para leer hasta ~3.3V
    adc_oneshot_chan_cfg_t chan_cfg = {
        .atten = ADC_ATTEN_DB_12,
        .bitwidth = ADC_BITWIDTH_DEFAULT,
    };

    return adc_oneshot_config_channel(adc, channel, &chan_cfg);
}

esp_err_t gsr_read_raw(adc_oneshot_unit_handle_t adc, adc_channel_t channel, int *raw)
{
    return adc_oneshot_read(adc, channel, raw);
}
