#include "http_api.h"
#include "wifi_credentials.h"
#include "sensor_data.h"
#include "ecg_task.h"

#include "freertos/FreeRTOS.h"
#include "freertos/event_groups.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_log.h"
#include "esp_http_server.h"
#include "nvs_flash.h"
#include "cJSON.h"

static const char *TAG = "http_api";

#define WIFI_MAX_RETRY   5
#define WIFI_CONNECTED_BIT BIT0
#define WIFI_FAIL_BIT      BIT1

static EventGroupHandle_t s_wifi_event_group;
static int s_retry_num = 0;

static void wifi_event_handler(void *arg, esp_event_base_t base, int32_t id, void *data)
{
    if (base == WIFI_EVENT && id == WIFI_EVENT_STA_START) {
        esp_wifi_connect();
    } else if (base == WIFI_EVENT && id == WIFI_EVENT_STA_DISCONNECTED) {
        if (s_retry_num < WIFI_MAX_RETRY) {
            esp_wifi_connect();
            s_retry_num++;
            ESP_LOGW(TAG, "WiFi desconectado, reintentando (%d/%d)", s_retry_num, WIFI_MAX_RETRY);
        } else {
            xEventGroupSetBits(s_wifi_event_group, WIFI_FAIL_BIT);
        }
    } else if (base == IP_EVENT && id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t *event = (ip_event_got_ip_t *)data;
        ESP_LOGI(TAG, "IP asignada: " IPSTR, IP2STR(&event->ip_info.ip));
        s_retry_num = 0;
        xEventGroupSetBits(s_wifi_event_group, WIFI_CONNECTED_BIT);
    }
}

void wifi_connect_sta(void)
{
    esp_err_t nvs_err = nvs_flash_init();
    if (nvs_err == ESP_ERR_NVS_NO_FREE_PAGES || nvs_err == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        nvs_err = nvs_flash_init();
    }
    ESP_ERROR_CHECK(nvs_err);

    s_wifi_event_group = xEventGroupCreate();

    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    esp_event_handler_instance_t any_id, got_ip;
    ESP_ERROR_CHECK(esp_event_handler_instance_register(WIFI_EVENT, ESP_EVENT_ANY_ID, &wifi_event_handler, NULL, &any_id));
    ESP_ERROR_CHECK(esp_event_handler_instance_register(IP_EVENT, IP_EVENT_STA_GOT_IP, &wifi_event_handler, NULL, &got_ip));

    wifi_config_t wifi_config = {
        .sta = {
            .ssid = WIFI_SSID,
            .password = WIFI_PASSWORD,
            .threshold.authmode = WIFI_AUTH_WPA2_PSK,
        },
    };
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config));
    ESP_ERROR_CHECK(esp_wifi_start());

    ESP_LOGI(TAG, "Conectando a %s...", WIFI_SSID);
    EventBits_t bits = xEventGroupWaitBits(s_wifi_event_group, WIFI_CONNECTED_BIT | WIFI_FAIL_BIT, pdFALSE, pdFALSE, portMAX_DELAY);

    if (bits & WIFI_CONNECTED_BIT) {
        ESP_LOGI(TAG, "WiFi conectado");
    } else {
        ESP_LOGE(TAG, "No se pudo conectar a %s — revisa wifi_credentials.h", WIFI_SSID);
    }
}

static esp_err_t readings_handler(httpd_req_t *req)
{
    sensor_data_t data;
    sensor_data_get(&data);

    cJSON *root = cJSON_CreateObject();
    cJSON_AddNumberToObject(root, "heartRate", data.heart_rate_bpm);
    cJSON_AddNumberToObject(root, "rrIntervalMs", data.rr_interval_ms);
    cJSON_AddNumberToObject(root, "rmssdMs", data.rmssd_ms);
    cJSON_AddNumberToObject(root, "sdnnMs", data.sdnn_ms);
    cJSON_AddNumberToObject(root, "pnn50Pct", data.pnn50_pct);
    cJSON_AddNumberToObject(root, "ecgRespirationRate", data.ecg_respiration_rate);
    cJSON_AddBoolToObject(root, "irregularBeat", data.irregular_beat);
    cJSON_AddBoolToObject(root, "ecgLeadsOff", data.ecg_leads_off);
    cJSON_AddNumberToObject(root, "gsr", data.gsr_raw);
    cJSON_AddNumberToObject(root, "bodyTemp", data.body_temp_c);
    cJSON_AddNumberToObject(root, "cabinPressure", data.cabin_pressure_pa);
    cJSON_AddNumberToObject(root, "activity", data.activity_pct);

    const char *json = cJSON_PrintUnformatted(root);

    httpd_resp_set_type(req, "application/json");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    httpd_resp_send(req, json, HTTPD_RESP_USE_STRLEN);

    cJSON_free((void *)json);
    cJSON_Delete(root);
    return ESP_OK;
}

// endpoint de verificacion: entrega la señal cruda del ECG para graficarla
// (ver tools/ecg_monitor.html) — sirve para confirmar que el sensor y el
// cableado funcionan, sin depender del resto de la app
static esp_err_t ecg_handler(httpd_req_t *req)
{
    static int waveform[300];
    bool leads_off = true;
    int n = ecg_task_get_waveform(waveform, 300, &leads_off);

    cJSON *root = cJSON_CreateObject();
    cJSON_AddBoolToObject(root, "leadsOff", leads_off);
    cJSON *samples = cJSON_CreateIntArray(waveform, n);
    cJSON_AddItemToObject(root, "samples", samples);

    const char *json = cJSON_PrintUnformatted(root);

    httpd_resp_set_type(req, "application/json");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    httpd_resp_send(req, json, HTTPD_RESP_USE_STRLEN);

    cJSON_free((void *)json);
    cJSON_Delete(root);
    return ESP_OK;
}

static esp_err_t health_handler(httpd_req_t *req)
{
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    httpd_resp_send(req, "ok", HTTPD_RESP_USE_STRLEN);
    return ESP_OK;
}

esp_err_t http_api_start(void)
{
    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    httpd_handle_t server = NULL;

    esp_err_t err = httpd_start(&server, &config);
    if (err != ESP_OK) {
        return err;
    }

    httpd_uri_t readings_uri = {
        .uri = "/readings",
        .method = HTTP_GET,
        .handler = readings_handler,
    };
    httpd_register_uri_handler(server, &readings_uri);

    httpd_uri_t ecg_uri = {
        .uri = "/ecg",
        .method = HTTP_GET,
        .handler = ecg_handler,
    };
    httpd_register_uri_handler(server, &ecg_uri);

    httpd_uri_t health_uri = {
        .uri = "/health",
        .method = HTTP_GET,
        .handler = health_handler,
    };
    httpd_register_uri_handler(server, &health_uri);

    ESP_LOGI(TAG, "Servidor HTTP listo en /readings");
    return ESP_OK;
}
