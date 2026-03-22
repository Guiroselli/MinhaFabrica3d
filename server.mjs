import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const app = express();

app.disable('x-powered-by');

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use(express.static(distDir));

app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

const port = Number(process.env.PORT || 3001);

app.listen(port, () => {
  console.log(`Minha Fabrica3D server running at http://localhost:${port}`);
});
