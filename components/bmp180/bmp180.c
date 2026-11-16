#include "bmp180.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_log.h"

static const char *TAG = "bmp180";

#define BMP180_ADDR       0x77
#define REG_CALIB_START   0xAA
#define REG_CONTROL       0xF4
#define REG_RESULT        0xF6
#define CMD_READ_TEMP     0x2E
#define CMD_READ_PRESSURE 0x34
#define SCO_BIT           0x20  // bit "conversion en curso" en REG_CONTROL

// coeficientes de fabrica, se leen una sola vez en el init
static struct {
    int16_t AC1, AC2, AC3;
    uint16_t AC4, AC5, AC6;
    int16_t B1, B2;
    int16_t MB, MC, MD;
} s_calib;

static esp_err_t read_bytes(i2c_master_dev_handle_t dev, uint8_t reg, uint8_t *buf, size_t len)
{
    return i2c_master_transmit_receive(dev, &reg, 1, buf, len, 1000);
}

static esp_err_t write_reg(i2c_master_dev_handle_t dev, uint8_t reg, uint8_t val)
{
    uint8_t out[2] = { reg, val };
    return i2c_master_transmit(dev, out, sizeof(out), 1000);
}

// espera a que el sensor termine la conversion (bit SCO en bajo), en vez de adivinar un tiempo fijo
static esp_err_t wait_conversion(i2c_master_dev_handle_t dev)
{
    for (int i = 0; i < 30; i++) {
        uint8_t ctrl;
        esp_err_t err = read_bytes(dev, REG_CONTROL, &ctrl, 1);
        if (err != ESP_OK) {
            return err;
        }
        if ((ctrl & SCO_BIT) == 0) {
            return ESP_OK;
        }
        vTaskDelay(pdMS_TO_TICKS(1));
    }
    return ESP_ERR_TIMEOUT;
}

esp_err_t bmp180_init(i2c_master_bus_handle_t bus, i2c_master_dev_handle_t *dev)
{
    i2c_device_config_t cfg = {
        .dev_addr_length = I2C_ADDR_BIT_LEN_7,
        .device_address = BMP180_ADDR,
        .scl_speed_hz = 100000,
    };

    esp_err_t err = i2c_master_bus_add_device(bus, &cfg, dev);
    if (err != ESP_OK) {
        return err;
    }

    // lee los 22 bytes de calibracion grabados en fabrica
    uint8_t raw[22];
    err = read_bytes(*dev, REG_CALIB_START, raw, sizeof(raw));
    if (err != ESP_OK) {
        return err;
    }

    s_calib.AC1 = (int16_t)((raw[0] << 8) | raw[1]);
    s_calib.AC2 = (int16_t)((raw[2] << 8) | raw[3]);
    s_calib.AC3 = (int16_t)((raw[4] << 8) | raw[5]);
    s_calib.AC4 = (uint16_t)((raw[6] << 8) | raw[7]);
    s_calib.AC5 = (uint16_t)((raw[8] << 8) | raw[9]);
    s_calib.AC6 = (uint16_t)((raw[10] << 8) | raw[11]);
    s_calib.B1  = (int16_t)((raw[12] << 8) | raw[13]);
    s_calib.B2  = (int16_t)((raw[14] << 8) | raw[15]);
    s_calib.MB  = (int16_t)((raw[16] << 8) | raw[17]);
    s_calib.MC  = (int16_t)((raw[18] << 8) | raw[19]);
    s_calib.MD  = (int16_t)((raw[20] << 8) | raw[21]);

    // DEBUG: confirma que la calibracion de fabrica se leyo bien
    ESP_LOGI(TAG, "calib AC1=%d AC2=%d AC3=%d AC4=%u AC5=%u AC6=%u B1=%d B2=%d MB=%d MC=%d MD=%d",
             s_calib.AC1, s_calib.AC2, s_calib.AC3, s_calib.AC4, s_calib.AC5, s_calib.AC6,
             s_calib.B1, s_calib.B2, s_calib.MB, s_calib.MC, s_calib.MD);

    return ESP_OK;
}

esp_err_t bmp180_read(i2c_master_dev_handle_t dev, float *temp_c, float *pressure_pa)
{
    esp_err_t err;
    uint8_t raw[3];

    // paso 1: temperatura sin compensar
    err = write_reg(dev, REG_CONTROL, CMD_READ_TEMP);
    if (err != ESP_OK) {
        return err;
    }
    err = wait_conversion(dev);
    if (err != ESP_OK) {
        return err;
    }
    err = read_bytes(dev, REG_RESULT, raw, 2);
    if (err != ESP_OK) {
        return err;
    }
    int32_t UT = (raw[0] << 8) | raw[1];

    // paso 2: presion sin compensar, modo oversampling 0
    err = write_reg(dev, REG_CONTROL, CMD_READ_PRESSURE);
    if (err != ESP_OK) {
        return err;
    }
    err = wait_conversion(dev);
    if (err != ESP_OK) {
        return err;
    }
    err = read_bytes(dev, REG_RESULT, raw, 3);
    if (err != ESP_OK) {
        return err;
    }
    int32_t UP = ((raw[0] << 16) | (raw[1] << 8) | raw[2]) >> 8;

    // DEBUG: valores crudos sin compensar
    ESP_LOGI(TAG, "UT=%ld UP=%ld", (long)UT, (long)UP);

    // formulas de compensacion del datasheet Bosch BMP180
    int32_t X1 = (UT - s_calib.AC6) * s_calib.AC5 >> 15;
    int32_t X2 = (s_calib.MC << 11) / (X1 + s_calib.MD);
    int32_t B5 = X1 + X2;
    int32_t T = (B5 + 8) >> 4;
    *temp_c = T / 10.0f;

    int32_t B6 = B5 - 4000;
    X1 = (s_calib.B2 * (B6 * B6 >> 12)) >> 11;
    X2 = (s_calib.AC2 * B6) >> 11;
    int32_t X3 = X1 + X2;
    int32_t B3 = ((s_calib.AC1 * 4 + X3) + 2) >> 2;
    X1 = (s_calib.AC3 * B6) >> 13;
    X2 = (s_calib.B1 * (B6 * B6 >> 12)) >> 16;
    X3 = (X1 + X2 + 2) >> 2;
    uint32_t B4 = s_calib.AC4 * (uint32_t)(X3 + 32768) >> 15;
    uint32_t B7 = ((uint32_t)UP - B3) * 50000;

    int32_t p;
    if (B7 < 0x80000000) {
        p = (B7 * 2) / B4;
    } else {
        p = (B7 / B4) * 2;
    }

    X1 = (p >> 8) * (p >> 8);
    X1 = (X1 * 3038) >> 16;
    X2 = (-7357 * p) >> 16;
    p = p + ((X1 + X2 + 3791) >> 4);

    *pressure_pa = (float)p;

    return ESP_OK;
}
