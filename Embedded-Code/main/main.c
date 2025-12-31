#include <stdio.h>
#include <string.h>
#include <sys/unistd.h>
#include <sys/stat.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/semphr.h"
#include "driver/gpio.h"
#include "driver/i2c_master.h"
#include "esp_vfs_fat.h"
#include "sdmmc_cmd.h"
#include "driver/sdmmc_host.h"
#include "esp_log.h"
#include <stdatomic.h>

static const char *TAG = "main";

// SD Card Configuration
#define MOUNT_POINT "/sdcard"
#define DATA_FILE   MOUNT_POINT "/sensor_data.csv"
static sdmmc_card_t *sd_card = NULL;
static FILE *data_file = NULL;

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
 * Initialize I2C bus and add all sensors
 */
static esp_err_t i2c_sensors_init(void)
{
    // Configure I2C bus (shared by all sensors)
    i2c_master_bus_config_t bus_config = {
        .i2c_port = I2C_MASTER_NUM,
        .sda_io_num = I2C_MASTER_SDA_IO,
        .scl_io_num = I2C_MASTER_SCL_IO,
        .clk_source = I2C_CLK_SRC_DEFAULT,
        .glitch_ignore_cnt = 7,
        .flags.enable_internal_pullup = true,
    };
    
    esp_err_t ret = i2c_new_master_bus(&bus_config, &i2c_bus_handle);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to create I2C bus: %s", esp_err_to_name(ret));
        return ret;
    }
    
    // Add each sensor to the bus
    for (int i = 0; i < NUM_SENSORS; i++) {
        i2c_device_config_t dev_config = {
            .dev_addr_length = I2C_ADDR_BIT_LEN_7,
            .device_address = sensors[i].address,
            .scl_speed_hz = I2C_MASTER_FREQ_HZ,
        };
        
        ret = i2c_master_bus_add_device(i2c_bus_handle, &dev_config, &sensors[i].dev_handle);
        if (ret != ESP_OK) {
            ESP_LOGE(TAG, "Failed to add %s (0x%02X): %s", 
                     sensors[i].name, sensors[i].address, esp_err_to_name(ret));
        } else {
            ESP_LOGI(TAG, "Added %s at address 0x%02X", sensors[i].name, sensors[i].address);
        }
    }
    
    ESP_LOGI(TAG, "I2C bus initialized with %d sensors at %d Hz", NUM_SENSORS, I2C_MASTER_FREQ_HZ);
    return ESP_OK;
}

/**
 * Read data from a specific sensor
 */
static esp_err_t sensor_read_data(int sensor_idx, uint8_t *data)
{
    if (sensor_idx >= NUM_SENSORS) return ESP_ERR_INVALID_ARG;
    
    SensorConfig_t *sensor = &sensors[sensor_idx];
    
    return i2c_master_transmit_receive(
        sensor->dev_handle,
        &sensor->data_reg,
        1,
        data,
        sensor->data_len,
        I2C_MASTER_TIMEOUT_MS / portTICK_PERIOD_MS
    );
}

/**
 * Initialize SD card
 */
static esp_err_t sd_card_init(void)
{
    ESP_LOGI(TAG, "Initializing SD card...");
    
    esp_vfs_fat_sdmmc_mount_config_t mount_config = {
        .format_if_mount_failed = false,
        .max_files = 5,
        .allocation_unit_size = 16 * 1024
    };
    
    sdmmc_host_t host = SDMMC_HOST_DEFAULT();
    host.max_freq_khz = SDMMC_FREQ_HIGHSPEED;  // 40MHz for speed
    
    sdmmc_slot_config_t slot_config = SDMMC_SLOT_CONFIG_DEFAULT();
    slot_config.width = 1;  // 1-bit mode (use 4 for 4-bit if wired)
    slot_config.flags |= SDMMC_SLOT_FLAG_INTERNAL_PULLUP;
    
    // Set GPIO pins for SD card (adjust for your board)
    // Default ESP32: CLK=14, CMD=15, D0=2 (conflicts with LED!)
    // You may need to change these
    slot_config.clk = GPIO_NUM_14;
    slot_config.cmd = GPIO_NUM_15;
    slot_config.d0 = GPIO_NUM_2;
    
    esp_err_t ret = esp_vfs_fat_sdmmc_mount(MOUNT_POINT, &host, &slot_config, &mount_config, &sd_card);
    
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to mount SD card: %s", esp_err_to_name(ret));
        return ret;
    }
    
    ESP_LOGI(TAG, "SD card mounted successfully");
    sdmmc_card_print_info(stdout, sd_card);
    
    return ESP_OK;
}

