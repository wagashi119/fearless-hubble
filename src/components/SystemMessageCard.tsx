import React from 'react';
import { CcfoliaMessage } from '../types/ccfolia';
import { formatTime } from '../utils/parser';
import { Activity, Plus, Bookmark } from 'lucide-react';

interface SystemMessageCardProps {
  message: CcfoliaMessage;
  index: number;
  hasMarker?: boolean;
  onAddMarker: (index: number) => void;
}

export const SystemMessageCard: React.FC<SystemMessageCardProps> = ({
  message,
  index,
  hasMarker,
  onAddMarker,
}) => {
  return (
    <div
      id={`msg-${index}`}
      className="group relative flex items-center justify-between py-1.5 px-3 rounded-md hover:bg-gray-800/40 text-xs text-gray-400 transition"
    >
      <div className="flex items-center space-x-2.5 overflow-hidden">
        <Activity size={13} className="text-gray-500 flex-shrink-0" />
        <span className="font-mono text-[11px] text-gray-500 flex-shrink-0">
          {formatTime(message.createdAt)}
        </span>
        <span className="font-mono text-gray-400 truncate">
          {message.text}
        </span>
      </div>

      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onAddMarker(index)}
          title={hasMarker ? 'マーカーが配置されています' : 'マーカーを配置'}
          className={`p-1 rounded hover:bg-gray-700 transition ${
            hasMarker ? 'text-indigo-400 opacity-100' : 'text-gray-400'
          }`}
        >
          {hasMarker ? <Bookmark size={13} fill="currentColor" /> : <Plus size={13} />}
        </button>
      </div>
    </div>
  );
};
