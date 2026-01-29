import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pino from 'pino';
import path from 'path';
import { fileURLToPath } from 'url';

import patternsRouter from './routes/patterns.js';
import tagsRouter from './routes/tags.js';
import colorsRouter from './routes/colors.js';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
});

const app = express();
const PORT = process.env.PORT || 4571;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDistDir = path.resolve(__dirname, '../client/dist');

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.url }, 'incoming request');
  next();
});

// API Routes
app.use('/api/patterns', patternsRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/colors', colorsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// Serve frontend (production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDistDir));

  // SPA fallback: only for GET requests that expect HTML, and not under /api
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    if (req.method !== 'GET') return next();

    const accept = req.headers.accept || '';
    if (!accept.includes('text/html')) return next();

    res.sendFile(path.join(clientDistDir, 'index.html'));
  });
}

// 404 handler
app.use((req, res) => {
  if (process.env.NODE_ENV === 'production' && !req.path.startsWith('/api')) {
    return res.status(404).send('Not found');
  }

  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(err, 'unhandled error');
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });
});

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});

export default app;
