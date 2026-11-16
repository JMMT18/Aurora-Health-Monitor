#include <math.h>
#include <stdio.h>
#include <stdbool.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_log.h"

#include "adxl345.h"
#include "bmp180.h"
#include "gsr_sensor.h"
#include "ad8232.h"
#include "thermistor.h"

#include "sensor_data.h"
#include "ecg_task.h"
#include "serial_cmd.h"
#if AURORA_ENABLE_WIFI
#include "http_api.h"
#endif

// pines I2C compartidos por ADXL345 y BMP180
#define I2C_PORT    I2C_NUM_0
#define I2C_SDA_PIN GPIO_NUM_21
#define I2C_SCL_PIN GPIO_NUM_22

// pines analogos de GSR y AD8232 (ambos en ADC1)
#define GSR_ADC_CHANNEL  ADC_CHANNEL_6  // GPIO34
#define ECG_ADC_CHANNEL  ADC_CHANNEL_7  // GPIO35
#define ECG_LO_PLUS_PIN  GPIO_NUM_32
#define ECG_LO_MINUS_PIN GPIO_NUM_33

// termistor: GPIO36 (ADC1_CH0) — a proposito NO en ADC2 (GPIO25/26), porque
// el ADC2 no es confiable mientras el WiFi esta activo en el ESP32 clasico
#define THERMISTOR_ADC_CHANNEL ADC_CHANNEL_0

static const char *TAG = "health_monitor";

// movimiento como desviacion de 1g en reposo, mapeado a un 0-100 simple;
// no es un contador de pasos real, solo una senal de "hay movimiento o no"
static float activity_from_accel(const adxl345_data_t *a)
{
    float mag_g = sqrtf((float)a->x * a->x + (float)a->y * a->y + (float)a->z * a->z) / 256.0f;
    float pct = fabsf(mag_g - 1.0f) * 200.0f;
    if (pct > 100.0f) pct = 100.0f;
    return pct;
}

void app_main(void)
{
    sensor_data_init();

    // bus I2C compartido
    i2c_master_bus_config_t bus_cfg = {
        .i2c_port = I2C_PORT,
        .sda_io_num = I2C_SDA_PIN,
        .scl_io_num = I2C_SCL_PIN,
        .clk_source = I2C_CLK_SRC_DEFAULT,
        .glitch_ignore_cnt = 7,
        .flags.enable_internal_pullup = true,
    };
    i2c_master_bus_handle_t i2c_bus;
    ESP_ERROR_CHECK(i2c_new_master_bus(&bus_cfg, &i2c_bus));

    // ADXL345 y BMP180 no son fatales si no estan conectados todavia — para
    // poder probar un sensor a la vez (por ejemplo solo el ECG) sin que el
    // equipo se reinicie en bucle por falta de los demas
    i2c_master_dev_handle_t adxl_dev;
    bool adxl_ok = (adxl345_init(i2c_bus, &adxl_dev) == ESP_OK);
    if (!adxl_ok) {
        ESP_LOGW(TAG, "ADXL345 no responde — se omite (¿esta conectado?)");
    }

    i2c_master_dev_handle_t bmp_dev;
    bool bmp_ok = (bmp180_init(i2c_bus, &bmp_dev) == ESP_OK);
    if (!bmp_ok) {
        ESP_LOGW(TAG, "BMP180 no responde — se omite (¿esta conectado?)");
    }

    // unidad ADC compartida
    adc_oneshot_unit_init_cfg_t adc_unit_cfg = {
        .unit_id = ADC_UNIT_1,
        .ulp_mode = ADC_ULP_MODE_DISABLE,
    };
    adc_oneshot_unit_handle_t adc1;
    ESP_ERROR_CHECK(adc_oneshot_new_unit(&adc_unit_cfg, &adc1));

    ESP_ERROR_CHECK(gsr_init(adc1, GSR_ADC_CHANNEL));

    ad8232_leads_t ecg_leads = {
        .lo_plus = ECG_LO_PLUS_PIN,
        .lo_minus = ECG_LO_MINUS_PIN,
    };
    ESP_ERROR_CHECK(ad8232_init(adc1, ECG_ADC_CHANNEL, ecg_leads));

    thermistor_t thermistor;
    ESP_ERROR_CHECK(thermistor_init(adc1, THERMISTOR_ADC_CHANNEL, &thermistor));

    // tarea aparte para el ECG: necesita muestrear rapido (~200Hz) para
    // detectar los picos de la onda R, no alcanza con el loop de 1s de abajo.
    // Arranca ANTES del WiFi a proposito: asi se puede verificar el ECG por
    // el monitor serial aunque la red no este disponible o tarde en conectar.
    ecg_task_start(adc1, ECG_ADC_CHANNEL, ecg_leads);

    // la app lee todo por USB serial; tambien manda comandos ("MODE EMG" / "MODE ECG")
    serial_cmd_start();

#if AURORA_ENABLE_WIFI
    // WiFi + servidor HTTP (GET /readings, /ecg): desactivado por defecto, la app usa serial.
    // Para activarlo: AURORA_ENABLE_WIFI ON en main/CMakeLists.txt
    wifi_connect_sta();
    ESP_ERROR_CHECK(http_api_start());
#endif

    while (1) {
        if (adxl_ok) {
            adxl345_data_t accel;
            if (adxl345_read(adxl_dev, &accel) == ESP_OK) {
                float activity = activity_from_accel(&accel);
                sensor_data_set_activity(activity);
                ESP_LOGI(TAG, "Accel X=%d Y=%d Z=%d Actividad=%.0f%%", accel.x, accel.y, accel.z, activity);
            }
        }

        // BMP180 sigue dando la presion de cabina; su temperatura interna ya
        // no se usa como "Temp." del astronauta (eso ahora es el termistor)
        if (bmp_ok) {
            float bmp_temp_c, pressure_pa;
            if (bmp180_read(bmp_dev, &bmp_temp_c, &pressure_pa) == ESP_OK) {
                sensor_data_set_cabin_pressure(pressure_pa);
                ESP_LOGI(TAG, "Presion=%.0fPa (temp interna BMP=%.1fC, no usada)", pressure_pa, bmp_temp_c);
            }
        }

        float body_temp_c;
        if (thermistor_read_celsius(adc1, &thermistor, &body_temp_c) == ESP_OK) {
            sensor_data_set_body_temp(body_temp_c);
            ESP_LOGI(TAG, "Temp=%.1fC", body_temp_c);
        }

        int gsr_raw;
        if (gsr_read_raw(adc1, GSR_ADC_CHANNEL, &gsr_raw) == ESP_OK) {
            sensor_data_set_gsr((float)gsr_raw);
            ESP_LOGI(TAG, "GSR=%d", gsr_raw);
        }

        // linea para tools/ecg_serial_monitor.html: activity,pressure,bodytemp,gsr
        // (usa el snapshot completo para no depender de cual lectura salio bien este tick)
        sensor_data_t snap;
        sensor_data_get(&snap);
        printf("S:%.0f,%.0f,%.1f,%.0f\n", snap.activity_pct, snap.cabin_pressure_pa, snap.body_temp_c, snap.gsr_raw);

        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}