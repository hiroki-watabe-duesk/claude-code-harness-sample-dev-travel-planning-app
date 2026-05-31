export default function LoadingState({ destination }) {
  return (
    <section className="loading" role="status" aria-live="polite">
      <div className="loading__spinner" aria-hidden="true">
        <span className="loading__plane">✈️</span>
        <div className="loading__ring" />
      </div>
      <p className="loading__title">
        {destination ? `「${destination}」の旅行プランを作成中…` : '旅行プランを作成中…'}
      </p>
      <p className="loading__hint">AIがおすすめのコースを考えています。少しお待ちください。</p>
    </section>
  );
}
