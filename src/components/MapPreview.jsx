import { useMemo } from 'react';

// 旅行マップのプレビュー（スプリント9 / 機能16）。
// 外部地図APIやキーは使わず、プラン内スポットの「位置関係」を自前のSVGで描く。
// 正確な実地理座標ではなく、各スポットを番号付きピン＋ラベルとして配置し、
// 訪問順をルート線でつなぐ「地図的なプレビュー」。スポット名のラベルを必ず表示する。

// 文字列から決定的な擬似乱数（0〜1）を作る簡易ハッシュ。
// 同じスポット名なら毎回同じ位置に配置され、リロードしても安定する。
function hash01(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // 符号なし32bit → 0〜1 に正規化。
  return ((hash >>> 0) % 100000) / 100000;
}

const VIEW_W = 600;
const VIEW_H = 380;
const MARGIN = 56;

// 日ごとの線・ピンの色（最大6色で循環）。
const DAY_COLORS = ['#1f8a8a', '#f2994a', '#6a67ce', '#d6526f', '#2f9e6f', '#c0892a'];

// プランの全スポットを { dayIndex, spotIndex, name, x, y, order } に変換する。
// 行き先・スポット名・日・順序からシードを散らし、被りにくい座標へ決定的に配置する。
function buildPoints(destination, days) {
  const points = [];
  let globalOrder = 0;
  days.forEach((day, di) => {
    (day.spots || []).forEach((spot, si) => {
      globalOrder += 1;
      const seedBase = `${destination}|${di}|${si}|${spot.name || ''}`;
      const rx = hash01(`${seedBase}|x`);
      const ry = hash01(`${seedBase}|y`);
      const x = MARGIN + rx * (VIEW_W - MARGIN * 2);
      const y = MARGIN + ry * (VIEW_H - MARGIN * 2);
      points.push({
        dayIndex: di,
        spotIndex: si,
        name: spot.name || `スポット${si + 1}`,
        order: globalOrder,
        x,
        y,
      });
    });
  });
  return points;
}

export default function MapPreview({ destination, days }) {
  const points = useMemo(() => buildPoints(destination || '', days || []), [destination, days]);

  // 日ごとにグルーピングして、同じ日のスポット同士をルート線でつなぐ。
  const dayGroups = useMemo(() => {
    const groups = [];
    points.forEach((p) => {
      if (!groups[p.dayIndex]) groups[p.dayIndex] = [];
      groups[p.dayIndex].push(p);
    });
    return groups;
  }, [points]);

  if (points.length === 0) {
    return (
      <section className="mappreview" aria-label="旅行マップのプレビュー" data-testid="map-preview">
        <h3 className="mappreview__title">
          <span aria-hidden="true">🗺</span> 旅行マッププレビュー
        </h3>
        <p className="mappreview__empty">
          表示できるスポットがありません。プランを生成するとスポットの位置関係が表示されます。
        </p>
      </section>
    );
  }

  return (
    <section className="mappreview" aria-label="旅行マップのプレビュー" data-testid="map-preview">
      <h3 className="mappreview__title">
        <span aria-hidden="true">🗺</span> 旅行マッププレビュー
        <span className="mappreview__hint">
          （{destination} の{points.length}スポットの位置関係イメージ）
        </span>
      </h3>
      <p className="mappreview__note">
        ※ スポットの位置関係を直感的につかむためのイメージ図です（実際の地理座標ではありません）。番号は訪問順、線は日ごとの移動ルートを示します。
      </p>

      <div className="mappreview__canvas-wrap">
        <svg
          className="mappreview__svg"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="img"
          aria-label={`${destination}のスポット位置関係プレビュー。${points.length}地点を表示。`}
          data-testid="map-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* 背景 */}
          <rect x="0" y="0" width={VIEW_W} height={VIEW_H} rx="14" className="mappreview__bg" />
          {/* 方眼グリッド（地図的な見た目のため） */}
          <g className="mappreview__grid">
            {Array.from({ length: 7 }).map((_, i) => (
              <line
                key={`v${i}`}
                x1={(VIEW_W / 6) * i}
                y1="0"
                x2={(VIEW_W / 6) * i}
                y2={VIEW_H}
              />
            ))}
            {Array.from({ length: 5 }).map((_, i) => (
              <line
                key={`h${i}`}
                x1="0"
                y1={(VIEW_H / 4) * i}
                x2={VIEW_W}
                y2={(VIEW_H / 4) * i}
              />
            ))}
          </g>

          {/* 日ごとのルート線（同じ日のスポットを訪問順につなぐ） */}
          {dayGroups.map((group, di) => {
            if (!group || group.length < 2) return null;
            const color = DAY_COLORS[di % DAY_COLORS.length];
            const d = group
              .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
              .join(' ');
            return (
              <path
                key={`route-${di}`}
                d={d}
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeDasharray="6 5"
                strokeLinecap="round"
                opacity="0.7"
                data-testid={`map-route-${di + 1}`}
              />
            );
          })}

          {/* スポットのピン＋番号＋ラベル */}
          {points.map((p) => {
            const color = DAY_COLORS[p.dayIndex % DAY_COLORS.length];
            // ラベルが端で切れないよう、右寄り/左寄りを座標で切り替える。
            const labelOnLeft = p.x > VIEW_W - 150;
            const labelX = labelOnLeft ? p.x - 14 : p.x + 14;
            const anchor = labelOnLeft ? 'end' : 'start';
            return (
              <g key={`pin-${p.dayIndex}-${p.spotIndex}`} data-testid="map-pin">
                <circle cx={p.x} cy={p.y} r="13" fill={color} stroke="#ffffff" strokeWidth="2.5" />
                <text
                  x={p.x}
                  y={p.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="mappreview__pin-number"
                >
                  {p.order}
                </text>
                <text
                  x={labelX}
                  y={p.y}
                  textAnchor={anchor}
                  dominantBaseline="central"
                  className="mappreview__pin-label"
                  data-testid="map-label"
                >
                  {p.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* SVG が読めない場合の補助として、スポット名のラベル一覧も併記する */}
      <ol className="mappreview__legend" aria-label="スポット一覧">
        {points.map((p) => (
          <li className="mappreview__legend-item" key={`legend-${p.dayIndex}-${p.spotIndex}`}>
            <span
              className="mappreview__legend-dot"
              style={{ background: DAY_COLORS[p.dayIndex % DAY_COLORS.length] }}
              aria-hidden="true"
            >
              {p.order}
            </span>
            <span className="mappreview__legend-day">{p.dayIndex + 1}日目</span>
            <span className="mappreview__legend-name">{p.name}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
