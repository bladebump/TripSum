#!/bin/sh

# TripSum 后端启动脚本
# 智能处理首次部署和后续更新

set -e

echo "========================================="
echo "TripSum Backend Starting..."
echo "========================================="

# 从 DATABASE_URL 提取连接信息
export PGHOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
export PGPORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
export PGUSER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
export PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
export PGDATABASE=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# 等待数据库就绪
echo "等待数据库就绪..."
echo "连接到: $PGHOST:$PGPORT/$PGDATABASE"

MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if pg_isready -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE > /dev/null 2>&1; then
    echo "✓ 数据库已就绪"
    break
  else
    echo "数据库尚未就绪，等待中... ($((RETRY_COUNT + 1))/$MAX_RETRIES)"
    sleep 2
    RETRY_COUNT=$((RETRY_COUNT + 1))
  fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "❌ 数据库连接超时"
  exit 1
fi

# 检查数据库中是否存在表
echo "检查数据库状态..."

# 先检查是否有任何表存在
TABLE_COUNT=$(PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" 2>/dev/null || echo "0")
TABLE_COUNT=$(echo $TABLE_COUNT | tr -d ' ')

echo "找到 $TABLE_COUNT 个表"

if [ "$TABLE_COUNT" = "0" ]; then
  echo "检测到空数据库，执行首次部署..."
  
  # 首次部署：使用 db push 创建所有表
  npx prisma db push --skip-generate
  echo "✓ 数据库架构已创建"
  
  # 创建触发器
  echo "创建数据库触发器..."
  npx prisma db execute --stdin <<'EOF'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON "User"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_trips_updated_at') THEN
        CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON "Trip"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_expenses_updated_at') THEN
        CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON "Expense"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;
EOF
  echo "✓ 触发器已创建"
  
  # 初始化种子数据
  if [ -f "prisma/seed.ts" ] || [ -f "prisma/seed.js" ]; then
    echo "初始化种子数据..."
    npx prisma db seed
    echo "✓ 种子数据已导入"
  fi

else
  # 数据库非空，检查迁移状态
  MIGRATION_COUNT=$(PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -t -c "SELECT COUNT(*) FROM _prisma_migrations;" 2>/dev/null || echo "0")
  MIGRATION_COUNT=$(echo $MIGRATION_COUNT | tr -d ' ')
  
  if [ "$MIGRATION_COUNT" = "0" ]; then
    echo "检测到表存在但无迁移历史，执行基线化..."
    
    # 使用 db push 确保架构同步
    npx prisma db push --skip-generate --accept-data-loss
    echo "✓ 数据库架构已同步"
    
  else
    # 检查是否有待应用的迁移
    if npx prisma migrate status 2>&1 | grep -q "Following migration have not yet been applied"; then
      echo "检测到待应用的迁移，执行迁移..."
      npx prisma migrate deploy
      echo "✓ 数据库迁移已完成"
    else
      echo "数据库已是最新状态"
    fi
  fi
  
  # 确保触发器存在
  echo "确保触发器存在..."
  npx prisma db execute --stdin <<'EOF'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON "User"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_trips_updated_at') THEN
        CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON "Trip"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_expenses_updated_at') THEN
        CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON "Expense"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;
EOF
  echo "✓ 触发器已确认"
fi

# 检查表是否存在后再创建索引
TABLE_EXISTS=$(PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Trip';" 2>/dev/null || echo "0")
TABLE_EXISTS=$(echo $TABLE_EXISTS | tr -d ' ')

if [ "$TABLE_EXISTS" != "0" ]; then
  # 创建必要的索引（如果不存在）
  echo "创建性能优化索引..."
  npx prisma db execute --stdin <<'EOF' 2>/dev/null || true
-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_trips_created_by ON "Trip"("createdBy");
CREATE INDEX IF NOT EXISTS idx_trips_start_date ON "Trip"("startDate");
CREATE INDEX IF NOT EXISTS idx_trip_members_trip_id ON "TripMember"("tripId");
CREATE INDEX IF NOT EXISTS idx_trip_members_user_id ON "TripMember"("userId");
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON "Expense"("tripId");
CREATE INDEX IF NOT EXISTS idx_expenses_payer_id ON "Expense"("payerId");
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON "Expense"("expenseDate");
CREATE INDEX IF NOT EXISTS idx_expense_participants_expense_id ON "ExpenseParticipant"("expenseId");
CREATE INDEX IF NOT EXISTS idx_expense_participants_member_id ON "ExpenseParticipant"("tripMemberId");
EOF
  echo "✓ 索引创建完成"
  
  # 插入默认分类数据（如果不存在）
  echo "初始化默认分类..."
  npx prisma db execute --stdin <<'EOF' 2>/dev/null || true
INSERT INTO "Category" (name, icon, color, "sortOrder", "createdAt", "updatedAt") VALUES
('餐饮', '🍽️', '#FF6B6B', 1, NOW(), NOW()),
('交通', '🚗', '#4ECDC4', 2, NOW(), NOW()),
('住宿', '🏨', '#45B7D1', 3, NOW(), NOW()),
('娱乐', '🎮', '#96CEB4', 4, NOW(), NOW()),
('购物', '🛒', '#FFEAA7', 5, NOW(), NOW()),
('门票', '🎫', '#A29BFE', 6, NOW(), NOW()),
('其他', '📦', '#DFE6E9', 99, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;
EOF
  echo "✓ 默认分类已初始化"
else
  echo "跳过索引创建（表尚未创建）"
fi

echo "========================================="
echo "启动应用服务..."
echo "========================================="

# 启动应用
exec npm start