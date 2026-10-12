import React, { useState } from 'react';
import { Marker } from '../types/ccfolia';
import { formatTime, formatDate } from '../utils/parser';
import {
  Bookmark,
  Plus,
  Trash2,
  Edit2,
  Download,
  Upload,
  Sparkles,
  Swords,
  FileText,
  AlertCircle,
  Flag,
  Star,
  Skull,
  Search,
  Wand2,
  X,
  LucideIcon
} from 'lucide-react';

interface MarkerSidebarProps {
  markers: Marker[];
  isOpen: boolean;
  onClose: () => void;
  onSelectMarker: (marker: Marker) => void;
  onEditMarker: (marker: Marker) => void;
  onDeleteMarker: (id: string) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onDetectAutoMarkers: () => void;
  totalMessages: number;
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

export const MarkerSidebar: React.FC<MarkerSidebarProps> = ({
  markers,
  isOpen,
  onClose,
  onSelectMarker,
  onEditMarker,
  onDeleteMarker,
  onExport,
  onImport,
  onDetectAutoMarkers,
  totalMessages,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const filteredMarkers = markers
    .filter((m) => {
      if (selectedCategory !== 'all' && m.category !== selectedCategory) return false;
      if (
        filterQuery &&
        !m.title.toLowerCase().includes(filterQuery.toLowerCase()) &&
        !(m.note || '').toLowerCase().includes(filterQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.targetMessageIndex - b.targetMessageIndex);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-[#18191c] border-l border-gray-800 z-40 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-[#1e2024]">
        <div className="flex items-center space-x-2">
          <Bookmark size={18} className="text-indigo-400" />
          <h2 className="font-bold text-white text-base">マーカー一覧</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-900/50 text-indigo-300 font-mono">
            {markers.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition"
        >
          <X size={18} />
        </button>
      </div>

      {/* アクションバー: 自動検出 & 入出力 */}
      <div className="p-3 border-b border-gray-800 bg-[#141517] flex flex-wrap gap-2 text-xs">
        <button
          onClick={onDetectAutoMarkers}
          className="flex-1 flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-medium transition"
          title="チャプター名やクリティカル・ファンブルなどを自動解析してマーカーに追加"
        >
          <Wand2 size={13} />
          <span>自動検出</span>
        </button>
        <button
          onClick={onExport}
          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition"
          title="マーカーをJSONファイルとして保存"
        >
          <Download size={13} />
          <span>保存</span>
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition"
          title="マーカーJSONを読み込む"
        >
          <Upload size={13} />
          <span>読込</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".json"
          className="hidden"
        />
      </div>

      {/* 検索 & カテゴリ絞り込み */}
      <div className="p-3 border-b border-gray-800 space-y-2 bg-[#18191c]">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="マーカーを検索..."
            className="w-full bg-[#141517] border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-[11px]">
          {['all', 'chapter', 'battle', 'critical', 'clue', 'memo'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded-md whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'bg-gray-800/80 text-gray-400 hover:text-gray-200'
              }`}
            >
              {cat === 'all'
                ? 'すべて'
                : cat === 'chapter'
                ? '章・場面'
                : cat === 'battle'
                ? '戦闘'
                : cat === 'critical'
                ? 'ダイス'
                : cat === 'clue'
                ? '手がかり'
                : 'メモ'}
            </button>
          ))}
        </div>
      </div>

      {/* マーカーリスト */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredMarkers.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-xs">
            {markers.length === 0 ? (
              <div className="space-y-3">
                <Bookmark size={28} className="mx-auto text-gray-600" />
                <p>配置されたマーカーがありません</p>
                <p className="text-[11px] text-gray-600">
                  タイムライン上の発言にカーソルを合わせ「+」ボタンを押すか、上部の「自動検出」をお試しください。
                </p>
              </div>
            ) : (
              <p>検索条件に一致するマーカーがありません</p>
            )}
          </div>
        ) : (
          filteredMarkers.map((marker) => {
            const Icon = marker.icon && ICON_MAP[marker.icon] ? ICON_MAP[marker.icon] : Bookmark;

            return (
              <div
                key={marker.id}
                onClick={() => onSelectMarker(marker)}
                className="group relative p-3 rounded-lg bg-[#1e2024] hover:bg-[#25272c] border border-gray-800 hover:border-gray-700 transition cursor-pointer shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start space-x-2.5 min-w-0">
                    <span
                      className="p-1.5 rounded-md text-white flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: marker.color }}
                    >
                      <Icon size={13} />
                    </span>

                    <div className="min-w-0">
                      <h4 className="font-semibold text-white text-xs truncate">
                        {marker.title}
                      </h4>
                      {marker.note && (
                        <p className="text-[11px] text-gray-400 line-clamp-2 mt-0.5 leading-relaxed">
                          {marker.note}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 mt-1.5 text-[10px] text-gray-500 font-mono">
                        <span>#{marker.targetMessageIndex + 1}</span>
                        <span>•</span>
                        <span>{formatDate(marker.targetMessageTime)} {formatTime(marker.targetMessageTime)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 編集・削除アクション */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditMarker(marker);
                      }}
                      title="編集"
                      className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteMarker(marker.id);
                      }}
                      title="削除"
                      className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-gray-700"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* フッター情報 */}
      <div className="p-3 border-t border-gray-800 text-[11px] text-gray-500 text-center bg-[#141517]">
        クリックするとタイムラインの該当発言へ移動します
      </div>
    </aside>
  );
};
