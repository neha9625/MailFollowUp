/**
 * Gmail Email Follow-up Automation System — Express server.
 * Gmail-only. No Outlook, no Microsoft Graph anywhere in this project.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { initializeDatabase, pool } = require('./src/config/database');
const { authMiddleware } = require('./src/middleware/authMiddleware');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');

const excelRoutes = require('./src/routes/excelRoutes');
const gmailRoutes = require('./src/routes/gmailRoutes');
const templateRoutes = require('./src/routes/templateRoutes');
const automationRoutes = require('./src/routes/automationRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const emailLogRoutes = require('./src/routes/emailLogRoutes');

const app = express();
app.set('trust proxy', 1); // behind reverse proxies (nginx, previews)

/* ── Security middleware ─────────────────────────────────────────────────── */
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  })
);
const corsOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin(origin, cb) {
      // allow same-origin/no-origin (curl, server-to-server) and listed origins
      if (!origin || corsOrigins.includes('*') || corsOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

/* ── Global API rate limiting ────────────────────────────────────────────── */
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests, please slow down.' },
    },
  })
);

/* ── Routes ──────────────────────────────────────────────────────────────── */
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ success: true, data: { status: 'ok', database: 'ok', time: new Date().toISOString() } });
  } catch (err) {
    res.status(503).json({ success: false, error: { code: 'DB_UNAVAILABLE', message: 'Database unreachable' } });
  }
});

app.use('/api', authMiddleware);
app.use('/api/excel', excelRoutes);
app.use('/api/gmail', gmailRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/email-logs', emailLogRoutes);

/* ── Production: serve the built React app ───────────────────────────────── */
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(path.join(frontendDist, 'index.html'))) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
  console.log('[server] serving frontend build from frontend/dist');
}

/* ── Errors (must be last) ───────────────────────────────────────────────── */
app.use(notFoundHandler);
app.use(errorHandler);

/* ── Boot ────────────────────────────────────────────────────────────────── */
const PORT = Number(process.env.PORT || 5000);

async function start() {
  try {
    await initializeDatabase();
  } catch (err) {
    console.error('[server] FATAL: database initialization failed:', err.message);
    console.error('       Check MYSQL_* values in backend/.env and that MySQL is running.');
    process.exit(1);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] Gmail Follow-up Automation API running on http://localhost:${PORT}`);
    console.log(`[server] environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

start();

module.exports = app;
