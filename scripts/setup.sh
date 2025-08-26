#!/bin/bash

# TripSum 项目初始化脚本

echo "========================================="
echo "     TripSum 项目环境设置脚本"
echo "========================================="
echo ""

# 检查Node.js版本
echo "检查 Node.js 版本..."
node_version=$(node -v 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✓ Node.js 版本: $node_version"
else
    echo "✗ Node.js 未安装，请先安装 Node.js >= 20.0.0"
    exit 1
fi

# 检查Docker
echo "检查 Docker..."
docker_version=$(docker --version 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✓ Docker 已安装: $docker_version"
else
    echo "⚠ Docker 未安装，某些功能可能无法使用"
fi

# 创建必要的目录
echo ""
echo "创建必要的目录..."
mkdir -p backend/uploads/receipts
mkdir -p backend/logs
echo "✓ 目录创建完成"

# 安装后端依赖
echo ""
echo "安装后端依赖..."
cd backend
npm install
if [ $? -eq 0 ]; then
    echo "✓ 后端依赖安装成功"
else
    echo "✗ 后端依赖安装失败"
    exit 1
fi

# 设置环境变量
echo ""
echo "设置环境变量..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✓ 已创建 .env 文件，请编辑配置"
else
    echo "✓ .env 文件已存在"
fi

# 启动Docker服务
echo ""
read -p "是否启动Docker服务 (PostgreSQL, Redis, MinIO)? (y/n): " start_docker
if [ "$start_docker" = "y" ]; then
    cd ..
    docker-compose up -d
    if [ $? -eq 0 ]; then
        echo "✓ Docker服务启动成功"
        echo "  - PostgreSQL: localhost:5432"
        echo "  - Redis: localhost:6379"
        echo "  - MinIO: localhost:9000 (Console: localhost:9001)"
    else
        echo "✗ Docker服务启动失败"
    fi
    cd backend
fi

# 等待数据库就绪
echo ""
echo "等待数据库就绪..."
sleep 5

# 运行数据库迁移
echo ""
read -p "是否运行数据库迁移? (y/n): " run_migration
if [ "$run_migration" = "y" ]; then
    npx prisma migrate dev
    if [ $? -eq 0 ]; then
        echo "✓ 数据库迁移成功"
    else
        echo "✗ 数据库迁移失败"
    fi
fi

# 填充种子数据
echo ""
read -p "是否填充测试数据? (y/n): " run_seed
if [ "$run_seed" = "y" ]; then
    npm run prisma:seed
    if [ $? -eq 0 ]; then
        echo "✓ 测试数据填充成功"
    else
        echo "✗ 测试数据填充失败"
    fi
fi

# 安装前端依赖
echo ""
echo "安装前端依赖..."
cd ../frontend
npm install
if [ $? -eq 0 ]; then
    echo "✓ 前端依赖安装成功"
else
    echo "✗ 前端依赖安装失败"
    exit 1
fi

echo ""
echo "========================================="
echo "     环境设置完成！"
echo "========================================="
echo ""
echo "启动命令："
echo "  后端: cd backend && npm run dev"
echo "  前端: cd frontend && npm run dev"
echo ""
echo "默认测试账号："
echo "  alice@example.com / password123"
echo "  bob@example.com / password123"
echo ""
echo "访问地址："
echo "  前端: http://localhost:5173"
echo "  后端: http://localhost:3000"
echo "  MinIO Console: http://localhost:9001"
echo ""