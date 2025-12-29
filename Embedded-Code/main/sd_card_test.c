/**
 * SD Card Test for ESP-IDF
 * 
 * This example demonstrates SD card operations using ESP-IDF's SDMMC/SPI driver
 * and FATFS filesystem.
 */

#include <stdio.h>
#include <string.h>
#include <sys/unistd.h>
#include <sys/stat.h>
#include <dirent.h>
#include "esp_log.h"
#include "esp_vfs_fat.h"
#include "sdmmc_cmd.h"
#include "driver/sdmmc_host.h"
#include "driver/sdspi_host.h"
#include "driver/spi_common.h"
#include "esp_timer.h"

static const char *TAG = "sd_card_test";

// Mount point for the SD card
#define MOUNT_POINT "/sdcard"

// SPI bus configuration - adjust these pins for your board
#define PIN_NUM_MISO  19
#define PIN_NUM_MOSI  23
#define PIN_NUM_CLK   18
#define PIN_NUM_CS    5

// Set to 1 to use SPI mode, 0 for SDMMC mode (if supported by your board)
#define USE_SPI_MODE  1

static sdmmc_card_t *card = NULL;

/**
 * Get current time in milliseconds (replacement for Arduino millis())
 */
static uint32_t millis(void) {
    return (uint32_t)(esp_timer_get_time() / 1000);
}

/**
 * List directory contents
 */
void list_dir(const char *dirname, uint8_t levels) {
    ESP_LOGI(TAG, "Listing directory: %s", dirname);
    
    char full_path[256];
    snprintf(full_path, sizeof(full_path), "%s%s", MOUNT_POINT, dirname);
    
    DIR *dir = opendir(full_path);
    if (!dir) {
        ESP_LOGE(TAG, "Failed to open directory");
        return;
    }
    
    struct dirent *entry;
    struct stat entry_stat;
    char entry_path[512];
    
    while ((entry = readdir(dir)) != NULL) {
        snprintf(entry_path, sizeof(entry_path), "%s/%s", full_path, entry->d_name);
        
        if (stat(entry_path, &entry_stat) == -1) {
            ESP_LOGE(TAG, "Failed to stat %s", entry->d_name);
            continue;
        }
        
        if (S_ISDIR(entry_stat.st_mode)) {
            ESP_LOGI(TAG, "  DIR : %s", entry->d_name);
            if (levels > 0) {
                char subdir[512];
                snprintf(subdir, sizeof(subdir), "%s/%s", dirname, entry->d_name);
                list_dir(subdir, levels - 1);
            }
        } else {
            ESP_LOGI(TAG, "  FILE: %s  SIZE: %ld", entry->d_name, entry_stat.st_size);
        }
    }
    
    closedir(dir);
}

/**
 * Create a directory
 */
void create_dir(const char *path) {
    ESP_LOGI(TAG, "Creating Dir: %s", path);
    
    char full_path[256];
    snprintf(full_path, sizeof(full_path), "%s%s", MOUNT_POINT, path);
    
    if (mkdir(full_path, 0775) == 0) {
        ESP_LOGI(TAG, "Dir created");
    } else {
        ESP_LOGE(TAG, "mkdir failed");
    }
}

/**
 * Remove a directory
 */
void remove_dir(const char *path) {
    ESP_LOGI(TAG, "Removing Dir: %s", path);
    
    char full_path[256];
    snprintf(full_path, sizeof(full_path), "%s%s", MOUNT_POINT, path);
    
    if (rmdir(full_path) == 0) {
        ESP_LOGI(TAG, "Dir removed");
    } else {
        ESP_LOGE(TAG, "rmdir failed");
    }
}

/**
 * Read and print file contents
 */
void read_file(const char *path) {
    ESP_LOGI(TAG, "Reading file: %s", path);
    
    char full_path[256];
    snprintf(full_path, sizeof(full_path), "%s%s", MOUNT_POINT, path);
    
    FILE *file = fopen(full_path, "r");
    if (!file) {
        ESP_LOGE(TAG, "Failed to open file for reading");
        return;
    }
    
    char line[256];
    printf("Read from file: ");
    while (fgets(line, sizeof(line), file)) {
        printf("%s", line);
    }
    printf("\n");
    
    fclose(file);
}

/**
 * Write data to a file (overwrite)
 */
