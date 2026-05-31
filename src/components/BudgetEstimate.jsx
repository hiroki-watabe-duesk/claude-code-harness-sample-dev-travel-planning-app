import { useMemo } from 'react';
import { estimateBudget, formatYen } from '../lib/budget.js';

// 予算の目安（概算費用）の表示（スプリント8 / 機能14）。
// 移動・宿泊・食事・観光の内訳と合計を表示する。
// 泊数・人数・表示中のスポット数から算出するため、条件を変えて生成すると金額も変化する。
export default function BudgetEstimate({ plan, days }) {
  const budget = useMemo(() => estimateBudget(plan, days), [plan, days]);

  return (
    <section className="budget" aria-label="予算の目安" data-testid="budget-estimate">
      <h3 className="budget__title">
        <span aria-hidden="true">💰</span> 予算の目安
        <span className="budget__hint">（{budget.people}名・{budget.nights === 0 ? '日帰り' : `${budget.nights}泊${budget.dayCount}日`}の概算）</span>
      </h3>

      <ul className="budget__items">
        {budget.items.map((item) => (
          <li className="budget__item" key={item.key} data-testid={`budget-item-${item.key}`}>
            <span className="budget__item-label">
              <span aria-hidden="true">{item.icon}</span> {item.label}
            </span>
            <span className="budget__item-note">{item.note}</span>
            <span className="budget__item-amount" data-testid={`budget-amount-${item.key}`}>
              {formatYen(item.amount)}
            </span>
          </li>
        ))}
      </ul>

      <div className="budget__totals">
        <div className="budget__total-row budget__total-row--main">
          <span className="budget__total-label">合計（目安）</span>
          <span className="budget__total-amount" data-testid="budget-total">
            {formatYen(budget.total)}
          </span>
        </div>
        <div className="budget__total-row">
          <span className="budget__total-label">1名あたり</span>
          <span className="budget__total-amount" data-testid="budget-per-person">
            {formatYen(budget.perPerson)}
          </span>
        </div>
      </div>

      <p className="budget__disclaimer">
        ※ 金額は移動・宿泊・食事・観光の標準的な単価から算出した概算の目安です。実際の費用は時期・施設・プランにより変動します。
      </p>
    </section>
  );
}
