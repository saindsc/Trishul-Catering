import { useEffect, useState } from 'react';

export const MENU_SELECTION_STORAGE_KEY = 'trishul-menu-selection';

export function readMenuSelection(storage = globalThis.localStorage) {
  if (!storage) return [];
  try {
    const ids = JSON.parse(storage.getItem(MENU_SELECTION_STORAGE_KEY) || '[]');
    return Array.isArray(ids) ? [...new Set(ids.filter(id => typeof id === 'string'))] : [];
  } catch {
    return [];
  }
}

function writeMenuSelection(ids, storage = globalThis.localStorage) {
  try {
    storage?.setItem(MENU_SELECTION_STORAGE_KEY, JSON.stringify(ids));
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('trishul:menu-selection', { detail: ids }));
  } catch {
    return;
  }
}

export function useMenuSelection() {
  const [selectedIds, setSelectedIds] = useState(() => readMenuSelection());

  useEffect(() => {
    writeMenuSelection(selectedIds);
  }, [selectedIds]);

  useEffect(() => {
    const syncFromStorage = event => {
      if (event.type === 'storage' && event.key !== MENU_SELECTION_STORAGE_KEY) return;
      const nextIds = event.type === 'trishul:menu-selection' && Array.isArray(event.detail) ? event.detail : readMenuSelection();
      setSelectedIds(current => current.length === nextIds.length && current.every((id, index) => id === nextIds[index]) ? current : nextIds);
    };
    window.addEventListener('storage', syncFromStorage);
    window.addEventListener('trishul:menu-selection', syncFromStorage);
    return () => {
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener('trishul:menu-selection', syncFromStorage);
    };
  }, []);

  return { selectedIds, setSelectedIds };
}