import React from 'react';
import { RollData, DiceItem } from '../types/ccfolia';
import { Sparkles, Skull, CheckCircle2, XCircle, Dices } from 'lucide-react';

interface DiceRollViewProps {
  roll: RollData;
  commandText?: string;
}

export const DiceRollView: React.FC<DiceRollViewProps> = ({ roll, commandText }) => {
  const isCritical = roll.critical;
  const isFumble = roll.fumble;
  const isSuccess = roll.success;
  const isFailure = roll.failure;

  // 出目の視覚化
  const renderDice = (dice: DiceItem, index: number) => {
    return (
      <span
        key={index}
        className={`inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-bold rounded shadow-inner ${
          isCritical
            ? 'bg-amber-400 text-amber-950 ring-1 ring-amber-300'
            : isFumble
            ? 'bg-rose-500 text-white ring-1 ring-rose-400'
            : 'bg-[#18191c] text-indigo-300 border border-indigo-900/50'
        }`}
        title={`出目: ${dice.value} (D${dice.faces})`}
      >
        {dice.value}
      </span>
    );
  };

  return (
    <div
      className={`mt-2 p-3 rounded-lg border text-sm transition-all ${
        isCritical
          ? 'bg-amber-950/20 border-amber-500/50 critical-glow'
          : isFumble
          ? 'bg-rose-950/20 border-rose-500/50 fumble-glow'
          : isSuccess
          ? 'bg-emerald-950/15 border-emerald-500/30'
          : isFailure
          ? 'bg-rose-950/10 border-rose-500/20'
          : 'bg-[#18191c]/80 border-gray-800'
      }`}
    >
      {/* ステータスバッジ */}
      <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
        <div className="flex items-center space-x-1.5 text-xs font-semibold">
          <Dices size={14} className="text-gray-400" />
          <span className="text-gray-400 font-mono">{commandText}</span>
        </div>

        <div className="flex items-center space-x-1.5">
          {isCritical && (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 shadow-md">
              <Sparkles size={13} className="animate-spin text-amber-950" />
              <span>CRITICAL</span>
            </span>
          )}
          {isFumble && (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-gradient-to-r from-rose-600 to-red-500 text-white shadow-md">
              <Skull size={13} />
              <span>FUMBLE</span>
            </span>
          )}
          {isSuccess && !isCritical && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
              <CheckCircle2 size={12} />
              <span>成功</span>
            </span>
          )}
          {isFailure && !isFumble && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-900/40 text-rose-300 border border-rose-800/50">
              <XCircle size={12} />
              <span>失敗</span>
            </span>
          )}
          {roll.secret && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-900/50 text-purple-300 border border-purple-700">
              SECRET
            </span>
          )}
        </div>
      </div>

      {/* ダイスの目 */}
      {roll.dices && roll.dices.length > 0 && (
        <div className="flex items-center space-x-1.5 my-2 flex-wrap gap-y-1">
          <span className="text-[11px] text-gray-500">ダイス目:</span>
          {roll.dices.map((d, i) => renderDice(d, i))}
        </div>
      )}

      {/* 結果テキスト */}
      {roll.result && (
        <div className="font-mono text-sm leading-relaxed text-gray-200 break-words font-medium">
          {roll.result}
        </div>
      )}
    </div>
  );
};
