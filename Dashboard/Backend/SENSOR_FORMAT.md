# Sensor Data Format Guide

## Expected TXT File Format

Your sensor data TXT file from the SD card should follow this format (comma-separated values):

```
time,altitude,velocity,horizontalVelocity,acceleration,accelerationX,accelerationY,accelerationZ,temperature,pressure,humidity,gpsLat,gpsLon,pitch,roll,yaw
0.0,0,0,0,0,0,0,0,22.5,101.3,45,37.7749,-122.4194,0,0,0
0.1,5,10,2,9.8,9.5,0.5,0.3,22.4,101.2,44,37.7750,-122.4193,2,1,5
0.2,15,25,5,12.5,12.0,1.2,0.8,22.3,101.1,44,37.7751,-122.4192,4,2,10
...
```

### Column Descriptions

| Column | Description | Unit |
|--------|-------------|------|
| time | Timestamp from launch | seconds |
| altitude | Height above ground | meters |
| velocity | Vertical velocity | m/s |
| horizontalVelocity | Horizontal velocity | m/s |
| acceleration | Total acceleration magnitude | m/s² |
| accelerationX | X-axis acceleration | m/s² |
| accelerationY | Y-axis acceleration | m/s² |
| accelerationZ | Z-axis acceleration | m/s² |
| temperature | Ambient temperature | °C |
| pressure | Atmospheric pressure | kPa |
| humidity | Relative humidity | % |
| gpsLat | GPS latitude | degrees |
| gpsLon | GPS longitude | degrees |
| pitch | Pitch angle | degrees |
| roll | Roll angle | degrees |
| yaw | Yaw angle | degrees |

## Flexible Parsing

The server supports:
- **Delimiters**: comma (`,`), semicolon (`;`), tab, or space
- **Headers**: Optional first row with column names (auto-detected)
- **Partial data**: Missing columns will be filled with defaults

## Minimal Format

If you have limited sensors, you can use a simpler format:

```
time,altitude,velocity,acceleration,temperature
0.0,0,0,0,22.5
0.1,5,10,9.8,22.4
```

Missing columns will default to zero (for numeric) or standard values (101.3 for pressure, 50 for humidity, etc.)

## File Naming

- Name your files descriptively: `sensor_data.txt`, `flight_log.txt`, etc.
- Multiple files per flight are supported and will be merged

## SD Card Structure

When importing from SD card, the server looks for:
- `.mp4`, `.avi`, `.mov`, `.mkv` files → Videos
- `.txt`, `.csv`, `.log` files → Telemetry data
