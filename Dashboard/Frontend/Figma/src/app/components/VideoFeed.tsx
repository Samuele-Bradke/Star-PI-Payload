import React from 'react';
import { Video, VideoOff } from 'lucide-react';

interface VideoFeedProps {
  isActive?: boolean;
  streamUrl?: string;
  cameraName: string;
}

export function VideoFeed({ isActive = true, streamUrl, cameraName }: VideoFeedProps) {
  return (
    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-zinc-400">{cameraName}</h3>
      </div>
      
      <div className="aspect-video bg-black rounded-lg overflow-hidden relative flex items-center justify-center">
        {isActive ? (
          streamUrl ? (
            <video 
              src={streamUrl} 
              autoPlay 
              muted 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center">
              <Video className="w-16 h-16 text-zinc-700 mb-4 mx-auto" />
              <p className="text-zinc-600">Video feed available</p>
              <p className="text-xs text-zinc-700 mt-2">Connect camera to view footage</p>
            </div>
          )
        ) : (
          <div className="text-center">
            <VideoOff className="w-16 h-16 text-zinc-700 mb-4 mx-auto" />
            <p className="text-zinc-600">Camera offline</p>
          </div>
        )}
      </div>
    </div>
  );
}