# 進捗

## 技術スタック（スプリント1でジェネレーターが決定）
- 言語 / ランタイム: JavaScript (ES Modules) / Node.js v22
- 主要フレームワーク・ライブラリ:
  - フロントエンド: React 18 + Vite 5
  - バックエンド: Express 4（API + ビルド済みフロントの配信）
  - 開発時: concurrently（Vite と Express の同時起動）
- データストア: なし（仕様によりDB・認証なし。スプリント1ではブラウザ内状態のみ）
- AIプラン生成:
  - `ANTHROPIC_API_KEY` が設定されていれば Claude API（`server/planGenerator.js`）を呼び出す主経路
  - 未設定時は入力に応じて内容が変化するサーバー側モック生成にフォールバック（サンプル生成モード）
  - 既定モデル: `claude-opus-4-20250514`（`ANTHROPIC_MODEL` で変更可能）
  - スプリント2より `generatePlan({ destination, nights, people, theme })` を受け取り、泊数に応じた日数分（1日目・2日目…）の内容と、テーマ別の語彙、人数を本文に反映する（モック・実APIの両経路で対応）
  - テーマ一覧は `server/planGenerator.js` の `THEMES` を唯一の定義とし、`GET /api/options` で参照可能（フロントの選択肢と対応）
  - スプリント3より戻り値に `structuredDays`（日ごとの spots 配列。各 spot は `{ time, order, name, description, tags }`）を追加。`days` は構造化データの日数に一致。`planText` は構造化データから組み立てた後方互換用の本文（◆ N日目形式）として併存。
  - スプリント4より各 spot に詳細フィールド `highlight`（おすすめポイント）・`stay`（滞在目安・所要時間）を追加（モック・実APIの両経路で生成。実APIは `highlight`/`stay` をJSONで依頼し、欠落時は穏当に補完）。スポットはタイムライン上でクリック／展開（アコーディオン）すると説明・おすすめポイント・滞在目安を表示する。
  - スプリント5よりプランの編集（削除・並べ替え）はフロントエンドの状態管理で実装（サーバー・API は変更なし）。`PlanResult` が `plan.structuredDays` を編集可能なローカル状態 `editableDays` として保持し、各 spot に安定 `uid` を付与。`plan` が変化したとき（新規生成・再生成）のみリセットし、スクロール・日タブ切り替えなどの非生成操作では編集状態を保持する。削除（その日から除去）、上下移動（日内入れ替え／日内の端では隣の日へ移す日程間入れ替え）に対応。日見出しの件数（「N件」）・日タブの件数・「全Nスポット」表示は編集結果から都度再計算され整合する。日番号「N日目」は日インデックスから再計算され、削除で日が空になっても連番を維持（空の日は「すべて削除されました」を表示）。
  - スプリント6よりお気に入り＋プランの保存・復元をブラウザ内（localStorage）で実装（サーバー・API は変更なし）。永続化ヘルパーは `src/lib/storage.js`（`FAVORITES_KEY`=`tabinavi.favorites.v1` / `SAVED_PLAN_KEY`=`tabinavi.savedPlan.v1`、localStorage 不可環境でも例外で落ちないよう握りつぶす）。
    - お気に入り: `src/hooks/useFavorites.js`（行き先＋スポット名で安定キー `favoriteKey`）。各スポットに ☆/★ トグル（`DayTimeline`、`spot__fav--on` で視覚変化）。一覧は折りたたみ式パネル `src/components/FavoritesPanel.jsx`（件数表示・個別解除・全解除）。お気に入りは localStorage に常時同期。
    - 保存・復元: スプリント5の `editableDays`（編集後の並び順・削除を反映）を保存対象に取り込むため、`editableDays`/`setEditableDays` を `App` に巻き上げ（`PlanResult` は props で受け取り、編集ハンドラの挙動はスプリント5と同一）。「💾 このプランを保存」で `editableDays` を uid 除去・日番号連番化して `structuredDays` に戻し、`plan` のメタ（destination/nights/people/theme/themeLabel/mode/planText）と合わせてスナップショット保存。
    - **自動復元はしない**（スプリント1の「リロードで初期状態に戻る」を維持）。リロード後はトップが初期状態のまま、保存があればトップに「保存済みプラン」一覧が出て、各プランの「開く」で明示的に復元。復元時は `plan` を差し替え → `App` の `useEffect([plan])` が `editableDays` を保存済み構造から再構築するため、保存時点の並び順・削除状態が反映される。
  - スプリント7より複数プランの管理（一覧／開く／名前変更／削除）をブラウザ内（localStorage）で実装（サーバー・API は変更なし）。
    - 保存キーを単一スロット `tabinavi.savedPlan.v1`（スプリント6）から配列 `tabinavi.savedPlans.v1`（`SAVED_PLANS_KEY`）へ拡張。
    - 管理フック `src/hooks/useSavedPlans.js`: 各エントリは `{ id, name, savedAt, ...snapshot }`。`addPlan`（先頭追加）・`renamePlan`（空名は無視）・`deletePlan`・`getPlan` を提供。`defaultPlanName(snapshot)` は「行き先（N泊）」を既定名にする。
    - **移行**: 初回マウント時にスプリント6の単一保存 `tabinavi.savedPlan.v1` が残っていれば配列の先頭へ取り込み、旧キーを削除（二重表示・再移行を防止）。スプリント6で保存したプランは消えずに一覧へ引き継がれる。
    - 一覧UI `src/components/SavedPlansPanel.jsx`（折りたたみ式・件数表示）: 各プランの名前・行き先・主要条件（泊数/人数/テーマ/スポット数）・保存時刻を表示。「開く」「名前変更」（インラインinput、Enter確定/Escape取消）「削除」を備える。現在表示中のプランには「表示中」バッジ。
    - 「💾 このプランを保存」は `window.prompt` で名前を尋ねつつ（キャンセルで中断、空入力時は既定名）、編集後の `editableDays` を `structuredDays` に戻したスナップショットを新規エントリとして一覧に追加する（毎回別エントリ。異なる条件のプランを複数件保持できる）。
    - **自動復元はしない**方針を維持（スプリント1）。リロード後もトップは初期状態で、保存済み一覧のみ表示される。一覧から「開く」を押して初めて当該プランを画面に復元する。
  - スプリント8よりエクスポート（機能13）と予算の目安（機能14）を実装（サーバー・API は変更なし。フロント完結）。
    - エクスポート: `src/lib/export.js`。`buildPlanText(plan, days)` が表示中プラン（編集後の `editableDays` 由来の `days`）から、行き先・日程・各日のスポット名（時刻・タグ・説明含む）を含むプレーンテキストを組み立てる。`copyToClipboard()`（`navigator.clipboard` → `execCommand('copy')` フォールバック）と `downloadText()`（Blob→aタグ）を提供。`PlanResult` のアクション群に「📋 コピー」（`data-testid="copy-plan"`）と「⬇️ ダウンロード」（`data-testid="download-plan"`）を追加。実行すると `result__export-toast`（`data-testid="export-toast"`、4秒で自動消滅）にコピー成功／ダウンロード完了が表示され、Playwright で観測可能。
    - 予算の目安: `src/lib/budget.js` の `estimateBudget(plan, days)` が移動・宿泊・食事・観光の内訳と合計・1名あたりを算出。**泊数・人数・表示中スポット数に比例**（移動=単価×人数、宿泊=単価×泊数×人数、食事=単価×日数×人数、観光=単価×スポット数×人数）。`src/components/BudgetEstimate.jsx`（`data-testid="budget-estimate"`、各内訳 `data-testid="budget-amount-<key>"`、合計 `data-testid="budget-total"`）が `PlanResult` 内に常時表示。条件を変えて生成（または編集でスポット数が変化）すると金額も変わる。モック・実API両経路でフロント側計算のため破綻しない。
  - スプリント9より持ち物・準備リスト（機能15）と旅行マッププレビュー（機能16）を実装（サーバー・API は変更なし。フロント完結。外部地図APIやキーは不使用）。
    - 持ち物・準備リスト: `src/lib/packing.js` の `buildPackingList(plan)` が plan のメタ（destination/theme/themeLabel/nights/people、任意で month）から項目を導出。セクション構成は「基本の持ち物」「テーマ別」「泊数・人数別」（month 指定時は「季節別」も追加）。テーマで項目が変わる（温泉→タオル/着替え、自然→歩きやすい靴/虫除け、歴史→脱ぎ履きしやすい靴/小銭、ファミリー→子ども用品 等）。`src/components/PackingChecklist.jsx`（`data-testid="packing-checklist"`、各項目 `data-testid="packing-item"`・チェックボックス `data-testid="packing-check-<itemId>"`、進捗 `data-testid="packing-progress"`）。チェックは独自見た目（`packing__box`、`packing__item--checked` で視覚変化）。チェック状態は `src/hooks/usePackingChecks.js`＋localStorage（`PACKING_CHECKS_KEY`=`tabinavi.packingChecks.v1`、行き先＋テーマをスコープにしたマップ）で保持。`PlanResult` 内に常時表示。
    - マッププレビュー: `src/components/MapPreview.jsx`（`data-testid="map-preview"`、SVG `data-testid="map-svg"`、各ピン `data-testid="map-pin"`、各ラベル `data-testid="map-label"`、日ごとのルート線 `data-testid="map-route-<dayNum>"`）。外部APIを使わず自前のSVGで描画。スポット名・行き先・日・順序から決定的な擬似乱数（FNVハッシュ）で座標を散らし、番号付きピン＋スポット名ラベルを配置、同じ日のスポットを訪問順にルート線（破線）でつなぐ。SVGが読めない環境向けにスポット名一覧（`mappreview__legend`）も併記。表示中の編集後 `days` を使うため、削除・並べ替えがマップにも反映される。
  - スプリント10よりオンボーディング／使い方ガイド（機能18）と全体デザイン仕上げを実装（サーバー・API は変更なし。フロント完結）。
    - オンボーディング: `src/components/Onboarding.jsx`（モーダルオーバーレイ、`data-testid="onboarding"`、閉じる `data-testid="onboarding-close"` / 「はじめる」 `data-testid="onboarding-start"`、入力例 `data-testid="onboarding-sample"`）。使い方3ステップ（行き先入力→条件選択→プラン作成）と入力例（京都/歴史・札幌/グルメ・箱根/温泉）を提示。入力例クリックでフォームへ条件反映して閉じる（自動生成はしない）。Esc・オーバーレイ外クリック・✕・「はじめる」で閉じる。開いた直後に閉じるボタンへフォーカス。
    - 表示制御フック `src/hooks/useOnboarding.js`: localStorage の `ONBOARDING_KEY`=`tabinavi.onboardingSeen.v1` に「見終えた」フラグ（boolean）だけを保持。**初回訪問（未読）時のみ自動表示**し、閉じると `true` を記録して2回目以降は自動表示しない。`reopen()` でいつでも再表示可能。ヘッダーに「❓使い方」ボタン（`data-testid="open-onboarding"`）を常設し、`onboarding.reopen` を呼ぶ。
    - **スプリント1の「リロードで初期状態のトップ画面に戻る」を維持**: オンボーディングはプランや入力状態に一切触れない。永続化するのは「見終えたか」のフラグのみ。リロード後はトップが初期状態（入力欄が空）のまま、案内も自動表示されない（初回を除く）。
    - デザイン仕上げ: 既存のデザイントークン（`global.css` の `:root` 変数。配色＝teal `--color-primary` ＋ orange `--color-accent`、余白 `--space`、角丸 `--radius`、影 `--shadow`/`--shadow-soft`、表示用フォント `--font-display`=Zen Maru Gothic / 本文 `--font`=Noto Sans JP）を全画面（トップ／生成中／結果／お気に入り・保存・複数管理／予算／持ち物／マップ／オンボーディング）で一貫使用。日本語フォントのフォールバック（system-ui, sans-serif）を明示済み。ヘッダーは brand + 「使い方」ボタンの flex レイアウト。レスポンシブ（`@media (max-width: 600px)`）で主要操作中もレイアウト破綻なし（デスクトップ/モバイル幅とも横 overflow=0px を確認）。
  - タグはテーマ由来の基底タグ + 人数・日の位置・行き先シード由来のアクセントタグで動的に決まる（固定の単一タグにしない。通常2〜4個）。
  - 実APIは構造化 JSON 出力を依頼し `parseStructuredFromText()` でパース。失敗時はモックの構造化データで補完しつつ生テキストを本文に使う（UI が常にタイムラインを描ける）。
