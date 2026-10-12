import { CcfoliaLogData, CcfoliaMessage, Marker } from '../types/ccfolia';

export function parseCcfoliaLog(rawJson: unknown): CcfoliaLogData {
  if (!rawJson || typeof rawJson !== 'object') {
    throw new Error('無効なJSONフォーマットです。');
  }

  const obj = rawJson as Record<string, any>;

  // 通常の { messages: [...], images: {...} } 形式
  if (Array.isArray(obj.messages)) {
    return {
      messages: obj.messages.map((m, idx) => ({
        ...m,
        id: m.id || `msg-${idx}-${m.createdAt || Date.now()}`,
      })),
      images: obj.images || {},
    };
  }

  // もしメッセージ配列だけが直に渡された場合
  if (Array.isArray(rawJson)) {
    return {
      messages: rawJson.map((m, idx) => ({
        ...m,
        id: m.id || `msg-${idx}-${m.createdAt || Date.now()}`,
      })),
      images: {},
    };
  }

  throw new Error('ココフォリアのログメッセージが見つかりません。');
}

export function formatDate(timestamp: number): string {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

export function formatTime(timestamp: number): string {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function formatDateTime(timestamp: number): string {
  if (!timestamp) return '';
  return `${formatDate(timestamp)} ${formatTime(timestamp)}`;
}

export interface LogStatistics {
  totalMessages: number;
  totalTextMessages: number;
  totalSystemMessages: number;
  totalDiceRolls: number;
  criticals: number;
  fumbles: number;
  successes: number;
  failures: number;
  characters: { name: string; count: number; color?: string; icon?: string | null }[];
  channels: { id: string; name: string; count: number }[];
  dateRange: { start: number; end: number };
}

export function calculateStatistics(logData: CcfoliaLogData): LogStatistics {
  const { messages } = logData;
  let totalDiceRolls = 0;
  let criticals = 0;
  let fumbles = 0;
  let successes = 0;
  let failures = 0;
  let totalSystemMessages = 0;
  let totalTextMessages = 0;

  const charMap = new Map<string, { count: number; color?: string; icon?: string | null }>();
  const chanMap = new Map<string, { name: string; count: number }>();

  let minTime = Infinity;
  let maxTime = -Infinity;

  messages.forEach((m) => {
    if (m.createdAt) {
      if (m.createdAt < minTime) minTime = m.createdAt;
      if (m.createdAt > maxTime) maxTime = m.createdAt;
    }

    if (m.type === 'system') {
      totalSystemMessages++;
    } else {
      totalTextMessages++;
    }

    // キャラクター別集計
    const name = m.name || '名称未設定';
    if (!charMap.has(name)) {
      charMap.set(name, { count: 0, color: m.color, icon: m.iconImage });
    }
    const charEntry = charMap.get(name)!;
    charEntry.count++;
    if (!charEntry.icon && m.iconImage) charEntry.icon = m.iconImage;
    if (!charEntry.color && m.color) charEntry.color = m.color;

    // チャンネル別集計
    const chId = m.channel || 'default';
    const chName = m.channelName || m.channel || 'デフォルト';
    if (!chanMap.has(chId)) {
      chanMap.set(chId, { name: chName, count: 0 });
    }
    chanMap.get(chId)!.count++;

    // ダイスロール集計
    const roll = m.extend?.roll;
    if (roll) {
      totalDiceRolls++;
      if (roll.critical) criticals++;
      if (roll.fumble) fumbles++;
      if (roll.success) successes++;
      if (roll.failure) failures++;
    }
  });

  const characters = Array.from(charMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count);

  const channels = Array.from(chanMap.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.count - a.count);

  return {
    totalMessages: messages.length,
    totalTextMessages,
    totalSystemMessages,
    totalDiceRolls,
    criticals,
    fumbles,
    successes,
    failures,
    characters,
    channels,
    dateRange: {
      start: minTime === Infinity ? Date.now() : minTime,
      end: maxTime === -Infinity ? Date.now() : maxTime,
    },
  };
}

/**
 * ログからチャプター名、日付変更、クリティカル/ファンブルなどの候補マーカーを自動検出
 */
export function detectAutoMarkers(logData: CcfoliaLogData): Marker[] {
  const detected: Marker[] = [];
  const { messages } = logData;

  const chapterRegex = /(チャプター|第\s*[0-9一二三四五六七八九十]+\s*(章|幕|話)|chapter|Scene\s*[0-9]+|オープニング|エンディング|クライマックス|戦闘開始)/i;

  let lastDateStr = '';

  messages.forEach((m, idx) => {
    const time = m.createdAt || Date.now();
    const dateStr = formatDate(time);

    // 日付の変わり目
    if (lastDateStr && dateStr && dateStr !== lastDateStr) {
      detected.push({
        id: `auto-date-${idx}`,
        targetMessageIndex: idx,
        targetMessageTime: time,
        title: `📅 ${dateStr} 日付変更`,
        note: `セッション日の切り替わり`,
        category: 'memo',
        color: '#6366f1',
        icon: 'calendar',
        createdAt: time,
      });
    }
    lastDateStr = dateStr;

    // キャラクター名またはテキストに「チャプター」等のキーワードがある場合
    const isNameChapter = chapterRegex.test(m.name || '');
    const isTextChapter = chapterRegex.test(m.text || '');

    if (isNameChapter || (m.type === 'system' && isTextChapter)) {
      detected.push({
        id: `auto-ch-${idx}`,
        targetMessageIndex: idx,
        targetMessageTime: time,
        title: isNameChapter ? `🔖 ${m.name}` : `🔖 ${m.text.slice(0, 30)}`,
        note: isNameChapter ? m.text : undefined,
        category: 'chapter',
        color: '#8b5cf6',
        icon: 'bookmark',
        createdAt: time,
      });
    }

    // クリティカル
    if (m.extend?.roll?.critical) {
      detected.push({
        id: `auto-crit-${idx}`,
        targetMessageIndex: idx,
        targetMessageTime: time,
        title: `✨ クリティカル (${m.name})`,
        note: m.extend.roll.result || m.text,
        category: 'critical',
        color: '#eab308',
        icon: 'sparkles',
        createdAt: time,
      });
    }

    // ファンブル
    if (m.extend?.roll?.fumble) {
      detected.push({
        id: `auto-fumble-${idx}`,
        targetMessageIndex: idx,
        targetMessageTime: time,
        title: `💀 ファンブル (${m.name})`,
        note: m.extend.roll.result || m.text,
        category: 'battle',
        color: '#ef4444',
        icon: 'skull',
        createdAt: time,
      });
    }
  });

  return detected;
}
