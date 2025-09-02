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
echo "========================================="
echo "检查数据库状态..."
echo "========================================="

# 列出所有现有的表
echo ""
echo "=== 数据库中的所有表 ==="
PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -c "SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" 2>&1 || echo "查询失败"

# 统计表数量
ALL_TABLE_COUNT=$(PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" 2>/dev/null || echo "0")
ALL_TABLE_COUNT=$(echo $ALL_TABLE_COUNT | tr -d ' ')
echo ""
echo "总表数量: $ALL_TABLE_COUNT"

# 检查是否存在 Prisma 的核心表（注意大小写）
echo ""
echo "=== 检查 Prisma 核心表 ==="
for table in User Trip TripMember Expense ExpenseParticipant Category Settlement; do
  EXISTS=$(PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table';" 2>/dev/null || echo "0")
  EXISTS=$(echo $EXISTS | tr -d ' ')
  if [ "$EXISTS" = "1" ]; then
    echo "  ✓ $table - 存在"
  else
    echo "  ✗ $table - 不存在"
  fi
done

PRISMA_TABLE_COUNT=$(PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('User', 'Trip', 'TripMember', 'Expense', 'ExpenseParticipant', 'Category', 'Settlement');" 2>/dev/null || echo "0")
PRISMA_TABLE_COUNT=$(echo $PRISMA_TABLE_COUNT | tr -d ' ')
echo ""
echo "Prisma 表总数: $PRISMA_TABLE_COUNT / 7"

# 检查 _prisma_migrations 表
echo ""
echo "=== 检查迁移表 ==="
MIGRATION_EXISTS=$(PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_prisma_migrations';" 2>/dev/null || echo "0")
MIGRATION_EXISTS=$(echo $MIGRATION_EXISTS | tr -d ' ')
if [ "$MIGRATION_EXISTS" = "1" ]; then
  echo "  ✓ _prisma_migrations 表存在"
  MIGRATION_COUNT=$(PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -t -c "SELECT COUNT(*) FROM _prisma_migrations;" 2>/dev/null || echo "0")
  MIGRATION_COUNT=$(echo $MIGRATION_COUNT | tr -d ' ')
  echo "  迁移记录数: $MIGRATION_COUNT"
else
  echo "  ✗ _prisma_migrations 表不存在"
fi

# 显示 Prisma 迁移状态
echo ""
echo "=== Prisma 迁移状态检查 ==="
npx prisma migrate status 2>&1 || echo "状态检查失败: $?"

echo ""
echo "========================================="
echo "执行决策..."
echo "========================================="

if [ "$PRISMA_TABLE_COUNT" = "0" ]; then
  echo "决策: Prisma 表不存在 → 执行首次部署"
  echo ""
  echo "执行: npx prisma db push --skip-generate"
  echo "---"
  
  # 首次部署：使用 db push 创建所有表
  npx prisma db push --skip-generate 2>&1
  PUSH_RESULT=$?
  
  if [ $PUSH_RESULT -eq 0 ]; then
    echo "✓ 数据库架构已创建"
  else
    echo "❌ 数据库架构创建失败，退出码: $PUSH_RESULT"
    exit 1
  fi
  
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
  echo "决策: Prisma 表存在 ($PRISMA_TABLE_COUNT/7)"
  
  if [ "$MIGRATION_EXISTS" = "0" ]; then
    echo "决策: 迁移表不存在 → 执行基线化"
    echo ""
    echo "执行: npx prisma db push --skip-generate --accept-data-loss"
    echo "---"
    
    # 使用 db push 确保架构同步
    npx prisma db push --skip-generate --accept-data-loss 2>&1
    SYNC_RESULT=$?
    
    if [ $SYNC_RESULT -eq 0 ]; then
      echo "✓ 数据库架构已同步"
    else
      echo "❌ 数据库架构同步失败，退出码: $SYNC_RESULT"
      exit 1
    fi
    
  else
    echo "决策: 迁移表存在，记录数: $MIGRATION_COUNT"
    
    # 检查是否有待应用的迁移
    echo ""
    echo "检查待应用的迁移..."
    if npx prisma migrate status 2>&1 | grep -q "Following migration have not yet been applied"; then
      echo "决策: 有待应用的迁移 → 执行迁移"
      echo ""
      echo "执行: npx prisma migrate deploy"
      echo "---"
      npx prisma migrate deploy 2>&1
      MIGRATE_RESULT=$?
      
      if [ $MIGRATE_RESULT -eq 0 ]; then
        echo "✓ 数据库迁移已完成"
      else
        echo "❌ 数据库迁移失败，退出码: $MIGRATE_RESULT"
        exit 1
      fi
    else
      echo "决策: 数据库已是最新状态"
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

echo ""
echo "========================================="
echo "后置处理..."
echo "========================================="

# 再次检查表是否存在
echo ""
echo "=== 验证表创建结果 ==="
TRIP_EXISTS=$(PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Trip';" 2>/dev/null || echo "0")
TRIP_EXISTS=$(echo $TRIP_EXISTS | tr -d ' ')

if [ "$TRIP_EXISTS" = "1" ]; then
  echo "✓ Trip 表已存在，可以创建索引"
  
  # 创建必要的索引（如果不存在）
  echo ""
  echo "执行: 创建性能优化索引..."
  npx prisma db execute --stdin <<'EOF' 2>&1 || echo "索引创建出错（可能已存在）"
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
  echo "✓ 索引处理完成"
  
  # 插入默认分类数据（如果不存在）
  echo ""
  echo "执行: 初始化默认分类..."
  npx prisma db execute --stdin <<'EOF' 2>&1 || echo "分类初始化出错（可能已存在）"
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
  echo "✓ 默认分类处理完成"
else
  echo "✗ Trip 表不存在，跳过索引和分类创建"
  echo "警告: 这可能意味着数据库架构创建失败！"
fi

echo ""
echo "========================================="
echo "最终状态检查..."
echo "========================================="

# 最终验证
echo ""
echo "=== 最终数据库状态 ==="
FINAL_PRISMA_COUNT=$(PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('User', 'Trip', 'TripMember', 'Expense', 'ExpenseParticipant', 'Category', 'Settlement');" 2>/dev/null || echo "0")
FINAL_PRISMA_COUNT=$(echo $FINAL_PRISMA_COUNT | tr -d ' ')
echo "Prisma 表数量: $FINAL_PRISMA_COUNT / 7"

if [ "$FINAL_PRISMA_COUNT" = "7" ]; then
  echo "✓ 所有必需的表都已创建"
else
  echo "❌ 警告: 只有 $FINAL_PRISMA_COUNT 个表被创建，应该有 7 个"
  echo "缺失的表可能导致应用无法正常运行"
fi

echo ""
echo "========================================="
echo "启动应用服务..."
echo "========================================="

# 启动应用
exec npm start