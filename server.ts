import express from 'express';
import type { Request, Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const API_BASES = [
  'https://arena.rone.dev/api',
  'https://arena.fastapicloud.dev/api',
];

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000;

async function fetchFromRoneArena(endpointWithQuery: string): Promise<unknown> {
  const cached = cache.get(endpointWithQuery);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  let lastError: Error | null = null;

  for (const base of API_BASES) {
    const targetUrl = `${base}${endpointWithQuery}`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const response = await fetch(targetUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'DawnCodex-MLBB-Guide/1.0',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        lastError = new Error(`Upstream HTTP ${response.status} from ${targetUrl}`);
        continue;
      }

      const json = await response.json();
      cache.set(endpointWithQuery, {
        data: json,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return json;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error('Failed to fetch from Rone Arena API');
}

async function startServer() {
  const app = express();

  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, cachedEndpoints: cache.size });
  });

  app.get('/api/mlbb/*', async (req: Request, res: Response) => {
    try {
      const subPath = req.params[0] || '';
      const queryIndex = req.originalUrl.indexOf('?');
      const queryString = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : '';
      const endpointWithQuery = `/${subPath}${queryString}`;

      const data = await fetchFromRoneArena(endpointWithQuery);
      res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upstream error';
      res.status(502).json({
        code: 502,
        message: 'Gagal memuat data dari Rone Arena API',
        error: message,
      });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  const distPath = path.resolve(__dirname, 'dist');

  if (!isProd || !fs.existsSync(distPath)) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dawn Codex server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
