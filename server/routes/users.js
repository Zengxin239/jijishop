const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.use((req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '仅管理员可操作' });
  }
  next();
});

router.get('/', (req, res) => {
  const users = db.prepare('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '用户不存在' });

  const username = (req.body.username || '').trim();
  const nextRole = req.body.role === 'admin' ? 'admin' : 'user';
  const password = typeof req.body.password === 'string' ? req.body.password.trim() : '';

  if (!username) return res.status(400).json({ error: '用户名不能为空' });

  const nameOwner = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.params.id);
  if (nameOwner) return res.status(400).json({ error: '用户名已存在' });

  let hashed = existing.password;
  if (password) hashed = bcrypt.hashSync(password, 10);

  db.prepare('UPDATE users SET username = ?, role = ?, password = ? WHERE id = ?').run(username, nextRole, hashed, req.params.id);

  if (username !== existing.username) {
    db.prepare('UPDATE products SET seller_name = ? WHERE seller_id = ?').run(`${username}的小店`, req.params.id);
    db.prepare('UPDATE orders SET username = ? WHERE user_id = ?').run(username, req.params.id);
    db.prepare('UPDATE reviews SET username = ? WHERE user_id = ?').run(username, req.params.id);
  }

  const updated = db.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?').get(req.params.id);
  res.json(updated);
});

module.exports = router;
