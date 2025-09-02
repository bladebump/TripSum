#!/bin/sh

# TripSum 前端入口脚本
# 用于运行时替换 API URL 并启动 nginx

set -e

echo "========================================="
echo "TripSum Frontend Starting..."
echo "========================================="

# 替换 API URL（如果提供了环境变量）
if [ -n "$VITE_API_URL" ]; then
    echo "配置 API URL: $VITE_API_URL"
    # 在所有 JS 文件中替换占位符
    find /usr/share/nginx/html -type f \( -name "*.js" -o -name "*.mjs" \) -exec \
        sed -i "s|VITE_API_URL_PLACEHOLDER|${VITE_API_URL}|g" {} \;
    echo "✓ API URL 配置完成"
fi

echo "启动 Nginx 服务..."

# 启动 nginx
exec nginx -g "daemon off;"