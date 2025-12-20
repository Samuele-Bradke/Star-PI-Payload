import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    L: any;
  }
}

interface GPSMapProps {
  path: Array<{ lat: number; lon: number }>;
  currentTime: number;
  currentLat: number;
  currentLon: number;
}

export function GPSMap({ path, currentTime, currentLat, currentLon }: GPSMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const pathLayerRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const L = window.L;
    if (!L) return;

    const map = L.map(mapRef.current).setView([path[0].lat, path[0].lon], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    mapInstanceRef.current = map;
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !path.length) return;

    const L = window.L;
    const map = mapInstanceRef.current;

    if (pathLayerRef.current) {
      map.removeLayer(pathLayerRef.current);
    }

    const coordinates = path.map(p => [p.lat, p.lon]);
    pathLayerRef.current = L.polyline(coordinates, {
      color: '#3b82f6',
      weight: 3,
      opacity: 0.7
    }).addTo(map);

    map.fitBounds(pathLayerRef.current.getBounds());
  }, [path]);

  useEffect(() => {
    if (!mapInstanceRef.current || !path.length) return;

    const L = window.L;
    const map = mapInstanceRef.current;
    const index = Math.floor(currentTime * 10);
    const currentPos = path[Math.min(index, path.length - 1)];

    if (markerRef.current) {
      map.removeLayer(markerRef.current);
    }

    markerRef.current = L.circleMarker([currentPos.lat, currentPos.lon], {
      radius: 8,
      fillColor: '#10b981',
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9
    }).addTo(map);
  }, [currentTime, path]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 h-full flex flex-col">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm text-zinc-400">GPS Trajectory</h3>
        <div className="text-right">
          <div className="text-xs text-zinc-500 mb-0.5">GPS Position: {currentLat.toFixed(4)}°, {currentLon.toFixed(4)}°</div>
        </div>
      </div>
      <div ref={mapRef} className="w-full flex-1 rounded bg-zinc-950" />
    </div>
  );
}
