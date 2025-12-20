import React from 'react';
import { Rocket, Wifi, Battery, Thermometer, MapPin } from 'lucide-react';

interface StatusPanelProps {
  flightStatus: 'standby' | 'armed' | 'flight' | 'recovery' | 'landed';
  signalStrength: number;
  batteryLevel: number;
  temperature: number;
  gpsLat?: number;
  gpsLon?: number;
}

export function StatusPanel({ flightStatus, signalStrength, batteryLevel, temperature, gpsLat, gpsLon }: StatusPanelProps) {
  const getStatusColor = () => {
    switch (flightStatus) {
      case 'standby': return 'text-zinc-400';
      case 'armed': return 'text-yellow-500';
      case 'flight': return 'text-green-500';
      case 'recovery': return 'text-blue-500';
      case 'landed': return 'text-zinc-400';
      default: return 'text-zinc-400';
    }
  };

  const getStatusBg = () => {
    switch (flightStatus) {
      case 'standby': return 'bg-zinc-800';
      case 'armed': return 'bg-yellow-500/20';
      case 'flight': return 'bg-green-500/20';
      case 'recovery': return 'bg-blue-500/20';
      case 'landed': return 'bg-zinc-800';
      default: return 'bg-zinc-800';
    }
  };

  return (
    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
      <h3 className="mb-4 text-zinc-400">System Status</h3>
      
      <div className={`flex items-center gap-3 p-4 rounded-lg mb-4 ${getStatusBg()}`}>
        <Rocket className={`w-6 h-6 ${getStatusColor()}`} />
        <div>
          <p className="text-xs text-zinc-500">Flight Status</p>
          <p className={`capitalize ${getStatusColor()}`}>{flightStatus}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-400">Signal</span>
          </div>
          <span className={`text-sm ${signalStrength > 70 ? 'text-green-500' : signalStrength > 40 ? 'text-yellow-500' : 'text-red-500'}`}>
            {signalStrength}%
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Battery className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-400">Battery</span>
          </div>
          <span className={`text-sm ${batteryLevel > 50 ? 'text-green-500' : batteryLevel > 20 ? 'text-yellow-500' : 'text-red-500'}`}>
            {batteryLevel}%
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-400">Temp</span>
          </div>
          <span className="text-sm text-zinc-300">{temperature}°C</span>
        </div>

        {gpsLat !== undefined && gpsLon !== undefined && (
          <div className="pt-3 border-t border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-400">GPS Position</span>
            </div>
            <div className="text-xs text-zinc-500 font-mono">
              <div>{gpsLat.toFixed(6)}°N</div>
              <div>{gpsLon.toFixed(6)}°W</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}