import React, { useRef, useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';

export interface FlightRecord {
  id: string;
  date: string;
  time: string;
  maxAltitude: number;
  duration: number;
  status: 'success' | 'partial' | 'failed';
}

interface AltimeterFlightSelectorProps {
  flights: FlightRecord[];
  selectedFlightId: string;
  onSelectFlight: (flightId: string) => void;
}

export function AltimeterFlightSelector({ 
  flights, 
  selectedFlightId, 
  onSelectFlight 
}: AltimeterFlightSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const selectedIndex = flights.findIndex(f => f.id === selectedFlightId);

  useEffect(() => {
    if (containerRef.current) {
      const itemHeight = 80;
      const centerOffset = (containerRef.current.clientHeight / 2) - (itemHeight / 2);
      containerRef.current.scrollTop = (selectedIndex * itemHeight) - centerOffset;
    }
  }, [selectedIndex]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartY(e.pageY - (containerRef.current?.offsetTop || 0));
    setScrollTop(containerRef.current?.scrollTop || 0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const y = e.pageY - (containerRef.current.offsetTop || 0);
    const walk = (y - startY) * 2;
    containerRef.current.scrollTop = scrollTop - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const itemHeight = 80;
    const scrollTop = containerRef.current.scrollTop;
    const centerOffset = (containerRef.current.clientHeight / 2) - (itemHeight / 2);
    const centerIndex = Math.round((scrollTop + centerOffset) / itemHeight);
    
    if (centerIndex >= 0 && centerIndex < flights.length && flights[centerIndex].id !== selectedFlightId) {
      onSelectFlight(flights[centerIndex].id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'partial': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-zinc-500';
    }
  };

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 h-full flex flex-col overflow-hidden">
      <div className="p-6 border-b border-zinc-800">
        <h2 className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          Flight History
        </h2>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {/* Center indicator line */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-20 border-y-2 border-blue-500/30 pointer-events-none z-10">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-blue-500/10 to-blue-500/5" />
        </div>

        {/* Fade overlays */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-zinc-900 to-transparent pointer-events-none z-10" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-zinc-900 to-transparent pointer-events-none z-10" />

        {/* Scrollable drum */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="h-full overflow-y-scroll scrollbar-hide py-[40vh] cursor-grab active:cursor-grabbing"
          style={{ 
            scrollBehavior: isDragging ? 'auto' : 'smooth',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {flights.map((flight, index) => {
            const isSelected = flight.id === selectedFlightId;
            const distance = Math.abs(index - selectedIndex);
            const opacity = Math.max(0.3, 1 - (distance * 0.2));
            const scale = Math.max(0.85, 1 - (distance * 0.05));
            
            return (
              <div
                key={flight.id}
                onClick={() => onSelectFlight(flight.id)}
                className="h-20 flex items-center px-6 transition-all duration-300 cursor-pointer"
                style={{
                  opacity,
                  transform: `scale(${scale}) perspective(500px) rotateX(${(index - selectedIndex) * 8}deg)`,
                  transformOrigin: 'center',
                }}
              >
                <div className={`flex-1 flex items-center justify-between p-4 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-blue-500/20 border-blue-500 shadow-lg shadow-blue-500/20'
                    : 'bg-zinc-800/30 border-zinc-700/50'
                }`}>
                  <div className="flex-1 flex items-center justify-between">
                    <div className={`transition-all ${
                      isSelected ? 'text-lg text-blue-400' : 'text-base text-zinc-400'
                    }`}>
                      {flight.date}
                    </div>
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(flight.status)}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Center marker */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full pointer-events-none z-20 shadow-lg shadow-blue-500/50" />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full pointer-events-none z-20 shadow-lg shadow-blue-500/50" />
      </div>

      {/* Scale markings on the side */}
      <div className="absolute left-2 top-20 bottom-20 w-1 flex flex-col justify-around pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-px bg-zinc-700/50 w-full" />
        ))}
      </div>
      <div className="absolute right-2 top-20 bottom-20 w-1 flex flex-col justify-around pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-px bg-zinc-700/50 w-full" />
        ))}
      </div>
    </div>
  );
}