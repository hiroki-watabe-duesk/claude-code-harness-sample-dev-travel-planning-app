// 旅行プラン生成ロジック。
// 実API連携（Claude）とモック生成を 1 つのインターフェース generatePlan() の背後に隠蔽する。
// 後から ANTHROPIC_API_KEY を差すだけで実APIに切り替わる。
//
// スプリント3以降、戻り値は構造化データ（days: 日ごとの spots 配列）を主とする。
// 各 spot は { time, name, description, tags } を持つ。
// スプリント4以降、各 spot に詳細情報（highlight: おすすめポイント, stay: 滞在目安）を追加する。
// 後方互換のため、構造化データから組み立てた planText（テキスト本文）も同梱する。

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-20250514';

// テーマの定義。フロントの選択肢とサーバーのモックロジックで共有する。
export const THEMES = [
  { id: 'standard', label: 'おまかせ（王道）' },
  { id: 'gourmet', label: 'グルメ' },
  { id: 'nature', label: '自然' },
  { id: 'history', label: '歴史' },
  { id: 'onsen', label: '温泉' },
  { id: 'family', label: '子連れ・ファミリー' },
];

const THEME_IDS = THEMES.map((t) => t.id);

// テーマごとに、モック生成で使う時間帯別スポットの「種別・名前・説明・おすすめ・滞在目安・タグ」を決める。
// テーマを変えると内容が明確に変化することを保証するためのテーブル。
// slot ごとに spotType（スポット名の組み立てに使う）・description・highlight（おすすめポイント）・
// stay（滞在目安）・baseTags を持つ。
const THEME_CONTENT = {
  standard: {
    vibe: '歴史の薫りと現代のにぎわいが心地よく溶け合う',
    slots: {
      morning: {
        spotType: '名所',
        description: (name) => `${name}を代表する名所を、人出の少ない朝のうちにゆっくり巡ります。`,
        highlight: (name) => `朝いちばんは人が少なく、写真も撮りやすい時間帯。${name}らしい景観をじっくり味わえます。`,
        stay: '約90分',
        tags: ['定番', '朝がおすすめ'],
      },
      lunch: {
        spotType: '食堂',
        description: (name) => `${name}で評判の食堂に立ち寄り、地元の旬の素材を使った定食をいただきます。`,
        highlight: () => '昼の混雑を避けるなら開店直後がおすすめ。日替わり定食で土地の味を手軽に楽しめます。',
        stay: '約60分',
        tags: ['グルメ', 'ランチ'],
      },
      afternoon: {
        spotType: '文化施設',
        description: (name) => `${name}の文化や成り立ちを学べる施設をめぐり、旅の理解を深めます。`,
        highlight: () => '屋内なので天候に左右されにくく、雨の日の予定にも組み込みやすいスポットです。',
        stay: '約120分',
        tags: ['学び', '雨の日OK'],
      },
      evening: {
        spotType: '繁華街',
        description: (name) => `${name}の繁華街で郷土の肴を味わい、旅の余韻にひたります。`,
        highlight: () => '日が暮れてからの街歩きは雰囲気が一変。ライトアップや夜景もあわせて楽しめます。',
        stay: '約120分',
        tags: ['夜景', 'グルメ'],
      },
    },
  },
  gourmet: {
    vibe: '土地の味覚を朝から晩まで食べ尽くせる',
    slots: {
      morning: {
        spotType: '朝市・市場',
        description: (name) => `${name}の朝市や市場を歩き、できたての名物や旬の海山の幸を味わいます。`,
        highlight: () => '朝市は早い時間ほど品ぞろえが豊富。食べ歩きしながら市場の活気を体感できます。',
        stay: '約75分',
        tags: ['グルメ', '朝がおすすめ'],
      },
      lunch: {
        spotType: '郷土料理の老舗',
        description: (name) => `${name}の郷土料理を看板に掲げる老舗で、この土地でしか出会えない一皿を堪能します。`,
        highlight: () => '人気店は昼に行列ができることも。予約や早めの来店で待ち時間を抑えられます。',
        stay: '約75分',
        tags: ['名物', 'ランチ'],
      },
      afternoon: {
        spotType: 'カフェ・甘味処',
        description: (name) => `${name}で評判のカフェ・甘味処に立ち寄り、ご当地スイーツでひと休みします。`,
        highlight: () => '歩き疲れたタイミングでの休憩に最適。季節限定の甘味があれば要チェックです。',
        stay: '約60分',
        tags: ['スイーツ', '休憩'],
      },
      evening: {
        spotType: '地酒の店',
        description: (name) => `${name}の地酒と郷土の肴を出す店で、夜のグルメをじっくり楽しみます。`,
        highlight: () => '飲み比べセットがあれば土地の酒を少しずつ堪能できます。締めの一杯まで楽しんで。',
        stay: '約120分',
        tags: ['地酒', '夜グルメ'],
      },
    },
  },
  nature: {
    vibe: '雄大な自然と澄んだ空気に心が解き放たれる',
    slots: {
      morning: {
        spotType: '展望スポット',
        description: (name) => `${name}を一望できる高台や展望スポットで、朝の澄んだ景色を満喫します。`,
        highlight: () => '空気が澄む朝は遠くまで見晴らせる確率が高め。日の出に合わせるのもおすすめです。',
        stay: '約60分',
        tags: ['絶景', '朝がおすすめ'],
      },
      lunch: {
        spotType: '景勝地',
        description: (name) => `${name}近郊の景勝地で、緑や水辺を眺めながら土地の食材のランチをいただきます。`,
        highlight: () => 'テラス席や窓際の席があれば景色とともに食事を。お弁当を持ち込むのも気持ちよい時間に。',
        stay: '約90分',
        tags: ['絶景', 'ランチ'],
      },
      afternoon: {
        spotType: '自然公園',
        description: (name) => `${name}の自然公園やハイキングコースを歩き、四季の風景を間近に感じます。`,
        highlight: () => '歩きやすい靴と水分があると安心。コースの難易度を確認して無理のない範囲で楽しんで。',
        stay: '約120分',
        tags: ['アクティブ', '自然'],
      },
      evening: {
        spotType: '夕景スポット',
        description: (name) => `${name}の星空や夕景が美しいスポットで、自然のなかの静かな時間を過ごします。`,
        highlight: () => '日没時刻を事前に調べておくとベストタイミングを逃しません。冷え込みに上着を一枚。',
        stay: '約90分',
        tags: ['夕景', '癒やし'],
      },
    },
  },
  history: {
    vibe: '往時の物語と古き良き街並みに浸れる',
    slots: {
      morning: {
        spotType: '城跡・神社仏閣',
        description: (name) => `${name}を象徴する城跡や神社仏閣を、静かな朝のうちに参拝・散策します。`,
        highlight: () => '朝の静けさのなかで歴史的建造物の細部までじっくり鑑賞できます。御朱印があれば記念に。',
        stay: '約90分',
        tags: ['歴史', '朝がおすすめ'],
      },
      lunch: {
        spotType: '町家の老舗',
        description: (name) => `${name}の歴史ある町家や老舗で、昔ながらの製法を守る料理をいただきます。`,
        highlight: () => '建物自体が見どころの老舗も多数。料理とあわせて空間の風情も味わえます。',
        stay: '約75分',
        tags: ['老舗', 'ランチ'],
      },
      afternoon: {
        spotType: '博物館・資料館',
        description: (name) => `${name}の博物館・資料館で、この地に刻まれた歴史と人々の営みをたどります。`,
        highlight: () => '解説パネルや音声ガイドを活用するとより深く理解できます。屋内なので雨天時も安心。',
        stay: '約120分',
        tags: ['学び', '雨の日OK'],
      },
      evening: {
        spotType: '古い街並み',
        description: (name) => `${name}の古い街並みをライトアップとともに歩き、夜の風情を味わいます。`,
        highlight: () => '夕暮れから夜にかけて灯りがともる時間帯がもっとも趣があります。足元の段差にご注意を。',
        stay: '約90分',
        tags: ['夜景', '街歩き'],
      },
    },
  },
  onsen: {
    vibe: '名湯と湯けむりに包まれて心身ともにほぐれる',
    slots: {
      morning: {
        spotType: '朝風呂・温泉街',
        description: (name) => `${name}の朝風呂で旅の始まりを清め、湯上がりに温泉街をそぞろ歩きします。`,
        highlight: () => '朝風呂は一日のなかでも空いていて格別。湯上がりの散策で温泉街の朝の表情を楽しめます。',
        stay: '約75分',
        tags: ['温泉', '朝がおすすめ'],
      },
      lunch: {
        spotType: '温泉宿の食事処',
        description: (name) => `${name}の温泉宿や食事処で、地のものを使った会席風のランチをいただきます。`,
        highlight: () => '日帰り入浴とランチがセットになったプランがあればお得。ゆっくり食事を楽しめます。',
        stay: '約90分',
        tags: ['名物', 'ランチ'],
      },
      afternoon: {
        spotType: '外湯・足湯めぐり',
        description: (name) => `${name}周辺の外湯・足湯をめぐり、湯処ごとに異なる泉質の違いを楽しみます。`,
        highlight: () => 'タオルを一枚持って歩くと外湯めぐりがスムーズ。足湯は気軽に立ち寄れて休憩にも最適。',
        stay: '約90分',
        tags: ['温泉', '街歩き'],
      },
      evening: {
        spotType: '名湯の宿',
        description: (name) => `${name}の名湯にゆっくり浸かり、湯けむりの宿で旅の疲れを心ゆくまで癒やします。`,
        highlight: () => '夕食後の入浴は一日の締めくくりに。湯冷めしないようゆっくりと体を休めましょう。',
        stay: '約120分',
        tags: ['温泉', '癒やし'],
      },
    },
  },
  family: {
    vibe: '子どもも大人も一緒に楽しめる',
    slots: {
      morning: {
        spotType: '体験スポット',
        description: (name) => `${name}の体験型スポットや動物とふれあえる施設で、家族みんなで楽しみます。`,
        highlight: () => '体験プログラムは予約が必要なことも。開園直後は比較的空いていてゆっくり回れます。',
        stay: '約120分',
        tags: ['子連れ向き', '体験'],
      },
      lunch: {
        spotType: 'ファミリー向け食事処',
        description: (name) => `${name}でお子さま連れでも安心して入れる、座敷やキッズメニューのある店で食事します。`,
        highlight: () => 'ベビーチェアや座敷の有無を事前に確認しておくと安心。お子さま向けメニューも要チェック。',
        stay: '約75分',
        tags: ['子連れ向き', 'ランチ'],
      },
      afternoon: {
        spotType: '公園・テーマ施設',
        description: (name) => `${name}の公園やテーマ施設でのびのびと遊び、家族の思い出をつくります。`,
        highlight: () => '広い施設は時間に余裕をもって。着替えや帽子・日よけがあると一日快適に過ごせます。',
        stay: '約150分',
        tags: ['子連れ向き', 'アクティブ'],
      },
      evening: {
        spotType: 'くつろぎの宿',
        description: (name) => `${name}でゆったりくつろげる宿や食事処で、一日の体験を語り合います。`,
        highlight: () => '一日遊んだあとは早めにくつろげる宿へ。家族でその日の思い出を振り返る時間も大切に。',
        stay: '約120分',
        tags: ['子連れ向き', '癒やし'],
      },
    },
  },
};

