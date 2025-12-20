import React from 'react';

interface SensorGaugeProps {
  label: string;
  value: number;
  unit: string;
  max: number;
  min?: number;
  color?: string;
  warningThreshold?: number;
  dangerThreshold?: number;
}

export function SensorGauge({
  label,
  value,
  unit,
  max,
  min = 0,
  color = '#3b82f6',
  warningThreshold,
  dangerThreshold,
}: SensorGaugeProps) {
  const percentage = ((value - min) / (max - min)) * 100;
  
  let displayColor = color;
  if (dangerThreshold && value >= dangerThreshold) {
    displayColor = '#ef4444';
  } else if (warningThreshold && value >= warningThreshold) {
    displayColor = '#f59e0b';
  }

  return (
    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-zinc-400">{label}</h3>
        <div className="text-right">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl tabular-nums" style={{ color: displayColor }}>
              {value.toFixed(1)}
            </span>
            <span className="text-zinc-500">{unit}</span>
          </div>
        </div>
      </div>
      
      <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${Math.min(Math.max(percentage, 0), 100)}%`,
            backgroundColor: displayColor,
          }}
        />
      </div>
      
      <div className="flex justify-between mt-2 text-xs text-zinc-600">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
