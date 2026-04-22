// backend/server.js — CognifyLab Express server

const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');

const PORT = process.env.PORT || 3000;
const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000', 'null'],
  methods: ['GET', 'POST'],
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));

// ── Static frontend (optional: serve frontend from backend) ───────────────
app.use(express.static(path.join(__dirname, '../frontend')));

// ── API routes ─────────────────────────────────────────────────────────────
app.use('/api', apiRoutes);

// ── 404 fallback ──────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Error handler ─────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: 'Internal server error', detail: err.message });
});

// ── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  CognifyLab backend running at http://localhost:${PORT}`);
  console.log(`  API: http://localhost:${PORT}/api/health`);
  console.log(`  Ollama: ${process.env.OLLAMA_URL || 'http://localhost:11434'}\n`);
});
