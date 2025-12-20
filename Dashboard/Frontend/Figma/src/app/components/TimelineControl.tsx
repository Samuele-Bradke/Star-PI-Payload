import React from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { Slider } from './ui/slider';

interface TimelineControlProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTimeChange: (time: number) => void;
  onPlayPause: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
}

export function TimelineControl({
  currentTime,
  duration,
  isPlaying,
  onTimeChange,
  onPlayPause,
  onSkipBack,
  onSkipForward,
}: TimelineControlProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
      <div className="flex items-center gap-4">
        <button
          onClick={onSkipBack}
          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
          aria-label="Skip back 5 seconds"
        >
          <SkipBack className="w-5 h-5" />
        </button>
        
        <button
          onClick={onPlayPause}
          className="p-3 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-0.5" />
          )}
        </button>
        
        <button
          onClick={onSkipForward}
          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
          aria-label="Skip forward 5 seconds"
        >
          <SkipForward className="w-5 h-5" />
        </button>
        
        <div className="flex-1 flex items-center gap-4">
          <span className="text-sm tabular-nums text-zinc-400 min-w-[80px]">
            {formatTime(currentTime)}
          </span>
          
          <div className="flex-1">
            <Slider
              value={[currentTime]}
              min={0}
              max={duration}
              step={0.1}
              onValueChange={(value) => onTimeChange(value[0])}
              className="cursor-pointer"
            />
          </div>
          
          <span className="text-sm tabular-nums text-zinc-500 min-w-[80px] text-right">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
