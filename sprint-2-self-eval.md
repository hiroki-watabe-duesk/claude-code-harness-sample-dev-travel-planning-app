# スプリント2 自己評価

対象: 機能2（旅行条件の入力 — 泊数・人数・テーマ）
実行モード: サンプル生成モード（モック / `ANTHROPIC_API_KEY` 未設定）
起動コマンド: `npm install && npm start`
アプリURL: http://localhost:5180/
検証日: 2026-06-01

## 実装サマリ
- `server/planGenerator.js`
  - `generatePlan()` を `{ destination, nights, people, theme }` を受け取る形に拡張（文字列引数も後方互換で許容）。
  - 泊数 `nights` から日数 `days = nights + 1` を算出し、**日数分（1日目・2日目…）のセクション**をモック本文に生成。
  - テーマ別の語彙テーブル `THEME_CONTENT`（standard/gourmet/nature/history/onsen/family）で、テーマを変えると午前・昼・午後・夕方の文面が変わる。
  - 人数を `party`（ひとり旅/2名/N名のグループ）として本文・見出しに反映。
  - 実API経路（Claude）も泊数・人数・テーマをプロンプトに織り込み、「◆ N日目」形式の日別出力を指示。
  - テーマ一覧 `THEMES` を export し、`server/index.js` の `GET /api/options` で公開。
- `server/index.js`：`POST /api/plan` が `nights/people/theme` を受け取り `generatePlan()` へ受け渡し。`GET /api/options` を追加。
- `src/components/PlanForm.jsx`：泊数（select: 日帰り〜5泊6日）、人数（ステッパー 1〜20名）、テーマ（select 6種）のコントロールを追加。
- `src/App.jsx`：条件を 1 つの state `conditions` で管理し、生成時に API へ送信。
- `src/components/PlanResult.jsx`：条件タグ（泊数・人数・テーマ）を表示し、「◆ N日目」見出しを日別スタイルで描画。
- `src/styles/global.css`：条件コントロールと日別見出し・条件タグのスタイルを追加（レスポンシブ対応含む）。

## 受け入れ基準の結果
| 基準 | ステータス | 備考 / 確認手順 |
|------|-----------|------|
| 行き先に加えて泊数（日数）を選択／入力できるコントロールが表示されている | PASS | フォームに「泊数（日数）」select（日帰り/1泊2日/2泊3日/…/5泊6日）を追加。`#nights` で確認可能。 |
| 人数を指定できるコントロールが表示されている | PASS | 「人数」ステッパー（−/＋ボタン + 数値入力、1〜20名）を追加。`#people`。 |
| 旅行テーマ（複数の選択肢）を選択できるコントロールが表示されている | PASS | 「旅行テーマ」select（おまかせ/グルメ/自然/歴史/温泉/子連れ）を追加。`#theme`。 |
| 泊数を「2泊3日」にして生成すると複数日分（1日目・2日目・3日目）の内容が含まれる | PASS | API 検証: `{nights:2}` で `days=3`、本文に「1日目」「2日目」「3日目」を含み「4日目」は含まない（コマンドで確認済み）。 |
| テーマを「温泉」に変更して再生成すると結果が変更前と異なる | PASS | 同一条件で `theme=standard` と `theme=onsen` の `planText` が不一致、温泉版は「名湯/温泉/湯」を含むことを API で確認。 |

**自己評価 通過率: 5/5**

## 実施した確認（コマンド）
- `npm run build` 成功（34 modules、エラーなし）。
- `node server/index.js` 起動後:
  - `GET /api/health` → `{"ok":true,"mode":"mock"}`
  - `GET /api/options` → themes 6 件を返却
  - `POST /api/plan {destination:"京都",nights:2,people:3,theme:"onsen"}` → `days:3, people:3, themeLabel:"温泉"`、1/2/3日目を含み4日目なし
  - 空 destination → `400`
  - `GET /` → `200`（dist の index.html 配信）
  - standard vs onsen（同一条件）で `planText` 不一致を確認

## 既知の問題 / 補足
- 結果表示は引き続きテキストベース（「◆ N日目」見出し + 本文）。**本格的な日別タイムラインUI（時間帯ごとのカード等）はスプリント3のスコープ**のため本スプリントでは未実装（基準は本文に日別内容が含まれることのみ要求しており充足）。
- テーマ選択肢はフロント（`PlanForm.jsx`）とサーバー（`planGenerator.js` の `THEMES`）の双方に定義。値（id/label）は一致させてあり、サーバー側が唯一の検証元（不正値は `standard` に正規化）。`GET /api/options` でも取得可能だが、起動タイミング依存を避けるためフォームは静的定義を使用。
- 入力の正規化はサーバー側で実施（nights 0〜6、people 1〜20、未知テーマは standard）。
- シークレットのハードコードなし（`ANTHROPIC_API_KEY` は `.env` から読み込み、未設定時はモード `mock`）。
- スプリント1の受け入れ基準（行き先入力→生成→表示、リロードで初期化）はリグレッションなし（生成フロー・ローディング・結果表示の構造は維持）。

## 信頼スコア
総合: 9/10

## エバリュエーターへの引き渡し可否
YES — 全5基準を実装・API/ビルドレベルで確認済み。`npm start` で http://localhost:5180/ から操作可能。
