import React, { useState, useEffect } from 'react';
import { Marker, CcfoliaMessage } from '../types/ccfolia';
import { X, Bookmark, Sparkles, Skull, Swords, FileText, Star, Flag, AlertCircle } from 'lucide-react';

interface MarkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (markerData: Omit<Marker, 'id' | 'createdAt'> & { id?: string }) => void;
  targetMessage?: { message: CcfoliaMessage; index: number };
  initialMarker?: Marker | null;
}

const CATEGORIES: { key: Marker['category']; label: string; defaultColor: string; defaultIcon: string }[] = [
  { key: 'chapter', label: '章・場面', defaultColor: '#8b5cf6', defaultIcon: 'bookmark' },
  { key: 'battle', label: '戦闘・戦闘行動', defaultColor: '#ef4444', defaultIcon: 'swords' },
  { key: 'critical', label: '名場面・ダイス', defaultColor: '#eab308', defaultIcon: 'sparkles' },
  { key: 'clue', label: '手がかり・情報', defaultColor: '#3b82f6', defaultIcon: 'file-text' },
  { key: 'important', label: '重要', defaultColor: '#ec4899', defaultIcon: 'alert-circle' },
  { key: 'memo', label: 'メモ・しおり', defaultColor: '#10b981', defaultIcon: 'flag' },
  { key: 'custom', label: 'カスタム', defaultColor: '#6366f1', defaultIcon: 'star' },
];

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#10b981', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#6b7280', // gray
];

const ICONS = [
  { key: 'bookmark', Icon: Bookmark },
  { key: 'swords', Icon: Swords },
  { key: 'sparkles', Icon: Sparkles },
  { key: 'file-text', Icon: FileText },
  { key: 'alert-circle', Icon: AlertCircle },
  { key: 'flag', Icon: Flag },
  { key: 'star', Icon: Star },
  { key: 'skull', Icon: Skull },
];

export const MarkerModal: React.FC<MarkerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  targetMessage,
  initialMarker,
}) => {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<Marker['category']>('chapter');
  const [color, setColor] = useState('#8b5cf6');
  const [icon, setIcon] = useState('bookmark');

  useEffect(() => {
    if (initialMarker) {
      setTitle(initialMarker.title);
      setNote(initialMarker.note || '');
      setCategory(initialMarker.category);
      setColor(initialMarker.color);
      setIcon(initialMarker.icon || 'bookmark');
    } else if (targetMessage) {
      // 初期値の自動サジェスト
      const msg = targetMessage.message;
      let suggestedTitle = '';
      let suggestedCategory: Marker['category'] = 'chapter';
      let suggestedColor = '#8b5cf6';
      let suggestedIcon = 'bookmark';

      if (msg.extend?.roll?.critical) {
        suggestedTitle = `クリティカル (${msg.name})`;
        suggestedCategory = 'critical';
        suggestedColor = '#eab308';
        suggestedIcon = 'sparkles';
      } else if (msg.extend?.roll?.fumble) {
        suggestedTitle = `ファンブル (${msg.name})`;
        suggestedCategory = 'battle';
        suggestedColor = '#ef4444';
        suggestedIcon = 'skull';
      } else if (msg.name && /チャプター|第.+章/i.test(msg.name)) {
        suggestedTitle = msg.name;
        suggestedCategory = 'chapter';
      } else {
        suggestedTitle = `${msg.name}の発言`;
        suggestedCategory = 'memo';
        suggestedColor = '#10b981';
        suggestedIcon = 'flag';
      }

      setTitle(suggestedTitle);
      setNote('');
      setCategory(suggestedCategory);
      setColor(suggestedColor);
      setIcon(suggestedIcon);
    }
  }, [initialMarker, targetMessage, isOpen]);

  if (!isOpen) return null;

  const handleCategoryChange = (cat: Marker['category']) => {
    setCategory(cat);
    const meta = CATEGORIES.find((c) => c.key === cat);
    if (meta) {
      setColor(meta.defaultColor);
      setIcon(meta.defaultIcon);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      id: initialMarker?.id,
      targetMessageIndex: initialMarker ? initialMarker.targetMessageIndex : targetMessage?.index ?? 0,
      targetMessageTime: initialMarker ? initialMarker.targetMessageTime : targetMessage?.message.createdAt ?? Date.now(),
      title: title.trim(),
      note: note.trim() || undefined,
      category,
      color,
      icon,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#1e1f22] border border-gray-700 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-[#2b2d31]/50">
          <div className="flex items-center space-x-2">
            <span
              className="w-3.5 h-3.5 rounded-full inline-block"
              style={{ backgroundColor: color }}
            />
            <h3 className="text-lg font-bold text-white">
              {initialMarker ? 'マーカーを編集' : 'マーカーを配置'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-700 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* 対象メッセージのプレビュー */}
        {targetMessage && (
          <div className="px-6 py-3 bg-[#18191c] border-b border-gray-800 text-xs text-gray-400">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-gray-300">
                #{targetMessage.index + 1} {targetMessage.message.name}
              </span>
              <span>{new Date(targetMessage.message.createdAt).toLocaleTimeString()}</span>
            </div>
            <p className="line-clamp-2 text-gray-300 bg-black/30 p-2 rounded">
              {targetMessage.message.text || targetMessage.message.extend?.roll?.result || '(メッセージ本文なし)'}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* タイトル */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              マーカー名 / 見出し <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 第1章 旅立ち、戦闘開始、手がかり発見..."
              className="w-full bg-[#141517] border border-gray-700 rounded-lg px-3.5 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
              autoFocus
              required
            />
          </div>

          {/* カテゴリ */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              カテゴリ
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => handleCategoryChange(cat.key)}
                  className={`px-2.5 py-1.5 text-xs rounded-lg border font-medium transition text-center ${
                    category === cat.key
                      ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm'
                      : 'bg-[#18191c] border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* カラー & アイコン */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                ピンカラー
              </label>
              <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition transform hover:scale-110 ${
                      color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1e1f22] scale-105' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                アイコン
              </label>
              <div className="flex items-center space-x-1 flex-wrap gap-y-1">
                {ICONS.map(({ key, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIcon(key)}
                    className={`p-1.5 rounded-lg border transition ${
                      icon === key
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-[#18191c] border-gray-700 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <Icon size={16} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* メモ */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              メモ・詳細 (任意)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="状況の要約や備忘録、関連するNPCの名前など..."
              rows={3}
              className="w-full bg-[#141517] border border-gray-700 rounded-lg px-3.5 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm resize-none"
            />
          </div>

          {/* ボタン */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md transition"
            >
              {initialMarker ? '更新する' : 'マーカーを配置'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
