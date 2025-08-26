-- TripSum 数据库初始化脚本

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 设置时区
SET timezone = 'Asia/Shanghai';

-- 创建默认分类数据
CREATE TABLE IF NOT EXISTS default_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(7),
    sort_order INT DEFAULT 0
);

INSERT INTO default_categories (name, icon, color, sort_order) VALUES
('餐饮', '🍽️', '#FF6B6B', 1),
('交通', '🚗', '#4ECDC4', 2),
('住宿', '🏨', '#45B7D1', 3),
('娱乐', '🎮', '#96CEB4', 4),
('购物', '🛒', '#FFEAA7', 5),
('门票', '🎫', '#A29BFE', 6),
('其他', '📦', '#DFE6E9', 99)
ON CONFLICT DO NOTHING;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_trips_created_by ON trips(created_by);
CREATE INDEX IF NOT EXISTS idx_trips_start_date ON trips(start_date);
CREATE INDEX IF NOT EXISTS idx_trip_members_trip_id ON trip_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_user_id ON trip_members(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_payer_id ON expenses(payer_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expense_participants_expense_id ON expense_participants(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_participants_user_id ON expense_participants(user_id);

-- 创建函数：自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建触发器
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_trips_updated_at') THEN
        CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_expenses_updated_at') THEN
        CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- 授权（如果需要特定权限）
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tripsum_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tripsum_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO tripsum_user;