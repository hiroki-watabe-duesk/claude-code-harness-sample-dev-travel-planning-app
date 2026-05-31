import express from 'express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { generatePlan, THEMES } from './planGenerator.js';

// .env を依存ライブラリなしで読み込む（存在すれば）。
function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5180;

app.use(express.json());

app.post('/api/plan', async (req, res) => {
  const body = req.body || {};
  const destination = (body.destination ? String(body.destination) : '').trim();

  if (!destination) {
    res.status(400).json({ error: '行き先を入力してください。' });
    return;
  }

  try {
    const result = await generatePlan({
      destination,
      nights: body.nights,
      people: body.people,
      theme: body.theme,
    });
    res.json(result);
  } catch (err) {
    console.error('プラン生成に失敗しました:', err);
    res.status(502).json({ error: 'プランの生成に失敗しました。しばらくしてからもう一度お試しください。' });
  }
});

// フロントが選択肢（テーマ等）を取得するためのエンドポイント。
app.get('/api/options', (_req, res) => {
  res.json({ themes: THEMES });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mode: process.env.ANTHROPIC_API_KEY ? 'live' : 'mock' });
});

// ビルド済みフロントエンドを配信（本番／start 経由）。
const distDir = path.resolve(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  const mode = process.env.ANTHROPIC_API_KEY ? '実API（Claude）モード' : 'サンプル生成モード（モック）';
  console.log(`たびナビ サーバー起動: http://localhost:${PORT}  [${mode}]`);
});
