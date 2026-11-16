#pragma once

#include "driver/i2c_master.h"
#include "esp_err.h"

// crea el dispositivo I2C y lee los coeficientes de calibracion de fabrica
esp_err_t bmp180_init(i2c_master_bus_handle_t bus, i2c_master_dev_handle_t *dev);

// lee temperatura (C) y presion (Pa) compensadas
esp_err_t bmp180_read(i2c_master_dev_handle_t dev, float *temp_c, float *pressure_pa);
