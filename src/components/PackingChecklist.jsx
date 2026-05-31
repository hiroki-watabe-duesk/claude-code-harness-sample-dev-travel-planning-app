import { useMemo } from 'react';
import { buildPackingList } from '../lib/packing.js';

// 持ち物・準備リストのチェックリスト表示（スプリント9 / 機能15）。
// 行き先・テーマ（および泊数・人数・季節）に応じて項目が変わる。
// 各項目はチェックでき、チェック状態が視覚的に分かる。チェックは usePackingChecks で localStorage に保持。
export default function PackingChecklist({ plan, packingChecks }) {
  const list = useMemo(() => buildPackingList(plan), [plan]);
  const destination = plan.destination || '';
  const theme = plan.theme || 'standard';

  const total = list.items.length;
  const checkedCount = packingChecks ? packingChecks.countChecked(destination, theme) : 0;

  return (
    <section className="packing" aria-label="持ち物・準備リスト" data-testid="packing-checklist">
      <div className="packing__head">
        <h3 className="packing__title">
          <span aria-hidden="true">🎒</span> 持ち物・準備リスト
          <span className="packing__hint">
            （{destination || '行き先'}・テーマ「{list.themeLabel}」に合わせた提案）
          </span>
        </h3>
        <span className="packing__progress" data-testid="packing-progress">
          {checkedCount} / {total} 準備OK
        </span>
      </div>

      <p className="packing__lead">
        行き先・テーマ・泊数に応じた持ち物の目安です。準備できたら項目にチェックを付けましょう（チェックはブラウザに保存されます）。
      </p>

      {list.sections.map((section) => (
        <div className="packing__section" key={section.id}>
          <h4 className="packing__section-title">{section.title}</h4>
          <ul className="packing__items">
            {section.items.map((item) => {
              const checked = packingChecks
                ? packingChecks.isChecked(destination, theme, item.id)
                : false;
              return (
                <li
                  className={`packing__item${checked ? ' packing__item--checked' : ''}`}
                  key={item.id}
                  data-testid="packing-item"
                >
                  <label className="packing__label">
                    <input
                      type="checkbox"
                      className="packing__checkbox"
                      checked={checked}
                      data-testid={`packing-check-${item.id}`}
                      onChange={() =>
                        packingChecks && packingChecks.toggleCheck(destination, theme, item.id)
                      }
                    />
                    <span className="packing__box" aria-hidden="true">
                      {checked ? '✓' : ''}
                    </span>
                    <span className="packing__text">
                      <span className="packing__item-label">{item.label}</span>
                      {item.note && <span className="packing__item-note">{item.note}</span>}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {checkedCount > 0 && (
        <div className="packing__footer">
          <button
            type="button"
            className="packing__clear"
            onClick={() => packingChecks && packingChecks.clearScope(destination, theme)}
          >
            チェックをすべて外す
          </button>
        </div>
      )}
    </section>
  );
}
