const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get favorites
router.get('/', authMiddleware, (req, res) => {
  const favs = db.prepare(`
    SELECT f.id, f.product_id, f.created_at as added_at, p.*
    FROM favorites f JOIN products p ON f.product_id = p.id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `).all(req.user.id);
  res.json(favs);
});

// Toggle favorite
router.post('/toggle', authMiddleware, (req, res) => {
  const { productId } = req.body;
  const existing = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND product_id = ?').get(req.user.id, productId);
  if (existing) {
    db.prepare('DELETE FROM favorites WHERE id = ?').run(existing.id);
    res.json({ favorited: false });
  } else {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    db.prepare('INSERT INTO favorites (id, user_id, product_id, created_at) VALUES (?, ?, ?, ?)').run(id, req.user.id, productId, Date.now());
    res.json({ favorited: true });
  }
});

// Check if favorited
router.get('/check/:productId', authMiddleware, (req, res) => {
  const fav = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND product_id = ?').get(req.user.id, req.params.productId);
  res.json({ favorited: !!fav });
});

// Get favorites count
router.get('/count', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT COUNT(*) as count FROM favorites WHERE user_id = ?').get(req.user.id);
  res.json({ count: row.count });
});

module.exports = router;
