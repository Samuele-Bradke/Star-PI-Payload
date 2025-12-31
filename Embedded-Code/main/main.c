#include <stdio.h>
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/semphr.h"
#include "driver/gpio.h"
#include "driver/i2c_master.h"
#include "esp_log.h"
#include <stdatomic.h>

static const char *TAG = "main";

#define BUFFER_SIZE     4096    // Increased for multiple sensors
#define SAMPLE_SIZE     64      // Increased to hold data from all sensors

// I2C Configuration
#define I2C_MASTER_SCL_IO           22          // GPIO for I2C clock
#define I2C_MASTER_SDA_IO           21          // GPIO for I2C data
#define I2C_MASTER_NUM              I2C_NUM_0
#define I2C_MASTER_FREQ_HZ          400000      // 400kHz Fast Mode
#define I2C_MASTER_TIMEOUT_MS       10          // Short timeout for speed

// Number of sensors
#define NUM_SENSORS                 3

// Sensor addresses (modify these for your actual sensors)
#define SENSOR_1_ADDR               0x68        // e.g., MPU6050/MPU9250
#define SENSOR_2_ADDR               0x76        // e.g., BME280/BMP280
#define SENSOR_3_ADDR               0x1E        // e.g., HMC5883L magnetometer

// Common registers (adjust per sensor type)
#define DATA_REG_ADDR               0x3B        // Starting register for data read
#define DATA_READ_LEN               6           // Bytes to read per sensor

// Sensor configuration structure
typedef struct {
    uint8_t address;
    uint8_t data_reg;
    uint8_t data_len;
    i2c_master_dev_handle_t dev_handle;
    const char *name;
} SensorConfig_t;

// Global sensor array
static SensorConfig_t sensors[NUM_SENSORS] = {
    { .address = SENSOR_1_ADDR, .data_reg = 0x3B, .data_len = 6, .name = "Sensor1" },
    { .address = SENSOR_2_ADDR, .data_reg = 0xF7, .data_len = 6, .name = "Sensor2" },
    { .address = SENSOR_3_ADDR, .data_reg = 0x03, .data_len = 6, .name = "Sensor3" },
};

static i2c_master_bus_handle_t i2c_bus_handle;

// Lock-free ring buffer structure
typedef struct {
    uint8_t data[BUFFER_SIZE];
    atomic_size_t write_index;      // Only sensor task writes this
    atomic_size_t read_index;       // Only SD task writes this
    SemaphoreHandle_t data_available;  // Optional: for blocking wait
} RingBuffer_t;

static RingBuffer_t ring_buffer;

static TaskHandle_t task_core0_handle = NULL;
static TaskHandle_t task_core1_handle = NULL;

/**
 * Initialize the ring buffer
 */
static void init_ring_buffer(void)
{
    memset(ring_buffer.data, 0, BUFFER_SIZE);
    atomic_store(&ring_buffer.write_index, 0);
    atomic_store(&ring_buffer.read_index, 0);
    ring_buffer.data_available = xSemaphoreCreateCounting(BUFFER_SIZE / SAMPLE_SIZE, 0);
    
    ESP_LOGI(TAG, "Lock-free ring buffer initialized (%d bytes)", BUFFER_SIZE);
}

/**
 * Get available space for writing
 */
static inline size_t ring_buffer_free_space(void)
{
    size_t w = atomic_load(&ring_buffer.write_index);
    size_t r = atomic_load(&ring_buffer.read_index);
    return BUFFER_SIZE - (w - r);
}

/**
 * Get available data for reading
 */
static inline size_t ring_buffer_available(void)
{
    size_t w = atomic_load(&ring_buffer.write_index);
    size_t r = atomic_load(&ring_buffer.read_index);
    return w - r;
}

/**
 * Write data to ring buffer (sensor task only)
 * NO MUTEX NEEDED - only this task modifies write_index
 */
static size_t ring_buffer_write(const uint8_t *data, size_t len)
{
    if (ring_buffer_free_space() < len) {
        ESP_LOGW(TAG, "Buffer full! Dropping data");
        return 0;
    }
    
    size_t w = atomic_load(&ring_buffer.write_index);
    
    // Write data (can happen while SD is reading different part)
    for (size_t i = 0; i < len; i++) {
        ring_buffer.data[(w + i) % BUFFER_SIZE] = data[i];
    }
    
    // Memory barrier ensures data is written before index update
    atomic_store(&ring_buffer.write_index, w + len);
    
    // Signal data available
    xSemaphoreGive(ring_buffer.data_available);
    
    return len;
}

/**
 * Read data from ring buffer (SD task only)
 * NO MUTEX NEEDED - only this task modifies read_index
 */
static size_t ring_buffer_read(uint8_t *data, size_t max_len)
{
    size_t available = ring_buffer_available();
    if (available == 0) {
        return 0;
    }
    
    size_t to_read = (max_len < available) ? max_len : available;
    size_t r = atomic_load(&ring_buffer.read_index);
    
    // Read data (can happen while sensor is writing to different part)
    for (size_t i = 0; i < to_read; i++) {
        data[i] = ring_buffer.data[(r + i) % BUFFER_SIZE];
    }
    
    // Memory barrier ensures data is read before index update
    atomic_store(&ring_buffer.read_index, r + to_read);
    
    return to_read;
}

/**
 * Task running on Core 0 - SD card writing
 */
static void task_sd_write(void *pvParameters)
{
    ESP_LOGI(TAG, "SD Write task started on Core 0");
    
    uint8_t read_buffer[SAMPLE_SIZE];
    
    while (1) {
        // Wait for data
        if (xSemaphoreTake(ring_buffer.data_available, pdMS_TO_TICKS(1000)) == pdTRUE) {
            size_t bytes_read = ring_buffer_read(read_buffer, SAMPLE_SIZE);
            
            if (bytes_read > 0) {
                // TODO: Write to SD card here
                ESP_LOGI(TAG, "SD Write: Got %d bytes", bytes_read);
            }
        }
    }
}

/**
 * Task running on Core 1 - Sensor reading
 */
static void task_sensore_read(void *pvParameters)
{
    ESP_LOGI(TAG, "Sensor Read task started on Core 1");
    
    uint32_t sample_count = 0;
    
    while (1) {
        // Simulate sensor data
        uint8_t sensor_data[SAMPLE_SIZE];
        snprintf((char *)sensor_data, SAMPLE_SIZE, "Sample #%lu @ %lu ms", 
                 sample_count++, (unsigned long)(xTaskGetTickCount() * portTICK_PERIOD_MS));
        
        size_t written = ring_buffer_write(sensor_data, SAMPLE_SIZE);
        
        if (written > 0) {
            ESP_LOGI(TAG, "Sensor: Wrote %d bytes", written);
        }
        
        vTaskDelay(pdMS_TO_TICKS(500));
    }
}



void app_main(void)
{
    ESP_LOGI(TAG, "=== Star PI Payload Main ===");
    
    init_ring_buffer();

    xTaskCreatePinnedToCore(task_sd_write, "sd_write", 4096, NULL, 5, &task_core0_handle, 0);
    xTaskCreatePinnedToCore(task_sensore_read, "sensor_read", 4096, NULL, 5, &task_core1_handle, 1);
    
    ESP_LOGI(TAG, "Both tasks created and running!");
    
    while (1) {
        ESP_LOGI(TAG, "Main: buffer has %d bytes", ring_buffer_available());
        vTaskDelay(pdMS_TO_TICKS(5000));
    }
}
