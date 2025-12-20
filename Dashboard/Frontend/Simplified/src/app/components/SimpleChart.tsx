import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceDot, Tooltip } from 'recharts';

interface SimpleChartProps {
  data: Array<{ time: number; value: number }>;
  currentTime: number;
  title: string;
  color: string;
}

export function SimpleChart({ data, currentTime, title, color }: SimpleChartProps) {
  const currentPoint = data.find(d => Math.abs(d.time - currentTime) < 0.1) || data[Math.floor(currentTime * 10)];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
      <h3 className="text-sm text-zinc-400 mb-2">{title}</h3>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis 
            dataKey="time" 
            stroke="#71717a"
            tick={{ fontSize: 10 }}
            tickFormatter={(value) => value.toFixed(1)}
          />
          <YAxis 
            stroke="#71717a"
            tick={{ fontSize: 10 }}
            tickFormatter={(value) => value.toFixed(1)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: '0.5rem',
              fontSize: '12px'
            }}
            labelStyle={{ color: '#a1a1aa' }}
            formatter={(value: number) => [value.toFixed(3), 'Value']}
            labelFormatter={(label: number) => `Time: ${label.toFixed(2)}s`}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={2}
            dot={false}
          />
          {currentPoint && (
            <ReferenceDot
              x={currentPoint.time}
              y={currentPoint.value}
              r={5}
              fill={color}
              stroke="#fff"
              strokeWidth={2}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
