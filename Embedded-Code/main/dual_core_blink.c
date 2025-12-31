/**
 * Dual-Core LED Blink Example for ESP32
 * 
 * Demonstrates FreeRTOS multi-threading on ESP32's two cores:
 *   - Core 0: Blinks LED at 500ms interval
 *   - Core 1: Blinks LED at 200ms interval (faster)
 * 
 * The ESP32 has two Xtensa LX6 cores:
 *   - Core 0 (PRO_CPU): Usually runs Wi-Fi/BT stack
 *   - Core 1 (APP_CPU): Usually runs user application
 * 
 * With xTaskCreatePinnedToCore() you can pin a task to a specific core.
 */

#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "esp_log.h"

static const char *TAG = "dual_core_blink";

// GPIO for built-in LED (D2 on many boards is GPIO2)
#define LED_GPIO    GPIO_NUM_2

// Task handles (optional, useful for task management)
static TaskHandle_t task_core0_handle = NULL;
static TaskHandle_t task_core1_handle = NULL;

/**
 * Task running on Core 0
 * Blinks LED slowly (500ms on, 500ms off)
 */
static void task_sd_write(void *pvParameters)
{
    ESP_LOGI(TAG, "Task on Core 0 started (slow blink)");
    
    bool led_state = false;
    
    while (1) {
        led_state = !led_state;
        gpio_set_level(LED_GPIO, led_state);
        
        ESP_LOGI(TAG, "[Core 0] LED %s", led_state ? "ON" : "OFF");
        
        // Blink every 500ms
        vTaskDelay(pdMS_TO_TICKS(500));
    }
}

/**
 * Task running on Core 1
 * Blinks LED fast (200ms on, 200ms off)
 * 
 * Note: Both tasks control the same LED, so you'll see
 * a combined/irregular blinking pattern. This is intentional
 * to show that both cores are running independently!
 */
static void task_sensore_read(void *pvParameters)
{
    ESP_LOGI(TAG, "Task on Core 1 started (fast blink)");
    
    bool led_state = false;
    
    while (1) {
        led_state = !led_state;
        gpio_set_level(LED_GPIO, led_state);
        
        ESP_LOGI(TAG, "[Core 1] LED %s", led_state ? "ON" : "OFF");
        
        // Blink every 200ms
        vTaskDelay(pdMS_TO_TICKS(200));
    }
}

/**
 * Initialize GPIO for LED
 */
static void init_led(void)
{
    gpio_config_t io_conf = {
        .pin_bit_mask = (1ULL << LED_GPIO),
        .mode = GPIO_MODE_OUTPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    gpio_config(&io_conf);
    
    ESP_LOGI(TAG, "LED GPIO %d initialized", LED_GPIO);
}

/**
 * Main entry point
 */
void app_main(void)
{
    ESP_LOGI(TAG, "=== Dual-Core Blink Demo ===");
    ESP_LOGI(TAG, "ESP32 has %d cores", portNUM_PROCESSORS);
    
    // Initialize LED GPIO
    init_led();
    
    /*
     * xTaskCreatePinnedToCore() parameters:
     *   1. Task function
     *   2. Task name (for debugging)
     *   3. Stack size in bytes
     *   4. Parameters to pass to task (NULL here)
     *   5. Priority (higher = more important, 0-24 typically)
     *   6. Task handle (optional, can be NULL)
     *   7. Core ID: 0 = PRO_CPU, 1 = APP_CPU, tskNO_AFFINITY = any core
     */
    
    // Create task pinned to Core 0
    xTaskCreatePinnedToCore(
        task_sd_write,             // Task function
        "blink_core0",          // Task name
        2048,                   // Stack size (bytes)
        NULL,                   // Parameters
        5,                      // Priority
        &task_core0_handle,     // Task handle
        0                       // Core 0 (PRO_CPU)
    );
    
    // Create task pinned to Core 1
    xTaskCreatePinnedToCore(
        task_sensore_read,             // Task function
        "blink_core1",          // Task name
        2048,                   // Stack size (bytes)
        NULL,                   // Parameters
        5,                      // Priority
        &task_core1_handle,     // Task handle
        1                       // Core 1 (APP_CPU)
    );
    
    ESP_LOGI(TAG, "Both tasks created and running!");
    
    // app_main() can return - tasks continue running
    // Optionally, monitor task status here:
    while (1) {
        ESP_LOGI(TAG, "Main task running on core %d", xPortGetCoreID());
        vTaskDelay(pdMS_TO_TICKS(5000));
    }
}
