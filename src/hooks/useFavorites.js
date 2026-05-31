import { useCallback, useEffect, useState } from 'react';
import { FAVORITES_KEY, readJSON, writeJSON } from '../lib/storage.js';

// お気に入りスポットをブラウザ内（localStorage）に保持するフック。
// お気に入りは「どのプランに属していたスポットか」を残したいので、
// 行き先・スポット名・概要などのスナップショットを丸ごと保存する。
// 一意キーは行き先＋スポット名で安定させる（同名スポットを同一視）。

export function favoriteKey(destination, spotName) {
  return `${(destination || '').trim()}::${(spotName || '').trim()}`;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState(() => {
    const stored = readJSON(FAVORITES_KEY, []);
    return Array.isArray(stored) ? stored : [];
  });

  useEffect(() => {
    writeJSON(FAVORITES_KEY, favorites);
  }, [favorites]);

  const isFavorite = useCallback(
    (destination, spotName) => {
      const key = favoriteKey(destination, spotName);
      return favorites.some((f) => f.key === key);
    },
    [favorites],
  );

  const toggleFavorite = useCallback((entry) => {
    const key = favoriteKey(entry.destination, entry.name);
    setFavorites((prev) => {
      if (prev.some((f) => f.key === key)) {
        return prev.filter((f) => f.key !== key);
      }
      const record = {
        key,
        destination: entry.destination || '',
        name: entry.name || '',
        description: entry.description || '',
        time: entry.time || '',
        tags: Array.isArray(entry.tags) ? entry.tags : [],
        savedAt: Date.now(),
      };
      return [...prev, record];
    });
  }, []);

  const removeFavorite = useCallback((key) => {
    setFavorites((prev) => prev.filter((f) => f.key !== key));
  }, []);

  const clearFavorites = useCallback(() => setFavorites([]), []);

  return { favorites, isFavorite, toggleFavorite, removeFavorite, clearFavorites };
}
