import React, { useState, useEffect, useMemo } from 'react';
import { SensorGauge } from './components/SensorGauge';
import { AltitudeChart } from './components/AltitudeChart';
import { AccelerationChart } from './components/AccelerationChart';
import { VideoFeed } from './components/VideoFeed';
import { AltimeterFlightSelector, FlightRecord } from './components/AltimeterFlightSelector';
import { TimelineControl } from './components/TimelineControl';
import { Activity } from 'lucide-react';

type FlightStatus = 'standby' | 'armed' | 'flight' | 'recovery' | 'landed';

interface TelemetryDataPoint {
  time: number;
  altitude: number;
  speed: number;
  acceleration: number;
  accelX: number;
  accelY: number;
  accelZ: number;
  temperature: number;
  pressure: number;
  batteryLevel: number;
  signalStrength: number;
  flightStatus: FlightStatus;
  gpsLat: number;
  gpsLon: number;
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
      acceleration,
      accelX: acceleration * (0.8 + Math.random() * 0.4),
      accelY: acceleration * (0.9 + Math.random() * 0.2),
      accelZ: acceleration,
      temperature: 22 - altitude * 0.01 + Math.random() * 0.5,
      pressure: 101.3 - altitude * 0.01,
      batteryLevel: Math.max(20, 87 - t * 0.5),
      signalStrength: Math.max(40, 92 - Math.random() * 10),
      flightStatus,
      gpsLat: 37.7749 + (altitude * 0.0001) + Math.random() * 0.001,
      gpsLon: -122.4194 + (altitude * 0.0001) + Math.random() * 0.001,
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

  const selectedFlight = useMemo(
    () => mockFlights.find(f => f.id === selectedFlightId) || mockFlights[0],
    [selectedFlightId]
  );

  // Get current telemetry data point based on time
  const currentData = useMemo(() => {
    const index = Math.floor(currentTime * 10);
    return selectedFlight.telemetry[Math.min(index, selectedFlight.telemetry.length - 1)];
  }, [currentTime, selectedFlight]);

  // Get chart data up to current time
  const altitudeHistory = useMemo(() => {
    return selectedFlight.telemetry
      .filter(d => d.time <= currentTime)
      .map(d => ({ time: d.time, altitude: d.altitude }));
  }, [currentTime, selectedFlight]);

  const accelerationHistory = useMemo(() => {
    return selectedFlight.telemetry
      .filter(d => d.time <= currentTime)
      .map(d => ({ time: d.time, x: d.accelX, y: d.accelY, z: d.accelZ }));
  }, [currentTime, selectedFlight]);

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
          <Activity className="w-8 h-8 text-blue-500" />
          <h1 className="text-3xl">Model Rocket Telemetry Dashboard</h1>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Flight Selector */}
          <div className="col-span-12 lg:col-span-3 xl:col-span-2">
            <AltimeterFlightSelector
              flights={flightRecords}
              selectedFlightId={selectedFlightId}
              onSelectFlight={setSelectedFlightId}
            />
          </div>

          {/* Main Content */}
          <div className="col-span-12 lg:col-span-9 xl:col-span-10 space-y-6">
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
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Video Feeds */}
              <div className="xl:col-span-1 space-y-6">
                {selectedFlight.cameras.map((cameraName, index) => (
                  <VideoFeed
                    key={index}
                    cameraName={cameraName}
                    isActive={currentData.flightStatus === 'flight' || currentData.flightStatus === 'recovery'}
                  />
                ))}
              </div>

              {/* Sensors and Charts */}
              <div className="xl:col-span-2 space-y-6">
                {/* Sensor Gauges */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <SensorGauge
                    label="Altitude"
                    value={currentData.altitude}
                    unit="m"
                    max={1500}
                    color="#3b82f6"
                  />
                  <SensorGauge
                    label="Velocity"
                    value={currentData.speed}
                    unit="m/s"
                    max={600}
                    color="#10b981"
                  />
                  <SensorGauge
                    label="Acceleration"
                    value={currentData.acceleration}
                    unit="g"
                    max={20}
                    min={-5}
                    color="#f59e0b"
                    warningThreshold={12}
                    dangerThreshold={16}
                  />
                  <SensorGauge
                    label="Temperature"
                    value={currentData.temperature}
                    unit="°C"
                    max={60}
                    min={-20}
                    color="#06b6d4"
                    warningThreshold={40}
                    dangerThreshold={50}
                  />
                  <SensorGauge
                    label="Pressure"
                    value={currentData.pressure}
                    unit="kPa"
                    max={110}
                    min={80}
                    color="#8b5cf6"
                  />
                  <SensorGauge
                    label="Battery"
                    value={currentData.batteryLevel}
                    unit="%"
                    max={100}
                    min={0}
                    color="#10b981"
                    warningThreshold={30}
                    dangerThreshold={15}
                  />
                </div>

                {/* Charts */}
                <AltitudeChart data={altitudeHistory} />
                <AccelerationChart data={accelerationHistory} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;