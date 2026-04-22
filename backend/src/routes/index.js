const express = require('express');
const authRoutes = require('./auth.routes');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', time: new Date().toISOString() });
});

router.use('/auth', authRoutes);

module.exports = router;
