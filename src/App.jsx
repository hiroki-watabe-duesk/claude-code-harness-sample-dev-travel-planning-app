import { useEffect, useState } from 'react';
import PlanForm from './components/PlanForm.jsx';
import LoadingState from './components/LoadingState.jsx';
import PlanResult from './components/PlanResult.jsx';
import FavoritesPanel from './components/FavoritesPanel.jsx';
import SavedPlansPanel from './components/SavedPlansPanel.jsx';
import Onboarding from './components/Onboarding.jsx';
import { useFavorites } from './hooks/useFavorites.js';
import { useSavedPlans, defaultPlanName } from './hooks/useSavedPlans.js';
import { usePackingChecks } from './hooks/usePackingChecks.js';
import { useOnboarding } from './hooks/useOnboarding.js';

const INITIAL_CONDITIONS = {
  destination: '',
  nights: 1,
  people: 2,
  theme: 'standard',
};

// 構造化データを編集可能な内部状態へ変換する。
// 各スポットに安定した uid を振り、削除・並べ替え時に React の key が破綻しないようにする。
function toEditableDays(structuredDays) {
  if (!Array.isArray(structuredDays)) return [];
  return structuredDays.map((d) => ({
    day: d.day,
    spots: Array.isArray(d.spots)
      ? d.spots.map((s, j) => ({ ...s, uid: `${d.day}-${j}-${s.name || j}` }))
      : [],
  }));
}

