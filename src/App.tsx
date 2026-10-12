import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CcfoliaLogData, CcfoliaMessage, FilterState, Marker } from './types/ccfolia';
import {
  parseCcfoliaLog,
  calculateStatistics,
  detectAutoMarkers,
  LogStatistics
} from './utils/parser';
import {
  loadMarkers,
  saveMarkers,
  exportMarkersJson,
  importMarkersJson
} from './utils/storage';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { Timeline } from './components/Timeline';
import { HorizontalTimeline } from './components/HorizontalTimeline';
import { MarkerSidebar } from './components/MarkerSidebar';
import { MarkerModal } from './components/MarkerModal';
import { StatsModal } from './components/StatsModal';
import { TimelineMinimap } from './components/TimelineMinimap';
import { Upload, Sparkles, Bookmark, FileText } from 'lucide-react';

export const App: React.FC = () => {
  const [logData, setLogData] = useState<CcfoliaLogData | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [sessionKey, setSessionKey] = useState<string>('default');
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 表示・UI状態
  const [viewMode, setViewMode] = useState<'vertical' | 'horizontal'>('horizontal');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);
  const [compact, setCompact] = useState<boolean>(false);

  // マーカー編集モーダル
  const [isMarkerModalOpen, setIsMarkerModalOpen] = useState<boolean>(false);
  const [modalTargetMessage, setModalTargetMessage] = useState<{
    message: CcfoliaMessage;
    index: number;
  } | undefined>();
  const [editingMarker, setEditingMarker] = useState<Marker | null>(null);

  // タイムラインジャンプ用
  const [jumpIndex, setJumpIndex] = useState<number | null>(null);

  // フィルター
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    channels: [],
    characters: [],
    showSystem: true,
    showDiceOnly: false,
    showCritFumbleOnly: false,
    hasMarkersOnly: false,
  });

  // ドラッグ＆ドロップ状態
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // セッション識別キー生成
  const generateSessionKey = (data: CcfoliaLogData, name: string) => {
    const firstTime = data.messages[0]?.createdAt || 0;
    return `${name}_${firstTime}_${data.messages.length}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  };

  // ログデータを読み込む共通処理
  const handleLoadLog = useCallback((data: CcfoliaLogData, name: string) => {
    try {
      const key = generateSessionKey(data, name);
      setLogData(data);
      setFileName(name);
      setSessionKey(key);
      setErrorMsg(null);

      // 保存済みマーカーをロード
      const saved = loadMarkers(key);
      setMarkers(saved);

      // 初回でマーカーがまだなければ自動検出を試みる
      if (saved.length === 0) {
        const auto = detectAutoMarkers(data);
        if (auto.length > 0) {
          // チャプター名などの重要なものだけ初期登録する（または自動検出提案）
          const chaptersOnly = auto.filter((m) => m.category === 'chapter');
          if (chaptersOnly.length > 0) {
            setMarkers(chaptersOnly);
            saveMarkers(key, chaptersOnly);
          }
        }
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'ログデータの解析に失敗しました。');
    }
  }, []);

  // ファイルアップロード処理
  const handleFile = async (file: File) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const parsed = parseCcfoliaLog(json);
      handleLoadLog(parsed, file.name);
    } catch (e: any) {
      setErrorMsg(`ファイル読込エラー: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // マーカー永続化
  const updateMarkers = (newMarkers: Marker[]) => {
    setMarkers(newMarkers);
    if (sessionKey) {
      saveMarkers(sessionKey, newMarkers);
    }
  };

  // マーカー保存（新規または編集）
  const handleSaveMarker = (markerData: Omit<Marker, 'id' | 'createdAt'> & { id?: string }) => {
    if (markerData.id) {
      // 既存の編集
      const updated = markers.map((m) =>
        m.id === markerData.id
          ? { ...m, ...markerData }
          : m
      );
      updateMarkers(updated);
    } else {
      // 新規作成
      const newMarker: Marker = {
        ...markerData,
        id: `marker-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: Date.now(),
      };
      updateMarkers([...markers, newMarker]);
    }
  };

  // マーカー削除
  const handleDeleteMarker = (id: string) => {
    updateMarkers(markers.filter((m) => m.id !== id));
  };

  // 自動検出マーカーの一括インポート
  const handleDetectAutoMarkers = () => {
    if (!logData) return;
    const detected = detectAutoMarkers(logData);
    if (detected.length === 0) {
      alert('自動検出できるチャプターやダイス等が見つかりませんでした。');
      return;
    }

    // 重複を避けてマージ
    const existingTimes = new Set(markers.map((m) => m.targetMessageTime));
    const toAdd = detected.filter((d) => !existingTimes.has(d.targetMessageTime));

    if (toAdd.length === 0) {
      alert('すでにすべての自動マーカーが登録されています。');
      return;
    }

    const merged = [...markers, ...toAdd];
    updateMarkers(merged);
    alert(`${toAdd.length} 件のマーカーを自動検出して登録しました！`);
  };

  // マーカーのエクスポート
  const handleExportMarkers = () => {
    exportMarkersJson(sessionKey, markers);
  };

  // マーカーのインポート
  const handleImportMarkers = async (file: File) => {
    try {
      const imported = await importMarkersJson(file);
      updateMarkers(imported);
      alert(`${imported.length} 件のマーカーを読み込みました。`);
    } catch (e: any) {
      alert(`マーカー読み込みエラー: ${e.message}`);
    }
  };

  // マーカーモーダルを開く
  const handleOpenAddMarker = (originalIndex: number) => {
    if (!logData) return;
    const msg = logData.messages[originalIndex];
    if (!msg) return;

    // すでにこのメッセージにマーカーがあるか
    const existing = markers.find((m) => m.targetMessageIndex === originalIndex);
    if (existing) {
      setEditingMarker(existing);
      setModalTargetMessage({ message: msg, index: originalIndex });
    } else {
      setEditingMarker(null);
      setModalTargetMessage({ message: msg, index: originalIndex });
    }
    setIsMarkerModalOpen(true);
  };

  const handleOpenEditMarker = (marker: Marker) => {
    if (!logData) return;
    const msg = logData.messages[marker.targetMessageIndex];
    setEditingMarker(marker);
    if (msg) {
      setModalTargetMessage({ message: msg, index: marker.targetMessageIndex });
    }
    setIsMarkerModalOpen(true);
  };

  // 統計情報計算
  const stats: LogStatistics | undefined = useMemo(() => {
    if (!logData) return undefined;
    return calculateStatistics(logData);
  }, [logData]);

  // フィルター処理
  const filteredMessages = useMemo(() => {
    if (!logData) return [];

    const markerIndexSet = new Set(markers.map((m) => m.targetMessageIndex));
    const query = filters.searchQuery.trim().toLowerCase();

    return logData.messages
      .map((message, originalIndex) => ({ message, originalIndex }))
      .filter(({ message, originalIndex }) => {
        // システムメッセージ除外
        if (!filters.showSystem && message.type === 'system') {
          return false;
        }

        // チャンネルフィルター
        if (filters.channels.length > 0) {
          const ch = message.channel || 'default';
          if (!filters.channels.includes(ch)) return false;
        }

        // キャラクターフィルター
        if (filters.characters.length > 0) {
          if (!filters.characters.includes(message.name)) return false;
        }

        // ダイスロールのみ
        if (filters.showDiceOnly && !message.extend?.roll) {
          return false;
        }

        // クリティカル / ファンブルのみ
        if (filters.showCritFumbleOnly) {
          const roll = message.extend?.roll;
          if (!roll || (!roll.critical && !roll.fumble)) return false;
        }

        // マーカーがある発言のみ
        if (filters.hasMarkersOnly && !markerIndexSet.has(originalIndex)) {
          return false;
        }

        // テキスト検索
        if (query) {
          const nameMatch = (message.name || '').toLowerCase().includes(query);
          const textMatch = (message.text || '').toLowerCase().includes(query);
          const rollMatch = (message.extend?.roll?.result || '').toLowerCase().includes(query);
          if (!nameMatch && !textMatch && !rollMatch) return false;
        }

        return true;
      });
  }, [logData, filters, markers]);

  // ドラッグ＆ドロップハンドラ
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.json')) {
      handleFile(file);
    } else {
      setErrorMsg('JSONファイル(.json)をドロップしてください。');
    }
  };

  return (
    <div
      className="min-h-screen bg-[#0f1012] text-gray-100 flex flex-col relative selection:bg-indigo-600 selection:text-white"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ドラッグオーバーのオーバーレイ */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-indigo-950/80 backdrop-blur-sm border-4 border-dashed border-indigo-400 flex flex-col items-center justify-center p-6 pointer-events-none">
          <Upload size={48} className="text-indigo-300 animate-bounce mb-3" />
          <h2 className="text-xl font-bold text-white">ココフォリアのJSONログをここにドロップ</h2>
          <p className="text-sm text-indigo-200 mt-1">瞬時にタイムラインを解析・表示します</p>
        </div>
      )}

      {/* ヘッダー */}
      <Header
        fileName={fileName}
        onFileSelect={handleFile}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
        markerCount={markers.length}
        compact={compact}
        onToggleCompact={() => setCompact(!compact)}
        onOpenStats={() => setIsStatsOpen(true)}
        stats={stats}
        isLoading={isLoading}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode((v) => (v === 'horizontal' ? 'vertical' : 'horizontal'))}
      />

      {/* エラーメッセージ */}
      {errorMsg && (
        <div className="bg-rose-900/60 border-b border-rose-700 text-rose-200 text-xs py-2 px-4 text-center flex items-center justify-center space-x-2">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="underline font-bold ml-2">
            閉じる
          </button>
        </div>
      )}

      {/* メインコンテンツ */}
      {logData ? (
        <>
          {/* フィルターバー */}
          <FilterBar
            filters={filters}
            onChangeFilters={setFilters}
            stats={stats}
            filteredCount={filteredMessages.length}
            totalCount={logData.messages.length}
          />

          {/* タイムライン本体 (縦型 / 横型動画編集タイムライン) */}
          {viewMode === 'horizontal' ? (
            <HorizontalTimeline
              messages={filteredMessages}
              images={logData.images}
              markers={markers}
              onAddMarker={handleOpenAddMarker}
              onEditMarker={handleOpenEditMarker}
              targetJumpIndex={jumpIndex}
              onJumpHandled={() => setJumpIndex(null)}
            />
          ) : (
            <>
              <main className="flex-1 pb-16">
                <Timeline
                  messages={filteredMessages}
                  images={logData.images}
                  markers={markers}
                  onAddMarker={handleOpenAddMarker}
                  onEditMarker={handleOpenEditMarker}
                  compact={compact}
                  targetJumpIndex={jumpIndex}
                  onJumpHandled={() => setJumpIndex(null)}
                />
              </main>

              {/* 右端タイムラインミニマップレール (縦型時のみ) */}
              <TimelineMinimap
                totalMessages={logData.messages.length}
                markers={markers}
                onJumpToMessage={(idx) => setJumpIndex(idx)}
              />
            </>
          )}
        </>
      ) : (
        /* ログ未読み込み時のウェルカム画面 */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full p-8 rounded-2xl bg-[#18191c] border border-gray-800 shadow-2xl space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 mx-auto flex items-center justify-center text-3xl shadow-lg">
              🎲
            </div>

            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                CCFOLIA タイムラインビューア
              </h2>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                ココフォリアから出力したJSONログファイルを読み込んで、タイムライン形式で美しく閲覧・マーカー配置ができます。
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center justify-center space-x-2 w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition cursor-pointer">
                <Upload size={16} />
                <span>JSONファイルを選択して開く</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  className="hidden"
                />
              </label>
            </div>

            <div className="border-2 border-dashed border-gray-700 rounded-xl p-5 text-xs text-gray-400 flex flex-col items-center justify-center space-y-1">
              <span>または、この画面にJSONファイルを直接ドラッグ＆ドロップ</span>
              <span className="text-[10px] text-gray-500">※ログデータはブラウザ内のみで解析され、サーバー等へ送信されることはありません</span>
            </div>
          </div>
        </div>
      )}

      {/* マーカーサイドバー */}
      <MarkerSidebar
        markers={markers}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectMarker={(m) => {
          setJumpIndex(m.targetMessageIndex);
        }}
        onEditMarker={handleOpenEditMarker}
        onDeleteMarker={handleDeleteMarker}
        onExport={handleExportMarkers}
        onImport={handleImportMarkers}
        onDetectAutoMarkers={handleDetectAutoMarkers}
        totalMessages={logData?.messages.length || 0}
      />

      {/* マーカー追加/編集モーダル */}
      <MarkerModal
        isOpen={isMarkerModalOpen}
        onClose={() => {
          setIsMarkerModalOpen(false);
          setEditingMarker(null);
          setModalTargetMessage(undefined);
        }}
        onSave={handleSaveMarker}
        targetMessage={modalTargetMessage}
        initialMarker={editingMarker}
      />

      {/* 統計モーダル */}
      {stats && (
        <StatsModal
          isOpen={isStatsOpen}
          onClose={() => setIsStatsOpen(false)}
          stats={stats}
        />
      )}
    </div>
  );
};

export default App;
