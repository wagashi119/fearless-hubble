import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CcfoliaMessage, Marker } from '../types/ccfolia';
import { MessageCard } from './MessageCard';
import { SystemMessageCard } from './SystemMessageCard';
import { formatDate } from '../utils/parser';
import { ArrowDown, Calendar, EyeOff } from 'lucide-react';

interface TimelineProps {
  messages: { message: CcfoliaMessage; originalIndex: number }[];
  images?: Record<string, string>;
  markers: Marker[];
  onAddMarker: (index: number) => void;
  onEditMarker: (marker: Marker) => void;
  compact: boolean;
  targetJumpIndex?: number | null;
  onJumpHandled?: () => void;
}

const PAGE_SIZE = 150;

export const Timeline: React.FC<TimelineProps> = ({
  messages,
  images,
  markers,
  onAddMarker,
  onEditMarker,
  compact,
  targetJumpIndex,
  onJumpHandled,
}) => {
  // 表示件数制御（巨大ログでも超高速に動くようにインクリメンタル描画）
  const [displayCount, setDisplayCount] = useState<number>(PAGE_SIZE);
  const bottomRef = useRef<HTMLDivElement>(null);

  // マーカーをメッセージのオリジナルインデックスで引けるようにマップ化
  const markerMap = useMemo(() => {
    const map = new Map<number, Marker>();
    markers.forEach((m) => {
      map.set(m.targetMessageIndex, m);
    });
    return map;
  }, [markers]);

  // ジャンプ要求が来た場合
  useEffect(() => {
    if (targetJumpIndex !== undefined && targetJumpIndex !== null) {
      // 該当メッセージが現在の表示範囲内にあるかチェック
      const msgItemPos = messages.findIndex((m) => m.originalIndex === targetJumpIndex);
      if (msgItemPos !== -1) {
        if (msgItemPos >= displayCount) {
          setDisplayCount(Math.max(displayCount, msgItemPos + 50));
        }

        setTimeout(() => {
          const el = document.getElementById(`msg-${targetJumpIndex}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2', 'ring-offset-[#141517]');
            setTimeout(() => {
              el.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2', 'ring-offset-[#141517]');
            }, 2500);
          }
          onJumpHandled?.();
        }, 100);
      }
    }
  }, [targetJumpIndex, messages, displayCount, onJumpHandled]);

  // メッセージリストが変わったらリセット
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [messages.length]);

  const displayedMessages = messages.slice(0, displayCount);
  const hasMore = displayCount < messages.length;

  const loadMore = () => {
    setDisplayCount((prev) => Math.min(messages.length, prev + PAGE_SIZE));
  };

  const loadAll = () => {
    setDisplayCount(messages.length);
  };

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-gray-800/80 flex items-center justify-center text-gray-500 mb-4">
          <EyeOff size={28} />
        </div>
        <h3 className="text-base font-semibold text-gray-300">
          表示可能なメッセージがありません
        </h3>
        <p className="text-xs text-gray-500 mt-1.5 max-w-sm">
          検索フィルターの条件を変更するか、別のチャンネル・キャラクターを選択してください。
        </p>
      </div>
    );
  }

  // 日付の変わり目を検知しながら描画
  let lastDate = '';

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6 space-y-3 relative timeline-line">
      {displayedMessages.map(({ message, originalIndex }, i) => {
        const currentDate = formatDate(message.createdAt);
        let showDateDivider = false;
        if (currentDate && currentDate !== lastDate) {
          showDateDivider = true;
          lastDate = currentDate;
        }

        const marker = markerMap.get(originalIndex);

        return (
          <React.Fragment key={message.id || `msg-${originalIndex}-${i}`}>
            {/* 日付区切りセパレータ */}
            {showDateDivider && (
              <div className="relative flex items-center justify-center my-6 z-10">
                <div className="bg-[#1e2024] border border-gray-700/80 px-3.5 py-1 rounded-full text-xs font-semibold text-gray-300 flex items-center space-x-1.5 shadow-sm">
                  <Calendar size={13} className="text-indigo-400" />
                  <span>{currentDate}</span>
                </div>
              </div>
            )}

            {/* システムメッセージか通常メッセージか */}
            {message.type === 'system' ? (
              <SystemMessageCard
                message={message}
                index={originalIndex}
                hasMarker={!!marker}
                onAddMarker={onAddMarker}
              />
            ) : (
              <MessageCard
                message={message}
                index={originalIndex}
                images={images}
                marker={marker}
                onAddMarker={onAddMarker}
                onEditMarker={onEditMarker}
                compact={compact}
              />
            )}
          </React.Fragment>
        );
      })}

      {/* もっと読み込むボタン */}
      {hasMore && (
        <div className="flex items-center justify-center space-x-3 pt-6 pb-12 z-10 relative">
          <button
            onClick={loadMore}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 font-medium text-xs shadow-md transition"
          >
            <ArrowDown size={14} />
            <span>さらに {Math.min(PAGE_SIZE, messages.length - displayCount)} 件を表示 (残り {messages.length - displayCount} 件)</span>
          </button>

          <button
            onClick={loadAll}
            className="px-3 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-800 text-xs transition"
          >
            すべて一括表示
          </button>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
