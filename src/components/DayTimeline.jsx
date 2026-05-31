import { useState } from 'react';

// 1日分のタイムライン表示。
// 時間帯（または順序）・スポット名・タグを縦のタイムライン状に並べる。
// 各スポットはクリック／展開で詳細（説明・おすすめポイント・滞在目安）を開閉できる（アコーディオン）。
// スプリント5より、各スポットに削除・上下移動（並べ替え）の編集操作を備える。
export default function DayTimeline({
  day,
  dayIndex,
  totalDays,
  isActive,
  destination,
  favorites,
  registerRef,
  onDeleteSpot,
  onMoveUp,
  onMoveDown,
}) {
  // 展開中のスポット。並べ替え・削除後もずれないよう uid で管理する。null は全て閉じた状態。
  const [openUid, setOpenUid] = useState(null);

  function toggle(uid) {
    setOpenUid((prev) => (prev === uid ? null : uid));
  }

  const spotCount = day.spots.length;
  const isFirstDay = dayIndex === 0;
  const isLastDay = dayIndex === totalDays - 1;

  return (
    <section
      className={`dayblock${isActive ? ' dayblock--active' : ''}`}
      ref={registerRef}
      aria-label={`${day.title}の行程`}
    >
      <h3 className="dayblock__title">
        <span className="dayblock__badge" aria-hidden="true">
          {day.day}
        </span>
        <span>{day.title}</span>
        <span className="dayblock__count" data-testid={`day-count-${day.day}`}>
          {spotCount}件
        </span>
      </h3>

      {spotCount === 0 ? (
        <p className="dayblock__empty">この日のスポットはすべて削除されました。</p>
      ) : (
        <ol className="timeline">
          {day.spots.map((spot, index) => {
            const isOpen = openUid === spot.uid;
            const detailId = `spot-detail-${day.day}-${index}`;
            // 上端（先頭日の先頭スポット）/ 下端（最終日の末尾スポット）では移動不可。
            const canMoveUp = !(isFirstDay && index === 0);
            const canMoveDown = !(isLastDay && index === spotCount - 1);
            const isFav = favorites ? favorites.isFavorite(destination, spot.name) : false;
            return (
              <li className="timeline__item" key={spot.uid}>
                <div className="timeline__time">{spot.time || `${spot.order ?? index + 1}`}</div>
                <div className="timeline__marker" aria-hidden="true">
                  <span className="timeline__dot" />
                </div>
                <div className={`timeline__content${isOpen ? ' timeline__content--open' : ''}`}>
                  <button
                    type="button"
                    className="spot__header"
                    onClick={() => toggle(spot.uid)}
                    aria-expanded={isOpen}
                    aria-controls={detailId}
                  >
                    <span className="spot__heading">
                      <span className="timeline__name">{spot.name}</span>
                      {spot.tags && spot.tags.length > 0 && (
                        <ul className="spottags">
                          {spot.tags.map((tag, ti) => (
                            <li className="spottag" key={ti}>
                              {tag}
                            </li>
                          ))}
                        </ul>
                      )}
                    </span>
                    <span className={`spot__chevron${isOpen ? ' spot__chevron--open' : ''}`} aria-hidden="true">
                      ▾
                    </span>
                  </button>

                  <div className="spot__edit" role="group" aria-label={`${spot.name}の編集`}>
                    <button
                      type="button"
                      className={`spot__fav${isFav ? ' spot__fav--on' : ''}`}
                      aria-label={isFav ? `${spot.name}をお気に入りから外す` : `${spot.name}をお気に入りに追加`}
                      aria-pressed={isFav}
                      title={isFav ? 'お気に入りから外す' : 'お気に入りに追加'}
                      data-testid="fav-toggle"
                      onClick={() =>
                        favorites &&
                        favorites.toggleFavorite({
                          destination,
                          name: spot.name,
                          description: spot.description,
                          time: spot.time,
                          tags: spot.tags,
                        })
                      }
                    >
                      <span aria-hidden="true">{isFav ? '★' : '☆'}</span>
                      <span className="spot__fav-text">{isFav ? 'お気に入り済' : 'お気に入り'}</span>
                    </button>
                    <button
                      type="button"
                      className="spot__edit-btn"
                      aria-label={`${spot.name}を上へ移動`}
                      title="上へ移動"
                      onClick={() => onMoveUp(dayIndex, index)}
                      disabled={!canMoveUp}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="spot__edit-btn"
                      aria-label={`${spot.name}を下へ移動`}
                      title="下へ移動"
                      onClick={() => onMoveDown(dayIndex, index)}
                      disabled={!canMoveDown}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="spot__edit-btn spot__edit-btn--delete"
                      aria-label={`${spot.name}を削除`}
                      title="削除"
                      onClick={() => onDeleteSpot(dayIndex, index)}
                    >
                      🗑 削除
                    </button>
                  </div>

                  {isOpen && (
                    <div className="spot__detail" id={detailId} role="region" aria-label={`${spot.name}の詳細`}>
                      {spot.description && (
                        <div className="spot__detail-row">
                          <span className="spot__detail-label">説明</span>
                          <p className="spot__detail-text">{spot.description}</p>
                        </div>
                      )}
                      {spot.highlight && (
                        <div className="spot__detail-row">
                          <span className="spot__detail-label">おすすめポイント</span>
                          <p className="spot__detail-text">{spot.highlight}</p>
                        </div>
                      )}
                      {spot.stay && (
                        <div className="spot__detail-row">
                          <span className="spot__detail-label">滞在目安</span>
                          <p className="spot__detail-text">{spot.stay}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
