# AURORA_ENABLE_WIFI: OFF = solo USB serial (lo que usa la app). ON = ademas WiFi + HTTP (/readings, /ecg).
option(AURORA_ENABLE_WIFI "WiFi + servidor HTTP" OFF)

set(srcs "main.c" "sensor_data.c" "ecg_task.c" "serial_cmd.c")
set(reqs adxl345 bmp180 gsr_sensor ad8232 thermistor esp_driver_uart esp_driver_gpio esp_adc esp_timer)
if(AURORA_ENABLE_WIFI)
    list(APPEND srcs "http_api.c")
    list(APPEND reqs esp_wifi esp_event esp_netif nvs_flash esp_http_server json)
endif()

idf_component_register(SRCS ${srcs}
                    INCLUDE_DIRS "."
                    PRIV_REQUIRES ${reqs})

if(AURORA_ENABLE_WIFI)
    target_compile_definitions(${COMPONENT_LIB} PRIVATE AURORA_ENABLE_WIFI=1)
else()
    target_compile_definitions(${COMPONENT_LIB} PRIVATE AURORA_ENABLE_WIFI=0)
endif()
