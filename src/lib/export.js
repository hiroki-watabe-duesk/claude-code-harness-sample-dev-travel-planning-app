// プランのエクスポート（コピー／ダウンロード）用ヘルパー。
// 現在表示中のプラン（編集後の状態 editableDays を反映した days）と
// プランのメタ情報から、行き先・日程・各日のスポット名を含むテキストを組み立てる。

// days は PlanResult の withDayTitles 適用後の配列を想定。
// [{ day, title, spots: [{ time, name, tags, description, ... }] }]
export function buildPlanText(plan, days) {
  const nights = typeof plan.nights === 'number' ? plan.nights : 0;
  const dayCount = Array.isArray(days) ? days.length : 0;
  const durationText = nights === 0 ? '日帰り' : `${nights}泊${dayCount}日`;
  const peopleText = typeof plan.people === 'number' ? `${plan.people}名` : '';
  const themeText = plan.themeLabel || '';

  const lines = [];
  lines.push('========================================');
  lines.push(`たびナビ 旅行プラン`);
  lines.push('========================================');
  lines.push(`行き先: ${plan.destination || ''}`);
  lines.push(`日程: ${durationText}`);
  if (peopleText) lines.push(`人数: ${peopleText}`);
  if (themeText) lines.push(`テーマ: ${themeText}`);
  lines.push('');

  if (Array.isArray(days) && days.length > 0) {
    days.forEach((d, di) => {
      const title = d.title || `${di + 1}日目`;
      lines.push(`■ ${title}`);
      if (Array.isArray(d.spots) && d.spots.length > 0) {
        d.spots.forEach((spot, si) => {
          const time = spot.time ? `${spot.time} ` : `${si + 1}. `;
          const tagText =
            Array.isArray(spot.tags) && spot.tags.length > 0
              ? `［${spot.tags.join('・')}］`
              : '';
          lines.push(`  ${time}${spot.name || ''}${tagText}`);
          if (spot.description) {
            lines.push(`    ${spot.description}`);
          }
        });
      } else {
        lines.push('  （この日のスポットはありません）');
      }
      lines.push('');
    });
  } else if (plan.planText) {
    // 構造化データが無い場合のフォールバック（旧形式 / API 生テキスト）。
    lines.push(plan.planText);
    lines.push('');
  }

  lines.push('----------------------------------------');
  lines.push('たびナビ（AI旅行プランナー）で作成');

  return lines.join('\n');
}

// クリップボードへコピーする。成功可否を boolean で返す。
// navigator.clipboard が使えない環境では execCommand によるフォールバックを試みる。
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // フォールバックへ進む。
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

// テキストをファイルとしてダウンロードさせる（Blob → a タグ）。
export function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 直後に revoke するとブラウザによってはダウンロードが中断されることがあるため遅延させる。
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// 行き先からファイル名に使える文字列を作る。
export function buildFileName(plan) {
  const base = String(plan.destination || 'plan')
    .replace(/[\\/:*?"<>|\s]+/g, '_')
    .slice(0, 40);
  return `tabinavi_${base || 'plan'}.txt`;
}
