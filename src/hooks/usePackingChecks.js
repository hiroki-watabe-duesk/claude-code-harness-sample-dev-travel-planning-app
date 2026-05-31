import { useCallback, useEffect, useState } from 'react';
import { PACKING_CHECKS_KEY, readJSON, writeJSON } from '../lib/storage.js';

// 持ち物・準備リストのチェック状態をブラウザ内（localStorage）に保持するフック（スプリント9 / 機能15）。
// チェック状態は「行き先＋テーマ」をスコープとしたマップで保持する。
// 行き先・テーマが変わるとリストの項目も変わるため、スコープごとに独立して覚えておく。
//
// 形: { [scopeKey]: { [itemId]: true } }

function packingScopeKey(destination, theme) {
  return `${(destination || '').trim()}::${(theme || 'standard').trim()}`;
}

export function usePackingChecks() {
  const [checksByScope, setChecksByScope] = useState(() => {
    const stored = readJSON(PACKING_CHECKS_KEY, {});
    return stored && typeof stored === 'object' ? stored : {};
  });

  useEffect(() => {
    writeJSON(PACKING_CHECKS_KEY, checksByScope);
  }, [checksByScope]);

  const isChecked = useCallback(
    (destination, theme, itemId) => {
      const scope = checksByScope[packingScopeKey(destination, theme)];
      return Boolean(scope && scope[itemId]);
    },
    [checksByScope],
  );

  const toggleCheck = useCallback((destination, theme, itemId) => {
    const key = packingScopeKey(destination, theme);
    setChecksByScope((prev) => {
      const scope = { ...(prev[key] || {}) };
      if (scope[itemId]) {
        delete scope[itemId];
      } else {
        scope[itemId] = true;
      }
      return { ...prev, [key]: scope };
    });
  }, []);

  const clearScope = useCallback((destination, theme) => {
    const key = packingScopeKey(destination, theme);
    setChecksByScope((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      next[key] = {};
      return next;
    });
  }, []);

  const countChecked = useCallback(
    (destination, theme) => {
      const scope = checksByScope[packingScopeKey(destination, theme)];
      return scope ? Object.values(scope).filter(Boolean).length : 0;
    },
    [checksByScope],
  );

  return { isChecked, toggleCheck, clearScope, countChecked };
}
