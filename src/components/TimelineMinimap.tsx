import React from 'react';
import { Marker } from '../types/ccfolia';

interface TimelineMinimapProps {
  totalMessages: number;
  markers: Marker[];
  onJumpToMessage: (index: number) => void;
}

export const TimelineMinimap: React.FC<TimelineMinimapProps> = ({
  totalMessages,
  markers,
  onJumpToMessage,
}) => {
  if (totalMessages === 0 || markers.length === 0) return null;

  return (
    <div
      className="fixed right-2 top-24 bottom-6 w-3 z-30 hidden md:flex flex-col items-center justify-between pointer-events-auto"
      title="マーカータイムラインミニマップ"
    >
      <div className="w-1 h-full bg-gray-800/80 hover:bg-gray-700 rounded-full relative transition">
        {markers.map((marker) => {
          const topPercent = Math.min(
            99,
            Math.max(1, (marker.targetMessageIndex / Math.max(1, totalMessages - 1)) * 100)
          );

          return (
            <button
              key={marker.id}
              onClick={() => onJumpToMessage(marker.targetMessageIndex)}
              className="group/pin absolute -left-1.5 w-4 h-2 -translate-y-1/2 rounded-full cursor-pointer hover:w-6 hover:h-3 hover:-left-2.5 transition-all shadow-sm focus:outline-none"
              style={{
                top: `${topPercent}%`,
                backgroundColor: marker.color,
              }}
            >
              {/* ホバーツールチップ */}
              <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden group-hover/pin:flex items-center px-2 py-1 rounded bg-[#1e1f22] border border-gray-700 text-[11px] text-white whitespace-nowrap shadow-xl z-50 pointer-events-none">
                <span
                  className="w-2 h-2 rounded-full mr-1.5"
                  style={{ backgroundColor: marker.color }}
                />
                <span className="font-medium">{marker.title}</span>
                <span className="text-gray-400 ml-1.5 text-[10px]">
                  #{marker.targetMessageIndex + 1}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
