#!/bin/bash

# TripSum 生产环境管理脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_NAME="TripSum"
VERSION="v1.5.0"

print_header() {
    echo ""
    echo "========================================="
    echo "     $PROJECT_NAME 生产环境管理"
    echo "========================================="
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# 检查依赖
check_dependencies() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装"
        exit 1
    fi
    
    # 检查新版 docker compose (作为子命令)
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
        print_success "检测到 Docker Compose (新版)"
    # 检查旧版 docker-compose
    elif command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
        print_success "检测到 Docker Compose (旧版)"
    else
        print_error "Docker Compose 未安装"
        print_info "请安装 Docker Compose 或升级 Docker 到最新版本"
        exit 1
    fi
    
    print_success "依赖检查通过"
}

# 检查环境配置
check_env() {
    if [ ! -f ".env" ]; then
        print_error ".env 文件不存在"
        echo ""
        echo "请先创建配置文件："
        echo "  cp .env.example .env"
        echo "  nano .env"
        echo ""
        echo "必须配置的项目："
        echo "  - NODE_ENV=production"
        echo "  - JWT_SECRET（强密码）"
        echo "  - POSTGRES_PASSWORD（强密码）"
        echo "  - CLIENT_URL（您的服务器IP或域名）"
        echo "  - VITE_API_URL（您的API地址）"
        exit 1
    fi
    
    source .env
    
    if [ "$NODE_ENV" != "production" ]; then
        print_warning "NODE_ENV 不是 production"
    fi
    
    if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your-super-secret-jwt-key-change-this-in-production" ]; then
        print_error "请设置强度足够的 JWT_SECRET"
        exit 1
    fi
    
    if [ -z "$POSTGRES_PASSWORD" ] || [ "$POSTGRES_PASSWORD" = "tripsum_password" ]; then
        print_error "请设置数据库密码 POSTGRES_PASSWORD"
        exit 1
    fi
    
    print_success "环境配置检查通过"
}

# 同步代码
sync_code() {
    if [ -d ".git" ]; then
        print_info "同步最新代码..."
        git pull
        print_success "代码同步完成"
    else
        print_warning "非Git仓库，跳过代码同步"
    fi
}

# 部署服务
deploy() {
    print_header
    check_dependencies
    check_env
    sync_code
    
    print_info "停止现有服务..."
    $DOCKER_COMPOSE_CMD down 2>/dev/null || true
    
    print_info "构建并启动服务..."
    $DOCKER_COMPOSE_CMD up -d --build
    
    print_info "等待服务启动..."
    sleep 30
    
    check_health
    
    print_success "部署完成！"
    show_info
}

# 快速部署
quick_deploy() {
    print_header
    check_env
    sync_code
    
    print_info "快速重启服务..."
    $DOCKER_COMPOSE_CMD down
    $DOCKER_COMPOSE_CMD up -d --build
    
    sleep 20
    check_health
    print_success "快速部署完成！"
}

# 检查服务健康状态
check_health() {
    print_info "检查服务状态..."
    
    services=("tripsum-postgres" "tripsum-redis" "tripsum-backend" "tripsum-frontend" "tripsum-nginx")
    
    for service in "${services[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "$service"; then
            print_success "$service 运行中"
        else
            print_warning "$service 可能未正常启动"
        fi
    done
    
    # 检查API健康
    sleep 5
    if curl -f -s http://localhost/health > /dev/null 2>&1; then
        print_success "API服务健康检查通过"
    else
        print_warning "API服务可能未就绪"
    fi
}

# 显示部署信息
show_info() {
    echo ""
    echo "========================================="
    echo "部署信息"
    echo "========================================="
    echo ""
    source .env 2>/dev/null || true
    echo "访问地址："
    if [ -n "$CLIENT_URL" ]; then
        echo "  应用: $CLIENT_URL"
        echo "  API: $CLIENT_URL/api"
    else
        echo "  应用: http://localhost"
        echo "  API: http://localhost/api"
    fi
    echo ""
    echo "管理命令："
    echo "  查看状态: $0 status"
    echo "  查看日志: $0 logs"
    echo "  重启服务: $0 restart"
    echo "  停止服务: $0 stop"
    echo "  备份数据: $0 backup"
    echo ""
}

# 数据备份
backup() {
    print_info "开始数据备份..."
    
    BACKUP_DIR="./backups"
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    
    mkdir -p $BACKUP_DIR
    
    # 备份数据库
    if docker ps | grep -q "tripsum-postgres"; then
        print_info "备份数据库..."
        docker exec tripsum-postgres pg_dump -U tripsum_user tripsum > "$BACKUP_DIR/database_${TIMESTAMP}.sql"
        gzip "$BACKUP_DIR/database_${TIMESTAMP}.sql"
        print_success "数据库备份完成"
    fi
    
    # 备份文件
    if [ -d "backend/uploads" ]; then
        tar -czf "$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz" -C backend uploads/
        print_success "文件备份完成"
    fi
    
    # 清理旧备份
    find $BACKUP_DIR -name "*.gz" -mtime +7 -delete 2>/dev/null || true
    
    print_success "备份完成"
    echo "备份位置: $BACKUP_DIR"
}

# 查看日志
logs() {
    if [ -n "$1" ]; then
        $DOCKER_COMPOSE_CMD logs -f "$1"
    else
        $DOCKER_COMPOSE_CMD logs -f
    fi
}

# 重启服务
restart() {
    if [ -n "$1" ]; then
        print_info "重启服务: $1"
        $DOCKER_COMPOSE_CMD restart "$1"
    else
        print_info "重启所有服务..."
        $DOCKER_COMPOSE_CMD restart
    fi
    print_success "重启完成"
}

# 查看状态
status() {
    print_info "服务状态："
    $DOCKER_COMPOSE_CMD ps
    echo ""
    
    # 检查API
    if curl -f -s http://localhost/health > /dev/null 2>&1; then
        print_success "API服务正常"
    else
        print_warning "API服务异常"
    fi
}

# 停止服务
stop() {
    print_info "停止所有服务..."
    $DOCKER_COMPOSE_CMD down
    print_success "服务已停止"
}

# 显示帮助
help() {
    echo "TripSum 生产环境管理脚本"
    echo ""
    echo "用法: $0 <命令>"
    echo ""
    echo "命令："
    echo "  deploy       完整部署（包含git pull）"
    echo "  quick        快速部署"
    echo "  status       查看服务状态"
    echo "  logs [服务]  查看日志"
    echo "  restart [服务] 重启服务"
    echo "  backup       备份数据"
    echo "  stop         停止服务"
    echo "  help         显示帮助"
    echo ""
    echo "示例："
    echo "  $0 deploy           # 完整部署"
    echo "  $0 logs backend     # 查看后端日志"
    echo "  $0 restart nginx    # 重启nginx"
}

# 主函数
main() {
    case "${1:-help}" in
        "deploy")
            deploy
            ;;
        "quick")
            quick_deploy
            ;;
        "status")
            status
            ;;
        "logs")
            logs "$2"
            ;;
        "restart")
            restart "$2"
            ;;
        "backup")
            backup
            ;;
        "stop")
            stop
            ;;
        "help"|"-h"|"--help")
            help
            ;;
        *)
            print_error "未知命令: $1"
            echo ""
            help
            exit 1
            ;;
    esac
}

# 错误处理
trap 'print_error "执行出错"; exit 1' ERR

# 执行
main "$@"