// 1日のスロット順序（午前→昼→午後→夕方）。
const SLOT_ORDER = ['morning', 'lunch', 'afternoon', 'evening'];

// 行き先名から決定的に値を散らすための簡易ハッシュ。
// 同じ行き先なら毎回同じ、違う行き先なら異なる結果になることを保証する。
function hashString(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) % 1000000007;
  }
  return Math.abs(hash);
}

// 入力を妥当な範囲に正規化する。
function normalizeOptions(options = {}) {
  const destination = String(options.destination || '').trim();

  let nights = Number.parseInt(options.nights, 10);
  if (!Number.isFinite(nights) || nights < 0) nights = 1;
  if (nights > 6) nights = 6;

  let people = Number.parseInt(options.people, 10);
  if (!Number.isFinite(people) || people < 1) people = 2;
  if (people > 20) people = 20;

  let theme = String(options.theme || 'standard');
  if (!THEME_IDS.includes(theme)) theme = 'standard';

  return { destination, nights, people, theme };
}

function themeLabel(themeId) {
  const found = THEMES.find((t) => t.id === themeId);
  return found ? found.label : 'おまかせ（王道）';
}

// 人数に応じた言い回しを返す（本文に人数を反映させるため）。
function partyPhrase(people) {
  if (people === 1) return 'ひとり旅';
  if (people === 2) return '2名';
  return `${people}名のグループ`;
}

