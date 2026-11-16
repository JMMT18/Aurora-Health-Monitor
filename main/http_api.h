#pragma once

#include "esp_err.h"

// conecta a la red WiFi en modo estacion y bloquea hasta conectar (o agotar reintentos)
void wifi_connect_sta(void);

// levanta el servidor HTTP con GET /readings (JSON) y GET /health
esp_err_t http_api_start(void);
