const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const AVAILABLE_COUPONS = [
  { code: 'WELCOME10', type: 'percent', value: 10, minOrder: 100, description: '新用户9折券（满100可用）', maxUses: 1 },
  { code: 'SAVE50', type: 'fixed', value: 50, minOrder: 500, description: '满500减50', maxUses: 5 },
  { code: 'SAVE20', type: 'fixed', value: 20, minOrder: 200, description: '满200减20', maxUses: 3 },
];

// Get available coupons
router.get('/available', authMiddleware, (req, res) => {
  const { orderTotal } = req.query;
  const total = Number(orderTotal) || 0;
  const available = AVAILABLE_COUPONS.filter(c => {
    if (total < c.minOrder) return false;
    const used = db.prepare('SELECT COUNT(*) as count FROM coupon_usage WHERE user_id = ? AND coupon_code = ?').get(req.user.id, c.code).count;
    return used < c.maxUses;
  });
  res.json(available);
});

// Apply coupon
router.post('/apply', authMiddleware, (req, res) => {
  const { code, orderTotal } = req.body;
  const total = Number(orderTotal) || 0;
  const coupon = AVAILABLE_COUPONS.find(c => c.code === code.toUpperCase());
  if (!coupon) return res.json({ valid: false, msg: '无效的优惠码' });
  if (total < coupon.minOrder) return res.json({ valid: false, msg: `订单满¥${coupon.minOrder}才可使用` });

  const used = db.prepare('SELECT COUNT(*) as count FROM coupon_usage WHERE user_id = ? AND coupon_code = ?').get(req.user.id, coupon.code).count;
  if (used >= coupon.maxUses) return res.json({ valid: false, msg: '优惠码已被用完' });

  let discount = 0;
  if (coupon.type === 'fixed') discount = coupon.value;
  else if (coupon.type === 'percent') discount = Math.round(total * coupon.value / 100 * 100) / 100;

  res.json({ valid: true, discount, code: coupon.code, description: coupon.description });
});

module.exports = router;
