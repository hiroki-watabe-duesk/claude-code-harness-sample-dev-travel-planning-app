import { useEffect, useMemo, useRef, useState } from 'react';
import DayTimeline from './DayTimeline.jsx';
import BudgetEstimate from './BudgetEstimate.jsx';
import PackingChecklist from './PackingChecklist.jsx';
import MapPreview from './MapPreview.jsx';
import { buildPlanText, copyToClipboard, downloadText, buildFileName } from '../lib/export.js';

// 構造化データが無い（旧形式 / API フォールバック）場合のテキスト表示。
// スプリント1・2の表示を踏襲し、後方互換を保つ。
function PlanTextBody({ planText }) {
  return (
    <article className="result__body">
      {planText.split('\n').map((line, index) => {
        const text = line.trim();
        if (!text) {
          return <div key={index} className="result__spacer" />;
        }
        if (text.startsWith('◆')) {
          return (
            <p key={index} className="result__day">
              {text}
            </p>
          );
        }
        if (text.startsWith('【') || text.startsWith('■')) {
          return (
            <p key={index} className="result__heading">
              {text}
            </p>
          );
        }
        return (
          <p key={index} className="result__line">
            {text}
          </p>
        );
      })}
    </article>
  );
}

// 日番号と「N日目」見出しを各日のインデックスから再計算する。
// 削除で日が空になっても日番号は連番（1日目・2日目…）を維持する。
function withDayTitles(days) {
  return days.map((d, index) => {
    const dayNum = index + 1;
    return { ...d, day: dayNum, title: `${dayNum}日目` };
  });
}

