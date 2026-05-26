const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'shop.db');

let _db = null;

function wrapDb(sqlDb) {
  function runStatement(sql, params) {
    const flat = flattenParams(params);
    sqlDb.run(sql, flat);
  }

  function queryRows(sql, params) {
    const flat = flattenParams(params);
    const rows = [];
    sqlDb.each(sql, flat, (row) => rows.push(row));
    return rows;
  }

  function queryOne(sql, params) {
    const flat = flattenParams(params);
    let result;
    sqlDb.each(sql, flat, (row) => {
      result = row;
      return true;
    });
    return result;
  }

  return {
    run: runStatement,
    get: queryOne,
    all: queryRows,
    prepare(sql) {
      return {
        get(...params) { return queryOne(sql, params); },
        all(...params) { return queryRows(sql, params); },
        run(...params) { runStatement(sql, params); }
      };
    },
    exec(str) {
      const stmts = str.split(';').map(s => s.trim()).filter(Boolean);
      for (const stmt of stmts) {
        sqlDb.run(stmt + ';');
      }
    },
    export() { return sqlDb.export(); }
  };
}

function flattenParams(args) {
  if (args.length === 0) return [];
  if (args.length === 1 && Array.isArray(args[0])) return args[0];
  return args;
}

// Stub that delegates to _db once initialized
const memo = new Map();
const stub = {
  run(...a) { return _db.run(...a); },
  get(...a) { return _db.get(...a); },
  all(...a) { return _db.all(...a); },
  exec(...a) { return _db.exec(...a); },
  export(...a) { return _db.export(...a); },
  get prepare() {
    return (...a) => _db.prepare(...a);
  }
};

function createTables() {
  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price REAL NOT NULL,
      original_price REAL NOT NULL,
      category TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      seller_id TEXT NOT NULL,
      seller_name TEXT NOT NULL,
      sales INTEGER NOT NULL DEFAULT 0,
      rating REAL NOT NULL DEFAULT 5.0,
      image TEXT DEFAULT '📦',
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cart_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      total REAL NOT NULL,
      original_total REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      coupon_code TEXT,
      address TEXT NOT NULL,
      phone TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      note TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      image TEXT DEFAULT '📦',
      seller_id TEXT NOT NULL,
      seller_name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      product_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(user_id, product_id)
    );
    CREATE TABLE IF NOT EXISTS coupon_usage (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      coupon_code TEXT NOT NULL,
      used_at INTEGER NOT NULL
    );
  `);
}

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    _db = wrapDb(new SQL.Database(buffer));
  } else {
    _db = wrapDb(new SQL.Database());
  }
  createTables();
}

function getDb() { return _db; }

function saveDb() {
  if (!_db) return;
  const data = _db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

module.exports = stub;
module.exports.initDb = initDb;
module.exports.getDb = getDb;
module.exports.saveDb = saveDb;
