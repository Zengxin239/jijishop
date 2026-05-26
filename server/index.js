const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { initDb, getDb, saveDb } = require('./db');

const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');

async function start() {
  await initDb();
  ensureUploadDir();
  migrateData();
  seedData();
  saveDb();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use('/uploads', express.static(UPLOAD_DIR));

  // Auto-save after modifying requests (must be before routes)
  app.use((req, res, next) => {
    const orig = res.json.bind(res);
    res.json = function (body) {
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        saveDb();
      }
      orig(body);
    };
    next();
  });

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/products', require('./routes/products'));
  app.use('/api/cart', require('./routes/cart'));
  app.use('/api/orders', require('./routes/orders'));
  app.use('/api/reviews', require('./routes/reviews'));
  app.use('/api/favorites', require('./routes/favorites'));
  app.use('/api/coupons', require('./routes/coupons'));
  app.use('/api/users', require('./routes/users'));

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function migrateData() {
  const db = getDb();
  db.prepare("UPDATE users SET role = 'user' WHERE role IN ('buyer', 'seller')").run();
  db.prepare("UPDATE orders SET status = 'paid' WHERE status = 'pending'").run();
}

function seedData() {
  const db = getDb();
  const bcrypt = require('bcryptjs');
  const now = Date.now();
  const userHash = bcrypt.hashSync('123456', 10);
  const adminHash = bcrypt.hashSync('admin123', 10);

  const seedUsers = [
    ['user1', 'user1', userHash, 'user', now],
    ['user2', 'user2', userHash, 'user', now],
    ['buyer1', 'buyer1', userHash, 'user', now],
    ['admin1', 'admin1', adminHash, 'admin', now],
  ];

  const insertUser = db.prepare('INSERT INTO users (id, username, password, role, created_at) VALUES (?, ?, ?, ?, ?)');
  for (const user of seedUsers) {
    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(user[1]);
    if (!exists) insertUser.run(...user);
  }

  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
  if (productCount && productCount.count > 0) return;

  const products = [
    ['p1', 'Apple iPhone 15 Pro Max 256GB', '搭载A17 Pro芯片，钛金属设计，4800万像素主摄系统，支持USB-C接口。', 9999, 11999, '电子产品', 50, 'user1', 'user1的小店', 2880, 4.9, 'https://picsum.photos/400/400?random=1', now],
    ['p2', '华为 Mate 60 Pro 512GB', '麒麟芯片回归，卫星通话功能，超可靠玄武架构，XMAGE影像系统。', 7999, 8999, '电子产品', 35, 'user1', 'user1的小店', 3650, 4.9, '📱', now],
    ['p3', 'MacBook Air M3 15英寸', 'M3芯片，18小时续航，Liquid Retina显示屏，轻薄设计仅1.5kg。', 10999, 12999, '电子产品', 20, 'user1', 'user1的小店', 1520, 4.8, '💻', now],
    ['p4', 'AirPods Pro 2 无线耳机', 'H2芯片，自适应降噪，个性化空间音频，长达6小时续航。', 1899, 1999, '电子产品', 100, 'user2', 'user2的小店', 5200, 4.7, '🎧', now],
    ['p5', '男士轻薄羽绒服 冬季保暖', '90%白鹅绒填充，防风防泼水面料，轻便保暖，可收纳设计。', 399, 799, '服装鞋帽', 200, 'user2', 'user2的小店', 8800, 4.6, 'https://picsum.photos/400/400?random=5', now],
    ['p6', '新款女士高跟鞋 细跟尖头', '优质羊皮，舒适内里，8cm细跟设计，优雅百搭通勤必备。', 299, 599, '服装鞋帽', 150, 'user2', 'user2的小店', 4200, 4.5, '👠', now],
    ['p7', '纯棉圆领T恤 男女同款', '100%新疆长绒棉，透气亲肤，经典圆领设计，多色可选。', 79, 159, '服装鞋帽', 500, 'user2', 'user2的小店', 15000, 4.7, '👕', now],
    ['p8', '北欧风格落地灯 客厅卧室', '简约设计，三档调光，暖光护眼，实木底座，适合客厅卧室书房。', 259, 399, '家居生活', 80, 'user1', 'user1的小店', 2100, 4.8, '💡', now],
    ['p9', '记忆棉枕头 护颈助眠', '慢回弹记忆棉，人体工学曲线设计，透气抗菌面料，改善睡眠质量。', 149, 299, '家居生活', 300, 'user1', 'user1的小店', 7600, 4.6, '🛏', now],
    ['p10', '景德镇陶瓷餐具套装 18件', '优质高岭土，釉下彩工艺，微波炉洗碗机适用，精美礼盒包装。', 199, 358, '家居生活', 120, 'user1', 'user1的小店', 3400, 4.7, 'https://picsum.photos/400/400?random=10', now],
    ['p11', '坚果礼盒 每日坚果750g', '6种坚果科学配比，每日一包，新鲜锁鲜包装，营养健康零食。', 89, 139, '食品饮料', 400, 'user2', 'user2的小店', 12000, 4.8, '🥜', now],
    ['p12', '有机云南普洱茶 357g', '古树原料，传统工艺发酵，陈香浓郁，回甘生津，收藏品饮皆宜。', 268, 398, '食品饮料', 60, 'user2', 'user2的小店', 1800, 4.9, '🍵', now],
    ['p13', '兰蔻小黑瓶精华 50ml', '第二代小黑瓶，微生态护肤科技，修护肌肤屏障，细腻透亮。', 1080, 1280, '美妆护肤', 45, 'user1', 'user1的小店', 5600, 4.8, '🧴', now],
    ['p14', 'SK-II 神仙水 230ml', '90%以上PITERA精华，调节水油平衡，改善肤质，使肌肤晶莹剔透。', 1590, 1790, '美妆护肤', 30, 'user1', 'user1的小店', 3200, 4.9, '✨', now],
    ['p15', '《三体》全集 刘慈欣 科幻巨著', '雨果奖获奖作品，三体三部曲完整收录，中国科幻文学里程碑。', 89, 128, '图书文具', 500, 'user2', 'user2的小店', 28000, 4.9, '📚', now],
    ['p16', 'YONEX 羽毛球拍 天斧99', '高弹性碳素拍框，钨合金重量分布系统，进攻型专业球拍。', 1599, 1880, '运动户外', 25, 'user2', 'user2的小店', 980, 4.7, '🏸', now],
    ['p17', '婴儿柔湿巾 80抽×12包', 'EDI纯水，无酒精无香精，加厚珍珠纹，温和不刺激宝宝肌肤。', 69, 99, '母婴用品', 600, 'user1', 'user1的小店', 22000, 4.8, '🧻', now],
    ['p18', '乐高 兰博基尼Sián 42161', '1:16比例模型，369块颗粒，机械细节丰富，适合10岁以上儿童。', 299, 399, '母婴用品', 90, 'user1', 'user1的小店', 4500, 4.6, '🧱', now],
  ];

  const insert = db.prepare('INSERT INTO products (id, name, description, price, original_price, category, stock, seller_id, seller_name, sales, rating, image, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const p of products) {
    insert.run(...p);
  }
  console.log('Seed data inserted.');
}

start();
