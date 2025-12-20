import React, { useState, useEffect, useMemo } from 'react';
import { SensorGauge } from './components/SensorGauge';
import { AltitudeChart } from './components/AltitudeChart';
import { AccelerationChart } from './components/AccelerationChart';
import { GyroscopeChart } from './components/GyroscopeChart';
import { MagnetometerChart } from './components/MagnetometerChart';
import { VideoFeed } from './components/VideoFeed';
import { FlightSelector, FlightRecord } from './components/FlightSelector';
import { GPSDisplay } from './components/GPSDisplay';
import { TimelineControl } from './components/TimelineControl';
import { Activity, Calendar } from 'lucide-react';

type FlightStatus = 'standby' | 'armed' | 'flight' | 'recovery' | 'landed';

interface TelemetryDataPoint {
  time: number;
  altitude: number;
  speed: number;
  
  // MPU6050 - Accelerometer (m/s²)
  accelX: number;
  accelY: number;
  accelZ: number;
  
  // MPU6050 - Gyroscope (deg/s)
  gyroX: number;
  gyroY: number;
  gyroZ: number;
  
  // HMC5883L - Magnetometer (µT)
  magX: number;
  magY: number;
  magZ: number;
  
  // BME280 - Environmental
  temperature: number;  // °C
  pressure: number;      // kPa
  humidity: number;      // %
  
  // GPS
  gpsLat: number;
  gpsLon: number;
  gpsAltitude: number;   // m
  
  flightStatus: FlightStatus;
}

interface FlightData {
  id: string;
  date: string;
  time: string;
  maxAltitude: number;
  duration: number;
  status: 'success' | 'partial' | 'failed';
  telemetry: TelemetryDataPoint[];
  cameras: string[];
}

// Generate mock flight data
function generateFlightData(id: string, date: string, time: string): FlightData {
  const telemetry: TelemetryDataPoint[] = [];
  const duration = 35;
  
  for (let t = 0; t <= duration; t += 0.1) {
    let altitude = 0;
    let speed = 0;
    let acceleration = 0;
    let flightStatus: FlightStatus = 'standby';

    if (t < 2) {
      flightStatus = 'standby';
      altitude = 0;
      speed = 0;
      acceleration = 0;
    } else if (t < 3) {
      flightStatus = 'armed';
      altitude = 0;
      speed = 0;
      acceleration = 0;
    } else if (t < 8) {
      flightStatus = 'flight';
      const ft = t - 3;
      altitude = 50 * ft * ft;
      speed = 100 * ft;
      acceleration = 15 + Math.sin(ft * 2) * 3;
    } else if (t < 20) {
      flightStatus = 'flight';
      const ft = t - 8;
      altitude = 1250 - 30 * ft * ft;
      speed = Math.max(0, 500 - 60 * ft);
      acceleration = -2 - Math.sin(ft) * 0.5;
    } else if (t < 35) {
      flightStatus = 'recovery';
      const ft = t - 20;
      altitude = Math.max(0, 400 - 10 * ft);
      speed = Math.max(0, 50 - ft);
      acceleration = -1;
    } else {
      flightStatus = 'landed';
      altitude = 0;
      speed = 0;
      acceleration = 0;
    }

    telemetry.push({
      time: t,
      altitude: Math.max(0, altitude),
      speed: Math.max(0, speed),
      
      // MPU6050 - Accelerometer
      accelX: acceleration * (0.8 + Math.random() * 0.4),
      accelY: acceleration * (0.9 + Math.random() * 0.2),
      accelZ: acceleration,
      
      // MPU6050 - Gyroscope (simulate rotation during flight)
      gyroX: flightStatus === 'flight' ? (Math.random() - 0.5) * 100 : Math.random() * 5,
      gyroY: flightStatus === 'flight' ? (Math.random() - 0.5) * 100 : Math.random() * 5,
      gyroZ: flightStatus === 'flight' ? (Math.random() - 0.5) * 50 : Math.random() * 5,
      
      // HMC5883L - Magnetometer (Earth's magnetic field ~50µT)
      magX: 30 + Math.sin(t * 0.5) * 20 + Math.random() * 5,
      magY: 40 + Math.cos(t * 0.5) * 20 + Math.random() * 5,
      magZ: -50 + Math.sin(t * 0.3) * 10 + Math.random() * 5,
      
      // BME280 - Environmental
      temperature: 22 - altitude * 0.01 + Math.random() * 0.5,
      pressure: 101.3 - altitude * 0.01,
      humidity: 45 + Math.random() * 10 - altitude * 0.02,
      
      // GPS
      gpsLat: 37.7749 + (altitude * 0.0001) + Math.random() * 0.001,
      gpsLon: -122.4194 + (altitude * 0.0001) + Math.random() * 0.001,
      gpsAltitude: altitude + Math.random() * 5,
      
      flightStatus,
    });
  }

  const maxAltitude = Math.max(...telemetry.map(d => d.altitude));

  return {
    id,
    date,
    time,
    maxAltitude: Math.round(maxAltitude),
    duration,
    status: 'success',
    telemetry,
    cameras: ['Nose Cone', 'Payload Bay', 'Fin Camera', 'Ground View'],
  };
}

