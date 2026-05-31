import { useCallback, useEffect, useState } from 'react';
import {
  SAVED_PLAN_KEY,
  SAVED_PLANS_KEY,
  readJSON,
  removeKey,
  writeJSON,
} from '../lib/storage.js';

// 複数の保存済みプランをブラウザ内（localStorage）で管理するフック（スプリント7）。
// 各エントリは { id, name, savedAt, ...planSnapshot } の形。
// planSnapshot は plan のメタ（destination/nights/days/people/theme/themeLabel/mode/planText）と
// 編集後の structuredDays を含む（スプリント6の保存スナップショットと同形）。

function makeId() {
  return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// 保存スナップショットから一覧表示用の既定名（行き先 + 泊数）を組み立てる。
export function defaultPlanName(snapshot) {
  const dest = (snapshot && snapshot.destination ? String(snapshot.destination) : '').trim();
  const base = dest || 'プラン';
  const nights = snapshot && typeof snapshot.nights === 'number' ? snapshot.nights : null;
  if (nights == null) return base;
  return nights === 0 ? `${base}（日帰り）` : `${base}（${nights}泊）`;
}

// スプリント6の単一保存プランが残っていれば、スプリント7の配列へ一度だけ取り込む。
// 取り込み後は旧キーを削除し、二重表示や再移行を防ぐ。
function migrateLegacy(list) {
  const legacy = readJSON(SAVED_PLAN_KEY, null);
  if (!legacy) return { list, migrated: false };
  const entry = {
    id: makeId(),
    name: defaultPlanName(legacy),
    savedAt: typeof legacy.savedAt === 'number' ? legacy.savedAt : Date.now(),
    ...legacy,
  };
  removeKey(SAVED_PLAN_KEY);
  return { list: [entry, ...list], migrated: true };
}

export function useSavedPlans() {
  const [plans, setPlans] = useState(() => {
    const stored = readJSON(SAVED_PLANS_KEY, []);
    const base = Array.isArray(stored) ? stored : [];
    const { list } = migrateLegacy(base);
    return list;
  });

  // plans が変わるたびに localStorage へ同期する。
  // 初回マウント時にも書き出すため、移行（旧単一スロット→配列）の結果も確実に永続化される。
  useEffect(() => {
    writeJSON(SAVED_PLANS_KEY, plans);
  }, [plans]);

  // 新しいプランを保存（一覧の先頭に追加）。追加したエントリを返す。
  const addPlan = useCallback((snapshot, name) => {
    const entry = {
      id: makeId(),
      name: (name && String(name).trim()) || defaultPlanName(snapshot),
      savedAt: Date.now(),
      ...snapshot,
    };
    setPlans((prev) => [entry, ...prev]);
    return entry;
  }, []);

  const renamePlan = useCallback((id, name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, name: trimmed } : p)));
  }, []);

  const deletePlan = useCallback((id) => {
    setPlans((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const getPlan = useCallback((id) => plans.find((p) => p.id === id) || null, [plans]);

  return { plans, addPlan, renamePlan, deletePlan, getPlan };
}
