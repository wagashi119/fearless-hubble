import React, { useRef } from 'react';
import {
  FileText,
  Upload,
  Bookmark,
  BarChart2,
  FolderOpen,
  LayoutList,
  Sparkles,
  Film,
  AlignLeft
} from 'lucide-react';
import { LogStatistics } from '../utils/parser';

interface HeaderProps {
  fileName?: string;
  onFileSelect: (file: File) => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  markerCount: number;
  compact: boolean;
  onToggleCompact: () => void;
  onOpenStats: () => void;
  stats?: LogStatistics;
  isLoading: boolean;
  viewMode: 'vertical' | 'horizontal';
  onToggleViewMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  fileName,
  onFileSelect,
  onToggleSidebar,
  isSidebarOpen,
  markerCount,
  compact,
  onToggleCompact,
  onOpenStats,
  stats,
  isLoading,
  viewMode,
  onToggleViewMode,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <header className="bg-[#18191c] border-b border-gray-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* ロゴ & ファイル情報 */}
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg flex-shrink-0">
            🎲
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-white text-sm sm:text-base tracking-tight truncate">
              CCFOLIA タイムラインビューア
            </h1>
            {fileName && (
              <p className="text-[11px] text-gray-400 truncate max-w-xs sm:max-w-md font-mono">
                {fileName}
              </p>
            )}
          </div>
        </div>

        {/* アクションボタン群 */}
        <div className="flex items-center space-x-2">
          {/* ファイル読み込み */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow transition disabled:opacity-50"
            title="ココフォリアのJSONログファイルを選択"
          >
            <Upload size={14} />
            <span className="hidden sm:inline">JSON読込</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />

          {/* 統計ボタン */}
          {stats && (
            <button
              onClick={onOpenStats}
              className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition"
              title="セッション統計・ダイス確率・発言グラフを表示"
            >
              <BarChart2 size={13} />
              <span className="hidden sm:inline">統計</span>
            </button>
          )}

          {/* 表示モード切替 (縦型 / 横型動画編集タイムライン) */}
          <button
            onClick={onToggleViewMode}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
              viewMode === 'horizontal'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-violet-500 shadow-md ring-1 ring-white/20'
                : 'bg-gray-800/80 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
            title={viewMode === 'horizontal' ? '縦型チャットタイムラインに切替' : '動画編集ソフト風の横型タイムラインに切替'}
          >
            {viewMode === 'horizontal' ? <Film size={14} className="text-white" /> : <AlignLeft size={14} />}
            <span className="hidden md:inline">{viewMode === 'horizontal' ? '横軸シーケンサー' : '縦型タイムライン'}</span>
          </button>

          {/* 表示密度切替 (縦型時のみ) */}
          {viewMode === 'vertical' && (
            <button
              onClick={onToggleCompact}
              className={`p-2 rounded-lg border text-xs transition ${
                compact
                  ? 'bg-indigo-950/40 border-indigo-600/50 text-indigo-300'
                  : 'bg-gray-800/80 border-gray-700 text-gray-400 hover:text-gray-200'
              }`}
              title={compact ? '通常表示に切り替え' : 'コンパクト表示に切り替え'}
            >
              <LayoutList size={15} />
            </button>
          )}

          {/* マーカーサイドバー開閉ボタン */}
          <button
            onClick={onToggleSidebar}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
              isSidebarOpen
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                : 'bg-gray-800/80 hover:bg-gray-700 text-gray-200 border-gray-700'
            }`}
          >
            <Bookmark size={14} />
            <span>マーカー</span>
            {markerCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isSidebarOpen ? 'bg-white text-indigo-700' : 'bg-indigo-900 text-indigo-200'
                }`}
              >
                {markerCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
