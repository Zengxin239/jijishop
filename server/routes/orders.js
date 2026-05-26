const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Place order
router.post('/', authMiddleware, (req, res) => {
  const { name, phone, address, note, discount, couponCode, originalTotal } = req.body;
  if (!name || !phone || !address) return res.status(400).json({ error: '请填写完整的收货信息' });

  const cartItems = db.prepare(`
    SELECT c.quantity, p.id as product_id, p.name as product_name, p.price, p.image, p.stock, p.seller_id, p.seller_name
    FROM cart_items c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?
  `).all(req.user.id);

  if (cartItems.length === 0) return res.status(400).json({ error: '购物车为空' });

  // Validate stock
  for (const item of cartItems) {
    if (item.quantity > item.stock) return res.status(400).json({ error: `"${item.product_name}" 库存不足` });
  }

  const totalBeforeDiscount = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const finalDiscount = discount || 0;
  const finalTotal = Math.max(0, totalBeforeDiscount - finalDiscount);

  const orderId = 'ORD' + Date.now().toString(36).toUpperCase();
  const now = Date.now();

  const insertOrder = db.prepare('INSERT INTO orders (id, user_id, username, total, original_total, discount, coupon_code, address, phone, name, status, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insertOrder.run(orderId, req.user.id, req.user.username, finalTotal, totalBeforeDiscount, finalDiscount, couponCode || null, address, phone, name, 'unpaid', note || '', now);

  const insertItem = db.prepare('INSERT INTO order_items (id, order_id, product_id, product_name, price, quantity, image, seller_id, seller_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const item of cartItems) {
    const itemId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    insertItem.run(itemId, orderId, item.product_id, item.product_name, item.price, item.quantity, item.image, item.seller_id, item.seller_name);
    // Update stock and sales
    db.prepare('UPDATE products SET stock = stock - ?, sales = sales + ? WHERE id = ?').run(item.quantity, item.quantity, item.product_id);
  }

  // Record coupon usage
  if (couponCode) {
    const usageId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    db.prepare('INSERT INTO coupon_usage (id, user_id, coupon_code, used_at) VALUES (?, ?, ?, ?)').run(usageId, req.user.id, couponCode, now);
  }

  // Clear cart
  db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
  res.json(order);
});

// Get user orders
router.get('/my', authMiddleware, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  for (const order of orders) {
    order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  }
  res.json(orders);
});

// Get product-owner orders
router.get('/seller', authMiddleware, (req, res) => {
  let orders;
  if (req.user.role === 'admin') {
    orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  } else {
    orders = db.prepare(`
      SELECT DISTINCT o.* FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE oi.seller_id = ?
      ORDER BY o.created_at DESC
    `).all(req.user.id);
  }
  for (const order of orders) {
    order.items = req.user.role === 'admin'
      ? db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id)
      : db.prepare('SELECT * FROM order_items WHERE order_id = ? AND seller_id = ?').all(order.id, req.user.id);
  }
  res.json(orders);
});

// Pay order
router.put('/:id/pay', authMiddleware, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  if (order.status !== 'unpaid') return res.status(400).json({ error: '当前订单无需支付' });
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('paid', req.params.id);
  res.json({ success: true });
});

// Cancel order
router.put('/:id/cancel', authMiddleware, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  if (order.status !== 'unpaid') return res.status(400).json({ error: '只能取消待付款订单' });
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);
  for (const item of items) {
    db.prepare('UPDATE products SET stock = stock + ?, sales = CASE WHEN sales >= ? THEN sales - ? ELSE 0 END WHERE id = ?')
      .run(item.quantity, item.quantity, item.quantity, item.product_id);
  }
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('cancelled', req.params.id);
  res.json({ success: true });
});

// Ship order
router.put('/:id/ship', authMiddleware, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  if (order.status !== 'paid') return res.status(400).json({ error: '只能发货已付款订单' });
  if (req.user.role !== 'admin') {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ? AND seller_id = ?').all(req.params.id, req.user.id);
    if (items.length === 0) return res.status(403).json({ error: '无权操作此订单' });
  }
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('shipped', req.params.id);
  res.json({ success: true });
});

// Confirm receipt
router.put('/:id/confirm', authMiddleware, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  if (order.status !== 'shipped') return res.status(400).json({ error: '只能确认已发货的订单' });
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('completed', req.params.id);
  res.json({ success: true });
});

// Delete order
router.delete('/:id', authMiddleware, (req, res) => {
  const baseSql = req.user.role === 'admin'
    ? 'SELECT * FROM orders WHERE id = ?'
    : 'SELECT * FROM orders WHERE id = ? AND user_id = ?';
  const order = req.user.role === 'admin'
    ? db.prepare(baseSql).get(req.params.id)
    : db.prepare(baseSql).get(req.params.id, req.user.id);

  if (!order) return res.status(404).json({ error: '订单不存在' });
  if (!['cancelled', 'completed'].includes(order.status)) {
    return res.status(400).json({ error: '仅已取消或已完成订单可删除' });
  }

  db.prepare('DELETE FROM order_items WHERE order_id = ?').run(req.params.id);
  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
