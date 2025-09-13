// src/routes/healthRoutes.js
const express = require('express');
const router = express.Router();
// WebSocket service removed
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

// Basic health check
router.get('/', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Cron service removed

// Cron service removed

// Cron service removed

// WebSocket endpoints removed

// WebSocket endpoints removed

module.exports = router;
