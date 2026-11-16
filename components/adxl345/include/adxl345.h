#pragma once

#include "driver/i2c_master.h"
#include "esp_err.h"

// direccion I2C por defecto del ADXL345 (SDO a GND)
#define ADXL345_I2C_ADDR 0x53

typedef struct {
    int16_t x;
    int16_t y;
    int16_t z;
} adxl345_data_t;

// crea el dispositivo I2C y arranca el modo medicion
esp_err_t adxl345_init(i2c_master_bus_handle_t bus, i2c_master_dev_handle_t *dev);

// lee aceleracion cruda en los 3 ejes
esp_err_t adxl345_read(i2c_master_dev_handle_t dev, adxl345_data_t *data);
