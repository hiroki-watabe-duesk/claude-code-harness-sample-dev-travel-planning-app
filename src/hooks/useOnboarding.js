import { useCallback, useState } from 'react';
import { ONBOARDING_KEY, readJSON, writeJSON } from '../lib/storage.js';

// 初回訪問時のみオンボーディング案内を自動表示するフック。
// 「見終えた」フラグだけを localStorage に保持する（プランや入力状態には触れない）。
// これによりスプリント1の「リロードで初期状態のトップ画面に戻る」を壊さず、
// 案内の表示/非表示の判断だけが永続化される。
export function useOnboarding() {
  const [seen, setSeen] = useState(() => readJSON(ONBOARDING_KEY, false) === true);
  // 初回訪問（未読）のときだけ自動表示する。明示的に開いた場合は seen と独立に制御する。
  const [open, setOpen] = useState(() => readJSON(ONBOARDING_KEY, false) !== true);

  const dismiss = useCallback(() => {
    setOpen(false);
    setSeen(true);
    writeJSON(ONBOARDING_KEY, true);
  }, []);

  const reopen = useCallback(() => {
    setOpen(true);
  }, []);

  return { open, seen, dismiss, reopen };
}