// Mock flight records
const mockFlights: FlightData[] = [
  generateFlightData('flight-001', '2024-12-20', '14:32:15'),
  generateFlightData('flight-002', '2024-12-15', '10:15:42'),
  generateFlightData('flight-003', '2024-12-10', '16:45:30'),
  generateFlightData('flight-004', '2024-12-05', '09:20:18'),
  generateFlightData('flight-005', '2024-11-28', '13:55:47'),
  generateFlightData('flight-006', '2024-11-22', '11:10:25'),
];

function App() {
  const [selectedFlightId, setSelectedFlightId] = useState(mockFlights[0].id);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const selectedFlight = useMemo(
    () => mockFlights.find(f => f.id === selectedFlightId) || mockFlights[0],
    [selectedFlightId]
  );

  // Get current telemetry data point based on time
  const currentData = useMemo(() => {
    const index = Math.floor(currentTime * 10);
    return selectedFlight.telemetry[Math.min(index, selectedFlight.telemetry.length - 1)];
  }, [currentTime, selectedFlight]);

  // Get full chart data (show all data)
  const altitudeHistory = useMemo(() => {
    return selectedFlight.telemetry.map(d => ({ time: d.time, altitude: d.altitude }));
  }, [selectedFlight]);

  const accelerationHistory = useMemo(() => {
    return selectedFlight.telemetry.map(d => ({ time: d.time, x: d.accelX, y: d.accelY, z: d.accelZ }));
  }, [selectedFlight]);

  const gyroscopeHistory = useMemo(() => {
    return selectedFlight.telemetry.map(d => ({ time: d.time, x: d.gyroX, y: d.gyroY, z: d.gyroZ }));
  }, [selectedFlight]);

  const magnetometerHistory = useMemo(() => {
    return selectedFlight.telemetry.map(d => ({ time: d.time, x: d.magX, y: d.magY, z: d.magZ }));
  }, [selectedFlight]);

  // Get GPS flight path up to current time
  const gpsFlightPath = useMemo(() => {
    return selectedFlight.telemetry
      .filter(d => d.time <= currentTime)
      .map(d => ({ lat: d.gpsLat, lon: d.gpsLon }));
  }, [currentTime, selectedFlight]);

  // Calculate min/max values for each sensor from the flight data
  const sensorRanges = useMemo(() => {
    const telemetry = selectedFlight.telemetry;
    return {
      altitude: {
        min: Math.floor(Math.min(...telemetry.map(d => d.altitude))),
        max: Math.ceil(Math.max(...telemetry.map(d => d.altitude)))
      },
      speed: {
        min: Math.floor(Math.min(...telemetry.map(d => d.speed))),
        max: Math.ceil(Math.max(...telemetry.map(d => d.speed)))
      },
      temperature: {
        min: Math.floor(Math.min(...telemetry.map(d => d.temperature))),
        max: Math.ceil(Math.max(...telemetry.map(d => d.temperature)))
      },
      pressure: {
        min: Math.floor(Math.min(...telemetry.map(d => d.pressure))),
        max: Math.ceil(Math.max(...telemetry.map(d => d.pressure)))
      },
      humidity: {
        min: Math.floor(Math.min(...telemetry.map(d => d.humidity))),
        max: Math.ceil(Math.max(...telemetry.map(d => d.humidity)))
      },
      accelZ: {
        min: Math.floor(Math.min(...telemetry.map(d => d.accelZ))),
        max: Math.ceil(Math.max(...telemetry.map(d => d.accelZ)))
      }
    };
  }, [selectedFlight]);

  // Playback control
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + 0.1;
        if (next >= selectedFlight.duration) {
          setIsPlaying(false);
          return selectedFlight.duration;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, selectedFlight.duration]);

  // Reset time when flight changes
  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(false);
  }, [selectedFlightId]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSkipBack = () => {
    setCurrentTime(Math.max(0, currentTime - 5));
  };

  const handleSkipForward = () => {
    setCurrentTime(Math.min(selectedFlight.duration, currentTime + 5));
  };

  const flightRecords: FlightRecord[] = mockFlights.map(f => ({
    id: f.id,
    date: f.date,
    time: f.time,
    maxAltitude: f.maxAltitude,
    duration: f.duration,
    status: f.status,
  }));

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-[2000px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <img src="/star-pi-logo.png" alt="Star Pi Logo" className="w-8 h-8" />
          <h1 className="text-3xl">Star Pi Dashboard</h1>
        </div>

        {/* Main Layout */}
        <div className="relative">
          {/* Calendar Toggle Button - Shows when sidebar is closed */}
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="fixed left-6 top-1/2 -translate-y-1/2 z-50 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md transition-colors shadow-lg"
              aria-label="Open flight history"
            >
              <Calendar className="w-5 h-5" />
            </button>
          )}

          {/* Left Sidebar - Flight Selector - Overlay */}
          {isSidebarOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/50 z-40"
                onClick={() => setIsSidebarOpen(false)}
              />
              
              {/* Sidebar */}
              <div className="fixed left-0 top-0 bottom-0 w-[320px] z-50 p-6 transition-transform duration-300">
                <div className="relative h-full">
                  {/* Close button */}
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="absolute -right-3 top-6 z-10 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md transition-colors shadow-lg"
                    aria-label="Close flight history"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                  <FlightSelector
                    flights={flightRecords}
                    selectedFlightId={selectedFlightId}
                    onSelectFlight={setSelectedFlightId}
                  />
                </div>
              </div>
            </>
          )}

          {/* Main Content - Full Width */}
          <div className="space-y-6">
            {/* Timeline Control */}
            <TimelineControl
              currentTime={currentTime}
              duration={selectedFlight.duration}
              isPlaying={isPlaying}
              onTimeChange={setCurrentTime}
              onPlayPause={handlePlayPause}
              onSkipBack={handleSkipBack}
              onSkipForward={handleSkipForward}
            />

            {/* Dashboard Grid */}
            <div className="space-y-6">
              {/* Video Feeds - Horizontal */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {selectedFlight.cameras.map((cameraName, index) => (
                  <VideoFeed
                    key={index}
                    cameraName={cameraName}
                    isActive={currentData.flightStatus === 'flight' || currentData.flightStatus === 'recovery'}
                  />
                ))}
              </div>

              {/* Data Section */}
              <div className="space-y-6">
                {/* Sensor Gauges */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <SensorGauge
                  label="Altitude"
                  value={currentData.altitude}
                  unit="m"
                  max={sensorRanges.altitude.max}
                  min={sensorRanges.altitude.min}
                  color="#3b82f6"
                />
                <SensorGauge
                  label="Velocity"
                  value={currentData.speed}
                  unit="m/s"
                  max={sensorRanges.speed.max}
                  min={sensorRanges.speed.min}
                  color="#10b981"
                />
                <SensorGauge
                  label="Acceleration"
                  value={currentData.accelZ}
                  unit="m/s²"
                  max={sensorRanges.accelZ.max}
                  min={sensorRanges.accelZ.min}
                  color="#f59e0b"
                />
                <SensorGauge
                  label="Temperature"
                  value={currentData.temperature}
                  unit="°C"
                  max={sensorRanges.temperature.max}
                  min={sensorRanges.temperature.min}
                  color="#06b6d4"
                />
                <SensorGauge
                  label="Pressure"
                  value={currentData.pressure}
                  unit="kPa"
                  max={sensorRanges.pressure.max}
                  min={sensorRanges.pressure.min}
                  color="#8b5cf6"
                />
                <SensorGauge
                  label="Humidity"
                  value={currentData.humidity}
                  unit="%"
                  max={sensorRanges.humidity.max}
                  min={sensorRanges.humidity.min}
                  color="#14b8a6"
                />
              </div>

              {/* GPS Display */}
              <GPSDisplay
                latitude={currentData.gpsLat}
                longitude={currentData.gpsLon}
                altitude={currentData.altitude}
                flightPath={gpsFlightPath}
              />

              {/* Charts */}
              <AltitudeChart data={altitudeHistory} currentTime={currentTime} />
              <AccelerationChart data={accelerationHistory} currentTime={currentTime} />
              <GyroscopeChart data={gyroscopeHistory} currentTime={currentTime} />
              <MagnetometerChart data={magnetometerHistory} currentTime={currentTime} />
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

export default App;