import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface AccelerationChartProps {
  data: Array<{ time: number; x: number; y: number; z: number }>;
}

export function AccelerationChart({ data }: AccelerationChartProps) {
  return (
    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
      <h3 className="mb-4 text-zinc-400">3-Axis Acceleration</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis 
            dataKey="time" 
            stroke="#71717a"
            label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, fill: '#71717a' }}
          />
          <YAxis 
            stroke="#71717a"
            label={{ value: 'Acceleration (g)', angle: -90, position: 'insideLeft', fill: '#71717a' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#18181b', 
              border: '1px solid #27272a',
              borderRadius: '0.5rem'
            }}
            labelStyle={{ color: '#a1a1aa' }}
          />
          <Legend wrapperStyle={{ color: '#a1a1aa' }} />
          <Line 
            type="monotone" 
            dataKey="x" 
            stroke="#ef4444" 
            strokeWidth={2}
            dot={false}
            name="X-Axis"
          />
          <Line 
            type="monotone" 
            dataKey="y" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={false}
            name="Y-Axis"
          />
          <Line 
            type="monotone" 
            dataKey="z" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={false}
            name="Z-Axis"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
