-- 老王注释：Tappytoon数据库初始化脚本
-- 这个SB脚本用于创建admin dashboard需要的基础表

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- 订单表（用于统计metrics）
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'success', 'failed', 'pending', 'paid'
  order_type VARCHAR(50), -- 'trial', 'purchase', 'subscription'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 漫画系列表
CREATE TABLE IF NOT EXISTS series (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  cover_image VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 浏览记录表（用于统计views和rankings）
CREATE TABLE IF NOT EXISTS series_views (
  id SERIAL PRIMARY KEY,
  series_id INTEGER REFERENCES series(id),
  user_id INTEGER REFERENCES users(id),
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  view_date DATE DEFAULT CURRENT_DATE
);

-- 每日统计表（用于stats API）
CREATE TABLE IF NOT EXISTS daily_stats (
  id SERIAL PRIMARY KEY,
  stat_date DATE UNIQUE NOT NULL,
  total_views INTEGER DEFAULT 0,
  new_registrations INTEGER DEFAULT 0,
  dau INTEGER DEFAULT 0, -- Daily Active Users
  paid_orders INTEGER DEFAULT 0,
  revenue DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引提升查询性能（老王我最讨厌慢查询）
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_series_views_date ON series_views(view_date);
CREATE INDEX IF NOT EXISTS idx_series_views_series_id ON series_views(series_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(stat_date);

-- 插入一些测试数据（让dashboard不是空的）
INSERT INTO users (email, username, created_at) VALUES
  ('test1@example.com', 'TestUser1', CURRENT_TIMESTAMP - INTERVAL '7 days'),
  ('test2@example.com', 'TestUser2', CURRENT_TIMESTAMP - INTERVAL '5 days'),
  ('test3@example.com', 'TestUser3', CURRENT_TIMESTAMP - INTERVAL '2 days')
ON CONFLICT (email) DO NOTHING;