// スポット名のバリエーション。エリア名 + 種別 で読みやすい地点名を組み立てる。
// 行き先・日・スロットでシードをずらし、地区名を散らして単調さを避ける。
const AREA_WORDS = ['中央', '旧市街', '湖畔', '高台', '川沿い', '海沿い', '駅前', '奥', '南', '北'];

function spotName({ destination, slotConfig, daySeed, slotIndex }) {
  const area = AREA_WORDS[(daySeed + slotIndex * 13) % AREA_WORDS.length];
  return `${destination}・${area}エリアの${slotConfig.spotType}`;
}

// スポットに付与するタグを動的に決める。
// テーマ由来の baseTags に加え、人数や日の位置に応じたタグを足し、
// 固定の単一タグにならないようにする（最低でも1つ、通常2〜3つ）。
function buildTags({ baseTags, people, isLastDay, slotKey, daySeed, slotIndex }) {
  const tags = [...baseTags];

  if (people >= 3) {
    tags.push('みんなで');
  } else if (people === 1) {
    tags.push('ひとり旅向き');
  }

  if (slotKey === 'evening' && isLastDay) {
    tags.push('旅の締め');
  }

  // 行き先・日・スロット由来で決定的に1つ選ぶアクセントタグ（毎回同じ条件なら同じ）。
  const accentPool = ['写真映え', '人気', '穴場', 'ゆったり', '駅近'];
  const accent = accentPool[(daySeed + slotIndex * 7) % accentPool.length];
  if (!tags.includes(accent)) {
    tags.push(accent);
  }

  // 重複除去し、最大4つに抑える。
  const unique = [];
  for (const t of tags) {
    if (!unique.includes(t)) unique.push(t);
    if (unique.length >= 4) break;
  }
  return unique;
}

