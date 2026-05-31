// ブラウザ内（localStorage）への永続化ヘルパー。
// 仕様により DB・認証を持たないため、お気に入りと保存プランはここで完結させる。
// localStorage が使えない環境（プライベートモード等）でも例外で落ちないよう握りつぶす。

export const FAVORITES_KEY = 'tabinavi.favorites.v1';
// スプリント6: 単一スロットの保存プラン（後方互換・移行元として残す）。
export const SAVED_PLAN_KEY = 'tabinavi.savedPlan.v1';
// スプリント7: 複数プランの保存（配列）。
export const SAVED_PLANS_KEY = 'tabinavi.savedPlans.v1';
// スプリント9: 持ち物・準備リストのチェック状態（行き先＋テーマ単位のマップ）。
export const PACKING_CHECKS_KEY = 'tabinavi.packingChecks.v1';
// スプリント10: オンボーディング案内を見終えたか（初回のみ自動表示）。
export const ONBOARDING_KEY = 'tabinavi.onboardingSeen.v1';

export function readJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key) {
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
