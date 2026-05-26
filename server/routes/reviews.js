const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get reviews for a product
router.get('/product/:productId', (req, res) => {
  const reviews = db.prepare('SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC').all(req.params.productId);
  const avg = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE product_id = ?').get(req.params.productId);
  res.json({ reviews, avgRating: avg.avg ? Number(avg.avg.toFixed(1)) : null, count: avg.count });
});

// Submit review
router.post('/', authMiddleware, (req, res) => {
  const { productId, rating, content } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: '请选择评分' });
  if (!content || content.length < 10) return res.status(400).json({ error: '评价内容至少10个字' });

  // Check if user purchased
  const purchased = db.prepare(`
    SELECT 1 FROM orders o JOIN order_items oi ON o.id = oi.order_id
    WHERE o.user_id = ? AND oi.product_id = ? AND o.status != 'cancelled'
  `).get(req.user.id, productId);
  if (!purchased) return res.status(400).json({ error: '购买后才能评价' });

  // Check if already reviewed
  const existing = db.prepare('SELECT id FROM reviews WHERE user_id = ? AND product_id = ?').get(req.user.id, productId);
  if (existing) return res.status(400).json({ error: '已评价过该商品' });

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  db.prepare('INSERT INTO reviews (id, user_id, username, product_id, rating, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    id, req.user.id, req.user.username, productId, rating, content, Date.now()
  );

  // Update product rating
  const avg = db.prepare('SELECT AVG(rating) as avg FROM reviews WHERE product_id = ?').get(productId);
  db.prepare('UPDATE products SET rating = ? WHERE id = ?').run(Number(avg.avg.toFixed(1)), productId);

  res.json({ success: true });
});

// Check if user can review
router.get('/can-review/:productId', authMiddleware, (req, res) => {
  const purchased = db.prepare(`
    SELECT 1 FROM orders o JOIN order_items oi ON o.id = oi.order_id
    WHERE o.user_id = ? AND oi.product_id = ? AND o.status != 'cancelled'
  `).get(req.user.id, req.params.productId);
  const reviewed = db.prepare('SELECT 1 FROM reviews WHERE user_id = ? AND product_id = ?').get(req.user.id, req.params.productId);
  res.json({ canReview: !!purchased && !reviewed });
});

module.exports = router;
