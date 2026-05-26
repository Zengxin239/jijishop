const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '请输入用户名和密码' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, created_at: user.created_at } });
});

router.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '请填写完整信息' });

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(400).json({ error: '用户名已存在' });

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const hash = bcrypt.hashSync(password, 10);
  const now = Date.now();
  const userRole = 'user';

  db.prepare('INSERT INTO users (id, username, password, role, created_at) VALUES (?, ?, ?, ?, ?)').run(id, username, hash, userRole, now);

  const token = jwt.sign({ id, username, role: userRole }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id, username, role: userRole, created_at: now } });
});

router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json(user);
});

module.exports = router;
