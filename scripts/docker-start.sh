#!/bin/bash

# TripSum Docker启动脚本

set -e

echo "========================================="
echo "     TripSum Docker 启动脚本"
echo "========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 函数：打印成功消息
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# 函数：打印错误消息
print_error() {
    echo -e "${RED}✗${NC} $1"
}

# 函数：打印警告消息
print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# 检查Docker是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker未安装，请先安装Docker"
        echo "访问 https://docs.docker.com/get-docker/ 获取安装指南"
        exit 1
    fi
    print_success "Docker已安装: $(docker --version)"
}

# 检查Docker Compose是否安装
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        if ! docker compose version &> /dev/null; then
            print_error "Docker Compose未安装"
            exit 1
        fi
        DOCKER_COMPOSE="docker compose"
    else
        DOCKER_COMPOSE="docker-compose"
    fi
    print_success "Docker Compose已安装"
}

# 创建环境变量文件
create_env_file() {
    if [ ! -f .env ]; then
        cp .env.example .env
        print_warning "已创建.env文件，请编辑配置后重新运行"
        echo ""
        echo "必须配置的项目："
        echo "  - JWT_SECRET: JWT密钥"
        echo "  - OPENAI_API_KEY: OpenAI API密钥（用于AI功能）"
        echo ""
        exit 0
    fi
    print_success "环境变量文件已存在"
}

# 选择启动模式
select_mode() {
    echo ""
    echo "请选择启动模式："
    echo "1) 开发模式 (仅数据库服务)"
    echo "2) 生产模式 (完整服务)"
    echo "3) 生产模式 + Nginx"
    echo "4) 停止所有服务"
    echo "5) 清理所有数据"
    echo ""
    read -p "请输入选项 [1-5]: " mode

    case $mode in
        1)
            start_dev_mode
            ;;
        2)
            start_prod_mode
            ;;
        3)
            start_prod_with_nginx
            ;;
        4)
            stop_all
            ;;
        5)
            clean_all
            ;;
        *)
            print_error "无效选项"
            exit 1
            ;;
    esac
}

# 启动开发模式
start_dev_mode() {
    echo ""
    print_warning "启动开发模式..."
    $DOCKER_COMPOSE -f docker-compose.dev.yml up -d
    
    echo ""
    print_success "开发环境启动成功！"
    echo ""
    echo "服务地址："
    echo "  PostgreSQL: localhost:5432"
    echo "  Redis: localhost:6379"
    echo "  MinIO: localhost:9000 (控制台: localhost:9001)"
    echo "  Adminer: http://localhost:8080"
    echo ""
    echo "默认凭据："
    echo "  数据库: tripsum_user / tripsum_password"
    echo "  MinIO: minioadmin / minioadmin"
    echo ""
    echo "现在你可以运行："
    echo "  cd backend && npm run dev"
    echo "  cd frontend && npm run dev"
}

# 启动生产模式
start_prod_mode() {
    echo ""
    print_warning "构建镜像..."
    $DOCKER_COMPOSE build
    
    echo ""
    print_warning "启动生产环境..."
    $DOCKER_COMPOSE up -d postgres redis minio backend frontend
    
    # 等待服务启动
    echo ""
    print_warning "等待服务启动..."
    sleep 10
    
    # 检查服务状态
    check_services
    
    echo ""
    print_success "生产环境启动成功！"
    echo ""
    echo "服务地址："
    echo "  前端: http://localhost:5173"
    echo "  后端: http://localhost:3000"
    echo "  API文档: http://localhost:3000/api"
    echo "  MinIO控制台: http://localhost:9001"
}

# 启动生产模式（带Nginx）
start_prod_with_nginx() {
    echo ""
    print_warning "构建镜像..."
    $DOCKER_COMPOSE build
    
    echo ""
    print_warning "启动完整生产环境..."
    $DOCKER_COMPOSE --profile production up -d
    
    # 等待服务启动
    echo ""
    print_warning "等待服务启动..."
    sleep 15
    
    # 检查服务状态
    check_services
    
    echo ""
    print_success "完整生产环境启动成功！"
    echo ""
    echo "服务地址："
    echo "  应用: http://localhost"
    echo "  MinIO控制台: http://localhost:9001"
}

# 检查服务状态
check_services() {
    services=($($DOCKER_COMPOSE ps --services))
    
    echo ""
    echo "服务状态："
    for service in "${services[@]}"; do
        if $DOCKER_COMPOSE ps | grep -q "$service.*Up"; then
            print_success "$service 运行中"
        else
            print_error "$service 未运行"
        fi
    done
}

# 停止所有服务
stop_all() {
    echo ""
    print_warning "停止所有服务..."
    $DOCKER_COMPOSE down
    $DOCKER_COMPOSE -f docker-compose.dev.yml down
    print_success "所有服务已停止"
}

# 清理所有数据
clean_all() {
    echo ""
    print_warning "此操作将删除所有数据，无法恢复！"
    read -p "确认删除？(yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        print_warning "清理所有容器和数据..."
        $DOCKER_COMPOSE down -v
        $DOCKER_COMPOSE -f docker-compose.dev.yml down -v
        docker system prune -af --volumes
        print_success "清理完成"
    else
        echo "操作已取消"
    fi
}

# 显示日志
show_logs() {
    echo ""
    echo "查看日志命令："
    echo "  所有服务: $DOCKER_COMPOSE logs -f"
    echo "  后端服务: $DOCKER_COMPOSE logs -f backend"
    echo "  前端服务: $DOCKER_COMPOSE logs -f frontend"
    echo "  数据库: $DOCKER_COMPOSE logs -f postgres"
}

# 主流程
main() {
    check_docker
    check_docker_compose
    create_env_file
    select_mode
    show_logs
}

# 执行主流程
main