export default function PlanResult({
  plan,
  editableDays,
  setEditableDays,
  onRegenerate,
  regenerating,
  onSave,
  favorites,
  packingChecks,
}) {
  const durationText = plan.nights === 0 ? '日帰り' : `${plan.nights}泊${plan.days}日`;

  const days = useMemo(() => withDayTitles(editableDays), [editableDays]);
  const hasTimeline = days.length > 0;
  const totalSpots = useMemo(() => days.reduce((sum, d) => sum + d.spots.length, 0), [days]);

  // 表示中の日（タブ切り替え用）。プランが変わったら1日目に戻す。
  const [activeDay, setActiveDay] = useState(1);
  const sectionRefs = useRef({});

  // エクスポート操作のフィードバック（コピー成功などの通知）。
  const [exportMessage, setExportMessage] = useState('');
  const exportTimer = useRef(null);

  useEffect(() => {
    setActiveDay(1);
  }, [plan]);

  useEffect(() => () => {
    if (exportTimer.current) clearTimeout(exportTimer.current);
  }, []);

  function flashExportMessage(text) {
    setExportMessage(text);
    if (exportTimer.current) clearTimeout(exportTimer.current);
    exportTimer.current = setTimeout(() => setExportMessage(''), 4000);
  }

  // 現在表示中のプラン（編集後の並び順・削除を反映）をテキスト化してクリップボードへコピーする。
  async function handleCopy() {
    const text = buildPlanText(plan, days);
    const ok = await copyToClipboard(text);
    flashExportMessage(
      ok
        ? '✅ プラン内容をクリップボードにコピーしました。メモ帳やメールに貼り付けられます。'
        : '⚠️ コピーに失敗しました。下の「ダウンロード」をお試しください。',
    );
  }

  // 現在表示中のプランをテキストファイルとしてダウンロードする。
  function handleDownload() {
    const text = buildPlanText(plan, days);
    downloadText(buildFileName(plan), text);
    flashExportMessage('⬇️ プランをテキストファイルとしてダウンロードしました。');
  }

  // 日タブを押すと、該当日のセクションへスクロールしつつアクティブ表示を更新する。
  function handleSelectDay(dayNum) {
    setActiveDay(dayNum);
    const el = sectionRefs.current[dayNum];
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // スポットを削除する。dayIndex の spotIndex 番目を取り除く。
  function handleDeleteSpot(dayIndex, spotIndex) {
    setEditableDays((prev) =>
      prev.map((d, di) =>
        di === dayIndex ? { ...d, spots: d.spots.filter((_, si) => si !== spotIndex) } : d,
      ),
    );
  }

  // スポットを1つ上へ移動する。
  // 日内の先頭にあるスポットは、前の日が存在すればその日の末尾へ移す（日程間の入れ替え）。
  function handleMoveUp(dayIndex, spotIndex) {
    setEditableDays((prev) => {
      const next = prev.map((d) => ({ ...d, spots: [...d.spots] }));
      if (spotIndex > 0) {
        const arr = next[dayIndex].spots;
        [arr[spotIndex - 1], arr[spotIndex]] = [arr[spotIndex], arr[spotIndex - 1]];
        return next;
      }
      if (dayIndex > 0) {
        const [moved] = next[dayIndex].spots.splice(0, 1);
        next[dayIndex - 1].spots.push(moved);
        return next;
      }
      return prev;
    });
  }

  // スポットを1つ下へ移動する。
  // 日内の末尾にあるスポットは、次の日が存在すればその日の先頭へ移す（日程間の入れ替え）。
  function handleMoveDown(dayIndex, spotIndex) {
    setEditableDays((prev) => {
      const next = prev.map((d) => ({ ...d, spots: [...d.spots] }));
      const arr = next[dayIndex].spots;
      if (spotIndex < arr.length - 1) {
        [arr[spotIndex], arr[spotIndex + 1]] = [arr[spotIndex + 1], arr[spotIndex]];
        return next;
      }
      if (dayIndex < next.length - 1) {
        const [moved] = arr.splice(spotIndex, 1);
        next[dayIndex + 1].spots.unshift(moved);
        return next;
      }
      return prev;
    });
  }

  return (
    <section className="result">
      <div className="result__head">
        <h2 className="result__title">
          <span aria-hidden="true">📍</span> {plan.destination} の旅行プラン
        </h2>
        {plan.mode === 'mock' && (
          <span className="badge" title="ANTHROPIC_API_KEY が未設定のため、サンプル生成ロジックで作成しています。">
            サンプル生成モード
          </span>
        )}
      </div>

      <div className="result__conditions">
        <span className="result__tag">🗓 {durationText}</span>
        <span className="result__tag">👥 {plan.people}名</span>
        <span className="result__tag">🎯 {plan.themeLabel}</span>
        {hasTimeline && (
          <span className="result__tag" data-testid="total-spots">
            🧭 全{totalSpots}スポット
          </span>
        )}
      </div>

      <div className="result__actions">
        {onSave && (
          <button
            type="button"
            className="result__save"
            onClick={onSave}
            data-testid="save-plan"
          >
            💾 このプランを保存
          </button>
        )}
        {onRegenerate && (
          <button
            type="button"
            className="result__regenerate"
            onClick={onRegenerate}
            disabled={regenerating}
          >
            {regenerating ? '再生成中…' : '🔄 このプランを再生成'}
          </button>
        )}
        <button
          type="button"
          className="result__export"
          onClick={handleCopy}
          data-testid="copy-plan"
        >
          📋 コピー
        </button>
        <button
          type="button"
          className="result__export"
          onClick={handleDownload}
          data-testid="download-plan"
        >
          ⬇️ ダウンロード
        </button>
        <span className="result__actions-hint">
          「保存」すると編集後の並び順・削除状態を含めてブラウザに残り、再読み込み後も読み込めます。再生成すると編集内容はリセットされます。
        </span>
      </div>

      {exportMessage && (
        <div className="result__export-toast" role="status" data-testid="export-toast">
          {exportMessage}
        </div>
      )}

      <BudgetEstimate plan={plan} days={days} />

      <MapPreview destination={plan.destination} days={days} />

      <PackingChecklist plan={plan} packingChecks={packingChecks} />

      {hasTimeline ? (
        <>
          <p className="result__edit-hint">
            各スポットの「↑／↓」で順序を入れ替え、「削除」で取り除けます。「★」でお気に入りに登録できます。編集はこの画面上ですぐに反映されます。
          </p>

          {days.length > 1 && (
            <nav className="daytabs" aria-label="日程の切り替え">
              {days.map((d) => (
                <button
                  key={d.day}
                  type="button"
                  className={`daytab${d.day === activeDay ? ' daytab--active' : ''}`}
                  aria-current={d.day === activeDay ? 'true' : undefined}
                  onClick={() => handleSelectDay(d.day)}
                >
                  {d.title}（{d.spots.length}件）
                </button>
              ))}
            </nav>
          )}

          <div className="result__timeline">
            {days.map((d, di) => (
              <DayTimeline
                key={d.day}
                day={d}
                dayIndex={di}
                totalDays={days.length}
                isActive={d.day === activeDay}
                destination={plan.destination}
                favorites={favorites}
                registerRef={(el) => {
                  sectionRefs.current[d.day] = el;
                }}
                onDeleteSpot={handleDeleteSpot}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
              />
            ))}
          </div>
        </>
      ) : (
        <PlanTextBody planText={plan.planText} />
      )}
    </section>
  );
}
