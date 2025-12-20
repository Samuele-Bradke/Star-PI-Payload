import React from 'react';

interface OrientationDisplayProps {
  pitch: number;
  roll: number;
  yaw: number;
}

export function OrientationDisplay({ pitch, roll, yaw }: OrientationDisplayProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <h3 className="text-sm text-zinc-400 mb-3">3D Orientation</h3>
      <div className="flex gap-4">
        {/* 3D Object Visualization */}
        <div className="flex-1 bg-zinc-950 rounded h-32 flex items-center justify-center">
          <div 
            className="relative"
            style={{
              transform: `perspective(500px) rotateX(${pitch}deg) rotateY(${yaw}deg) rotateZ(${roll}deg)`,
              transformStyle: 'preserve-3d'
            }}
          >
            {/* Cylinder body */}
            <div className="w-12 h-28 bg-gradient-to-r from-zinc-600 via-zinc-500 to-zinc-600 rounded-full border-2 border-zinc-400 shadow-lg relative">
              {/* Nose cone */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-6 border-r-6 border-b-4 border-l-transparent border-r-transparent border-b-zinc-500" 
                   style={{
                     borderLeftWidth: '24px',
                     borderRightWidth: '24px',
                     borderBottomWidth: '16px'
                   }}
              />
              {/* Reference line */}
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500" />
            </div>
          </div>
        </div>

        {/* Orientation Values */}
        <div className="flex flex-col gap-2 justify-center">
          <div className="bg-zinc-800 px-3 py-2 rounded text-sm">
            <div className="text-zinc-400 text-xs">PITCH</div>
            <div className="font-mono">{pitch.toFixed(1)}°</div>
          </div>
          <div className="bg-zinc-800 px-3 py-2 rounded text-sm">
            <div className="text-zinc-400 text-xs">ROLL</div>
            <div className="font-mono">{roll.toFixed(1)}°</div>
          </div>
          <div className="bg-zinc-800 px-3 py-2 rounded text-sm">
            <div className="text-zinc-400 text-xs">YAW</div>
            <div className="font-mono">{yaw.toFixed(1)}°</div>
          </div>
        </div>
      </div>
    </div>
  );
}