void write_file(const char *path, const char *message) {
    ESP_LOGI(TAG, "Writing file: %s", path);
    
    char full_path[256];
    snprintf(full_path, sizeof(full_path), "%s%s", MOUNT_POINT, path);
    
    FILE *file = fopen(full_path, "w");
    if (!file) {
        ESP_LOGE(TAG, "Failed to open file for writing");
        return;
    }
    
    if (fprintf(file, "%s", message) > 0) {
        ESP_LOGI(TAG, "File written");
    } else {
        ESP_LOGE(TAG, "Write failed");
    }
    
    fclose(file);
}

/**
 * Append data to a file
 */
void append_file(const char *path, const char *message) {
    ESP_LOGI(TAG, "Appending to file: %s", path);
    
    char full_path[256];
    snprintf(full_path, sizeof(full_path), "%s%s", MOUNT_POINT, path);
    
    FILE *file = fopen(full_path, "a");
    if (!file) {
        ESP_LOGE(TAG, "Failed to open file for appending");
        return;
    }
    
    if (fprintf(file, "%s", message) > 0) {
        ESP_LOGI(TAG, "Message appended");
    } else {
        ESP_LOGE(TAG, "Append failed");
    }
    
    fclose(file);
}

/**
 * Rename a file
 */
void rename_file(const char *path1, const char *path2) {
    ESP_LOGI(TAG, "Renaming file %s to %s", path1, path2);
    
    char full_path1[256], full_path2[256];
    snprintf(full_path1, sizeof(full_path1), "%s%s", MOUNT_POINT, path1);
    snprintf(full_path2, sizeof(full_path2), "%s%s", MOUNT_POINT, path2);
    
    if (rename(full_path1, full_path2) == 0) {
        ESP_LOGI(TAG, "File renamed");
    } else {
        ESP_LOGE(TAG, "Rename failed");
    }
}

/**
 * Delete a file
 */
void delete_file(const char *path) {
    ESP_LOGI(TAG, "Deleting file: %s", path);
    
    char full_path[256];
    snprintf(full_path, sizeof(full_path), "%s%s", MOUNT_POINT, path);
    
    if (unlink(full_path) == 0) {
        ESP_LOGI(TAG, "File deleted");
    } else {
        ESP_LOGE(TAG, "Delete failed");
    }
}

/**
 * Test file I/O performance
 */
void test_file_io(const char *path) {
    char full_path[256];
    snprintf(full_path, sizeof(full_path), "%s%s", MOUNT_POINT, path);
    
    static uint8_t buf[512];
    memset(buf, 0xAA, sizeof(buf));  // Fill buffer with test pattern
    
    // Test read performance
    FILE *file = fopen(full_path, "r");
    if (file) {
        fseek(file, 0, SEEK_END);
        size_t flen = ftell(file);
        fseek(file, 0, SEEK_SET);
        
        size_t len = flen;
        uint32_t start = millis();
        
        while (len > 0) {
            size_t to_read = (len > 512) ? 512 : len;
            fread(buf, 1, to_read, file);
            len -= to_read;
        }
        
        uint32_t duration = millis() - start;
        ESP_LOGI(TAG, "%u bytes read for %lu ms", (unsigned int)flen, (unsigned long)duration);
        fclose(file);
    } else {
        ESP_LOGE(TAG, "Failed to open file for reading");
    }
    
    // Test write performance
    file = fopen(full_path, "w");
    if (!file) {
        ESP_LOGE(TAG, "Failed to open file for writing");
        return;
    }
    
    uint32_t start = millis();
    for (int i = 0; i < 2048; i++) {
        fwrite(buf, 1, 512, file);
    }
    uint32_t duration = millis() - start;
    
    ESP_LOGI(TAG, "%u bytes written for %lu ms", 2048 * 512, (unsigned long)duration);
    fclose(file);
}

/**
 * Initialize and mount SD card
 */
esp_err_t sd_card_init(void) {
    esp_err_t ret;
    
    // Options for mounting the filesystem
    esp_vfs_fat_sdmmc_mount_config_t mount_config = {
        .format_if_mount_failed = false,
        .max_files = 5,
        .allocation_unit_size = 16 * 1024
    };
    
    ESP_LOGI(TAG, "Initializing SD card");

#if USE_SPI_MODE
    ESP_LOGI(TAG, "Using SPI peripheral");
    
    sdmmc_host_t host = SDSPI_HOST_DEFAULT();
    
    spi_bus_config_t bus_cfg = {
        .mosi_io_num = PIN_NUM_MOSI,
        .miso_io_num = PIN_NUM_MISO,
        .sclk_io_num = PIN_NUM_CLK,
        .quadwp_io_num = -1,
        .quadhd_io_num = -1,
        .max_transfer_sz = 4000,
    };
    
    ret = spi_bus_initialize(host.slot, &bus_cfg, SDSPI_DEFAULT_DMA);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to initialize bus.");
        return ret;
    }
    
    sdspi_device_config_t slot_config = SDSPI_DEVICE_CONFIG_DEFAULT();
    slot_config.gpio_cs = PIN_NUM_CS;
    slot_config.host_id = host.slot;
    
    ret = esp_vfs_fat_sdspi_mount(MOUNT_POINT, &host, &slot_config, &mount_config, &card);
    
