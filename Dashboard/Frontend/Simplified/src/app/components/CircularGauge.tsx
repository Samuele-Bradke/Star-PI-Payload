import React from 'react';

interface CircularGaugeProps {
  value: number;
  min: number;
  max: number;
  label: string;
  unit: string;
}

export function CircularGauge({ value, min, max, label, unit }: CircularGaugeProps) {
  const normalizedValue = Math.max(min, Math.min(max, value));
  const percentage = (normalizedValue - min) / (max - min);
  const angle = percentage * 270 - 135; // -135° to 135° range

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24 bg-zinc-950 rounded-full border-2 border-zinc-700 flex items-center justify-center">
        {/* Gauge marks */}
        <svg className="absolute inset-0" viewBox="0 0 100 100">
          {/* Major ticks */}
          {[0, 45, 90, 135, 180, 225, 270].map((deg) => {
            const startAngle = (deg - 135) * (Math.PI / 180);
            const x1 = 50 + 38 * Math.cos(startAngle);
            const y1 = 50 + 38 * Math.sin(startAngle);
            const x2 = 50 + 42 * Math.cos(startAngle);
            const y2 = 50 + 42 * Math.sin(startAngle);
            
            return (
              <line
                key={deg}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#52525b"
                strokeWidth="1.5"
              />
            );
          })}
          
          {/* Arc background */}
          <path
            d="M 15,75 A 38 38 0 1 1 85,75"
            fill="none"
            stroke="#27272a"
            strokeWidth="2"
          />
        </svg>

        {/* Needle */}
        <div
          className="absolute w-0.5 h-8 bg-red-500 origin-bottom"
          style={{
            transform: `rotate(${angle}deg)`,
            bottom: '50%',
          }}
        >
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full" />
        </div>

        {/* Center dot */}
        <div className="absolute w-3 h-3 bg-zinc-800 rounded-full border border-zinc-600" />

        {/* Value display */}
        <div className="absolute bottom-3 text-xs font-mono text-zinc-400">
          {normalizedValue.toFixed(0)}
        </div>
      </div>
      
      {/* Label */}
      <div className="mt-1 text-xs text-zinc-400 font-semibold">{label}</div>
    </div>
  );
}
