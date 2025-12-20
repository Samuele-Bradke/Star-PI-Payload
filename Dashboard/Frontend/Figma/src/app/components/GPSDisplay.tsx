import React, { useEffect, useRef } from 'react';
import { MapPin, Navigation } from 'lucide-react';

declare global {
  interface Window {
    L: any;
  }
}

interface GPSDisplayProps {
  latitude: number;
  longitude: number;
  altitude?: number;
  flightPath?: Array<{ lat: number; lon: number }>;
}

export function GPSDisplay({ latitude, longitude, altitude, flightPath = [] }: GPSDisplayProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const pathLayerRef = useRef<any>(null);
  const currentMarkerRef = useRef<any>(null);

  const formatCoordinate = (value: number, isLat: boolean) => {
    const direction = isLat 
      ? (value >= 0 ? 'N' : 'S')
      : (value >= 0 ? 'E' : 'W');
    const absValue = Math.abs(value);
    const degrees = Math.floor(absValue);
    const minutes = ((absValue - degrees) * 60).toFixed(4);
    return `${degrees}° ${minutes}' ${direction}`;
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    // Dynamically load Leaflet
    const loadLeaflet = async () => {
      // Add Leaflet CSS
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // Load Leaflet JS
      if (!window.L) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        await new Promise((resolve) => {
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }

      // Initialize map
      if (window.L && mapContainerRef.current && !mapRef.current) {
        const L = window.L;
        
        mapRef.current = L.map(mapContainerRef.current, {
          center: [latitude, longitude],
          zoom: 15,
          zoomControl: true,
        });

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(mapRef.current);

        // Create path layer
        pathLayerRef.current = L.layerGroup().addTo(mapRef.current);
        
        // Create current position marker
        currentMarkerRef.current = L.circleMarker([latitude, longitude], {
          radius: 8,
          fillColor: '#3b82f6',
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        }).addTo(mapRef.current);
      }
    };

    loadLeaflet();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map when position or path changes
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    
    const L = window.L;

    // Update current position marker
    if (currentMarkerRef.current) {
      currentMarkerRef.current.setLatLng([latitude, longitude]);
    }

    // Update flight path
    if (pathLayerRef.current && flightPath.length > 0) {
      pathLayerRef.current.clearLayers();
      
      // Draw the path
      const pathCoords = flightPath.map(p => [p.lat, p.lon]);
      L.polyline(pathCoords, {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.7,
      }).addTo(pathLayerRef.current);

      // Add start marker
      if (flightPath.length > 0) {
        L.circleMarker([flightPath[0].lat, flightPath[0].lon], {
          radius: 6,
          fillColor: '#10b981',
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        }).addTo(pathLayerRef.current);
      }
    }

    // Center map on current position
    mapRef.current.setView([latitude, longitude], mapRef.current.getZoom());
  }, [latitude, longitude, flightPath]);

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-semibold">GPS Location</h3>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coordinates Display */}
        <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-zinc-400" />
            <span className="text-sm text-zinc-400">Latitude</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-lg font-mono">{formatCoordinate(latitude, true)}</span>
            <span className="text-xs text-zinc-500">{latitude.toFixed(6)}°</span>
          </div>
        </div>

        <div className="h-px bg-zinc-800" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-zinc-400 rotate-90" />
            <span className="text-sm text-zinc-400">Longitude</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-lg font-mono">{formatCoordinate(longitude, false)}</span>
            <span className="text-xs text-zinc-500">{longitude.toFixed(6)}°</span>
          </div>
        </div>

        {altitude !== undefined && (
          <>
            <div className="h-px bg-zinc-800" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">GPS Altitude</span>
              <span className="text-lg font-mono">{altitude.toFixed(1)} m</span>
            </div>
          </>
        )}

        <div className="h-px bg-zinc-800" />

        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">Coordinates</span>
          <a
            href={`https://www.google.com/maps?q=${latitude},${longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-500 hover:text-blue-400 transition-colors underline"
          >
            View on Maps
          </a>
        </div>
      </div>

        {/* Map Display */}
        <div className="h-[300px] rounded-lg overflow-hidden border border-zinc-800">
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
}
