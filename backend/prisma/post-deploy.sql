-- TripSum 数据库后处理脚本
-- 包含索引、触发器和默认数据
-- 所有操作都是幂等的（可重复执行）

-- ========================================
-- 1. 创建性能优化索引
-- ========================================

-- 注意：表名使用小写（Prisma 的 @@map 映射）
CREATE INDEX IF NOT EXISTS idx_trips_created_by ON trips(created_by);
CREATE INDEX IF NOT EXISTS idx_trips_start_date ON trips(start_date);
CREATE INDEX IF NOT EXISTS idx_trip_members_trip_id ON trip_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_user_id ON trip_members(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_payer_id ON expenses(payer_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expense_participants_expense_id ON expense_participants(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_participants_member_id ON expense_participants(trip_member_id);
CREATE INDEX IF NOT EXISTS idx_settlements_trip_id ON settlements(trip_id);
CREATE INDEX IF NOT EXISTS idx_categories_trip_id ON categories(trip_id);

-- ========================================
-- 2. 创建/更新触发器
-- ========================================

-- 创建更新 updated_at 的函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表创建触发器
DO $$
BEGIN
    -- users 表
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at 
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- trips 表
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_trips_updated_at') THEN
        CREATE TRIGGER update_trips_updated_at 
        BEFORE UPDATE ON trips
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- expenses 表
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_expenses_updated_at') THEN
        CREATE TRIGGER update_expenses_updated_at 
        BEFORE UPDATE ON expenses
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- trip_members 表
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_trip_members_updated_at') THEN
        CREATE TRIGGER update_trip_members_updated_at 
        BEFORE UPDATE ON trip_members
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- categories 表
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_categories_updated_at') THEN
        CREATE TRIGGER update_categories_updated_at 
        BEFORE UPDATE ON categories
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- ========================================
-- 3. 默认分类数据
-- ========================================

-- 注意：由于 categories 表的 trip_id 是必需的外键，
-- 默认分类数据应该在创建新行程时通过应用代码复制，
-- 而不是在数据库中预先创建。
-- 
-- 这里只是创建一个存储默认分类模板的表（可选）
-- 或者在应用代码中硬编码默认分类。

-- 创建默认分类模板表（可选）
CREATE TABLE IF NOT EXISTS default_category_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    icon VARCHAR(50),
    color VARCHAR(7),
    sort_order INT DEFAULT 0
);

-- 插入默认分类模板
INSERT INTO default_category_templates (name, icon, color, sort_order) VALUES
('餐饮', '🍽️', '#FF6B6B', 1),
('交通', '🚗', '#4ECDC4', 2),
('住宿', '🏨', '#45B7D1', 3),
('娱乐', '🎮', '#96CEB4', 4),
('购物', '🛒', '#FFEAA7', 5),
('门票', '🎫', '#A29BFE', 6),
('其他', '📦', '#DFE6E9', 99)
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- 4. 数据完整性检查
-- ========================================

-- 确保所有表的 updated_at 字段都有默认值
-- （Prisma 已经处理，这里只是确认）

-- ========================================
-- 5. 统计信息更新（提升查询性能）
-- ========================================

ANALYZE users;
ANALYZE trips;
ANALYZE trip_members;
ANALYZE expenses;
ANALYZE expense_participants;
ANALYZE categories;
ANALYZE settlements;