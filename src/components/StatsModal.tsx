import React from 'react';
import { LogStatistics, formatDateTime } from '../utils/parser';
import { X, BarChart2, Dices, Sparkles, Skull, Users, MessageSquare, Clock } from 'lucide-react';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: LogStatistics;
}

export const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, stats }) => {
  if (!isOpen) return null;

  const critRate = stats.totalDiceRolls > 0
    ? ((stats.criticals / stats.totalDiceRolls) * 100).toFixed(1)
    : '0';
  const fumbleRate = stats.totalDiceRolls > 0
    ? ((stats.fumbles / stats.totalDiceRolls) * 100).toFixed(1)
    : '0';

  const maxCharCount = Math.max(...stats.characters.map((c) => c.count), 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#1e1f22] border border-gray-700 w-full max-w-2xl max-h-[85vh] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-[#2b2d31]/50">
          <div className="flex items-center space-x-2">
            <BarChart2 size={20} className="text-indigo-400" />
            <h3 className="text-lg font-bold text-white">セッション統計サマリー</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-700 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* 日時スパン */}
          <div className="p-3.5 rounded-lg bg-[#141517] border border-gray-800 flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center space-x-2">
              <Clock size={15} className="text-gray-500" />
              <span>セッション期間:</span>
            </div>
            <div className="font-mono text-gray-300">
              {formatDateTime(stats.dateRange.start)} 〜 {formatDateTime(stats.dateRange.end)}
            </div>
          </div>

          {/* 主要KPIカード */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-[#141517] border border-gray-800">
              <div className="flex items-center space-x-1.5 text-xs text-gray-400 mb-1">
                <MessageSquare size={13} className="text-indigo-400" />
                <span>総発言数</span>
              </div>
              <div className="text-xl font-black text-white font-mono">
                {stats.totalMessages.toLocaleString()}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                本文 {stats.totalTextMessages} / システム {stats.totalSystemMessages}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#141517] border border-gray-800">
              <div className="flex items-center space-x-1.5 text-xs text-gray-400 mb-1">
                <Dices size={13} className="text-sky-400" />
                <span>ダイスロール</span>
              </div>
              <div className="text-xl font-black text-white font-mono">
                {stats.totalDiceRolls.toLocaleString()}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                成功 {stats.successes} / 失敗 {stats.failures}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#141517] border border-amber-900/40 bg-amber-950/10">
              <div className="flex items-center space-x-1.5 text-xs text-amber-400 mb-1">
                <Sparkles size={13} />
                <span>クリティカル</span>
              </div>
              <div className="text-xl font-black text-amber-300 font-mono">
                {stats.criticals}
              </div>
              <div className="text-[10px] text-amber-500/80 mt-0.5">
                確率 {critRate}%
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#141517] border border-rose-900/40 bg-rose-950/10">
              <div className="flex items-center space-x-1.5 text-xs text-rose-400 mb-1">
                <Skull size={13} />
                <span>ファンブル</span>
              </div>
              <div className="text-xl font-black text-rose-300 font-mono">
                {stats.fumbles}
              </div>
              <div className="text-[10px] text-rose-500/80 mt-0.5">
                確率 {fumbleRate}%
              </div>
            </div>
          </div>

          {/* 発言者ランキング & 割合 */}
          <div>
            <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
              <Users size={14} className="text-indigo-400" />
              <span>発言者別ランキング (Top 10)</span>
            </h4>
            <div className="space-y-2">
              {stats.characters.slice(0, 10).map((char, index) => {
                const percent = ((char.count / stats.totalMessages) * 100).toFixed(1);
                const barWidth = `${(char.count / maxCharCount) * 100}%`;

                return (
                  <div key={char.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-gray-500 font-mono w-4 text-right">
                          {index + 1}.
                        </span>
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: char.color || '#9ca3af' }}
                        />
                        <span className="font-medium text-gray-200 truncate">
                          {char.name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] font-mono text-gray-400">
                        <span>{char.count} 件</span>
                        <span className="text-gray-500">({percent}%)</span>
                      </div>
                    </div>
                    {/* プログレスバー */}
                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: barWidth,
                          backgroundColor: char.color || '#6366f1',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
