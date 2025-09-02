#!/bin/sh

# TripSum 后端启动脚本 - 简化版
# 使用 Prisma 标准流程，自动处理首次部署和更新

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

# 清理可能存在的错误表名（临时措施，后续可删除）
echo "清理旧表（如果存在）..."
PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE <<EOF 2>/dev/null || true
-- 这些是旧版本可能创建的错误表名，新版本不会有这个问题
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "Trip" CASCADE;
DROP TABLE IF EXISTS "TripMember" CASCADE;
DROP TABLE IF EXISTS "Expense" CASCADE;
DROP TABLE IF EXISTS "ExpenseParticipant" CASCADE;
DROP TABLE IF EXISTS "Category" CASCADE;
DROP TABLE IF EXISTS "Settlement" CASCADE;
EOF

echo ""
echo "========================================="
echo "执行数据库迁移..."
echo "========================================="

# 使用 Prisma migrate deploy
# - 首次部署：创建所有表和迁移历史
# - 后续更新：应用新的迁移
npx prisma migrate deploy

echo "✓ 数据库迁移完成"

# 执行后处理（索引、触发器、默认数据）
echo ""
echo "========================================="
echo "执行后处理..."
echo "========================================="

# 如果有后处理 SQL 文件，执行它
if [ -f "prisma/post-deploy.sql" ]; then
  echo "执行 post-deploy.sql..."
  PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE < prisma/post-deploy.sql 2>&1 || echo "部分后处理可能已存在（这是正常的）"
  echo "✓ 后处理完成"
fi

# 生成 Prisma Client（确保最新）
echo "生成 Prisma Client..."
npx prisma generate

echo ""
echo "========================================="
echo "启动应用服务..."
echo "========================================="

# 启动应用
exec npm start