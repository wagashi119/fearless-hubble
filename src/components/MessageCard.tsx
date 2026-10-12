import React, { useState } from 'react';
import { CcfoliaMessage, Marker } from '../types/ccfolia';
import { DiceRollView } from './DiceRollView';
import { formatTime, formatDateTime } from '../utils/parser';
import {
  Bookmark,
  Plus,
  Copy,
  Check,
  Swords,
  Sparkles,
  FileText,
  AlertCircle,
  Flag,
  Star,
  Skull,
  Edit2,
  LucideIcon
} from 'lucide-react';

interface MessageCardProps {
  message: CcfoliaMessage;
  index: number;
  images?: Record<string, string>;
  marker?: Marker;
  onAddMarker: (index: number) => void;
  onEditMarker: (marker: Marker) => void;
  compact?: boolean;
}

const ICON_MAP: Record<string, LucideIcon> = {
  bookmark: Bookmark,
  swords: Swords,
  sparkles: Sparkles,
  'file-text': FileText,
  'alert-circle': AlertCircle,
  flag: Flag,
  star: Star,
  skull: Skull,
};

export const MessageCard: React.FC<MessageCardProps> = ({
  message,
  index,
  images,
  marker,
  onAddMarker,
  onEditMarker,
  compact = false,
}) => {
  const [copied, setCopied] = useState(false);

  const iconDataUrl = message.iconImage && images ? images[message.iconImage] : null;
  const charColor = message.color || '#9ca3af';

  const handleCopy = () => {
    const textToCopy = `${message.name}: ${message.text}${
      message.extend?.roll?.result ? ` (${message.extend.roll.result})` : ''
    }`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const MarkerIcon = marker?.icon && ICON_MAP[marker.icon] ? ICON_MAP[marker.icon] : Bookmark;

  // URL自動リンク化とテキストレンダリング
  const renderText = (content: string) => {
    if (!content) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const lines = content.split('\n');

    return lines.map((line, lIdx) => {
      const parts = line.split(urlRegex);
      return (
        <span key={lIdx} className="block leading-relaxed">
          {parts.map((part, pIdx) => {
            if (part.match(urlRegex)) {
              return (
                <a
                  key={pIdx}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 underline break-all"
                  onClick={(e) => e.stopPropagation()}
                >
                  {part}
                </a>
              );
            }
            return <span key={pIdx}>{part}</span>;
          })}
        </span>
      );
    });
  };

  return (
    <div
      id={`msg-${index}`}
      className={`group relative rounded-xl transition duration-150 border ${
        marker
          ? 'bg-[#1e2024] border-l-4 shadow-lg ring-1 ring-white/5'
          : 'bg-[#18191c]/70 hover:bg-[#1e2024] border-gray-800/80 hover:border-gray-700'
      } ${compact ? 'p-3' : 'p-4'}`}
      style={marker ? { borderLeftColor: marker.color } : undefined}
    >
      {/* マーカーヘッダー（マーカーがある場合） */}
      {marker && (
        <div
          className="flex items-center justify-between mb-2.5 pb-2 border-b border-gray-800 text-xs cursor-pointer group/marker"
          onClick={() => onEditMarker(marker)}
        >
          <div className="flex items-center space-x-2">
            <span
              className="p-1 rounded-md text-white flex-shrink-0"
              style={{ backgroundColor: marker.color }}
            >
              <MarkerIcon size={13} />
            </span>
            <span className="font-bold text-white tracking-wide">{marker.title}</span>
            {marker.note && (
              <span className="text-gray-400 text-[11px] truncate max-w-xs">
                — {marker.note}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1 opacity-0 group-hover/marker:opacity-100 transition text-gray-400 hover:text-indigo-300">
            <Edit2 size={12} />
            <span className="text-[10px]">編集</span>
          </div>
        </div>
      )}

      <div className="flex items-start space-x-3.5">
        {/* アイコン画像または頭文字アバター */}
        <div className="flex-shrink-0">
          {iconDataUrl ? (
            <img
              src={iconDataUrl}
              alt={message.name}
              className={`rounded-full object-cover border border-gray-700 bg-gray-900 shadow-sm ${
                compact ? 'w-8 h-8' : 'w-10 h-10'
              }`}
              loading="lazy"
            />
          ) : (
            <div
              className={`rounded-full flex items-center justify-center font-bold text-white shadow-sm ${
                compact ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
              }`}
              style={{ backgroundColor: charColor }}
            >
              {(message.name || '?').slice(0, 1)}
            </div>
          )}
        </div>

        {/* コンテンツ本体 */}
        <div className="flex-1 min-w-0">
          {/* 名前・チャンネル・日時 */}
          <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
            <div className="flex items-center space-x-2 min-w-0">
              <span
                className="font-bold truncate text-sm"
                style={{ color: charColor }}
              >
                {message.name || '名称未設定'}
              </span>

              {message.channelName && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-800 text-gray-400 border border-gray-700 flex-shrink-0">
                  {message.channelName}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 text-xs text-gray-500 flex-shrink-0">
              <span title={formatDateTime(message.createdAt)} className="font-mono text-[11px]">
                {formatTime(message.createdAt)}
              </span>

              {/* ホバー時に現れるアクションボタン */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                <button
                  onClick={handleCopy}
                  title="メッセージをコピー"
                  className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition"
                >
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
                <button
                  onClick={() => (marker ? onEditMarker(marker) : onAddMarker(index))}
                  title={marker ? 'マーカーを編集' : 'マーカーを配置'}
                  className={`p-1 rounded hover:bg-gray-700 transition ${
                    marker ? 'text-indigo-400' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {marker ? <Edit2 size={13} /> : <Plus size={13} />}
                </button>
              </div>
            </div>
          </div>

          {/* メッセージ本文 */}
          {message.text && (
            <div className="text-gray-200 text-sm font-normal break-words selection:bg-indigo-700 selection:text-white">
              {renderText(message.text)}
            </div>
          )}

          {/* ダイスロール結果 */}
          {message.extend?.roll && (
            <DiceRollView
              roll={message.extend.roll}
              commandText={message.text}
            />
          )}
        </div>
      </div>
    </div>
  );
};
