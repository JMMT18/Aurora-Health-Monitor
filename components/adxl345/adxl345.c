#include "adxl345.h"

#define REG_POWER_CTL   0x2D
#define REG_DATA_FORMAT 0x31
#define REG_DATAX0      0x32

// escribe un registro de 1 byte
static esp_err_t write_reg(i2c_master_dev_handle_t dev, uint8_t reg, uint8_t val)
{
    uint8_t buf[2] = { reg, val };
    return i2c_master_transmit(dev, buf, sizeof(buf), 1000);
}

esp_err_t adxl345_init(i2c_master_bus_handle_t bus, i2c_master_dev_handle_t *dev)
{
    i2c_device_config_t cfg = {
        .dev_addr_length = I2C_ADDR_BIT_LEN_7,
        .device_address = ADXL345_I2C_ADDR,
        .scl_speed_hz = 400000,
    };

    esp_err_t err = i2c_master_bus_add_device(bus, &cfg, dev);
    if (err != ESP_OK) {
        return err;
    }

    // rango +-2g, resolucion completa
    err = write_reg(*dev, REG_DATA_FORMAT, 0x08);
    if (err != ESP_OK) {
        return err;
    }

    // saca el sensor de modo standby y activa medicion
    return write_reg(*dev, REG_POWER_CTL, 0x08);
}

esp_err_t adxl345_read(i2c_master_dev_handle_t dev, adxl345_data_t *data)
{
    uint8_t reg = REG_DATAX0;
    uint8_t raw[6];

    esp_err_t err = i2c_master_transmit_receive(dev, &reg, 1, raw, sizeof(raw), 1000);
    if (err != ESP_OK) {
        return err;
    }

    // cada eje viene en 2 bytes, LSB primero
    data->x = (int16_t)((raw[1] << 8) | raw[0]);
    data->y = (int16_t)((raw[3] << 8) | raw[2]);
    data->z = (int16_t)((raw[5] << 8) | raw[4]);

    return ESP_OK;
}
