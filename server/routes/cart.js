const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get cart
router.get('/', authMiddleware, (req, res) => {
  const items = db.prepare(`
    SELECT c.id, c.quantity, p.id as product_id, p.name, p.price, p.image, p.stock, p.seller_name
    FROM cart_items c JOIN products p ON c.product_id = p.id
    WHERE c.user_id = ?
  `).all(req.user.id);
  res.json(items);
});

// Add to cart
router.post('/add', authMiddleware, (req, res) => {
  const { productId, quantity } = req.body;
  const qty = quantity || 1;

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) return res.status(404).json({ error: '商品不存在' });

  const existing = db.prepare('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?').get(req.user.id, productId);
  if (existing) {
    const newQty = existing.quantity + qty;
    if (newQty > product.stock) return res.status(400).json({ error: '库存不足' });
    db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(newQty, existing.id);
  } else {
    if (qty > product.stock) return res.status(400).json({ error: '库存不足' });
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    db.prepare('INSERT INTO cart_items (id, user_id, product_id, quantity) VALUES (?, ?, ?, ?)').run(id, req.user.id, productId, qty);
  }
  res.json({ success: true });
});

// Update quantity
router.put('/:productId', authMiddleware, (req, res) => {
  const { quantity } = req.body;
  if (quantity < 1) {
    db.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').run(req.user.id, req.params.productId);
  } else {
    const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(req.params.productId);
    if (product && quantity > product.stock) return res.status(400).json({ error: '库存不足' });
    db.prepare('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?').run(quantity, req.user.id, req.params.productId);
  }
  res.json({ success: true });
});

// Remove from cart
router.delete('/:productId', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').run(req.user.id, req.params.productId);
  res.json({ success: true });
});

// Clear cart
router.delete('/', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
  res.json({ success: true });
});

// Get cart count
router.get('/count', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT COALESCE(SUM(quantity), 0) as count FROM cart_items WHERE user_id = ?').get(req.user.id);
  res.json({ count: row.count });
});

module.exports = router;
