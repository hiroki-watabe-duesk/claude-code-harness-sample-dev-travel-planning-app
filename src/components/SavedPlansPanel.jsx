import { useMemo, useState } from 'react';

function formatSavedAt(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString('ja-JP');
  } catch {
    return '';
  }
}

function durationText(snapshot) {
  if (typeof snapshot.nights !== 'number') return '';
  if (snapshot.nights === 0) return '日帰り';
  const days = typeof snapshot.days === 'number' ? snapshot.days : snapshot.nights + 1;
  return `${snapshot.nights}泊${days}日`;
}

function spotCount(snapshot) {
  if (!Array.isArray(snapshot.structuredDays)) return null;
  return snapshot.structuredDays.reduce(
    (sum, d) => sum + (Array.isArray(d.spots) ? d.spots.length : 0),
    0,
  );
}

// 保存済みプランの一覧（スプリント7）。
// 各プランの名前・行き先・主要条件を表示し、開く／名前変更／削除ができる。
export default function SavedPlansPanel({ plans, currentPlanId, onOpen, onRename, onDelete }) {
  const [open, setOpen] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [draftName, setDraftName] = useState('');

  const count = plans.length;
  const sorted = useMemo(
    () => [...plans].sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0)),
    [plans],
  );

  function startRename(plan) {
    setEditingId(plan.id);
    setDraftName(plan.name || '');
  }

  function commitRename(id) {
    const name = draftName.trim();
    if (name) {
      onRename(id, name);
    }
    setEditingId(null);
    setDraftName('');
  }

  function cancelRename() {
    setEditingId(null);
    setDraftName('');
  }

  return (
    <section className="planlist" aria-label="保存済みプラン一覧" data-testid="saved-plans-panel">
      <button
        type="button"
        className="planlist__head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="planlist__title">
          <span aria-hidden="true">📁</span> 保存済みプラン
          <span className="planlist__count" data-testid="saved-plans-count">
            {count}件
          </span>
        </span>
        <span className={`planlist__chevron${open ? ' planlist__chevron--open' : ''}`} aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className="planlist__body">
          {count === 0 ? (
            <p className="planlist__empty">
              まだ保存したプランはありません。プランを生成して「💾 このプランを保存」を押すと、ここに追加されます。
            </p>
          ) : (
            <ul className="planlist__items">
              {sorted.map((p) => {
                const isCurrent = p.id === currentPlanId;
                const dur = durationText(p);
                const spots = spotCount(p);
                const savedAt = formatSavedAt(p.savedAt);
                return (
                  <li
                    className={`planitem${isCurrent ? ' planitem--current' : ''}`}
                    key={p.id}
                    data-testid="saved-plan-item"
                  >
                    {editingId === p.id ? (
                      <div className="planitem__rename">
                        <input
                          type="text"
                          className="planitem__rename-input"
                          value={draftName}
                          autoFocus
                          aria-label="プラン名"
                          onChange={(e) => setDraftName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename(p.id);
                            if (e.key === 'Escape') cancelRename();
                          }}
                        />
                        <button
                          type="button"
                          className="planitem__btn planitem__btn--primary"
                          onClick={() => commitRename(p.id)}
                          data-testid="rename-save"
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          className="planitem__btn planitem__btn--ghost"
                          onClick={cancelRename}
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="planitem__main">
                          <span className="planitem__name" data-testid="saved-plan-name">
                            {p.name}
                          </span>
                          {isCurrent && <span className="planitem__current-badge">表示中</span>}
                          <span className="planitem__meta">
                            <span className="planitem__dest">📍 {p.destination || '行き先未設定'}</span>
                            {dur && <span className="planitem__chip">🗓 {dur}</span>}
                            {typeof p.people === 'number' && (
                              <span className="planitem__chip">👥 {p.people}名</span>
                            )}
                            {p.themeLabel && <span className="planitem__chip">🎯 {p.themeLabel}</span>}
                            {spots != null && <span className="planitem__chip">🧭 全{spots}スポット</span>}
                          </span>
                          {savedAt && <span className="planitem__time">保存: {savedAt}</span>}
                        </div>
                        <div className="planitem__actions">
                          <button
                            type="button"
                            className="planitem__btn planitem__btn--primary"
                            onClick={() => onOpen(p.id)}
                            data-testid="open-plan"
                          >
                            開く
                          </button>
                          <button
                            type="button"
                            className="planitem__btn"
                            onClick={() => startRename(p)}
                            data-testid="rename-plan"
                          >
                            名前変更
                          </button>
                          <button
                            type="button"
                            className="planitem__btn planitem__btn--danger"
                            onClick={() => onDelete(p.id)}
                            data-testid="delete-plan"
                          >
                            削除
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
