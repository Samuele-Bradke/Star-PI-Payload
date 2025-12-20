import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceDot, Legend, Tooltip } from 'recharts';

interface VelocityChartProps {
  data: Array<{ time: number; vertical: number; horizontal: number }>;
  currentTime: number;
}

export function VelocityChart({ data, currentTime }: VelocityChartProps) {
  const currentPoint = data.find(d => Math.abs(d.time - currentTime) < 0.1) || data[Math.floor(currentTime * 10)];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
      <h3 className="text-sm text-zinc-400 mb-2">Velocity [m/s]</h3>
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
          <Legend 
            wrapperStyle={{ fontSize: '10px' }}
            iconType="line"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: '0.5rem',
              fontSize: '12px'
            }}
            labelStyle={{ color: '#a1a1aa' }}
            formatter={(value: number, name: string) => [value.toFixed(3) + ' m/s', name]}
            labelFormatter={(label: number) => `Time: ${label.toFixed(2)}s`}
          />
          <Line 
            type="monotone" 
            dataKey="vertical" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={false}
            name="Vertical"
          />
          <Line 
            type="monotone" 
            dataKey="horizontal" 
            stroke="#60a5fa" 
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="Horizontal"
          />
          {currentPoint && (
            <>
              <ReferenceDot
                x={currentPoint.time}
                y={currentPoint.vertical}
                r={5}
                fill="#10b981"
                stroke="#fff"
                strokeWidth={2}
              />
              <ReferenceDot
                x={currentPoint.time}
                y={currentPoint.horizontal}
                r={5}
                fill="#60a5fa"
                stroke="#fff"
                strokeWidth={2}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
