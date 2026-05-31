// 持ち物・準備リストの項目を、行き先・テーマ・泊数・人数に応じて組み立てる（スプリント9 / 機能15）。
// 仕様: 行き先・テーマ（および季節・泊数など分かる範囲）に応じて項目が変わること。
//
// 外部データに依存せず、プランのメタ情報から決定的に項目を導出する。
// 項目には安定した id を振り、チェック状態を localStorage に紐づけられるようにする。

// テーマごとの「そのテーマならではの持ち物・準備」。
// 例: 温泉→タオル/着替え、自然→歩きやすい靴/虫除け、など。
const THEME_ITEMS = {
  standard: [
    { id: 'std-guide', label: 'ガイドブック・周辺マップ', note: '行き先の見どころを事前に把握' },
    { id: 'std-cash', label: '現金（小銭含む）', note: '券売機や小さな店で役立つ' },
  ],
  gourmet: [
    { id: 'gourmet-stomach', label: '胃薬・常備薬', note: '食べ歩きで胃を労わる' },
    { id: 'gourmet-wetwipe', label: 'ウェットティッシュ', note: '食べ歩き・テイクアウトに便利' },
    { id: 'gourmet-reserve', label: '人気店の予約確認', note: '行列・売り切れ対策' },
  ],
  nature: [
    { id: 'nature-shoes', label: '歩きやすい靴・スニーカー', note: '未舗装の道や坂道に備える' },
    { id: 'nature-bug', label: '虫除けスプレー', note: '草木の多い場所で快適に' },
    { id: 'nature-rain', label: 'レインウェア・折りたたみ傘', note: '山や水辺は天候が変わりやすい' },
    { id: 'nature-water', label: '飲み物・行動食', note: 'こまめな水分・栄養補給に' },
  ],
  history: [
    { id: 'history-shoes', label: '脱ぎ履きしやすい靴', note: '寺社の拝観で靴を脱ぐ場面に' },
    { id: 'history-coin', label: '小銭（お賽銭・拝観料）', note: '参拝や御朱印に' },
    { id: 'history-walk', label: '歩きやすい服装', note: '石畳・坂道の街歩きに' },
  ],
  onsen: [
    { id: 'onsen-towel', label: 'タオル・手ぬぐい', note: '外湯・足湯めぐりに' },
    { id: 'onsen-clothes', label: '着替え・湯上がり用の服', note: '湯めぐりで汗をかいたら' },
    { id: 'onsen-skincare', label: 'スキンケア・保湿用品', note: '湯上がりの肌ケアに' },
    { id: 'onsen-hairtie', label: 'ヘアゴム・ヘアキャップ', note: '入浴時の髪まとめに' },
  ],
  family: [
    { id: 'family-snack', label: '子ども用のおやつ・飲み物', note: '移動中・ぐずり対策に' },
    { id: 'family-change', label: '子どもの着替え一式', note: '汚れ・濡れに備える' },
    { id: 'family-firstaid', label: '絆創膏・常備薬', note: '小さなけがに備える' },
    { id: 'family-toy', label: '退屈しのぎのおもちゃ・絵本', note: '移動や待ち時間に' },
  ],
};

// どのテーマでも共通の基本の持ち物。
const BASE_ITEMS = [
  { id: 'base-ticket', label: '切符・チケット・予約確認', note: '交通機関や施設の手配を確認' },
  { id: 'base-phone', label: 'スマートフォン・モバイルバッテリー', note: '地図・連絡・写真に' },
  { id: 'base-charger', label: '充電器', note: '機器の充電を忘れずに' },
  { id: 'base-id', label: '身分証・保険証', note: '万一に備えて' },
  { id: 'base-mask', label: 'マスク・除菌グッズ', note: '混雑する場所で安心' },
];

// 季節（旅行月）から決まる持ち物。月が分からない場合は省略する。
function seasonItems(month) {
  if (!Number.isInteger(month)) return [];
  // 12,1,2 = 冬 / 3,4,5 = 春 / 6,7,8 = 夏 / 9,10,11 = 秋
  if (month === 12 || month === 1 || month === 2) {
    return [
      { id: 'season-winter-coat', label: '防寒着・手袋・マフラー', note: '冬の冷え込み対策', season: '冬' },
      { id: 'season-winter-lip', label: 'リップ・ハンドクリーム', note: '乾燥対策に', season: '冬' },
    ];
  }
  if (month >= 6 && month <= 8) {
    return [
      { id: 'season-summer-sun', label: '日焼け止め・帽子', note: '夏の強い日差し対策', season: '夏' },
      { id: 'season-summer-fan', label: '扇子・冷却グッズ', note: '暑さをしのぐために', season: '夏' },
    ];
  }
  if (month >= 3 && month <= 5) {
    return [
      { id: 'season-spring-jacket', label: '羽織れる上着', note: '朝晩の寒暖差に', season: '春' },
    ];
  }
  return [
    { id: 'season-autumn-jacket', label: '薄手の上着・羽織り', note: '秋の肌寒さに', season: '秋' },
  ];
}

// 泊数・人数から決まる準備項目。
function tripItems(nights, people) {
  const items = [];
  if (Number.isInteger(nights) && nights >= 1) {
    items.push({ id: 'trip-toiletry', label: '洗面用具・歯ブラシ', note: `宿泊（${nights}泊）の身支度に` });
    items.push({ id: 'trip-clothes', label: `着替え（${nights + 1}日分の目安）`, note: '泊数に合わせて準備' });
    items.push({ id: 'trip-pajama', label: '寝間着・部屋着', note: '宿でくつろぐために' });
  } else {
    items.push({ id: 'trip-light', label: '身軽な手荷物にまとめる', note: '日帰りは最小限の荷物で' });
  }
  if (Number.isInteger(people) && people >= 3) {
    items.push({ id: 'trip-group', label: 'グループ用の連絡手段・集合場所の共有', note: `${people}名での行動をスムーズに` });
  }
  return items;
}

// プランから持ち物・準備リストの全項目（セクション分け）を組み立てる。
// 戻り値: { sections: [{ title, items: [{ id, label, note }] }], items: 全項目フラット }
export function buildPackingList(plan = {}) {
  const theme = typeof plan.theme === 'string' && plan.theme ? plan.theme : 'standard';
  const themeLabel = plan.themeLabel || 'おまかせ（王道）';
  const nights = Number.isFinite(Number(plan.nights)) ? Number(plan.nights) : 1;
  const people = Number.isFinite(Number(plan.people)) ? Number(plan.people) : 2;
  // 旅行月（任意）。指定があれば季節の持ち物を反映する。
  const month = Number.isInteger(plan.month) ? plan.month : undefined;

  const themeItems = THEME_ITEMS[theme] || THEME_ITEMS.standard;

  const sections = [
    { id: 'base', title: '基本の持ち物', items: BASE_ITEMS },
    { id: 'theme', title: `テーマ「${themeLabel}」の持ち物・準備`, items: themeItems },
    { id: 'trip', title: '泊数・人数に応じた準備', items: tripItems(nights, people) },
  ];

  const season = seasonItems(month);
  if (season.length > 0) {
    sections.push({ id: 'season', title: '季節に応じた持ち物', items: season });
  }

  const flat = sections.flatMap((s) => s.items);
  return { sections, items: flat, theme, themeLabel, nights, people };
}
