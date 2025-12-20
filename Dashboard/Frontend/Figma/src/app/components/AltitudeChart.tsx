import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';

interface AltitudeChartProps {
  data: Array<{ time: number; altitude: number }>;
  currentTime?: number;
}

export function AltitudeChart({ data, currentTime }: AltitudeChartProps) {
  const currentPoint = currentTime !== undefined 
    ? data.find(d => Math.abs(d.time - currentTime) < 0.1) || data[Math.floor(currentTime * 10)]
    : null;
  return (
    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
      <h3 className="mb-4 text-zinc-400">Altitude Over Time</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis 
            dataKey="time" 
            stroke="#71717a"
            label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, fill: '#71717a' }}
            tickFormatter={(value) => value.toFixed(1)}
          />
          <YAxis 
            stroke="#71717a"
            label={{ value: 'Altitude (m)', angle: -90, position: 'insideLeft', dy: 70, fill: '#71717a' }}
            tickFormatter={(value) => value.toFixed(1)}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#18181b', 
              border: '1px solid #27272a',
              borderRadius: '0.5rem'
            }}
            labelStyle={{ color: '#a1a1aa' }}
          />
          <Line 
            type="monotone" 
            dataKey="altitude" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={false}
          />
          {currentPoint && (
            <ReferenceDot
              x={currentPoint.time}
              y={currentPoint.altitude}
              r={6}
              fill="#3b82f6"
              stroke="#fff"
              strokeWidth={2}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
