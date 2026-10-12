import React from 'react';
import { FilterState } from '../types/ccfolia';
import { LogStatistics } from '../utils/parser';
import {
  Search,
  Filter,
  Users,
  Dices,
  Sparkles,
  Activity,
  Bookmark,
  RotateCcw,
  SlidersHorizontal
} from 'lucide-react';

interface FilterBarProps {
  filters: FilterState;
  onChangeFilters: (filters: FilterState) => void;
  stats?: LogStatistics;
  filteredCount: number;
  totalCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChangeFilters,
  stats,
  filteredCount,
  totalCount,
}) => {
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const handleSearchChange = (query: string) => {
    onChangeFilters({ ...filters, searchQuery: query });
  };

  const handleChannelToggle = (channelId: string) => {
    const isSelected = filters.channels.includes(channelId);
    const newChannels = isSelected
      ? filters.channels.filter((c) => c !== channelId)
      : [...filters.channels, channelId];
    onChangeFilters({ ...filters, channels: newChannels });
  };

  const handleCharacterToggle = (name: string) => {
    const isSelected = filters.characters.includes(name);
    const newCharacters = isSelected
      ? filters.characters.filter((c) => c !== name)
      : [...filters.characters, name];
    onChangeFilters({ ...filters, characters: newCharacters });
  };

  const resetFilters = () => {
    onChangeFilters({
      searchQuery: '',
      channels: [],
      characters: [],
      showSystem: true,
      showDiceOnly: false,
      showCritFumbleOnly: false,
      hasMarkersOnly: false,
    });
  };

  const hasActiveFilters =
    filters.searchQuery !== '' ||
    filters.channels.length > 0 ||
    filters.characters.length > 0 ||
    !filters.showSystem ||
    filters.showDiceOnly ||
    filters.showCritFumbleOnly ||
    filters.hasMarkersOnly;

  return (
    <div className="bg-[#18191c] border-b border-gray-800 p-3 sm:px-6 sticky top-16 z-20 shadow-md">
      <div className="max-w-6xl mx-auto space-y-2.5">
        {/* 上段: 検索バー + クイックトグル */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* 検索入力 */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="発言者名、本文、ダイスコマンドを検索..."
              className="w-full bg-[#141517] border border-gray-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* クイックトグルボタン群 */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs flex-shrink-0">
            {/* システムメッセージ表示切替 */}
            <button
              onClick={() => onChangeFilters({ ...filters, showSystem: !filters.showSystem })}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border transition ${
                filters.showSystem
                  ? 'bg-gray-800/80 border-gray-700 text-gray-300'
                  : 'bg-gray-900 border-gray-800 text-gray-600 line-through'
              }`}
              title="システムログ（ステータス変更等）の表示切替"
            >
              <Activity size={13} />
              <span>システム</span>
            </button>

            {/* ダイスのみ */}
            <button
              onClick={() => onChangeFilters({ ...filters, showDiceOnly: !filters.showDiceOnly })}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border transition ${
                filters.showDiceOnly
                  ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 font-medium'
                  : 'bg-gray-800/80 border-gray-700 text-gray-400 hover:text-gray-200'
              }`}
            >
              <Dices size={13} />
              <span>ダイス</span>
            </button>

            {/* クリティカル/ファンブルのみ */}
            <button
              onClick={() =>
                onChangeFilters({ ...filters, showCritFumbleOnly: !filters.showCritFumbleOnly })
              }
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border transition ${
                filters.showCritFumbleOnly
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-medium'
                  : 'bg-gray-800/80 border-gray-700 text-gray-400 hover:text-gray-200'
              }`}
            >
              <Sparkles size={13} />
              <span>名場面</span>
            </button>

            {/* マーカー付きのみ */}
            <button
              onClick={() =>
                onChangeFilters({ ...filters, hasMarkersOnly: !filters.hasMarkersOnly })
              }
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border transition ${
                filters.hasMarkersOnly
                  ? 'bg-indigo-600 border-indigo-500 text-white font-medium'
                  : 'bg-gray-800/80 border-gray-700 text-gray-400 hover:text-gray-200'
              }`}
            >
              <Bookmark size={13} />
              <span>マーカー</span>
            </button>

            {/* 詳細フィルター開閉 */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border transition ${
                showAdvanced || filters.channels.length > 0 || filters.characters.length > 0
                  ? 'bg-indigo-900/40 border-indigo-500/60 text-indigo-200'
                  : 'bg-gray-800/80 border-gray-700 text-gray-400 hover:text-gray-200'
              }`}
            >
              <SlidersHorizontal size={13} />
              <span>詳細絞込</span>
            </button>

            {/* リセット */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition"
                title="フィルターをリセット"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </div>

        {/* チャンネル（タブ）選択バー */}
        {stats && stats.channels.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] py-1 border-t border-gray-800/60">
            <span className="text-gray-500 font-medium whitespace-nowrap mr-1 flex items-center space-x-1">
              <Filter size={11} />
              <span>タブ:</span>
            </span>
            <button
              onClick={() => onChangeFilters({ ...filters, channels: [] })}
              className={`px-2 py-0.5 rounded-md whitespace-nowrap transition ${
                filters.channels.length === 0
                  ? 'bg-gray-700 text-white font-medium'
                  : 'bg-gray-800/60 text-gray-400 hover:text-gray-200'
              }`}
            >
              すべて ({totalCount})
            </button>
            {stats.channels.map((chan) => {
              const isSelected = filters.channels.includes(chan.id);
              return (
                <button
                  key={chan.id}
                  onClick={() => handleChannelToggle(chan.id)}
                  className={`px-2 py-0.5 rounded-md whitespace-nowrap transition ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-medium shadow-sm'
                      : 'bg-gray-800/60 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {chan.name} ({chan.count})
                </button>
              );
            })}

            <div className="ml-auto text-[11px] text-gray-400 whitespace-nowrap font-mono pl-2">
              {filteredCount} / {totalCount} 件
            </div>
          </div>
        )}

        {/* 詳細フィルターパネル（展開時: キャラクター選択等） */}
        {showAdvanced && stats && stats.characters.length > 0 && (
          <div className="p-3 bg-[#141517] rounded-lg border border-gray-800 text-xs space-y-2 mt-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-300 flex items-center space-x-1.5">
                <Users size={13} />
                <span>発言者 / キャラクターで絞り込み</span>
              </span>
              {filters.characters.length > 0 && (
                <button
                  onClick={() => onChangeFilters({ ...filters, characters: [] })}
                  className="text-xs text-indigo-400 hover:underline"
                >
                  選択解除
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
              {stats.characters.map((char) => {
                const isSelected = filters.characters.includes(char.name);
                return (
                  <button
                    key={char.name}
                    onClick={() => handleCharacterToggle(char.name)}
                    className={`inline-flex items-center space-x-1.5 px-2 py-1 rounded-md text-[11px] border transition ${
                      isSelected
                        ? 'bg-indigo-600/30 border-indigo-500 text-white font-medium'
                        : 'bg-gray-800/60 border-gray-700/60 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: char.color || '#9ca3af' }}
                    />
                    <span>{char.name}</span>
                    <span className="text-[10px] text-gray-500">({char.count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
