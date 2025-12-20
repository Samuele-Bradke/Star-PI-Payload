import React from 'react';
import { ScrollArea } from './ui/scroll-area';

interface FlightData {
  id: string;
  date: string;
  duration: number;
  status: 'success' | 'partial' | 'failed';
  cameras: number;
}

interface FlightSelectorProps {
  flights: FlightData[];
  selectedFlight: FlightData;
  onSelectFlight: (flight: FlightData) => void;
}

export function FlightSelector({ flights, selectedFlight, onSelectFlight }: FlightSelectorProps) {
  return (
    <div className="h-full flex flex-col bg-zinc-900">
      <div className="p-4 border-b border-zinc-800">
        <h2 className="text-lg font-semibold">Flight History</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {flights.map((flight) => (
            <button
              key={flight.id}
              onClick={() => onSelectFlight(flight)}
              className={`w-full text-left p-3 mb-2 rounded-lg transition-colors ${
                selectedFlight.id === flight.id
                  ? 'bg-zinc-700 border border-zinc-600'
                  : 'bg-zinc-800 border border-zinc-700 hover:bg-zinc-750'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-base">{new Date(flight.date).toLocaleDateString()}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    flight.status === 'success'
                      ? 'bg-green-900 text-green-300'
                      : flight.status === 'partial'
                      ? 'bg-yellow-900 text-yellow-300'
                      : 'bg-red-900 text-red-300'
                  }`}
                >
                  {flight.status}
                </span>
              </div>
              <div className="text-sm text-zinc-400">
                {Math.floor(flight.duration / 60)}:{(flight.duration % 60).toString().padStart(2, '0')} • {flight.cameras} cameras
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
