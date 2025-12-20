import React, { useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { Slider } from './ui/slider';

interface PlaybackControlsProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTimeChange: (time: number) => void;
  onPlayPause: () => void;
}

export function PlaybackControls({ 
  currentTime, 
  duration, 
  isPlaying, 
  onTimeChange, 
  onPlayPause 
}: PlaybackControlsProps) {
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      onTimeChange(Math.min(currentTime + 0.1, duration));
      if (currentTime >= duration) {
        onPlayPause();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, currentTime, duration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-zinc-900 border-t border-zinc-800 px-6 py-3">
      <div className="flex items-center gap-4">
        <button
          onClick={() => onTimeChange(Math.max(0, currentTime - 10))}
          className="p-2 hover:bg-zinc-800 rounded"
        >
          <SkipBack className="w-5 h-5" />
        </button>
        <button
          onClick={onPlayPause}
          className="p-2 hover:bg-zinc-800 rounded"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>
        <button
          onClick={() => onTimeChange(Math.min(duration, currentTime + 10))}
          className="p-2 hover:bg-zinc-800 rounded"
        >
          <SkipForward className="w-5 h-5" />
        </button>
        <div className="flex-1 flex items-center gap-3">
          <span className="text-sm font-mono text-zinc-400">{formatTime(currentTime)}</span>
          <Slider
            value={[currentTime]}
            onValueChange={([value]) => onTimeChange(value)}
            max={duration}
            step={0.1}
            className="flex-1"
          />
          <span className="text-sm font-mono text-zinc-400">{formatTime(duration)}</span>
        </div>
        <div className="flex gap-4 text-xs text-zinc-400">
          <span>GPS: Active</span>
          <span>Frame: {Math.floor(currentTime * 30)}/{Math.floor(duration * 30)}</span>
        </div>
      </div>
    </div>
  );
}
