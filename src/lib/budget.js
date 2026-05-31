// 予算の目安（概算費用）の算出ヘルパー。
// 仕様: プランに対して概算費用（移動・宿泊・食事・観光などの内訳・合計）を表示し、
// 泊数・人数に応じて金額が変化すること。
//
// モック・実APIどちらの経路でも破綻しないよう、フロント側で
// 表示中のプラン（編集後の days）と条件（nights / people）から決定的に計算する。
// 1人あたりの単価×人数、宿泊は泊数×人数、食事は日数×人数、観光はスポット数ベース、
// という簡易ロジック。金額は「目安」であり、丸めた概算値。

// 1人・1単位あたりの目安単価（円）。
const RATES = {
  transport: 8000, // 移動: 1人あたりの往復交通費の目安（人数に比例）
  lodging: 9000, // 宿泊: 1人・1泊あたりの目安（泊数×人数に比例）
  mealPerDay: 4000, // 食事: 1人・1日あたりの目安（日数×人数に比例）
  sightseeingPerSpot: 600, // 観光: 1人・1スポットあたりの目安（スポット数×人数に比例）
};

function safeInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// 円表記（カンマ区切り）。
export function formatYen(amount) {
  return `¥${Math.round(amount).toLocaleString('ja-JP')}`;
}

// 予算の内訳と合計を計算して返す。
// plan: { nights, people, ... }, days: 表示中の編集後 days 配列。
export function estimateBudget(plan, days) {
  const people = safeInt(plan && plan.people, 2);
  const nights = (() => {
    const n = Number.parseInt(plan && plan.nights, 10);
    return Number.isFinite(n) && n >= 0 ? n : 1;
  })();
  const dayCount = Array.isArray(days) && days.length > 0 ? days.length : nights + 1;

  // 表示中プランの総スポット数（編集後の状態を反映）。
  const totalSpots = Array.isArray(days)
    ? days.reduce((sum, d) => sum + (Array.isArray(d.spots) ? d.spots.length : 0), 0)
    : 0;

  const transport = RATES.transport * people;
  const lodging = RATES.lodging * nights * people;
  const meals = RATES.mealPerDay * dayCount * people;
  const sightseeing = RATES.sightseeingPerSpot * totalSpots * people;

  const items = [
    {
      key: 'transport',
      label: '移動',
      icon: '🚄',
      amount: transport,
      note: `往復交通の目安（${people}名）`,
    },
    {
      key: 'lodging',
      label: '宿泊',
      icon: '🏨',
      amount: lodging,
      note: nights === 0 ? '日帰りのため宿泊なし' : `${nights}泊 × ${people}名`,
    },
    {
      key: 'meals',
      label: '食事',
      icon: '🍽',
      amount: meals,
      note: `${dayCount}日 × ${people}名`,
    },
    {
      key: 'sightseeing',
      label: '観光',
      icon: '🎟',
      amount: sightseeing,
      note: `全${totalSpots}スポット × ${people}名`,
    },
  ];

  const total = items.reduce((sum, it) => sum + it.amount, 0);
  const perPerson = people > 0 ? total / people : total;

  return { items, total, perPerson, people, nights, dayCount, totalSpots };
}