/**
 * Open data file and write CSV header
 */
static esp_err_t open_data_file(void)
{
    // Check if file exists to decide whether to write header
    struct stat st;
    bool file_exists = (stat(DATA_FILE, &st) == 0);
    
    data_file = fopen(DATA_FILE, "a");  // Append mode
    if (data_file == NULL) {
        ESP_LOGE(TAG, "Failed to open data file");
        return ESP_FAIL;
    }
    
    // Write CSV header if new file
    if (!file_exists) {
        fprintf(data_file, "timestamp_ms,sample_num,");
        for (int i = 0; i < NUM_SENSORS; i++) {
            for (int j = 0; j < sensors[i].data_len; j++) {
                fprintf(data_file, "%s_byte%d", sensors[i].name, j);
                if (i < NUM_SENSORS - 1 || j < sensors[i].data_len - 1) {
                    fprintf(data_file, ",");
                }
            }
        }
        fprintf(data_file, "\n");
        fflush(data_file);
        ESP_LOGI(TAG, "Created new data file with header: %s", DATA_FILE);
    } else {
        ESP_LOGI(TAG, "Appending to existing file: %s", DATA_FILE);
    }
    
    return ESP_OK;
}

/**
 * Task running on Core 0 - SD card writing
 */
static void task_sd_write(void *pvParameters)
{
    ESP_LOGI(TAG, "SD Write task started on Core 0");
    
    uint8_t read_buffer[SAMPLE_SIZE];
    uint32_t lines_written = 0;
    
    while (1) {
        // Wait for data
        if (xSemaphoreTake(ring_buffer.data_available, pdMS_TO_TICKS(1000)) == pdTRUE) {
            size_t bytes_read = ring_buffer_read(read_buffer, SAMPLE_SIZE);
            
            if (bytes_read > 0 && data_file != NULL) {
                // Parse the buffer: [timestamp (4)] [sample_num (4)] [sensor1 data] [sensor2 data] [sensor3 data]
                uint32_t timestamp, sample_num;
                memcpy(&timestamp, read_buffer, sizeof(timestamp));
                memcpy(&sample_num, read_buffer + 4, sizeof(sample_num));
                
                // Write CSV line: timestamp, sample_num, then all sensor bytes
                fprintf(data_file, "%lu,%lu", (unsigned long)timestamp, (unsigned long)sample_num);
                
                // Write sensor data bytes
                size_t offset = 8;  // After timestamp and sample_num
                for (int i = 0; i < NUM_SENSORS; i++) {
                    for (int j = 0; j < sensors[i].data_len; j++) {
                        fprintf(data_file, ",%d", read_buffer[offset + j]);
                    }
                    offset += sensors[i].data_len;
                }
                fprintf(data_file, "\n");
                
                lines_written++;
                
                // Flush every 100 lines to ensure data is saved
                if (lines_written % 100 == 0) {
                    fflush(data_file);
                    ESP_LOGI(TAG, "SD: Written %lu lines", (unsigned long)lines_written);
                }
            }
        }
    }
}

/**
 * Task running on Core 1 - Sensor reading
 * Reads all sensors sequentially as fast as possible
 */
