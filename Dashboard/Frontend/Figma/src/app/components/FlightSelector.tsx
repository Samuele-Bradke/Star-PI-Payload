import React from 'react';
import { Calendar } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

export interface FlightRecord {
  id: string;
  date: string;
  time: string;
  maxAltitude: number;
  duration: number;
  status: 'success' | 'partial' | 'failed';
}

interface FlightSelectorProps {
  flights: FlightRecord[];
  selectedFlightId: string;
  onSelectFlight: (flightId: string) => void;
}

export function FlightSelector({ flights, selectedFlightId, onSelectFlight }: FlightSelectorProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'partial': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-zinc-500';
    }
  };

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 h-full flex flex-col">
      <div className="p-6 border-b border-zinc-800">
        <h2 className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          Flight History
        </h2>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {flights.map((flight) => (
            <button
              key={flight.id}
              onClick={() => onSelectFlight(flight.id)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                selectedFlightId === flight.id
                  ? 'bg-blue-500/20 border-blue-500'
                  : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg text-zinc-400">{flight.date}</div>
                </div>
                <div className={`w-2 h-2 rounded-full ${getStatusColor(flight.status)} mt-1`} />
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