#else
    ESP_LOGI(TAG, "Using SDMMC peripheral");
    
    sdmmc_host_t host = SDMMC_HOST_DEFAULT();
    
    // This initializes the slot without card detect (CD) and write protect (WP) signals.
    sdmmc_slot_config_t slot_config = SDMMC_SLOT_CONFIG_DEFAULT();
    
    // Set bus width to 1-line mode (set to 4 for 4-line mode if supported)
    slot_config.width = 1;
    
    ret = esp_vfs_fat_sdmmc_mount(MOUNT_POINT, &host, &slot_config, &mount_config, &card);
#endif

    if (ret != ESP_OK) {
        if (ret == ESP_FAIL) {
            ESP_LOGE(TAG, "Failed to mount filesystem. "
                     "If you want the card to be formatted, set format_if_mount_failed = true.");
        } else {
            ESP_LOGE(TAG, "Failed to initialize the card (%s). "
                     "Make sure SD card lines have pull-up resistors in place.", esp_err_to_name(ret));
        }
        return ret;
    }
    
    ESP_LOGI(TAG, "Filesystem mounted");
    
    // Card has been initialized, print its properties
    sdmmc_card_print_info(stdout, card);
    
    return ESP_OK;
}

/**
 * Unmount SD card
 */
void sd_card_deinit(void) {
#if USE_SPI_MODE
    esp_vfs_fat_sdcard_unmount(MOUNT_POINT, card);
    ESP_LOGI(TAG, "Card unmounted");
    
    // Deinitialize the bus after unmounting
    sdmmc_host_t host = SDSPI_HOST_DEFAULT();
    spi_bus_free(host.slot);
#else
    esp_vfs_fat_sdcard_unmount(MOUNT_POINT, card);
    ESP_LOGI(TAG, "Card unmounted");
#endif
}

/**
 * Get SD card info
 */
void print_sd_card_info(void) {
    if (card == NULL) {
        ESP_LOGE(TAG, "Card not initialized");
        return;
    }
    
    FATFS *fs;
    DWORD fre_clust, fre_sect, tot_sect;
    
    // Get volume information and free clusters
    if (f_getfree(MOUNT_POINT, &fre_clust, &fs) == FR_OK) {
        // Calculate total and free space
        tot_sect = (fs->n_fatent - 2) * fs->csize;
        fre_sect = fre_clust * fs->csize;
        
        // Assuming 512 bytes/sector
        uint64_t total_mb = (uint64_t)tot_sect * 512 / (1024 * 1024);
        uint64_t free_mb = (uint64_t)fre_sect * 512 / (1024 * 1024);
        uint64_t used_mb = total_mb - free_mb;
        
        ESP_LOGI(TAG, "Total space: %llu MB", total_mb);
        ESP_LOGI(TAG, "Used space: %llu MB", used_mb);
        ESP_LOGI(TAG, "Free space: %llu MB", free_mb);
    } else {
        ESP_LOGE(TAG, "Failed to get free space info");
    }
}

/**
 * Run SD card test
 */
void sd_card_test(void) {
    // Initialize SD card
    if (sd_card_init() != ESP_OK) {
        ESP_LOGE(TAG, "Card Mount Failed");
        return;
    }
    
    // Run tests
    list_dir("/", 0);
    create_dir("/mydir");
    list_dir("/", 0);
    remove_dir("/mydir");
    list_dir("/", 2);
    write_file("/hello.txt", "Hello ");
    append_file("/hello.txt", "World!\n");
    read_file("/hello.txt");
    delete_file("/foo.txt");
    rename_file("/hello.txt", "/foo.txt");
    read_file("/foo.txt");
    test_file_io("/test.txt");
    print_sd_card_info();
    
    // Cleanup
    sd_card_deinit();
}

/**
 * Main entry point for ESP-IDF
 */
void app_main(void) {
    sd_card_test();
}