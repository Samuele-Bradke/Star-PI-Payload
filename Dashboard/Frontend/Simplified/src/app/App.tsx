import React, { useState, useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { FlightSelector } from './components/FlightSelector';
import { SimpleChart } from './components/SimpleChart';
import { VelocityChart } from './components/VelocityChart';
import { GPSMap } from './components/GPSMap';
import { OrientationDisplay } from './components/OrientationDisplay';
import { PlaybackControls } from './components/PlaybackControls';
import { CircularGauge } from './components/CircularGauge';

interface TelemetryDataPoint {
  time: number;
  altitude: number;
  velocity: number;
  horizontalVelocity: number;
  acceleration: number;
  accelerationX: number;
  accelerationY: number;
  accelerationZ: number;
  temperature: number;
  pressure: number;
  humidity: number;
  gpsLat: number;
  gpsLon: number;
  pitch: number;
  roll: number;
  yaw: number;
}

interface FlightData {
  id: string;
  date: string;
  duration: number;
  status: 'success' | 'partial' | 'failed';
  cameras: number;
  telemetry: TelemetryDataPoint[];
}

// Generate mock flight data
function generateFlightData(id: string, date: string): FlightData {
  const duration = 35;
  const telemetry: TelemetryDataPoint[] = [];
  
  for (let t = 0; t <= duration; t += 0.1) {
    let altitude = 0;
    let velocity = 0;
    let acceleration = 0;

    if (t < 2) {
      altitude = 0;
      velocity = 0;
      acceleration = 0;
    } else if (t < 3) {
      altitude = 0;
      velocity = 0;
      acceleration = 0;
    } else if (t < 8) {
      const ft = t - 3;
      altitude = 50 * ft * ft;
      velocity = 100 * ft;
      acceleration = 15 + Math.sin(ft * 2) * 3;
    } else if (t < 20) {
      const ft = t - 8;
      altitude = 1250 - 30 * ft * ft;
      velocity = Math.max(0, 500 - 60 * ft);
      acceleration = -2 - Math.sin(ft) * 0.5;
    } else if (t < 35) {
      const ft = t - 20;
      altitude = Math.max(0, 400 - 10 * ft);
      velocity = Math.max(0, 50 - ft);
      acceleration = -1;
    } else {
      altitude = 0;
      velocity = 0;
      acceleration = 0;
    }
    
    telemetry.push({
      time: t,
      altitude: Math.max(0, altitude),
      velocity: Math.max(0, velocity),
      horizontalVelocity: t > 3 ? Math.min(velocity * 0.3, 50 + Math.random() * 10) : 0,
      acceleration,
      accelerationX: acceleration * (0.8 + Math.random() * 0.4),
      accelerationY: acceleration * (0.9 + Math.random() * 0.2),
      accelerationZ: acceleration,
      temperature: 22 - altitude * 0.01 + Math.random() * 0.5,
      pressure: 101.3 - altitude * 0.01,
      humidity: 45 + Math.random() * 10 - altitude * 0.02,
      gpsLat: 37.7749 + (altitude * 0.0001) + Math.random() * 0.001,
      gpsLon: -122.4194 + (altitude * 0.0001) + Math.random() * 0.001,
      pitch: Math.sin(t * 0.5) * 30,
      roll: Math.cos(t * 0.5) * 20,
      yaw: (t * 10) % 360,
    });
  }
  
  return {
    id,
    date,
    duration,
    status: 'success',
    cameras: 2,
    telemetry,
  };
}

const mockFlights: FlightData[] = [
  generateFlightData('flight-001', '2024-03-15'),
  generateFlightData('flight-002', '2024-03-10'),
  generateFlightData('flight-003', '2024-03-05'),
];

export default function App() {
  const [selectedFlight, setSelectedFlight] = useState<FlightData>(mockFlights[0]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState('CAM0');

  const currentData = useMemo(() => {
    const index = Math.floor(currentTime * 10);
    return selectedFlight.telemetry[Math.min(index, selectedFlight.telemetry.length - 1)];
  }, [currentTime, selectedFlight]);

  const altitudeData = useMemo(() => 
    selectedFlight.telemetry.map(d => ({ time: d.time, value: d.altitude })),
    [selectedFlight]
  );

  const velocityData = useMemo(() => 
    selectedFlight.telemetry.map(d => ({ 
      time: d.time, 
      vertical: d.velocity,
      horizontal: d.horizontalVelocity 
    })),
    [selectedFlight]
  );

  const accelerationData = useMemo(() => 
    selectedFlight.telemetry.map(d => ({ time: d.time, value: d.acceleration })),
    [selectedFlight]
  );

  const gpsPath = useMemo(() => 
    selectedFlight.telemetry.map(d => ({ lat: d.gpsLat, lon: d.gpsLon })),
    [selectedFlight]
  );

  return (
    <div className="w-screen h-screen bg-black text-white flex">
      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-zinc-900 border-r border-zinc-800 transition-transform duration-300 z-50 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: '280px' }}
      >
        <FlightSelector
          flights={mockFlights}
          selectedFlight={selectedFlight}
          onSelectFlight={setSelectedFlight}
        />
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 p-2 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700"
      >
        <Calendar className="w-5 h-5" />
      </button>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">STAR PI MISSION</h1>
            <span className="text-sm text-zinc-400">Software v1.0.0</span>
          </div>
          <div className="text-lg font-mono">
            T+{Math.floor(currentTime / 60).toString().padStart(2, '0')}:
            {Math.floor(currentTime % 60).toString().padStart(2, '0')}:
            {Math.floor((currentTime % 1) * 100).toString().padStart(2, '0')}
          </div>
        </div>

        {/* Content Grid */}
        <div className="flex-1 grid grid-cols-2 gap-4 p-4 overflow-auto">
          {/* Left Column */}
          <div className="flex flex-col gap-4">
            {/* Status Panel */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="text-sm">
                <div className="text-zinc-400 text-xs">Altitude</div>
                <div className="font-mono text-lg">{currentData?.altitude.toFixed(1)}m</div>
              </div>
            </div>

            {/* Video Feed */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm text-zinc-400">Video Feed</h3>
                <button className="px-3 py-1 bg-green-600 text-white text-xs rounded">
                  {selectedCamera}
                </button>
              </div>
              <div className="flex-1 bg-black rounded relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-zinc-600 text-sm">Camera Selection: {selectedCamera}</div>
                </div>
                
                {/* Altitude Bar on Left */}
                <div className="absolute left-4 top-4 bottom-4 w-8 bg-zinc-800 rounded-full overflow-hidden flex flex-col-reverse">
                  <div 
                    className="bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-300"
                    style={{ 
                      height: `${Math.min(100, ((currentData?.altitude || 0) / 1500) * 100)}%` 
                    }}
                  />
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] text-zinc-400 writing-mode-vertical transform rotate-180">
                    ALT
                  </div>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-mono text-white font-bold">
                    {Math.round(currentData?.altitude || 0)}
                  </div>
                </div>
                
                {/* Overlaid Gauges at Bottom Left */}
                <div className="absolute bottom-4 left-16 flex gap-4">
                  <CircularGauge
                    value={currentData?.velocity || 0}
                    min={0}
                    max={600}
                    label="Vel"
                    unit="m/s"
                  />
                  <CircularGauge
                    value={currentData?.acceleration || 0}
                    min={-20}
                    max={20}
                    label="Accel"
                    unit="g"
                  />
                </div>
                
                {/* Camera Selectors at Bottom Right */}
                <div className="absolute bottom-4 right-4 flex gap-2 flex-wrap max-w-[200px] justify-end">
                  {['CAM0', 'CAM1', 'CAM2', 'CAM3', 'CAM4'].map(cam => (
                    <button
                      key={cam}
                      onClick={() => setSelectedCamera(cam)}
                      className={`px-3 py-1 text-xs rounded ${
                        selectedCamera === cam ? 'bg-zinc-700' : 'bg-zinc-800/80'
                      }`}
                    >
                      {cam}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sensor Readings */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-zinc-400 text-xs">Temperature</div>
                  <div className="font-mono">{currentData?.temperature.toFixed(1)}°C</div>
                </div>
                <div>
                  <div className="text-zinc-400 text-xs">Humidity</div>
                  <div className="font-mono">{currentData?.humidity.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-zinc-400 text-xs">Pressure</div>
                  <div className="font-mono">{(currentData?.pressure / 100).toFixed(0)}hPa</div>
                </div>
              </div>
            </div>

            {/* Orientation Display */}
            <OrientationDisplay
              pitch={currentData?.pitch || 0}
              roll={currentData?.roll || 0}
              yaw={currentData?.yaw || 0}
            />
          </div>

          {/* Right Column - Charts */}
          <div className="flex flex-col gap-4">
            <SimpleChart
              data={altitudeData}
              currentTime={currentTime}
              title="Altitude [m]"
              color="#3b82f6"
            />
            <VelocityChart
              data={velocityData}
              currentTime={currentTime}
            />
            <SimpleChart
              data={accelerationData}
              currentTime={currentTime}
              title="Acceleration [g]"
              color="#ef4444"
            />
            <div className="flex-1 min-h-0">
              <GPSMap
                path={gpsPath}
                currentTime={currentTime}
                currentLat={currentData?.gpsLat || 0}
                currentLon={currentData?.gpsLon || 0}
              />
            </div>
          </div>
        </div>

        {/* Playback Controls */}
        <PlaybackControls
          currentTime={currentTime}
          duration={selectedFlight.duration}
          isPlaying={isPlaying}
          onTimeChange={setCurrentTime}
          onPlayPause={() => setIsPlaying(!isPlaying)}
        />
      </div>
    </div>
  );
}