- 起動コマンド:
  - **推奨（エバリュエーター向け・単一プロセス）**: `npm install && npm start`
    - `npm start` は `vite build` を実行後、Express が `dist/` の静的ファイルと API を同一ポートで配信する
  - 開発用（任意・ホットリロード）: `npm run dev`（Vite=5173, Express=5180、Vite が `/api` を Express にプロキシ）
- アプリのURL:
  - `npm start` 使用時: **http://localhost:5180/**
  - `npm run dev` 使用時: http://localhost:5173/

### 環境変数 / シークレット
- ルートの `.env`（任意）に `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` / `PORT` を設定可能。
- `.env` は `.gitignore` 済み。`.env.example` をテンプレートとして同梱。
- キーをソースにハードコードしていない。キー未設定でもサンプル生成モードで全受け入れ基準を満たす。

## スプリント状況
| スプリント | 状態 | 試行回数 | 最終更新 |
|---|---|---|---|
| 1 | DONE（エバリュエーター PASS 4/4） | 1 | 2026-06-01 |
| 2 | DONE（エバリュエーター PASS 5/5） | 1 | 2026-06-01 |
| 3 | DONE（エバリュエーター PASS 4/4） | 1 | 2026-06-01 |
| 4 | DONE（エバリュエーター PASS 4/4） | 1 | 2026-06-01 |
| 5 | DONE（エバリュエーター PASS 4/4） | 1 | 2026-06-01 |
| 6 | DONE（エバリュエーター PASS 4/4） | 1 | 2026-06-01 |
| 7 | DONE（エバリュエーター PASS 5/5） | 1 | 2026-06-01 |
| 8 | DONE（エバリュエーター PASS 4/4） | 1 | 2026-06-01 |
| 9 | DONE（エバリュエーター PASS 4/4） | 1 | 2026-06-01 |
| 10 | DONE（エバリュエーター PASS 4/4） | 1 | 2026-06-01 |