static void task_sensor_read(void *pvParameters)
{
    ESP_LOGI(TAG, "Sensor Read task started on Core 1");
    
    uint32_t sample_count = 0;
    uint8_t sensor_data[DATA_READ_LEN];
    
    // Buffer to hold combined data from all sensors + timestamp
    // Format: [timestamp (4 bytes)] [sensor1 data] [sensor2 data] [sensor3 data]
    uint8_t combined_data[SAMPLE_SIZE];
    
    while (1) {
        uint32_t start_time = xTaskGetTickCount() * portTICK_PERIOD_MS;
        size_t offset = 0;
        
        // Add timestamp at the beginning
        memcpy(combined_data, &start_time, sizeof(start_time));
        offset += sizeof(start_time);
        
        // Add sample counter
        memcpy(combined_data + offset, &sample_count, sizeof(sample_count));
        offset += sizeof(sample_count);
        
        // Read all sensors sequentially (as fast as possible)
        for (int i = 0; i < NUM_SENSORS; i++) {
            esp_err_t ret = sensor_read_data(i, sensor_data);
            
            if (ret == ESP_OK) {
                // Copy sensor data to combined buffer
                memcpy(combined_data + offset, sensor_data, sensors[i].data_len);
            } else {
                // Fill with zeros on error (or could use error marker)
                memset(combined_data + offset, 0xFF, sensors[i].data_len);
                ESP_LOGW(TAG, "Failed to read %s: %s", sensors[i].name, esp_err_to_name(ret));
            }
            offset += sensors[i].data_len;
        }
        
        // Write combined data to ring buffer
        size_t written = ring_buffer_write(combined_data, offset);
        
        if (written > 0) {
            sample_count++;
            // Only log occasionally to not slow down
            if (sample_count % 100 == 0) {
                uint32_t elapsed = (xTaskGetTickCount() * portTICK_PERIOD_MS) - start_time;
                ESP_LOGI(TAG, "Sample %lu: %d bytes in %lu ms", sample_count, written, elapsed);
            }
        }
        
        // Minimal delay - just yield to other tasks
        // Remove or reduce this for maximum speed
        vTaskDelay(pdMS_TO_TICKS(10));  // 100 Hz sampling rate
    }
}



/**
 * Cleanup on shutdown
 */
static void cleanup(void)
{
    if (data_file != NULL) {
        fflush(data_file);
        fclose(data_file);
        data_file = NULL;
        ESP_LOGI(TAG, "Data file closed");
    }
    
    if (sd_card != NULL) {
        esp_vfs_fat_sdcard_unmount(MOUNT_POINT, sd_card);
        sd_card = NULL;
        ESP_LOGI(TAG, "SD card unmounted");
    }
}

void app_main(void)
{
    ESP_LOGI(TAG, "=== Star PI Payload Main ===");
    
    // Initialize SD card FIRST
    esp_err_t ret = sd_card_init();
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "SD card init failed! Continuing without logging...");
    } else {
        // Open data file for writing
        ret = open_data_file();
        if (ret != ESP_OK) {
            ESP_LOGE(TAG, "Failed to open data file!");
        }
    }
    
    // Initialize I2C and sensors
    ESP_ERROR_CHECK(i2c_sensors_init());
    
    // Initialize ring buffer
    init_ring_buffer();

    // Create tasks with larger stack for file operations
    xTaskCreatePinnedToCore(task_sd_write, "sd_write", 8192, NULL, 5, &task_core0_handle, 0);
    xTaskCreatePinnedToCore(task_sensor_read, "sensor_read", 4096, NULL, 6, &task_core1_handle, 1);
    
    ESP_LOGI(TAG, "Both tasks created and running!");
    ESP_LOGI(TAG, "Data will be saved to: %s", DATA_FILE);
    
    while (1) {
        ESP_LOGI(TAG, "Main: buffer has %d bytes", ring_buffer_available());
        vTaskDelay(pdMS_TO_TICKS(5000));
    }
    
    // This won't be reached, but good practice
    cleanup();
}