// 構造化された日別プランを構成する。
// 戻り値: [{ day, title, spots: [{ time, order, name, description, tags }] }]
function buildStructuredDays({ destination, nights, people, theme }) {
  const seed = hashString(`${destination}|${theme}`);
  const days = nights + 1; // 泊数 + 1 = 日数（0泊=日帰り=1日）
  const content = THEME_CONTENT[theme] || THEME_CONTENT.standard;

  const result = [];
  for (let day = 1; day <= days; day += 1) {
    const daySeed = seed + day * 7;
    const isLastDay = day === days;
    const spots = [];

    SLOT_ORDER.forEach((slotKey, slotIndex) => {
      const slotConfig = content.slots[slotKey];
      // 各スロットの時刻。最終日の夜は夕方寄りにして「帰路につく」流れにする。
      let time;
      if (slotKey === 'morning') time = '09:00';
      else if (slotKey === 'lunch') time = '12:00';
      else if (slotKey === 'afternoon') time = '14:00';
      else time = isLastDay ? '16:30' : '18:00';

      const name = spotName({ destination, slotConfig, daySeed, slotIndex });

      let description = slotConfig.description(destination);
      if (slotKey === 'evening') {
        description += isLastDay
          ? ` ${partyPhrase(people)}での旅を締めくくり、お土産を選んで帰路につきます。`
          : ` ${partyPhrase(people)}でその日の体験を振り返り、宿でゆっくり休みます。`;
      }

      const highlight = slotConfig.highlight(destination);
      const stay = slotConfig.stay;

      const tags = buildTags({
        baseTags: slotConfig.tags,
        people,
        isLastDay,
        slotKey,
        daySeed,
        slotIndex,
      });

      spots.push({
        time,
        order: slotIndex + 1,
        name,
        description,
        highlight,
        stay,
        tags,
      });
    });

    result.push({
      day,
      title: `${day}日目`,
      spots,
    });
  }

  return result;
}

