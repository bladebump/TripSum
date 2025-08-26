# TripSum Makefile - 简化Docker操作

.PHONY: help dev prod stop clean logs build install

# 默认目标
help:
	@echo "TripSum Docker 管理命令"
	@echo ""
	@echo "使用方法: make [命令]"
	@echo ""
	@echo "可用命令:"
	@echo "  install    - 安装项目依赖"
	@echo "  dev        - 启动开发环境（仅数据库）"
	@echo "  prod       - 启动生产环境（完整服务）"
	@echo "  build      - 构建Docker镜像"
	@echo "  stop       - 停止所有服务"
	@echo "  clean      - 清理所有容器和数据"
	@echo "  logs       - 查看所有服务日志"
	@echo "  logs-backend  - 查看后端日志"
	@echo "  logs-frontend - 查看前端日志"
	@echo "  db-shell   - 进入数据库命令行"
	@echo "  redis-cli  - 进入Redis命令行"
	@echo "  backup     - 备份数据库"
	@echo "  restore    - 恢复数据库"

# 安装依赖
install:
	@echo "安装前端依赖..."
	@cd frontend && npm install
	@echo "安装后端依赖..."
	@cd backend && npm install
	@echo "生成Prisma客户端..."
	@cd backend && npx prisma generate

# 启动开发环境
dev:
	@echo "启动开发环境..."
	@docker-compose -f docker-compose.dev.yml up -d
	@echo "开发环境已启动！"
	@echo "PostgreSQL: localhost:5432"
	@echo "Redis: localhost:6379"
	@echo "MinIO: localhost:9000"
	@echo "Adminer: http://localhost:8080"

# 启动生产环境
prod:
	@echo "启动生产环境..."
	@docker-compose up -d
	@echo "生产环境已启动！"
	@echo "前端: http://localhost:5173"
	@echo "后端: http://localhost:3000"

# 构建镜像
build:
	@echo "构建Docker镜像..."
	@docker-compose build

# 停止服务
stop:
	@echo "停止所有服务..."
	@docker-compose down
	@docker-compose -f docker-compose.dev.yml down

# 清理所有
clean:
	@echo "警告：这将删除所有容器和数据！"
	@read -p "确认删除？(y/n) " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		docker-compose -f docker-compose.dev.yml down -v; \
		echo "清理完成"; \
	fi

# 查看日志
logs:
	@docker-compose logs -f

logs-backend:
	@docker-compose logs -f backend

logs-frontend:
	@docker-compose logs -f frontend

logs-db:
	@docker-compose logs -f postgres

# 数据库操作
db-shell:
	@docker exec -it tripsum-postgres psql -U tripsum_user -d tripsum

redis-cli:
	@docker exec -it tripsum-redis redis-cli

# 备份数据库
backup:
	@mkdir -p backups
	@docker exec tripsum-postgres pg_dump -U tripsum_user tripsum > backups/tripsum_backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "备份完成: backups/tripsum_backup_$$(date +%Y%m%d_%H%M%S).sql"

# 恢复数据库
restore:
	@read -p "输入备份文件名: " file; \
	docker exec -i tripsum-postgres psql -U tripsum_user tripsum < $$file

# 运行迁移
migrate:
	@docker exec tripsum-backend npx prisma migrate deploy

# 生成种子数据
seed:
	@docker exec tripsum-backend npx prisma db seed

# 状态检查
status:
	@echo "服务状态:"
	@docker-compose ps

# 重启服务
restart:
	@docker-compose restart

restart-backend:
	@docker-compose restart backend

restart-frontend:
	@docker-compose restart frontend