import { useState } from 'react';

// お気に入りに登録したスポットの一覧を確認できる領域。
// 折りたたみ可能なパネル。登録件数を見出しに表示し、各項目から個別解除できる。
export default function FavoritesPanel({ favorites, onRemove, onClear }) {
  const [open, setOpen] = useState(true);
  const count = favorites.length;

  return (
    <section className="favpanel" aria-label="お気に入りスポット一覧" data-testid="favorites-panel">
      <button
        type="button"
        className="favpanel__head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="favpanel__title">
          <span aria-hidden="true">★</span> お気に入りスポット
          <span className="favpanel__count" data-testid="favorites-count">
            {count}件
          </span>
        </span>
        <span className={`favpanel__chevron${open ? ' favpanel__chevron--open' : ''}`} aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className="favpanel__body">
          {count === 0 ? (
            <p className="favpanel__empty">
              まだお気に入りはありません。タイムライン上の各スポットの「☆」を押すと、ここに追加されます。
            </p>
          ) : (
            <>
              <ul className="favlist">
                {favorites.map((f) => (
                  <li className="favitem" key={f.key} data-testid="favorite-item">
                    <div className="favitem__main">
                      <span className="favitem__star" aria-hidden="true">★</span>
                      <div className="favitem__text">
                        <span className="favitem__name">{f.name}</span>
                        <span className="favitem__meta">
                          {f.destination && <span className="favitem__dest">{f.destination}</span>}
                          {f.tags && f.tags.length > 0 && (
                            <span className="favitem__tags">
                              {f.tags.slice(0, 3).map((t, i) => (
                                <span className="favitem__tag" key={i}>
                                  {t}
                                </span>
                              ))}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="favitem__remove"
                      aria-label={`${f.name}をお気に入りから外す`}
                      title="お気に入りから外す"
                      onClick={() => onRemove(f.key)}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              <div className="favpanel__footer">
                <button type="button" className="favpanel__clear" onClick={onClear}>
                  すべて解除
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