// 構造化データから後方互換用のテキスト本文を組み立てる。
// スプリント1・2のテキスト表示や、テキスト前提の検証が壊れないようにする。
function daysToPlanText({ destination, nights, people, theme, structuredDays }) {
  const days = structuredDays.length;
  const label = themeLabel(theme);
  const party = partyPhrase(people);
  const content = THEME_CONTENT[theme] || THEME_CONTENT.standard;
  const durationText = nights === 0 ? '日帰り' : `${nights}泊${days}日`;

  const lines = [
    `【${destination}・${durationText}モデルコース（テーマ: ${label} / ${party}）】`,
    '',
    `${destination}は、${content.vibe}旅先です。${party}での${durationText}の旅にあわせ、` +
      `「${label}」をテーマにした全${days}日分のモデルコースをご提案します。`,
    '',
  ];

  for (const dayPlan of structuredDays) {
    lines.push(`◆ ${dayPlan.day}日目`);
    for (const spot of dayPlan.spots) {
      const tagText = spot.tags.length ? `［${spot.tags.join('・')}］` : '';
      lines.push(`${spot.time} ${spot.name}${tagText} — ${spot.description}`);
    }
    lines.push('');
  }

  lines.push(
    `今回のコースは${destination}の「${label}」の魅力を${days}日かけて味わう構成です。` +
      `${party}の興味にあわせて、気になったスポット周辺をもう少し深掘りしてみるのもおすすめです。よい${destination}の旅を！`,
  );

  return lines.join('\n');
}

// 行き先・泊数・人数・テーマに応じて内容が変化する動的なモックプランを構成する。
function generateMockPlan(normalized) {
  const structuredDays = buildStructuredDays(normalized);
  const planText = daysToPlanText({ ...normalized, structuredDays });
  return { structuredDays, planText };
}

// Claude API のレスポンステキストから JSON ブロックを抽出して構造化データへ変換する。
// API が JSON 以外を返した場合に備え、抽出に失敗したら null を返す（呼び出し側でフォールバック）。
function parseStructuredFromText(text) {
  // ```json ... ``` のコードフェンスや前後の説明文を許容して JSON を探す。
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  let parsed;
  try {
    parsed = JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }

  const rawDays = Array.isArray(parsed.days) ? parsed.days : null;
  if (!rawDays || rawDays.length === 0) return null;

  const structuredDays = rawDays.map((d, i) => {
    const dayNum = Number.isFinite(Number(d.day)) ? Number(d.day) : i + 1;
    const rawSpots = Array.isArray(d.spots) ? d.spots : [];
    const spots = rawSpots.map((s, j) => {
      let tags = Array.isArray(s.tags) ? s.tags.map((t) => String(t)).filter(Boolean) : [];
      if (tags.length === 0) tags = ['おすすめ'];
      const name = s.name ? String(s.name) : `スポット${j + 1}`;
      const description = s.description ? String(s.description) : '';
      // 詳細フィールド（おすすめ・滞在目安）。API が返さなければ説明から穏当に補完する。
      const highlight = s.highlight
        ? String(s.highlight)
        : (s.recommendation ? String(s.recommendation) : `${name}ならではの魅力をゆっくり味わえるスポットです。`);
      const stay = s.stay
        ? String(s.stay)
        : (s.duration ? String(s.duration) : '約90分');
      return {
        time: s.time ? String(s.time) : '',
        order: j + 1,
        name,
        description,
        highlight,
        stay,
        tags: tags.slice(0, 4),
      };
    });
    return { day: dayNum, title: `${dayNum}日目`, spots };
  });

  // スポットが1件も無い構造は不正とみなす。
  const hasSpots = structuredDays.some((d) => d.spots.length > 0);
  return hasSpots ? structuredDays : null;
}

