import { useEffect, useRef } from 'react';

// 使い方の3ステップ案内。
const STEPS = [
  {
    icon: '📍',
    title: '1. 行き先を入力',
    text: '京都・札幌・沖縄など、行きたい都道府県や都市を入力します。下のサンプルから選んでもOK。',
  },
  {
    icon: '🎛️',
    title: '2. 条件を選ぶ',
    text: '泊数（日帰り〜5泊6日）・人数・テーマ（グルメ／自然／歴史／温泉ほか）を選びます。',
  },
  {
    icon: '✨',
    title: '3. プランを作成',
    text: '「プランを作成」を押すと、日別タイムライン・予算の目安・持ち物リスト・マップ付きのプランが完成します。',
  },
];

// 入力例（サンプル）。クリックでフォームへ反映して案内を閉じる。
const SAMPLES = [
  { destination: '京都', nights: 2, theme: 'history', label: '京都で2泊3日・歴史めぐり' },
  { destination: '札幌', nights: 1, theme: 'gourmet', label: '札幌で1泊2日・グルメ旅' },
  { destination: '箱根', nights: 1, theme: 'onsen', label: '箱根で1泊2日・温泉でゆったり' },
];

const THEME_LABELS = {
  standard: 'おまかせ（王道）',
  gourmet: 'グルメ',
  nature: '自然',
  history: '歴史',
  onsen: '温泉',
  family: '子連れ・ファミリー',
};

export default function Onboarding({ onClose, onTrySample }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    // 開いた直後に閉じるボタンへフォーカスを移し、Esc で閉じられるようにする。
    if (closeRef.current) closeRef.current.focus();
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function handleSample(sample) {
    if (onTrySample) {
      onTrySample({
        destination: sample.destination,
        nights: sample.nights,
        theme: sample.theme,
      });
    }
    onClose();
  }

  return (
    <div
      className="onboarding__overlay"
      role="presentation"
      data-testid="onboarding"
      onMouseDown={(e) => {
        // オーバーレイ（ダイアログ外）クリックで閉じる。
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="onboarding"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        ref={dialogRef}
      >
        <button
          type="button"
          className="onboarding__close"
          aria-label="案内を閉じる"
          data-testid="onboarding-close"
          ref={closeRef}
          onClick={onClose}
        >
          ✕
        </button>

        <div className="onboarding__header">
          <span className="onboarding__mark" aria-hidden="true">✈️</span>
          <h2 id="onboarding-title" className="onboarding__title">
            たびナビへようこそ
          </h2>
          <p className="onboarding__lead">
            行き先を入力するだけで、AIがあなたの国内旅行プランをまるごとご提案します。使い方はかんたん3ステップ。
          </p>
        </div>

        <ol className="onboarding__steps">
          {STEPS.map((step) => (
            <li key={step.title} className="onboarding__step">
              <span className="onboarding__step-icon" aria-hidden="true">{step.icon}</span>
              <div className="onboarding__step-body">
                <h3 className="onboarding__step-title">{step.title}</h3>
                <p className="onboarding__step-text">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="onboarding__samples">
          <p className="onboarding__samples-title">入力例から試す</p>
          <div className="onboarding__samples-list">
            {SAMPLES.map((sample) => (
              <button
                key={sample.label}
                type="button"
                className="onboarding__sample"
                data-testid="onboarding-sample"
                onClick={() => handleSample(sample)}
              >
                <span className="onboarding__sample-label">{sample.label}</span>
                <span className="onboarding__sample-meta">
                  {sample.destination}・{sample.nights}泊{sample.nights + 1}日・{THEME_LABELS[sample.theme]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="onboarding__footer">
          <button
            type="button"
            className="onboarding__start"
            data-testid="onboarding-start"
            onClick={onClose}
          >
            はじめる
          </button>
        </div>
      </div>
    </div>
  );
}
