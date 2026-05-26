const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// Get all products with filtering and sorting
router.get('/', (req, res) => {
  const { category, search, sort, priceMin, priceMax, sellerId, mine } = req.query;
  let sql = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (sellerId) {
    sql += ' AND seller_id = ?';
    params.push(sellerId);
  }
  if (mine === 'true' && req.headers.authorization?.startsWith('Bearer ')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const { verify } = require('jsonwebtoken');
      const { JWT_SECRET } = require('../middleware/auth');
      const payload = verify(token, JWT_SECRET);
      sql += ' AND seller_id = ?';
      params.push(payload.id);
    } catch {
      return res.status(401).json({ error: '登录已过期，请重新登录' });
    }
  }
  if (category && category !== 'all') {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (search) {
    sql += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (priceMin) {
    sql += ' AND price >= ?';
    params.push(Number(priceMin));
  }
  if (priceMax) {
    sql += ' AND price <= ?';
    params.push(Number(priceMax));
  }

  switch (sort) {
    case 'price-asc': sql += ' ORDER BY price ASC'; break;
    case 'price-desc': sql += ' ORDER BY price DESC'; break;
    case 'sales': sql += ' ORDER BY sales DESC'; break;
    case 'rating': sql += ' ORDER BY rating DESC'; break;
    default: sql += ' ORDER BY sales DESC';
  }

  const products = db.prepare(sql).all(...params);
  res.json(products);
});

// Get single product
router.get('/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: '商品不存在' });
  res.json(product);
});

// Create product
router.post('/', authMiddleware, (req, res) => {
  const { name, description, price, originalPrice, category, stock, image } = req.body;
  if (!name || !price) return res.status(400).json({ error: '请填写商品名称和价格' });

  const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const now = Date.now();
  const sellerName = req.user.username + '的小店';

  db.prepare('INSERT INTO products (id, name, description, price, original_price, category, stock, seller_id, seller_name, sales, rating, image, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 5.0, ?, ?)').run(
    id, name, description || '', price, originalPrice || price, category, stock || 0, req.user.id, sellerName, image || '📦', now
  );

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.json(product);
});

// Update product
router.put('/:id', authMiddleware, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: '商品不存在' });
  if (product.seller_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: '无权编辑此商品' });

  const { name, description, price, originalPrice, category, stock, image } = req.body;
  if (product.image !== image) deleteLocalImage(product.image);
  db.prepare('UPDATE products SET name=?, description=?, price=?, original_price=?, category=?, stock=?, image=? WHERE id=?').run(
    name || product.name, description || product.description, price || product.price,
    originalPrice || product.original_price, category || product.category, stock ?? product.stock,
    image || product.image, req.params.id
  );

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Delete product
router.delete('/:id', authMiddleware, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: '商品不存在' });
  if (product.seller_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: '无权删除此商品' });

  deleteLocalImage(product.image);
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  db.prepare('DELETE FROM cart_items WHERE product_id = ?').run(req.params.id);
  db.prepare('DELETE FROM favorites WHERE product_id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/upload-image', authMiddleware, (req, res) => {
  const { filename, dataUrl } = req.body;
  if (!dataUrl || typeof dataUrl !== 'string') {
    return res.status(400).json({ error: '请选择图片' });
  }

  const match = dataUrl.match(/^data:(image\/(png|jpeg));base64,(.+)$/);
  if (!match) {
    return res.status(400).json({ error: '仅支持 PNG 或 JPG 图片' });
  }

  const ext = match[2] === 'png' ? 'png' : 'jpg';
  const safeName = (filename || 'product').replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 24) || 'product';
  const savedName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}.${ext}`;
  const target = path.join(UPLOAD_DIR, savedName);
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(target, Buffer.from(match[3], 'base64'));
  res.json({ imageUrl: `/uploads/${savedName}` });
});

function deleteLocalImage(imagePath) {
  if (!imagePath || !imagePath.startsWith('/uploads/')) return;
  const target = path.join(UPLOAD_DIR, path.basename(imagePath));
  if (fs.existsSync(target)) {
    fs.unlinkSync(target);
  }
}

module.exports = router;