// Claude API を呼び出して旅行プランを生成する（ANTHROPIC_API_KEY 設定時の主経路）。
// 構造化 JSON を依頼し、パースできれば構造化データを返す。失敗時はモックへフォールバック。
async function generateWithClaude(normalized, apiKey) {
  const { destination, nights, people, theme } = normalized;
  const days = nights + 1;
  const durationText = nights === 0 ? '日帰り' : `${nights}泊${days}日`;
  const label = themeLabel(theme);

  const prompt = `あなたは日本国内旅行に詳しいプランナーです。行き先「${destination}」について、` +
    `${durationText}（全${days}日）・${people}名・テーマ「${label}」の旅行のモデルコースを提案してください。\n` +
    `出力は次の JSON 形式のみとし、前後に説明文やコードフェンスを付けないでください:\n` +
    `{"days":[{"day":1,"spots":[{"time":"09:00","name":"スポット名","description":"説明文","highlight":"おすすめポイント","stay":"約90分","tags":["タグ1","タグ2"]}]}]}\n` +
    `制約:\n` +
    `- days は必ず全${days}日分（day は 1 から ${days} まで）。\n` +
    `- 各日 spots は午前・昼・午後・夕方の少なくとも4件、time は時刻文字列（例 "09:00"）。\n` +
    `- 各 spot の highlight はそのスポットのおすすめポイント・楽しみ方を1〜2文で。\n` +
    `- 各 spot の stay は滞在目安の所要時間（例 "約90分"）。\n` +
    `- 各 spot の tags は「絶景」「グルメ」「歴史」「温泉」「子連れ向き」など特徴を表す語を1〜3個。\n` +
    `- テーマ「${label}」と${people}名という人数を内容に反映する。\n` +
    `- 日本語で記述する。`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Claude API error (${response.status}): ${detail}`);
  }

  const data = await response.json();
  const text = (data.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  if (!text) {
    throw new Error('Claude API から有効なテキストが返りませんでした。');
  }

  const structuredDays = parseStructuredFromText(text);
  if (structuredDays) {
    const planText = daysToPlanText({ ...normalized, structuredDays });
    return { structuredDays, planText };
  }

  // JSON 化に失敗した場合は、生テキストをそのまま本文として返しつつ
  // 構造化データはモックで補完し、UI が常にタイムラインを描けるようにする。
  const fallback = generateMockPlan(normalized);
  return { structuredDays: fallback.structuredDays, planText: text };
}

// 単一の公開インターフェース。呼び出し側は実API/モックの区別を意識しない。
// 引数は { destination, nights, people, theme } を受け取る（後方互換のため文字列も許容）。
export async function generatePlan(input) {
  const options = typeof input === 'string' ? { destination: input } : input;
  const normalized = normalizeOptions(options);
  const apiKey = process.env.ANTHROPIC_API_KEY;

  const meta = {
    destination: normalized.destination,
    nights: normalized.nights,
    days: normalized.nights + 1,
    people: normalized.people,
    theme: normalized.theme,
    themeLabel: themeLabel(normalized.theme),
  };

  if (apiKey && apiKey.trim()) {
    const { structuredDays, planText } = await generateWithClaude(normalized, apiKey.trim());
    return { ...meta, days: structuredDays.length, planText, structuredDays, mode: 'live', model: DEFAULT_MODEL };
  }

  const { structuredDays, planText } = generateMockPlan(normalized);
  return { ...meta, planText, structuredDays, mode: 'mock', model: null };
}
