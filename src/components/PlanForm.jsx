// 泊数の選択肢（0泊=日帰り 〜 5泊6日）。
const NIGHT_OPTIONS = [
  { value: 0, label: '日帰り' },
  { value: 1, label: '1泊2日' },
  { value: 2, label: '2泊3日' },
  { value: 3, label: '3泊4日' },
  { value: 4, label: '4泊5日' },
  { value: 5, label: '5泊6日' },
];

// 旅行テーマ（サーバーの planGenerator.js の THEMES と対応）。
const THEME_OPTIONS = [
  { id: 'standard', label: 'おまかせ（王道）' },
  { id: 'gourmet', label: 'グルメ' },
  { id: 'nature', label: '自然' },
  { id: 'history', label: '歴史' },
  { id: 'onsen', label: '温泉' },
  { id: 'family', label: '子連れ・ファミリー' },
];

export default function PlanForm({
  destination,
  nights,
  people,
  theme,
  onChange,
  onSubmit,
  disabled,
}) {
  function handleSubmit(event) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <section className="hero">
      <h2 className="hero__title">どこへ行きたいですか？</h2>
      <p className="hero__lead">
        行き先と旅行の条件（泊数・人数・テーマ）を選んで「プランを作成」を押すと、AIがおすすめの旅行プランをご提案します。
      </p>

      <form className="planform" onSubmit={handleSubmit}>
        <label className="planform__label" htmlFor="destination">
          行き先
        </label>
        <div className="planform__row">
          <input
            id="destination"
            className="planform__input"
            type="text"
            placeholder="例: 京都、札幌、沖縄 …"
            value={destination}
            onChange={(e) => onChange({ destination: e.target.value })}
            disabled={disabled}
            autoComplete="off"
          />
        </div>
        <div className="planform__examples">
          {['京都', '札幌', '沖縄', '金沢'].map((city) => (
            <button
              key={city}
              type="button"
              className="chip"
              onClick={() => onChange({ destination: city })}
              disabled={disabled}
            >
              {city}
            </button>
          ))}
        </div>

        <div className="planform__conditions">
          <div className="planform__field">
            <label className="planform__label" htmlFor="nights">
              泊数（日数）
            </label>
            <select
              id="nights"
              className="planform__select"
              value={nights}
              onChange={(e) => onChange({ nights: Number(e.target.value) })}
              disabled={disabled}
            >
              {NIGHT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="planform__field">
            <label className="planform__label" htmlFor="people">
              人数
            </label>
            <div className="stepper">
              <button
                type="button"
                className="stepper__btn"
                aria-label="人数を減らす"
                onClick={() => onChange({ people: Math.max(1, people - 1) })}
                disabled={disabled || people <= 1}
              >
                −
              </button>
              <input
                id="people"
                className="stepper__input"
                type="number"
                min="1"
                max="20"
                value={people}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n)) {
                    onChange({ people: Math.min(20, Math.max(1, Math.round(n))) });
                  }
                }}
                disabled={disabled}
              />
              <span className="stepper__unit" aria-hidden="true">
                名
              </span>
              <button
                type="button"
                className="stepper__btn"
                aria-label="人数を増やす"
                onClick={() => onChange({ people: Math.min(20, people + 1) })}
                disabled={disabled || people >= 20}
              >
                ＋
              </button>
            </div>
          </div>

          <div className="planform__field planform__field--theme">
            <label className="planform__label" htmlFor="theme">
              旅行テーマ
            </label>
            <select
              id="theme"
              className="planform__select"
              value={theme}
              onChange={(e) => onChange({ theme: e.target.value })}
              disabled={disabled}
            >
              {THEME_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button className="planform__button planform__button--full" type="submit" disabled={disabled}>
          {disabled ? '作成中…' : 'プランを作成'}
        </button>
      </form>
    </section>
  );
}
