export interface DiceItem {
  faces: number;
  value: number;
  kind?: string;
}

export interface RollData {
  result?: string;
  dices?: DiceItem[];
  secret?: boolean;
  success?: boolean;
  failure?: boolean;
  critical?: boolean;
  fumble?: boolean;
}

export interface MessageExtend {
  roll?: RollData;
  [key: string]: any;
}

export interface CcfoliaMessage {
  id?: string; // 生成される一意のID
  name: string;
  color?: string;
  text: string;
  type: 'text' | 'system' | string;
  extend?: MessageExtend;
  edited?: boolean;
  channel?: string;
  channelName?: string;
  createdAt: number;
  updatedAt?: number;
  iconImage?: string | null;
}

export interface CcfoliaLogData {
  messages: CcfoliaMessage[];
  images?: Record<string, string>;
}

export interface Marker {
  id: string;
  targetMessageIndex: number; // メッセージのインデックス
  targetMessageTime: number;  // メッセージの作成時刻 (createdAt)
  title: string;
  note?: string;
  category: 'chapter' | 'battle' | 'critical' | 'clue' | 'important' | 'memo' | 'custom';
  color: string;
  icon?: string;
  createdAt: number;
}

export interface FilterState {
  searchQuery: string;
  channels: string[]; // 選択されたチャンネル名/ID（空ならすべて）
  characters: string[]; // 選択されたキャラクター名（空ならすべて）
  showSystem: boolean;
  showDiceOnly: boolean;
  showCritFumbleOnly: boolean;
  hasMarkersOnly: boolean;
  dateRange?: [string, string]; // 'YYYY-MM-DD'
}