export default function App() {
  const [conditions, setConditions] = useState(INITIAL_CONDITIONS);
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [plan, setPlan] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // 生成結果を編集可能なローカル状態として保持する（スプリント5）。
  // 保存（スプリント6）はこの編集後の状態を取り込むため、App で一元管理する。
  const [editableDays, setEditableDays] = useState([]);

  const favorites = useFavorites();
  const savedPlans = useSavedPlans();
  const packingChecks = usePackingChecks();
  const onboarding = useOnboarding();

  // 現在画面に表示しているプランが、どの保存済みプランに由来するか（一覧で「表示中」を示す）。
  const [currentPlanId, setCurrentPlanId] = useState(null);
  const [notice, setNotice] = useState('');

  // plan が変わったとき（新規生成・再生成・保存プラン読み込み）のみ編集状態をリセットする。
  useEffect(() => {
    setEditableDays(toEditableDays(plan ? plan.structuredDays : null));
  }, [plan]);

  function updateConditions(patch) {
    setConditions((prev) => ({ ...prev, ...patch }));
  }

  // オンボーディングの入力例を選ぶと、フォームへ条件を反映する（自動生成はしない）。
  function handleTrySample(sample) {
    setConditions((prev) => ({ ...prev, ...sample }));
  }

  async function handleGenerate() {
    const trimmed = conditions.destination.trim();
    if (!trimmed) {
      setErrorMessage('行き先を入力してください。');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage('');
    setNotice('');
    setPlan(null);
    setCurrentPlanId(null);

    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          destination: trimmed,
          nights: conditions.nights,
          people: conditions.people,
          theme: conditions.theme,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'プランの生成に失敗しました。');
      }

      const data = await res.json();
      setPlan(data);
      setStatus('done');
    } catch (err) {
      setErrorMessage(err.message || 'プランの生成に失敗しました。');
      setStatus('error');
    }
  }

  // 現在画面に表示しているプランを、編集後の状態（並び順・削除）を含むスナップショットへ変換する。
  function snapshotCurrentPlan() {
    // editableDays は uid を含むが、構造化データとして再表示するため structuredDays 形式へ戻す。
    const structuredDays = editableDays.map((d, index) => ({
      day: index + 1,
      spots: d.spots.map(({ uid, ...rest }) => rest),
    }));
    return {
      ...plan,
      structuredDays,
      days: structuredDays.length,
    };
  }

  // 現在のプランを新しい保存プランとして一覧に追加する（スプリント7: 複数プラン管理）。
  function handleSavePlan() {
    if (!plan) return;
    const snapshot = snapshotCurrentPlan();
    const suggested = defaultPlanName(snapshot);
    let name = suggested;
    if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
      const input = window.prompt('保存するプランの名前を入力してください', suggested);
      if (input === null) return; // キャンセル
      name = input.trim() || suggested;
    }
    const entry = savedPlans.addPlan(snapshot, name);
    setCurrentPlanId(entry.id);
    setNotice(
      `プラン「${entry.name}」を保存しました。「保存済みプラン」一覧から開く・名前変更・削除ができます。`,
    );
  }

  // 一覧から保存済みプランを開いて再表示する（保存時点の並び順・削除状態を反映）。
  function handleOpenPlan(id) {
    const saved = savedPlans.getPlan(id);
    if (!saved) {
      setNotice('保存済みのプランが見つかりませんでした。');
      return;
    }
    setErrorMessage('');
    setStatus('done');
    setPlan(saved);
    setCurrentPlanId(id);
    setConditions((prev) => ({
      ...prev,
      destination: saved.destination || prev.destination,
      nights: typeof saved.nights === 'number' ? saved.nights : prev.nights,
      people: typeof saved.people === 'number' ? saved.people : prev.people,
      theme: saved.theme || prev.theme,
    }));
    setNotice(`プラン「${saved.name}」を開きました（保存時点の編集内容を反映しています）。`);
  }

  function handleRenamePlan(id, name) {
    savedPlans.renamePlan(id, name);
    setNotice(`プラン名を「${name}」に変更しました。`);
  }

  function handleDeletePlan(id) {
    const target = savedPlans.getPlan(id);
    savedPlans.deletePlan(id);
    if (id === currentPlanId) setCurrentPlanId(null);
    setNotice(`プラン「${target ? target.name : ''}」を削除しました。`);
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">✈️</span>
          <div>
            <h1 className="brand__title">たびナビ</h1>
            <p className="brand__subtitle">行き先を入れるだけ、AIがあなたの旅をプランニング</p>
          </div>
        </div>
        <button
          type="button"
          className="app__help"
          data-testid="open-onboarding"
          onClick={onboarding.reopen}
        >
          <span aria-hidden="true">❓</span> 使い方
        </button>
      </header>

      <main className="app__main">
        <PlanForm
          destination={conditions.destination}
          nights={conditions.nights}
          people={conditions.people}
          theme={conditions.theme}
          onChange={updateConditions}
          onSubmit={handleGenerate}
          disabled={status === 'loading'}
        />

        {notice && (
          <div className="notice" role="status" data-testid="notice">
            {notice}
          </div>
        )}

        <SavedPlansPanel
          plans={savedPlans.plans}
          currentPlanId={currentPlanId}
          onOpen={handleOpenPlan}
          onRename={handleRenamePlan}
          onDelete={handleDeletePlan}
        />

        <FavoritesPanel
          favorites={favorites.favorites}
          onRemove={favorites.removeFavorite}
          onClear={favorites.clearFavorites}
        />

        {status === 'error' && errorMessage && (
          <div className="alert" role="alert">
            {errorMessage}
          </div>
        )}

        {status === 'loading' && <LoadingState destination={conditions.destination} />}

        {status === 'done' && plan && (
          <PlanResult
            plan={plan}
            editableDays={editableDays}
            setEditableDays={setEditableDays}
            onRegenerate={handleGenerate}
            regenerating={status === 'loading'}
            onSave={handleSavePlan}
            favorites={favorites}
            packingChecks={packingChecks}
          />
        )}
      </main>

      <footer className="app__footer">
        <p>たびナビ — 国内旅行のためのAIプランナー（サンプル）</p>
      </footer>

      {onboarding.open && (
        <Onboarding onClose={onboarding.dismiss} onTrySample={handleTrySample} />
      )}
    </div>
  );
}
