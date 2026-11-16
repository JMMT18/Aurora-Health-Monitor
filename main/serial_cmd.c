#include "serial_cmd.h"
#include "ecg_task.h"

#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/uart.h"
#include "esp_log.h"

// Comandos que manda la app por el mismo cable USB (UART0, 115200):
//   "MODE EMG\n"  -> el AD8232 pasa a modo electromiografia (sEMG)
//   "MODE ECG\n"  -> vuelve a electrocardiograma
// printf() sigue saliendo por la consola como siempre; aqui solo se lee.

static const char *TAG = "serial_cmd";
#define CMD_UART UART_NUM_0

static void handle_line(const char *line)
{
    if (strcmp(line, "MODE EMG") == 0) {
        ecg_task_set_mode(ECG_MODE_EMG);
    } else if (strcmp(line, "MODE ECG") == 0) {
        ecg_task_set_mode(ECG_MODE_ECG);
    } else if (strcmp(line, "PING") == 0) {
        printf("PONG\n");
    }
}

static void serial_cmd_task(void *arg)
{
    (void)arg;
    char line[32];
    int len = 0;
    uint8_t ch;
    while (1) {
        if (uart_read_bytes(CMD_UART, &ch, 1, pdMS_TO_TICKS(100)) == 1) {
            if (ch == '\n' || ch == '\r') {
                if (len > 0) { line[len] = '\0'; handle_line(line); len = 0; }
            } else if (len < (int)sizeof(line) - 1) {
                line[len++] = (char)ch;
            }
        }
    }
}

void serial_cmd_start(void)
{
    // la consola ya usa UART0; instalar el driver solo agrega el buffer de recepcion
    if (!uart_is_driver_installed(CMD_UART)) {
        esp_err_t err = uart_driver_install(CMD_UART, 256, 0, 0, NULL, 0);
        if (err != ESP_OK) {
            ESP_LOGW(TAG, "No se pudo instalar el driver UART (%s): sin comandos por serial", esp_err_to_name(err));
            return;
        }
    }
    xTaskCreate(serial_cmd_task, "serial_cmd", 3072, NULL, 3, NULL);
}
