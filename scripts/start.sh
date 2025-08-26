#!/bin/bash

# TripSum 项目启动脚本

echo "========================================="
echo "     启动 TripSum 项目"
echo "========================================="
echo ""

# 检查Docker服务
echo "检查Docker服务状态..."
docker ps > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Docker未运行，正在启动Docker服务..."
    docker-compose up -d
    sleep 5
else
    # 检查必要的容器是否在运行
    postgres_running=$(docker ps | grep tripsum-postgres | wc -l)
    redis_running=$(docker ps | grep tripsum-redis | wc -l)
    
    if [ $postgres_running -eq 0 ] || [ $redis_running -eq 0 ]; then
        echo "启动缺失的Docker服务..."
        docker-compose up -d
        sleep 5
    else
        echo "✓ Docker服务已在运行"
    fi
fi

# 启动后端服务
echo ""
echo "启动后端服务..."
cd backend
npm run dev &
BACKEND_PID=$!
echo "✓ 后端服务已启动 (PID: $BACKEND_PID)"

# 等待后端启动
sleep 3

# 启动前端服务
echo ""
echo "启动前端服务..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!
echo "✓ 前端服务已启动 (PID: $FRONTEND_PID)"

echo ""
echo "========================================="
echo "     TripSum 已成功启动！"
echo "========================================="
echo ""
echo "访问地址："
echo "  前端: http://localhost:5173"
echo "  后端: http://localhost:3000"
echo "  健康检查: http://localhost:3000/health"
echo ""
echo "进程信息："
echo "  后端 PID: $BACKEND_PID"
echo "  前端 PID: $FRONTEND_PID"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo ""

# 等待用户中断
trap "echo '正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait