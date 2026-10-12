import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { CcfoliaMessage, Marker } from '../types/ccfolia';
import { MessageCard } from './MessageCard';
import { formatTime, formatDate, formatDateTime } from '../utils/parser';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Plus,
  Sparkles,
  Skull,
  Dices,
  Layers,
  Clock,
  Film,
  Calendar,
  Grid
} from 'lucide-react';

interface HorizontalTimelineProps {
  messages: { message: CcfoliaMessage; originalIndex: number }[];
  images?: Record<string, string>;
  markers: Marker[];
  onAddMarker: (index: number) => void;
  onEditMarker: (marker: Marker) => void;
  targetJumpIndex?: number | null;
  onJumpHandled?: () => void;
}

export const HorizontalTimeline: React.FC<HorizontalTimelineProps> = ({
  messages,
  images,
  markers,
  onAddMarker,
  onEditMarker,
  targetJumpIndex,
  onJumpHandled,
}) => {
  // 拡大率 (20% 〜 800%、従来の倍以上)
  const [zoom, setZoom] = useState<number>(120);
  // スケールモード: 'time' (実時間等比: 1秒/1分/1時間の線と連動) | 'index' (発言等間隔)
  const [scaleMode, setScaleMode] = useState<'time' | 'index'>('time');
  // 日付フィルター ('all' または 'YYYY/MM/DD')
  const [selectedDate, setSelectedDate] = useState<string>('all');
  // 選択中のメッセージインデックス (filteredMessages 内のインデックス)
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  // 自動再生 (オートスクロール)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1500);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 日付一覧の抽出
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    messages.forEach(({ message }) => {
      const d = formatDate(message.createdAt);
      if (d) dates.add(d);
    });
    return Array.from(dates).sort();
  }, [messages]);

  // 日付で絞り込まれたメッセージ
  const activeMessages = useMemo(() => {
    if (selectedDate === 'all') return messages;
    return messages.filter(({ message }) => formatDate(message.createdAt) === selectedDate);
  }, [messages, selectedDate]);

  // マーカーマップ
  const markerMap = useMemo(() => {
    const map = new Map<number, Marker>();
    markers.forEach((m) => {
      map.set(m.targetMessageIndex, m);
    });
    return map;
  }, [markers]);

  // 主要キャラクターリスト（トラック分け用）
  const topCharacters = useMemo(() => {
    const counts = new Map<string, { count: number; color?: string; icon?: string | null }>();
    activeMessages.forEach(({ message }) => {
      if (message.type !== 'system' && message.name) {
        if (!counts.has(message.name)) {
          counts.set(message.name, { count: 0, color: message.color, icon: message.iconImage });
        }
        counts.get(message.name)!.count++;
      }
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8)
      .map(([name, data]) => ({ name, ...data }));
  }, [activeMessages]);

  // タイムラインの最小・最大時刻
  const { minTime, maxTime, totalDuration } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    activeMessages.forEach(({ message }) => {
      if (message.createdAt) {
        if (message.createdAt < min) min = message.createdAt;
        if (message.createdAt > max) max = message.createdAt;
      }
    });
    if (min === Infinity) return { minTime: 0, maxTime: 1000, totalDuration: 1000 };
    return {
      minTime: min,
      maxTime: Math.max(min + 1000, max),
      totalDuration: Math.max(1000, max - min),
    };
  }, [activeMessages]);

  // 基本クリップ幅 (従来の2倍: 200pxベース)
  const baseStepWidth = Math.max(60, (220 * zoom) / 100);

  // 実時間モードでのピクセル/秒比率 (拡大率 zoom に応じて大きくスケーリング)
  // zoom 100% で、例えばセッション1時間あたり約 3,000px 〜 10,000px
  const pixelsPerSecond = useMemo(() => {
    // 画面幅に対して最低でも広がりを持たせる
    const totalSec = Math.max(1, totalDuration / 1000);
    const baseWidth = Math.max(4000, activeMessages.length * 150);
    return (baseWidth / totalSec) * (zoom / 100);
  }, [totalDuration, activeMessages.length, zoom]);

  // 各メッセージの X 座標 (px)
  const getMessageX = useCallback(
    (idx: number, createdAt: number) => {
      if (scaleMode === 'index') {
        return idx * baseStepWidth + 180;
      } else {
        const offsetSec = Math.max(0, (createdAt - minTime) / 1000);
        return offsetSec * pixelsPerSecond + 180;
      }
    },
    [scaleMode, baseStepWidth, minTime, pixelsPerSecond]
  );

  // タイムラインの総横幅 (px)
  const totalTimelineWidth = useMemo(() => {
    if (activeMessages.length === 0) return 2000;
    if (scaleMode === 'index') {
      return activeMessages.length * baseStepWidth + 600;
    } else {
      const totalSec = Math.max(1, totalDuration / 1000);
      return Math.max(2500, totalSec * pixelsPerSecond + 800);
    }
  }, [activeMessages.length, scaleMode, baseStepWidth, totalDuration, pixelsPerSecond]);

  // 時間単位グリッド線の計算 (1秒・1分・1時間の動的決定)
  const gridLines = useMemo(() => {
    if (scaleMode !== 'time' || totalDuration <= 0) return [];

    const lines: {
      x: number;
      timeMs: number;
      label: string;
      subLabel?: string;
      unit: 'second' | 'minute' | 'hour' | 'day';
      isMajor: boolean;
    }[] = [];

    // 1ピクセルあたりの秒数
    const secondsPerPixel = 1 / Math.max(0.0001, pixelsPerSecond);

    // 適切な目盛り間隔(秒)を決定
    // 画面上で目盛りがおおよそ 80px 〜 200px 間隔になるようにステップを選択
    let stepSec = 1;
    let unit: 'second' | 'minute' | 'hour' | 'day' = 'second';

    if (secondsPerPixel * 100 < 2) {
      stepSec = 1; // 1秒単位
      unit = 'second';
    } else if (secondsPerPixel * 100 < 10) {
      stepSec = 5; // 5秒単位
      unit = 'second';
    } else if (secondsPerPixel * 100 < 20) {
      stepSec = 10; // 10秒単位
      unit = 'second';
    } else if (secondsPerPixel * 100 < 60) {
      stepSec = 30; // 30秒単位
      unit = 'second';
    } else if (secondsPerPixel * 100 < 120) {
      stepSec = 60; // 1分単位
      unit = 'minute';
    } else if (secondsPerPixel * 100 < 600) {
      stepSec = 300; // 5分単位
      unit = 'minute';
    } else if (secondsPerPixel * 100 < 1800) {
      stepSec = 900; // 15分単位
      unit = 'minute';
    } else if (secondsPerPixel * 100 < 3600) {
      stepSec = 1800; // 30分単位
      unit = 'minute';
    } else if (secondsPerPixel * 100 < 7200) {
      stepSec = 3600; // 1時間単位
      unit = 'hour';
    } else if (secondsPerPixel * 100 < 21600) {
      stepSec = 10800; // 3時間単位
      unit = 'hour';
    } else if (secondsPerPixel * 100 < 43200) {
      stepSec = 21600; // 6時間単位
      unit = 'hour';
    } else {
      stepSec = 86400; // 1日単位
      unit = 'day';
    }

    const startSec = Math.floor(minTime / 1000 / stepSec) * stepSec;
    const endSec = Math.ceil(maxTime / 1000 / stepSec) * stepSec;

    for (let s = startSec; s <= endSec; s += stepSec) {
      const curMs = s * 1000;
      if (curMs < minTime - 5000 || curMs > maxTime + 5000) continue;

      const offsetSec = (curMs - minTime) / 1000;
      const x = offsetSec * pixelsPerSecond + 180;

      const dateObj = new Date(curMs);
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const mins = String(dateObj.getMinutes()).padStart(2, '0');
      const secs = String(dateObj.getSeconds()).padStart(2, '0');

      let label = '';
      let isMajor = false;

      if (unit === 'second') {
        label = `${hours}:${mins}:${secs}`;
        isMajor = dateObj.getSeconds() === 0; // 分の変わり目が主線
      } else if (unit === 'minute') {
        label = `${hours}:${mins}`;
        isMajor = dateObj.getMinutes() === 0; // 時間の変わり目が主線
      } else if (unit === 'hour') {
        label = `${hours}:00`;
        isMajor = dateObj.getHours() === 0; // 日付の変わり目が主線
      } else {
        label = formatDate(curMs);
        isMajor = true;
      }

      lines.push({
        x,
        timeMs: curMs,
        label,
        subLabel: isMajor ? formatDate(curMs) : undefined,
        unit,
        isMajor,
      });
    }

    return lines;
  }, [scaleMode, totalDuration, pixelsPerSecond, minTime, maxTime]);

  // シーク・選択位置へスムーズスクロール
  const scrollToSelected = useCallback(
    (index: number) => {
      if (!scrollContainerRef.current) return;
      const msgItem = activeMessages[index];
      if (!msgItem) return;

      const x = getMessageX(index, msgItem.message.createdAt);
      const containerWidth = scrollContainerRef.current.clientWidth;
      scrollContainerRef.current.scrollTo({
        left: Math.max(0, x - containerWidth / 2 + 100),
        behavior: 'smooth',
      });
    },
    [activeMessages, getMessageX]
  );

  // 外部からのジャンプ要求
  useEffect(() => {
    if (targetJumpIndex !== null && targetJumpIndex !== undefined) {
      const targetMsg = messages.find((m) => m.originalIndex === targetJumpIndex);
      if (targetMsg) {
        // 日付フィルターが指定日と合致していない場合は全日程にする
        const msgDate = formatDate(targetMsg.message.createdAt);
        if (selectedDate !== 'all' && selectedDate !== msgDate) {
          setSelectedDate('all');
        }
      }

      const idx = activeMessages.findIndex((m) => m.originalIndex === targetJumpIndex);
      if (idx !== -1) {
        setSelectedIndex(idx);
        scrollToSelected(idx);
      }
      onJumpHandled?.();
    }
  }, [targetJumpIndex, messages, activeMessages, selectedDate, scrollToSelected, onJumpHandled]);

  // 自動再生タイマー
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setSelectedIndex((prev) => {
        const next = prev + 1;
        if (next >= activeMessages.length) {
          setIsPlaying(false);
          return prev;
        }
        scrollToSelected(next);
        return next;
      });
    }, playbackSpeed);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, activeMessages.length, scrollToSelected]);

  // ズーム調整 (最大 800% まで対応)
  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(800, Math.max(20, prev + delta)));
  };

  // 全体フィット
  const handleFitScreen = () => {
    if (!scrollContainerRef.current || activeMessages.length === 0) return;
    const containerWidth = scrollContainerRef.current.clientWidth - 300;
    const calculatedZoom = Math.max(
      20,
      Math.min(300, (containerWidth / (activeMessages.length * 160)) * 100)
    );
    setZoom(Math.round(calculatedZoom));
  };

  // テキストを10文字程度に制限する関数（チャットログ俯瞰用）
  const formatClipText = (text: string | undefined): string => {
    if (!text) return '…';
    const clean = text.replace(/[\r\n\t]+/g, ' ').trim();
    if (clean.length <= 10) return clean;
    return `${clean.slice(0, 10)}…`;
  };

  // 現在選択中のメッセージ
  const currentSelected = activeMessages[selectedIndex];

  // 現在の目盛り単位の説明テキスト
  const currentUnitLabel = useMemo(() => {
    if (scaleMode === 'index') return '発言順 (インデックス)';
    if (gridLines.length === 0) return '実時間';
    const u = gridLines[0]?.unit;
    if (u === 'second') return '目盛り: 1秒〜秒単位';
    if (u === 'minute') return '目盛り: 1分〜分単位';
    if (u === 'hour') return '目盛り: 1時間単位';
    return '目盛り: 日付単位';
  }, [scaleMode, gridLines]);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-[#0d0e11] text-gray-200 select-none overflow-hidden">
      {/* タイムラインコントロールバー */}
      <div className="h-14 px-4 bg-[#16171b] border-b border-gray-800 flex items-center justify-between gap-3 flex-shrink-0 z-20">
        {/* 再生 & ステップコントロール */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              if (selectedIndex > 0) {
                const next = selectedIndex - 1;
                setSelectedIndex(next);
                scrollToSelected(next);
              }
            }}
            disabled={selectedIndex === 0}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-40 transition"
            title="前の発言へ"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? '停止' : '自動再生'}</span>
          </button>

          <button
            onClick={() => {
              if (selectedIndex < activeMessages.length - 1) {
                const next = selectedIndex + 1;
                setSelectedIndex(next);
                scrollToSelected(next);
              }
            }}
            disabled={selectedIndex >= activeMessages.length - 1}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-40 transition"
            title="次の発言へ"
          >
            <ChevronRight size={16} />
          </button>

          <div className="h-5 w-px bg-gray-800 mx-1" />

          {/* シークカウンター */}
          <div className="font-mono text-xs text-gray-400 bg-black/50 px-2.5 py-1 rounded-md border border-gray-800 flex items-center space-x-1.5">
            <Film size={12} className="text-indigo-400" />
            <span className="text-white font-bold">{selectedIndex + 1}</span>
            <span>/</span>
            <span>{activeMessages.length}</span>
          </div>

          {/* 日付セレクター */}
          {availableDates.length > 1 && (
            <div className="flex items-center space-x-1 ml-2 text-xs">
              <Calendar size={13} className="text-gray-500" />
              <select
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedIndex(0);
                }}
                className="bg-gray-900 border border-gray-700 rounded-md px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-indigo-500 font-mono"
              >
                <option value="all">全日程 ({messages.length}件)</option>
                {availableDates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ズーム & グリッド線コントロール */}
        <div className="flex items-center space-x-3">
          {/* 目盛り単位バッジ */}
          <div className="hidden lg:flex items-center space-x-1 px-2.5 py-1 rounded-md bg-indigo-950/40 border border-indigo-800/40 text-[11px] text-indigo-300 font-medium">
            <Grid size={12} />
            <span>{currentUnitLabel}</span>
          </div>

          {/* スケールモード切替 */}
          <div className="flex items-center bg-gray-900 border border-gray-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setScaleMode('time')}
              className={`px-2.5 py-1 rounded-md transition ${
                scaleMode === 'time'
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="実時間の経過（1秒/1分/1時間の目盛り線）で正確に並べる"
            >
              実時間 (秒/分/時)
            </button>
            <button
              onClick={() => setScaleMode('index')}
              className={`px-2.5 py-1 rounded-md transition ${
                scaleMode === 'index'
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="発言ごとに等間隔で並べる"
            >
              発言等間隔
            </button>
          </div>

          <div className="h-5 w-px bg-gray-800" />

          {/* 拡大縮小スライダー (20% 〜 800% のワイドレンジ) */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleZoom(-30)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
              title="縮小"
            >
              <ZoomOut size={16} />
            </button>

            <div className="flex items-center space-x-1.5 w-28">
              <input
                type="range"
                min="20"
                max="800"
                step="10"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            <button
              onClick={() => handleZoom(30)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
              title="拡大 (最大800%)"
            >
              <ZoomIn size={16} />
            </button>

            <span className="font-mono text-xs text-indigo-300 w-12 text-right font-bold">
              {zoom}%
            </span>

            <button
              onClick={handleFitScreen}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
              title="画面幅にフィット"
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* メイン編集エリア */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* トラックレーン（横スクロールエリア） */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-auto bg-[#101114] relative select-none"
        >
          <div
            className="relative min-h-full"
            style={{ width: `${totalTimelineWidth}px` }}
          >
            {/* 上部: タイムルーラー（時間軸定規） */}
            <div className="sticky top-0 z-30 h-10 bg-[#1a1b1f] border-b border-gray-700/80 flex items-end shadow-md">
              <div className="sticky left-0 z-40 w-44 h-full bg-[#1a1b1f] border-r border-gray-800 flex items-center px-3 text-xs font-bold text-gray-400">
                <Clock size={13} className="mr-1.5 text-indigo-400" />
                <span>時間軸定規</span>
              </div>

              {/* グリッド線のルーラー目盛り */}
              {scaleMode === 'time' ? (
                gridLines.map((line, idx) => (
                  <div
                    key={idx}
                    className={`absolute bottom-0 border-l pl-1.5 pb-1 font-mono text-[10px] whitespace-nowrap pointer-events-none ${
                      line.isMajor
                        ? 'border-indigo-400/80 text-indigo-200 font-bold z-10'
                        : 'border-gray-700 text-gray-400'
                    }`}
                    style={{ left: `${line.x}px` }}
                  >
                    <span>{line.label}</span>
                    {line.subLabel && (
                      <span className="text-[9px] text-indigo-400 ml-1">({line.subLabel})</span>
                    )}
                  </div>
                ))
              ) : (
                // 等間隔モードのルーラー
                activeMessages.map(({ message }, idx) => {
                  if (idx % 5 !== 0) return null;
                  const x = getMessageX(idx, message.createdAt);
                  return (
                    <div
                      key={idx}
                      className="absolute bottom-0 border-l border-gray-700 pl-1 pb-1 font-mono text-[10px] text-gray-400 whitespace-nowrap pointer-events-none"
                      style={{ left: `${x}px` }}
                    >
                      #{idx + 1} {formatTime(message.createdAt)}
                    </div>
                  );
                })
              )}
            </div>

            {/* トラック全体を上から下まで貫通する縦グリッド線 (1秒・1分・1時間) */}
            {scaleMode === 'time' && (
              <div className="absolute top-10 bottom-0 left-0 right-0 pointer-events-none z-0">
                {gridLines.map((line, idx) => (
                  <div
                    key={idx}
                    className={`absolute top-0 bottom-0 ${
                      line.isMajor
                        ? 'border-l border-indigo-500/20'
                        : 'border-l border-gray-800/40'
                    }`}
                    style={{ left: `${line.x}px` }}
                  />
                ))}
              </div>
            )}

            {/* 赤い再生ヘッド（シーク針） */}
            {currentSelected && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-30 pointer-events-none transition-all duration-75 shadow-[0_0_10px_rgba(244,63,94,0.9)]"
                style={{
                  left: `${getMessageX(selectedIndex, currentSelected.message.createdAt) + 12}px`,
                }}
              >
                {/* 針のトップマーカー */}
                <div className="w-4 h-4 -left-[7px] top-0 absolute bg-rose-500 rotate-45 rounded-sm shadow-md flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                </div>
              </div>
            )}

            {/* トラック群 */}
            <div className="space-y-1.5 py-3 pl-2 relative z-10">
              {/* トラック 1: マーカーレーン */}
              <div className="h-9 relative bg-[#141518]/90 rounded-md border border-gray-800">
                <div className="sticky left-0 z-20 flex items-center space-x-1.5 px-3 h-full text-[11px] font-bold text-indigo-300 w-44 bg-[#141518] border-r border-gray-800 pointer-events-none">
                  <Bookmark size={13} fill="currentColor" />
                  <span>マーカー / しおり</span>
                </div>

                {markers.map((marker) => {
                  const mIndex = activeMessages.findIndex(
                    (m) => m.originalIndex === marker.targetMessageIndex
                  );
                  if (mIndex === -1) return null;
                  const x = getMessageX(mIndex, marker.targetMessageTime);

                  return (
                    <div
                      key={marker.id}
                      onClick={() => {
                        setSelectedIndex(mIndex);
                        scrollToSelected(mIndex);
                      }}
                      className="group/marker absolute top-1 bottom-1 px-2.5 rounded-md flex items-center space-x-1 cursor-pointer transition shadow-md hover:scale-105 z-20"
                      style={{
                        left: `${x}px`,
                        backgroundColor: marker.color,
                      }}
                      title={`${marker.title} (${formatTime(marker.targetMessageTime)})`}
                    >
                      <Bookmark size={11} className="text-white flex-shrink-0" fill="currentColor" />
                      <span className="text-[11px] font-extrabold text-white whitespace-nowrap">
                        {formatClipText(marker.title)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* トラック 2: ダイス & 名場面レーン */}
              <div className="h-9 relative bg-[#141518]/90 rounded-md border border-gray-800">
                <div className="sticky left-0 z-20 flex items-center space-x-1.5 px-3 h-full text-[11px] font-bold text-amber-300 w-44 bg-[#141518] border-r border-gray-800 pointer-events-none">
                  <Dices size={13} />
                  <span>ダイス / 名場面</span>
                </div>

                {activeMessages.map(({ message, originalIndex }, idx) => {
                  const roll = message.extend?.roll;
                  if (!roll) return null;
                  const x = getMessageX(idx, message.createdAt);
                  const isCrit = roll.critical;
                  const isFumble = roll.fumble;

                  return (
                    <div
                      key={originalIndex}
                      onClick={() => {
                        setSelectedIndex(idx);
                        scrollToSelected(idx);
                      }}
                      className={`absolute top-1 bottom-1 px-2 rounded-md flex items-center space-x-1 cursor-pointer transition text-[10px] font-bold shadow-sm ${
                        isCrit
                          ? 'bg-amber-500 text-amber-950 ring-2 ring-amber-300 critical-glow z-20'
                          : isFumble
                          ? 'bg-rose-600 text-white ring-2 ring-rose-400 fumble-glow z-20'
                          : 'bg-indigo-950/80 border border-indigo-700/60 text-indigo-200 hover:bg-indigo-800'
                      }`}
                      style={{ left: `${x}px` }}
                      title={`${message.name}: ${roll.result || message.text} (${formatTime(message.createdAt)})`}
                    >
                      {isCrit && <Sparkles size={11} />}
                      {isFumble && <Skull size={11} />}
                      <span className="whitespace-nowrap font-mono">
                        {isCrit
                          ? '✨CRIT'
                          : isFumble
                          ? '💀FUMBLE'
                          : formatClipText(roll.result || 'ROLL')}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* トラック 3〜N: 主要キャラクター別レーン */}
              {topCharacters.map((char) => (
                <div
                  key={char.name}
                  className="h-10 relative bg-[#131417]/80 rounded-md border border-gray-800/60 hover:bg-[#18191e] transition"
                >
                  {/* トラックヘッダー */}
                  <div className="sticky left-0 z-20 flex items-center space-x-2 px-3 h-full text-xs font-semibold w-44 bg-[#131417] border-r border-gray-800 pointer-events-none">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: char.color || '#9ca3af' }}
                    />
                    <span className="truncate text-gray-200" title={char.name}>
                      {char.name}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono ml-auto">
                      {char.count}
                    </span>
                  </div>

                  {/* キャラクターの発言クリップ (テキストを10字程度に制限) */}
                  {activeMessages.map(({ message, originalIndex }, idx) => {
                    if (message.name !== char.name) return null;
                    const x = getMessageX(idx, message.createdAt);
                    const isSelected = selectedIndex === idx;

                    return (
                      <div
                        key={originalIndex}
                        onClick={() => {
                          setSelectedIndex(idx);
                          scrollToSelected(idx);
                        }}
                        className={`absolute top-1 bottom-1 px-2 rounded flex items-center cursor-pointer transition text-xs shadow-sm ${
                          isSelected
                            ? 'ring-2 ring-rose-500 ring-offset-1 ring-offset-[#101114] z-20 font-bold bg-indigo-700 text-white'
                            : 'hover:brightness-125'
                        }`}
                        style={{
                          left: `${x}px`,
                          backgroundColor: char.color ? `${char.color}33` : '#374151',
                          borderLeft: `3px solid ${char.color || '#9ca3af'}`,
                        }}
                        title={`${message.name} [${formatTime(message.createdAt)}]: ${message.text}`}
                      >
                        {/* 10文字以内のテキスト */}
                        <span className="truncate text-[11px] text-gray-200 whitespace-nowrap">
                          {formatClipText(message.text || message.extend?.roll?.result)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* その他のキャラクター & システム通知レーン */}
              <div className="h-9 relative bg-[#131417]/80 rounded-md border border-gray-800/60">
                <div className="sticky left-0 z-20 flex items-center space-x-2 px-3 h-full text-xs font-semibold w-44 bg-[#131417] border-r border-gray-800 pointer-events-none text-gray-400">
                  <Layers size={13} />
                  <span>その他・システム</span>
                </div>

                {activeMessages.map(({ message, originalIndex }, idx) => {
                  if (topCharacters.some((c) => c.name === message.name)) return null;
                  const x = getMessageX(idx, message.createdAt);
                  const isSelected = selectedIndex === idx;

                  return (
                    <div
                      key={originalIndex}
                      onClick={() => {
                        setSelectedIndex(idx);
                        scrollToSelected(idx);
                      }}
                      className={`absolute top-1 bottom-1 px-1.5 rounded flex items-center cursor-pointer transition text-[11px] shadow-sm ${
                        isSelected
                          ? 'ring-2 ring-rose-500 z-20 bg-gray-700 text-white font-bold'
                          : 'bg-gray-800/80 text-gray-400 hover:text-gray-200 border border-gray-700/50'
                      }`}
                      style={{ left: `${x}px` }}
                      title={`${message.name} [${formatTime(message.createdAt)}]: ${message.text}`}
                    >
                      <span className="truncate whitespace-nowrap">
                        {formatClipText(message.text)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 下部: プレビューモニター / インスペクターパネル */}
        {currentSelected && (
          <div className="h-56 bg-[#16171b] border-t border-gray-800 p-4 flex flex-col md:flex-row gap-4 flex-shrink-0 z-20 shadow-2xl">
            {/* 左側: ミニモニター情報 */}
            <div className="md:w-64 flex flex-col justify-between border-b md:border-b-0 md:border-r border-gray-800 pb-3 md:pb-0 md:pr-4 text-xs">
              <div className="space-y-1.5">
                <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider flex items-center space-x-1.5">
                  <Clock size={13} className="text-indigo-400" />
                  <span>発言時刻 (いつ)</span>
                </div>
                {/* 時刻表示の強調 */}
                <div className="font-mono text-base font-extrabold text-indigo-300 bg-black/40 px-2.5 py-1 rounded border border-gray-800">
                  {formatDateTime(currentSelected.message.createdAt)}
                </div>

                <div className="text-sm font-bold text-white truncate pt-1">
                  #{currentSelected.originalIndex + 1} {currentSelected.message.name}
                </div>

                {currentSelected.message.channelName && (
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-gray-800 text-gray-300 border border-gray-700">
                    タブ: {currentSelected.message.channelName}
                  </span>
                )}
              </div>

              {/* マーカー配置アクション */}
              <div className="pt-2">
                {markerMap.get(currentSelected.originalIndex) ? (
                  <button
                    onClick={() => onEditMarker(markerMap.get(currentSelected.originalIndex)!)}
                    className="w-full flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition"
                  >
                    <Bookmark size={13} fill="currentColor" />
                    <span>マーカーを編集</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onAddMarker(currentSelected.originalIndex)}
                    className="w-full flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-xs font-semibold transition"
                  >
                    <Plus size={13} />
                    <span>ここにマーカーを配置</span>
                  </button>
                )}
              </div>
            </div>

            {/* 右側: リッチメッセージプレビューカード */}
            <div className="flex-1 overflow-y-auto pr-2">
              <MessageCard
                message={currentSelected.message}
                index={currentSelected.originalIndex}
                images={images}
                marker={markerMap.get(currentSelected.originalIndex)}
                onAddMarker={onAddMarker}
                onEditMarker={onEditMarker}
                compact={false}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
