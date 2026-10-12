import { Marker } from '../types/ccfolia';

const STORAGE_PREFIX = 'ccfolia_markers_';

export function getMarkersStorageKey(sessionKey: string): string {
  return `${STORAGE_PREFIX}${sessionKey}`;
}

export function loadMarkers(sessionKey: string): Marker[] {
  try {
    const raw = localStorage.getItem(getMarkersStorageKey(sessionKey));
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load markers:', e);
    return [];
  }
}

export function saveMarkers(sessionKey: string, markers: Marker[]): void {
  try {
    localStorage.setItem(getMarkersStorageKey(sessionKey), JSON.stringify(markers));
  } catch (e) {
    console.error('Failed to save markers:', e);
  }
}

export function exportMarkersJson(sessionKey: string, markers: Marker[]): void {
  const jsonStr = JSON.stringify(markers, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `markers_${sessionKey}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importMarkersJson(file: File): Promise<Marker[]> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error('インポートファイルの形式が配列ではありません。');
  }
  return parsed as Marker[];
}
